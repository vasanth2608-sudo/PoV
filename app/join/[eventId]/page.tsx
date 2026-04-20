"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Container, Shell, Card, Input, Button } from "@/components/ui";
import { EventConfig, UploadRecord } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

type EventPayload = {
  event: EventConfig;
  photos: UploadRecord[];
};

export default function JoinEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [guestName, setGuestName] = useState("");
  const [eventData, setEventData] = useState<EventPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Failed to load event");
        if (!ignore) setEventData(json);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (eventId) load();
    return () => {
      ignore = true;
    };
  }, [eventId]);

  const currentPrompt = useMemo(() => {
    if (!eventData?.event.prompts?.length) return null;
    return eventData.event.prompts[promptIndex % eventData.event.prompts.length];
  }, [eventData, promptIndex]);

  const uploadedCount = eventData?.photos.length ?? 0;
  const target = eventData?.event.photoTarget ?? 25;
  const progress = Math.min(100, Math.round((uploadedCount / target) * 100));

  async function handleUpload() {
    if (!eventData || selectedFiles.length === 0) return;
    try {
      setUploading(true);
      setError(null);
      setSuccessMessage(null);

      for (const file of selectedFiles) {
        const form = new FormData();
        form.append("eventId", eventData.event.id);
        form.append("guestName", guestName);
        form.append("photo", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || `Failed to upload ${file.name}`);
      }

      const refreshed = await fetch(`/api/events/${eventId}`);
      const refreshedJson = await refreshed.json();
      if (!refreshed.ok) throw new Error(refreshedJson.error || "Upload succeeded but refresh failed");
      setEventData(refreshedJson);
      setSuccessMessage(`${selectedFiles.length} file(s) uploaded to Drive.`);
      setSelectedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Shell>
      <Container>
        {loading ? (
          <Card className="p-6">Loading event...</Card>
        ) : error ? (
          <Card className="p-6 text-red-200">{error}</Card>
        ) : eventData ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <Card className="p-6">
                <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">POV Join</p>
                <h1 className="mt-3 text-3xl font-semibold">{eventData.event.title}</h1>
                <p className="mt-2 text-sm text-neutral-400">{eventData.event.date || "Date TBD"}</p>
                {eventData.event.description ? <p className="mt-4 text-sm text-neutral-300">{eventData.event.description}</p> : null}
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-neutral-400">Photo challenge</div>
                    <div className="mt-2 text-2xl font-semibold">Capture {target} moments</div>
                    <div className="mt-2 text-sm text-neutral-400">Every upload goes straight to the event folder in Google Drive.</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                    <div className="text-xs text-neutral-500">Uploaded</div>
                    <div className="text-xl font-semibold">{uploadedCount} / {target}</div>
                  </div>
                </div>
                <div className="mt-4 h-3 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
                </div>

                {currentPrompt ? (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Random Prompt</div>
                    <div className="mt-3 text-lg font-medium">{currentPrompt}</div>
                    <Button variant="secondary" className="mt-4" onClick={() => setPromptIndex((v) => v + 1)}>
                      Next prompt
                    </Button>
                  </div>
                ) : null}
              </Card>

              <Card className="p-6">
                <h2 className="text-2xl font-semibold">Upload photos</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">Your name or nickname</label>
                    <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Vasanth" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">Choose images</label>
                    <Input type="file" multiple accept="image/*" onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} />
                  </div>

                  {selectedFiles.length > 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-sm text-neutral-400">Selected files</div>
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="flex items-center justify-between text-sm text-neutral-200">
                            <span>{file.name}</span>
                            <span className="text-neutral-500">{formatBytes(file.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
                    {uploading ? "Uploading..." : "Upload to Drive"}
                  </Button>
                  {successMessage ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{successMessage}</div> : null}
                  {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-2xl font-semibold">Live gallery</h2>
                <div className="mt-4 space-y-3">
                  {eventData.photos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-neutral-500">No photos yet. Be the first guest to upload.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {eventData.photos.map((photo) => (
                        <a
                          key={photo.fileId}
                          href={photo.webViewLink || `/api/photos/${photo.fileId}`}
                          target="_blank"
                          className="block overflow-hidden rounded-2xl border border-white/10 bg-black/20 hover:bg-black/30"
                        >
                          <img
                            src={`/api/photos/${photo.fileId}`}
                            alt={photo.fileName}
                            loading="lazy"
                            className="h-40 w-full object-cover"
                          />
                          <div className="p-3">
                            <div className="truncate text-sm font-medium text-neutral-200">{photo.fileName}</div>
                            <div className="mt-1 text-xs text-neutral-500">{photo.createdTime ? new Date(photo.createdTime).toLocaleString() : "Uploaded"}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </Container>
    </Shell>
  );
}
