import dynamic from "next/dynamic";

const IntakeForm = dynamic(() => import("@/components/IntakeForm"), { ssr: false });

export default function IntakePage() {
  return (
    <main className="min-h-[80dvh] px-4 py-6 bg-gray-50">
      <IntakeForm />
    </main>
  );
}
