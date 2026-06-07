"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface PValueChartProps {
  pValues: number[];
  alpha: number;
  height?: number;
  theoreticalPower?: number | null;
}

export default function PValueChart({
  pValues,
  alpha,
  height = 220,
  theoreticalPower = null,
}: PValueChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current?.clientWidth || 320;
    const margin = { top: 14, right: 14, bottom: 30, left: 36 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (pValues.length === 0) {
      g.append("text")
        .attr("x", W / 2).attr("y", H / 2)
        .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "#aaa")
        .text("「1標本」を押してください");
      return;
    }

    const BINS = 20;
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, W]);
    const bins = d3.bin().domain([0, 1]).thresholds(BINS)(pValues);

    const maxCount = d3.max(bins, b => b.length) ?? 1;
    // Show expected uniform level as a guide
    const expectedH = pValues.length / BINS;
    const yMax = Math.max(maxCount, expectedH * 1.5);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([H, 0]).nice();

    // axes
    g.append("g").attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(10).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(4).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#ccc"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

    // x axis label
    g.append("text")
      .attr("x", W / 2).attr("y", H + 24)
      .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#777")
      .text("p 値");

    // Expected uniform line
    g.append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", yScale(expectedH)).attr("y2", yScale(expectedH))
      .attr("stroke", "#94a3b8").attr("stroke-width", 1).attr("stroke-dasharray", "4,3");

    // Bars
    g.selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("x", b => xScale(b.x0!) + 0.5)
      .attr("width", b => Math.max(0, xScale(b.x1!) - xScale(b.x0!) - 1))
      .attr("y", b => yScale(b.length))
      .attr("height", b => H - yScale(b.length))
      .attr("fill", b => (b.x1! <= alpha) ? "#dc2626" : "#93c5fd")
      .attr("opacity", 0.75);

    // α line
    const ax = xScale(alpha);
    g.append("line")
      .attr("x1", ax).attr("x2", ax).attr("y1", 0).attr("y2", H)
      .attr("stroke", "#dc2626").attr("stroke-width", 2).attr("stroke-dasharray", "5,3");
    g.append("text")
      .attr("x", ax + 3).attr("y", 12)
      .attr("font-size", 10).attr("fill", "#dc2626").text(`α=${alpha}`);

    // Theoretical power annotation
    if (theoreticalPower !== null) {
      const pw = theoreticalPower;
      const expectedRejected = pw * pValues.length / BINS;
      const pwY = yScale(expectedRejected);
      if (pwY > 0 && pwY < H) {
        g.append("line")
          .attr("x1", 0).attr("x2", xScale(alpha))
          .attr("y1", pwY).attr("y2", pwY)
          .attr("stroke", "#f59e0b").attr("stroke-width", 1.5).attr("stroke-dasharray", "4,2");
      }
    }
  }, [pValues, alpha, height, theoreticalPower]);

  return <svg ref={svgRef} className="w-full" />;
}
