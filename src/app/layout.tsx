export const metadata = {
  title: 'Appraisal Recon',
  description: '15-shot capture flow with coaching and auto-capture',
};

import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
