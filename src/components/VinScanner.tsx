"use client";

import { useEffect, useRef, useState } from "react";
import { isLikelyVIN, normalizeVIN } from "@/lib/vin";

type Props = {
  onDetected: (vin: string) => void;
};

export default function VinScanner({ onDetected }: Props) {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_VIN_SCAN === "true";
  const [err, setErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<() => Promise<void> | void>(() => {});

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      // Prefer native BarcodeDetector if available
      // @ts-ignore
      if (globalThis.BarcodeDetector) {
        try {
          // @ts-ignore
          const detector = new BarcodeDetector({ formats: ["code_39", "code_128", "code_93"] });
          const video = document.createElement("video");
          video.playsInline = true;
          video.muted = true;
          video.autoplay = true;
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          video.srcObject = stream;
          boxRef.current?.replaceChildren(video);
          setRunning(true);

          let raf = 0;
          const tick = async () => {
            if (!video.videoWidth) { raf = requestAnimationFrame(tick); return; }
            try {
              const bitmaps = [await createImageBitmap(video)];
              const codes = await detector.detect(bitmaps[0] as any);
              for (const c of codes) {
                const raw = String(c.rawValue || "");
                const vin = normalizeVIN(raw);
                if (isLikelyVIN(vin)) {
                  stopRef.current = () => stream.getTracks().forEach(t => t.stop());
                  stream.getTracks().forEach(t => t.stop());
                  setRunning(false);
                  onDetected(vin);
                  return;
                }
              }
            } catch {}
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          stopRef.current = () => { cancelAnimationFrame(raf); stream.getTracks().forEach(t => t.stop()); };
          return;
        } catch (e:any) {
          setErr(e?.message || "BarcodeDetector failed; falling back.");
        }
      }

      // Fallback: html5-qrcode (supports CODE_39 in new versions)
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        const id = "vin-scan-box";
        if (!boxRef.current) return;
        const mount = document.createElement("div");
        mount.id = id;
        mount.style.width = "100%";
        mount.style.maxWidth = "420px";
        mount.style.aspectRatio = "4/3";
        mount.style.background = "#000";
        boxRef.current.replaceChildren(mount);

        const scanner = new Html5Qrcode(id);
        setRunning(true);
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: { width: 280, height: 120 }, // VIN strip
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_93,
            ],
          },
          (decoded: string) => {
            const vin = normalizeVIN(decoded);
            if (isLikelyVIN(vin)) {
              scanner.stop().catch(() => {});
              setRunning(false);
              onDetected(vin);
            }
          },
          () => {}
        );

        stopRef.current = () => scanner.stop();
      } catch (e:any) {
        setErr(e?.message || "Camera scan not available on this device.");
      }
    })();

    return () => {
      if (!cancelled) {
        try { stopRef.current?.(); } catch {}
      }
      cancelled = true;
    };
  }, [enabled, onDetected]);

  if (!enabled) {
    return <p className="text-sm text-gray-600">VIN scan disabled. Enable with <code>NEXT_PUBLIC_ENABLE_VIN_SCAN=true</code>.</p>;
  }

  return (
    <div className="space-y-2">
      <div ref={boxRef} className="rounded-lg overflow-hidden border bg-black/80" />
      <div className="text-xs text-gray-500">
        {running ? "Point camera at the VIN barcode near the windshield (Code 39)." :
         err ? `Scanner inactive: ${err}` :
         "Scanner ready."}
      </div>
    </div>
  );
}
