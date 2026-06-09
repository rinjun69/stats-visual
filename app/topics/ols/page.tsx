"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { computeOLS, computeRSS } from "@/lib/ols";
import type { DataPoint } from "@/components/OLSChart";

const OLSChart = dynamic(() => import("@/components/OLSChart"), { ssr: false });

type Mode = "explore" | "challenge";

// 10 points with clear linear trend + realistic scatter
const INITIAL_POINTS: DataPoint[] = [
  { id:  1, x:  1.0, y: 2.5 },
  { id:  2, x:  2.0, y: 2.9 },
  { id:  3, x:  3.0, y: 4.8 },
  { id:  4, x:  4.0, y: 3.9 },
  { id:  5, x:  5.0, y: 6.1 },
  { id:  6, x:  6.0, y: 5.5 },
  { id:  7, x:  7.0, y: 7.8 },
  { id:  8, x:  8.0, y: 7.2 },
  { id:  9, x:  9.0, y: 9.5 },
  { id: 10, x: 10.0, y: 8.8 },
];

let nextId = 11;

function fmt(n: number, d = 3) { return n.toFixed(d); }

export default function OLSPage() {
  const [points, setPoints]         = useState<DataPoint[]>(INITIAL_POINTS);
  const [mode, setMode]             = useState<Mode>("explore");
  const [userSlope, setUserSlope]   = useState(1.5);
  const [userIntercept, setUserInt] = useState(0.0);
  const [revealed, setRevealed]     = useState(false);

  const ols = useMemo(() => computeOLS(points), [points]);
  const userRSS = useMemo(
    () => computeRSS(points, userSlope, userIntercept),
    [points, userSlope, userIntercept]
  );

  const handlePointMove = useCallback((id: number, x: number, y: number) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  }, []);

  const handlePointRemove = useCallback((id: number) => {
    setPoints(prev => prev.length > 3 ? prev.filter(p => p.id !== id) : prev);
  }, []);

  const handleAddPoint = useCallback(() => {
    const x = 1 + Math.random() * 9;
    const y = Math.max(0.2, Math.min(11.5, 0.8 * x + 1.5 + (Math.random() - 0.5) * 3));
    setPoints(prev => [...prev, { id: nextId++, x, y }]);
  }, []);

  const handleReset = useCallback(() => {
    setPoints(INITIAL_POINTS);
    setRevealed(false);
  }, []);

  const handleEnterChallenge = useCallback(() => {
    // start with a slope/intercept clearly off from current OLS
    setUserSlope(+(ols.slope + 0.55).toFixed(2));
    setUserInt(+(ols.intercept - 2.0).toFixed(2));
    setRevealed(false);
    setMode("challenge");
  }, [ols.slope, ols.intercept]);

  const handleEnterExplore = useCallback(() => {
    setMode("explore");
    setRevealed(false);
  }, []);

  const isExplore    = mode === "explore";
  const isChallenge  = mode === "challenge";
  const delta        = userRSS - ols.rss;
  const deltaPct     = ols.rss > 0 ? (delta / ols.rss) * 100 : 0;

  // OLS equation string
  const eqStr = ols.intercept >= 0
    ? `ŷ = ${fmt(ols.slope)}x + ${fmt(ols.intercept)}`
    : `ŷ = ${fmt(ols.slope)}x − ${fmt(Math.abs(ols.intercept))}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>← トップへ</Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="panel-title mb-1">Ordinary Least Squares</div>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
          最小二乗法
        </h1>
        <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
          点をドラッグして回帰直線と残差を体感する。挑戦モードでは自分で直線を引き、
          残差二乗和（RSS）を最小化に挑戦してから OLS の答えと比べる。
        </p>
      </div>

      {/* Mode tabs */}
      <div
        className="inline-flex rounded-lg mb-6 overflow-hidden border"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          className="px-5 py-2 text-sm font-medium transition-colors"
          style={{
            background: isExplore ? "var(--accent)" : "var(--surface)",
            color: isExplore ? "#fff" : "var(--text-secondary)",
          }}
          onClick={handleEnterExplore}
        >
          体験モード
        </button>
        <button
          className="px-5 py-2 text-sm font-medium transition-colors"
          style={{
            background: isChallenge ? "var(--accent)" : "var(--surface)",
            color: isChallenge ? "#fff" : "var(--text-secondary)",
          }}
          onClick={handleEnterChallenge}
        >
          挑戦モード
        </button>
      </div>

      {/* Main grid: chart + panel */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">

        {/* Chart - 2/3 */}
        <div className="lg:col-span-2 panel p-0 overflow-hidden">
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {isExplore ? "点をドラッグして動かせます" : "ダブルクリックで点を削除"}
            </span>
            {isExplore && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#dbeafe", color: "#1e40af" }}>
                青線 = OLS &nbsp;|&nbsp; 赤縦線 = 残差
              </span>
            )}
            {isChallenge && !revealed && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#92400e" }}>
                橙破線 = あなたの直線
              </span>
            )}
            {isChallenge && revealed && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#dbeafe", color: "#1e40af" }}>
                青線 = OLS &nbsp;|&nbsp; 橙破線 = あなた
              </span>
            )}
          </div>
          <OLSChart
            points={points}
            olsSlope={ols.slope}
            olsIntercept={ols.intercept}
            userSlope={isChallenge ? userSlope : undefined}
            userIntercept={isChallenge ? userIntercept : undefined}
            showOLS={isExplore || revealed}
            showResiduals={true}
            onPointMove={handlePointMove}
            onPointRemove={handlePointRemove}
            height={340}
          />
        </div>

        {/* Right panel - 1/3 */}
        <div className="lg:col-span-1 flex flex-col gap-3">

          {/* Explore mode: OLS stats */}
          {isExplore && (
            <div className="panel flex flex-col gap-3">
              <div>
                <div className="panel-title">最小二乗推定量</div>
                <div className="font-mono text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                  {eqStr}
                </div>
              </div>
              <div className="stat-row">
                <span className="stat-label">決定係数 R²</span>
                <span className="stat-value font-mono">{fmt(ols.r2, 4)}</span>
              </div>
              <div>
                <div className="stat-label text-xs mb-1">残差二乗和 RSS</div>
                <div className="text-4xl font-bold font-mono tabular-nums" style={{ color: "#dc2626" }}>
                  {fmt(ols.rss, 2)}
                </div>
              </div>
              <div
                className="text-xs p-2.5 rounded-lg leading-relaxed"
                style={{ background: "#fff0f0", color: "#991b1b" }}
              >
                赤い縦線が<strong>残差</strong>（実測値 − 予測値）。
                それぞれを 2 乗して合計したのが RSS。
                OLS は RSS を最小にする唯一の直線。
              </div>
            </div>
          )}

          {/* Challenge mode: sliders + RSS */}
          {isChallenge && (
            <>
              <div className="panel flex flex-col gap-4">
                <div className="panel-title">あなたの直線パラメータ</div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      傾き β
                    </label>
                    <span className="font-mono text-sm font-semibold" style={{ color: "#d97706" }}>
                      {fmt(userSlope, 2)}
                    </span>
                  </div>
                  <input
                    type="range" min="-2" max="4" step="0.05"
                    value={userSlope}
                    onChange={e => setUserSlope(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: "#d97706" }}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      切片 α
                    </label>
                    <span className="font-mono text-sm font-semibold" style={{ color: "#d97706" }}>
                      {fmt(userIntercept, 2)}
                    </span>
                  </div>
                  <input
                    type="range" min="-5" max="10" step="0.1"
                    value={userIntercept}
                    onChange={e => setUserInt(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: "#d97706" }}
                  />
                </div>

                <div className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                  {userIntercept >= 0
                    ? `ŷ = ${fmt(userSlope, 2)}x + ${fmt(userIntercept, 2)}`
                    : `ŷ = ${fmt(userSlope, 2)}x − ${fmt(Math.abs(userIntercept), 2)}`}
                </div>
              </div>

              {/* RSS comparison */}
              <div className="panel flex flex-col gap-3">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#d97706" }}>
                    あなたの RSS
                  </div>
                  <div className="text-4xl font-bold font-mono tabular-nums" style={{ color: "#d97706" }}>
                    {fmt(userRSS, 2)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>
                    OLS 最小値
                  </div>
                  {revealed ? (
                    <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: "var(--accent)" }}>
                      {fmt(ols.rss, 2)}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold font-mono" style={{ color: "var(--border)" }}>???</div>
                  )}
                </div>

                {revealed && (
                  <div
                    className="text-xs p-2 rounded-lg font-mono"
                    style={{
                      background: delta < 0.01 ? "#dcfce7" : "#fef3c7",
                      color: delta < 0.01 ? "#166534" : "#92400e",
                    }}
                  >
                    Δ = +{fmt(delta, 2)}&nbsp;（OLS より {fmt(deltaPct, 1)}% 大きい）
                  </div>
                )}

                {!revealed ? (
                  <button
                    className="btn btn-primary w-full mt-1"
                    onClick={() => setRevealed(true)}
                  >
                    OLS 最適解を確認する →
                  </button>
                ) : (
                  <div
                    className="text-xs p-2.5 rounded-lg leading-relaxed"
                    style={{ background: "#dbeafe", color: "#1e40af" }}
                  >
                    <strong>OLS: {eqStr}</strong><br />
                    どんな直線を引いても RSS はこの値以上になる。これが「最小」二乗法の意味。
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button className="btn btn-secondary" onClick={handleAddPoint}>
          ＋ 点を追加
        </button>
        <button className="btn btn-ghost" onClick={handleReset}>
          リセット
        </button>
        <span className="text-xs self-center ml-1" style={{ color: "var(--text-secondary)" }}>
          点: {points.length}個　　ダブルクリックで削除（最小3点）
        </span>
      </div>

      {/* Insight panel */}
      <div className="panel" style={{ borderLeft: "4px solid #2563eb" }}>
        <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          最小二乗法のポイント
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: "📐",
              title: "残差を二乗する理由",
              body: "符号が相殺されないようにするため。また二乗なら微分で解析的に最小値を求められる（偏微分 = 0 の連立方程式が解ける）。",
            },
            {
              icon: "📌",
              title: "OLS 解は一意に決まる",
              body: "傾き β = Σ(xi−x̄)(yi−ȳ) / Σ(xi−x̄)²、切片 α = ȳ − β·x̄。データが決まれば解は 1 つに定まる。",
            },
            {
              icon: "🎯",
              title: "残差の性質",
              body: "OLS の残差の和は 0。残差と x は無相関。これらは OLS の正規方程式から導かれる必然的な性質。",
            },
            {
              icon: "⚠",
              title: "OLS の限界",
              body: "外れ値に敏感（アンスコムの例参照）。線形関係を仮定している。誤差が正規・等分散・独立でないと推定量の性質が変わる。",
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
