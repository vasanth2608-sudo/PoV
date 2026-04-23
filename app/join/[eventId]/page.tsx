"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Camera, CheckCircle2, ImagePlus, Send, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { Card, Input, Button } from "@/components/ui";
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
  const [showCelebration, setShowCelebration] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [publishBurst, setPublishBurst] = useState<string[]>([]);
  const [cameraInputKey, setCameraInputKey] = useState(0);
  const [queuedPreviews, setQueuedPreviews] = useState<{ file: File; url: string }[]>([]);

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

  const target = Math.max(1, eventData?.event.photoTarget ?? 25);
  const guestKey = useMemo(() => normalizeGuestKey(guestName), [guestName]);
  const guestPhotos = useMemo(() => {
    if (!eventData || !guestKey) return [];
    return eventData.photos.filter((photo) => extractGuestKeyFromUpload(photo.fileName) === guestKey);
  }, [eventData, guestKey]);
  const shotSegments = 16;
  const filledShotSegments = Math.min(
    shotSegments,
    Math.round((guestPhotos.length / target) * shotSegments)
  );
  const canUpload = selectedFiles.length > 0 && guestName.trim().length > 0 && !uploading;
  const hasQueuedShots = selectedFiles.length > 0;
  const queuedShotLabel = `${selectedFiles.length} shot${selectedFiles.length === 1 ? "" : "s"}`;

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

  useEffect(() => {
    const previews = selectedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setQueuedPreviews(previews);
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [selectedFiles]);

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
      const burstUrls = selectedFiles.slice(0, 6).map((file) => URL.createObjectURL(file));
      setEventData(refreshedJson);
      setSuccessMessage(`Awesome! ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""} uploaded.`);
      setPublishBurst(burstUrls);
      setTimeout(() => {
        burstUrls.forEach((url) => URL.revokeObjectURL(url));
        setPublishBurst([]);
      }, 1300);
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
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 460);
    triggerCelebration();
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#edf8e9] text-[#050505]">
      <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 md:px-6 md:py-8">
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
          <div className="space-y-4 pb-28 md:space-y-5">
            <div className="grid min-w-0 gap-4 rounded-[1.5rem] border border-black/10 bg-white/45 p-4 shadow-[0_18px_60px_rgba(53,70,48,0.08)] backdrop-blur sm:rounded-[2rem] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[#6f6a61]">POV Join</p>
                <h1 className="mt-2 max-w-3xl break-words text-4xl font-semibold leading-[0.95] text-[#050505] sm:text-5xl">{eventData.event.title}</h1>
                {eventData.event.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#565047]">{eventData.event.description}</p> : null}
              </div>
              <div className="min-w-0 rounded-[1.5rem] border border-black/10 bg-[#f7f3ea]/80 p-4 text-[#050505] shadow-[0_14px_36px_rgba(0,0,0,0.06)] md:w-auto">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-xs font-semibold uppercase text-[#6f6a61]">Your shots</div>
                    <div className="rounded-full bg-[#00c45f]/14 px-2.5 py-1 text-xs font-semibold text-[#008f48]">
                      {Math.round((guestPhotos.length / target) * 100)}%
                    </div>
                  </div>
                  <div className="mt-3 grid min-w-0 gap-3 sm:flex sm:items-center">
                    <div className="flex w-full min-w-0 items-center justify-between gap-1 overflow-hidden rounded-full border border-black/10 bg-[#f3efe4] px-3 py-2 sm:w-72" aria-hidden="true">
                      {Array.from({ length: shotSegments }).map((_, index) => (
                        <span
                          // eslint-disable-next-line react/no-array-index-key
                          key={index}
                          className={`h-3 w-2 shrink-0 rounded-[2px] transition-colors ${index < filledShotSegments ? "bg-[#00c45f]" : "bg-black/10"}`}
                        />
                      ))}
                    </div>
                    <div className="whitespace-nowrap text-sm font-semibold text-[#050505]">
                      {guestPhotos.length} / {target} shots
                    </div>
                  </div>
                </div>
            </div>

            <Card className="overflow-hidden !border-black/10 !bg-[#f7f3ea] !shadow-[0_18px_60px_rgba(53,70,48,0.1)] p-0">
              <div className="grid min-w-0 items-stretch gap-0 bg-white/35 lg:grid-cols-[minmax(0,1.05fr)_minmax(410px,0.52fr)]">
                <div className="flex min-h-full min-w-0 flex-col p-4 text-[#050505] sm:p-6 md:p-7">
                  <div className="flex min-h-20 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="inline-flex items-center rounded-full border border-white/60 bg-white/35 px-3 py-1.5 text-[11px] font-semibold uppercase text-[#006f38] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur">
                        01 Capture
                      </div>
                      <h2 className="mt-4 break-words text-4xl font-semibold leading-[0.98] md:text-[2.75rem]">Create a moment</h2>
                    </div>
                    <div className="flex w-fit max-w-full items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#050505] shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                      <ImagePlus size={15} className="text-[#00c45f]" />
                      <span>{hasQueuedShots ? `${queuedShotLabel} ready` : "0 ready"}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-1 flex-col gap-5">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase text-[#6f6a61]">Name</label>
                      <Input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Vasanth"
                        className="h-14 rounded-full border-black/10 bg-white px-5 text-lg !text-[#050505] caret-[#00c45f] shadow-[inset_0_1px_0_rgba(0,0,0,0.04)] transition placeholder:!text-[#8b857c] selection:bg-[#00c45f]/20 selection:text-[#050505] focus:border-[#00c45f] focus:bg-white"
                      />
                    </div>

                    <label className="moment-stage group relative flex min-h-[22rem] cursor-pointer flex-col overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#eef8ea] transition duration-300 hover:-translate-y-0.5 hover:border-[#00c45f]/50 hover:shadow-[0_30px_90px_rgba(0,0,0,0.14)] sm:rounded-[2rem] md:min-h-[20rem] lg:min-h-[22rem]">
                      {captureFlash ? <span className="capture-flash pointer-events-none absolute inset-0 z-20 bg-white" /> : null}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_36%,rgba(255,255,255,0.9),transparent_18%),radial-gradient(circle_at_72%_55%,rgba(0,196,95,0.2),transparent_31%),linear-gradient(135deg,rgba(255,255,255,0.55),transparent_45%)]" />
                      <div className="relative flex min-h-full min-w-0 flex-col justify-between p-5 sm:p-6 md:p-7">
                        <div className="flex items-start justify-between gap-4">
                          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold uppercase text-[#050505]">
                            <span className="status-dot h-1.5 w-1.5 rounded-full bg-[#00c45f]" />
                            {hasQueuedShots ? "Queued" : "Ready"}
                          </div>
                          <div className="hidden text-right text-[11px] font-semibold uppercase text-[#6f6a61] sm:block">
                            Live Shot
                          </div>
                        </div>

                        <div className="grid flex-1 items-center gap-5 py-6 md:grid-cols-[minmax(0,1fr)_170px] lg:grid-cols-[minmax(0,1fr)_190px]">
                          <div className="min-w-0">
                            <div className="max-w-lg break-words text-4xl font-semibold leading-[0.98] text-[#050505] md:text-5xl">
                              {hasQueuedShots ? "Keep shooting." : "Tap to shoot."}
                            </div>
                            <div className="mt-4 max-w-md break-words text-sm leading-6 text-[#565047]">
                              {hasQueuedShots
                                ? `${queuedShotLabel} waiting in your private queue.`
                                : "Open the camera, capture the moment, review it, then publish."}
                            </div>
                          </div>
                          <div className="relative mx-auto grid h-32 w-32 place-items-center sm:h-40 sm:w-40">
                            <div className="moment-orbit absolute inset-0 rounded-full border border-dashed border-[#00c45f]/25" />
                            <div className="absolute inset-5 rounded-full border border-black/10" />
                            <div className="capture-shutter relative grid h-20 w-20 place-items-center rounded-full border border-black/10 bg-white/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)] transition group-hover:border-[#00c45f]/50 sm:h-24 sm:w-24">
                              <div className="relative z-10 grid h-14 w-14 place-items-center rounded-full bg-white text-[#050505] shadow-[0_18px_50px_rgba(0,0,0,0.12)] transition group-hover:scale-105 sm:h-16 sm:w-16">
                                <Camera size={24} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="moment-marquee rounded-full border border-black/10 bg-white/70 px-4 py-2">
                          <div className="moment-marquee-track text-[11px] font-semibold uppercase text-[#6f6a61]">
                            {Array.from({ length: 2 }).map((_, groupIndex) => (
                              <span key={groupIndex} className="flex gap-4">
                                <span>Capture</span>
                                <span className="text-[#00c45f]">/</span>
                                <span>Review</span>
                                <span className="text-[#00c45f]">/</span>
                                <span>Publish</span>
                                <span className="text-[#00c45f]">/</span>
                              </span>
                            ))}
                          </div>
                        </div>
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
                </div>

                <div className="flex min-h-full min-w-0 flex-col border-t border-black/10 bg-[#eef8ea]/70 p-4 text-[#050505] sm:p-6 lg:border-l lg:border-t-0 md:p-7">
                  <div className="flex min-h-20 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="inline-flex items-center rounded-full border border-white/60 bg-white/35 px-3 py-1.5 text-[11px] font-semibold uppercase text-[#006f38] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur">
                        02 Queue
                      </div>
                      <h3 className="mt-4 break-words text-4xl font-semibold leading-[0.98] text-[#050505] md:text-[2.75rem]">Shot queue</h3>
                      <p className="mt-2 break-words text-sm text-[#565047]">{hasQueuedShots ? `${queuedShotLabel} ready to publish` : "Waiting for the first shot"}</p>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 text-[#050505] shadow-[0_12px_32px_rgba(0,0,0,0.06)] backdrop-blur">
                        <UploadCloud size={20} />
                    </div>
                  </div>

                  <div className="mt-5 flex min-h-[18rem] min-w-0 rounded-[1.5rem] border border-black/10 bg-white/65 p-3 sm:rounded-[2rem] lg:min-h-[22rem]">
                    {hasQueuedShots ? (
                      <div className="grid flex-1 grid-cols-2 content-start gap-4 sm:grid-cols-3 lg:grid-cols-2">
                        {queuedPreviews.map((preview, index) => (
                          <div
                            key={`${preview.file.name}-${preview.file.size}-${index}`}
                            className="queued-shot polaroid-shot group relative bg-white p-2 pb-8 shadow-[0_18px_40px_rgba(53,70,48,0.12)] transition duration-300 hover:-translate-y-1"
                            style={{ rotate: `${[-2, 1.5, -1, 2.2][index % 4]}deg` }}
                          >
                            <div className="relative overflow-hidden rounded-[1rem]">
                              <img src={preview.url} alt={preview.file.name} className="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent opacity-80" />
                              <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[#008f48] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
                                <CheckCircle2 size={15} />
                              </div>
                            </div>
                            <div className="absolute inset-x-3 bottom-2 flex items-center justify-between gap-2 text-[#050505]">
                              <div className="min-w-0 truncate text-[11px] font-semibold">{preview.file.name}</div>
                              <div className="shrink-0 text-[10px] text-[#6f6a61]">{formatBytes(preview.file.size)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="queue-empty grid flex-1 place-items-center overflow-hidden rounded-2xl border border-dashed border-black/10 bg-[#f3efe4]/70 text-center">
                        <div className="relative z-10">
                          <div className="queue-icon mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#008f48] shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                            <ImagePlus size={22} />
                          </div>
                          <div className="mt-3 text-sm font-semibold text-[#050505]">No shots yet</div>
                          <div className="mt-1 text-xs text-[#6f6a61]">The queue wakes up after your first capture.</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {successMessage ? <div className="mt-4 rounded-2xl border border-[#00c45f]/20 bg-[#00c45f]/10 p-3 text-sm text-[#006f38]">{successMessage}</div> : null}
                  {error ? <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden !border-black/10 !bg-[#f7f3ea] !shadow-[0_18px_60px_rgba(53,70,48,0.1)] p-0 text-[#050505]">
              <div className="flex flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6 md:p-7">
                <div className="min-w-0">
                  <div className="inline-flex items-center rounded-full border border-[#00c45f]/20 bg-[#00c45f]/12 px-3 py-1.5 text-[11px] font-semibold uppercase text-[#006f38]">
                    03 Gallery
                  </div>
                  <h2 className="mt-4 break-words text-4xl font-semibold leading-[0.98] text-[#050505] md:text-[2.75rem]">Your photo wall</h2>
                </div>
                <div className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#050505]">
                  {guestPhotos.length} personal upload{guestPhotos.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="space-y-3 p-4 sm:p-6 md:p-7">
                {!guestKey ? (
                  <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/50 p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          // eslint-disable-next-line react/no-array-index-key
                          key={index}
                          className={`grid h-24 place-items-center rounded-[1.25rem] bg-[#edf8e9] ${index === 0 ? "col-span-2 row-span-2 h-full min-h-52" : ""}`}
                        >
                          {index === 0 ? (
                            <div className="text-center">
                              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#008f48] shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                                <Sparkles size={21} />
                              </div>
                              <div className="mt-3 text-sm font-semibold text-[#050505]">Enter your name to reveal your wall.</div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : guestPhotos.length === 0 ? (
                  <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/50 p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          // eslint-disable-next-line react/no-array-index-key
                          key={index}
                          className={`grid h-24 place-items-center rounded-[1.25rem] bg-[#edf8e9] ${index === 0 ? "col-span-2 row-span-2 h-full min-h-52" : ""}`}
                        >
                          {index === 0 ? (
                            <div className="text-center">
                              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#008f48] shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                                <Camera size={21} />
                              </div>
                              <div className="mt-3 text-sm font-semibold text-[#050505]">Your first shot will land here.</div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {guestPhotos.map((photo, index) => (
                      <a
                        key={photo.fileId}
                        href={photo.webViewLink || `/api/photos/${photo.fileId}`}
                        target="_blank"
                        className={`group block overflow-hidden rounded-[1.5rem] border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-[#00c45f]/50 ${
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
                          <div className="truncate text-sm font-semibold text-[#050505]">{photo.fileName}</div>
                          <div className="mt-1 text-xs text-[#6f6a61]">{photo.createdTime ? new Date(photo.createdTime).toLocaleString() : "Uploaded"}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {hasQueuedShots ? (
              <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-full border border-black/10 bg-white/80 p-2 pl-5 shadow-[0_18px_60px_rgba(53,70,48,0.18)] backdrop-blur">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="hidden -space-x-2 sm:flex">
                    {queuedPreviews.slice(0, 3).map((preview, index) => (
                      <img
                        key={`${preview.file.name}-dock-${index}`}
                        src={preview.url}
                        alt=""
                        className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
                      />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#050505]">{queuedShotLabel} ready</div>
                    <div className="truncate text-xs text-[#6f6a61]">{guestName.trim() ? "Ready to publish to the wall." : "Add your name to publish."}</div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" className="h-11 w-11 rounded-full border-black/10 bg-[#f3efe4] px-0 text-[#050505] hover:bg-[#edf8e9]" onClick={() => setSelectedFiles([])} aria-label="Clear captured shots">
                    <Trash2 size={17} />
                  </Button>
                  <Button
                    className="h-11 gap-2 rounded-full bg-[#00c45f] px-5 text-black hover:bg-[#42df83]"
                    onClick={handleUpload}
                    disabled={!canUpload}
                  >
                    {uploading ? <UploadCloud size={17} className="animate-pulse" /> : <Send size={17} />}
                    {uploading ? "Publishing..." : guestName.trim() ? `Publish ${selectedFiles.length}` : "Add name"}
                  </Button>
                </div>
              </div>
            ) : null}

            {publishBurst.length > 0 ? (
              <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
                {publishBurst.map((url, index) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="publish-burst absolute h-20 w-20 rounded-[1rem] border-4 border-white object-cover shadow-[0_20px_50px_rgba(53,70,48,0.25)]"
                    style={{
                      left: `${24 + index * 9}%`,
                      bottom: "6%",
                      animationDelay: `${index * 70}ms`,
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
