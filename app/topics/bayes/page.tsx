"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const BayesRectangle = dynamic(() => import("@/components/BayesRectangle"), { ssr: false });

// ── Icon array (1000 people, 50×20 grid) ──────────────────────────────────────
interface PersonGridProps {
  tp: number; fp: number; fn: number; tn: number;
}

function PersonGrid({ tp, fp, fn, tn }: PersonGridProps) {
  const N = 1000;
  // Build color array: TP → FP → FN → TN
  const colors: string[] = [
    ...Array(Math.min(tp, N)).fill("#dc2626"),
    ...Array(Math.min(fp, N - tp)).fill("#ea580c"),
    ...Array(Math.min(fn, N - tp - fp)).fill("#fca5a5"),
  ];
  while (colors.length < N) colors.push("#d1d5db");

  const cols = 50, rows = 20, sz = 7, gap = 1;
  return (
    <svg
      width={cols * (sz + gap) - gap}
      height={rows * (sz + gap) - gap}
      className="block mx-auto"
    >
      {colors.map((fill, i) => (
        <rect
          key={i}
          x={(i % cols) * (sz + gap)}
          y={Math.floor(i / cols) * (sz + gap)}
          width={sz} height={sz}
          fill={fill}
          rx={1}
        />
      ))}
    </svg>
  );
}

// ── Preset scenarios ───────────────────────────────────────────────────────────
const PRESETS = [
  {
    label: "希少疾患検診",
    desc: "有病率 1%・高精度検査",
    prevalence: 0.010, sensitivity: 0.99, specificity: 0.99,
  },
  {
    label: "COVID無症状",
    desc: "PCR・低リスク集団",
    prevalence: 0.010, sensitivity: 0.95, specificity: 0.99,
  },
  {
    label: "COVID症状あり",
    desc: "高リスク集団",
    prevalence: 0.300, sensitivity: 0.80, specificity: 0.99,
  },
  {
    label: "HIV低リスク",
    desc: "有病率 0.1%",
    prevalence: 0.001, sensitivity: 0.99, specificity: 0.995,
  },
] as const;

// ── Math helpers ──────────────────────────────────────────────────────────────
function computeStats(prev: number, se: number, sp: number) {
  const N = 1000;
  const tp = Math.round(N * prev * se);
  const fp = Math.round(N * (1 - prev) * (1 - sp));
  const fn = Math.round(N * prev * (1 - se));
  const tn = N - tp - fp - fn;
  const posTotal = tp + fp;
  const negTotal = fn + tn;
  const ppv = posTotal > 0 ? tp / posTotal : 0;
  const npv = negTotal > 0 ? tn / negTotal : 0;
  return { tp, fp, fn, tn, ppv, npv };
}

