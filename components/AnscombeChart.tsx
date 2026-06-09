"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Point { x: number; y: number; }

export interface AnscombeChartProps {
  data: Point[];
  color: string;
  height?: number;
}

export default function AnscombeChart({ data, color, height = 210 }: AnscombeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width  = svgRef.current?.clientWidth || 320;
    const margin = { top: 10, right: 14, bottom: 30, left: 30 };
    const W = width  - margin.left - margin.right;
    const H = height - margin.top  - margin.bottom;

    // Fixed domain so all 4 charts are comparable
    const xScale = d3.scaleLinear().domain([0, 20]).range([0, W]);
    const yScale = d3.scaleLinear().domain([0, 14]).range([H, 0]);

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Light grid
    g.selectAll(".vg")
      .data(xScale.ticks(5))
      .enter().append("line")
      .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
      .attr("y1", 0).attr("y2", H)
      .attr("stroke", "#e5e7eb").attr("stroke-width", 1);

    g.selectAll(".hg")
      .data(yScale.ticks(5))
      .enter().append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#e5e7eb").attr("stroke-width", 1);

    // Axes
    g.append("g").attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));

    // Regression line: ŷ = 3.00 + 0.50x (identical for all 4 datasets)
    g.append("line")
      .attr("x1", xScale(0)).attr("y1", yScale(3))
      .attr("x2", xScale(20)).attr("y2", yScale(13))
      .attr("stroke", "#94a3b8").attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "6,3").attr("opacity", 0.65);

    // Data points
    g.selectAll(".pt")
      .data(data)
      .enter().append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 6)
      .attr("fill", color)
      .attr("fill-opacity", 0.72)
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);

  }, [data, color, height]);

  return <svg ref={svgRef} className="w-full" />;
}
