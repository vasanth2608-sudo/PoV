"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Container, Shell, Card, Input, TextArea, Button } from "@/components/ui";
import { defaultPrompts } from "@/lib/prompts";

type CreatedEvent = {
  id: string;
  title: string;
  joinUrl: string;
  folderUrl: string;
  qrDataUrl: string;
};

type HistoryEvent = {
  id: string;
  title: string;
  date?: string;
  createdAt: string;
  folderId: string;
};

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [photoTarget, setPhotoTarget] = useState(25);
  const [promptsText, setPromptsText] = useState(defaultPrompts.join("\n"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);

  const promptCount = useMemo(() => promptsText.split("\n").map((x) => x.trim()).filter(Boolean).length, [promptsText]);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    setCreated(null);
    try {
      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPassword,
          title,
          date,
          description,
          photoTarget,
          promptsEnabled: true,
          promptsText,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to create event");
      }

      const qrDataUrl = await QRCode.toDataURL(json.joinUrl, { width: 420, margin: 1 });
      setCreated({ ...json, qrDataUrl });
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistory() {
    if (!adminPassword.trim()) {
      setHistoryError("Enter admin password to load event history.");
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/events?adminPassword=${encodeURIComponent(adminPassword)}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to load event history.");
      }
      setHistory(json.events || []);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load event history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleDownloadQr() {
    if (!created) return;
    const fileTitle = created.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "event";
    const link = document.createElement("a");
    link.href = created.qrDataUrl;
    link.download = `${fileTitle}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleCopyJoinUrl() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.joinUrl);
    } catch {
      // Fallback for browsers that block clipboard access.
      window.prompt("Copy this join URL:", created.joinUrl);
    }
  }

  return (
    <Shell>
      <Container>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Host dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold">Create a new POV event</h1>
            <p className="mt-2 text-sm text-neutral-400">This creates a Drive folder, a photos subfolder, and an event.json metadata file.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-neutral-400">Admin password</label>
                <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Enter ADMIN_PASSWORD" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-neutral-400">Event title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meghana & Arjun Wedding" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">Date</label>
                  <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="April 28, 2026" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">Photos per guest</label>
                  <Input type="number" value={photoTarget} onChange={(e) => setPhotoTarget(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-neutral-400">Description</label>
                <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A candid wedding album made by guests." />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-neutral-400">
                  <span>Prompt list</span>
                  <span>{promptCount} prompts</span>
                </div>
                <TextArea value={promptsText} onChange={(e) => setPromptsText(e.target.value)} />
              </div>
              <Button onClick={handleCreate} disabled={loading || !title.trim()}>
                {loading ? "Creating event..." : "Create event"}
              </Button>
              {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold">QR output</h2>
            {!created ? (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 p-8 text-sm text-neutral-500">
                Create an event to see the QR code, join URL, and Drive folder link here.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-white p-4">
                  <img src={created.qrDataUrl} alt="QR code" className="w-full rounded-2xl" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="secondary" onClick={handleDownloadQr}>
                    Download QR (PNG)
                  </Button>
                  <Button variant="secondary" onClick={handleCopyJoinUrl}>
                    Copy join URL
                  </Button>
                </div>
                <Link
                  href={`/print?title=${encodeURIComponent(created.title)}&joinUrl=${encodeURIComponent(created.joinUrl)}`}
                  target="_blank"
                >
                  <Button className="w-full" variant="secondary">
                    Open print card
                  </Button>
                </Link>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Join URL</div>
                  <div className="mt-2 break-all text-sm text-neutral-200">{created.joinUrl}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Drive folder</div>
                  <a href={created.folderUrl} target="_blank" className="mt-2 block break-all text-sm text-emerald-300 underline underline-offset-4">
                    {created.folderUrl}
                  </a>
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Event history</h2>
              <p className="mt-1 text-sm text-neutral-400">
                {history.length} {history.length === 1 ? "event" : "events"} found
              </p>
            </div>
            <Button variant="secondary" onClick={fetchHistory} disabled={historyLoading}>
              {historyLoading ? "Loading..." : "Refresh history"}
            </Button>
          </div>

          {historyError ? <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{historyError}</div> : null}

          {history.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-neutral-500">
              No events yet. Create your first event or click Refresh history after entering admin password.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {history.map((event) => {
                const joinUrl = `/join/${event.id}`;
                const createdAt = new Date(event.createdAt);
                const createdText = Number.isNaN(createdAt.getTime()) ? event.createdAt : createdAt.toLocaleString();
                return (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-lg font-medium text-neutral-100">{event.title}</div>
                        <div className="mt-1 text-sm text-neutral-400">{event.date || "Date not set"}</div>
                        <div className="mt-1 text-xs text-neutral-500">Created {createdText}</div>
                      </div>
                      <div className="text-xs text-neutral-500">{event.id}</div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Link href={joinUrl} target="_blank" className="text-sm text-emerald-300 underline underline-offset-4">
                        Open join page
                      </Link>
                      <a
                        href={`https://drive.google.com/drive/folders/${event.folderId}`}
                        target="_blank"
                        className="text-sm text-emerald-300 underline underline-offset-4"
                      >
                        Open Drive folder
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Container>
    </Shell>
  );
}
