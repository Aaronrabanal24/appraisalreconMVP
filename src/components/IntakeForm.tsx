"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DealType = "lease" | "trade" | "sell";

type IntakeDraft = {
  vin: string;
  stock?: string;
  mileage: string; // keep as string for input control
  dealType: DealType | "";
};

const VIN_HELP =
  "Enter the 17-character VIN (I, O, Q are not used). You can paste and we'll format it.";

const VIN_OK = (vin: string) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
const MILES_OK = (m: string) => /^\d{1,7}$/.test(m.trim()); // up to 7 digits

export default function IntakeForm() {
  const router = useRouter();

  const [draft, setDraft] = useState<IntakeDraft>({
    vin: "",
    stock: "",
    mileage: "",
    dealType: "",
  });

  // Restore any existing draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem("intakeDraft");
      if (raw) {
        const d = JSON.parse(raw) as IntakeDraft;
        setDraft({
          vin: d.vin || "",
          stock: d.stock || "",
          mileage: d.mileage || "",
          dealType: d.dealType || "",
        });
      }
    } catch {}
  }, []);

  // Persist draft
  useEffect(() => {
    try {
      localStorage.setItem("intakeDraft", JSON.stringify(draft));
    } catch {}
  }, [draft]);

  const vinClean = useMemo(
    () =>
      draft.vin
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .replace(/[IOQ]/g, ""), // strip forbidden VIN chars
    [draft.vin]
  );

  const isValid = VIN_OK(vinClean) && MILES_OK(draft.mileage) && !!draft.dealType;

  function selectDeal(t: DealType) {
    setDraft((d) => ({ ...d, dealType: t }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    const payload = {
      vin: vinClean,
      stock: (draft.stock || "").trim(),
      mileage: parseInt(draft.mileage, 10),
      dealType: draft.dealType,
      createdAt: Date.now(),
    };

    try {
      localStorage.setItem("intakeFinal", JSON.stringify(payload));
      // optionally clear the draft
      // localStorage.removeItem("intakeDraft");
    } catch {}

    router.push("/capture"); // where your photo flow starts
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl w-full mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-1">Deal Intake</h1>
      <p className="text-sm text-gray-600 mb-6">
        Capture the essentials before photos. You can edit later if needed.
      </p>

      {/* VIN */}
      <label htmlFor="vin" className="block text-sm font-medium mb-1">
        VIN <span className="text-red-600">*</span>
      </label>
      <input
        id="vin"
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        value={draft.vin}
        onChange={(e) => setDraft((d) => ({ ...d, vin: e.target.value }))}
        className="w-full border rounded px-3 py-2 mb-1"
        placeholder="1HGBH41JXMN109186"
        aria-describedby="vinHelp"
      />
      <p id="vinHelp" className="text-xs text-gray-600 mb-4">
        {VIN_HELP}
      </p>
      {!VIN_OK(vinClean) && draft.vin.length > 0 && (
        <p className="text-xs text-red-600 -mt-3 mb-4">VIN should be 17 valid characters.</p>
      )}

      {/* Stock (optional) */}
      <label htmlFor="stock" className="block text-sm font-medium mb-1">
        Stock # <span className="text-gray-500">(optional)</span>
      </label>
      <input
        id="stock"
        inputMode="text"
        value={draft.stock}
        onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
        className="w-full border rounded px-3 py-2 mb-4"
        placeholder="e.g., A1234"
      />

      {/* Mileage */}
      <label htmlFor="mileage" className="block text-sm font-medium mb-1">
        Mileage <span className="text-red-600">*</span>
      </label>
      <input
        id="mileage"
        inputMode="numeric"
        value={draft.mileage}
        onChange={(e) =>
          setDraft((d) => ({ ...d, mileage: e.target.value.replace(/[^\d]/g, "") }))
        }
        className="w-full border rounded px-3 py-2 mb-1"
        placeholder="e.g., 45678"
      />
      {!MILES_OK(draft.mileage) && draft.mileage.length > 0 && (
        <p className="text-xs text-red-600 -mt-3 mb-4">Enter whole miles (digits only).</p>
      )}

      {/* Deal Type */}
      <fieldset className="mt-4">
        <legend className="block text-sm font-medium mb-2">
          Deal Type <span className="text-red-600">*</span>
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DealCard
            label="Lease"
            selected={draft.dealType === "lease"}
            onClick={() => selectDeal("lease")}
          />
          <DealCard
            label="Trade-in"
            selected={draft.dealType === "trade"}
            onClick={() => selectDeal("trade")}
          />
          <DealCard
            label="Sell outright"
            selected={draft.dealType === "sell"}
            onClick={() => selectDeal("sell")}
          />
        </div>
      </fieldset>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={!isValid}
          className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-white ${
            isValid ? "bg-black hover:opacity-90" : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          Save & Continue
        </button>

        <span className="text-xs text-gray-500">
          VIN preview: <code className="font-mono">{vinClean || "—"}</code>
        </span>
      </div>
    </form>
  );
}

function DealCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-lg border p-3 text-left transition ${
        selected ? "border-black ring-2 ring-black" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span
          className={`h-4 w-4 rounded-full border ${
            selected ? "bg-black border-black" : "bg-white"
          }`}
          aria-hidden
        />
      </div>
    </button>
  );
}
