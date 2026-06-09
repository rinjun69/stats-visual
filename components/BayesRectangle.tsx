"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface BayesRectProps {
  prevalence:  number;  // 0-1
  sensitivity: number;  // 0-1
  specificity: number;  // 0-1
  height?: number;
}

const C_TP = "#dc2626";  // red-600
const C_FP = "#ea580c";  // orange-600
const C_FN = "#fca5a5";  // red-300 (light)
const C_TN = "#d1d5db";  // gray-300

export default function BayesRectangle({ prevalence, sensitivity, specificity, height = 320 }: BayesRectProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 440;
    const N = 10000;

    // Proportional areas
    const tp_p = prevalence * sensitivity;
    const fp_p = (1 - prevalence) * (1 - specificity);
    const fn_p = prevalence * (1 - sensitivity);
    // tn_p = (1-prevalence) * specificity (implicit)

    // Natural frequencies out of N
    const tp  = Math.round(N * tp_p);
    const fp  = Math.round(N * fp_p);
    const fn_ = Math.round(N * fn_p);
    const tn  = N - tp - fp - fn_;
    const totalPos = tp + fp;
    const ppv = totalPos > 0 ? tp / totalPos : 0;

    const margin = { top: 12, right: 12, bottom: 80, left: 46 };
    const W = width  - margin.left - margin.right;
    const H = height - margin.top  - margin.bottom;

    const g = svg.attr("height", height).append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Disease column pixel width (enforce visual minimum so label is always legible)
    const dW_true  = prevalence * W;
    const dW       = Math.max(dW_true, 6);  // min 6px for visual
    const notToScale = dW_true < 6;
    const hW       = W - dW;

    // Split heights inside each column
    const tpH = sensitivity  * H;           // positive portion of disease column
    const fpH = (1 - specificity) * H;     // positive portion of healthy column

    // ── Quadrants ────────────────────────────────────────────────────────────
    g.append("rect").attr("x", 0).attr("y", 0)
      .attr("width", dW).attr("height", tpH).attr("fill", C_TP);
    g.append("rect").attr("x", 0).attr("y", tpH)
      .attr("width", dW).attr("height", H - tpH).attr("fill", C_FN);
    g.append("rect").attr("x", dW).attr("y", 0)
      .attr("width", hW).attr("height", fpH).attr("fill", C_FP);
    g.append("rect").attr("x", dW).attr("y", fpH)
      .attr("width", hW).attr("height", H - fpH).attr("fill", C_TN);

    // Column separator
    g.append("line")
      .attr("x1", dW).attr("x2", dW).attr("y1", 0).attr("y2", H)
      .attr("stroke", "white").attr("stroke-width", 1.5);

    // Border
    g.append("rect").attr("x", 0).attr("y", 0)
      .attr("width", W).attr("height", H)
      .attr("fill", "none").attr("stroke", "#9ca3af").attr("stroke-width", 1);

    // ── Quadrant labels ───────────────────────────────────────────────────────
    const qLabel = (
      x: number, y: number, w: number, h: number,
      count: number, sub: string, lightText: boolean
    ) => {
      const minW = 24, minH = 16;
      if (w < minW || h < minH) return;
      const fs = Math.min(11, Math.min(w * 0.28, h * 0.28));
      const cx = x + w / 2;
      const cy = y + h / 2;
      g.append("text")
        .attr("x", cx).attr("y", cy - 1)
        .attr("text-anchor", "middle").attr("font-size", fs)
        .attr("font-weight", "700")
        .attr("fill", lightText ? "rgba(255,255,255,0.95)" : "#374151")
        .text(count.toLocaleString());
      if (h > 30) {
        g.append("text")
          .attr("x", cx).attr("y", cy + fs + 2)
          .attr("text-anchor", "middle").attr("font-size", Math.min(9, fs * 0.85))
          .attr("fill", lightText ? "rgba(255,255,255,0.75)" : "#6b7280")
          .text(sub);
      }
    };

    qLabel(0, 0, dW, tpH, tp, "真陽性", true);
    qLabel(0, tpH, dW, H - tpH, fn_, "偽陰性", false);
    qLabel(dW, 0, hW, fpH, fp, "偽陽性", true);
    qLabel(dW, fpH, hW, H - fpH, tn, "真陰性", false);

    // ── Y-axis labels ─────────────────────────────────────────────────────────
    const midPosY = (tpH + fpH) / 4;         // rough middle of positive zone
    const midNegY = (tpH + fpH) / 4 + H / 2; // rough middle of negative zone

    [
      { y: Math.min(H * 0.35, tpH / 2 + 4), label: "陽性" },
      { y: Math.max(H * 0.65, tpH + (H - tpH) / 2 + 4), label: "陰性" },
    ].forEach(({ y, label }) => {
      void midPosY; void midNegY;  // suppress TS unused warning
      g.append("text").attr("x", -6).attr("y", y)
        .attr("text-anchor", "end").attr("dominant-baseline", "middle")
        .attr("font-size", 10).attr("fill", "#4b5563").text(label);
    });

    // ── X-axis labels ─────────────────────────────────────────────────────────
    const xLY = H + 14;
    g.append("text").attr("x", dW / 2).attr("y", xLY)
      .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#4b5563")
      .text(notToScale ? "病↑" : "病気あり");
    if (!notToScale && dW > 24) {
      g.append("text").attr("x", dW / 2).attr("y", xLY + 12)
        .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#9ca3af")
        .text(`${(prevalence * 100).toFixed(1)}%`);
    }

    g.append("text").attr("x", dW + hW / 2).attr("y", xLY)
      .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#4b5563")
      .text("病気なし");
    g.append("text").attr("x", dW + hW / 2).attr("y", xLY + 12)
      .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#9ca3af")
      .text(`${((1 - prevalence) * 100).toFixed(1)}%`);

    if (notToScale) {
      g.append("text").attr("x", 0).attr("y", H + 38)
        .attr("font-size", 8).attr("fill", "#9ca3af")
        .attr("font-style", "italic")
        .text("（病気あり列は表示上拡大）");
    }

    // ── PPV zoom bar ──────────────────────────────────────────────────────────
    if (totalPos > 0) {
      const barY = H + (notToScale ? 52 : 40);
      const barH = 22;

      g.append("rect").attr("x", 0).attr("y", barY)
        .attr("width", ppv * W).attr("height", barH)
        .attr("fill", C_TP).attr("rx", 2);
      g.append("rect").attr("x", ppv * W).attr("y", barY)
        .attr("width", (1 - ppv) * W).attr("height", barH)
        .attr("fill", C_FP).attr("rx", 2);

      if (ppv * W > 28) {
        g.append("text")
          .attr("x", ppv * W / 2).attr("y", barY + barH / 2 + 4)
          .attr("text-anchor", "middle").attr("fill", "white")
          .attr("font-size", 11).attr("font-weight", "700")
          .text(`${(ppv * 100).toFixed(0)}%`);
      }
      if ((1 - ppv) * W > 28) {
        g.append("text")
          .attr("x", ppv * W + (1 - ppv) * W / 2).attr("y", barY + barH / 2 + 4)
          .attr("text-anchor", "middle").attr("fill", "white")
          .attr("font-size", 11).attr("font-weight", "700")
          .text(`${((1 - ppv) * 100).toFixed(0)}%`);
      }

      g.append("text").attr("x", W / 2).attr("y", barY + barH + 14)
        .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#6b7280")
        .text(`陽性判定 ${totalPos.toLocaleString()} 人の内訳（万人あたり）`);
    }

  }, [prevalence, sensitivity, specificity, height]);

  return <svg ref={svgRef} className="w-full" />;
}
