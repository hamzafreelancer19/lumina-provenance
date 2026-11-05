from __future__ import annotations

import os
import threading
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Literal

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

OUTPUT_SIZE = 2400
SCENE_COUNT = 6

DeviceName = Literal["cuda", "cpu", "mps"]

SCENE_PROMPTS = [
    "empty minimalist photography backdrop, soft daylight, clean beige wall, no objects, no people",
    "empty rustic wood table surface, soft natural light, shallow depth of field, no objects",
    "empty marble countertop background, bright studio lighting, clean and empty, no objects",
    "empty cozy linen fabric backdrop, warm soft light, seamless empty scene, no objects",
    "empty outdoor garden bokeh background, soft green blur, empty foreground, no objects",
    "empty modern kitchen counter, morning light, clean empty surface, no objects",
]


def resolve_device(preferred: str | None = None) -> DeviceName:
    value = (preferred or os.getenv("DEVICE", "auto")).strip().lower()
    try:
        import torch
    except Exception:
        return "cpu"

    if value in {"cuda", "cpu", "mps"}:
        if value == "cuda" and torch.cuda.is_available():
            return "cuda"
        if value == "mps" and getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
        if value == "cpu":
            return "cpu"

    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def model_path() -> str:
    return os.getenv("MODEL_PATH", "runwayml/stable-diffusion-v1-5").strip()


def force_simple_backgrounds() -> bool:
    return os.getenv("FORCE_SIMPLE_BACKGROUNDS", "0").strip() in {"1", "true", "yes"}


class DiffusersEngine:
    def __init__(self) -> None:
        self.device = resolve_device()
        self.path = model_path()
        self.pipe = None
        self.lock = threading.Lock()
        self.load_error: str | None = None
        self.mode: Literal["diffusers", "simple"] = "simple"
        self._load()

    def _load(self) -> None:
        if force_simple_backgrounds():
            self.mode = "simple"
            self.load_error = "FORCE_SIMPLE_BACKGROUNDS enabled"
            return

        try:
            import torch
            from diffusers import StableDiffusionPipeline

            dtype = torch.float16 if self.device in {"cuda", "mps"} else torch.float32
            pipe = StableDiffusionPipeline.from_pretrained(
                self.path,
                torch_dtype=dtype,
                safety_checker=None,
                requires_safety_checker=False,
            )
            pipe = pipe.to(self.device)
            if hasattr(pipe, "enable_attention_slicing"):
                pipe.enable_attention_slicing()
            self.pipe = pipe
            self.mode = "diffusers"
            self.load_error = None
        except Exception as exc:  # noqa: BLE001
            self.pipe = None
            self.mode = "simple"
            self.load_error = str(exc)

    def status(self) -> dict:
        return {
            "mode": self.mode,
            "device": self.device,
            "model_path": self.path,
            "ready": True,
            "diffusers_loaded": self.mode == "diffusers",
            "load_error": self.load_error,
            "gpu_required_for_diffusers": self.device == "cpu" and self.mode == "diffusers",
        }

    def generate_background(self, index: int, seed: int | None = None) -> Image.Image:
        prompt = SCENE_PROMPTS[index % len(SCENE_PROMPTS)]
        if self.mode != "diffusers" or self.pipe is None:
            return self._simple_background(index)

        import torch

        generator = None
        if seed is not None:
            generator = torch.Generator(device=self.device).manual_seed(seed + index)

        with self.lock:
            result = self.pipe(
                prompt=prompt,
                negative_prompt="product, object, person, text, watermark, logo, clutter",
                width=768,
                height=768,
                num_inference_steps=22 if self.device != "cpu" else 12,
                guidance_scale=6.5,
                generator=generator,
            )
        image = result.images[0].convert("RGB")
        return image.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)

    def _simple_background(self, index: int) -> Image.Image:
        palettes = [
            ((245, 240, 232), (220, 210, 196)),
            ((236, 226, 210), (168, 132, 94)),
            ((248, 248, 248), (210, 210, 214)),
            ((244, 236, 228), (214, 196, 178)),
            ((230, 238, 228), (148, 168, 132)),
            ((242, 236, 230), (196, 176, 160)),
        ]
        top, bottom = palettes[index % len(palettes)]
        image = Image.new("RGB", (OUTPUT_SIZE, OUTPUT_SIZE), top)
        draw = ImageDraw.Draw(image)
        for y in range(OUTPUT_SIZE):
            t = y / max(OUTPUT_SIZE - 1, 1)
            color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
            draw.line([(0, y), (OUTPUT_SIZE, y)], fill=color)
        noise = Image.effect_noise((OUTPUT_SIZE, OUTPUT_SIZE), 12).convert("L")
        image = Image.blend(image, Image.merge("RGB", (noise, noise, noise)), 0.04)
        return image.filter(ImageFilter.GaussianBlur(radius=0.6))


@lru_cache(maxsize=1)
def get_engine() -> DiffusersEngine:
    return DiffusersEngine()


def extract_cutout(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    try:
        from rembg import remove

        buffer = BytesIO()
        rgb.save(buffer, format="PNG")
        cut = Image.open(BytesIO(remove(buffer.getvalue()))).convert("RGBA")
        return cut
    except Exception:
        # Fallback: keep full frame with soft alpha so compositing still works offline.
        rgba = rgb.convert("RGBA")
        alpha = Image.new("L", rgba.size, 255)
        rgba.putalpha(alpha)
        return rgba


def composite_product(background: Image.Image, cutout: Image.Image) -> Image.Image:
    canvas = background.convert("RGBA").resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)
    product = cutout.convert("RGBA")

    max_w = int(OUTPUT_SIZE * 0.62)
    max_h = int(OUTPUT_SIZE * 0.72)
    scale = min(max_w / product.width, max_h / product.height, 1.0)
    new_size = (
        max(1, int(product.width * scale)),
        max(1, int(product.height * scale)),
    )
    product = product.resize(new_size, Image.Resampling.LANCZOS)

    # Slight grounding shadow under the product without altering product pixels.
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    x = (OUTPUT_SIZE - product.width) // 2
    y = OUTPUT_SIZE - product.height - int(OUTPUT_SIZE * 0.12)
    shadow_box = [
        x + int(product.width * 0.12),
        y + product.height - int(product.height * 0.08),
        x + int(product.width * 0.88),
        y + product.height + int(product.height * 0.04),
    ]
    shadow_draw.ellipse(shadow_box, fill=(0, 0, 0, 56))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=24))
    canvas = Image.alpha_composite(canvas, shadow)

    # Preserve product colors/details; only lightly match scene brightness.
    enhancer = ImageEnhance.Brightness(product)
    product = enhancer.enhance(1.0)
    canvas.paste(product, (x, y), product)
    return canvas.convert("RGB")


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path
