'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import cx from 'classnames';
import { Camera, CheckCircle, XCircle } from 'lucide-react';

export type OverlayKind = 'trapezoid' | 'circle' | 'rectangle' | 'oval' | 'none';

export type CoachSpec = {
  overlay: OverlayKind;
  tip: string;
  coinMode?: boolean;
};

export type SensorState = {
  sharp: boolean;
  glareSafe: boolean;
  exposureOK: boolean;
  levelOK: boolean;
};

type Props = {
  stepName: string;
  spec: CoachSpec;
  dwellMs?: number; // how long sensors must be all green before starting 3-2-1
  onCapture: (blob: Blob, dataUrl: string) => void;
};

// === Quick helpers ==========================================================

// grayscale in place
function toGray(pix: ImageData['data']) {
  for (let i = 0; i < pix.length; i += 4) {
    const r = pix[i], g = pix[i+1], b = pix[i+2];
    const y = (r*0.299 + g*0.587 + b*0.114)|0;
    pix[i] = pix[i+1] = pix[i+2] = y;
  }
}

// Simple sharpness: mean gradient magnitude on small canvas
function sharpnessScore(gray: Uint8ClampedArray, W: number, H: number) {
  let acc = 0, cnt = 0;
  for (let y=1;y<H-1;y++) {
    for (let x=1;x<W-1;x++) {
      const i = y*W + x;
      const gx = -gray[i-W-1] - 2*gray[i-1] - gray[i+W-1] + gray[i-W+1] + 2*gray[i+1] + gray[i+W+1];
      const gy =  gray[i-W-1] + 2*gray[i-W] + gray[i-W+1] - gray[i+W-1] - 2*gray[i+W] - gray[i+W+1];
      acc += Math.hypot(gx,gy);
      cnt++;
    }
  }
  return cnt>0 ? acc/cnt : 0;
}

// Glare: % of near-white pixels
function glareFraction(pix: Uint8ClampedArray) {
  let over = 0, total = 0;
  for (let i=0;i<pix.length;i+=4) {
    const r=pix[i],g=pix[i+1],b=pix[i+2];
    if (r>245 || g>245 || b>245) over++;
    total++;
  }
  return total>0 ? over/total : 0;
}

// Exposure: mean luminance within range
function meanBrightness(pix: Uint8ClampedArray) {
  let sum = 0, n=0;
  for (let i=0;i<pix.length;i+=4) {
    sum += pix[i]; // already gray if toGray was run
    n++;
  }
  return n>0 ? sum/n : 0;
}

// Quick "wheel present" heuristic using edge energy in a circular band
export function ringnessScore(gray: Uint8ClampedArray, W: number, H: number) {
  const mags = new Float32Array(W * H);
  let total = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1] + gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
      const gy =  gray[i - W - 1] + 2 * gray[i - W] + gray[i - W + 1] - gray[i + W - 1] - 2 * gray[i + W] - gray[i + W + 1];
      const m = Math.hypot(gx, gy);
      mags[i] = m; total += m;
    }
  }
  const cx = W / 2, cy = H * 0.60;
  const rInner = H * 0.15, rOuter = H * 0.27; // matches overlay ring roughly
  let ring = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r >= rInner && r <= rOuter) ring += mags[y * W + x];
    }
  }
  return total > 1 ? ring / total : 0;
}

// Sensor chip
function SensorChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cx('sensor-chip', ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
      {label}
    </span>
  );
}

// Countdown ring (SVG)
function Ring({ pct }: { pct: number }) {
  const r = 26, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.25)" strokeWidth="6" fill="none" />
      <circle cx="32" cy="32" r={r} stroke="white" strokeWidth="6" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
    </svg>
  );
}

// === Component ===============================================================

