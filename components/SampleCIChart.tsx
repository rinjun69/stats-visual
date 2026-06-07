"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { CIResult } from "@/lib/statistics";

interface SampleCIChartProps {
  samples: number[];
  ci: CIResult | null;
  mu: number;
  domain: [number, number];
  width?: number;
  height?: number;
}

export default function SampleCIChart({
  samples,
  ci,
  mu,
  domain,
  width = 340,
  height = 180,
}: SampleCIChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 10, right: 16, bottom: 28, left: 8 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;
    const dotZone = H * 0.55;
    const ciZone = H * 0.35;
    const ciY = dotZone + H * 0.1;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (samples.length === 0) {
      g.append("text")
        .attr("x", W / 2).attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 12).attr("fill", "#aaa")
        .text("「1標本」を押してください");
      return;
    }

    const xScale = d3.scaleLinear().domain(domain).range([0, W]);

    // x axis
    g.append("g")
      .attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

    // μ vertical line (full height)
    const mx = xScale(mu);
    g.append("line")
      .attr("x1", mx).attr("x2", mx)
      .attr("y1", 0).attr("y2", H)
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,3");
    g.append("text")
      .attr("x", mx + 3).attr("y", 10)
      .attr("font-size", 10).attr("fill", "#2563eb")
      .text("μ");

    // Sample dots (jittered vertically in upper zone)
    const jitter = () => (Math.random() - 0.5) * dotZone * 0.5;
    g.selectAll("circle.dot")
      .data(samples)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(Math.max(domain[0], Math.min(domain[1], d))))
      .attr("cy", () => dotZone / 2 + jitter())
      .attr("r", Math.max(2, Math.min(4, 60 / samples.length)))
      .attr("fill", "#6366f1")
      .attr("opacity", 0.55);

    // CI bar
    if (ci) {
      const color = ci.containsMu ? "#16a34a" : "#dc2626";
      const x0 = xScale(Math.max(ci.lo, domain[0]));
      const x1 = xScale(Math.min(ci.hi, domain[1]));
      const bH = 10;
      const by = ciY + ciZone / 2 - bH / 2;

      // bar fill
      g.append("rect")
        .attr("x", x0).attr("y", by)
        .attr("width", Math.max(0, x1 - x0)).attr("height", bH)
        .attr("fill", color).attr("opacity", 0.25);

      // bar outline line
      g.append("line")
        .attr("x1", x0).attr("x2", x1)
        .attr("y1", by + bH / 2).attr("y2", by + bH / 2)
        .attr("stroke", color).attr("stroke-width", 2);

      // end caps
      [x0, x1].forEach(cx => {
        g.append("line")
          .attr("x1", cx).attr("x2", cx)
          .attr("y1", by).attr("y2", by + bH)
          .attr("stroke", color).attr("stroke-width", 2);
      });

      // x̄ dot
      const xBarX = xScale(ci.xBar);
      if (xBarX >= 0 && xBarX <= W) {
        g.append("circle")
          .attr("cx", xBarX).attr("cy", by + bH / 2)
          .attr("r", 4).attr("fill", color);
      }

      // label
      const label = ci.containsMu ? "μを含む" : "μを含まない";
      g.append("text")
        .attr("x", W - 2).attr("y", by - 3)
        .attr("text-anchor", "end")
        .attr("font-size", 10)
        .attr("fill", color)
        .attr("font-weight", "600")
        .text(label);
    }
  }, [samples, ci, mu, domain, width, height]);

  return <svg ref={svgRef} />;
}
