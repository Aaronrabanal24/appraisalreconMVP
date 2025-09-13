import dynamic from "next/dynamic";
const IntakeForm = dynamic(() => import("@/components/IntakeForm"), { ssr: false });

export const metadata = { title: "Intake • Appraisal Recon" };

export default function Page() {
  return (
    <main className="px-4 py-6">
      <IntakeForm />
    </main>
  );
}
