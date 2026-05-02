export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { createEvent } from "@/lib/google-drive";
import { parsePrompts, createEventSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createEventSchema.parse(body);

    if (parsed.adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
    }

    const event = await createEvent({
      title: parsed.title,
      date: parsed.date,
      description: parsed.description,
      photoTarget: parsed.photoTarget,
      promptsEnabled: parsed.promptsEnabled,
      prompts: parsePrompts(parsed.promptsText),
    });

    const baseUrl = resolveBaseUrl(request);

    return NextResponse.json({
      id: event.id,
      title: event.title,
      joinUrl: `${baseUrl}/join/${event.id}`,
      folderUrl: `https://drive.google.com/drive/folders/${event.folderId}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


function resolveBaseUrl(request: Request): string {
  const headerOrigin = request.headers.get("origin");
  if (headerOrigin) return headerOrigin;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return appUrl;
  }
}
