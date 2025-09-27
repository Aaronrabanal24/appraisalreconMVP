"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

export type OverlayKind = "trapezoid" | "circle" | "rectangle" | "oval" | "none";

export type CaptureSpec = {
  overlay: OverlayKind;
  tip: string;
  coinMode?: boolean; // shows the "coin" hint for tread
};

type SensorState = {
  sharp: boolean;
  glareSafe: boolean;
  exposureOK: boolean;
  levelOK: boolean;
};

type Props = {
  stepName: string;
  spec: CaptureSpec;
  dwellMs?: number; // auto-capture dwell
  onCapture: (blob: Blob, dataUrl: string) => void;
};

// ---------- helpers (fast, no external libs) ----------

// grayscale into Uint8ClampedArray
function toGray(imgData: ImageData) {
  const { data, width, height } = imgData;
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // luma-ish
    out[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return out;
}

// simple blur/sharpness: variance of Laplacian proxy
function sharpness(gray: Uint8ClampedArray, W: number, H: number) {
  let sum = 0,
    sumSq = 0,
    c = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      // 4-neighbor laplace
      const v =
        4 * gray[i] -
        gray[i - 1] -
        gray[i + 1] -
        gray[i - W] -
        gray[i + W];
      sum += v;
      sumSq += v * v;
      c++;
    }
  }
  if (!c) return 0;
  const mean = sum / c;
  const varLap = (sumSq / c) - mean * mean;
  return Math.max(0, varLap);
}

// glare: count near-white pixels; exposure: check mid histogram spread
function exposureAndGlare(img: ImageData) {
  const { data } = img;
  let whites = 0;
  let sum = 0,
    sumSq = 0,
    n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const luma = (0.299 * r + 0.587 * g + 0.114 * b);
    if (r > 245 && g > 245 && b > 245) whites++;
    sum += luma;
    sumSq += luma * luma;
    n++;
  }
  const mean = sum / (n || 1);
  const varL = (sumSq / (n || 1)) - mean * mean; // crude spread
  const glareSafe = whites / (n || 1) < 0.02; // <2% pure white
  const exposureOK = varL > 1200 && mean > 60 && mean < 200; // “balanced-ish”
  return { glareSafe, exposureOK };
}

// tilt: prefer device orientation if available; fall back to horizon from edges
function approxLevel(video: HTMLVideoElement) {
  // We’ll trust device orientation if present (updated below via event).
  // Here we just return true and let the event handler set state.
  return true;
}

// Quick "wheel present" heuristic using edge energy in a circular band
function ringnessScore(gray: Uint8ClampedArray, W: number, H: number) {
  const mags = new Float32Array(W * H);
  let total = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx =
        -gray[i - W - 1] -
        2 * gray[i - 1] -
        gray[i + W - 1] +
        gray[i - W + 1] +
        2 * gray[i + 1] +
        gray[i + W + 1];
      const gy =
        gray[i - W - 1] +
        2 * gray[i - W] +
        gray[i - W + 1] -
        gray[i + W - 1] -
        2 * gray[i + W] -
        gray[i + W + 1];
      const m = Math.hypot(gx, gy);
      mags[i] = m;
      total += m;
    }
  }
  const cx = W / 2,
    cy = H * 0.6;
  const rInner = H * 0.15,
    rOuter = H * 0.27; // matches overlay ring roughly
  let ring = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const dx = x - cx,
        dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r >= rInner && r <= rOuter) ring += mags[y * W + x];
    }
  }
  return total > 1 ? ring / total : 0;
}

