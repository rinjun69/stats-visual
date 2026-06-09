"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { normalPDF, normalCDF } from "@/lib/prob";

interface ZScoreChartProps {
  mu: number;
  sigma: number;
  x: number;
  onXChange: (x: number) => void;
  height?: number;
}

export default function ZScoreChart({ mu, sigma, x, onXChange, height = 320 }: ZScoreChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onXChangeRef = useRef(onXChange);
  onXChangeRef.current = onXChange;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 600;
    const margin = { top: 28, right: 24, bottom: 58, left: 24 };
    const W = width  - margin.left - margin.right;
    const H = height - margin.top  - margin.bottom;

    const xMin = mu - 4 * sigma;
    const xMax = mu + 4 * sigma;
    const pts  = 300;
    const xs   = d3.range(xMin, xMax + (xMax - xMin) / pts, (xMax - xMin) / pts);

    const peak   = normalPDF(mu, mu, sigma);
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, W]);
    const yScale = d3.scaleLinear().domain([0, peak * 1.15]).range([H, 0]);

    const cx = Math.max(xMin, Math.min(xMax, x));
    const z  = (cx - mu) / sigma;
    const T  = 10 * z + 50;
    const pctile = normalCDF(z) * 100;
    const topPct = 100 - pctile;

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Light grid
    g.selectAll(".hg").data(yScale.ticks(4)).enter().append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "#f3f4f6").attr("stroke-width", 1);

    // Shaded area (cumulative up to x)
    const shadeXs = [...xs.filter(xi => xi <= cx), cx];
    g.append("path")
      .datum(shadeXs)
      .attr("d", d3.area<number>()
        .x(xi => xScale(xi)).y0(H).y1(xi => yScale(normalPDF(xi, mu, sigma)))
        .curve(d3.curveBasis))
      .attr("fill", "#2563eb").attr("opacity", 0.18);

    // Normal curve
    g.append("path")
      .datum(xs)
      .attr("d", d3.line<number>()
        .x(xi => xScale(xi)).y(xi => yScale(normalPDF(xi, mu, sigma)))
        .curve(d3.curveBasis))
      .attr("fill", "none").attr("stroke", "#2563eb").attr("stroke-width", 2.5);

    // X-axis baseline
    g.append("line")
      .attr("x1", 0).attr("x2", W).attr("y1", H).attr("y2", H)
      .attr("stroke", "#d1d5db").attr("stroke-width", 1);

    // σ markers on x-axis
    for (let k = -3; k <= 3; k++) {
      const xk = mu + k * sigma;
      if (xk < xMin || xk > xMax) continue;
      const px = xScale(xk);
      g.append("line")
        .attr("x1", px).attr("x2", px).attr("y1", H - 3).attr("y2", H + 6)
        .attr("stroke", "#9ca3af").attr("stroke-width", k === 0 ? 1.5 : 1);
      // σ notation
      g.append("text")
        .attr("x", px).attr("y", H + 18)
        .attr("text-anchor", "middle").attr("font-size", 9)
        .attr("fill", k === 0 ? "#374151" : "#9ca3af")
        .attr("font-weight", k === 0 ? "700" : "400")
        .text(k === 0 ? "μ" : `${k > 0 ? "+" : ""}${k}σ`);
      // Numeric value below
      g.append("text")
        .attr("x", px).attr("y", H + 30)
        .attr("text-anchor", "middle").attr("font-size", 8)
        .attr("fill", "#c4c9d4")
        .text(sigma >= 10 ? mu + k * sigma : (mu + k * sigma).toFixed(1));
    }

    // Vertical line at current x
    g.append("line")
      .attr("x1", xScale(cx)).attr("x2", xScale(cx))
      .attr("y1", 0).attr("y2", H)
      .attr("stroke", "#f97316").attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,3");

    // Drag / click overlay (transparent, covers full chart area)
    const drag = d3.drag<SVGRectElement, unknown>()
      .on("start drag", function(event) {
        const raw = xScale.invert(event.x);
        onXChangeRef.current(Math.max(xMin, Math.min(xMax, raw)));
      });

    g.append("rect")
      .attr("x", 0).attr("y", 0).attr("width", W).attr("height", H)
      .attr("fill", "transparent").style("cursor", "crosshair")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(drag as any);

    // Orange drag-handle circle (decorative, pointer-events off so overlay fires)
    g.append("circle")
      .attr("cx", xScale(cx)).attr("cy", H)
      .attr("r", 9).attr("fill", "#f97316").attr("stroke", "white").attr("stroke-width", 2.5)
      .attr("pointer-events", "none");

    // x value label below handle
    const anchor = xScale(cx) > W - 60 ? "end" : xScale(cx) < 60 ? "start" : "middle";
    g.append("text")
      .attr("x", xScale(cx)).attr("y", H + 44)
      .attr("text-anchor", anchor).attr("font-size", 11).attr("font-weight", "700")
      .attr("fill", "#f97316").attr("pointer-events", "none")
      .text(`x = ${cx.toFixed(sigma < 5 ? 2 : 1)}`);

    // ── Callout box ───────────────────────────────────────────────────────────
    const bW = 108, bH = 62;
    const bx = xScale(cx) + 12 > W - bW ? xScale(cx) - bW - 12 : xScale(cx) + 12;
    const by = 2;

    const cg = g.append("g").attr("pointer-events", "none");
    cg.append("rect")
      .attr("x", bx).attr("y", by).attr("width", bW).attr("height", bH)
      .attr("fill", "white").attr("stroke", "#f97316").attr("stroke-width", 1.5)
      .attr("rx", 6).attr("filter", "drop-shadow(0 1px 4px rgba(0,0,0,0.10))");

    cg.append("text")
      .attr("x", bx + bW / 2).attr("y", by + 18)
      .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", "800")
      .attr("fill", "#f97316")
      .text(`z = ${z >= 0 ? "+" : ""}${z.toFixed(2)}`);

    cg.append("text")
      .attr("x", bx + bW / 2).attr("y", by + 35)
      .attr("text-anchor", "middle").attr("font-size", 13).attr("font-weight", "800")
      .attr("fill", "#7c3aed")
      .text(`偏差値 ${T.toFixed(1)}`);

    cg.append("text")
      .attr("x", bx + bW / 2).attr("y", by + 51)
      .attr("text-anchor", "middle").attr("font-size", 9)
      .attr("fill", "#6b7280")
      .text(`上位 ${topPct.toFixed(1)}%  /  ${pctile.toFixed(1)} パーセンタイル`);

    // Percentile annotation inside shaded area
    if (pctile > 12 && pctile < 92) {
      const midX = xScale(xMin + (cx - xMin) / 2);
      g.append("text")
        .attr("x", midX).attr("y", H * 0.68)
        .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", "700")
        .attr("fill", "#1d4ed8").attr("pointer-events", "none")
        .text(`${pctile.toFixed(1)}%`);
    }

  }, [mu, sigma, x, height]);

  return <svg ref={svgRef} className="w-full" style={{ touchAction: "none" }} />;
}
