export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { getEvent, uploadPhoto } from "@/lib/google-drive";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const eventId = String(form.get("eventId") || "").trim();
    const guestName = String(form.get("guestName") || "").trim();
    const photo = form.get("photo");

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId." }, { status: 400 });
    }

    if (!(photo instanceof File)) {
      return NextResponse.json({ error: "Missing photo file." }, { status: 400 });
    }

    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const arrayBuffer = await photo.arrayBuffer();
    const uploaded = await uploadPhoto({
      event,
      fileName: photo.name,
      mimeType: photo.type || "application/octet-stream",
      bytes: Buffer.from(arrayBuffer),
      guestName,
    });

    return NextResponse.json({ uploaded });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
