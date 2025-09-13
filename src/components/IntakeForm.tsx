"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DealType = "lease_buyout" | "trade_in" | "sell_outright";

export default function IntakeForm() {
  const router = useRouter();

  const [vin, setVin] = useState("");
  const [stock, setStock] = useState("");
  const [mileage, setMileage] = useState("");
  const [dealType, setDealType] = useState<DealType | "">("");

  // restore draft (optional)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("intakeDraft");
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.vin) setVin(String(d.vin));
        if (d?.stock) setStock(String(d.stock));
        if (d?.mileage) setMileage(String(d.mileage));
        if (d?.dealType) setDealType(d.dealType);
      }
    } catch {}
  }, []);

  // persist draft
  useEffect(() => {
    const draft = { vin, stock, mileage, dealType };
    try {
      localStorage.setItem("intakeDraft", JSON.stringify(draft));
    } catch {}
  }, [vin, stock, mileage, dealType]);

  // helpers
  const cleanVIN = (v: string) =>
    v.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ""); // exclude I,O,Q

  const vinValid = useMemo(() => cleanVIN(vin).length === 17, [vin]);
  const milesNum = useMemo(() => Number((mileage || "").replace(/[^\d]/g, "")), [mileage]);
  const mileageValid = Number.isFinite(milesNum) && milesNum > 0;
  const dealTypeValid = !!dealType;

  const canContinue = vinValid && mileageValid && dealTypeValid;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;

    const intake = {
      vin: cleanVIN(vin),
      stock: stock.trim(),
      mileage: milesNum,
      dealType,
      ts: Date.now(),
    };

    try {
      localStorage.setItem("currentIntake", JSON.stringify(intake));
    } catch {}

    // Where to send next (capture page)
    const nextRoute =
      process.env.NEXT_PUBLIC_CAPTURE_ROUTE || "/capture";

    router.push(nextRoute);
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-xl rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deal Intake</h1>
        <span className="text-xs text-gray-500">Step 1 of 2</span>
      </div>

      {/* VIN */}
      <label className="block text-sm font-medium mb-1" htmlFor="vin">VIN</label>
      <input
        id="vin"
        inputMode="text"
        autoCapitalize="characters"
        value={vin}
        onChange={(e) => setVin(cleanVIN(e.target.value))}
        placeholder="17-character VIN"
        className="w-full border rounded px-3 py-2 mb-1 tracking-widest"
        maxLength={17}
      />
      <p className="text-xs mb-3">
        VIN must be 17 characters. Letters I, O, Q are not valid.
        {!vinValid && vin.length > 0 && (
          <span className="ml-2 text-red-600 font-medium">({17 - cleanVIN(vin).length} to go)</span>
        )}
      </p>

      {/* Stock (optional) */}
      <label className="block text-sm font-medium mb-1" htmlFor="stock">Stock # (optional)</label>
      <input
        id="stock"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        placeholder="e.g., A12345"
        className="w-full border rounded px-3 py-2 mb-3"
      />

      {/* Mileage */}
      <label className="block text-sm font-medium mb-1" htmlFor="mileage">Mileage</label>
      <div className="relative mb-1">
        <input
          id="mileage"
          inputMode="numeric"
          value={mileage}
          onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="e.g., 45210"
          className="w-full border rounded px-3 py-2 pr-14"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">miles</span>
      </div>
      {!mileageValid && mileage.length > 0 && (
        <p className="text-xs text-red-600 mb-3">Enter a mileage greater than 0.</p>
      )}
      {mileageValid && (
        <p className="text-xs text-gray-600 mb-3">Recorded: {milesNum.toLocaleString()} miles</p>
      )}

      {/* Deal Type */}
      <fieldset className="mb-4">
        <legend className="block text-sm font-medium mb-2">Deal Type</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className={`border rounded-lg px-3 py-2 cursor-pointer ${dealType === "lease_buyout" ? "ring-2 ring-black" : ""}`}>
            <input
              type="radio"
              name="dealType"
              className="sr-only"
              checked={dealType === "lease_buyout"}
              onChange={() => setDealType("lease_buyout")}
            />
            Lease
          </label>

          <label className={`border rounded-lg px-3 py-2 cursor-pointer ${dealType === "trade_in" ? "ring-2 ring-black" : ""}`}>
            <input
              type="radio"
              name="dealType"
              className="sr-only"
              checked={dealType === "trade_in"}
              onChange={() => setDealType("trade_in")}
            />
            Trade-in
          </label>

          <label className={`border rounded-lg px-3 py-2 cursor-pointer ${dealType === "sell_outright" ? "ring-2 ring-black" : ""}`}>
            <input
              type="radio"
              name="dealType"
              className="sr-only"
              checked={dealType === "sell_outright"}
              onChange={() => setDealType("sell_outright")}
            />
            Sell outright
          </label>
        </div>
        {!dealTypeValid && <p className="text-xs text-red-600 mt-2">Choose a deal type.</p>}
      </fieldset>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          You’ll review and take photos on the next step.
        </p>
        <button
          type="submit"
          disabled={!canContinue}
          className={`rounded-lg px-4 py-2 text-white ${canContinue ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`}
          aria-disabled={!canContinue}
        >
          Continue to Photos
        </button>
      </div>
    </form>
  );
}
