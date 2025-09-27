"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function IntakeForm() {
  const r = useRouter();
  const [stock, setStock] = useState("");
  const [miles, setMiles] = useState("");
  const [vin, setVin] = useState("");
  const [source, setSource] = useState<"trade" | "lease" | "sell">("trade");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      stock: stock.trim(),
      miles: parseInt(miles || "0", 10),
      vin: vin.trim().toUpperCase(),
      source,
      createdAt: Date.now(),
    };
    localStorage.setItem("intakeDraft", JSON.stringify(payload));
    r.push("/capture");
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl w-full mx-auto p-4 rounded-lg border space-y-3">
      <h1 className="text-xl font-semibold">Appraisal Intake</h1>

      <label className="block text-sm font-medium">Stock Number *</label>
      <input
        required
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        className="w-full border rounded px-3 py-2"
        placeholder="Enter stock number"
      />

      <label className="block text-sm font-medium">Odometer *</label>
      <input
        required
        inputMode="numeric"
        value={miles}
        onChange={(e) => setMiles(e.target.value.replace(/[^\d]/g, ""))}
        className="w-full border rounded px-3 py-2"
        placeholder="Miles"
      />

      <label className="block text-sm font-medium">VIN (optional)</label>
      <input
        value={vin}
        onChange={(e) => setVin(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
        className="w-full border rounded px-3 py-2"
        placeholder="Scan or enter VIN"
      />

      <label className="block text-sm font-medium">Source</label>
      <div className="flex gap-2">
        {(["trade", "lease", "sell"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setSource(opt)}
            className={`px-3 py-2 rounded border ${
              source === opt ? "bg-black text-white" : "bg-white"
            }`}
          >
            {opt === "trade" ? "Trade" : opt === "lease" ? "Lease" : "Sell"}
          </button>
        ))}
      </div>

      <div className="pt-2">
        <button className="px-4 py-3 rounded-lg bg-black text-white">Start 15-Shot Capture</button>
      </div>
    </form>
  );
}
