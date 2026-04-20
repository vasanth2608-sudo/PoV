import { google, drive_v3 } from "googleapis";
import { Readable } from "node:stream";
import { requireEnv } from "@/lib/env";
import { EventConfig, UploadRecord } from "@/lib/types";
import { makeSlug, randomId } from "@/lib/utils";

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

type GoogleAuthBundle = {
  drive: drive_v3.Drive;
};

function getAuth(): GoogleAuthBundle {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = requireEnv("GOOGLE_REDIRECT_URI");
  const refreshToken = requireEnv("GOOGLE_REFRESH_TOKEN");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const drive = google.drive({ version: "v3", auth: oauth2Client });
  return { drive };
}

async function createFolder(name: string, parentId?: string) {
  const { drive } = getAuth();
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: DRIVE_FOLDER_MIME,
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id,name",
  });

  if (!response.data.id) {
    throw new Error(`Failed to create folder: ${name}`);
  }

  return { id: response.data.id, name: response.data.name || name };
}

async function findFileByName(parentId: string | undefined, name: string) {
  const { drive } = getAuth();
  const clauses = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    "trashed = false",
  ];

  if (parentId) {
    clauses.push(`'${parentId}' in parents`);
  }

  const response = await drive.files.list({
    q: clauses.join(" and "),
    fields: "files(id,name,mimeType)",
    pageSize: 10,
  });

  return response.data.files?.[0] || null;
}

export async function ensureRootFolder() {
  const configured = process.env.DRIVE_ROOT_FOLDER_ID;
  if (configured) return configured;

  const existing = await findFileByName(undefined, "POV App");
  if (existing?.id) return existing.id;

  const created = await createFolder("POV App");
  return created.id;
}

export async function createEvent(input: {
  title: string;
  date?: string;
  description?: string;
  photoTarget: number;
  promptsEnabled: boolean;
  prompts: string[];
}): Promise<EventConfig> {
  const rootId = await ensureRootFolder();
  const slug = makeSlug(input.title || `event-${randomId(4)}`);
  const eventId = `${slug}-${randomId(6)}`;
  const eventFolder = await createFolder(eventId, rootId);
  const photosFolder = await createFolder("photos", eventFolder.id);
  await createFolder("metadata", eventFolder.id);

  const event: EventConfig = {
    id: eventId,
    title: input.title,
    slug,
    date: input.date,
    description: input.description,
    photoTarget: input.photoTarget,
    promptsEnabled: input.promptsEnabled,
    prompts: input.prompts,
    createdAt: new Date().toISOString(),
    folderId: eventFolder.id,
    photosFolderId: photosFolder.id,
  };

  await upsertJsonFile({
    fileName: "event.json",
    parentId: eventFolder.id,
    data: event,
  });

  return event;
}

export async function getEvent(eventId: string): Promise<EventConfig | null> {
  const rootId = await ensureRootFolder();
  const { drive } = getAuth();

  const folderRes = await drive.files.list({
    q: `name = '${eventId.replace(/'/g, "\\'")}' and '${rootId}' in parents and mimeType = '${DRIVE_FOLDER_MIME}' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 1,
  });

  const folder = folderRes.data.files?.[0];
  if (!folder?.id) return null;

  const eventJson = await findFileByName(folder.id, "event.json");
  if (!eventJson?.id) return null;

  const content = await drive.files.get({ fileId: eventJson.id, alt: "media" }, { responseType: "text" });
  const text = typeof content.data === "string" ? content.data : JSON.stringify(content.data);
  return JSON.parse(text) as EventConfig;
}

export async function listEventPhotos(event: EventConfig): Promise<UploadRecord[]> {
  const { drive } = getAuth();
  const response = await drive.files.list({
    q: `'${event.photosFolderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,webViewLink,createdTime)",
    orderBy: "createdTime desc",
    pageSize: 200,
  });

  return (response.data.files || []).map((file) => ({
    id: file.id || randomId(),
    fileId: file.id || "",
    fileName: file.name || "Untitled",
    mimeType: file.mimeType || "application/octet-stream",
    webViewLink: file.webViewLink,
    createdTime: file.createdTime,
  }));
}

export async function uploadPhoto(args: {
  event: EventConfig;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  guestName?: string;
}) {
  const { drive } = getAuth();
  const safeGuest = args.guestName ? makeSlug(args.guestName).slice(0, 24) : "guest";
  const stampedName = `${safeGuest}-${Date.now()}-${args.fileName}`;

  const response = await drive.files.create({
    requestBody: {
      name: stampedName,
      parents: [args.event.photosFolderId],
    },
    media: {
      mimeType: args.mimeType,
      body: Readable.from(args.bytes),
    },
    fields: "id,name,webViewLink,createdTime,mimeType",
  });

  if (!response.data.id) {
    throw new Error("Upload failed: missing file id");
  }

  return {
    id: response.data.id,
    fileId: response.data.id,
    fileName: response.data.name || stampedName,
    mimeType: response.data.mimeType || args.mimeType,
    webViewLink: response.data.webViewLink,
    createdTime: response.data.createdTime,
  } satisfies UploadRecord;
}

async function upsertJsonFile(args: { fileName: string; parentId: string; data: unknown }) {
  const { drive } = getAuth();
  const existing = await findFileByName(args.parentId, args.fileName);
  const media = {
    mimeType: "application/json",
    body: Readable.from([JSON.stringify(args.data, null, 2)]),
  };

  if (existing?.id) {
    await drive.files.update({
      fileId: existing.id,
      media,
    });
    return existing.id;
  }

  const created = await drive.files.create({
    requestBody: {
      name: args.fileName,
      parents: [args.parentId],
      mimeType: "application/json",
    },
    media,
    fields: "id",
  });

  return created.data.id || null;
}
