"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { normalQuantile, Alternative } from "@/lib/statistics";

export interface HTIntegratedChartProps {
  mu0: number;
  trueMu: number;
  se: number;
  alpha: number;
  alternative: Alternative;
  observedXBar?: number | null;
  rejected?: boolean;
  height?: number;
}

// ── Colours ──────────────────────────────────────────────────────────────────
const C_NULL  = "#2563eb";   // null distribution
const C_ALT   = "#16a34a";   // alt distribution
const C_ALPHA = "#ef4444";   // Type I error / critical zone
const C_BETA  = "#818cf8";   // Type II error (β)
const C_POWER = "#22c55e";   // Power (1-β)
const C_PVAL  = "#f59e0b";   // p-value area
const C_XBAR  = "#6366f1";   // observed x̄ (not rejected)

function normalPDF(x: number, mu: number, sigma: number) {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

export default function HTIntegratedChart({
  mu0, trueMu, se, alpha, alternative,
  observedXBar = null, rejected = false,
  height = 340,
}: HTIntegratedChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width  = svgRef.current?.clientWidth || 700;
    const margin = { top: 32, right: 18, bottom: 36, left: 14 };
    const W = width  - margin.left - margin.right;
    const H = height - margin.top  - margin.bottom;

    const isH0True = Math.abs(trueMu - mu0) < 1e-9;

    // ── Domain ────────────────────────────────────────────────────────────
    const spread = 4.5 * se;
    const lo = Math.min(mu0, trueMu) - spread;
    const hi = Math.max(mu0, trueMu) + spread;

    const xScale = d3.scaleLinear().domain([lo, hi]).range([0, W]);
    const peakPDF = normalPDF(mu0, mu0, se);
    const yScale  = d3.scaleLinear().domain([0, peakPDF * 1.18]).range([H, 0]);

    const N = 600;
    const xs = d3.range(lo, hi + (hi - lo) / N, (hi - lo) / N);

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // ── x-axis ────────────────────────────────────────────────────────────
    g.append("g").attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(8).tickSize(4))
      .call(ax => ax.select(".domain").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#888").attr("font-size", 11));

    // ── Critical values ───────────────────────────────────────────────────
    let critLo: number | null = null;
    let critHi: number | null = null;
    if (alternative === "two") {
      const z = normalQuantile(1 - alpha / 2);
      critLo = mu0 - z * se;
      critHi = mu0 + z * se;
    } else if (alternative === "right") {
      critHi = mu0 + normalQuantile(1 - alpha) * se;
    } else {
      critLo = mu0 + normalQuantile(alpha) * se;  // negative z
    }

    // ── Area generators ───────────────────────────────────────────────────
    const nullAreaGen = d3.area<number>()
      .x(x => xScale(x)).y0(H).y1(x => yScale(normalPDF(x, mu0, se)))
      .curve(d3.curveBasis);

    const altAreaGen = d3.area<number>()
      .x(x => xScale(x)).y0(H).y1(x => yScale(normalPDF(x, trueMu, se)))
      .curve(d3.curveBasis);

    // ── Partition x-values into critical / acceptance zones ───────────────
    const inCrit = (x: number) =>
      (critLo !== null && x <= critLo) || (critHi !== null && x >= critHi);
    const inAccept = (x: number) => !inCrit(x);

    const alphaXs = xs.filter(inCrit);
    const betaXs  = !isH0True ? xs.filter(inAccept) : [];
    const powerXs = !isH0True ? xs.filter(inCrit)   : [];

    // ── 1. α region (under H₀ curve, in critical zone) ───────────────────
    if (alphaXs.length > 1) {
      // Split into contiguous segments for two-sided case
      const segs = contiguousSegments(alphaXs, (hi - lo) / N * 2);
      segs.forEach(seg => {
        if (seg.length < 2) return;
        g.append("path").datum(seg).attr("d", nullAreaGen)
          .attr("fill", C_ALPHA).attr("opacity", 0.28);
      });
    }

    // ── 2. β region (under H₁ curve, in acceptance zone) ─────────────────
    if (!isH0True && betaXs.length > 1) {
      g.append("path").datum(betaXs).attr("d", altAreaGen)
        .attr("fill", C_BETA).attr("opacity", 0.38);
    }

    // ── 3. Power region (under H₁ curve, in critical zone) ───────────────
    if (!isH0True && powerXs.length > 1) {
      const segs = contiguousSegments(powerXs, (hi - lo) / N * 2);
      segs.forEach(seg => {
        if (seg.length < 2) return;
        g.append("path").datum(seg).attr("d", altAreaGen)
          .attr("fill", C_POWER).attr("opacity", 0.55);
      });
    }

    // ── 4. p-value region (under H₀ curve, at/beyond observed x̄) ─────────
    if (observedXBar !== null) {
      let pXs: number[];
      if (alternative === "two") {
        const dist = Math.abs(observedXBar - mu0);
        pXs = xs.filter(x => Math.abs(x - mu0) >= dist);
      } else if (alternative === "right") {
        pXs = xs.filter(x => x >= observedXBar!);
      } else {
        pXs = xs.filter(x => x <= observedXBar!);
      }
      const segs = contiguousSegments(pXs, (hi - lo) / N * 2);
      segs.forEach(seg => {
        if (seg.length < 2) return;
        g.append("path").datum(seg).attr("d", nullAreaGen)
          .attr("fill", C_PVAL).attr("opacity", 0.65);
      });
    }

    // ── 5. Alt distribution curve (dashed green) ──────────────────────────
    if (!isH0True) {
      g.append("path")
        .datum(xs)
        .attr("d", d3.line<number>()
          .x(x => xScale(x)).y(x => yScale(normalPDF(x, trueMu, se))).curve(d3.curveBasis))
        .attr("fill", "none").attr("stroke", C_ALT)
        .attr("stroke-width", 2).attr("stroke-dasharray", "7,4");
    }

    // ── 6. Null distribution curve (solid blue) ───────────────────────────
    g.append("path")
      .datum(xs)
      .attr("d", d3.line<number>()
        .x(x => xScale(x)).y(x => yScale(normalPDF(x, mu0, se))).curve(d3.curveBasis))
      .attr("fill", "none").attr("stroke", C_NULL).attr("stroke-width", 2.5);

    // ── 7. Critical boundary lines ────────────────────────────────────────
    ([critLo, critHi] as (number | null)[]).forEach(cx => {
      if (cx === null) return;
      const px = xScale(cx);
      g.append("line")
        .attr("x1", px).attr("x2", px).attr("y1", 0).attr("y2", H)
        .attr("stroke", C_ALPHA).attr("stroke-width", 1.5).attr("stroke-dasharray", "5,3");
    });

    // ── 8. μ₀ center line + label ─────────────────────────────────────────
    const mu0X = xScale(mu0);
    g.append("line")
      .attr("x1", mu0X).attr("x2", mu0X).attr("y1", 0).attr("y2", H)
      .attr("stroke", C_NULL).attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3").attr("opacity", 0.5);
    g.append("text")
      .attr("x", mu0X).attr("y", -14).attr("text-anchor", "middle")
      .attr("font-size", 12).attr("font-weight", "700").attr("fill", C_NULL)
      .text(`μ₀ = ${mu0}`);

    // ── 9. Alt distribution mean line + label ─────────────────────────────
    if (!isH0True) {
      const muX = xScale(trueMu);
      g.append("line")
        .attr("x1", muX).attr("x2", muX).attr("y1", 0).attr("y2", H)
        .attr("stroke", C_ALT).attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3").attr("opacity", 0.5);
      g.append("text")
        .attr("x", muX).attr("y", -14).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-weight", "700").attr("fill", C_ALT)
        .text(`μ = ${trueMu.toFixed(2)}`);
    }

    // ── 10. Observed x̄ marker ─────────────────────────────────────────────
    if (observedXBar !== null) {
      const ox    = xScale(observedXBar);
      const color = rejected ? C_ALPHA : C_XBAR;
      g.append("line")
        .attr("x1", ox).attr("x2", ox).attr("y1", 0).attr("y2", H)
        .attr("stroke", color).attr("stroke-width", 3);
      g.append("circle").attr("cx", ox).attr("cy", H).attr("r", 5).attr("fill", color);
      const anchor = observedXBar > (lo + hi) / 2 ? "end" : "start";
      const labelX = ox + (anchor === "end" ? -7 : 7);
      g.append("text").attr("x", labelX).attr("y", H - 10)
        .attr("text-anchor", anchor)
        .attr("font-size", 10).attr("font-weight", "700").attr("fill", color)
        .text(`x̄ = ${observedXBar.toFixed(3)}`);
    }

    // ── 11. Region labels (α, β, 1-β) ────────────────────────────────────
    const labelThreshold = peakPDF * 0.06;  // min alt-PDF height to show a label

    const placeLabel = (
      x: number, pdfFn: (x: number) => number,
      text: string, color: string, fraction = 0.42
    ) => {
      const pdf = pdfFn(x);
      if (pdf < labelThreshold) return;
      g.append("text")
        .attr("x", xScale(x)).attr("y", yScale(pdf * fraction))
        .attr("text-anchor", "middle")
        .attr("font-size", 11).attr("font-weight", "800")
        .attr("fill", color).attr("opacity", 0.9)
        .text(text);
    };

    // α labels — placed inside each critical segment under the null curve
    const alphaLabel = alternative === "two" ? "α/2" : "α";
    const alphaPDF   = (x: number) => normalPDF(x, mu0, se);
    contiguousSegments(alphaXs, (hi - lo) / N * 2).forEach(seg => {
      if (seg.length < 2) return;
      const cx = (seg[0] + seg[seg.length - 1]) / 2;
      placeLabel(cx, alphaPDF, alphaLabel, C_ALPHA, 0.38);
    });

    if (!isH0True) {
      const altPDF = (x: number) => normalPDF(x, trueMu, se);

      // β label — inside acceptance zone, near the alt distribution peak
      const betaCenter = Math.max(critLo ?? lo, Math.min(critHi ?? hi, trueMu));
      placeLabel(betaCenter, altPDF, "β", C_BETA, 0.48);

      // 1-β labels — inside each power segment
      contiguousSegments(powerXs, (hi - lo) / N * 2).forEach(seg => {
        if (seg.length < 2) return;
        const cx = (seg[0] + seg[seg.length - 1]) / 2;
        placeLabel(cx, altPDF, "1-β", C_POWER, 0.48);
      });
    }

  }, [mu0, trueMu, se, alpha, alternative, observedXBar, rejected, height]);

  return <svg ref={svgRef} className="w-full" />;
}

// ── Utility: split array into contiguous runs (gap tolerance) ─────────────
function contiguousSegments(arr: number[], gap: number): number[][] {
  if (arr.length === 0) return [];
  const segs: number[][] = [];
  let seg: number[] = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] - arr[i - 1] > gap) { segs.push(seg); seg = []; }
    seg.push(arr[i]);
  }
  segs.push(seg);
  return segs;
}
