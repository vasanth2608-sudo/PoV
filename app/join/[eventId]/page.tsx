"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Camera } from "lucide-react";
import { Container, Shell, Card, Input, Button } from "@/components/ui";
import { EventConfig, UploadRecord } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

type EventPayload = {
  event: EventConfig;
  photos: UploadRecord[];
};

function normalizeGuestKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractGuestKeyFromUpload(fileName: string): string | null {
  const match = fileName.match(/^(.*)-\d{8}-\d{6}-[a-z0-9]{4}\.[a-z0-9]+$/i);
  return match?.[1] || null;
}

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
  const [showCelebration, setShowCelebration] = useState(false);
  const [cameraInputKey, setCameraInputKey] = useState(0);

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
  const guestKey = useMemo(() => normalizeGuestKey(guestName), [guestName]);
  const guestPhotos = useMemo(() => {
    if (!eventData || !guestKey) return [];
    return eventData.photos.filter((photo) => extractGuestKeyFromUpload(photo.fileName) === guestKey);
  }, [eventData, guestKey]);

  function triggerCelebration() {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 1200);
  }

  useEffect(() => {
    if (!eventId) return;
    const key = `pov-guest-name:${eventId}`;
    const stored = window.localStorage.getItem(key);
    if (stored) {
      setGuestName(stored);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const key = `pov-guest-name:${eventId}`;
    if (guestName.trim()) {
      window.localStorage.setItem(key, guestName.trim());
    }
  }, [eventId, guestName]);

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
        triggerCelebration();
      }

      const refreshed = await fetch(`/api/events/${eventId}`);
      const refreshedJson = await refreshed.json();
      if (!refreshed.ok) throw new Error(refreshedJson.error || "Upload succeeded but refresh failed");
      setEventData(refreshedJson);
      setSuccessMessage(`Awesome! ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""} uploaded.`);
      setSelectedFiles([]);
      setCameraInputKey((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleCameraCapture(fileList: FileList | null) {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    // Keep adding newly captured photos so guests can take multiple shots before one upload.
    setSelectedFiles((prev) => [...prev, ...incoming]);
    triggerCelebration();
  }

  return (
    <Shell>
      <Container>
        {showCelebration ? (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {Array.from({ length: 36 }).map((_, index) => (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="absolute block h-2 w-2 animate-[confetti-fall_1.2s_ease-out_forwards] rounded-full"
                style={{
                  left: `${(index * 13) % 100}%`,
                  top: "-10px",
                  backgroundColor: ["#22c55e", "#f43f5e", "#3b82f6", "#f59e0b", "#a855f7", "#06b6d4"][index % 6],
                  animationDelay: `${(index % 8) * 20}ms`,
                  transform: `rotate(${index * 23}deg)`,
                }}
              />
            ))}
            <style jsx global>{`
              @keyframes confetti-fall {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(110vh) rotate(540deg); opacity: 0; }
              }
            `}</style>
          </div>
        ) : null}

        {loading ? (
          <Card className="p-6">Loading event...</Card>
        ) : error ? (
          <Card className="p-6 text-red-200">{error}</Card>
        ) : eventData ? (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">POV Join</p>
                  <h1 className="mt-3 text-3xl font-semibold">{eventData.event.title}</h1>
                  {eventData.event.description ? <p className="mt-3 text-sm text-neutral-300">{eventData.event.description}</p> : null}
                </div>
                <div className="shrink-0 rounded-3xl border border-white/10 bg-black/20 p-4 text-center">
                  <div
                    className="mx-auto grid h-20 w-20 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(#22c55e ${progress * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                    }}
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-black text-sm font-semibold text-white">
                      {progress}%
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-neutral-400">Your shots</div>
                  <div className="text-xs text-neutral-500">{guestPhotos.length} / {target}</div>
                </div>
              </div>

              {currentPrompt ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
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
                  <label className="mb-2 block text-sm text-neutral-400">Name</label>
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Vasanth" />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-neutral-400">Click photo</label>
                  <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-300">
                      <Camera size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-100">Open camera</div>
                      <div className="text-xs text-neutral-500">Capture moments live from your phone camera</div>
                    </div>
                    <input
                      key={cameraInputKey}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => handleCameraCapture(e.target.files)}
                    />
                  </label>
                </div>

                {selectedFiles.length > 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm text-neutral-400">Captured photos</div>
                    <div className="mt-3 space-y-2">
                      {selectedFiles.map((file) => (
                        <div key={`${file.name}-${file.size}`} className="flex items-center justify-between text-sm text-neutral-200">
                          <span className="truncate">{file.name}</span>
                          <span className="text-neutral-500">{formatBytes(file.size)}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="secondary" className="mt-3" onClick={() => setSelectedFiles([])}>
                      Clear captured photos
                    </Button>
                  </div>
                ) : null}

                <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0 || !guestName.trim()}>
                  {uploading ? "Uploading..." : "Upload to Drive"}
                </Button>
                {successMessage ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{successMessage}</div> : null}
                {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-semibold">Your photo wall</h2>
              <p className="mt-1 text-sm text-neutral-400">Only photos uploaded with your name appear here.</p>
              <div className="mt-4 space-y-3">
                {!guestKey ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-neutral-500">
                    Enter your name to start your personal photo wall.
                  </div>
                ) : guestPhotos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-neutral-500">
                    No uploads from you yet. Capture your first shot and build your wall.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {guestPhotos.map((photo, index) => (
                      <a
                        key={photo.fileId}
                        href={photo.webViewLink || `/api/photos/${photo.fileId}`}
                        target="_blank"
                        className={`group block overflow-hidden rounded-2xl border border-white/10 bg-black/20 transition hover:-translate-y-0.5 hover:bg-black/30 ${
                          index % 5 === 0 ? "sm:col-span-2" : ""
                        }`}
                      >
                        <img
                          src={`/api/photos/${photo.fileId}`}
                          alt={photo.fileName}
                          loading="lazy"
                          className={`w-full object-cover transition duration-300 group-hover:scale-[1.03] ${
                            index % 5 === 0 ? "h-52" : "h-36"
                          }`}
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
        ) : null}
      </Container>
    </Shell>
  );
}
