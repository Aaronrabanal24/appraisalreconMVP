import dynamic from "next/dynamic";

const IntakeForm = dynamic(() => import("@/components/IntakeForm"), { ssr: false });

export default function IntakePage() {
  return (
    <main className="px-4 py-6">
      <IntakeForm />
    </main>
  );
}
