"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Distribution } from "@/lib/distributions";

interface SamplePanelProps {
  dist: Distribution;
  samples: number[];
  sampleMean: number | null;
}

export default function SamplePanel({ dist, samples, sampleMean }: SamplePanelProps) {
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

    if (samples.length === 0) {
      g.append("text")
        .attr("x", W / 2).attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("fill", "#aaa")
        .text("「1標本」を押してください");
      return;
    }

    const pts = dist.pdfPoints();
    const xExt = pts.length > 2
      ? (d3.extent(pts, (p) => p.x) as [number, number])
      : [d3.min(samples)! - 0.5, d3.max(samples)! + 0.5] as [number, number];
    const xScale = d3.scaleLinear().domain(xExt).range([0, W]);

    // Histogram of samples
    const bins = d3.bin()
      .domain(xScale.domain() as [number, number])
      .thresholds(xScale.ticks(Math.min(samples.length, 20)))(samples);

    const yMax = d3.max(bins, (b) => b.length) ?? 1;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.2]).range([H, 0]);

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

    g.selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("x", (b) => xScale(b.x0!) + 0.5)
      .attr("width", (b) => Math.max(0, xScale(b.x1!) - xScale(b.x0!) - 1))
      .attr("y", (b) => yScale(b.length))
      .attr("height", (b) => H - yScale(b.length))
      .attr("fill", "#a5b4fc")
      .attr("opacity", 0.8);

    // Dot plot for small n
    if (samples.length <= 30) {
      svg.selectAll("*").remove();
      const g2 = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      g2.append("g").attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
        .call((ax) => ax.select(".domain").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick line").attr("stroke", "#ccc"))
        .call((ax) => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

      const jitter = () => (Math.random() - 0.5) * 20;
      g2.selectAll("circle")
        .data(samples)
        .join("circle")
        .attr("cx", (d) => xScale(d))
        .attr("cy", () => H / 2 + jitter())
        .attr("r", 4)
        .attr("fill", "#6366f1")
        .attr("opacity", 0.65);

      if (sampleMean !== null) {
        const mx = xScale(sampleMean);
        g2.append("line")
          .attr("x1", mx).attr("x2", mx)
          .attr("y1", 0).attr("y2", H)
          .attr("stroke", "#16a34a")
          .attr("stroke-width", 2.5);
        g2.append("text")
          .attr("x", mx + 4).attr("y", 14)
          .attr("font-size", 10)
          .attr("fill", "#16a34a")
          .text(`x̄=${sampleMean.toFixed(2)}`);
      }
      return;
    }

    // Mean line for histogram mode
    if (sampleMean !== null) {
      const mx = xScale(sampleMean);
      g.append("line")
        .attr("x1", mx).attr("x2", mx)
        .attr("y1", 0).attr("y2", H)
        .attr("stroke", "#16a34a")
        .attr("stroke-width", 2.5);
      g.append("text")
        .attr("x", mx + 4).attr("y", 14)
        .attr("font-size", 10)
        .attr("fill", "#16a34a")
        .text(`x̄=${sampleMean.toFixed(2)}`);
    }
  }, [dist, samples, sampleMean]);

  return <svg ref={svgRef} className="w-full" />;
}
