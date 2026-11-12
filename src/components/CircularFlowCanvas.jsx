import React, { useEffect, useRef, useState } from "react";

const NODES = [
  {
    id: "seller",
    label: "01 · SELLER LISTING",
    sub: "Area-Only Privacy Shield",
    telemetry: "Scrap declared · Contact hidden",
    status: "Open for Offers",
    xPercent: 0.14,
    yPercent: 0.30,
    color: "#a3e635"
  },
  {
    id: "collection",
    label: "02 · COLLECTOR PICKUP",
    sub: "Scheduled Handover",
    telemetry: "Pickup batch staged & weighed",
    status: "Pickup Planned",
    xPercent: 0.32,
    yPercent: 0.74,
    color: "#38bdf8"
  },
  {
    id: "aggregation",
    label: "03 · CONSIGNMENT OFFERS",
    sub: "1-Bid-Per-Recycler Rule",
    telemetry: "Bids compared before acceptance",
    status: "Offers Under Review",
    xPercent: 0.52,
    yPercent: 0.34,
    color: "#f59e0b"
  },
  {
    id: "recycler",
    label: "04 · FACILITY INTAKE",
    sub: "Weighbridge Reconciliation",
    telemetry: "Receiving weight checked vs declared",
    status: "Tolerance Checked",
    xPercent: 0.72,
    yPercent: 0.74,
    color: "#c084fc"
  },
  {
    id: "traceability",
    label: "05 · COMPLIANCE LOG",
    sub: "Audited History Record",
    telemetry: "Processing note & status archived",
    status: "Cycle Closed",
    xPercent: 0.87,
    yPercent: 0.30,
    color: "#a3e635"
  }
];

