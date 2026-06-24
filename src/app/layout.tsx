import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리 아이 앨범",
  description: "아이의 사진·동영상을 원본 그대로, 가족만 보는 비공개 앨범",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "우리 아이 앨범",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 [font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,'Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif]">
        {children}
      </body>
    </html>
  );
}
