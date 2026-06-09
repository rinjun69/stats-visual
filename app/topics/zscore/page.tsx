"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { normalCDF } from "@/lib/prob";

const ZScoreChart = dynamic(() => import("@/components/ZScoreChart"), { ssr: false });

// ── Presets ──────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { label: "模試（偏差値スケール）", desc: "μ=50, σ=10",   mu:  50, sigma: 10, initX:  65 },
  { label: "大学入試（英語）",       desc: "μ=65, σ=15",   mu:  65, sigma: 15, initX:  80 },
  { label: "身長（成人男性）",       desc: "μ=171, σ=6cm", mu: 171, sigma:  6, initX: 177 },
  { label: "IQ（知能指数）",         desc: "μ=100, σ=15",  mu: 100, sigma: 15, initX: 115 },
] as const;

// ── Deviation value reference table ──────────────────────────────────────────
const T_TABLE = [75, 70, 65, 60, 55, 50, 45, 40, 35, 30].map(t => ({
  t,
  z: (t - 50) / 10,
}));

function fmt(n: number, d = 2) { return n.toFixed(d); }

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ZScorePage() {
  const [mu,    setMu]    = useState(50);
  const [sigma, setSigma] = useState(10);
  const [x,     setX]     = useState(65);
  const [activeScenario, setActive] = useState<number | null>(0);

  const xMin = mu - 4 * sigma;
  const xMax = mu + 4 * sigma;
  const cx   = Math.max(xMin, Math.min(xMax, x));

  const z       = (cx - mu) / sigma;
  const T       = 10 * z + 50;
  const pctile  = normalCDF(z) * 100;
  const topPct  = 100 - pctile;

  const tColor = T >= 70 ? "#16a34a" : T >= 60 ? "#2563eb" : T >= 40 ? "#374151" : T >= 30 ? "#d97706" : "#dc2626";

  const applyScenario = (i: number) => {
    const s = SCENARIOS[i];
    setMu(s.mu); setSigma(s.sigma); setX(s.initX); setActive(i);
  };

  // Clamp row highlight: find closest T-table row to current T
  const activeRow = useMemo(() => {
    let best = 0, bestDist = Infinity;
    T_TABLE.forEach(({ t }, i) => {
      const d = Math.abs(T - t);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return bestDist < 3.5 ? best : -1;
  }, [T]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>← トップへ</Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="panel-title mb-1">Standardization — z-Score & Deviation Value (偏差値)</div>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
          標準化・z スコア・偏差値
        </h1>
        <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
          生の値 x をスライドすると z スコア・偏差値・パーセンタイルが連動。
          正規曲線の塗りつぶし面積がパーセンタイルそのもの。「偏差値 65 は上位何 %？」の正体を確認する。
        </p>
      </div>

      {/* Scenario presets */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SCENARIOS.map((s, i) => (
          <button
            key={i}
            className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
            style={{
              borderColor: activeScenario === i ? "var(--accent)" : "var(--border)",
              background:  activeScenario === i ? "var(--accent-light)" : "var(--surface)",
              color:       activeScenario === i ? "var(--accent)" : "var(--text-secondary)",
            }}
            onClick={() => applyScenario(i)}
          >
            <span className="font-semibold">{s.label}</span>
            <span className="ml-1.5 text-xs opacity-70">{s.desc}</span>
          </button>
        ))}
      </div>

      {/* μ / σ sliders */}
      <div className="panel mb-3 grid sm:grid-cols-2 gap-5">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs" style={{ color: "var(--text-secondary)" }}>母集団の平均 μ</label>
            <span className="font-mono text-sm font-bold" style={{ color: "#374151" }}>{mu}</span>
          </div>
          <input
            type="range" min={-200} max={300} step={1} value={mu}
            onChange={e => { setMu(+e.target.value); setActive(null); setX(+e.target.value); }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: "#374151" }}
          />
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs" style={{ color: "var(--text-secondary)" }}>母集団の標準偏差 σ</label>
            <span className="font-mono text-sm font-bold" style={{ color: "#374151" }}>{sigma}</span>
          </div>
          <input
            type="range" min={1} max={60} step={1} value={sigma}
            onChange={e => { setSigma(+e.target.value); setActive(null); }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: "#374151" }}
          />
        </div>
      </div>

      {/* x slider (large) */}
      <div className="panel mb-3">
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            観測値 x
          </label>
          <span className="font-mono text-2xl font-black" style={{ color: "#f97316" }}>
            {cx.toFixed(sigma < 5 ? 2 : 1)}
          </span>
        </div>
        <input
          type="range" min={xMin} max={xMax} step={0.1} value={cx}
          onChange={e => { setX(parseFloat(e.target.value)); setActive(null); }}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer"
          style={{ accentColor: "#f97316" }}
        />
        <div className="flex justify-between text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>
          <span>μ−4σ = {xMin.toFixed(sigma < 5 ? 1 : 0)}</span>
          <span>μ = {mu}</span>
          <span>μ+4σ = {xMax.toFixed(sigma < 5 ? 1 : 0)}</span>
        </div>
      </div>

      {/* Main chart */}
      <div className="panel p-0 overflow-hidden mb-4">
        <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            グラフ上でクリック・ドラッグして x を動かせます
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fff7ed", color: "#c2410c" }}>
            青面積 = パーセンタイル
          </span>
        </div>
        <ZScoreChart mu={mu} sigma={sigma} x={cx} onXChange={v => { setX(v); setActive(null); }} height={310} />
      </div>

      {/* Big stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {([
          {
            label: "z スコア",
            value: `${z >= 0 ? "+" : ""}${fmt(z, 2)}`,
            sub: `(${cx.toFixed(1)} − ${mu}) / ${sigma}`,
            color: "#f97316",
          },
          {
            label: "偏差値（T スコア）",
            value: fmt(T, 1),
            sub: "10z + 50",
            color: tColor,
          },
          {
            label: "パーセンタイル",
            value: `${fmt(pctile, 1)}%`,
            sub: "下から X% の位置",
            color: "#2563eb",
          },
          {
            label: "上位 %",
            value: `${fmt(topPct, 1)}%`,
            sub: "上位 X% に入る",
            color: "#7c3aed",
          },
        ] as const).map(({ label, value, sub, color }) => (
          <div key={label} className="panel text-center">
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</div>
            <div className="text-3xl font-black font-mono tabular-nums leading-tight" style={{ color }}>
              {value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Formula strip */}
      <div
        className="mb-4 px-4 py-3 rounded-xl flex flex-wrap gap-x-8 gap-y-1 items-center font-mono text-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--text-secondary)" }}>
          z = (x − μ) / σ = ({cx.toFixed(1)} − {mu}) / {sigma}
          <span className="font-bold ml-1" style={{ color: "#f97316" }}>= {z >= 0 ? "+" : ""}{fmt(z, 2)}</span>
        </span>
        <span style={{ color: "var(--text-secondary)" }}>
          偏差値 = 10z + 50 = 10 × {fmt(z, 2)} + 50
          <span className="font-bold ml-1" style={{ color: "#7c3aed" }}>= {fmt(T, 1)}</span>
        </span>
        <span style={{ color: "var(--text-secondary)" }}>
          Φ({fmt(z, 2)}) <span className="font-bold" style={{ color: "#2563eb" }}>= {fmt(pctile / 100, 4)}</span>
        </span>
      </div>

      {/* Bottom section: table + insight */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Deviation value reference table */}
        <div className="panel">
          <h3 className="font-bold mb-3" style={{ color: "var(--text-primary)" }}>偏差値早見表</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["偏差値", "z スコア", "上位 %", "パーセンタイル"].map(h => (
                    <th key={h} className="py-1.5 px-1 text-xs font-semibold text-right first:text-left"
                        style={{ color: "var(--text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {T_TABLE.map(({ t, z: zr }, i) => {
                  const p   = normalCDF(zr) * 100;
                  const top = 100 - p;
                  const hi  = i === activeRow;
                  return (
                    <tr key={t} style={{
                      borderBottom: "1px solid var(--border)",
                      background: hi ? "var(--accent-light)" : "transparent",
                    }}>
                      <td className="py-1.5 px-1 font-bold font-mono" style={{ color: hi ? "var(--accent)" : "var(--text-primary)" }}>{t}</td>
                      <td className="py-1.5 px-1 text-right font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{zr >= 0 ? "+" : ""}{fmt(zr, 1)}</td>
                      <td className="py-1.5 px-1 text-right font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{fmt(top, 2)}%</td>
                      <td className="py-1.5 px-1 text-right font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{fmt(p, 2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insight panel */}
        <div className="panel" style={{ borderLeft: "4px solid var(--accent)" }}>
          <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>標準化のポイント</h3>
          <div className="flex flex-col gap-3.5">
            {[
              {
                icon: "📐",
                title: "z スコアとは",
                body: "z = (x − μ) / σ。平均から何標準偏差離れているかを表す。単位（点・cm・秒）を消して「どれだけ珍しいか」を統一スケールにする。",
              },
              {
                icon: "🎓",
                title: "偏差値の正体",
                body: "偏差値 T = 10z + 50。平均 50・標準偏差 10 にリスケールしただけ。偏差値 60 = z = +1 = 上位 15.9%。複雑な計算ではなく、線形変換に過ぎない。",
              },
              {
                icon: "📊",
                title: "面積 = パーセンタイル",
                body: "標準正規分布の −∞ から z までの面積 Φ(z) がパーセンタイルそのもの。グラフの青塗りがこれを示す。z = 0 のとき面積は 50%（中央値）。",
              },
              {
                icon: "🔄",
                title: "異なる尺度を比べる",
                body: "「英語 80 点（μ=65, σ=15）」と「数学 70 点（μ=50, σ=10）」、どちらが相対的に優れているか？z スコア（+1.0 vs +2.0）で初めて公正に比較できる。",
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
    </div>
  );
}
