"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

export interface BarSeries {
  data: { x: number; y: number }[];
  color: string;
  label?: string;
  opacity?: number;
}

export interface CurveSeries {
  data: { x: number; y: number }[];
  color: string;
  label?: string;
  opacity?: number;
}

export interface DistChartProps {
  bars?: BarSeries[];    // 1 or 2 discrete PMF series
  curves?: CurveSeries[]; // continuous PDF series
  height?: number;
}

export default function DistChart({ bars = [], curves = [], height = 200 }: DistChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const allPoints = [
      ...bars.flatMap(s => s.data),
      ...curves.flatMap(s => s.data),
    ];
    if (allPoints.length === 0) return;

    const width  = svgRef.current?.clientWidth || 340;
    const margin = { top: 14, right: 16, bottom: 32, left: 38 };
    const W = width  - margin.left - margin.right;
    const H = height - margin.top  - margin.bottom;

    // Domain
    const xMin = d3.min(allPoints, d => d.x) ?? 0;
    const xMax = d3.max(allPoints, d => d.x) ?? 1;
    const yMax = d3.max(allPoints, d => d.y) ?? 1;

    const xPad  = (xMax - xMin) * 0.04 + 0.5;
    const xScale = d3.scaleLinear().domain([xMin - xPad, xMax + xPad]).range([0, W]);
    const yScale = d3.scaleLinear().domain([0, yMax * 1.12]).range([H, 0]);

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid
    g.selectAll(".hg").data(yScale.ticks(5)).enter().append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#e5e7eb").attr("stroke-width", 1);

    // Axes
    g.append("g").attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(4).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));

    // Bar width based on first bar series spacing
    const nSeries = bars.length;
    let unitPx = 40; // fallback
    if (bars.length > 0 && bars[0].data.length > 1) {
      unitPx = xScale(bars[0].data[1].x) - xScale(bars[0].data[0].x);
    }

    // Bars
    bars.forEach((series, si) => {
      let barW: number;
      let offset: number;

      if (nSeries === 1) {
        barW   = Math.max(1.5, unitPx * 0.82);
        offset = 0;
      } else {
        // Two series: side-by-side
        barW   = Math.max(1.5, unitPx * 0.40);
        offset = (si === 0 ? -1 : 1) * unitPx * 0.22;
      }

      series.data.forEach(({ x, y }) => {
        if (y < 1e-9) return;
        g.append("rect")
          .attr("x", xScale(x) + offset - barW / 2)
          .attr("y", yScale(y))
          .attr("width", Math.max(1.5, barW))
          .attr("height", Math.max(0, H - yScale(y)))
          .attr("fill", series.color)
          .attr("opacity", series.opacity ?? 0.78);
      });
    });

    // Curves (area + line)
    curves.forEach(series => {
      if (series.data.length < 2) return;
      const opacity = series.opacity ?? 0.75;

      g.append("path")
        .datum(series.data)
        .attr("d", d3.area<{ x: number; y: number }>()
          .x(d => xScale(d.x)).y0(H).y1(d => yScale(d.y))
          .curve(d3.curveBasis))
        .attr("fill", series.color).attr("opacity", opacity * 0.3);

      g.append("path")
        .datum(series.data)
        .attr("d", d3.line<{ x: number; y: number }>()
          .x(d => xScale(d.x)).y(d => yScale(d.y))
          .curve(d3.curveBasis))
        .attr("fill", "none").attr("stroke", series.color)
        .attr("stroke-width", 2.2).attr("opacity", opacity);
    });

    // Legend (top-right inside chart)
    const legendItems = [
      ...bars.filter(s => s.label).map(s => ({ color: s.color, label: s.label! })),
      ...curves.filter(s => s.label).map(s => ({ color: s.color, label: s.label! })),
    ];
    if (legendItems.length > 0) {
      let ly = 6;
      legendItems.forEach(({ color, label }) => {
        g.append("rect")
          .attr("x", W - 100).attr("y", ly)
          .attr("width", 10).attr("height", 10)
          .attr("fill", color).attr("rx", 2);
        g.append("text")
          .attr("x", W - 86).attr("y", ly + 9)
          .attr("font-size", 10).attr("fill", "#4b5563")
          .text(label);
        ly += 16;
      });
    }

  }, [bars, curves, height]);

  return <svg ref={svgRef} className="w-full" />;
}
