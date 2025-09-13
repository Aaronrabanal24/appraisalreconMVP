"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VinScanner from "./VinScanner";
import { checkDigitOK, decodeVIN, isLikelyVIN, normalizeVIN, VinDecoded } from "@/lib/vin";

type DealType = "Lease" | "Trade" | "Sell";

export default function IntakeForm() {
  const r = useRouter();
  const [vin, setVin] = useState("");
  const [stock, setStock] = useState("");
  const [mileage, setMileage] = useState("");
  const [dealType, setDealType] = useState<DealType>("Trade");
  const [decoding, setDecoding] = useState(false);
  const [decoded, setDecoded] = useState<VinDecoded | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // keep tiny draft locally for UX
  useEffect(() => {
    try {
      const raw = localStorage.getItem("intakeDraft");
      if (raw) {
        const d = JSON.parse(raw);
        setVin(d.vin || "");
        setStock(d.stock || "");
        setMileage(d.mileage || "");
        setDealType(d.dealType || "Trade");
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("intakeDraft", JSON.stringify({ vin, stock, mileage, dealType }));
    } catch {}
  }, [vin, stock, mileage, dealType]);

  const vinClean = useMemo(() => normalizeVIN(vin), [vin]);
  const vinOK = isLikelyVIN(vinClean) && checkDigitOK(vinClean);

  async function onDecode() {
    setErr(null);
    setDecoding(true);
    try {
      const info = await decodeVIN(vinClean);
      setDecoded(info);
    } catch (e:any) {
      setErr(e?.message || "VIN decode failed");
    } finally {
      setDecoding(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: vinClean || null,
          mileage: Number(mileage || "0"),
          dealType,
          stock: stock || null,
        }),
      });
      if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
      const data = await res.json();
      // clear draft
      try { localStorage.removeItem("intakeDraft"); } catch {}
      r.push(`/capture?sessionId=${encodeURIComponent(data.sessionId)}`);
    } catch (e:any) {
      setErr(e?.message || "Create session error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl w-full mx-auto p-4 rounded-lg border space-y-4">
      <h1 className="text-xl font-semibold">New Appraisal</h1>

      <div className="space-y-2">
        <label className="block text-sm font-medium">VIN (scan or type)</label>
        <input
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder="Scan or enter 17-char VIN"
          className="w-full border rounded px-3 py-2"
        />
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded ${vinOK ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            {vinOK ? "Check digit valid" : "Awaiting valid VIN"}
          </span>
          {vinClean && !vinOK && <span className="text-red-600">VIN length/check digit not valid</span>}
        </div>
        <div className="pt-2">
          <VinScanner onDetected={(v) => setVin(v)} />
        </div>
        <button
          type="button"
          onClick={onDecode}
          disabled={!vinOK || decoding}
          className="mt-2 inline-flex items-center rounded bg-gray-900 text-white px-3 py-2 disabled:opacity-50"
        >
          {decoding ? "Decoding…" : "Decode VIN"}
        </button>

        {decoded && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Year</span><div className="font-medium">{decoded.year || "-"}</div></div>
            <div><span className="text-gray-500">Make</span><div className="font-medium">{decoded.make || "-"}</div></div>
            <div><span className="text-gray-500">Model</span><div className="font-medium">{decoded.model || "-"}</div></div>
            <div><span className="text-gray-500">Trim</span><div className="font-medium">{decoded.trim || "-"}</div></div>
            <div><span className="text-gray-500">Body</span><div className="font-medium">{decoded.bodyClass || "-"}</div></div>
            <div><span className="text-gray-500">Drive</span><div className="font-medium">{decoded.driveType || "-"}</div></div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Mileage</label>
        <input
          inputMode="numeric"
          value={mileage}
          onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Odometer"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Stock # (optional)</label>
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="Enter stock number"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Source</label>
        <div className="flex gap-2">
          {(["Lease","Trade","Sell"] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDealType(d)}
              className={`px-3 py-1.5 rounded border ${dealType===d ? "bg-black text-white" : "bg-white text-gray-900"}`}
            >{d}</button>
          ))}
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="pt-2">
        <button
          type="submit"
          disabled={!mileage || !dealType}
          className="inline-flex items-center rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          Create Session & Continue
        </button>
      </div>
    </form>
  );
}