export default function AdvancedCapture({ stepName, spec, dwellMs = 800, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null);
  const fullRef = useRef<HTMLCanvasElement | null>(null);

  const [ready, setReady] = useState(false);
  const [sensors, setSensors] = useState<SensorState>({ sharp: false, glareSafe: true, exposureOK: true, levelOK: true });
  const [subjectOK, setSubjectOK] = useState(false);

  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownPct, setCountdownPct] = useState(0);
  const [threeTwoOne, setThreeTwoOne] = useState<number | null>(null);

  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const [modelReady, setModelReady] = useState(false);
  const modelRef = useRef<any>(null as any);
  const lastDetectRef = useRef<number>(0);

  // get camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e) {
        console.error('Camera error', e);
      }
    };
    run();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Try to lazy-load coco-ssd only if installed
  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore
        const tf = await import('@tensorflow/tfjs');
        // @ts-ignore
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        // @ts-ignore
        modelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        setModelReady(true);
      } catch {
        // not installed; heuristics only
        setModelReady(false);
      }
    })();
  }, []);

  // device orientation for Level
  const [levelDeg, setLevelDeg] = useState(0);
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      // gamma ~ roll
      const g = e.gamma ?? 0;
      setLevelDeg(g);
    };
    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, []);

  // Analysis loop
  useEffect(() => {
    let raf = 0;
    let dwellStart = 0;
    let lastStateAllGreen = false;
    let threeTimer: any = null;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const v = videoRef.current, c = smallRef.current;
      if (!v || !c) return;
      const W = 160, H = 120;
      c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, W, H);
      const img = ctx.getImageData(0, 0, W, H);
      toGray(img.data);
      // copies: keep original gray as first channel value
      const gray = new Uint8ClampedArray(W*H);
      for (let y=0;y<H;y++) {
        for (let x=0;x<W;x++) {
          const i = (y*W + x);
          gray[i] = img.data[i*4];
        }
      }

      // sensors
      const sScore = sharpnessScore(gray, W, H);
      const sharpOK = sScore > 12; // tune 10-14

      const glareFrac = glareFraction(img.data);
      const glareSafe = glareFrac < 0.01; // <1% near-white

      const meanY = meanBrightness(img.data);
      const exposureOK = meanY > 50 && meanY < 205;

      const needLevel = /side/.test(spec.tip.toLowerCase()) || spec.overlay === 'trapezoid';
      const levelOK = !needLevel ? true : Math.abs(levelDeg) < 6;

      // Subject check
      let subjOK = false;
      const isTire = spec.overlay === 'circle';
      if (isTire) {
        const score = ringnessScore(gray, W, H);
        subjOK = score > 0.18;
        setSubjectOK(subjOK);
      } else {
        // occasionally run coco-ssd if present
        const nowTs = performance.now();
        const shouldDetect = modelReady && (nowTs - lastDetectRef.current) > 700;
        if (shouldDetect && v && modelRef.current) {
          lastDetectRef.current = nowTs;
          modelRef.current.detect(v).then((preds: any[]) => {
            const ok = preds.some((p: any) => {
              const cls = String(p.class || '').toLowerCase();
              if (!['car','truck','bus','suv'].includes(cls)) return false;
              if (p.score && p.score < 0.5) return false;
              const [x,y,w,h] = p.bbox || [0,0,0,0];
              const area = w*h;
              const rel = area / ((v.videoWidth||1280)*(v.videoHeight||720));
              return rel > 0.04;
            });
            setSubjectOK(ok);
          }).catch(()=>{});
        }
        subjOK = subjectOK;
      }

      const state: SensorState = { sharp: sharpOK, glareSafe, exposureOK, levelOK };
      const allGreen = Object.values(state).every(Boolean) && subjOK;
      setSensors(state);

      // dwell + 3-2-1 countdown
      if (allGreen) {
        if (!lastStateAllGreen) {
          dwellStart = performance.now();
        }
        const dwellElapsed = performance.now() - dwellStart;
        if (!countdownActive && dwellElapsed >= dwellMs) {
          // start 3-2-1
          setCountdownActive(true);
          setThreeTwoOne(3);
          let left = 3;
          threeTimer = setInterval(() => {
            left--;
            if (left > 0) {
              setThreeTwoOne(left);
            } else {
              clearInterval(threeTimer);
              setThreeTwoOne(null);
              doCapture();
            }
          }, 1000);
        } else if (!countdownActive) {
          setCountdownPct(Math.min(1, dwellElapsed / dwellMs));
        }
      } else {
        // reset dwell/countdown
        setCountdownPct(0);
        if (threeTimer) clearInterval(threeTimer);
        if (countdownActive) setCountdownActive(false);
        setThreeTwoOne(null);
      }

      lastStateAllGreen = allGreen;
    };

    const doCapture = async () => {
      const v = videoRef.current, fc = fullRef.current;
      if (!v || !fc) return;
      setCapturing(true);
      const W = v.videoWidth || 1280;
      const H = v.videoHeight || 720;
      fc.width = W; fc.height = H;
      const ctx = fc.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, W, H);
      fc.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setConfirmUrl(url);
        setCapturing(false);
        setCountdownActive(false);
        setCountdownPct(0);
      }, 'image/jpeg', 0.9);
    };

    loop();
    return () => {
      cancelAnimationFrame(raf);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.overlay, modelReady]);

  // manual capture
  const snapNow = () => {
    // force countdown even if not all green
    setThreeTwoOne(3);
    const timer = setInterval(() => {
      setThreeTwoOne(prev => {
        if (!prev) return null;
        if (prev > 1) return prev - 1;
        clearInterval(timer);
        setThreeTwoOne(null);
        // draw
        const v = videoRef.current, fc = fullRef.current;
        if (!v || !fc) return null;
        const W = v.videoWidth || 1280, H = v.videoHeight || 720;
        fc.width = W; fc.height = H;
        const ctx = fc.getContext('2d');
        if (ctx) {
          ctx.drawImage(v, 0, 0, W, H);
          fc.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            setConfirmUrl(url);
          }, 'image/jpeg', 0.9);
        }
        return null;
      });
    }, 1000);
  };

  // confirm/retake
  const usePhoto = async () => {
    if (!confirmUrl || !fullRef.current) return;
    await new Promise<void>((resolve) => {
      fullRef.current!.toBlob((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          onCapture(blob!, String(reader.result));
          URL.revokeObjectURL(confirmUrl);
          setConfirmUrl(null);
          resolve();
        };
        reader.readAsDataURL(blob!);
      }, 'image/jpeg', 0.9);
    });
  };

  const retake = () => {
    if (confirmUrl) URL.revokeObjectURL(confirmUrl);
    setConfirmUrl(null);
  };

  // Overlay shapes
  const Overlay = () => {
    if (spec.overlay === 'trapezoid') {
      return (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
          <div className="w-[88%] h-[70%] border-2 border-white/60 rounded-xl relative">
            <div className="absolute inset-x-0 bottom-[18%] h-0.5 border-t-2 border-dashed border-white/60" />
          </div>
        </div>
      );
    }
    if (spec.overlay === 'circle') {
      return (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
          <div className="relative w-[68%] h-[75%]">
            <div className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 w-[46%] h-[46%] rounded-full border-2 border-white/70" />
            <div className="absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] rounded-full border border-white/40" />
          </div>
        </div>
      );
    }
    if (spec.overlay === 'rectangle') {
      return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[86%] h-[60%] border-2 border-white/70 rounded-md" />
        </div>
      );
    }
    if (spec.overlay === 'oval') {
      return (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
          <div className="w-[70%] h-[30%] border-2 border-white/70 rounded-full mb-8" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-md">
      <div className="relative w-full overflow-hidden rounded-xl bg-black shadow-lg">
        <video ref={videoRef} playsInline autoPlay muted className="w-full aspect-[4/3] object-cover" />
        <Overlay />

        {/* Sensor chips */}
        <div className="absolute top-3 left-3 flex gap-2">
          <SensorChip ok={sensors.sharp} label="Sharp" />
          <SensorChip ok={sensors.glareSafe} label="No Glare" />
          <SensorChip ok={sensors.exposureOK} label="Exposure" />
          <SensorChip ok={sensors.levelOK} label="Level" />
          <SensorChip ok={subjectOK || (spec.overlay === 'circle')} label="Subject" />
        </div>

        {/* Tip */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between">
          <div className="bg-black/50 text-white text-sm px-2 py-1 rounded">{spec.tip}</div>

          {/* dwell ring */}
          {!countdownActive && (
            <div className="flex items-center gap-2">
              <Ring pct={countdownPct} />
            </div>
          )}
        </div>

        {/* 3-2-1 */}
        {countdownActive && threeTwoOne !== null && (
          <div className="countdown-overlay">
            {threeTwoOne}
          </div>
        )}

        {/* toast */}
        {capturing && <div className="capture-toast">Capturing…</div>}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={snapNow}
          className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow active:scale-95"
          title="Take photo"
        >
          <Camera className="w-7 h-7" />
        </button>
      </div>

      {/* hidden canvases */}
      <canvas ref={smallRef} className="hidden" />
      <canvas ref={fullRef} className="hidden" />

      {/* Confirmation Modal */}
      {confirmUrl && (
        <div className="fixed inset-0 bg-black/70 z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-black">
              <img src={confirmUrl} className="w-full max-h-[60vh] object-contain" alt="Captured" />
            </div>
            <div className="p-3 flex gap-2">
              <button onClick={retake} className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5" /> Retake
              </button>
              <button onClick={usePhoto} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Use Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
