'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  onDetected: (vin: string) => void;
};

function isLikelyVIN(s: string) {
  const v = s.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return v.length === 17 && !/[IOQ]/.test(v);
}

export default function VinScanner({ onDetected }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const stopRef = useRef<() => Promise<void> | void>(() => {});

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // 1) Try native BarcodeDetector
      try {
        // @ts-ignore
        const BD = (window as any).BarcodeDetector;
        if (BD && Array.isArray(BD.getSupportedFormats)) {
          const supported = await BD.getSupportedFormats();
          const ok = supported.some((f: string) =>
            ['code_39', 'code_128', 'code_93', 'qr_code'].includes(f?.toLowerCase?.())
          );

          const video = document.createElement('video');
          video.playsInline = true;
          video.muted = true;
          video.autoplay = true;
          video.style.width = '100%';
          video.style.maxWidth = '480px';
          video.style.borderRadius = '12px';
          video.style.background = '#000';

          if (!hostRef.current) return;
          hostRef.current.innerHTML = '';
          hostRef.current.appendChild(video);

          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
          video.srcObject = stream;

          const detector = new BD({ formats: ok ? ['code_39', 'code_128', 'code_93', 'qr_code'] : undefined });
          let raf = 0;

          const tick = async () => {
            if (cancelled) return;
            try {
              if (video.readyState >= 2) {
                const bitmap = await createImageBitmap(video);
                const codes = await detector.detect(bitmap);
                bitmap.close();
                const text = codes?.[0]?.rawValue as string | undefined;
                if (text && isLikelyVIN(text)) {
                  onDetected(text.replace(/[^A-Z0-9]/gi, '').toUpperCase());
                  return; // stop after first good VIN
                }
              }
            } catch {/* ignore per frame */}
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);

          stopRef.current = async () => {
            cancelAnimationFrame(raf);
            stream.getTracks().forEach(t => t.stop());
          };
          return; // success path
        }
      } catch {
        /* fall through to html5-qrcode */
      }

      // 2) Fallback: Html5QrcodeScanner (formatsToSupport valid here)
      try {
        const { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeScanType } = await import('html5-qrcode');
        const containerId = 'vin-scanner-host';

        if (!hostRef.current) return;
        hostRef.current.innerHTML = `<div id="${containerId}"></div>`;

        const scanner = new Html5QrcodeScanner(
          containerId,
          {
            fps: 12,
            qrbox: { width: 280, height: 120 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
          },
          /* verbose */ false
        );

        const onSuccess = (decodedText: string) => {
          const t = (decodedText || '').toUpperCase();
          if (isLikelyVIN(t)) {
            onDetected(t.replace(/[^A-Z0-9]/g, ''));
            scanner.clear().catch(() => {});
          }
        };

        scanner.render(onSuccess, /* onError */ () => {});
        stopRef.current = () => scanner.clear();
      } catch (e) {
        if (!cancelled) setErr('Camera scanner unavailable. Enter VIN manually.');
      }
    }

    start();
    return () => {
      cancelled = true;
      try { const s = stopRef.current; s && s(); } catch { /* noop */ }
    };
  }, [onDetected]);

  return (
    <div className="space-y-2">
      <div ref={hostRef} />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <p className="text-xs text-gray-500">Tip: Aim at the VIN barcode (windshield/A-pillar or door jamb).</p>
    </div>
  );
}
