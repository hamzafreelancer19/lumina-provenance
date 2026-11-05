const DEFAULT_WORKER = 'http://127.0.0.1:8000';

export function getDiffusersWorkerUrl() {
  return (process.env.DIFFUSERS_WORKER_URL || DEFAULT_WORKER).replace(/\/$/, '');
}

export function diffusersWorkerConfigured() {
  return Boolean(process.env.DIFFUSERS_WORKER_URL?.trim() || process.env.NODE_ENV === 'development');
}

export type WorkerScene = {
  index: number;
  status: 'queued' | 'running' | 'ready' | 'error';
  file: string | null;
  width?: number;
  height?: number;
  error?: string | null;
};

export type WorkerJob = {
  id: string;
  state: 'queued' | 'running' | 'ready' | 'partial' | 'error';
  message: string;
  progress: number;
  scenes: WorkerScene[];
  zip: string | null;
  createdAt?: number;
  updatedAt?: number;
};

export async function workerFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${getDiffusersWorkerUrl()}${path}`, {
    ...init,
    cache: 'no-store',
  });
  return response;
}
