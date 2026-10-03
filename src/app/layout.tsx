import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cibu — Focus, with a little company",
  description: "Productivity game berbasis Pomodoro. Fokus bareng Cibu di dunia kecil yang hidup.",
  applicationName: "Cibu",
  icons: { icon: "/assets/cibu/complete/youdidit.webp", apple: "/assets/cibu/complete/youdidit.webp" },
  appleWebApp: { capable: true, title: "Cibu", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf4ec",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="h-full font-sans">{children}</body>
    </html>
  );
}
