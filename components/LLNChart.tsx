"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface LLNChartProps {
  trajectories: number[][];  // [numTraj][n] — running mean at each step 1..n
  mu: number;
  sigma: number;
  n: number;
  height?: number;
}

export default function LLNChart({ trajectories, mu, sigma, n, height = 280 }: LLNChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || n < 1 || trajectories.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width  = svgRef.current.clientWidth || 400;
    const margin = { top: 14, right: 30, bottom: 32, left: 46 };
    const W = width  - margin.left - margin.right;
    const H = height - margin.top  - margin.bottom;

    // Fixed y range so convergence is visually dramatic
    const yHalf  = 3.5 * sigma;
    const xScale = d3.scaleLinear().domain([1, Math.max(n, 10)]).range([0, W]);
    const yScale = d3.scaleLinear().domain([mu - yHalf, mu + yHalf]).range([H, 0]);

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid
    g.selectAll(".hg").data(yScale.ticks(5)).enter().append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#e5e7eb").attr("stroke-width", 1);

    // ±σ/√n funnel band (theoretical standard error envelope)
    if (n > 1) {
      const xs = d3.range(1, n + 1);
      g.append("path")
        .datum(xs)
        .attr("d", d3.area<number>()
          .x(x => xScale(x))
          .y0(x => yScale(Math.max(mu - yHalf, mu - sigma / Math.sqrt(x))))
          .y1(x => yScale(Math.min(mu + yHalf, mu + sigma / Math.sqrt(x)))))
        .attr("fill", "#93c5fd").attr("opacity", 0.28);
    }

    // Trajectory line generator (clamp values to visible range)
    const lineGen = d3.line<number>()
      .x((_, i) => xScale(i + 1))
      .y(d  => yScale(Math.max(mu - yHalf, Math.min(mu + yHalf, d))))
      .curve(d3.curveLinear);

    // Faint background trajectories
    trajectories.slice(1).forEach(traj => {
      g.append("path").datum(traj).attr("d", lineGen)
        .attr("fill", "none").attr("stroke", "#9ca3af")
        .attr("stroke-width", 1).attr("opacity", 0.4);
    });

    // Highlighted trajectory (first one)
    if (trajectories[0]) {
      g.append("path").datum(trajectories[0]).attr("d", lineGen)
        .attr("fill", "none").attr("stroke", "#2563eb").attr("stroke-width", 2.2);
    }

    // μ reference line
    g.append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", yScale(mu)).attr("y2", yScale(mu))
      .attr("stroke", "#16a34a").attr("stroke-width", 2).attr("stroke-dasharray", "6,3");
    g.append("text").attr("x", W + 4).attr("y", yScale(mu) + 4)
      .attr("font-size", 10).attr("font-weight", "700").attr("fill", "#16a34a").text("μ");

    // Axes
    g.append("g").attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));
    g.append("text").attr("x", W / 2).attr("y", H + 28)
      .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#9ca3af")
      .text("標本サイズ n");

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));

  }, [trajectories, mu, sigma, n, height]);

  return <svg ref={svgRef} className="w-full" />;
}
