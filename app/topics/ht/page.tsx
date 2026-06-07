"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  normalQuantile, pValueFromZ, theoreticalPower, normalCDF, Alternative,
} from "@/lib/statistics";
import Slider from "@/components/Slider";
import KaTeX from "@/components/KaTeX";

const HTIntegratedChart = dynamic(
  () => import("@/components/HTIntegratedChart"),
  { ssr: false },
);
const PValueChart = dynamic(() => import("@/components/PValueChart"), { ssr: false });

// ── Fixed parameters ─────────────────────────────────────────────────────────
const SIGMA = 1;   // population σ known
const MU0   = 0;   // null hypothesis mean

const ALPHAS = [0.01, 0.05, 0.10] as const;
type AlphaLevel = (typeof ALPHAS)[number];

const ALT_OPTIONS: { id: Alternative; label: string; symbol: string }[] = [
  { id: "two",   label: "両側", symbol: "μ ≠ μ₀" },
  { id: "right", label: "右側", symbol: "μ > μ₀" },
  { id: "left",  label: "左側", symbol: "μ < μ₀" },
];

interface TestResult {
  xBar: number;
  z: number;
  pValue: number;
  rejected: boolean;
}

function runTest(trueMu: number, n: number, alpha: number, alt: Alternative): TestResult {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    sum += Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * SIGMA + trueMu;
  }
  const xBar   = sum / n;
  const se     = SIGMA / Math.sqrt(n);
  const z      = (xBar - MU0) / se;
  const pValue = pValueFromZ(z, alt);
  return { xBar, z, pValue, rejected: pValue <= alpha };
}

