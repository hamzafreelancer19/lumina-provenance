from __future__ import annotations

import json
import os
import threading
import time
import uuid
import zipfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image

from pipeline import (
    SCENE_COUNT,
    OUTPUT_SIZE,
    composite_product,
    ensure_dir,
    extract_cutout,
    get_engine,
    resolve_device,
)

ROOT = Path(__file__).resolve().parent
JOBS_DIR = ensure_dir(Path(os.getenv("JOBS_DIR", str(ROOT / "jobs"))))

app = FastAPI(title="Lumina Diffusers Mockup Worker", version="1.0.0")
_jobs_lock = threading.Lock()


def job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id


def status_path(job_id: str) -> Path:
    return job_dir(job_id) / "status.json"


def read_status(job_id: str) -> dict[str, Any]:
    path = status_path(job_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Job not found.")
    return json.loads(path.read_text(encoding="utf-8"))


def write_status(job_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    path = status_path(job_id)
    ensure_dir(path.parent)
    payload = {**payload, "updatedAt": time.time()}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def scene_name(index: int) -> str:
    return f"mockup_{index + 1:02d}.png"


def build_zip(job_id: str, scenes: list[dict[str, Any]]) -> str | None:
    outputs = job_dir(job_id) / "outputs"
    ready = [scene for scene in scenes if scene.get("status") == "ready" and scene.get("file")]
    if not ready:
        return None
    zip_name = "mockups.zip"
    zip_path = outputs / zip_name
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for scene in ready:
            file_path = outputs / scene["file"]
            if file_path.exists():
                archive.write(file_path, arcname=scene["file"])
    return zip_name


def run_job(job_id: str, retry_indexes: list[int] | None = None) -> None:
    status = read_status(job_id)
    directory = job_dir(job_id)
    input_path = directory / "input" / "reference.png"
    cutout_path = directory / "work" / "cutout.png"
    outputs = ensure_dir(directory / "outputs")
    work = ensure_dir(directory / "work")

    try:
        status["state"] = "running"
        status["message"] = "Extracting product cutout"
        status["progress"] = 5
        write_status(job_id, status)

        if cutout_path.exists():
            cutout = Image.open(cutout_path).convert("RGBA")
        else:
            source = Image.open(input_path).convert("RGB")
            cutout = extract_cutout(source)
            cutout.save(cutout_path)

        engine = get_engine()
        indexes = retry_indexes if retry_indexes is not None else list(range(SCENE_COUNT))
        total = max(len(indexes), 1)

        for step, index in enumerate(indexes):
            scene = status["scenes"][index]
            if retry_indexes is None and scene.get("status") == "ready" and scene.get("file"):
                continue

            status["message"] = f"Generating empty background {index + 1}/{SCENE_COUNT}"
            status["progress"] = 10 + int((step / total) * 70)
            status["scenes"][index] = {
                **scene,
                "status": "running",
                "error": None,
            }
            write_status(job_id, status)

            try:
                background = engine.generate_background(index, seed=status.get("seed") or 42)
                background_path = work / f"background_{index + 1:02d}.png"
                background.save(background_path)

                status["message"] = f"Compositing mockup {index + 1}/{SCENE_COUNT}"
                write_status(job_id, status)

                mockup = composite_product(background, cutout)
                file_name = scene_name(index)
                mockup.save(outputs / file_name, format="PNG")
                status["scenes"][index] = {
                    "index": index,
                    "status": "ready",
                    "file": file_name,
                    "width": OUTPUT_SIZE,
                    "height": OUTPUT_SIZE,
                    "error": None,
                }
            except Exception as exc:  # noqa: BLE001
                status["scenes"][index] = {
                    "index": index,
                    "status": "error",
                    "file": scene.get("file"),
                    "width": OUTPUT_SIZE,
                    "height": OUTPUT_SIZE,
                    "error": str(exc),
                }
            write_status(job_id, status)

        zip_name = build_zip(job_id, status["scenes"])
        status["zip"] = zip_name
        ready_count = sum(1 for scene in status["scenes"] if scene.get("status") == "ready")
        failed = [scene for scene in status["scenes"] if scene.get("status") == "error"]
        status["progress"] = 100
        if failed and ready_count:
            status["state"] = "partial"
            status["message"] = f"{ready_count} ready, {len(failed)} failed"
        elif failed:
            status["state"] = "error"
            status["message"] = "All scenes failed"
        else:
            status["state"] = "ready"
            status["message"] = f"{ready_count} mockups ready"
        write_status(job_id, status)
    except Exception as exc:  # noqa: BLE001
        status = read_status(job_id)
        status["state"] = "error"
        status["message"] = str(exc)
        status["progress"] = 100
        write_status(job_id, status)


@app.on_event("startup")
def startup() -> None:
    # Load Diffusers once at boot so the first job does not pay cold-start cost alone.
    get_engine()


@app.get("/health")
def health() -> dict[str, Any]:
    engine = get_engine()
    return {
        "ok": True,
        "jobsDir": str(JOBS_DIR),
        "devicePreferred": os.getenv("DEVICE", "auto"),
        "deviceResolved": resolve_device(),
        "engine": engine.status(),
        "outputSize": OUTPUT_SIZE,
        "sceneCount": SCENE_COUNT,
    }


@app.post("/jobs")
async def create_job(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload a PNG, JPEG, or WebP image.")

    data = await file.read()
    if not data or len(data) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 12 MB.")

    job_id = uuid.uuid4().hex
    directory = ensure_dir(job_dir(job_id))
    ensure_dir(directory / "input")
    ensure_dir(directory / "work")
    ensure_dir(directory / "outputs")

    input_path = directory / "input" / "reference.png"
    try:
        image = Image.open(__import__("io").BytesIO(data)).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not read image: {exc}") from exc
    image.save(input_path, format="PNG")

    status = {
        "id": job_id,
        "state": "queued",
        "message": "Queued",
        "progress": 0,
        "seed": int(time.time()) % 1_000_000,
        "scenes": [
            {
                "index": index,
                "status": "queued",
                "file": None,
                "width": OUTPUT_SIZE,
                "height": OUTPUT_SIZE,
                "error": None,
            }
            for index in range(SCENE_COUNT)
        ],
        "zip": None,
        "createdAt": time.time(),
        "updatedAt": time.time(),
    }
    write_status(job_id, status)

    thread = threading.Thread(target=run_job, args=(job_id,), daemon=True)
    thread.start()
    return {"id": job_id, "status": status}


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    return read_status(job_id)


@app.post("/jobs/{job_id}/retry")
def retry_job(job_id: str) -> dict[str, Any]:
    status = read_status(job_id)
    failed = [scene["index"] for scene in status["scenes"] if scene.get("status") == "error"]
    if not failed:
        return status
    if status["state"] == "running":
        raise HTTPException(status_code=409, detail="Job is already running.")

    status["state"] = "queued"
    status["message"] = f"Retrying {len(failed)} failed scene(s)"
    status["progress"] = 0
    for index in failed:
        status["scenes"][index]["status"] = "queued"
        status["scenes"][index]["error"] = None
    write_status(job_id, status)

    thread = threading.Thread(target=run_job, args=(job_id, failed), daemon=True)
    thread.start()
    return status


@app.get("/jobs/{job_id}/files/{file_name}")
def get_file(job_id: str, file_name: str):
    if "/" in file_name or "\\" in file_name or file_name.startswith("."):
        raise HTTPException(status_code=400, detail="Invalid file name.")
    path = job_dir(job_id) / "outputs" / file_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found.")
    media = "application/zip" if file_name.endswith(".zip") else "image/png"
    return FileResponse(path, media_type=media, filename=file_name)
