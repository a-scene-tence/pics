import type { MetadataRoute } from "next";

// PWA manifest (Next.js 16: app/manifest.ts → /manifest.webmanifest)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "우리 아이 앨범",
    short_name: "아이앨범",
    description: "아이의 사진·동영상을 원본 그대로, 가족만 보는 비공개 앨범",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#f59e0b",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
