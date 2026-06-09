"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getDistribution, type DistributionId } from "@/lib/distributions";

const LLNChart        = dynamic(() => import("@/components/LLNChart"),        { ssr: false });
const CLTSamplingChart = dynamic(() => import("@/components/CLTSamplingChart"), { ssr: false });

const NUM_TRAJ = 20;
const NUM_HIST = 500;
const MAX_N    = 500;

const DIST_OPTIONS: { id: DistributionId; label: string }[] = [
  { id: "bimodal",     label: "二峰性分布（非正規）" },
  { id: "exponential", label: "指数分布（右裾）" },
  { id: "uniform",     label: "一様分布" },
  { id: "normal",      label: "正規分布" },
];

function fmt(v: number, d = 3) { return v.toFixed(d); }

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

export default function LLNPage() {
  const [distId, setDistId]   = useState<DistributionId>("bimodal");
  const [n, setN]             = useState(5);
  const [seed, setSeed]       = useState(0);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const dist = useMemo(() => getDistribution(distId), [distId]);

  // Precompute cumulative sums once per distribution/seed
  const { trajCumSums, histCumSums } = useMemo(() => {
    const traj = Array.from({ length: NUM_TRAJ }, () =>
      Array.from({ length: MAX_N }, () => dist.sample())
    );
    const hist = Array.from({ length: NUM_HIST }, () =>
      Array.from({ length: MAX_N }, () => dist.sample())
    );
    const toCS = (rows: number[][]) => rows.map(row => {
      const cs = new Array<number>(MAX_N);
      let s = 0;
      for (let i = 0; i < MAX_N; i++) { s += row[i]; cs[i] = s; }
      return cs;
    });
    return { trajCumSums: toCS(traj), histCumSums: toCS(hist) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dist, seed]);

  // Derive running-mean trajectories for current n
  const trajectories = useMemo(
    () => trajCumSums.map(cs => Array.from({ length: n }, (_, i) => cs[i] / (i + 1))),
    [trajCumSums, n]
  );

  // Derive sample means at current n for CLT histogram
  const histMeans = useMemo(
    () => histCumSums.map(cs => cs[n - 1] / n),
    [histCumSums, n]
  );

  // Animation: slowly increase n
  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setN(prev => {
          if (prev >= MAX_N) { setPlaying(false); return MAX_N; }
          const step = prev < 30 ? 1 : prev < 100 ? 2 : prev < 250 ? 5 : 10;
          return Math.min(MAX_N, prev + step);
        });
      }, 70);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [playing]);

  const handlePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (n >= MAX_N) setN(1);
    setPlaying(true);
  };

  const se = dist.std / Math.sqrt(n);
  const empiricalSE = stdDev(histMeans);
  const lastMean = trajectories[0]?.[n - 1] ?? dist.mean;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>← トップへ</Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="panel-title mb-1">Law of Large Numbers vs Central Limit Theorem</div>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
          大数の法則と中心極限定理
        </h1>
        <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
          この 2 つはよく混同される。LLN は「標本平均の<strong>値</strong>が μ に収束する」話。
          CLT は「標本平均の<strong>分布の形</strong>が正規分布になる」話。n を動かして両方を並べて確認する。
        </p>
      </div>

      {/* Controls */}
      <div className="panel mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>母集団の分布</label>
          <select
            className="text-sm px-3 py-1.5 rounded-lg border"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text-primary)",
            }}
            value={distId}
            onChange={e => { setDistId(e.target.value as DistributionId); setPlaying(false); setN(5); }}
          >
            {DIST_OPTIONS.map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-48">
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs" style={{ color: "var(--text-secondary)" }}>標本サイズ n</label>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: "var(--accent)" }}
            >
              {n}
            </span>
          </div>
          <input
            type="range" min={1} max={MAX_N} step={1} value={n}
            onChange={e => { setN(+e.target.value); setPlaying(false); }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: "var(--accent)" }}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handlePlay}
        >
          {playing ? "■ 停止" : "▶ アニメーション"}
        </button>

        <button
          className="btn btn-ghost"
          onClick={() => { setSeed(s => s + 1); setN(5); setPlaying(false); }}
        >
          再生成
        </button>
      </div>

      {/* Two-panel comparison */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">

        {/* LLN panel */}
        <div className="panel flex flex-col gap-3">
          <div>
            <div className="panel-title">大数の法則 (LLN)</div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              標本平均の軌跡
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              青線が 1 本のトラジェクトリ。灰線が他 {NUM_TRAJ - 1} 本。
              水色の帯は理論 SE（± σ/√n）で、n が増えるほど収束する。
            </p>
          </div>

          <div className="overflow-hidden rounded-lg" style={{ background: "var(--bg)" }}>
            <LLNChart
              trajectories={trajectories}
              mu={dist.mean}
              sigma={dist.std}
              n={n}
              height={260}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "真の平均 μ",  value: fmt(dist.mean, 3) },
              { label: "σ/√n（SE）",  value: fmt(se, 4) },
              { label: `X̄ (n=${n})`, value: fmt(lastMean, 3) },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
                <div className="font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{value}</div>
              </div>
            ))}
          </div>

          <div
            className="text-xs p-2.5 rounded-lg leading-relaxed"
            style={{ background: "#eff6ff", color: "#1e40af" }}
          >
            n を増やすと全トラジェクトリが μ に集まっていく。これが
            <strong>「確率収束」</strong> — X̄<sub>n</sub> が 1 点に収束する話。
          </div>
        </div>

        {/* CLT panel */}
        <div className="panel flex flex-col gap-3">
          <div>
            <div className="panel-title">中心極限定理 (CLT)</div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              X̄ の標本分布（{NUM_HIST} 回反復）
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {NUM_HIST} 組の標本を各 n 個ずつ引いた標本平均のヒストグラム。
              緑曲線が理論正規分布 N(μ, σ²/n)。
            </p>
          </div>

          <div className="overflow-hidden rounded-lg" style={{ background: "var(--bg)" }}>
            <CLTSamplingChart
              means={histMeans}
              mu={dist.mean}
              sigma={dist.std}
              n={n}
              height={260}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "理論 SE",   value: fmt(se, 4) },
              { label: "実測 SE",   value: fmt(empiricalSE, 4) },
              { label: "誤差",      value: fmt(Math.abs(se - empiricalSE), 4) },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
                <div className="font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{value}</div>
              </div>
            ))}
          </div>

          <div
            className="text-xs p-2.5 rounded-lg leading-relaxed"
            style={{ background: "#f0fdf4", color: "#166534" }}
          >
            n が大きくなるほどヒストグラムが緑の正規曲線に近づく。これが
            <strong>「分布収束」</strong> — X̄<sub>n</sub> の形が決まってくる話。
          </div>
        </div>
      </div>

      {/* Insight table */}
      <div className="panel" style={{ borderLeft: "4px solid var(--accent)" }}>
        <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          LLN と CLT — 何が同じで何が違うか
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th className="text-left py-2 pr-4 font-semibold text-xs" style={{ color: "var(--text-secondary)" }}></th>
                <th className="text-left py-2 pr-4 font-semibold" style={{ color: "#2563eb" }}>大数の法則 (LLN)</th>
                <th className="text-left py-2 font-semibold"       style={{ color: "#16a34a" }}>中心極限定理 (CLT)</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  row: "何の話？",
                  lln: "X̄ の値の収束（1点へ）",
                  clt: "X̄ の分布の形（正規分布へ）",
                },
                {
                  row: "n → ∞ のとき",
                  lln: "X̄ → μ（確率収束）",
                  clt: "X̄ ～ N(μ, σ²/n) に近づく",
                },
                {
                  row: "左図との対応",
                  lln: "軌跡が1本の線 μ に集まる",
                  clt: "右図のヒストグラムが正規曲線に",
                },
                {
                  row: "統計での役割",
                  lln: "推定量の一致性（μ を推定できる根拠）",
                  clt: "信頼区間・仮説検定の理論基盤",
                },
                {
                  row: "共通の鍵",
                  lln: "σ/√n が幅を決める（n が増えると縮む）",
                  clt: "σ/√n が分布の幅を決める（同じ量！）",
                },
              ].map(({ row, lln, clt }, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2.5 pr-4 text-xs font-semibold whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {row}
                  </td>
                  <td className="py-2.5 pr-4 text-xs" style={{ color: "var(--text-primary)" }}>{lln}</td>
                  <td className="py-2.5 text-xs"       style={{ color: "var(--text-primary)" }}>{clt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="mt-4 text-xs p-3 rounded-lg leading-relaxed"
          style={{ background: "var(--accent-light)", color: "var(--accent)" }}
        >
          <strong>重要：</strong>
          LLN と CLT は別の主張。
          「n が大きければ X̄ は μ に等しい」は LLN（値の話）。
          「X̄ がどのくらいばらつくか、その分布はどんな形か」は CLT（分布の話）。
          両者を使えば「X̄ は μ 付近に正規分布で広がる」という信頼区間の直感が得られる。
        </div>
      </div>
    </div>
  );
}
