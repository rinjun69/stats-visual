"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { normalPDF } from "@/lib/prob";

interface CLTSamplingChartProps {
  means: number[];    // array of sample means (one per repetition)
  mu: number;
  sigma: number;
  n: number;          // current sample size (used to compute SE = sigma/√n)
  height?: number;
}

export default function CLTSamplingChart({ means, mu, sigma, n, height = 280 }: CLTSamplingChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || means.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width  = svgRef.current.clientWidth || 400;
    const margin = { top: 14, right: 16, bottom: 32, left: 50 };
    const W = width  - margin.left - margin.right;
    const H = height - margin.top  - margin.bottom;

    const se  = sigma / Math.sqrt(n);
    const xLo = mu - 4.5 * se;
    const xHi = mu + 4.5 * se;

    const xScale    = d3.scaleLinear().domain([xLo, xHi]).range([0, W]);
    const thresholds = d3.range(xLo, xHi, (xHi - xLo) / 30);
    const bins       = d3.bin().domain([xLo, xHi]).thresholds(thresholds)(means);
    const bw         = bins.length > 0 ? (bins[0].x1! - bins[0].x0!) : (xHi - xLo) / 30;
    const N          = means.length;

    const peakNorm = normalPDF(mu, mu, se);
    const peakHist = d3.max(bins, d => d.length / (N * bw)) ?? 0;
    const yMax     = Math.max(peakNorm, peakHist) * 1.15;

    const yScale = d3.scaleLinear().domain([0, yMax]).range([H, 0]);

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid
    g.selectAll(".hg").data(yScale.ticks(4)).enter().append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#e5e7eb").attr("stroke-width", 1);

    // Histogram bars (density scale)
    g.selectAll("rect").data(bins).enter().append("rect")
      .attr("x",      d => xScale(d.x0!))
      .attr("width",  d => Math.max(0, xScale(d.x1!) - xScale(d.x0!) - 1))
      .attr("y",      d => yScale(d.length / (N * bw)))
      .attr("height", d => Math.max(0, H - yScale(d.length / (N * bw))))
      .attr("fill", "#2563eb").attr("opacity", 0.65);

    // Normal curve overlay: N(mu, se²)
    const normXs = d3.range(xLo, xHi + (xHi - xLo) / 200, (xHi - xLo) / 200);
    g.append("path")
      .datum(normXs)
      .attr("d", d3.area<number>()
        .x(x => xScale(x)).y0(H).y1(x => yScale(normalPDF(x, mu, se))))
      .attr("fill", "#16a34a").attr("opacity", 0.12);
    g.append("path")
      .datum(normXs)
      .attr("d", d3.line<number>()
        .x(x => xScale(x)).y(x => yScale(normalPDF(x, mu, se))))
      .attr("fill", "none").attr("stroke", "#16a34a").attr("stroke-width", 2.2);

    // μ vertical marker
    g.append("line")
      .attr("x1", xScale(mu)).attr("x2", xScale(mu)).attr("y1", 0).attr("y2", H)
      .attr("stroke", "#16a34a").attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "5,3").attr("opacity", 0.7);

    // Axes
    g.append("g").attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));
    g.append("text").attr("x", W / 2).attr("y", H + 28)
      .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#9ca3af")
      .text("標本平均 X̄ の値");

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(4).tickFormat(d3.format(".2f")).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));

  }, [means, mu, sigma, n, height]);

  return <svg ref={svgRef} className="w-full" />;
}
