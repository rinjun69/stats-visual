"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DistributionId, getDistribution, sampleN } from "@/lib/distributions";
import { computeCI, normalQuantile, tQuantile, CIResult } from "@/lib/statistics";
import Slider from "@/components/Slider";
import KaTeX from "@/components/KaTeX";

const CI100Chart = dynamic(() => import("@/components/CI100Chart"), { ssr: false });

const DIST_OPTIONS: { id: DistributionId; label: string }[] = [
  { id: "normal",      label: "正規" },
  { id: "exponential", label: "指数" },
  { id: "bimodal",     label: "二峰性" },
  { id: "uniform",     label: "一様" },
  { id: "bernoulli",   label: "ベルヌーイ" },
];

const LEVELS = [0.90, 0.95, 0.99] as const;
type Level = (typeof LEVELS)[number];

const DISPLAY = 100;

export default function CIPage() {
  const [distId, setDistId]       = useState<DistributionId>("normal");
  const [n, setN]                 = useState(30);
  const [level, setLevel]         = useState<Level>(0.95);
  const [useT, setUseT]           = useState(true);
  const [entries, setEntries]     = useState<CIResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const runRef = useRef(false);

  // Memoize distribution — stable object reference when distId hasn't changed.
  // This is the single source of truth for μ and σ.
  const dist = useMemo(() => getDistribution(distId), [distId]);
  const effN = useT ? Math.max(n, 2) : Math.max(n, 1);

  // Always-current params for timer callbacks — avoids stale closures.
  // Written synchronously at the top of every render before any JSX.
  const paramsRef = useRef({ dist, effN, level, useT });
  paramsRef.current = { dist, effN, level, useT };

  // Domain: center on dist.mean (same μ shown in chart and used in containsMu).
  const critVal = useT && effN >= 2
    ? tQuantile(1 - (1 - level) / 2, effN - 1)
    : normalQuantile(1 - (1 - level) / 2);
  const se = dist.std / Math.sqrt(effN);
  const halfWidth = critVal * se;
  const domain: [number, number] = [
    dist.mean - halfWidth * 3.5,
    dist.mean + halfWidth * 3.5,
  ];

  // ── DEV verification ─────────────────────────────────────────────────────
  // Logs empirical μ/σ to console whenever distribution changes.
  // Verifies that dist.mean / dist.std match what the sampler actually produces.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const N = 10_000;
    const xs = Array.from({ length: N }, () => dist.sample());
    const empMu  = xs.reduce((a, b) => a + b, 0) / N;
    const empSig = Math.sqrt(xs.reduce((a, b) => a + (b - empMu) ** 2, 0) / N);
    const muOk  = Math.abs(empMu  - dist.mean) < 0.05;
    const sigOk = Math.abs(empSig - dist.std)  < 0.05;
    console.log(
      `[CI verify] ${dist.label.padEnd(20)}` +
      `  定義 μ=${dist.mean.toFixed(4)} σ=${dist.std.toFixed(4)}` +
      `  実測 μ=${empMu.toFixed(4)} σ=${empSig.toFixed(4)}` +
      `  ${muOk ? "μ✓" : "μ✗"} ${sigOk ? "σ✓" : "σ✗"}`
    );
  }, [dist]);

  // ── State reset helpers ───────────────────────────────────────────────────
  // Resetting is done synchronously inside each control handler (not in
  // useEffect) so that entries never live through a render with a different
  // distribution / n / level — which would make containsMu (from the old μ)
  // disagree with the currently displayed μ line.

  const stopAndClear = useCallback(() => {
    runRef.current = false;
    setIsRunning(false);
    setEntries([]);
  }, []);

  const changeDist  = useCallback((id: DistributionId) => { setDistId(id);  stopAndClear(); }, [stopAndClear]);
  const changeN     = useCallback((v: number)           => { setN(v);       stopAndClear(); }, [stopAndClear]);
  const changeLevel = useCallback((lv: Level)           => { setLevel(lv);  stopAndClear(); }, [stopAndClear]);
  const changeUseT  = useCallback((t: boolean)          => { setUseT(t);    stopAndClear(); }, [stopAndClear]);

  // ── CI generation ─────────────────────────────────────────────────────────
  // Reads from paramsRef so it is safe to call from timer callbacks without
  // capturing stale values. The mu passed to computeCI is always
  // paramsRef.current.dist.mean — the same value CI100Chart receives as `mu`.
  const generateCI = useCallback((): CIResult => {
    const { dist: d, effN: en, level: lv, useT: ut } = paramsRef.current;
    const samples = sampleN(d, en);
    return computeCI(samples, d.mean, d.std, lv, ut);
  }, []);

  const draw100 = useCallback(() => {
    const batch = Array.from({ length: 100 }, generateCI);
    setEntries(prev => [...prev, ...batch]);
  }, [generateCI]);

  const drawOne = useCallback(() => {
    setEntries(prev => [...prev, generateCI()]);
  }, [generateCI]);

  const toggleAuto = useCallback(() => {
    if (isRunning) { runRef.current = false; setIsRunning(false); return; }
    runRef.current = true;
    setIsRunning(true);
    const tick = () => {
      if (!runRef.current) return;
      setEntries(prev => [...prev, generateCI()]);
      setTimeout(tick, 80);
    };
    tick();
  }, [isRunning, generateCI]);

  const reset = useCallback(() => {
    runRef.current = false;
    setIsRunning(false);
    setEntries([]);
  }, []);

  // ── Derived display stats ─────────────────────────────────────────────────
  const recent      = entries.slice(-DISPLAY);
  const recentHits  = recent.filter(e => e.containsMu).length;
  const recentTotal = recent.length;
  const recentMiss  = recentTotal - recentHits;
  const totalHits   = entries.filter(e => e.containsMu).length;
  const totalAll    = entries.length;
  const coverage    = totalAll > 0 ? (totalHits / totalAll * 100).toFixed(1) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="text-xs font-semibold tracking-widest uppercase mb-1"
          style={{ color: "var(--text-secondary)" }}>
          Confidence Interval
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          信頼区間とよくある誤解
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          「95%信頼区間」の意味を 100 本のラインで確かめよう。
        </p>
      </div>

      {/* ── Misconception callout ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 border-2"
          style={{ borderColor: "#fca5a5", background: "#fff1f2" }}>
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg leading-none mt-0.5">❌</span>
            <span className="font-bold text-sm" style={{ color: "#991b1b" }}>よくある誤解</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#7f1d1d" }}>
            「計算された信頼区間 [a, b] に、真値 μ が
            <strong> 95% の確率</strong>で含まれている」
          </p>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "#b91c1c" }}>
            μ は固定した定数。特定の区間について確率を語るのは不正確。
            [a, b] は「μ を含む」か「含まない」かのどちらかでしかない。
          </p>
        </div>

        <div className="rounded-xl p-4 border-2"
          style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg leading-none mt-0.5">✓</span>
            <span className="font-bold text-sm" style={{ color: "#14532d" }}>正しい解釈</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#166534" }}>
            「同じ手順（分布・n・信頼水準）で繰り返し抽出すれば、
            得られる区間の<strong> 95% が μ を含む</strong>」
          </p>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "#15803d" }}>
            確率は「手順の信頼性」の話。→ 以下の 100 本で視覚的に確認しよう。
          </p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="panel flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>母集団分布</span>
          <div className="flex flex-wrap gap-1.5">
            {DIST_OPTIONS.map(d => (
              <button key={d.id}
                onClick={() => changeDist(d.id)}
                className={`btn ${distId === d.id ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-36 max-w-48">
          <Slider label="標本サイズ n" value={effN}
            min={useT ? 2 : 1} max={100} onChange={changeN} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>信頼水準</span>
          <div className="flex gap-1">
            {LEVELS.map(lv => (
              <button key={lv}
                onClick={() => changeLevel(lv)}
                className={`btn ${level === lv ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}>
                {(lv * 100).toFixed(0)}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>区間の種類</span>
          <div className="flex gap-1">
            {([false, true] as const).map(t => (
              <button key={String(t)}
                onClick={() => changeUseT(t)}
                className={`btn ${useT === t ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.3rem 0.55rem", fontSize: "0.78rem" }}>
                {t ? "t 区間（σ 未知）" : "z 区間（σ 既知）"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={draw100}
            className="btn btn-primary"
            style={{ fontSize: "0.95rem", padding: "0.45rem 1.2rem", fontWeight: 700 }}>
            100回抽出
          </button>
          <button className="btn btn-secondary" onClick={drawOne}>1本ずつ</button>
          <button
            className={`btn ${isRunning ? "btn-primary" : "btn-secondary"}`}
            onClick={toggleAuto}>
            {isRunning ? "■ 停止" : "▶ 自動"}
          </button>
          <button className="btn btn-ghost" onClick={reset}>リセット</button>
        </div>
      </div>

      {/* ── Count display ── */}
      <div className="panel py-5">
        {recentTotal === 0 ? (
          <p className="text-center text-sm" style={{ color: "#aaa" }}>
            「100回抽出」を押すと 100 本の信頼区間が描かれます
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <div className="text-6xl font-bold tabular-nums leading-none" style={{ color: "#22c55e" }}>
                {recentHits}
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: "#16a34a" }}>✓ μ を含む</div>
            </div>

            <div className="text-4xl font-light" style={{ color: "#d1d5db" }}>+</div>

            <div className="text-center">
              <div className="text-6xl font-bold tabular-nums leading-none" style={{ color: "#ef4444" }}>
                {recentMiss}
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: "#dc2626" }}>✗ μ を含まない</div>
            </div>

            <div className="text-4xl font-light" style={{ color: "#d1d5db" }}>=</div>

            <div className="text-center">
              <div className="text-6xl font-bold tabular-nums leading-none" style={{ color: "var(--text-primary)" }}>
                {recentTotal}
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: "var(--text-secondary)" }}>本（直近）</div>
            </div>

            <div className="flex flex-col items-center gap-0.5 pl-2 border-l"
              style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {((recentHits / recentTotal) * 100).toFixed(1)}% が μ を含む
              </div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                設定信頼水準 {(level * 100).toFixed(0)}%
              </div>
              {coverage !== null && totalAll > DISPLAY && (
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  累積 {totalAll} 本: {coverage}%
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── CI100 Chart ── */}
      <div className="panel py-2 px-3">
        <div className="flex justify-between items-baseline mb-2">
          <span className="panel-title">
            直近 {DISPLAY} 本の信頼区間（n={effN}、{(level*100).toFixed(0)}% {useT ? "t" : "z"} 区間）
          </span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "#22c55e" }}>■</span> μ を含む
            <span style={{ color: "#ef4444" }}>■</span> μ を含まない
            <span style={{ color: "#1d4ed8" }}>│</span> μ = {dist.mean.toFixed(4)}
          </span>
        </div>
        {/* mu and domain both derive from the same dist object — always consistent */}
        <CI100Chart
          entries={entries}
          mu={dist.mean}
          domain={domain}
          displayCount={DISPLAY}
          height={520}
        />
      </div>

      {/* ── Key parameters ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "母平均 μ",          value: dist.mean.toFixed(4) },
          { label: "母標準偏差 σ",       value: dist.std.toFixed(4)  },
          { label: useT ? `臨界値 t (df=${effN-1})` : "臨界値 z",
            value: critVal.toFixed(4) },
          { label: "SE = σ/√n",         value: se.toFixed(4)        },
        ].map(({ label, value }) => (
          <div key={label} className="panel py-2 px-3">
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
            <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Insight section ── */}
      <div className="panel flex flex-col gap-4">
        <div className="panel-title">まとめと考察</div>

        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>なぜ「確率 95%」は誤りか</div>
            <div style={{ color: "var(--text-secondary)" }}>
              μ は確率変数ではなく、固定した未知定数。
              「区間 [a, b] に μ が入る確率」は 0 か 1 か決まっており、
              "95%" という確率は定義できない。
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>n を変えると何が変わる？</div>
            <div style={{ color: "var(--text-secondary)" }}>
              n が大きいほど SE = <KaTeX math="\sigma/\sqrt{n}" /> が小さく、
              区間が<strong>狭く</strong>なる。100 本のラインが全体的に短くなる様子で確認できる。
              被覆率は設定した信頼水準のまま変わらない。
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>信頼水準を上げると？</div>
            <div style={{ color: "var(--text-secondary)" }}>
              99% にすると赤いラインがほぼ消える（約 1 本）。
              その代わり区間が<strong>広く</strong>なる。
              精度（幅）と確実性（水準）のトレードオフが一目でわかる。
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-xs p-3 rounded-lg"
            style={{ background: "var(--accent-light)", color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--accent)" }}>正確な言葉づかい：</strong>
            「μ が 95% の確率でこの区間にある」→
            「この手順で得た区間の 95% が μ を含む」
          </div>
          <div className="text-xs p-3 rounded-lg" style={{ background: "#fef9c3", color: "#78350f" }}>
            <strong>z 区間 vs t 区間：</strong>
            σ が未知なら t 区間を使う。小さい n では t 臨界値が大きく（n=2 で t≈12.7）、
            区間が広がって被覆率を保証する。
          </div>
        </div>
      </div>
    </div>
  );
}
