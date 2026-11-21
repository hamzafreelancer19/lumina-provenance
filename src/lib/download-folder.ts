declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    queryPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  }
}

const FOLDER_DATABASE = 'lumina-downloads';
const FOLDER_STORE = 'folders';
const FOLDER_KEY = 'selected-folder';

function openFolderDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(FOLDER_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FOLDER_STORE)) {
        request.result.createObjectStore(FOLDER_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function rememberDownloadFolder(folder: FileSystemDirectoryHandle) {
  const database = await openFolderDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(FOLDER_STORE, 'readwrite');
      transaction.objectStore(FOLDER_STORE).put(folder, FOLDER_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function getRememberedDownloadFolder() {
  if (typeof indexedDB === 'undefined') return null;
  const database = await openFolderDatabase();
  try {
    return await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const request = database.transaction(FOLDER_STORE, 'readonly')
        .objectStore(FOLDER_STORE)
        .get(FOLDER_KEY);
      request.onsuccess = () => {
        const result = request.result as unknown;
        resolve(
          result && typeof result === 'object' && 'getFileHandle' in result
            ? (result as FileSystemDirectoryHandle)
            : null,
        );
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export function supportsDownloadFolder() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export function pickDownloadFolder() {
  if (!window.showDirectoryPicker) {
    throw new Error('Folder selection is not supported in this browser.');
  }
  return window.showDirectoryPicker({ mode: 'readwrite' });
}

async function unusedFileName(folder: FileSystemDirectoryHandle, name: string) {
  const extensionIndex = name.lastIndexOf('.');
  const base = extensionIndex > 0 ? name.slice(0, extensionIndex) : name;
  const extension = extensionIndex > 0 ? name.slice(extensionIndex) : '';

  for (let index = 0; index < 1000; index++) {
    const candidate = index === 0 ? name : `${base} (${index})${extension}`;
    try {
      await folder.getFileHandle(candidate);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'NotFoundError') {
        return candidate;
      }
      throw reason;
    }
  }

  throw new Error('Could not find an unused file name in the selected folder.');
}

export async function saveImageToFolder(
  folder: FileSystemDirectoryHandle,
  blob: Blob,
  name: string,
) {
  if (folder.requestPermission) {
    const permission = await folder.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      throw new Error('Folder permission was not granted. Choose the folder again.');
    }
  }

  const fileName = await unusedFileName(folder, name);
  const file = await folder.getFileHandle(fileName, { create: true });
  const writable = await file.createWritable();
  await writable.write(blob);
  await writable.close();
  return fileName;
}
