import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | 統計ビジュアル",
  description: "統計ビジュアルのプライバシーポリシーページです。",
};

const SITE_NAME = "統計ビジュアル";
const CONTACT_EMAIL = "info.phraserush@gmail.com";
const EFFECTIVE_DATE = "2026年6月8日";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>
          ← トップへ戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
        プライバシーポリシー
      </h1>
      <p className="text-sm mb-10" style={{ color: "var(--text-secondary)" }}>
        制定日：{EFFECTIVE_DATE}
      </p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>

        {/* 基本方針 */}
        <section>
          <h2 className="text-base font-semibold mb-3">1. 基本方針</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            {SITE_NAME}（以下「当サイト」）は、利用者のプライバシーを尊重し、個人情報の保護に努めます。
            本ポリシーは、当サイトにおける個人情報の取り扱いについて説明するものです。
          </p>
        </section>

        {/* アクセス解析 */}
        <section>
          <h2 className="text-base font-semibold mb-3">2. アクセス解析ツールの使用</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            当サイトでは、Googleが提供するアクセス解析ツール「Google アナリティクス」を使用しています。
            Google アナリティクスはトラフィックデータの収集のためにCookieを使用しています。
            このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
          </p>
          <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
            Google アナリティクスによるデータ収集を無効にしたい場合は、
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: "var(--accent)" }}
            >
              Google アナリティクス オプトアウト アドオン
            </a>
            をご利用ください。
            Googleによるデータの利用については
            <a
              href="https://policies.google.com/technologies/partner-sites?hl=ja"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: "var(--accent)" }}
            >
              こちら
            </a>
            をご確認ください。
          </p>
        </section>

        {/* 広告 */}
        <section>
          <h2 className="text-base font-semibold mb-3">3. 広告について</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            当サイトでは、今後Google AdSenseによる広告を掲載する予定があります。
            Google AdSenseは、適切な広告を表示するためにCookieを使用することがあります。
            Cookieを使用することで、Googleや第三者のサイトへの過去のアクセス情報に基づいた広告が表示されます。
          </p>
          <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
            広告のCookieを無効にしたい場合は、
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: "var(--accent)" }}
            >
              Googleの広告設定ページ
            </a>
            からオプトアウトが可能です。
          </p>
        </section>

        {/* Cookie */}
        <section>
          <h2 className="text-base font-semibold mb-3">4. Cookieについて</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            当サイトでは、アクセス解析および広告表示の目的でCookieを使用しています。
            ブラウザの設定によりCookieを無効にすることが可能ですが、一部の機能が正常に動作しない場合があります。
          </p>
        </section>

        {/* 免責事項 */}
        <section>
          <h2 className="text-base font-semibold mb-3">5. 免責事項</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            当サイトに掲載されているコンテンツは、統計学の学習を目的としたものです。
            コンテンツの正確性・完全性については万全を期していますが、その内容を保証するものではありません。
            当サイトの利用によって生じたいかなる損害についても、当サイトは責任を負いません。
          </p>
          <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
            当サイトからリンクされた外部サイトのコンテンツについて、当サイトは責任を負いません。
          </p>
        </section>

        {/* 著作権 */}
        <section>
          <h2 className="text-base font-semibold mb-3">6. 著作権</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            当サイトに掲載されているコンテンツ（文章・図・グラフなど）の著作権は当サイト運営者に帰属します。
            無断転載・複製を禁じます。
          </p>
        </section>

        {/* お問い合わせ */}
        <section>
          <h2 className="text-base font-semibold mb-3">7. お問い合わせ</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            本ポリシーに関するお問い合わせは、以下のメールアドレスまでご連絡ください。
          </p>
          <p className="mt-2">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="underline underline-offset-2"
              style={{ color: "var(--accent)" }}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        {/* 改定 */}
        <section>
          <h2 className="text-base font-semibold mb-3">8. ポリシーの改定</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            当サイトは、必要に応じて本プライバシーポリシーを改定することがあります。
            改定後のポリシーは本ページに掲載した時点から効力を生じるものとします。
          </p>
        </section>

      </div>
    </div>
  );
}
