// Normal quantile (Acklam rational approximation, ~6 decimal places)
const _A = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
const _B = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
const _C = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
            -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
const _D = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const pLow = 0.02425, pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return ((((((_C[0]*q+_C[1])*q+_C[2])*q+_C[3])*q+_C[4])*q+_C[5])) /
           ((((_D[0]*q+_D[1])*q+_D[2])*q+_D[3])*q+1);
  }
  if (p <= pHigh) {
    const q = p - 0.5, r = q * q;
    return (((((_A[0]*r+_A[1])*r+_A[2])*r+_A[3])*r+_A[4])*r+_A[5])*q /
           (((((_B[0]*r+_B[1])*r+_B[2])*r+_B[3])*r+_B[4])*r+1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((_C[0]*q+_C[1])*q+_C[2])*q+_C[3])*q+_C[4])*q+_C[5]) /
           ((((_D[0]*q+_D[1])*q+_D[2])*q+_D[3])*q+1);
}

// Lanczos logGamma
function logGamma(z: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
             771.32342877765313, -176.61502916214059, 12.507343278686905,
             -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  const zz = z - 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (zz + i);
  const t = zz + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

// Regularized incomplete beta via Lentz continued fraction
function betaCF(a: number, b: number, x: number): number {
  const MAXIT = 200, EPS = 1e-10, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta);
  if (x < (a + 1) / (a + b + 2)) return front * betaCF(a, b, x) / a;
  return 1 - front * betaCF(b, a, 1 - x) / b;
}

function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = 0.5 * regularizedBeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - ib : ib;
}

export function tQuantile(p: number, df: number): number {
  if (p <= 0.5) return -tQuantile(1 - p, df);
  if (df >= 1000) return normalQuantile(p);
  let lo = 0, hi = 50;
  while (tCDF(hi, df) < p) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, df) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Horner polynomial erf approximation (Abramowitz & Stegun 7.1.26, error < 1.5e-7)
function erf(x: number): number {
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const p = 0.3275911;
  const s = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  return s * (1 - ((((a[4]*t + a[3])*t + a[2])*t + a[1])*t + a[0]) * t * Math.exp(-x * x));
}

export function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export type Alternative = 'two' | 'right' | 'left';

export function pValueFromZ(z: number, alt: Alternative): number {
  if (alt === 'two') return 2 * (1 - normalCDF(Math.abs(z)));
  if (alt === 'right') return 1 - normalCDF(z);
  return normalCDF(z);
}

export function pValueFromT(t: number, df: number, alt: Alternative): number {
  const x = df / (df + t * t);
  const ib = 0.5 * regularizedBeta(x, df / 2, 0.5);
  const cdf = t >= 0 ? 1 - ib : ib;
  if (alt === 'two') return 2 * Math.min(cdf, 1 - cdf);
  if (alt === 'right') return 1 - cdf;
  return cdf;
}

// Theoretical power for z-test (sigma known)
export function theoreticalPower(
  delta: number,    // trueMu - mu0
  n: number,
  sigma: number,
  alpha: number,
  alt: Alternative,
): number {
  const d = delta / (sigma / Math.sqrt(n));
  if (alt === 'two') {
    const z = normalQuantile(1 - alpha / 2);
    return normalCDF(-z + d) + normalCDF(-z - d);
  }
  const z = normalQuantile(1 - alpha);
  if (alt === 'right') return normalCDF(-z + d);
  return normalCDF(-z - d);
}

export interface CIResult {
  lo: number;
  hi: number;
  xBar: number;
  containsMu: boolean;
  halfWidth: number;
  critValue: number;
}

export function computeCI(
  samples: number[],
  mu: number,
  sigma: number,
  level: number,
  useT: boolean
): CIResult {
  const n = samples.length;
  const xBar = samples.reduce((a, b) => a + b, 0) / n;
  const p = 1 - (1 - level) / 2;

  let critValue: number;
  let halfWidth: number;

  if (useT && n >= 2) {
    const s = Math.sqrt(samples.reduce((a, b) => a + (b - xBar) ** 2, 0) / (n - 1));
    critValue = tQuantile(p, n - 1);
    halfWidth = critValue * s / Math.sqrt(n);
  } else {
    critValue = normalQuantile(p);
    halfWidth = critValue * sigma / Math.sqrt(n);
  }

  const lo = xBar - halfWidth;
  const hi = xBar + halfWidth;
  return { lo, hi, xBar, containsMu: lo <= mu && mu <= hi, halfWidth, critValue };
}
