"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { CIResult } from "@/lib/statistics";

interface CI100ChartProps {
  entries: CIResult[];
  mu: number;
  domain: [number, number];
  displayCount?: number;
  height?: number;
}

const HIT  = "#22c55e";
const MISS = "#ef4444";
const MU   = "#1d4ed8";

export default function CI100Chart({
  entries,
  mu,
  domain,
  displayCount = 100,
  height = 520,
}: CI100ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current?.clientWidth || 640;
    const margin = { top: 22, right: 8, bottom: 32, left: 8 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;

    const g = svg
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (entries.length === 0) {
      g.append("text")
        .attr("x", W / 2).attr("y", H / 2)
        .attr("text-anchor", "middle").attr("font-size", 14).attr("fill", "#bbb")
        .text("「100回抽出」を押してください");
      // Still draw μ line and axis even when empty
    }

    const xScale = d3.scaleLinear().domain(domain).range([0, W]);

    // x axis
    g.append("g")
      .attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(8).tickSize(4))
      .call(ax => ax.select(".domain").attr("stroke", "#ddd"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#ddd"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#888").attr("font-size", 10));

    // Fixed row geometry regardless of how many bars are shown
    const rowH = H / displayCount;
    const barH = Math.max(rowH * 0.65, 1.5);

    // Show last `displayCount` entries; newest at TOP (index 0 = top)
    const shown = entries.slice(-displayCount).slice().reverse();

    shown.forEach((ci, i) => {
      const cy = i * rowH + rowH / 2;
      const x0 = xScale(Math.max(ci.lo, domain[0]));
      const x1 = xScale(Math.min(ci.hi, domain[1]));
      const color = ci.containsMu ? HIT : MISS;

      g.append("rect")
        .attr("x", x0)
        .attr("y", cy - barH / 2)
        .attr("width", Math.max(0, x1 - x0))
        .attr("height", barH)
        .attr("fill", color)
        .attr("rx", 1)
        .attr("opacity", 0.8);

      // x̄ center dot (white on bar)
      const xBarPx = xScale(ci.xBar);
      if (xBarPx >= x0 && xBarPx <= x1) {
        g.append("circle")
          .attr("cx", xBarPx).attr("cy", cy)
          .attr("r", Math.max(barH * 0.3, 1))
          .attr("fill", "white").attr("opacity", 0.7);
      }
    });

    // μ vertical line — drawn on top of bars
    const mx = xScale(mu);
    g.append("line")
      .attr("x1", mx).attr("x2", mx)
      .attr("y1", 0).attr("y2", H)
      .attr("stroke", MU)
      .attr("stroke-width", 2.5);

    // μ label above chart
    const leftOfMu = mx < W / 2;
    g.append("text")
      .attr("x", mx + (leftOfMu ? 5 : -5))
      .attr("y", -6)
      .attr("text-anchor", leftOfMu ? "start" : "end")
      .attr("font-size", 11)
      .attr("font-weight", "600")
      .attr("fill", MU)
      .text(`μ = ${mu.toFixed(3)}`);

  }, [entries, mu, domain, displayCount, height]);

  return <svg ref={svgRef} className="w-full" />;
}
