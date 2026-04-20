"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function PrintCardPage() {
  const [eventTitle, setEventTitle] = useState("Photo Challenge");
  const [joinUrl, setJoinUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEventTitle(params.get("title") || "Photo Challenge");
    setJoinUrl(params.get("joinUrl") || "");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function buildQr() {
      if (!joinUrl) {
        setQrDataUrl("");
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(joinUrl, { width: 1200, margin: 2 });
        if (mounted) setQrDataUrl(dataUrl);
      } catch {
        if (mounted) setQrDataUrl("");
      }
    }

    void buildQr();
    return () => {
      mounted = false;
    };
  }, [joinUrl]);

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-neutral-900 sm:px-8">
      <div className="mx-auto max-w-3xl print:max-w-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">Print Card Preview</h1>
            <p className="text-sm text-neutral-600">Use this page to print an event QR card.</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Print
          </button>
        </div>

        <section className="rounded-3xl border-2 border-neutral-900 bg-white p-8 shadow-sm print:rounded-none print:border print:p-6 print:shadow-none">
          <p className="text-center text-xs uppercase tracking-[0.35em] text-neutral-500">POV Photo Challenge</p>
          <h2 className="mt-3 text-center text-4xl font-semibold">{eventTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-lg text-neutral-700">Scan to upload your photos and videos to the shared event album.</p>

          <div className="mx-auto mt-8 w-full max-w-[360px] rounded-2xl border border-neutral-300 bg-white p-4">
            {qrDataUrl ? <img src={qrDataUrl} alt="Event QR code" className="w-full" /> : <div className="aspect-square w-full animate-pulse rounded-lg bg-neutral-100" />}
          </div>

          <div className="mx-auto mt-6 max-w-xl rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Backup URL</p>
            <p className="mt-2 break-all text-sm text-neutral-700">{joinUrl || "Missing join URL. Re-open this page from /admin."}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
