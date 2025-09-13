// src/components/AppraisalReconMVP.tsx
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

// AdvancedCapture should be your existing camera + coaching component
const AdvancedCapture = dynamic(() => import("@/components/AdvancedCapture"), { ssr: false });

export default function AppraisalReconMVP() {
  // Simple 15-shot script—adjust names as needed
  const captureSteps = [
    "Left 3/4 corner",
    "Right 3/4 corner",
    "Left side",
    "Right side",
    "Front",
    "Rear",
    "Left Front Tire",
    "Right Front Tire",
    "Left Rear Tire",
    "Right Rear Tire",
    "Windshield & Dash",
    "Undertray / Ground",
    "Engine Bay",
    "VIN Sticker / Door Jamb",
    "Odometer / Cluster"
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<
    { step: number; name: string; timestamp: number; url: string }[]
  >([]);

  // Step → coaching / overlay spec mapping
  const coachSpecFor = (stepName: string) => {
    const s = stepName.toLowerCase();
    if (/(lf|rf|lr|rr).*corner|3\/4|corner/.test(s)) return { overlay: "trapezoid", tip: "Keep bumper and rocker aligned in frame" } as const;
    if (/left side|right side|side/.test(s)) return { overlay: "trapezoid", tip: "Keep rocker on dashed line for level side shot" } as const;
    if (/tires|tire/.test(s)) return { overlay: "circle", tip: "Center wheel in ring • Show tread", coinMode: true } as const;
    if (/windshield|dash|interior/.test(s)) return { overlay: "rectangle", tip: "Key on, engine off • Capture dash lights" } as const;
    if (/ground|under|leak/.test(s)) return { overlay: "oval", tip: "Kneel for undertray view • Scan for leaks" } as const;
    if (/engine/.test(s)) return { overlay: "rectangle", tip: "Fill frame with bay • Avoid glare" } as const;
    return { overlay: "none", tip: "Frame the vehicle and hold steady" } as const;
  };

  return (
    <div className="w-full">
      {/* Top bar: step indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">
          Step {currentStep + 1} / {captureSteps.length}
        </div>
        <div className="text-sm font-medium">{captureSteps[currentStep]}</div>
      </div>

      {/* Camera */}
      <AdvancedCapture
        stepName={captureSteps[currentStep]}
        spec={coachSpecFor(captureSteps[currentStep])}
        onCapture={(blob, dataUrl) => {
          const newPhoto = {
            step: currentStep,
            name: captureSteps[currentStep],
            timestamp: Date.now(),
            url: dataUrl
          };
          setCapturedPhotos(prev => [...prev, newPhoto]);
          if (currentStep < captureSteps.length - 1) {
            setCurrentStep(currentStep + 1);
          } else {
            // finished: you can route or show a summary here
            // e.g. toast or set a state to show "Complete"
            alert("Capture complete!");
          }
        }}
        dwellMs={800}
      />

      {/* Progress footer */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Captured: {capturedPhotos.length} / {captureSteps.length}
      </div>
    </div>
  );
}