export default function HTPage() {
  const [trueMu, setTrueMu]       = useState(1.0);
  const [n, setN]                 = useState(20);
  const [alpha, setAlpha]         = useState<AlphaLevel>(0.05);
  const [alternative, setAlt]     = useState<Alternative>("two");
  const [results, setResults]     = useState<TestResult[]>([]);
  const [latest, setLatest]       = useState<TestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const runRef = useRef(false);

  // Always-current params for timer loop
  const paramsRef = useRef({ trueMu, n, alpha, alternative });
  paramsRef.current = { trueMu, n, alpha, alternative };

  const se    = SIGMA / Math.sqrt(n);
  const power = theoreticalPower(trueMu - MU0, n, SIGMA, alpha, alternative);
  const beta  = 1 - power;
  const isH0True = Math.abs(trueMu - MU0) < 1e-9;

  // ── Reset helpers ──────────────────────────────────────────────────────────
  const stopAndClear = useCallback(() => {
    runRef.current = false;
    setIsRunning(false);
    setResults([]);
    setLatest(null);
  }, []);

  const changeMu  = useCallback((v: number) => { setTrueMu(parseFloat(v.toFixed(2))); stopAndClear(); }, [stopAndClear]);
  const changeN   = useCallback((v: number) => { setN(v);       stopAndClear(); }, [stopAndClear]);
  const changeAlpha = useCallback((a: AlphaLevel) => { setAlpha(a);  stopAndClear(); }, [stopAndClear]);
  const changeAlt   = useCallback((a: Alternative) => { setAlt(a);   stopAndClear(); }, [stopAndClear]);

  // ── Test generation ────────────────────────────────────────────────────────
  const generate = useCallback((): TestResult => {
    const { trueMu: mu, n: nn, alpha: a, alternative: alt } = paramsRef.current;
    return runTest(mu, nn, a, alt);
  }, []);

  const drawOne = useCallback(() => {
    const r = generate();
    setLatest(r);
    setResults(prev => [...prev, r]);
  }, [generate]);

  const drawMany = useCallback((count: number) => {
    const batch = Array.from({ length: count }, generate);
    setLatest(batch[batch.length - 1]);
    setResults(prev => [...prev, ...batch]);
  }, [generate]);

  const toggleAuto = useCallback(() => {
    if (isRunning) { runRef.current = false; setIsRunning(false); return; }
    runRef.current = true; setIsRunning(true);
    const tick = () => {
      if (!runRef.current) return;
      const batch = Array.from({ length: 5 }, generate);
      setLatest(batch[batch.length - 1]);
      setResults(prev => [...prev, ...batch]);
      setTimeout(tick, 100);
    };
    tick();
  }, [isRunning, generate]);

  const reset = useCallback(() => { runRef.current = false; setIsRunning(false); setResults([]); setLatest(null); }, []);

  // ── Derived simulation stats ───────────────────────────────────────────────
  const total    = results.length;
  const rejected = results.filter(r => r.rejected).length;
  const rejRate  = total > 0 ? rejected / total : null;

  // ── Color constants (mirror chart) ────────────────────────────────────────
  const C_ALPHA = "#ef4444";
  const C_BETA  = "#818cf8";
  const C_POWER = "#22c55e";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">

      {/* ── Header ── */}
      <div>
        <div className="text-xs font-semibold tracking-widest uppercase mb-1"
          style={{ color: "var(--text-secondary)" }}>
          Hypothesis Testing
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          仮説検定の構造：α・β・検出力
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          帰無分布と対立分布を重ね、第一種過誤 α・第二種過誤 β・検出力 1-β のトレードオフをスライダーで体感する。
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="panel flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1 min-w-44">
          <Slider label="真の母平均 μ" value={trueMu}
            min={-3} max={3} step={0.1} onChange={changeMu} />
          <div className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
            {isH0True
              ? "H₀ が真（μ = μ₀ = 0）"
              : `効果量 d = ${(Math.abs(trueMu) / SIGMA).toFixed(2)}`}
          </div>
        </div>

        <div className="flex-1 min-w-36 max-w-44">
          <Slider label="標本サイズ n" value={n} min={2} max={200} onChange={changeN} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>有意水準 α</span>
          <div className="flex gap-1">
            {ALPHAS.map(a => (
              <button key={a}
                onClick={() => changeAlpha(a)}
                className={`btn ${alpha === a ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}>
                {(a * 100).toFixed(0)}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>対立仮説</span>
          <div className="flex gap-1">
            {ALT_OPTIONS.map(o => (
              <button key={o.id}
                onClick={() => changeAlt(o.id)}
                className={`btn ${alternative === o.id ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.3rem 0.55rem", fontSize: "0.78rem" }}>
                {o.symbol}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={drawOne}>1標本</button>
          <button className="btn btn-secondary" onClick={() => drawMany(100)}>+100</button>
          <button className="btn btn-secondary" onClick={() => drawMany(1000)}>+1000</button>
          <button className={`btn ${isRunning ? "btn-primary" : "btn-secondary"}`} onClick={toggleAuto}>
            {isRunning ? "■ 停止" : "▶ 自動"}
          </button>
          <button className="btn btn-ghost" onClick={reset}>リセット</button>
        </div>
      </div>

      {/* ── Hero chart ── */}
      <div className="panel py-3 px-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="panel-title">
            帰無分布と{isH0True ? "（対立分布なし、H₀ = H₁）" : "対立分布の重ね合わせ"}
          </span>
          {/* HTML legend */}
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span className="flex items-center gap-1">
              <span className="inline-block w-5 h-2 rounded" style={{ background: "#2563eb" }} />
              H₀ の分布
            </span>
            {!isH0True && (
              <span className="flex items-center gap-1">
                <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#16a34a" strokeWidth="2" strokeDasharray="5,3" /></svg>
                H₁ の分布（真）
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ background: "#ef4444", opacity: 0.5 }} />
              α（棄却域）
            </span>
            {!isH0True && (
              <>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded" style={{ background: "#818cf8", opacity: 0.6 }} />
                  β（第二種過誤）
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded" style={{ background: "#22c55e", opacity: 0.7 }} />
                  1-β（検出力）
                </span>
              </>
            )}
            {latest && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#f59e0b", opacity: 0.7 }} />
                p 値領域
              </span>
            )}
          </div>
        </div>

        <HTIntegratedChart
          mu0={MU0}
          trueMu={trueMu}
          se={se}
          alpha={alpha}
          alternative={alternative}
          observedXBar={latest?.xBar ?? null}
          rejected={latest?.rejected ?? false}
          height={340}
        />
      </div>

      {/* ── Theory stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* α */}
        <div className="panel py-3 px-4 border-l-4" style={{ borderLeftColor: C_ALPHA }}>
          <div className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>
            有意水準 α（第一種過誤上限）
          </div>
          <div className="text-3xl font-bold tabular-nums" style={{ color: C_ALPHA }}>
            {(alpha * 100).toFixed(0)}%
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            H₀ が真のとき誤って棄却する確率
          </div>
        </div>

        {/* β */}
        <div className="panel py-3 px-4 border-l-4" style={{ borderLeftColor: C_BETA }}>
          <div className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>
            β（第二種過誤）
          </div>
          <div className="text-3xl font-bold tabular-nums" style={{ color: isH0True ? "#aaa" : C_BETA }}>
            {isH0True ? "—" : `${(beta * 100).toFixed(1)}%`}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {isH0True ? "μ = μ₀ のとき定義なし" : "H₁ が真のとき棄却し損ねる確率"}
          </div>
        </div>

        {/* 1-β */}
        <div className="panel py-3 px-4 border-l-4" style={{ borderLeftColor: C_POWER }}>
          <div className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>
            1-β（検出力 / Power）
          </div>
          <div className="text-3xl font-bold tabular-nums" style={{ color: isH0True ? "#aaa" : C_POWER }}>
            {isH0True ? `= α = ${(alpha * 100).toFixed(0)}%` : `${(power * 100).toFixed(1)}%`}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {isH0True ? "効果量 0 では検出力 = α" : "H₁ が真のとき正しく棄却できる確率"}
          </div>
        </div>

        {/* Empirical */}
        <div className="panel py-3 px-4 border-l-4" style={{ borderLeftColor: "#94a3b8" }}>
          <div className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>
            実測棄却率（{total} 回試行）
          </div>
          <div className="text-3xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {rejRate !== null ? `${(rejRate * 100).toFixed(1)}%` : "—"}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            理論値: {isH0True ? `α = ${(alpha*100).toFixed(0)}%` : `1-β = ${(power*100).toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* ── Lower section: latest test + p-value histogram ── */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Latest test detail */}
        <div className="panel flex flex-col gap-3">
          <div className="panel-title">直近の検定結果</div>
          {latest ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: "標本平均 x̄", value: latest.xBar.toFixed(4) },
                  { label: "検定統計量 z", value: latest.z.toFixed(4) },
                  { label: "p 値", value: latest.pValue < 0.001 ? "< 0.001" : latest.pValue.toFixed(4) },
                  { label: "SE = σ/√n", value: se.toFixed(4) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg px-3 py-2"
                    style={{ background: "var(--bg)" }}>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
                    <div className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div className={`rounded-lg px-4 py-3 text-center font-bold text-sm`}
                style={{
                  background: latest.rejected ? "#fef2f2" : "#f0fdf4",
                  color: latest.rejected ? "#991b1b" : "#14532d",
                  border: `1.5px solid ${latest.rejected ? "#fca5a5" : "#86efac"}`,
                }}>
                {latest.rejected
                  ? `✗ 棄却 — p = ${latest.pValue < 0.001 ? "< 0.001" : latest.pValue.toFixed(4)} ≤ α = ${alpha}`
                  : `✓ 棄却せず — p = ${latest.pValue.toFixed(4)} > α = ${alpha}`}
              </div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {latest.rejected
                  ? `この標本 x̄ は棄却域に入る。${isH0True ? "「H₀ が真なのに棄却」＝第一種過誤" : "H₁ が真のとき正しい棄却 (Power)"}`
                  : `この標本 x̄ は棄却域外。${isH0True ? "「H₀ が真で棄却せず」= 正しい判断" : "「H₁ が真なのに棄却せず」＝第二種過誤 β"}`}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-sm"
              style={{ color: "var(--text-secondary)" }}>
              <div>「1標本」を押すと個別の検定結果が表示されます。</div>
              <div className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                スライダーを動かして α/β/1-β の塗り分けの変化を<br/>観察してください（標本は不要）
              </div>
            </div>
          )}
        </div>

        {/* p-value histogram */}
        <div className="panel flex flex-col gap-2">
          <div className="panel-title">p 値の分布（{total} 回）</div>
          <PValueChart
            pValues={results.map(r => r.pValue)}
            alpha={alpha}
            height={200}
            theoreticalPower={isH0True ? null : power}
          />
          {total > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-xs mt-1">
              <div className="rounded px-2 py-1.5" style={{ background: "#fef2f2" }}>
                <span style={{ color: "#dc2626" }}>✗ 棄却 (p ≤ α)</span>
                <span className="float-right font-semibold">{rejected} 回</span>
              </div>
              <div className="rounded px-2 py-1.5" style={{ background: "#f0fdf4" }}>
                <span style={{ color: "#16a34a" }}>✓ 棄却せず</span>
                <span className="float-right font-semibold">{total - rejected} 回</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-center py-2" style={{ color: "#bbb" }}>
              {isH0True
                ? "H₀ が真のとき p 値は U(0,1) に従う"
                : "H₁ が真のとき p 値は 0 に偏る（効果量・n が大きいほど強く）"}
            </div>
          )}
        </div>
      </div>

      {/* ── Insight section ── */}
      <div className="panel flex flex-col gap-4">
        <div className="panel-title">仮説検定の構造 — 要点</div>

        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
              α・β・1-β のトレードオフ
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              α を下げると β が増える（棄却閾値が高くなり、見逃しが増える）。
              n を増やせば両方を同時に下げられる。効果量 d が大きいほど同じ n でも検出力が高い。
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
              p 値の正しい意味
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              「H₀ が真と仮定したとき、今回以上に極端な統計量が出る確率」。
              図の琥珀色 (p 値領域) が赤い棄却域より小さいとき ⇒ p &lt; α ⇒ 棄却。
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
              H₀ 棄却せず ≠ H₀ が正しい
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              「棄却せず」は「証拠が不十分」。インディゴ色（β 領域）が大きいほど
              真のずれを見逃している可能性が高い（検出力不足）。
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg p-3" style={{ background: "#fef2f2" }}>
            <div className="font-semibold mb-1" style={{ color: "#991b1b" }}>
              検出力の計算式（両側 z 検定）
            </div>
            <div style={{ color: "#7f1d1d" }}>
              <KaTeX math={
                `1-\\beta = \\Phi\\!\\left(-z_{\\alpha/2}+\\frac{|\\mu-\\mu_0|}{\\sigma/\\sqrt{n}}\\right)`
                + `+\\Phi\\!\\left(-z_{\\alpha/2}-\\frac{|\\mu-\\mu_0|}{\\sigma/\\sqrt{n}}\\right)`
              } />
            </div>
          </div>
          <div className="rounded-lg p-3" style={{ background: "#f0fdf4" }}>
            <div className="font-semibold mb-1" style={{ color: "#14532d" }}>
              H₀ 真のとき（μ = 0）
            </div>
            <div style={{ color: "#166534" }}>
              p 値は <strong>U(0,1)</strong> に従い、棄却率 → α に収束する。
              青色の棄却域面積がそのまま α。
            </div>
          </div>
          <div className="rounded-lg p-3" style={{ background: "var(--accent-light)" }}>
            <div className="font-semibold mb-1" style={{ color: "var(--accent)" }}>
              必要標本数の目安
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              検出力 80% (β=0.2)・α=5%・両側で効果量 d=0.5 のとき、n ≈ 64 程度必要。
              スライダーで確認してみよう。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
