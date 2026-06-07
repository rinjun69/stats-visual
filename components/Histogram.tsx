"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface HistogramProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  domain?: [number, number];
  binCount?: number;
  meanLine?: number | null;
  overlayNormal?: boolean;
  normalMean?: number;
  normalStd?: number;
  xLabel?: string;
  latestValue?: number | null;
}

export default function Histogram({
  data,
  width = 320,
  height = 180,
  color = "#93c5fd",
  domain,
  binCount = 30,
  meanLine = null,
  overlayNormal = false,
  normalMean = 0,
  normalStd = 1,
  xLabel,
  latestValue = null,
}: HistogramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 12, right: 12, bottom: xLabel ? 32 : 20, left: 36 };
    const W = width - margin.left - margin.right;
    const H = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (data.length === 0) {
      g.append("text")
        .attr("x", W / 2).attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("fill", "#999")
        .text("データなし");
      return;
    }

    const ext = domain ?? (d3.extent(data) as [number, number]);
    const xScale = d3.scaleLinear().domain(ext).range([0, W]).nice();

    const bins = d3.bin()
      .domain(xScale.domain() as [number, number])
      .thresholds(xScale.ticks(binCount))(data);

    const maxCount = d3.max(bins, (b) => b.length) ?? 1;

    // When overlaying normal, scale y to density
    const density = overlayNormal && data.length > 0;
    const totalArea = data.length * (bins[0]?.x1! - bins[0]?.x0! || 1);

    const yMax = density
      ? Math.max(
          d3.max(bins, (b) => b.length / totalArea) ?? 0,
          normalPdf(normalMean, normalMean, normalStd) * 1.2
        )
      : maxCount;

    const yScale = d3.scaleLinear().domain([0, yMax]).range([H, 0]).nice();

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
      .call((ax) => ax.select(".domain").attr("stroke", "#ccc"))
      .call((ax) => ax.selectAll(".tick line").attr("stroke", "#ccc"))
      .call((ax) => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(4).tickSize(3))
      .call((ax) => ax.select(".domain").attr("stroke", "#ccc"))
      .call((ax) => ax.selectAll(".tick line").attr("stroke", "#ccc"))
      .call((ax) => ax.selectAll(".tick text").attr("fill", "#777").attr("font-size", 10));

    // Bars
    g.selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("x", (b) => xScale(b.x0!) + 0.5)
      .attr("width", (b) => Math.max(0, xScale(b.x1!) - xScale(b.x0!) - 1))
      .attr("y", (b) => yScale(density ? b.length / totalArea : b.length))
      .attr("height", (b) => H - yScale(density ? b.length / totalArea : b.length))
      .attr("fill", color)
      .attr("opacity", 0.8);

    // Normal overlay curve
    if (overlayNormal && normalStd > 0) {
      const lineData: [number, number][] = [];
      const [x0, x1] = xScale.domain();
      for (let x = x0; x <= x1; x += (x1 - x0) / 200) {
        lineData.push([x, normalPdf(x, normalMean, normalStd)]);
      }
      const line = d3.line<[number, number]>()
        .x(([x]) => xScale(x))
        .y(([, y]) => yScale(y))
        .curve(d3.curveBasis);
      g.append("path")
        .datum(lineData)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#dc2626")
        .attr("stroke-width", 2)
        .attr("opacity", 0.85);
    }

    // Mean line
    if (meanLine !== null) {
      const mx = xScale(meanLine);
      if (mx >= 0 && mx <= W) {
        g.append("line")
          .attr("x1", mx).attr("x2", mx)
          .attr("y1", 0).attr("y2", H)
          .attr("stroke", "#16a34a")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,3");
      }
    }

    // Latest value marker
    if (latestValue !== null) {
      const lx = xScale(latestValue);
      if (lx >= 0 && lx <= W) {
        g.append("circle")
          .attr("cx", lx).attr("cy", H + 8)
          .attr("r", 4)
          .attr("fill", "#2563eb");
      }
    }

    // X label
    if (xLabel) {
      g.append("text")
        .attr("x", W / 2).attr("y", H + 28)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("fill", "#777")
        .text(xLabel);
    }
  }, [data, width, height, color, domain, binCount, meanLine, overlayNormal, normalMean, normalStd, xLabel, latestValue]);

  return <svg ref={svgRef} />;
}

function normalPdf(x: number, mu: number, sigma: number): number {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}
