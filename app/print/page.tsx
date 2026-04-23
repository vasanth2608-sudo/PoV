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
        const dataUrl = await QRCode.toDataURL(joinUrl, {
          color: {
            dark: "#111111",
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
          margin: 1,
          width: 1200,
        });
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
    <main className="min-h-screen bg-[#edf8e9] px-4 py-8 text-[#111111] sm:px-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl print:max-w-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">4x6 QR Card Preview</h1>
            <p className="text-sm text-[#5f6958]">Botanical print template for {eventTitle}.</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#3f5934] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(63,89,52,0.22)] transition hover:bg-[#2f4426]"
          >
            Print 4x6
          </button>
        </div>

        <section className="qr-print-card relative mx-auto aspect-[2/3] w-full max-w-[520px] overflow-hidden bg-white shadow-[0_30px_90px_rgba(58,74,52,0.18)] print:h-[6in] print:w-[4in] print:max-w-none print:shadow-none">
          <div className="absolute inset-[0.22in] border border-[#45613a]" />
          <div className="absolute inset-[0.28in] border border-[#45613a]/45" />

          <div className="leaf-spray leaf-spray-top" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="leaf-spray leaf-spray-bottom" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>

          <div className="corner-lines corner-lines-top" aria-hidden="true" />
          <div className="corner-lines corner-lines-bottom" aria-hidden="true" />

          <div className="absolute left-1/2 top-[0.26in] h-[0.18in] w-[0.18in] -translate-x-1/2 text-[#45613a]" aria-hidden="true">
            <span className="ornament-dot ornament-dot-left" />
            <span className="ornament-dot ornament-dot-right" />
            <span className="ornament-flourish" />
          </div>
          <div className="absolute bottom-[0.26in] left-1/2 h-[0.18in] w-[0.18in] -translate-x-1/2 rotate-180 text-[#45613a]" aria-hidden="true">
            <span className="ornament-dot ornament-dot-left" />
            <span className="ornament-dot ornament-dot-right" />
            <span className="ornament-flourish" />
          </div>

          <div className="relative z-10 flex h-full flex-col items-center px-[0.44in] pb-[0.62in] pt-[1.16in] text-center">
            <p className="text-[0.16in] font-medium uppercase text-[#111111]">Capture the</p>

            <div className="mt-[0.18in] flex w-[1.9in] items-center justify-center gap-[0.08in]" aria-hidden="true">
              <span className="h-px flex-1 bg-[#b08a45]" />
              <span className="h-[0.11in] w-[0.11in] rotate-45 border border-[#b08a45]" />
              <span className="h-px flex-1 bg-[#b08a45]" />
            </div>

            <div className="mt-[0.16in] font-serif text-[0.36in] italic leading-none text-[#4b6b3f]">
              love
            </div>
            <div className="mt-[0.16in] text-[0.15in] font-medium text-[#b08a45]">+</div>
            <p className="mt-[0.16in] max-w-[2.45in] text-[0.16in] font-medium uppercase leading-[1.45] text-[#111111]">
              And share your photos with us
            </p>

            <p className="mt-[0.28in] max-w-[2.7in] font-serif text-[0.13in] italic leading-[1.7] text-[#45613a]">
              scan the code and upload your photos to share with everyone
            </p>

            <div className="mt-[0.24in] w-[1.86in] overflow-hidden rounded-[0.1in] border-[0.035in] border-[#4b6b3f] bg-white">
              <div className="bg-white p-[0.1in]">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR code for ${eventTitle}`} className="aspect-square w-full" />
                ) : (
                  <div className="aspect-square w-full animate-pulse bg-[#f4f1eb]" />
                )}
              </div>
              <div className="bg-[#4b6b3f] py-[0.055in] text-[0.13in] font-medium uppercase text-white">
                Scan me
              </div>
            </div>

            <p className="mt-[0.16in] max-w-[2.7in] break-words text-[0.075in] leading-[1.35] text-[#6d765f] print:hidden">
              {joinUrl || "Missing join URL. Re-open this card from the admin page."}
            </p>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @page {
          margin: 0;
          size: 4in 6in;
        }

        @media print {
          html,
          body {
            height: 6in;
            width: 4in;
          }
        }

        .qr-print-card {
          border-radius: 0.08in;
        }

        @media print {
          .qr-print-card {
            border-radius: 0;
          }
        }

        .leaf-spray {
          height: 1.2in;
          position: absolute;
          width: 0.46in;
          z-index: 5;
        }

        .leaf-spray::before {
          background: #45613a;
          content: "";
          height: 1.1in;
          left: 0.21in;
          position: absolute;
          top: 0.1in;
          transform: rotate(1deg);
          width: 0.012in;
        }

        .leaf-spray span {
          background: radial-gradient(circle at 70% 35%, #f8fbf2, #77936b 42%, #334d2d 100%);
          border-radius: 100% 0 100% 0;
          display: block;
          height: 0.2in;
          left: 0.1in;
          position: absolute;
          transform-origin: 90% 90%;
          width: 0.1in;
        }

        .leaf-spray span:nth-child(1) { left: 0.17in; top: 0.02in; transform: rotate(132deg); }
        .leaf-spray span:nth-child(2) { left: 0.05in; top: 0.2in; transform: rotate(112deg); }
        .leaf-spray span:nth-child(3) { left: 0.25in; top: 0.32in; transform: rotate(32deg); }
        .leaf-spray span:nth-child(4) { left: 0.04in; top: 0.48in; transform: rotate(112deg); }
        .leaf-spray span:nth-child(5) { left: 0.25in; top: 0.62in; transform: rotate(35deg); }
        .leaf-spray span:nth-child(6) { left: 0.06in; top: 0.78in; transform: rotate(112deg); }
        .leaf-spray span:nth-child(7) { left: 0.25in; top: 0.9in; transform: rotate(34deg); }

        .leaf-spray-top {
          left: 0.12in;
          top: 0.1in;
        }

        .leaf-spray-bottom {
          bottom: 0.12in;
          right: 0.12in;
          transform: rotate(180deg);
        }

        .corner-lines {
          height: 0.25in;
          position: absolute;
          width: 0.25in;
          z-index: 4;
        }

        .corner-lines::before,
        .corner-lines::after {
          border-color: #45613a;
          content: "";
          height: 0.2in;
          position: absolute;
          width: 0.2in;
        }

        .corner-lines-top {
          right: 0.2in;
          top: 0.2in;
        }

        .corner-lines-top::before {
          border-right: 0.012in solid;
          border-top: 0.012in solid;
          right: 0;
          top: 0;
        }

        .corner-lines-top::after {
          border-right: 0.012in solid;
          border-top: 0.012in solid;
          right: 0.08in;
          top: 0.08in;
        }

        .corner-lines-bottom {
          bottom: 0.2in;
          left: 0.2in;
        }

        .corner-lines-bottom::before {
          border-bottom: 0.012in solid;
          border-left: 0.012in solid;
          bottom: 0;
          left: 0;
        }

        .corner-lines-bottom::after {
          border-bottom: 0.012in solid;
          border-left: 0.012in solid;
          bottom: 0.08in;
          left: 0.08in;
        }

        .ornament-dot {
          background: #45613a;
          border-radius: 999px;
          height: 0.018in;
          position: absolute;
          top: 0.08in;
          width: 0.018in;
        }

        .ornament-dot-left {
          left: -0.18in;
        }

        .ornament-dot-right {
          right: -0.18in;
        }

        .ornament-flourish {
          background:
            radial-gradient(circle at 50% 50%, #45613a 0 0.022in, transparent 0.024in),
            linear-gradient(45deg, transparent 44%, #45613a 45% 55%, transparent 56%),
            linear-gradient(-45deg, transparent 44%, #45613a 45% 55%, transparent 56%);
          display: block;
          height: 0.18in;
          width: 0.18in;
        }
      `}</style>
    </main>
  );
}
