import dynamic from "next/dynamic";
const IntakeForm = dynamic(() => import("@/components/IntakeForm"), { ssr: false });

export default function Page() {
  return (
    <main className="p-4">
      <IntakeForm />
    </main>
  );
}