export type EventConfig = {
  id: string;
  title: string;
  slug: string;
  date?: string;
  description?: string;
  photoTarget: number;
  promptsEnabled: boolean;
  prompts: string[];
  createdAt: string;
  folderId: string;
  photosFolderId: string;
};

export type UploadRecord = {
  id: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  webViewLink?: string | null;
  createdTime?: string | null;
};