function pct(v: number, d = 1) { return `${(v * 100).toFixed(d)}%`; }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BayesPage() {
  const [prevalence,  setPrev] = useState(0.010);
  const [sensitivity, setSe]   = useState(0.950);
  const [specificity, setSp]   = useState(0.950);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const { tp, fp, fn, tn, ppv, npv } = computeStats(prevalence, sensitivity, specificity);

  const applyPreset = (i: number) => {
    const p = PRESETS[i];
    setPrev(p.prevalence);
    setSe(p.sensitivity);
    setSp(p.specificity);
    setActivePreset(i);
  };

  // PPV color: red when low (counterintuitive), green when high
  const ppvColor = ppv < 0.5 ? "#dc2626" : ppv < 0.8 ? "#d97706" : "#16a34a";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>← トップへ</Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="panel-title mb-1">Bayes&apos; Theorem — Medical Testing</div>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
          ベイズの定理：検査陽性でも実は？
        </h1>
        <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
          感度・特異度が高い検査でも、有病率が低ければ「陽性＝病気あり」とはならない。
          面積図と人物グリッドで陽性的中率（PPV）の正体を体感する。
        </p>
      </div>

      {/* Preset buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
            style={{
              borderColor: activePreset === i ? "var(--accent)" : "var(--border)",
              background:  activePreset === i ? "var(--accent-light)" : "var(--surface)",
              color:       activePreset === i ? "var(--accent)" : "var(--text-secondary)",
            }}
            onClick={() => applyPreset(i)}
          >
            <span className="font-semibold">{p.label}</span>
            <span className="ml-1.5 text-xs opacity-70">{p.desc}</span>
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="panel mb-4 grid sm:grid-cols-3 gap-5">
        {[
          {
            label: "有病率 (prevalence)",
            value: prevalence, min: 0.001, max: 0.500, step: 0.001,
            set: (v: number) => { setPrev(v); setActivePreset(null); },
            display: pct(prevalence, 1),
            color: "#7c3aed",
          },
          {
            label: "感度 (sensitivity)",
            value: sensitivity, min: 0.500, max: 0.999, step: 0.001,
            set: (v: number) => { setSe(v); setActivePreset(null); },
            display: pct(sensitivity, 1),
            color: "#2563eb",
          },
          {
            label: "特異度 (specificity)",
            value: specificity, min: 0.500, max: 0.999, step: 0.001,
            set: (v: number) => { setSp(v); setActivePreset(null); },
            display: pct(specificity, 1),
            color: "#0891b2",
          },
        ].map(({ label, value, min, max, step, set, display, color }) => (
          <div key={label}>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</label>
              <span className="font-mono text-sm font-bold" style={{ color }}>{display}</span>
            </div>
            <input
              type="range" min={min} max={max} step={step} value={value}
              onChange={e => set(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: color }}
            />
          </div>
        ))}
      </div>

      {/* Big PPV display + key stats */}
      <div className="panel mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-48">
          <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-secondary)" }}>
            陽性的中率（PPV）— 検査陽性のうち本当に病気の割合
          </div>
          <div className="text-5xl font-black font-mono tabular-nums" style={{ color: ppvColor }}>
            {pct(ppv, 1)}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            1000人中 陽性 {tp + fp}人 → そのうち本当の病気 {tp}人
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "感度",   sub: "Se",  value: pct(sensitivity, 1), note: "病気→陽性", c: "#2563eb" },
            { label: "特異度", sub: "Sp",  value: pct(specificity, 1), note: "健康→陰性", c: "#0891b2" },
            { label: "陰性的中率", sub: "NPV", value: pct(npv, 1), note: "陰性→健康", c: "#16a34a" },
          ].map(({ label, sub, value, note, c }) => (
            <div key={sub}>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
              <div className="font-mono text-lg font-bold" style={{ color: c }}>{value}</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main visualization grid */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">

        {/* Left: Bayesian Rectangle */}
        <div className="panel flex flex-col gap-2">
          <div>
            <div className="panel-title">面積図（単位正方形）</div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              1万人の集団を面積で表す
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              横幅 = 有病率（病気あり／なし）、縦 = 検査結果。
              下のバーが陽性的中率の「正体」。
            </p>
          </div>

          <div style={{ background: "var(--bg)", borderRadius: 8, overflow: "hidden" }}>
            <BayesRectangle
              prevalence={prevalence}
              sensitivity={sensitivity}
              specificity={specificity}
              height={320}
            />
          </div>

          {/* Color legend */}
          <div className="grid grid-cols-2 gap-1 text-xs">
            {[
              { c: "#dc2626", label: "真陽性（TP）",   sub: "病気あり・陽性" },
              { c: "#ea580c", label: "偽陽性（FP）",   sub: "病気なし・陽性" },
              { c: "#fca5a5", label: "偽陰性（FN）",   sub: "病気あり・陰性" },
              { c: "#d1d5db", label: "真陰性（TN）",   sub: "病気なし・陰性" },
            ].map(({ c, label, sub }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c }} />
                <div>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{label}</span>
                  <span className="ml-1 opacity-60">{sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Icon Array */}
        <div className="panel flex flex-col gap-3">
          <div>
            <div className="panel-title">自然頻度（1000人グリッド）</div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              1000人並べてみると
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              左上から順に：赤（真陽性）・橙（偽陽性）・薄赤（偽陰性）・灰（真陰性）。
              陽性の列の中で赤の割合が PPV。
            </p>
          </div>

          <div style={{ background: "var(--bg)", borderRadius: 8, padding: "12px" }}>
            <PersonGrid tp={tp} fp={fp} fn={fn} tn={tn} />
          </div>

          {/* Frequency breakdown */}
          <div className="text-sm space-y-2">
            <div
              className="flex items-center justify-between p-2 rounded-lg"
              style={{ background: "#fee2e2" }}
            >
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#dc2626" }} />
                <span style={{ color: "#7f1d1d" }}>真陽性（病気あり・陽性）</span>
              </span>
              <span className="font-mono font-bold" style={{ color: "#dc2626" }}>{tp}</span>
            </div>
            <div
              className="flex items-center justify-between p-2 rounded-lg"
              style={{ background: "#ffedd5" }}
            >
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#ea580c" }} />
                <span style={{ color: "#7c2d12" }}>偽陽性（病気なし・陽性）</span>
              </span>
              <span className="font-mono font-bold" style={{ color: "#ea580c" }}>{fp}</span>
            </div>
            <div
              className="flex items-center justify-between p-2 rounded-lg font-semibold"
              style={{ background: "var(--accent-light)" }}
            >
              <span style={{ color: "var(--accent)" }}>陽性と判定された合計</span>
              <span className="font-mono" style={{ color: "var(--accent)" }}>
                {tp + fp} 人 → PPV = {pct(ppv, 1)}
              </span>
            </div>
          </div>

          {/* Bayes formula */}
          <div
            className="text-xs p-3 rounded-lg leading-loose font-mono"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div style={{ color: "var(--text-secondary)" }}>ベイズの定理：</div>
            <div style={{ color: "var(--text-primary)" }}>
              PPV = Se × π / (Se × π + (1-Sp) × (1-π))
            </div>
            <div style={{ color: "var(--text-secondary)" }} className="mt-1">
              = {pct(sensitivity, 1)} × {pct(prevalence, 1)} /
              ({pct(sensitivity, 1)} × {pct(prevalence, 1)} + {pct(1 - specificity, 1)} × {pct(1 - prevalence, 1)})
            </div>
            <div className="mt-1 font-bold" style={{ color: ppvColor }}>= {pct(ppv, 1)}</div>
          </div>
        </div>
      </div>

      {/* Insight panel */}
      <div className="panel" style={{ borderLeft: "4px solid #dc2626" }}>
        <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          「検査陽性 ≠ 病気確定」の理由
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: "⚖",
              title: "ベースレート無視（Base Rate Neglect）",
              body: "多くの人は「感度95%の検査が陽性 → 95%の確率で病気」と直感する。しかし有病率が低い集団では偽陽性が真陽性を大幅に上回るため、PPVは感度・特異度より有病率の影響を強く受ける。",
            },
            {
              icon: "🎯",
              title: "感度と特異度は「条件付き」確率",
              body: "感度 = P(陽性|病気)、特異度 = P(陰性|健康)。どちらも「病気かどうかを知った上で」の確率。医師や患者が本当に知りたいのは「陽性と知った上で病気かどうか」(PPV) — これはベイズの定理で計算する。",
            },
            {
              icon: "🧪",
              title: "スクリーニングと確定診断の違い",
              body: "無症状者への集団検診（有病率 1%）と症状ありの患者の検査（有病率 30%）では、同じ検査でも PPV が全く違う。PPV は集団次第で変わるため、検査の「精度」だけを評価基準にしてはいけない。",
            },
            {
              icon: "📐",
              title: "面積図が示すこと",
              body: "面積図の「陽性ゾーン」(上帯) は、病気あり列（赤）と病気なし列（橙）に分かれる。有病率が低いと列自体が極端に細くなり、赤の面積が橙に圧倒される。下のバーはこの比をそのまま可視化している。",
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
