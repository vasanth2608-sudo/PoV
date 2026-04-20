export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { getEvent, listEventPhotos } from "@/lib/google-drive";

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const photos = await listEventPhotos(event);
    return NextResponse.json({ event, photos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load event.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
