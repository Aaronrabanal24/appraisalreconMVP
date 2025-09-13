// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6">
      <div className="max-w-xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Appraisal Recon MVP</h1>
          <p className="text-sm text-gray-600">
            Start a new intake to capture VIN, Mileage, and deal type before photos.
          </p>
        </header>

        {/* Primary action */}
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-medium mb-2">New Appraisal</h2>
          <p className="text-sm text-gray-600 mb-4">
            Collect VIN, Stock # (optional), Mileage, and deal type (Lease / Trade-in / Sell).
          </p>

          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-3"
          >
            Start Appraisal
          </Link>
        </div>

        {/* Shortcuts / Dev links */}
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-3">Shortcuts</h3>
          <div className="flex flex-wrap gap-2">
            <Link href="/capture" className="px-3 py-2 rounded border">Open Camera Flow</Link>
            <Link href="/appraisal" className="px-3 py-2 rounded border">ACV Calculator</Link>
            {process.env.NEXT_PUBLIC_ENABLE_DEAL_PL === "true" && (
              <Link href="/deal-pl" className="px-3 py-2 rounded border">
                Deal P&amp;L (flagged)
              </Link>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Toggle P&amp;L with <code>NEXT_PUBLIC_ENABLE_DEAL_PL=true</code> in <code>.env.local</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
