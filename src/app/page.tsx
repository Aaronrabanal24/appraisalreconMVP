import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6">
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Appraisal Recon MVP</h1>
        <p className="text-sm text-gray-600">
          Start a new deal intake to capture VIN, Mileage, and deal type before photos.
        </p>

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-medium">New Appraisal</h2>
          <p className="text-sm text-gray-600">
            Collect VIN, Stock # (optional), Mileage, and deal type (Lease/Trade/Sell).
          </p>

          <div className="flex gap-2">
            <Link
              href="/intake"
              className="inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-3"
            >
              Start Appraisal
            </Link>
            <Link
              href="/appraisal"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-3"
            >
              ACV Calculator
            </Link>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-600">
            Ready to add AI scan later. Flip the flag when we start.
          </p>
          <code className="text-xs">
            NEXT_PUBLIC_ENABLE_AI_SCAN=false
          </code>
        </div>
      </div>
    </main>
  );
}
