export const metadata = {
  title: "Appraisal Recon",
  description: "15-shot capture flow with coaching and auto-capture",
};

import "./globals.css";
import GlobalShortcuts from "@/components/GlobalShortcuts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GlobalShortcuts />
        {children}
      </body>
    </html>
  );
}
