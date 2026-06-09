"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { binomialData, poissonData, normalData } from "@/lib/prob";

const DistChart = dynamic(() => import("@/components/DistChart"), { ssr: false });

type Tab = "gallery" | "convergence";

// ── Colors ────────────────────────────────────────────────────────────────────
const C_BINOM  = "#2563eb";
const C_POIS   = "#dc2626";
const C_NORM   = "#16a34a";

// ── Slider helper ─────────────────────────────────────────────────────────────
function Slider({
  label, sub, value, min, max, step, onChange, display,
}: {
  label: string; sub?: string; value: number;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
  display?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {label}{sub && <span className="text-[10px] opacity-70"> {sub}</span>}
        </span>
        <span className="font-mono text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          {display ?? value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded appearance-none cursor-pointer"
        style={{ accentColor: "var(--accent)" }}
      />
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value font-mono text-xs">{value}</span>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      className="px-5 py-2 text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--accent)" : "var(--surface)",
        color: active ? "#fff" : "var(--text-secondary)",
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DistributionsPage() {
  const [tab, setTab] = useState<Tab>("gallery");

  // Gallery state
  const [binN, setBinN] = useState(20);
  const [binP, setBinP] = useState(0.4);
  const [poisL, setPoisL] = useState(5.0);
  const [normMu, setNormMu] = useState(0.0);
  const [normSig, setNormSig] = useState(1.0);

  // Convergence state
  const [convLambda, setConvLambda] = useState(5.0);
  const [convN_BP, setConvN_BP] = useState(30);   // Binom→Poisson n
  const [convN_BN, setConvN_BN] = useState(30);   // Binom→Normal  n
  const [convP_BN, setConvP_BN] = useState(0.5);  // Binom→Normal  p

  // Gallery data
  const galBinom  = useMemo(() => binomialData(binN, binP), [binN, binP]);
  const galPois   = useMemo(() => poissonData(poisL), [poisL]);
  const galNorm   = useMemo(() => normalData(normMu, normSig), [normMu, normSig]);

  // Convergence data
  const convP_val = convLambda / convN_BP;   // p = λ/n for Binom→Poisson
  const convBP_binom = useMemo(
    () => binomialData(convN_BP, Math.min(0.999, convLambda / convN_BP)),
    [convN_BP, convLambda]
  );
  const convBP_pois  = useMemo(() => poissonData(convLambda), [convLambda]);

  const convBN_binom = useMemo(() => binomialData(convN_BN, convP_BN), [convN_BN, convP_BN]);
  const convBN_mu    = convN_BN * convP_BN;
  const convBN_sig   = Math.sqrt(convN_BN * convP_BN * (1 - convP_BN));
  const convBN_norm  = useMemo(
    () => normalData(convBN_mu, convBN_sig),
    [convBN_mu, convBN_sig]
  );

  const f2 = (n: number) => n.toFixed(2);
  const f4 = (n: number) => n.toFixed(4);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>← トップへ</Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="panel-title mb-1">Probability Distributions</div>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
          確率分布ギャラリー
        </h1>
        <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
          二項・ポアソン・正規分布のパラメータをスライダーで操作して形状変化を観察。
          収束デモでは「n大・p小で二項→ポアソン」「n大で二項→正規」を重ねて確認できる。
        </p>
      </div>

      {/* Tabs */}
      <div
        className="inline-flex rounded-lg mb-6 overflow-hidden border"
        style={{ borderColor: "var(--border)" }}
      >
        <TabBtn active={tab === "gallery"} onClick={() => setTab("gallery")}>分布ギャラリー</TabBtn>
        <TabBtn active={tab === "convergence"} onClick={() => setTab("convergence")}>収束デモ</TabBtn>
      </div>

      {/* ── GALLERY TAB ───────────────────────────────────────────────────────── */}
      {tab === "gallery" && (
        <div className="grid md:grid-cols-3 gap-4">

          {/* Binomial */}
          <div className="panel flex flex-col gap-3">
            <div>
              <div className="panel-title">二項分布</div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                B(n, p)
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                n 回試行で成功が k 回起こる確率
              </p>
            </div>

            <DistChart
              bars={[{ data: galBinom, color: C_BINOM }]}
              height={170}
            />

            <div className="flex flex-col gap-2.5">
              <Slider label="n" sub="（試行回数）" value={binN} min={1} max={100} step={1}
                onChange={setBinN} />
              <Slider label="p" sub="（成功確率）" value={binP} min={0.01} max={0.99} step={0.01}
                onChange={setBinP} display={f2(binP)} />
            </div>

            <div className="flex flex-col gap-0.5 text-xs" style={{ borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
              <StatRow label="平均 E[X]"  value={f4(binN * binP)} />
              <StatRow label="分散 V[X]"  value={f4(binN * binP * (1 - binP))} />
              <StatRow label="標準偏差 σ" value={f4(Math.sqrt(binN * binP * (1 - binP)))} />
            </div>

            <div className="text-xs p-2 rounded leading-relaxed"
              style={{ background: "#dbeafe", color: "#1e40af" }}>
              p=0.5 のとき左右対称。p が小さいほど右に歪む（右裾が長い）。
              n が大きくなると正規分布に近づく。
            </div>
          </div>

          {/* Poisson */}
          <div className="panel flex flex-col gap-3">
            <div>
              <div className="panel-title">ポアソン分布</div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                Po(λ)
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                単位時間・単位面積に平均 λ 回起こる稀な事象
              </p>
            </div>

            <DistChart
              bars={[{ data: galPois, color: C_POIS }]}
              height={170}
            />

            <div className="flex flex-col gap-2.5">
              <Slider label="λ" sub="（平均発生率）" value={poisL} min={0.5} max={30} step={0.5}
                onChange={setPoisL} display={f2(poisL)} />
            </div>

            <div className="flex flex-col gap-0.5 text-xs" style={{ borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
              <StatRow label="平均 E[X]"  value={f4(poisL)} />
              <StatRow label="分散 V[X]"  value={f4(poisL)} />
              <StatRow label="標準偏差 σ" value={f4(Math.sqrt(poisL))} />
            </div>

            <div className="text-xs p-2 rounded leading-relaxed"
              style={{ background: "#fee2e2", color: "#991b1b" }}>
              平均 = 分散 = λ が特徴。λ が大きくなると正規分布に近づく。
              交通事故・放射線崩壊・コールセンター着信などのモデルに使う。
            </div>
          </div>

          {/* Normal */}
          <div className="panel flex flex-col gap-3">
            <div>
              <div className="panel-title">正規分布</div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                N(μ, σ²)
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                連続型確率変数。左右対称の釣鐘型
              </p>
            </div>

            <DistChart
              curves={[{ data: galNorm, color: C_NORM }]}
              height={170}
            />

            <div className="flex flex-col gap-2.5">
              <Slider label="μ" sub="（平均）" value={normMu} min={-4} max={4} step={0.1}
                onChange={setNormMu} display={f2(normMu)} />
              <Slider label="σ" sub="（標準偏差）" value={normSig} min={0.2} max={4} step={0.1}
                onChange={setNormSig} display={f2(normSig)} />
            </div>

            <div className="flex flex-col gap-0.5 text-xs" style={{ borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
              <StatRow label="平均 E[X]"  value={f4(normMu)} />
              <StatRow label="分散 V[X]"  value={f4(normSig ** 2)} />
              <StatRow label="標準偏差 σ" value={f4(normSig)} />
            </div>

            <div className="text-xs p-2 rounded leading-relaxed"
              style={{ background: "#dcfce7", color: "#166534" }}>
              μ は分布の中心、σ は裾の広がり。μ±σ に約68%、μ±2σ に約95% が入る。
            </div>
          </div>

        </div>
      )}

      {/* ── CONVERGENCE TAB ──────────────────────────────────────────────────── */}
      {tab === "convergence" && (
        <div className="flex flex-col gap-8">

          {/* ── Binomial → Poisson ───────────────────────────── */}
          <div className="panel">
            <div className="mb-4">
              <div className="panel-title">収束デモ ①</div>
              <h2 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                二項分布 → ポアソン分布
              </h2>
              <p className="text-xs max-w-2xl" style={{ color: "var(--text-secondary)" }}>
                n を大きく、p を小さく保ちつつ <strong>λ = np を一定</strong> にすると、
                B(n, p) の形がポアソン Po(λ) に近づく。
                稀な事象を多数の試行で観察するモデルの極限。
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <DistChart
                  bars={[
                    { data: convBP_binom, color: C_BINOM, label: `B(${convN_BP}, ${convP_val.toFixed(4)})`, opacity: 0.70 },
                    { data: convBP_pois,  color: C_POIS,  label: `Po(${f2(convLambda)})`,                   opacity: 0.70 },
                  ]}
                  height={240}
                />
              </div>

              <div className="flex flex-col gap-4 justify-center">
                <Slider label="λ = np" sub="（固定）" value={convLambda}
                  min={1} max={15} step={0.5} onChange={setConvLambda} display={f2(convLambda)} />
                <Slider label="n" sub="（大きくすると収束）" value={convN_BP}
                  min={Math.ceil(convLambda * 2)} max={300} step={1} onChange={setConvN_BP} />

                <div className="text-xs p-2.5 rounded leading-relaxed"
                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                  <div className="font-mono font-bold">p = λ/n = {convP_val.toFixed(4)}</div>
                  <div className="mt-0.5">n={convN_BP} のとき p が自動計算される</div>
                </div>

                <div className="flex flex-col gap-0.5 text-xs">
                  <div className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>両分布の平均</div>
                  <StatRow label="B(n,p) の平均" value={f4(convN_BP * convP_val)} />
                  <StatRow label="Po(λ) の平均"  value={f4(convLambda)} />
                </div>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
              {[
                { q: "なぜ収束する？", a: "B(n,p) の PMF を n→∞, p→0 (np=λ固定) で展開すると、e⁻λλᵏ/k! に収束することが証明できる。" },
                { q: "いつ使える近似？", a: "目安: n≥20 かつ p≤0.05。p が小さいほどよい近似。" },
                { q: "実例", a: "1時間に来る客の数（平均5人）を B(3600, 5/3600) で考える代わりに Po(5) を使う。" },
              ].map((item, i) => (
                <div key={i} className="p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                  <div className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Q: {item.q}</div>
                  <div style={{ color: "var(--text-secondary)" }}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Binomial → Normal ────────────────────────────── */}
          <div className="panel">
            <div className="mb-4">
              <div className="panel-title">収束デモ ②</div>
              <h2 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                二項分布 → 正規分布
              </h2>
              <p className="text-xs max-w-2xl" style={{ color: "var(--text-secondary)" }}>
                n を大きくすると B(n, p) が正規分布 N(np, np(1−p)) に近づく（中心極限定理の特殊ケース）。
                棒グラフが緑の曲線にフィットしていく様子を確認できる。
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <DistChart
                  bars={[{ data: convBN_binom, color: C_BINOM, label: `B(${convN_BN}, ${f2(convP_BN)})`, opacity: 0.72 }]}
                  curves={[{ data: convBN_norm, color: C_NORM, label: `N(${f2(convBN_mu)}, ${f2(convBN_sig)}²)`, opacity: 0.85 }]}
                  height={240}
                />
              </div>

              <div className="flex flex-col gap-4 justify-center">
                <Slider label="n" sub="（大きくすると収束）" value={convN_BN}
                  min={5} max={200} step={1} onChange={setConvN_BN} />
                <Slider label="p" value={convP_BN}
                  min={0.1} max={0.9} step={0.05} onChange={setConvP_BN} display={f2(convP_BN)} />

                <div className="flex flex-col gap-0.5 text-xs">
                  <div className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>正規近似のパラメータ</div>
                  <StatRow label="μ = np"       value={f4(convBN_mu)} />
                  <StatRow label="σ = √np(1−p)" value={f4(convBN_sig)} />
                  <StatRow label="σ²"            value={f4(convBN_sig ** 2)} />
                </div>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
              {[
                { q: "なぜ収束する？", a: "中心極限定理。独立な確率変数の和は、分布の形によらず正規分布に近づく。" },
                { q: "いつ使える近似？", a: "目安: np≥5 かつ n(1−p)≥5。p=0.5 なら n=20 程度でも良い近似。" },
                { q: "連続修正", a: "P(X≤k) ≈ Φ((k+0.5−np)/σ) とすると精度が上がる。「連続修正」と呼ぶ。" },
              ].map((item, i) => (
                <div key={i} className="p-2.5 rounded-lg" style={{ background: "var(--bg)" }}>
                  <div className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Q: {item.q}</div>
                  <div style={{ color: "var(--text-secondary)" }}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary insight */}
          <div className="panel" style={{ borderLeft: "4px solid #9333ea" }}>
            <h3 className="font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              3 つの分布の関係まとめ
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-3 text-sm">
              <div className="px-4 py-2 rounded-lg font-semibold text-white text-center"
                style={{ background: C_BINOM, minWidth: "120px" }}>
                二項分布<br /><span className="font-mono font-normal text-xs">B(n, p)</span>
              </div>
              <div className="flex flex-col gap-1 text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                <span>n→大, p→小, np=λ固定 →</span>
                <span>← 特殊ケース (n=1)</span>
              </div>
              <div className="px-4 py-2 rounded-lg font-semibold text-white text-center"
                style={{ background: C_POIS, minWidth: "120px" }}>
                ポアソン分布<br /><span className="font-mono font-normal text-xs">Po(λ)</span>
              </div>
              <div className="flex flex-col gap-1 text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                <span>λ→大 →</span>
              </div>
              <div className="px-4 py-2 rounded-lg font-semibold text-white text-center"
                style={{ background: C_NORM, minWidth: "120px" }}>
                正規分布<br /><span className="font-mono font-normal text-xs">N(λ, λ)</span>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
              二項分布は「n 大・p 小」でポアソンへ、「n 大・任意 p」で正規へと収束する。
              ポアソン分布も λ が大きくなると正規分布 N(λ, λ) に近づく（CLT の適用）。
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
