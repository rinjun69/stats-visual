import Link from "next/link";

const topics = [
  {
    id: "clt",
    title: "中心極限定理",
    subtitle: "Central Limit Theorem",
    description: "母集団がどんな分布でも、標本平均は正規分布に近づく。その理由を動かして確認する。",
    tags: ["標本分布", "正規分布", "標準誤差"],
    href: "/topics/clt",
    ready: true,
  },
  {
    id: "ci",
    title: "信頼区間",
    subtitle: "Confidence Interval",
    description: "95%信頼区間とは何か。繰り返し標本抽出で体感する。",
    tags: ["推定", "信頼水準"],
    href: "/topics/ci",
    ready: true,
  },
  {
    id: "ht",
    title: "仮説検定",
    subtitle: "Hypothesis Testing",
    description: "p値・有意水準・第一種過誤を視覚的に理解する。",
    tags: ["p値", "有意水準", "検出力"],
    href: "/topics/ht",
    ready: true,
  },
  {
    id: "anscombe",
    title: "相関と可視化",
    subtitle: "Anscombe's Quartet",
    description: "まったく同じ相関係数 r でも散布図はぜんぜん違う。要約統計量だけ見ると騙される体験。",
    tags: ["相関係数", "散布図", "外れ値"],
    href: "/topics/anscombe",
    ready: true,
  },
  {
    id: "ols",
    title: "最小二乗法",
    subtitle: "Ordinary Least Squares",
    description: "点をドラッグして回帰直線の変化を体感。自分で直線を引いて残差二乗和を最小化に挑戦。",
    tags: ["回帰分析", "残差", "最小二乗"],
    href: "/topics/ols",
    ready: true,
  },
  {
    id: "distributions",
    title: "確率分布ギャラリー",
    subtitle: "Probability Distributions",
    description: "二項・ポアソン・正規をスライダーで形状変化。「n大・p小で二項→ポアソン」「n大で二項→正規」の収束を重ねて一望。",
    tags: ["二項分布", "ポアソン分布", "正規分布", "収束"],
    href: "/topics/distributions",
    ready: true,
  },
  {
    id: "lln",
    title: "大数の法則 vs 中心極限定理",
    subtitle: "LLN vs CLT",
    description: "混同されやすい 2 つの定理を対比。LLN は標本平均が 1 点 μ に収束する話、CLT はその分布の形が正規分布になる話。",
    tags: ["大数の法則", "中心極限定理", "標本平均", "収束"],
    href: "/topics/lln",
    ready: true,
  },
  {
    id: "bayes",
    title: "ベイズの定理：検査の罠",
    subtitle: "Bayes' Theorem — Medical Testing",
    description: "有病率・感度・特異度のスライダーで陽性的中率を直感破壊。「感度 95% の検査が陽性でも、実は…」を面積図と 1000 人グリッドで体感。",
    tags: ["ベイズの定理", "陽性的中率", "感度・特異度", "検査"],
    href: "/topics/bayes",
    ready: true,
  },
];

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
          統計を、動かして学ぶ
        </h1>
        <p className="text-base" style={{ color: "var(--text-secondary)" }}>
          統計検定2級レベルの概念をインタラクティブなグラフで直感的に理解する。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => (
          <div key={t.id} className="panel flex flex-col gap-3 relative">
            {!t.ready && (
              <span
                className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "var(--border)", color: "var(--text-secondary)" }}
              >
                近日公開
              </span>
            )}
            <div>
              <div className="panel-title">{t.subtitle}</div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {t.title}
              </h2>
            </div>
            <p className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>
              {t.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {t.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
            {t.ready ? (
              <Link href={t.href} className="btn btn-primary mt-1 self-start">
                学習を始める →
              </Link>
            ) : (
              <button className="btn btn-ghost mt-1 self-start" disabled>
                準備中
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
