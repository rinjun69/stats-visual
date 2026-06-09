"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { computeOLS } from "@/lib/ols";
import type { DataPoint } from "@/components/OLSChart";
import type { R2Mode } from "@/components/R2Chart";

const R2Chart = dynamic(() => import("@/components/R2Chart"), { ssr: false });

// ── Fixed chart domain ─────────────────────────────────────────────────────────
const X_DOM: [number, number] = [0, 11];
const Y_DOM: [number, number] = [0, 12];

// ── Initial data (R² ≈ 0.80, clear positive trend with realistic scatter) ─────
const INIT: DataPoint[] = [
  { id:  1, x:  1, y:  2.5 },
  { id:  2, x:  2, y:  3.8 },
  { id:  3, x:  3, y:  2.0 },
  { id:  4, x:  4, y:  5.5 },
  { id:  5, x:  5, y:  4.0 },
  { id:  6, x:  6, y:  7.5 },
  { id:  7, x:  7, y:  5.2 },
  { id:  8, x:  8, y:  8.8 },
  { id:  9, x:  9, y:  8.0 },
  { id: 10, x: 10, y: 10.5 },
];

let nextId = 11;

// ── Mode metadata ──────────────────────────────────────────────────────────────
const MODES: { key: R2Mode; label: string; desc: string; badge: string; badgeColor: string }[] = [
  {
    key: "total",
    label: "全体のばらつき",
    desc: "各点から ȳ（水平線）への縦線 = 総変動 TSS = Σ(yᵢ−ȳ)²",
    badge: "TSS",
    badgeColor: "#6b7280",
  },
  {
    key: "residual",
    label: "残差（OLS）",
    desc: "各点から回帰直線への縦線 = OLS が説明できなかった RSS = Σ(yᵢ−ŷᵢ)²",
    badge: "RSS",
    badgeColor: "#ea580c",
  },
  {
    key: "decompose",
    label: "分解表示",
    desc: "青 = 回帰線が説明した ESS（ȳ→ŷᵢ）　橙 = 残差 RSS（ŷᵢ→yᵢ）　TSS = ESS + RSS",
    badge: "ESS+RSS",
    badgeColor: "#2563eb",
  },
];

