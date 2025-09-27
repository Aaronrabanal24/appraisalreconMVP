"use client";
import { useMemo, useState, useEffect } from "react";
import { calcAppraisal } from "@/lib/calc";

export default function AcvCalculator() {
  const [acv, setAcv] = useState<string>("");
  const [recon, setRecon] = useState<string>("");

  // one-time storage cleanup: remove any old floorplan keys
  useEffect(() => {
    try {
      localStorage.removeItem("floorplan");
      const raw = localStorage.getItem("appraisalDraft");
      if (raw) {
        const d = JSON.parse(raw);
        if ("floorplan" in d) delete d.floorplan;
        localStorage.setItem("appraisalDraft", JSON.stringify(d));
      }
    } catch {}
  }, []);

  const numbers = {
    acv: parseFloat(acv || "0"),
    recon: parseFloat(recon || "0"),
  };

  const { maxOffer } = useMemo(() => calcAppraisal(numbers), [acv, recon]);

  return (
    <div className="max-w-xl w-full mx-auto p-4 rounded-lg border">
      <h2 className="text-xl font-semibold mb-3">Appraisal</h2>

      <label className="block text-sm font-medium mb-1">ACV</label>
      <input
        inputMode="decimal"
        value={acv}
        onChange={(e) => setAcv(e.target.value.replace(/[^\d.]/g, ""))}
        className="w-full border rounded px-3 py-2 mb-2"
        placeholder="Enter market value before recon"
        aria-describedby="acvHelp"
      />
      <p id="acvHelp" className="text-xs text-gray-600 mb-3">
        Market value of the vehicle before reconditioning. Not your purchase price.
      </p>

      <label className="block text-sm font-medium mb-1">Recon total</label>
      <input
        inputMode="decimal"
        value={recon}
        onChange={(e) => setRecon(e.target.value.replace(/[^\d.]/g, ""))}
        className="w-full border rounded px-3 py-2 mb-4"
        placeholder="Enter total recon estimate"
      />

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm text-gray-700">Max Offer</span>
        <span className="text-xl font-bold tabular-nums">${maxOffer.toLocaleString()}</span>
      </div>
    </div>
  );
}
