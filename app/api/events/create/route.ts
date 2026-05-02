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
    const normalized = normalizeCreateEventError(error);
    console.error("[api/events/create] failed", normalized.log);
    return NextResponse.json(
      {
        error: normalized.message,
        code: normalized.code,
      },
      { status: normalized.status }
    );
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

type NormalizedCreateEventError = {
  status: number;
  code: string;
  message: string;
  log: Record<string, unknown>;
};

function normalizeCreateEventError(error: unknown): NormalizedCreateEventError {
  const errObj = asRecord(error);
  const message = error instanceof Error ? error.message : "Failed to create event.";
  const responseData = asRecord(errObj?.response?.data);
  const responseStatus = typeof errObj?.response?.status === "number" ? errObj.response.status : undefined;
  const apiErrorDescription =
    typeof responseData?.error_description === "string" ? responseData.error_description : undefined;
  const apiErrorCode = typeof responseData?.error === "string" ? responseData.error : undefined;

  const lowered = `${message} ${apiErrorDescription || ""} ${apiErrorCode || ""}`.toLowerCase();

  if (lowered.includes("missing environment variable")) {
    return {
      status: 500,
      code: "CONFIG_MISSING_ENV",
      message,
      log: {
        code: "CONFIG_MISSING_ENV",
        message,
      },
    };
  }

  if (lowered.includes("invalid_grant") || lowered.includes("unauthorized_client") || lowered.includes("invalid_client")) {
    return {
      status: 502,
      code: "GOOGLE_AUTH_FAILED",
      message: "Google OAuth credentials are invalid or expired.",
      log: {
        code: "GOOGLE_AUTH_FAILED",
        message,
        apiErrorCode,
        apiErrorDescription,
        responseStatus,
      },
    };
  }

  return {
    status: 500,
    code: "EVENT_CREATE_FAILED",
    message,
    log: {
      code: "EVENT_CREATE_FAILED",
      message,
      apiErrorCode,
      apiErrorDescription,
      responseStatus,
    },
  };
}

function asRecord(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, any>;
}
