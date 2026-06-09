"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { DataPoint } from "@/components/OLSChart";

export type R2Mode = "total" | "residual" | "decompose";

interface R2ChartProps {
  points:      DataPoint[];
  slope:       number;
  intercept:   number;
  meanY:       number;
  mode:        R2Mode;
  xDomain:     [number, number];
  yDomain:     [number, number];
  onPointMove: (id: number, x: number, y: number) => void;
  onPointRemove: (id: number) => void;
  height?: number;
}

const C_TSS  = "#6b7280";   // gray  — total deviation from ȳ
const C_RSS  = "#ea580c";   // orange — residual from regression
const C_ESS  = "#2563eb";   // blue  — explained by regression
const C_REG  = "#2563eb";   // regression line
const C_MEAN = "#94a3b8";   // ȳ line

export default function R2Chart({
  points, slope, intercept, meanY, mode,
  xDomain, yDomain, onPointMove, onPointRemove, height = 360,
}: R2ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onMoveRef   = useRef(onPointMove);
  const onRemoveRef = useRef(onPointRemove);
  onMoveRef.current   = onPointMove;
  onRemoveRef.current = onPointRemove;

  useEffect(() => {
    if (!svgRef.current || points.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width  = svgRef.current.clientWidth || 600;
    const margin = { top: 14, right: 28, bottom: 36, left: 40 };
    const W = width  - margin.left - margin.right;
    const H = height - margin.top  - margin.bottom;

    const [xLo, xHi] = xDomain;
    const [yLo, yHi] = yDomain;

    const xScale = d3.scaleLinear().domain([xLo, xHi]).range([0, W]);
    const yScale = d3.scaleLinear().domain([yLo, yHi]).range([H, 0]);

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid
    g.selectAll(".hg").data(yScale.ticks(5)).enter().append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#f3f4f6").attr("stroke-width", 1);

    // Axes
    g.append("g").attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(3))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 10));

    // ȳ horizontal reference line (always visible)
    g.append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", yScale(meanY)).attr("y2", yScale(meanY))
      .attr("stroke", C_MEAN).attr("stroke-width", 1.5).attr("stroke-dasharray", "6,3");
    g.append("text")
      .attr("x", W + 4).attr("y", yScale(meanY) + 4)
      .attr("font-size", 9).attr("fill", C_MEAN).attr("font-weight", "600").text("ȳ");

    // ── Mode-specific residual segments ────────────────────────────────────────
    const segW = 2.5;

    if (mode === "total") {
      points.forEach(p => {
        g.append("line")
          .attr("x1", xScale(p.x)).attr("x2", xScale(p.x))
          .attr("y1", yScale(p.y)).attr("y2", yScale(meanY))
          .attr("stroke", C_TSS).attr("stroke-width", segW).attr("opacity", 0.65);
      });
    }

    if (mode === "residual") {
      points.forEach(p => {
        const yhat = slope * p.x + intercept;
        g.append("line")
          .attr("x1", xScale(p.x)).attr("x2", xScale(p.x))
          .attr("y1", yScale(p.y)).attr("y2", yScale(yhat))
          .attr("stroke", C_RSS).attr("stroke-width", segW).attr("opacity", 0.7);
      });
    }

    if (mode === "decompose") {
      points.forEach(p => {
        const yhat = slope * p.x + intercept;
        // ESS portion: ȳ → ŷᵢ  (what regression explains)
        if (Math.abs(yhat - meanY) > 1e-3) {
          g.append("line")
            .attr("x1", xScale(p.x)).attr("x2", xScale(p.x))
            .attr("y1", yScale(meanY)).attr("y2", yScale(yhat))
            .attr("stroke", C_ESS).attr("stroke-width", segW).attr("opacity", 0.75);
        }
        // RSS portion: ŷᵢ → yᵢ  (what regression cannot explain)
        if (Math.abs(p.y - yhat) > 1e-3) {
          g.append("line")
            .attr("x1", xScale(p.x)).attr("x2", xScale(p.x))
            .attr("y1", yScale(yhat)).attr("y2", yScale(p.y))
            .attr("stroke", C_RSS).attr("stroke-width", segW).attr("opacity", 0.75);
        }
      });
    }

    // ── OLS regression line ────────────────────────────────────────────────────
    g.append("line")
      .attr("x1", xScale(xLo)).attr("x2", xScale(xHi))
      .attr("y1", yScale(slope * xLo + intercept))
      .attr("y2", yScale(slope * xHi + intercept))
      .attr("stroke", C_REG).attr("stroke-width", 2.2)
      .attr("opacity", mode === "total" ? 0.18 : 1)
      .attr("stroke-dasharray", mode === "total" ? "4,4" : "");

    // ── Data points (draggable) ────────────────────────────────────────────────
    const drag = d3.drag<SVGCircleElement, DataPoint>()
      .on("start", function() { d3.select(this).raise().attr("r", 10); })
      .on("drag", function(event, d) {
        const nx = Math.max(xLo + 0.1, Math.min(xHi - 0.1, xScale.invert(event.x)));
        const ny = Math.max(yLo + 0.1, Math.min(yHi - 0.1, yScale.invert(event.y)));
        onMoveRef.current(d.id, nx, ny);
      })
      .on("end", function() { d3.select(this).attr("r", 7); });

    const circles = g.selectAll<SVGCircleElement, DataPoint>("circle")
      .data(points)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 7)
      .attr("fill", "#1e40af")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "grab")
      .on("dblclick", (_, d) => onRemoveRef.current(d.id));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    circles.call(drag as any);

  }, [points, slope, intercept, meanY, mode, xDomain, yDomain, height]);

  return <svg ref={svgRef} className="w-full" />;
}
