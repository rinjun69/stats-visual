"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { CIResult } from "@/lib/statistics";

interface CIFenceProps {
  entries: CIResult[];
  mu: number;
  domain: [number, number];
  displayCount?: number;
  width?: number;
  height?: number;
}

const HIT_COLOR = "#16a34a";
const MISS_COLOR = "#dc2626";
const MU_COLOR = "#2563eb";

export default function CIFence({
  entries,
  mu,
  domain,
  displayCount = 60,
  width = 340,
  height = 300,
}: CIFenceProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 10, right: 16, bottom: 28, left: 8 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (entries.length === 0) {
      g.append("text")
        .attr("x", W / 2).attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 12).attr("fill", "#aaa")
        .text("「1標本」を押してください");
      return;
    }

    const shown = entries.slice(-displayCount);
    const n = shown.length;

    const xScale = d3.scaleLinear().domain(domain).range([0, W]);
    const rowH = Math.min(H / n, 10);
    const gap = rowH * 0.25;
    const barH = rowH - gap;

    // x axis
    g.append("g")
      .attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

    // CI bars (bottom = oldest, top = newest)
    shown.forEach((ci, i) => {
      const y = H - (i + 1) * rowH + gap / 2;
      const x0 = xScale(Math.max(ci.lo, domain[0]));
      const x1 = xScale(Math.min(ci.hi, domain[1]));
      const color = ci.containsMu ? HIT_COLOR : MISS_COLOR;
      g.append("rect")
        .attr("x", x0).attr("y", y)
        .attr("width", Math.max(0, x1 - x0)).attr("height", Math.max(barH, 1))
        .attr("fill", color).attr("opacity", ci === shown[shown.length - 1] ? 1 : 0.55);
    });

    // μ vertical line
    const mx = xScale(mu);
    g.append("line")
      .attr("x1", mx).attr("x2", mx)
      .attr("y1", 0).attr("y2", H)
      .attr("stroke", MU_COLOR)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,3");

    g.append("text")
      .attr("x", mx + 3).attr("y", 10)
      .attr("font-size", 10).attr("fill", MU_COLOR)
      .text("μ");
  }, [entries, mu, domain, displayCount, width, height]);

  return <svg ref={svgRef} />;
}
