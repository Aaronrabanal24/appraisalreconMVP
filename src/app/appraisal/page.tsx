import dynamic from "next/dynamic";
const AcvCalculator = dynamic(() => import("@/components/AcvCalculator"), { ssr: false });

export default function AppraisalPage() {
  return (
    <main className="px-4 py-6">
      <AcvCalculator />
    </main>
  );
}