export function CircularFlowCanvas({ activeStageId, onSelectStage }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const animationFrameId = useRef(null);
  const isVisible = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;
    let time = 0;
    let cancelled = false;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.max(Math.floor(rect.height), 260);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 15 }).map((_, i) => ({
      progress: i / 15,
      speed: 0.0016 + (i % 3) * 0.0003,
      size: 2.2 + (i % 3) * 1.0
    }));

    let mousePos = { x: -100, y: -100 };

    function onMouseMove(e) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      let found = null;
      NODES.forEach((node) => {
        const nx = node.xPercent * width;
        const ny = node.yPercent * height;
        const dist = Math.hypot(mousePos.x - nx, mousePos.y - ny);
        if (dist < 32) found = node;
      });
      setHoveredNode(found);
    }

    function onMouseLeave() {
      mousePos = { x: -100, y: -100 };
      setHoveredNode(null);
    }

    function onClick(e) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      NODES.forEach((node) => {
        const nx = node.xPercent * width;
        const ny = node.yPercent * height;
        const dist = Math.hypot(clickX - nx, clickY - ny);
        if (dist < 34 && onSelectStage) {
          onSelectStage(node.id);
        }
      });
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onClick);

    function getPointOnCircuit(t) {
      const count = NODES.length;
      const totalT = (t % 1) * count;
      const idx = Math.floor(totalT) % count;
      const nextIdx = (idx + 1) % count;
      const subT = totalT - idx;

      const n1 = NODES[idx];
      const n2 = NODES[nextIdx];

      const x1 = n1.xPercent * width;
      const y1 = n1.yPercent * height;
      const x2 = n2.xPercent * width;
      const y2 = n2.yPercent * height;

      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 + (idx % 2 === 0 ? -16 : 16);

      const oneMinusT = 1 - subT;
      const x = oneMinusT * oneMinusT * x1 + 2 * oneMinusT * subT * mx + subT * subT * x2;
      const y = oneMinusT * oneMinusT * y1 + 2 * oneMinusT * subT * my + subT * subT * y2;

      return { x, y };
    }

    function drawFrame() {
      if (cancelled || width <= 0) return;

      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      const labelColor = isLight ? "#0f172a" : "#e5e7eb";
      const subColor = isLight ? "#475569" : "#9ca3af";
      const activeTextColor = isLight ? "#15803d" : "#a3e635";
      const lineStroke = isLight ? "rgba(21, 128, 61, 0.25)" : "rgba(163, 230, 53, 0.16)";
      const ringMutedStroke = isLight ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.14)";
      const nodeBg = isLight ? "#ffffff" : "#111418";

      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1.5;
      for (let i = 0; i < NODES.length; i++) {
        const next = (i + 1) % NODES.length;
        const n1 = NODES[i];
        const n2 = NODES[next];

        const x1 = n1.xPercent * width;
        const y1 = n1.yPercent * height;
        const x2 = n2.xPercent * width;
        const y2 = n2.yPercent * height;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 + (i % 2 === 0 ? -16 : 16);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(mx, my, x2, y2);
        ctx.strokeStyle = lineStroke;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (!prefersReducedMotion) {
        particles.forEach((p) => {
          p.progress += p.speed;
          if (p.progress >= 1) p.progress -= 1;
          const pos = getPointOnCircuit(p.progress);

          const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, p.size * 2.4);
          glow.addColorStop(0, isLight ? "rgba(21, 128, 61, 0.85)" : "rgba(163, 230, 53, 0.92)");
          glow.addColorStop(1, "rgba(163, 230, 53, 0)");

          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      NODES.forEach((node) => {
        const nx = node.xPercent * width;
        const ny = node.yPercent * height;
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = activeStageId === node.id;

        const ringPulse = prefersReducedMotion ? 0 : Math.sin(time * 2 + node.xPercent * 5) * 2.5;
        const ringRadius = 17 + (isHovered || isSelected ? 5 : 0) + ringPulse;

        ctx.beginPath();
        ctx.arc(nx, ny, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected
          ? activeTextColor
          : isHovered
            ? "rgba(163, 230, 53, 0.5)"
            : ringMutedStroke;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(nx, ny, isSelected ? 11 : 8.5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? activeTextColor : nodeBg;
        ctx.fill();
        ctx.strokeStyle = isSelected ? (isLight ? "#0f172a" : "#ffffff") : node.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.fillStyle = isSelected ? activeTextColor : labelColor;
        ctx.textAlign = "center";
        ctx.fillText(node.label, nx, ny + 30);

        ctx.font = "400 11px 'Inter', sans-serif";
        ctx.fillStyle = subColor;
        ctx.fillText(node.sub, nx, ny + 45);

        if (isHovered || isSelected) {
          const tipText = node.telemetry;
          ctx.font = "500 10.5px 'JetBrains Mono', monospace";
          const textMetrics = ctx.measureText(tipText);
          const boxWidth = textMetrics.width + 22;
          const boxHeight = 25;
          const boxX = Math.max(8, Math.min(width - boxWidth - 8, nx - boxWidth / 2));
          const boxY = Math.max(8, ny - 46);

          ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.94)" : "rgba(17, 20, 24, 0.94)";
          ctx.strokeStyle = isSelected ? "rgba(163, 230, 53, 0.7)" : "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isSelected ? "#a3e635" : "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(tipText, boxX + boxWidth / 2, boxY + 16.5);
        }
      });

      if (!prefersReducedMotion && isVisible.current && !cancelled) {
        animationFrameId.current = requestAnimationFrame(drawFrame);
      } else {
        animationFrameId.current = null;
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      const nowVisible = entry.isIntersecting;
      isVisible.current = nowVisible;
      if (nowVisible && !prefersReducedMotion && !animationFrameId.current && !cancelled) {
        animationFrameId.current = requestAnimationFrame(drawFrame);
      } else if (!nowVisible && animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);

    drawFrame();

    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      observer.disconnect();
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("click", onClick);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [activeStageId, hoveredNode, onSelectStage]);

  return (
    <div className="circular-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="circular-flow-canvas" />
      <div className="canvas-overlay-legend">
        <span className="legend-indicator">
          <span className="live-pulse-dot" /> INTERACTIVE STAGE MAP
        </span>
        <span className="legend-hint">SELECT ANY NODE TO VIEW ROLE & RULES</span>
      </div>
    </div>
  );
}
