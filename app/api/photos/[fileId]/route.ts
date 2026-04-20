export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getPhotoContent } from "@/lib/google-drive";

export async function GET(_: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params;
    const { bytes, mimeType } = await getPhotoContent(fileId);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load photo.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
