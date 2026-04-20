export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { listEvents } from "@/lib/google-drive";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminPassword = String(searchParams.get("adminPassword") || "");
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
    }

    const events = await listEvents();
    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load events.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
