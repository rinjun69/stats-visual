"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Distribution } from "@/lib/distributions";

interface PopulationPanelProps {
  dist: Distribution;
}

export default function PopulationPanel({ dist }: PopulationPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current?.clientWidth || 300;
    const height = 160;
    const margin = { top: 12, right: 12, bottom: 28, left: 36 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;

    const g = svg
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const pts = dist.pdfPoints();

    if (dist.id === "bernoulli") {
      // Bar chart for discrete distribution
      const xScale = d3.scaleBand()
        .domain(pts.map((p) => String(p.x)))
        .range([0, W])
        .padding(0.4);
      const yMax = d3.max(pts, (p) => p.y) ?? 1;
      const yScale = d3.scaleLinear().domain([0, yMax * 1.2]).range([H, 0]);

      g.append("g").attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(xScale).tickSize(3))
        .call((ax) => ax.select(".domain").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick line").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

      g.append("g")
        .call(d3.axisLeft(yScale).ticks(4).tickSize(3))
        .call((ax) => ax.select(".domain").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick line").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

      g.selectAll("rect")
        .data(pts)
        .join("rect")
        .attr("x", (p) => xScale(String(p.x))!)
        .attr("width", xScale.bandwidth())
        .attr("y", (p) => yScale(p.y))
        .attr("height", (p) => H - yScale(p.y))
        .attr("fill", "#93c5fd")
        .attr("opacity", 0.85);
    } else {
      const xExt = d3.extent(pts, (p) => p.x) as [number, number];
      const yMax = d3.max(pts, (p) => p.y) ?? 1;
      const xScale = d3.scaleLinear().domain(xExt).range([0, W]);
      const yScale = d3.scaleLinear().domain([0, yMax * 1.15]).range([H, 0]);

      g.append("g").attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
        .call((ax) => ax.select(".domain").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick line").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

      g.append("g")
        .call(d3.axisLeft(yScale).ticks(4).tickSize(3))
        .call((ax) => ax.select(".domain").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick line").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

      // Area fill
      const area = d3.area<{ x: number; y: number }>()
        .x((p) => xScale(p.x))
        .y0(H)
        .y1((p) => yScale(p.y))
        .curve(d3.curveBasis);

      const line = d3.line<{ x: number; y: number }>()
        .x((p) => xScale(p.x))
        .y((p) => yScale(p.y))
        .curve(d3.curveBasis);

      g.append("path")
        .datum(pts)
        .attr("d", area)
        .attr("fill", "#93c5fd")
        .attr("opacity", 0.35);

      g.append("path")
        .datum(pts)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 2);

      // Mean line
      const mx = xScale(dist.mean);
      if (mx >= 0 && mx <= W) {
        g.append("line")
          .attr("x1", mx).attr("x2", mx)
          .attr("y1", 0).attr("y2", H)
          .attr("stroke", "#16a34a")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,3");
      }
    }
  }, [dist]);

  return (
    <div className="flex flex-col gap-2">
      <svg ref={svgRef} className="w-full" />
      <div className="flex gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
        <span>μ = <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{dist.mean.toFixed(3)}</span></span>
        <span>σ = <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{dist.std.toFixed(3)}</span></span>
      </div>
    </div>
  );
}
