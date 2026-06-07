export type DistributionId = "uniform" | "exponential" | "bimodal" | "normal" | "bernoulli";

export interface Distribution {
  id: DistributionId;
  label: string;
  mean: number;
  std: number;
  sample: () => number;
  pdfPoints: () => { x: number; y: number }[];
}

function boxMuller(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function getDistribution(id: DistributionId): Distribution {
  switch (id) {
    case "uniform": {
      const a = 0, b = 1;
      const mean = (a + b) / 2;
      const std = (b - a) / Math.sqrt(12);
      return {
        id, label: "一様分布 U(0,1)",
        mean, std,
        sample: () => Math.random() * (b - a) + a,
        pdfPoints: () => {
          const pts = [];
          for (let x = -0.1; x <= 1.1; x += 0.01) {
            pts.push({ x, y: x >= 0 && x <= 1 ? 1 : 0 });
          }
          return pts;
        },
      };
    }
    case "exponential": {
      const lambda = 1;
      const mean = 1 / lambda;
      const std = 1 / lambda;
      return {
        id, label: "指数分布 Exp(1)",
        mean, std,
        sample: () => -Math.log(1 - Math.random()) / lambda,
        pdfPoints: () => {
          const pts = [];
          for (let x = 0; x <= 6; x += 0.05) {
            pts.push({ x, y: lambda * Math.exp(-lambda * x) });
          }
          return pts;
        },
      };
    }
    case "bimodal": {
      const mu1 = -2, mu2 = 2, sig = 0.8;
      const mean = (mu1 + mu2) / 2;
      const std = Math.sqrt(sig * sig + ((mu1 - mean) ** 2 + (mu2 - mean) ** 2) / 2);
      const normalPdf = (x: number, mu: number, s: number) =>
        Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
      return {
        id, label: "二峰性分布",
        mean, std,
        sample: () => (Math.random() < 0.5 ? mu1 : mu2) + boxMuller() * sig,
        pdfPoints: () => {
          const pts = [];
          for (let x = -5; x <= 5; x += 0.05) {
            pts.push({ x, y: 0.5 * normalPdf(x, mu1, sig) + 0.5 * normalPdf(x, mu2, sig) });
          }
          return pts;
        },
      };
    }
    case "normal": {
      const mu = 0, sig = 1;
      return {
        id, label: "正規分布 N(0,1)",
        mean: mu, std: sig,
        sample: () => boxMuller() * sig + mu,
        pdfPoints: () => {
          const pts = [];
          for (let x = -4; x <= 4; x += 0.05) {
            pts.push({ x, y: Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI) });
          }
          return pts;
        },
      };
    }
    case "bernoulli": {
      const p = 0.3;
      const mean = p;
      const std = Math.sqrt(p * (1 - p));
      return {
        id, label: `ベルヌーイ分布 B(${p})`,
        mean, std,
        sample: () => (Math.random() < p ? 1 : 0),
        pdfPoints: () => [
          { x: 0, y: 1 - p },
          { x: 1, y: p },
        ],
      };
    }
  }
}

export function sampleMean(dist: Distribution, n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += dist.sample();
  return sum / n;
}

export function sampleN(dist: Distribution, n: number): number[] {
  return Array.from({ length: n }, () => dist.sample());
}
