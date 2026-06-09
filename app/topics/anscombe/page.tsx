"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const AnscombeChart = dynamic(() => import("@/components/AnscombeChart"), { ssr: false });

interface Point { x: number; y: number; }

interface Dataset {
  id: string;
  label: string;
  pattern: string;
  icon: string;
  callout: string;
  description: string;
  color: string;
  borderColor: string;
  points: Point[];
}

// Anscombe's Quartet (Anscombe 1973)
// All 4 datasets share: n=11, x̄=9, ȳ=7.5, s²(x)=11, s²(y)≈4.12, r≈0.816, ŷ=3+0.5x
const DATASETS: Dataset[] = [
  {
    id: "I",
    label: "データセット I",
    pattern: "線形関係",
    icon: "✓",
    callout: "これが r = 0.816 の「正しい」意味",
    description:
      "残差がランダムに分布する教科書通りの線形関係。相関係数が意味を持つのは本来このケースだけ。",
    color: "#2563eb",
    borderColor: "#93c5fd",
    points: [
      { x: 10, y: 8.04 }, { x: 8, y: 6.95 }, { x: 13, y: 7.58 },
      { x: 9, y: 8.81 }, { x: 11, y: 8.33 }, { x: 14, y: 9.96 },
      { x: 6, y: 7.24 }, { x: 4, y: 4.26 }, { x: 12, y: 10.84 },
      { x: 7, y: 4.82 }, { x: 5, y: 5.68 },
    ],
  },
  {
    id: "II",
    label: "データセット II",
    pattern: "非線形（曲線）関係",
    icon: "⚠",
    callout: "曲線なのに線形モデルを当てはめている",
    description:
      "放物線状の曲線関係。本来は 2 次モデルが必要。r は非線形な関係でも高い値になりうる。r = 0.816 は「線形」を保証しない。",
    color: "#16a34a",
    borderColor: "#86efac",
    points: [
      { x: 10, y: 9.14 }, { x: 8, y: 8.14 }, { x: 13, y: 8.74 },
      { x: 9, y: 8.77 }, { x: 11, y: 9.26 }, { x: 14, y: 8.10 },
      { x: 6, y: 6.13 }, { x: 4, y: 3.10 }, { x: 12, y: 9.13 },
      { x: 7, y: 7.26 }, { x: 5, y: 4.74 },
    ],
  },
  {
    id: "III",
    label: "データセット III",
    pattern: "外れ値（y 方向）",
    icon: "⚠",
    callout: "1点の外れ値が回帰直線全体を歪めている",
    description:
      "外れ値 1 点を除けば r ≈ 0.999 の完璧な線形関係。たった 1 点が相関を 0.816 まで引き下げ、回帰直線の傾きを変えている。",
    color: "#dc2626",
    borderColor: "#fca5a5",
    points: [
      { x: 10, y: 7.46 }, { x: 8, y: 6.77 }, { x: 13, y: 12.74 },
      { x: 9, y: 7.11 }, { x: 11, y: 7.81 }, { x: 14, y: 8.84 },
      { x: 6, y: 6.08 }, { x: 4, y: 5.39 }, { x: 12, y: 8.15 },
      { x: 7, y: 6.42 }, { x: 5, y: 5.73 },
    ],
  },
  {
    id: "IV",
    label: "データセット IV",
    pattern: "レバレッジ点（x 方向）",
    icon: "⚠",
    callout: "1点だけが相関係数全体を作り出している",
    description:
      "x の値はほぼ全部「8」、1 点だけ「19」。その単一の点がなければ相関係数は定義すらできない。相関係数がその 1 点の「人質」になっている。",
    color: "#9333ea",
    borderColor: "#d8b4fe",
    points: [
      { x: 8, y: 6.58 }, { x: 8, y: 5.76 }, { x: 8, y: 7.71 },
      { x: 8, y: 8.84 }, { x: 8, y: 8.47 }, { x: 8, y: 7.04 },
      { x: 8, y: 5.25 }, { x: 19, y: 12.50 }, { x: 8, y: 5.56 },
      { x: 8, y: 7.91 }, { x: 8, y: 6.89 },
    ],
  },
];

const STAT_ROWS = [
  { label: "n（標本サイズ）",  value: "11" },
  { label: "平均 x̄",          value: "9.00" },
  { label: "平均 ȳ",          value: "7.50" },
  { label: "分散 s²(x)",      value: "11.00" },
  { label: "分散 s²(y)",      value: "4.12" },
  { label: "相関係数 r",       value: "0.816", highlight: true },
  { label: "回帰直線 ŷ",      value: "3.00 + 0.50x", highlight: true },
];

