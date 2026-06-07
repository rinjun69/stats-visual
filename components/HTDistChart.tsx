"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { normalQuantile, normalCDF, Alternative } from "@/lib/statistics";

interface HTDistChartProps {
  mu0: number;
  se: number;               // sigma / sqrt(n)
  alpha: number;
  alternative: Alternative;
  observedXBar?: number | null;
  pValue?: number | null;
  rejected?: boolean;
  trueMu?: number;
  showAlt?: boolean;
  height?: number;
}

const NULL_COLOR = "#2563eb";
const ALT_COLOR = "#16a34a";
const CRIT_COLOR = "#dc2626";
const PVAL_COLOR = "#f59e0b";

function normalPDF(x: number, mu: number, sigma: number) {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

export default function HTDistChart({
  mu0,
  se,
  alpha,
  alternative,
  observedXBar = null,
  pValue = null,
  rejected = false,
  trueMu = 0,
  showAlt = false,
  height = 200,
}: HTDistChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current?.clientWidth || 320;
    const margin = { top: 14, right: 12, bottom: 28, left: 10 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;

    // domain: encompass both null and alt distributions
    const spread = 4 * se;
    const lo = Math.min(mu0 - spread, showAlt ? trueMu - spread : mu0 - spread);
    const hi = Math.max(mu0 + spread, showAlt ? trueMu + spread : mu0 + spread);
    const domain: [number, number] = [lo, hi];

    const xScale = d3.scaleLinear().domain(domain).range([0, W]);
    const peakPDF = normalPDF(mu0, mu0, se);
    const yScale = d3.scaleLinear().domain([0, peakPDF * 1.25]).range([H, 0]);

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // x axis
    g.append("g").attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

    // helper: area under null distribution between x0 and x1
    const nullArea = d3.area<number>()
      .x(x => xScale(x))
      .y0(H)
      .y1(x => yScale(normalPDF(x, mu0, se)))
      .curve(d3.curveBasis);

    const xs = d3.range(lo, hi, (hi - lo) / 400);

    // --- Critical region (red) ---
    let critLo: number | null = null, critHi: number | null = null;
    if (alternative === 'two') {
      const z = normalQuantile(1 - alpha / 2);
      critLo = mu0 - z * se;
      critHi = mu0 + z * se;
    } else if (alternative === 'right') {
      critHi = mu0 + normalQuantile(1 - alpha) * se;
    } else {
      critLo = mu0 - normalQuantile(1 - alpha) * se;
    }

    const critXs = (critLo !== null)
      ? xs.filter(x => x <= critLo!)
      : [];
    const critXs2 = (critHi !== null)
      ? xs.filter(x => x >= critHi!)
      : [];

    if (critXs.length > 1) {
      g.append("path").datum(critXs).attr("d", nullArea).attr("fill", CRIT_COLOR).attr("opacity", 0.25);
    }
    if (critXs2.length > 1) {
      g.append("path").datum(critXs2).attr("d", nullArea).attr("fill", CRIT_COLOR).attr("opacity", 0.25);
    }

    // --- P-value area (amber) ---
    if (observedXBar !== null) {
      let pXs: number[] = [];
      if (alternative === 'two') {
        const dist = Math.abs(observedXBar - mu0);
        pXs = xs.filter(x => Math.abs(x - mu0) >= dist);
      } else if (alternative === 'right') {
        pXs = xs.filter(x => x >= observedXBar!);
      } else {
        pXs = xs.filter(x => x <= observedXBar!);
      }
      // draw as separate segments
      const segments: number[][] = [];
      let seg: number[] = [];
      for (let i = 0; i < pXs.length; i++) {
        if (i === 0 || pXs[i] - pXs[i - 1] > (hi - lo) / 300) {
          if (seg.length > 1) segments.push(seg);
          seg = [];
        }
        seg.push(pXs[i]);
      }
      if (seg.length > 1) segments.push(seg);
      segments.forEach(s => {
        g.append("path").datum(s).attr("d", nullArea).attr("fill", PVAL_COLOR).attr("opacity", 0.55);
      });
    }

    // --- Alt distribution curve ---
    if (showAlt) {
      const altArea = d3.area<number>()
        .x(x => xScale(x))
        .y0(H)
        .y1(x => yScale(normalPDF(x, trueMu, se)))
        .curve(d3.curveBasis);
      const altLine = d3.line<number>()
        .x(x => xScale(x))
        .y(x => yScale(normalPDF(x, trueMu, se)))
        .curve(d3.curveBasis);
      g.append("path").datum(xs).attr("d", altArea).attr("fill", ALT_COLOR).attr("opacity", 0.08);
      g.append("path").datum(xs).attr("d", altLine)
        .attr("fill", "none").attr("stroke", ALT_COLOR)
        .attr("stroke-width", 1.5).attr("stroke-dasharray", "5,3");
    }

    // --- Null distribution curve ---
    const nullLine = d3.line<number>()
      .x(x => xScale(x))
      .y(x => yScale(normalPDF(x, mu0, se)))
      .curve(d3.curveBasis);
    g.append("path").datum(xs).attr("d", nullLine)
      .attr("fill", "none").attr("stroke", NULL_COLOR).attr("stroke-width", 2);

    // --- Critical boundary lines ---
    [critLo, critHi].forEach(cx => {
      if (cx === null) return;
      const px = xScale(cx);
      g.append("line")
        .attr("x1", px).attr("x2", px).attr("y1", 0).attr("y2", H)
        .attr("stroke", CRIT_COLOR).attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");
    });

    // --- μ₀ line ---
    g.append("line")
      .attr("x1", xScale(mu0)).attr("x2", xScale(mu0)).attr("y1", 0).attr("y2", H)
      .attr("stroke", NULL_COLOR).attr("stroke-width", 1).attr("stroke-dasharray", "2,2");
    g.append("text")
      .attr("x", xScale(mu0) + 3).attr("y", 10)
      .attr("font-size", 10).attr("fill", NULL_COLOR).text("μ₀");

    // --- Alt distribution mean line ---
    if (showAlt && trueMu !== mu0) {
      g.append("line")
        .attr("x1", xScale(trueMu)).attr("x2", xScale(trueMu)).attr("y1", 0).attr("y2", H)
        .attr("stroke", ALT_COLOR).attr("stroke-width", 1).attr("stroke-dasharray", "2,2");
      g.append("text")
        .attr("x", xScale(trueMu) + 3).attr("y", 10)
        .attr("font-size", 10).attr("fill", ALT_COLOR).text("μ");
    }

    // --- Observed x̄ ---
    if (observedXBar !== null) {
      const ox = xScale(observedXBar);
      const lineColor = rejected ? CRIT_COLOR : "#6366f1";
      g.append("line")
        .attr("x1", ox).attr("x2", ox).attr("y1", 0).attr("y2", H)
        .attr("stroke", lineColor).attr("stroke-width", 2.5);
      g.append("circle").attr("cx", ox).attr("cy", H).attr("r", 4).attr("fill", lineColor);
      g.append("text")
        .attr("x", ox + 4).attr("y", H - 6)
        .attr("font-size", 9).attr("fill", lineColor)
        .text(`x̄=${observedXBar.toFixed(2)}`);
    }

    // --- Legend for alt ---
    if (showAlt) {
      const lx = W - 4, ly = 10;
      g.append("line").attr("x1", lx - 24).attr("x2", lx).attr("y1", ly).attr("y2", ly)
        .attr("stroke", ALT_COLOR).attr("stroke-width", 1.5).attr("stroke-dasharray", "5,3");
      g.append("text").attr("x", lx - 26).attr("y", ly + 1)
        .attr("text-anchor", "end").attr("font-size", 9).attr("fill", ALT_COLOR)
        .attr("dominant-baseline", "middle").text("真の分布");
    }
  }, [mu0, se, alpha, alternative, observedXBar, pValue, rejected, trueMu, showAlt, height]);

  return <svg ref={svgRef} className="w-full" />;
}
