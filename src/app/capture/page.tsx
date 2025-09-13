// src/app/capture/page.tsx
'use client';

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Load the full camera flow client-side only
const AppraisalReconMVP = dynamic(() => import("@/components/AppraisalReconMVP"), { ssr: false });

type IntakeDraft = {
  vin: string;
  stock?: string;
  mileage: string;
  dealType: "lease" | "trade" | "sell";
};

export default function CapturePage() {
  const [draft, setDraft] = useState<IntakeDraft | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("intakeDraft");
      if (raw) setDraft(JSON.parse(raw));
    } catch {}
  }, []);

  return (
    <main className="p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Capture</h1>
          <Link href="/intake" className="text-sm underline">Edit intake</Link>
        </div>

        {draft && (
          <div className="rounded-lg border p-3 text-sm text-gray-700 flex flex-wrap gap-x-6 gap-y-1">
            <span><span className="text-gray-500">VIN:</span> {draft.vin || "—"}</span>
            <span><span className="text-gray-500">Stock#:</span> {draft.stock || "—"}</span>
            <span><span className="text-gray-500">Mileage:</span> {draft.mileage || "—"}</span>
            <span className="capitalize"><span className="text-gray-500">Deal:</span> {draft.dealType}</span>
          </div>
        )}

        {/* Advanced camera + coaching flow */}
        <AppraisalReconMVP />
      </div>
    </main>
  );
}
