import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "家映 · 家庭搜剧",
  description: "搜索你的家庭片库，选集播放，收藏和继续观看。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
