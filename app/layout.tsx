import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "統計ビジュアル学習",
  description: "統計検定2級の概念をインタラクティブに学ぶ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col">
        <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              統計ビジュアル
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              β
            </span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="text-center text-xs py-4" style={{ color: "var(--text-secondary)" }}>
          統計検定2級レベルの概念をインタラクティブに学ぶ
        </footer>
      </body>
    </html>
  );
}
