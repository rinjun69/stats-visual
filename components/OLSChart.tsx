"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

export interface DataPoint { id: number; x: number; y: number; }

export interface OLSChartProps {
  points: DataPoint[];
  olsSlope: number;
  olsIntercept: number;
  userSlope?: number;
  userIntercept?: number;
  showOLS?: boolean;
  showResiduals?: boolean;
  xDomain?: [number, number];
  yDomain?: [number, number];
  onPointMove: (id: number, x: number, y: number) => void;
  onPointRemove?: (id: number) => void;
  height?: number;
}

const C_OLS   = "#2563eb";
const C_USER  = "#d97706";
const C_RESID = "#ef4444";
const C_PT    = "#1e40af";

export default function OLSChart({
  points,
  olsSlope, olsIntercept,
  userSlope, userIntercept,
  showOLS = true,
  showResiduals = true,
  xDomain = [0, 11],
  yDomain = [-1, 12],
  onPointMove,
  onPointRemove,
  height = 340,
}: OLSChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onPointMoveRef   = useRef(onPointMove);
  const onPointRemoveRef = useRef(onPointRemove);
  onPointMoveRef.current   = onPointMove;
  onPointRemoveRef.current = onPointRemove;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width  = svgRef.current?.clientWidth || 520;
    const margin = { top: 16, right: 20, bottom: 36, left: 42 };
    const W = width  - margin.left - margin.right;
    const H = height - margin.top  - margin.bottom;

    const [xMin, xMax] = xDomain;
    const [yMin, yMax] = yDomain;
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, W]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([H, 0]);

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid
    g.selectAll(".vg").data(xScale.ticks(6)).enter().append("line")
      .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
      .attr("y1", 0).attr("y2", H)
      .attr("stroke", "#e5e7eb").attr("stroke-width", 1);

    g.selectAll(".hg").data(yScale.ticks(6)).enter().append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#e5e7eb").attr("stroke-width", 1);

    // Axes
    g.append("g").attr("transform", `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(4))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 11));

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(6).tickSize(4))
      .call(ax => ax.select(".domain").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick line").attr("stroke", "#d1d5db"))
      .call(ax => ax.selectAll(".tick text").attr("fill", "#9ca3af").attr("font-size", 11));

    // Residual lines (under points)
    if (showResiduals && points.length > 0) {
      const rSlope     = (userSlope     !== undefined) ? userSlope     : olsSlope;
      const rIntercept = (userIntercept !== undefined) ? userIntercept : olsIntercept;
      const rColor     = (userSlope     !== undefined) ? C_USER        : C_RESID;

      points.forEach(p => {
        const ŷ = rSlope * p.x + rIntercept;
        g.append("line")
          .attr("x1", xScale(p.x)).attr("x2", xScale(p.x))
          .attr("y1", yScale(p.y)).attr("y2", yScale(ŷ))
          .attr("stroke", rColor).attr("stroke-width", 1.8).attr("opacity", 0.65);
      });
    }

    // OLS regression line
    if (showOLS) {
      g.append("line")
        .attr("x1", xScale(xMin)).attr("y1", yScale(olsSlope * xMin + olsIntercept))
        .attr("x2", xScale(xMax)).attr("y2", yScale(olsSlope * xMax + olsIntercept))
        .attr("stroke", C_OLS).attr("stroke-width", 2.5);

      const labelY = yScale(olsSlope * xMax + olsIntercept);
      g.append("text")
        .attr("x", W - 6).attr("y", Math.max(12, Math.min(H - 4, labelY - 8)))
        .attr("text-anchor", "end")
        .attr("font-size", 11).attr("font-weight", "700").attr("fill", C_OLS)
        .text("OLS");
    }

    // User's line (challenge mode)
    if (userSlope !== undefined && userIntercept !== undefined) {
      g.append("line")
        .attr("x1", xScale(xMin)).attr("y1", yScale(userSlope * xMin + userIntercept))
        .attr("x2", xScale(xMax)).attr("y2", yScale(userSlope * xMax + userIntercept))
        .attr("stroke", C_USER).attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "8,4");

      const labelY = yScale(userSlope * xMax + userIntercept);
      g.append("text")
        .attr("x", W - 6).attr("y", Math.max(12, Math.min(H - 4, labelY + 14)))
        .attr("text-anchor", "end")
        .attr("font-size", 11).attr("font-weight", "700").attr("fill", C_USER)
        .text("あなた");
    }

    // Drag behavior
    const drag = d3.drag<SVGCircleElement, DataPoint>()
      .on("start", function() {
        d3.select(this).raise().attr("r", 10).attr("cursor", "grabbing");
      })
      .on("drag", function(event, d) {
        const newX = Math.max(xMin + 0.05, Math.min(xMax - 0.05, xScale.invert(event.x)));
        const newY = Math.max(yMin + 0.05, Math.min(yMax - 0.05, yScale.invert(event.y)));
        onPointMoveRef.current(d.id, newX, newY);
      })
      .on("end", function() {
        d3.select(this).attr("r", 7).attr("cursor", "grab");
      });

    // Data points
    const circles = g.selectAll<SVGCircleElement, DataPoint>(".pt")
      .data(points)
      .enter()
      .append<SVGCircleElement>("circle")
      .attr("class", "pt")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 7)
      .attr("fill", C_PT)
      .attr("fill-opacity", 0.85)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("cursor", "grab");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    circles.call(drag as any);

    if (onPointRemoveRef.current) {
      circles.on("dblclick", function(event: Event, d: DataPoint) {
        event.preventDefault();
        event.stopPropagation();
        onPointRemoveRef.current?.(d.id);
      });
    }

  }, [points, olsSlope, olsIntercept, userSlope, userIntercept, showOLS, showResiduals, xDomain, yDomain, height]);

  return <svg ref={svgRef} className="w-full" />;
}
