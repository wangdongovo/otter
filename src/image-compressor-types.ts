export interface SelectedImageFile {
  path: string;
  name: string;
  size: number;
}

export interface SaveCompressedImagePayload {
  outputDir: string;
  fileName: string;
  dataUrl: string;
}

export interface SavePastedImagePayload {
  dataUrl: string;
  fileName?: string;
}

export interface SavedCompressedImage {
  path: string;
  size: number;
}

export interface ImageCompressorApi {
  selectImageFiles: () => Promise<SelectedImageFile[]>;
  selectOutputFolder: () => Promise<string | null>;
  readImageDataUrl: (filePath: string) => Promise<string>;
  readClipboardImage: () => Promise<SelectedImageFile | null>;
  savePastedImage: (
    payload: SavePastedImagePayload,
  ) => Promise<SelectedImageFile>;
  saveCompressedImage: (
    payload: SaveCompressedImagePayload,
  ) => Promise<SavedCompressedImage>;
  showImageInFolder: (filePath: string) => Promise<void>;
}

declare global {
  interface Window {
    imageCompressor: ImageCompressorApi;
  }
}
