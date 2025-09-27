"use client";
import React, { useMemo, useState } from "react";
import AdvancedCapture, { type CaptureSpec } from "@/components/AdvancedCapture";

const steps: string[] = [
  "Left 3/4 Corner",
  "Right 3/4 Corner",
  "Left Side",
  "Right Side",
  "Front",
  "Rear",
  "Left Front Wheel",
  "Right Front Wheel",
  "Left Rear Wheel",
  "Right Rear Wheel",
  "Windshield / Dash",
  "Under-carriage",
  "Engine Bay",
  "VIN Plate",
  "Any Extra Damage"
];

// Map step → overlay + short tip (plain language)
const coachSpecFor = (stepName: string) => {
  const s = stepName.toLowerCase();
  if (/(lf|rf|lr|rr).*corner|3\/4|corner/.test(s)) return { overlay: "trapezoid", tip: "Line up bumper and rocker in the window" } as const;
  if (/left side|right side|side|front|rear/.test(s)) return { overlay: "trapezoid", tip: "Keep the bottom of the car on the dashed line" } as const;
  if (/tires|tire|wheel/.test(s)) return { overlay: "circle", tip: "Put the wheel inside the ring • Show tread", coinMode: true } as const;
  if (/windshield|dash|interior/.test(s)) return { overlay: "rectangle", tip: "Fill the box • Key on, engine off for dash lights" } as const;
  if (/under|leak|ground/.test(s)) return { overlay: "oval", tip: "Aim under the car • Fill the oval as much as possible" } as const;
  if (/engine/.test(s)) return { overlay: "rectangle", tip: "Fill the box with the engine bay • Avoid glare" } as const;
  if (/vin/.test(s)) return { overlay: "rectangle", tip: "Fill the box with the VIN label" } as const;
  return { overlay: "none", tip: "Center the car and hold steady" } as const;
};

export default function AppraisalReconMVP() {
  const [current, setCurrent] = useState(0);
  const [photos, setPhotos] = useState<
    { name: string; url: string; ts: number }[]
  >([]);

  const spec: CaptureSpec = useMemo(() => coachSpecFor(steps[current]), [current]);

  const onCaptured = (blob: Blob, dataUrl: string) => {
    setPhotos((p) => [...p, { name: steps[current], url: dataUrl, ts: Date.now() }]);
    if (current < steps.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      // done → here’s where you can kick off upload or AI hook (feature-flagged)
      alert("All photos captured. Review in the gallery below.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Capture</h1>
          <p className="text-sm text-gray-600">
            {steps[current]} — {current + 1} / {steps.length}
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Saved: <span className="font-semibold">{photos.length}</span>
        </div>
      </header>

      <div className="h-[60vh] rounded-xl overflow-hidden border">
        <AdvancedCapture
          stepName={steps[current]}
          spec={spec}
          dwellMs={800}
          onCapture={onCaptured}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={current === 0}
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          className="px-3 py-2 rounded-md border disabled:opacity-50"
        >
          Back
        </button>
        <button
          disabled={current >= steps.length - 1}
          onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
          className="px-3 py-2 rounded-md border disabled:opacity-50"
        >
          Skip
        </button>
      </div>

      {/* Simple gallery */}
      {photos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Your Photos</h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <figure key={i} className="border rounded overflow-hidden bg-black">
                <img src={p.url} alt={p.name} className="w-full h-32 object-cover" />
                <figcaption className="p-1 text-xs">{p.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* AI feature flag placeholder */}
      {process.env.NEXT_PUBLIC_ENABLE_AI_SCAN === "true" && (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-semibold">AI Scan (Preview)</p>
          <p className="text-sm text-gray-600">
            When enabled, photos will be checked for damage hints here.
          </p>
        </div>
      )}
    </div>
  );
}
