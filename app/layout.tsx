import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学習進捗",
  description: "教材の量と期限から一日の学習量を逆算する進捗管理アプリ",
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
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
