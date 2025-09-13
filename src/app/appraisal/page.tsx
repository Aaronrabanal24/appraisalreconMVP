// src/app/appraisal/page.tsx
import dynamic from "next/dynamic";

// Client-only load for the calculator component
const AcvCalculator = dynamic(() => import("@/components/AcvCalculator"), { ssr: false });

export const metadata = {
  title: "ACV Calculator",
  description: "Enter ACV & Recon to get Max Offer.",
};

export default function AppraisalPage() {
  return (
    <main className="px-4 py-6">
      <AcvCalculator />
    </main>
  );
}
