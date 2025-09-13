import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6">
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Appraisal Recon MVP</h1>
        <p className="text-sm text-gray-600">
          Start a new deal intake to capture VIN, Mileage, and deal type before photos.
        </p>

        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-medium mb-2">New Appraisal</h2>
          <p className="text-sm text-gray-600 mb-4">
            Collect VIN, Stock # (optional), Mileage, and deal type (Lease/Trade/Sell).
          </p>

          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-3"
          >
            Start Appraisal
          </Link>
        </div>
      </div>
    </main>
  );
}