function fmt(n: number, d = 3) { return n.toFixed(d); }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function R2Page() {
  const [points, setPoints] = useState<DataPoint[]>(INIT);
  const [mode,   setMode]   = useState<R2Mode>("total");

  // Regression and stats
  const ols   = useMemo(() => computeOLS(points), [points]);
  const meanY = useMemo(() => points.reduce((s, p) => s + p.y, 0) / points.length, [points]);
  const tss   = useMemo(() => points.reduce((s, p) => s + (p.y - meanY) ** 2, 0), [points, meanY]);
  const rss   = ols.rss;
  const ess   = Math.max(0, tss - rss);
  const r2    = ols.r2;
  const r     = Math.sign(ols.slope) * Math.sqrt(Math.max(0, r2));

  const handleMove = useCallback((id: number, x: number, y: number) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  }, []);

  const handleRemove = useCallback((id: number) => {
    setPoints(prev => prev.length > 3 ? prev.filter(p => p.id !== id) : prev);
  }, []);

  const handleAdd = useCallback(() => {
    const x = 1 + Math.random() * 9;
    const y = Math.max(0.5, Math.min(11.5, ols.slope * x + ols.intercept + (Math.random() - 0.5) * 3));
    setPoints(prev => [...prev, { id: nextId++, x, y }]);
  }, [ols.slope, ols.intercept]);

  const handleReset = useCallback(() => { setPoints(INIT); setMode("total"); }, []);

  // R² bar colors
  const r2Pct = Math.max(0, Math.min(100, r2 * 100));

  const activeMode = MODES.find(m => m.key === mode)!;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>← トップへ</Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="panel-title mb-1">Simple Linear Regression — Coefficient of Determination</div>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
          単回帰と決定係数 R²
        </h1>
        <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
          点をドラッグして残差の変化を観察。「全体のばらつき（TSS）のうち回帰直線が説明できた割合」が
          R² の正体。3 つのモードで TSS・RSS・ESS を切り替えて確認する。
        </p>
      </div>

      {/* Mode tabs */}
      <div
        className="inline-flex rounded-lg mb-1 overflow-hidden border"
        style={{ borderColor: "var(--border)" }}
      >
        {MODES.map(m => (
          <button
            key={m.key}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: mode === m.key ? m.badgeColor : "var(--surface)",
              color: mode === m.key ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mb-3 text-xs px-1" style={{ color: "var(--text-secondary)" }}>
        {activeMode.desc}
      </div>

      {/* Chart */}
      <div className="panel p-0 overflow-hidden mb-4">
        <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            点をドラッグ → R² がリアルタイム更新　ダブルクリックで削除（最小3点）
          </span>
          {mode === "decompose" && (
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-1 inline-block rounded" style={{ background: "#2563eb" }} />
                ESS（青）
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-1 inline-block rounded" style={{ background: "#ea580c" }} />
                RSS（橙）
              </span>
            </div>
          )}
        </div>
        <R2Chart
          points={points}
          slope={ols.slope}
          intercept={ols.intercept}
          meanY={meanY}
          mode={mode}
          xDomain={X_DOM}
          yDomain={Y_DOM}
          onPointMove={handleMove}
          onPointRemove={handleRemove}
          height={340}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button className="btn btn-secondary" onClick={handleAdd}>＋ 点を追加</button>
        <button className="btn btn-ghost" onClick={handleReset}>リセット</button>
        <span className="text-xs self-center ml-1" style={{ color: "var(--text-secondary)" }}>
          点: {points.length}個
        </span>
      </div>

      {/* Big R² display + stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {([
          { label: "決定係数 R²", value: fmt(r2, 4), color: r2 >= 0.7 ? "#16a34a" : r2 >= 0.4 ? "#d97706" : "#dc2626", sub: "ESS / TSS" },
          { label: "相関係数 r",  value: fmt(r, 4), color: "#7c3aed", sub: "±√R²（符号は傾きの向き）" },
          { label: "RSS（残差）", value: fmt(rss, 2), color: "#ea580c", sub: `Σ(yᵢ−ŷᵢ)²` },
          { label: "TSS（総変動）", value: fmt(tss, 2), color: "#6b7280", sub: `Σ(yᵢ−ȳ)²` },
        ] as const).map(({ label, value, color, sub }) => (
          <div key={label} className="panel text-center">
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</div>
            <div className="text-3xl font-black font-mono tabular-nums leading-tight" style={{ color }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* R² decomposition bar */}
      <div className="panel mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            TSS の分解　R² = ESS / TSS = 1 − RSS / TSS
          </span>
          <span className="font-mono text-sm font-bold" style={{ color: r2 >= 0.7 ? "#16a34a" : r2 >= 0.4 ? "#d97706" : "#dc2626" }}>
            R² = {fmt(r2, 4)}
          </span>
        </div>

        <div className="h-9 flex rounded-lg overflow-hidden text-white text-xs font-bold">
          {r2Pct > 3 && (
            <div
              className="flex items-center justify-center transition-all"
              style={{ width: `${r2Pct}%`, background: "#2563eb" }}
            >
              ESS {fmt(ess, 1)}
            </div>
          )}
          {100 - r2Pct > 3 && (
            <div
              className="flex items-center justify-center flex-1 transition-all"
              style={{ background: "#ea580c" }}
            >
              RSS {fmt(rss, 1)}
            </div>
          )}
        </div>

        <div className="flex justify-between text-xs mt-1.5">
          <span style={{ color: "#2563eb" }}>
            ESS = {fmt(ess, 1)}　（説明できた分散 = R² × TSS）
          </span>
          <span style={{ color: "#ea580c" }}>
            RSS = {fmt(rss, 1)}　（残差 = (1−R²) × TSS）
          </span>
        </div>

        {/* Formula line */}
        <div
          className="mt-3 px-3 py-2 rounded-lg font-mono text-xs"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          R² = 1 − {fmt(rss, 2)} / {fmt(tss, 2)} =&nbsp;
          <span className="font-bold" style={{ color: r2 >= 0.7 ? "#16a34a" : "#d97706" }}>
            {fmt(r2, 4)}
          </span>
          &emsp;｜&emsp; ŷ = {ols.intercept >= 0 ? "" : "−"}{Math.abs(ols.intercept) < 0.001 ? "" : `${fmt(Math.abs(ols.intercept), 2)} + `}{fmt(ols.slope, 3)}x
          &emsp;｜&emsp; ȳ = {fmt(meanY, 2)}
        </div>
      </div>

      {/* Insight panel */}
      <div className="panel" style={{ borderLeft: "4px solid var(--accent)" }}>
        <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          決定係数 R² のポイント
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: "📐",
              title: "R² = 1 − RSS/TSS が意味すること",
              body: "TSS はベースライン（「常にȳと予測する」ヌルモデルの誤差）。RSS はOLS残差の二乗和。R² = 1 なら RSS=0（完全予測）、R²=0 なら RSS=TSS（回帰直線がȳ線と同じで無意味）。",
            },
            {
              icon: "🔗",
              title: "単回帰では R² = r²",
              body: `現在 r = ${fmt(r, 3)}、r² = ${fmt(r * r, 4)}、R² = ${fmt(r2, 4)}。単回帰の決定係数はピアソン相関係数の二乗と一致する。|r| が大きいほど直線で説明できる。`,
            },
            {
              icon: "📊",
              title: "TSS = ESS + RSS",
              body: "OLS 推定量にかぎり、全変動は説明成分と残差に完全に分解できる（偏差定理）。「分解表示」モードで各点ごとの ESS（青）と RSS（橙）の棒が確認できる。",
            },
            {
              icon: "⚠",
              title: "R² の限界と注意点",
              body: "変数を増やすほど R² は必ず上がる（過学習）。説明変数数を考慮した自由度調整済み R²（Adjusted R²）を使うべき場面もある。また R² が高くても予測精度や因果関係は別問題。",
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-2.5">
              <span className="text-lg leading-tight mt-0.5 shrink-0">{item.icon}</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</div>
                <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
