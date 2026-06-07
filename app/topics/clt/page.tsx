"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DistributionId, getDistribution, sampleMean, sampleN } from "@/lib/distributions";
import Slider from "@/components/Slider";
import KaTeX from "@/components/KaTeX";

const PopulationPanel = dynamic(() => import("@/components/PopulationPanel"), { ssr: false });
const SamplePanel = dynamic(() => import("@/components/SamplePanel"), { ssr: false });
const Histogram = dynamic(() => import("@/components/Histogram"), { ssr: false });

const DIST_OPTIONS: { id: DistributionId; label: string }[] = [
  { id: "bimodal", label: "二峰性" },
  { id: "exponential", label: "指数" },
  { id: "uniform", label: "一様" },
  { id: "bernoulli", label: "ベルヌーイ" },
  { id: "normal", label: "正規" },
];

function mean(arr: number[]) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

export default function CLTPage() {
  const [distId, setDistId] = useState<DistributionId>("bimodal");
  const [n, setN] = useState(5);
  const [means, setMeans] = useState<number[]>([]);
  const [latestSamples, setLatestSamples] = useState<number[]>([]);
  const [latestMean, setLatestMean] = useState<number | null>(null);
  const [showCurve, setShowCurve] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const runRef = useRef(false);

  const dist = getDistribution(distId);

  const reset = useCallback(() => {
    setMeans([]);
    setLatestSamples([]);
    setLatestMean(null);
  }, []);

  // Reset means when n or dist changes
  useEffect(() => {
    reset();
  }, [distId, n, reset]);

  const drawOne = useCallback(() => {
    const samples = sampleN(dist, n);
    const m = mean(samples);
    setLatestSamples(samples);
    setLatestMean(m);
    setMeans((prev) => [...prev, m]);
  }, [dist, n]);

  const drawMany = useCallback((count: number) => {
    const batch: number[] = [];
    for (let i = 0; i < count; i++) {
      batch.push(sampleMean(dist, n));
    }
    setMeans((prev) => [...prev, ...batch]);
    // Also update latest sample
    const lastSamples = sampleN(dist, n);
    const m = mean(lastSamples);
    setLatestSamples(lastSamples);
    setLatestMean(m);
  }, [dist, n]);

  const toggleAuto = useCallback(() => {
    if (isRunning) {
      runRef.current = false;
      setIsRunning(false);
      return;
    }
    runRef.current = true;
    setIsRunning(true);
    const run = () => {
      if (!runRef.current) return;
      drawMany(10);
      setTimeout(run, 80);
    };
    run();
  }, [isRunning, drawMany]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { runRef.current = false; };
  }, []);

  const se = dist.std / Math.sqrt(n);
  const empiricalMean = mean(means);
  const empiricalStd = std(means);

  // Domain for means histogram
  const domainHalf = Math.max(4 * se, 0.5);
  const meansDomain: [number, number] = [dist.mean - domainHalf, dist.mean + domainHalf];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-secondary)" }}>
          Central Limit Theorem
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          中心極限定理
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          母集団の分布を選び、標本を繰り返し抽出して標本平均の分布を観察しよう。
        </p>
      </div>

      {/* Controls */}
      <div className="panel flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>母集団分布</span>
          <div className="flex flex-wrap gap-1.5">
            {DIST_OPTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDistId(d.id)}
                className={`btn ${distId === d.id ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-40 max-w-52">
          <Slider label="標本サイズ n" value={n} min={1} max={100} onChange={setN} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={drawOne}>
            1標本
          </button>
          <button className="btn btn-secondary" onClick={() => drawMany(100)}>
            +100
          </button>
          <button className="btn btn-secondary" onClick={() => drawMany(1000)}>
            +1000
          </button>
          <button
            className={`btn ${isRunning ? "btn-primary" : "btn-secondary"}`}
            onClick={toggleAuto}
          >
            {isRunning ? "■ 停止" : "▶ 自動"}
          </button>
          <button className="btn btn-ghost" onClick={reset}>
            リセット
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={showCurve}
            onChange={(e) => setShowCurve(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: "var(--accent)" }}
          />
          理論曲線
        </label>
      </div>

      {/* 3 panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Panel 1: Population */}
        <div className="panel flex flex-col gap-2">
          <div className="panel-title">パネル 1 — 母集団分布</div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{dist.label}</div>
          <PopulationPanel dist={dist} />
        </div>

        {/* Panel 2: One sample */}
        <div className="panel flex flex-col gap-2">
          <div className="panel-title">パネル 2 — 1回の標本（n = {n}）</div>
          <SamplePanel dist={dist} samples={latestSamples} sampleMean={latestMean} />
          {latestMean !== null && (
            <div className="stat-row">
              <span className="stat-label">標本平均 x̄</span>
              <span className="stat-value">{latestMean.toFixed(4)}</span>
            </div>
          )}
        </div>

        {/* Panel 3: Distribution of means */}
        <div className="panel flex flex-col gap-2">
          <div className="panel-title">パネル 3 — 標本平均の分布（{means.length} 回）</div>
          <Histogram
            data={means}
            height={180}
            domain={meansDomain}
            binCount={40}
            overlayNormal={showCurve && means.length > 10}
            normalMean={dist.mean}
            normalStd={se}
            meanLine={means.length > 0 ? empiricalMean : null}
            latestValue={latestMean}
            xLabel="x̄"
          />
          <div className="flex flex-col gap-0.5 mt-1">
            <div className="stat-row">
              <span className="stat-label">実測平均</span>
              <span className="stat-value">{means.length > 0 ? empiricalMean.toFixed(4) : "—"}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">理論平均 μ</span>
              <span className="stat-value">{dist.mean.toFixed(4)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">実測標準偏差</span>
              <span className="stat-value">{means.length > 1 ? empiricalStd.toFixed(4) : "—"}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">理論 SE = σ/√n</span>
              <span className="stat-value">{se.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insight section */}
      <div className="panel flex flex-col gap-4">
        <div className="panel-title">中心極限定理 — ポイント</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>分布の形に依らない</div>
            <div style={{ color: "var(--text-secondary)" }}>
              母集団がどんな形（二峰性・指数・一様）でも、<em>n</em> を大きくすれば標本平均の分布は正規分布に近づく。
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>中心は動かない</div>
            <div style={{ color: "var(--text-secondary)" }}>
              標本平均の分布の中心は常に母平均 μ に一致する（不偏性）。
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
              <KaTeX math={`SE = \\dfrac{\\sigma}{\\sqrt{n}}`} />
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              ばらつきは <KaTeX math={`\\sigma/\\sqrt{n}`} /> で縮む。
              <em>n</em> を4倍にすると幅は半分になる。
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>n=1 のとき</div>
            <div style={{ color: "var(--text-secondary)" }}>
              <em>n</em>=1 では標本平均の分布 ≈ 母集団分布になる。
              スライダーを 1 に戻して確認しよう。
            </div>
          </div>
        </div>
        <div className="text-xs p-3 rounded-lg" style={{ background: "var(--accent-light)", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--accent)" }}>大数の法則との違い：</strong>
          大数の法則は「標本平均が母平均に収束する」という値の話。中心極限定理は「標本平均の<em>分布の形</em>が正規分布に近づく」という形の話。別の定理です。
        </div>
      </div>
    </div>
  );
}