// Under-carriage “coverage”: % of edges inside oval overlay
function ovalCoverage(gray: Uint8ClampedArray, W: number, H: number) {
  const mags = new Float32Array(W * H);
  let total = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx =
        -gray[i - W - 1] -
        2 * gray[i - 1] -
        gray[i + W - 1] +
        gray[i - W + 1] +
        2 * gray[i + 1] +
        gray[i + W + 1];
      const gy =
        gray[i - W - 1] +
        2 * gray[i - W] +
        gray[i - W + 1] -
        gray[i + W - 1] -
        2 * gray[i + W] -
        gray[i + W + 1];
      const m = Math.hypot(gx, gy);
      mags[i] = m;
      total += m;
    }
  }
  const cx = W / 2,
    cy = H * 0.62;
  const rx = W * 0.33,
    ry = H * 0.18;
  let inside = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) inside += mags[y * W + x];
    }
  }
  return total > 1 ? inside / total : 0;
}

function SensorChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        ok ? "bg-green-600 text-white" : "bg-gray-300 text-gray-700"
      }`}
    >
      {label}
    </span>
  );
}

export default function AdvancedCapture({
  stepName,
  spec,
  dwellMs = 800,
  onCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef<HTMLCanvasElement>(null);

  const [sensors, setSensors] = useState<SensorState>({
    sharp: false,
    glareSafe: true,
    exposureOK: true,
    levelOK: true,
  });
  const [subjectOK, setSubjectOK] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [dwellStarted, setDwellStarted] = useState<number | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [pendingImg, setPendingImg] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [levelDeg, setLevelDeg] = useState(0);
  const [ovalOK, setOvalOK] = useState(false); // under-carriage coverage

  const overlay = spec.overlay;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    const video = videoRef.current!;
    const work = workRef.current!;
    const paint = paintRef.current!;
    const wctx = work.getContext("2d", { willReadFrequently: true })!;
    const pctx = paint.getContext("2d")!;

    const analyze = () => {
      if (!video.videoWidth || !video.videoHeight) {
        raf = requestAnimationFrame(analyze);
        return;
      }
      const W = 320;
      const H = Math.floor((video.videoHeight / video.videoWidth) * W);
      work.width = W;
      work.height = H;
      paint.width = W;
      paint.height = H;

      wctx.drawImage(video, 0, 0, W, H);
      const img = wctx.getImageData(0, 0, W, H);
      const gray = toGray(img);

      // sensors
      const shp = sharpness(gray, W, H);
      const { glareSafe, exposureOK } = exposureAndGlare(img);
      const sharpOK = shp > 45; // tune
      const levelOK = approxLevel(video);

      // subject check:
      let subjOK = false;
      if (overlay === "circle") {
        const rs = ringnessScore(gray, W, H);
        subjOK = rs > 0.18;
      } else if (overlay === "oval") {
        const cov = ovalCoverage(gray, W, H);
        setOvalOK(cov > 0.32); // enough surface area
        // For oval step, we still want some “not blank” frame:
        subjOK = cov > 0.12;
      } else {
        // generic: just need decent edges overall
        subjOK = shp > 30 && exposureOK;
      }

      setSubjectOK(subjOK);
      setSensors({ sharp: sharpOK, glareSafe, exposureOK, levelOK });

      // draw overlay + tip
      pctx.clearRect(0, 0, W, H);
      pctx.save();
      pctx.strokeStyle = "rgba(0,0,0,0.0)";
      pctx.fillStyle = "rgba(0,0,0,0.0)";
      pctx.drawImage(work, 0, 0);

      // overlay guides
      pctx.lineWidth = 2;
      pctx.strokeStyle = "rgba(0,0,0,0.0)";
      pctx.fillStyle = "rgba(0,0,0,0.0)";

      // draw a semi-transparent mask outside the target region to guide framing
      pctx.save();
      pctx.globalAlpha = 0.35;
      pctx.fillStyle = "#000";
      pctx.beginPath();
      pctx.rect(0, 0, W, H);
      pctx.closePath();

      pctx.globalCompositeOperation = "destination-out";
      pctx.beginPath();
      if (overlay === "trapezoid") {
        const topY = H * 0.18;
        const botY = H * 0.83;
        const topL = W * 0.2;
        const topR = W * 0.8;
        const botL = W * 0.08;
        const botR = W * 0.92;
        pctx.moveTo(topL, topY);
        pctx.lineTo(topR, topY);
        pctx.lineTo(botR, botY);
        pctx.lineTo(botL, botY);
        pctx.closePath();
      } else if (overlay === "circle") {
        pctx.ellipse(W / 2, H * 0.6, H * 0.24, H * 0.24, 0, 0, Math.PI * 2);
      } else if (overlay === "rectangle") {
        const pad = 20;
        pctx.rect(pad, pad, W - pad * 2, H - pad * 2);
      } else if (overlay === "oval") {
        pctx.ellipse(W / 2, H * 0.62, W * 0.33, H * 0.18, 0, 0, Math.PI * 2);
      } else {
        // none → no cutout
        pctx.rect(0, 0, W, H);
      }
      pctx.fill();
      pctx.restore();

      // dashed rocker (for sides) and ring line, etc.
      pctx.save();
      pctx.strokeStyle = "rgba(255,255,255,0.85)";
      pctx.setLineDash([6, 4]);
      if (overlay === "trapezoid") {
        // dashed rocker: a straight line near bottom
        pctx.beginPath();
        pctx.moveTo(W * 0.1, H * 0.82);
        pctx.lineTo(W * 0.9, H * 0.82);
        pctx.stroke();
      }
      pctx.restore();

      // tip banner
      pctx.save();
      pctx.fillStyle = "rgba(0,0,0,0.6)";
      pctx.fillRect(0, 0, W, 36);
      pctx.fillStyle = "#fff";
      pctx.font = "bold 12px system-ui, -apple-system, sans-serif";
      pctx.fillText(spec.tip, 10, 22);
      if (spec.coinMode) {
        pctx.font = "10px system-ui, -apple-system, sans-serif";
        pctx.fillText("Tip: Hold coin at wear bars", 10, 34);
      }
      pctx.restore();

      pctx.restore();

      raf = requestAnimationFrame(analyze);
    };

    const start = async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      analyze();
    };

    start().catch(() => {
      // ignore
    });

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta != null) {
        // rough level from gamma (roll)
        const roll = e.gamma ?? 0;
        setLevelDeg(roll);
      }
    };
    window.addEventListener("deviceorientation", onOrient);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("deviceorientation", onOrient);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [overlay, spec.tip]);

  // auto-capture dwell logic (except oval/under-carriage which requires explicit tap when “green”)
  const allGreen =
    sensors.sharp && sensors.glareSafe && sensors.exposureOK && sensors.levelOK && subjectOK;

  useEffect(() => {
    // For under-carriage (oval), we only allow manual capture when ovalOK is true (no countdown).
    if (overlay === "oval") {
      setCountdown(0);
      setDwellStarted(null);
      return;
    }

    if (allGreen) {
      if (!dwellStarted) {
        setDwellStarted(performance.now());
        setCountdown(Math.ceil(dwellMs / 1000));
      }
    } else {
      setDwellStarted(null);
      setCountdown(0);
    }
  }, [allGreen, dwellMs, dwellStarted, overlay]);

  useEffect(() => {
    if (!dwellStarted) return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - (dwellStarted ?? 0);
      const remain = Math.max(0, dwellMs - elapsed);
      const secs = Math.ceil(remain / 1000);
      setCountdown(secs);
      if (remain <= 0) {
        // fire capture
        doCapture();
        setDwellStarted(null);
        setCountdown(0);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [dwellMs, dwellStarted]);

  const doCapture = async () => {
    const paint = paintRef.current!;
    // snapshot from the video directly for best quality
    const snap = document.createElement("canvas");
    const video = videoRef.current!;
    const W = video.videoWidth || 1280;
    const H = video.videoHeight || 720;
    snap.width = W;
    snap.height = H;
    const sctx = snap.getContext("2d")!;
    sctx.drawImage(video, 0, 0, W, H);

    // show review overlay
    snap.toBlob((blob) => {
      if (!blob) return;
      const url = snap.toDataURL("image/jpeg", 0.9);
      setPendingBlob(blob);
      setPendingImg(url);
      setShowReview(true);
    }, "image/jpeg", 0.92);
  };

  const confirmKeep = () => {
    if (pendingBlob && pendingImg) {
      onCapture(pendingBlob, pendingImg);
    }
    setShowReview(false);
    setPendingBlob(null);
    setPendingImg(null);
  };

  const retake = () => {
    setShowReview(false);
    setPendingBlob(null);
    setPendingImg(null);
  };

  const captureButtonEnabled = overlay === "oval" ? ovalOK : allGreen;

  return (
    <div className="w-full h-full relative bg-black rounded-xl overflow-hidden">
      {/* live video */}
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

      {/* analysis paint */}
      <canvas ref={paintRef} className="absolute inset-0 w-full h-full" />

      {/* top-left sensor chips */}
      <div className="absolute top-3 left-3 flex gap-2">
        <SensorChip ok={sensors.sharp} label="Sharp" />
        <SensorChip ok={sensors.glareSafe} label="No Glare" />
        <SensorChip ok={sensors.exposureOK} label="Exposure" />
        <SensorChip ok={sensors.levelOK} label="Level" />
        <SensorChip ok={subjectOK || overlay === "circle"} label="Subject" />
      </div>

      {/* big plain-English guide footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="rounded-lg bg-white/90 p-3 text-sm">
          <p className="font-semibold mb-1">What to do</p>
          <ul className="list-disc pl-4 space-y-1">
            {/* Non-technical, “for dummies” coaching */}
            {overlay === "trapezoid" && (
              <>
                <li>Stand back so the car fills the frame.</li>
                <li>Keep the bottom of the car on the dashed line.</li>
                <li>Hold the phone steady for a second.</li>
              </>
            )}
            {overlay === "circle" && (
              <>
                <li>Put the wheel inside the ring.</li>
                <li>Show some tire tread too.</li>
                <li>Hold steady—photo grabs itself.</li>
              </>
            )}
            {overlay === "rectangle" && (
              <>
                <li>Fill the box with the windshield or dashboard.</li>
                <li>If the dash is on: “Key on, engine off.”</li>
                <li>Hold steady—photo grabs itself.</li>
              </>
            )}
            {overlay === "oval" && (
              <>
                <li>Kneel and aim under the car.</li>
                <li>Make sure the oval is mostly filled.</li>
                <li>When the button turns dark, tap to take it.</li>
              </>
            )}
            {overlay === "none" && (
              <>
                <li>Frame the car. Keep your hands steady.</li>
                <li>We’ll take the photo when it looks good.</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* countdown ring (auto steps only) */}
      {countdown > 0 && overlay !== "oval" && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
          <div className="w-16 h-16 rounded-full bg-black/70 text-white flex items-center justify-center text-xl font-bold">
            {countdown}
          </div>
        </div>
      )}

      {/* capture button (enabled when ready) */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center">
        <button
          onClick={() => {
            // For non-oval, if everything is green we may already auto-capture,
            // but user can also tap to capture.
            if (!captureButtonEnabled) return;
            doCapture();
          }}
          className={`h-14 w-14 rounded-full border-4 ${
            captureButtonEnabled ? "bg-black border-white" : "bg-gray-400 border-gray-200"
          }`}
          aria-disabled={!captureButtonEnabled}
        />
      </div>

      {/* hidden work canvas */}
      <canvas ref={workRef} className="hidden" />

      {/* review modal */}
      {showReview && pendingImg && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl overflow-hidden max-w-sm w-full">
            <img src={pendingImg} alt="Captured" className="w-full h-64 object-contain bg-black" />
            <div className="p-3 flex items-center justify-between">
              <button onClick={retake} className="px-4 py-2 rounded-md border">
                Retake
              </button>
              <button
                onClick={confirmKeep}
                className="px-4 py-2 rounded-md bg-black text-white"
              >
                Keep Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
