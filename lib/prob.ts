// Probability mass/density functions for the distribution gallery

const MAX_FACT = 300;
const _logFact = new Array(MAX_FACT + 1).fill(0) as number[];
for (let i = 1; i <= MAX_FACT; i++) _logFact[i] = _logFact[i - 1] + Math.log(i);

// ── PMF / PDF ────────────────────────────────────────────────────────────────

export function binomialPMF(k: number, n: number, p: number): number {
  if (k < 0 || k > n || n > MAX_FACT) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(
    _logFact[n] - _logFact[k] - _logFact[n - k] +
    k * Math.log(p) + (n - k) * Math.log(1 - p)
  );
}

export function poissonPMF(k: number, lambda: number): number {
  if (k < 0 || k > MAX_FACT) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(k * Math.log(lambda) - lambda - _logFact[k]);
}

export function normalPDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0;
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

// ── Point arrays ─────────────────────────────────────────────────────────────

// Binomial — clip to ±4.5σ around mean so large-n charts stay readable
export function binomialData(n: number, p: number): { x: number; y: number }[] {
  const mu  = n * p;
  const sig = Math.max(1, Math.sqrt(n * p * (1 - p)));
  const lo  = Math.max(0, Math.floor(mu - 4.5 * sig));
  const hi  = Math.min(n, Math.ceil(mu + 4.5 * sig));
  return Array.from({ length: hi - lo + 1 }, (_, i) => ({
    x: lo + i,
    y: binomialPMF(lo + i, n, p),
  }));
}

// Poisson — show until cumulative probability saturates
export function poissonData(lambda: number): { x: number; y: number }[] {
  const kMax = Math.min(MAX_FACT, Math.ceil(lambda + 5 * Math.sqrt(Math.max(lambda, 1)) + 5));
  return Array.from({ length: kMax + 1 }, (_, k) => ({ x: k, y: poissonPMF(k, lambda) }));
}

// Normal — ±4.2σ, 250 points
export function normalData(mu: number, sigma: number, nPts = 250): { x: number; y: number }[] {
  const lo = mu - 4.2 * sigma;
  const hi = mu + 4.2 * sigma;
  return Array.from({ length: nPts }, (_, i) => {
    const x = lo + (hi - lo) * i / (nPts - 1);
    return { x, y: normalPDF(x, mu, sigma) };
  });
}
