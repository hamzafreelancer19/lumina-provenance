declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<FileSystemDirectoryHandle>;
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
  const fileName = await unusedFileName(folder, name);
  const file = await folder.getFileHandle(fileName, { create: true });
  const writable = await file.createWritable();
  await writable.write(blob);
  await writable.close();
  return fileName;
}
