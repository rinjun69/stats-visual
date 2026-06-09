export interface OLSResult {
  slope: number;
  intercept: number;
  rss: number;
  r2: number;
  predict: (x: number) => number;
}

export function computeOLS(points: { x: number; y: number }[]): OLSResult {
  if (points.length < 2) {
    return { slope: 0, intercept: 0, rss: 0, r2: 0, predict: () => 0 };
  }
  const n = points.length;
  const meanX = points.reduce((a, p) => a + p.x, 0) / n;
  const meanY = points.reduce((a, p) => a + p.y, 0) / n;
  const sxy = points.reduce((a, p) => a + (p.x - meanX) * (p.y - meanY), 0);
  const sxx = points.reduce((a, p) => a + (p.x - meanX) ** 2, 0);
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;
  const predict = (x: number) => slope * x + intercept;
  const rss = points.reduce((a, p) => a + (p.y - predict(p.x)) ** 2, 0);
  const ssTot = points.reduce((a, p) => a + (p.y - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - rss / ssTot);
  return { slope, intercept, rss, r2, predict };
}

export function computeRSS(
  points: { x: number; y: number }[],
  slope: number,
  intercept: number
): number {
  return points.reduce((a, p) => a + (p.y - (slope * p.x + intercept)) ** 2, 0);
}