export default function AnscombeePage() {
  const [revealed, setReveal] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>
          ← トップへ
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="panel-title mb-1">Anscombe&apos;s Quartet</div>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
          アンスコムの数値例
        </h1>
        <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
          1973年、統計学者フランシス・アンスコムが作った 4 つのデータセット。
          要約統計量はすべて同じ。でも散布図を見ると、まったく異なる「姿」が現れる。
        </p>
      </div>

      {/* Stats panel — always visible */}
      <div className="panel mb-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            4 つのデータセットの要約統計量
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
          >
            すべて同じ値
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th
                  className="text-left py-1.5 pr-6 font-normal text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  統計量
                </th>
                {["I", "II", "III", "IV"].map(id => (
                  <th
                    key={id}
                    className="text-right py-1.5 px-3 font-bold text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAT_ROWS.map((row, i) => (
                <tr
                  key={i}
                  className="rounded"
                  style={{ background: row.highlight ? "var(--accent-light)" : undefined }}
                >
                  <td
                    className="py-1.5 pr-6 text-xs"
                    style={{ color: row.highlight ? "var(--accent)" : "var(--text-secondary)" }}
                  >
                    {row.label}
                  </td>
                  {[0, 1, 2, 3].map(j => (
                    <td
                      key={j}
                      className="text-right py-1.5 px-3 font-mono text-xs"
                      style={{
                        color: row.highlight ? "var(--accent)" : "var(--text-primary)",
                        fontWeight: row.highlight ? 700 : 500,
                      }}
                    >
                      {row.value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Big r callout */}
        <div
          className="mt-5 flex flex-wrap items-center gap-5 p-4 rounded-xl"
          style={{ background: "var(--accent-light)" }}
        >
          <div className="text-center shrink-0">
            <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--accent)" }}>
              相関係数 r
            </div>
            <div className="text-5xl font-bold font-mono" style={{ color: "var(--accent)" }}>
              0.816
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>
              4つすべて同じ
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              回帰直線も同じ（<span className="font-mono font-semibold">ŷ = 3.00 + 0.50x</span>）。
              平均・分散・相関・回帰式——要約統計量だけを見れば、この 4 つは「同じデータ」に見える。
            </p>
            <p className="text-sm mt-1.5 font-semibold" style={{ color: "var(--text-primary)" }}>
              散布図を見るとどうなるか？
            </p>
          </div>
        </div>
      </div>

      {/* Reveal button */}
      {!revealed && (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            4 つのデータセット、散布図の「形」は同じだと思いますか？
          </p>
          <button
            className="btn btn-primary text-base px-8 py-3"
            style={{ fontSize: "1rem" }}
            onClick={() => setReveal(true)}
          >
            散布図を確認する →
          </button>
        </div>
      )}

      {/* Scatter plot grid — revealed on click */}
      {revealed && (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mt-6 mb-6">
            {DATASETS.map((ds, i) => (
              <div
                key={ds.id}
                className="panel flex flex-col gap-2"
                style={{
                  borderLeft: `4px solid ${ds.borderColor}`,
                  animation: "fadeInUp 0.45s ease both",
                  animationDelay: `${i * 110}ms`,
                }}
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: ds.color }}>
                      {ds.label}
                    </div>
                    <div className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                      {ds.pattern}
                    </div>
                  </div>
                  <span
                    className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                  >
                    r = 0.816
                  </span>
                </div>

                {/* Chart */}
                <AnscombeChart data={ds.points} color={ds.color} height={200} />

                {/* Callout */}
                <div
                  className="flex items-start gap-1.5 text-xs px-2.5 py-2 rounded-lg"
                  style={{
                    background: ds.icon === "✓" ? "#dcfce7" : "#fef3c7",
                    color: ds.icon === "✓" ? "#166534" : "#92400e",
                  }}
                >
                  <span className="font-bold shrink-0 mt-px">{ds.icon}</span>
                  <span className="font-semibold">{ds.callout}</span>
                </div>

                {/* Description */}
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {ds.description}
                </p>
              </div>
            ))}
          </div>

          {/* Insight panel */}
          <div
            className="panel"
            style={{
              borderLeft: "4px solid #ef4444",
              animation: "fadeInUp 0.45s ease both",
              animationDelay: "480ms",
            }}
          >
            <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              まとめ：要約統計量は「形」を教えてくれない
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: "❌",
                  title: "r は線形性を保証しない",
                  body: "データセット II のように曲線関係でも r ≈ 0.816 になりうる。r は「強さ」を測るが「形」は教えない。",
                  bg: "#fee2e2",
                  fg: "#991b1b",
                },
                {
                  icon: "❌",
                  title: "1点が相関係数を支配する",
                  body: "データセット III・IV では 1 点の外れ値・レバレッジ点が相関係数全体を決めている。n=11 は少なすぎる。",
                  bg: "#fee2e2",
                  fg: "#991b1b",
                },
                {
                  icon: "✓",
                  title: "まず可視化せよ（Visualize First）",
                  body: "データ分析の鉄則。散布図を見た後でなければ、統計量は意味を持たない。要約→解釈の前に必ず目で見る。",
                  bg: "#dcfce7",
                  fg: "#166534",
                },
                {
                  icon: "✓",
                  title: "相関 ≠ 因果",
                  body: "r が高くても「AがBを引き起こす」は言えない。交絡変数・擬似相関・逆因果を常に疑う。",
                  bg: "#dcfce7",
                  fg: "#166534",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                    style={{ background: item.bg, color: item.fg }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {item.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs mt-5 pt-4" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>
              注：アンスコムの数値例は 2017 年に「Datasaurus Dozen」として拡張された。
              まったく同じ要約統計量（平均・分散・r）を持ちながら、恐竜・星・十字など 13 種の散布図パターンを持つデータセットが示された。
            </p>
          </div>

          {/* Re-hide button */}
          <div className="text-center mt-6">
            <button
              className="btn btn-ghost text-sm"
              onClick={() => setReveal(false)}
            >
              ← 統計量だけの状態に戻す
            </button>
          </div>
        </>
      )}
    </div>
  );
}
