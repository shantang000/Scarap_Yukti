import React, { useEffect, useRef, useState } from "react";

const NODES = [
  {
    id: "seller",
    label: "01 · GENERATOR INTAKE",
    sub: "Enterprise & Household Disposal",
    telemetry: "Scrap declared · Privacy shielded",
    status: "Verified PII Guard",
    xPercent: 0.16,
    yPercent: 0.28,
    color: "#a3e635"
  },
  {
    id: "collection",
    label: "02 · CUSTODY HANDOVER",
    sub: "Portable Load-Cell Scale",
    telemetry: "Verified tare: 84.5 kg · OTP: 6-digit match",
    status: "Custody Validated",
    xPercent: 0.32,
    yPercent: 0.76,
    color: "#38bdf8"
  },
  {
    id: "aggregation",
    label: "03 · CONSIGNMENT VAULT",
    sub: "Aggregator Bulk Bundling",
    telemetry: "Consignment sealed · 1-bid-per-lot active",
    status: "Bids Open",
    xPercent: 0.52,
    yPercent: 0.35,
    color: "#f59e0b"
  },
  {
    id: "recycler",
    label: "04 · SMELTER WEIGHBRIDGE",
    sub: "Facility Weighbridge Intake",
    telemetry: "Gross: 120.0 kg · Net variance: +0.4% [PASS]",
    status: "Tolerance Check Passed",
    xPercent: 0.72,
    yPercent: 0.76,
    color: "#c084fc"
  },
  {
    id: "traceability",
    label: "05 · AUDIT & EPR LEDGER",
    sub: "Audited Event Chain",
    telemetry: "Database timestamped · Mass-balance closed",
    status: "Cycle Certified",
    xPercent: 0.86,
    yPercent: 0.28,
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

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.max(Math.floor(rect.height), 280);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    // Intersection observer to pause when off-screen
    const observer = new IntersectionObserver(([entry]) => {
      isVisible.current = entry.isIntersecting;
    });
    if (containerRef.current) observer.observe(containerRef.current);

    // Particle system simulating material / custody flow along the polygon
    const particles = Array.from({ length: 24 }).map((_, i) => ({
      progress: i / 24,
      speed: 0.0018 + (i % 3) * 0.0004,
      size: 2.5 + (i % 3) * 1.2,
      pulse: Math.random() * Math.PI * 2
    }));

    let mousePos = { x: -100, y: -100 };

    function onMouseMove(e) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // Check hover on nodes
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
      // Loop: 0->1->2->3->4->0
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

      // Curved control point for subtle organic arc
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 + (idx % 2 === 0 ? -18 : 18);

      // Quadratic bezier
      const oneMinusT = 1 - subT;
      const x = oneMinusT * oneMinusT * x1 + 2 * oneMinusT * subT * mx + subT * subT * x2;
      const y = oneMinusT * oneMinusT * y1 + 2 * oneMinusT * subT * my + subT * subT * y2;

      return { x, y, segment: idx };
    }

    let time = 0;

    function render() {
      if (!isVisible.current) {
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }

      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Draw connecting conduits between nodes
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
        const my = (y1 + y2) / 2 + (i % 2 === 0 ? -18 : 18);

        // Base track
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(mx, my, x2, y2);
        ctx.strokeStyle = "rgba(163, 230, 53, 0.14)";
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw flowing particles
      if (!prefersReducedMotion) {
        particles.forEach((p) => {
          p.progress += p.speed;
          if (p.progress >= 1) p.progress -= 1;
          const pos = getPointOnCircuit(p.progress);

          // Glow gradient
          const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, p.size * 2.5);
          glow.addColorStop(0, "rgba(163, 230, 53, 0.95)");
          glow.addColorStop(0.5, "rgba(163, 230, 53, 0.4)");
          glow.addColorStop(1, "rgba(163, 230, 53, 0)");

          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, p.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw nodes
      NODES.forEach((node) => {
        const nx = node.xPercent * width;
        const ny = node.yPercent * height;
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = activeStageId === node.id;

        // Outer pulsing ring
        const ringPulse = Math.sin(time * 2 + node.xPercent * 5) * 3;
        const ringRadius = 18 + (isHovered || isSelected ? 6 : 0) + ringPulse;

        ctx.beginPath();
        ctx.arc(nx, ny, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected
          ? "rgba(163, 230, 53, 0.85)"
          : isHovered
            ? "rgba(163, 230, 53, 0.5)"
            : "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Node core circle
        ctx.beginPath();
        ctx.arc(nx, ny, isSelected ? 12 : 9, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "#a3e635" : "#111418";
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#ffffff" : node.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Node Label
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.fillStyle = isSelected ? "#a3e635" : "#e5e7eb";
        ctx.textAlign = "center";
        ctx.fillText(node.label, nx, ny + 32);

        ctx.font = "400 10px 'Inter', sans-serif";
        ctx.fillStyle = "#9ca3af";
        ctx.fillText(node.sub, nx, ny + 46);

        // Hover or Active Telemetry Tooltip
        if (isHovered || isSelected) {
          const tipText = node.telemetry;
          ctx.font = "500 10.5px 'JetBrains Mono', monospace";
          const textMetrics = ctx.measureText(tipText);
          const boxWidth = textMetrics.width + 24;
          const boxHeight = 26;
          const boxX = nx - boxWidth / 2;
          const boxY = ny - 48;

          ctx.fillStyle = "rgba(17, 20, 24, 0.94)";
          ctx.strokeStyle = isSelected ? "rgba(163, 230, 53, 0.7)" : "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 1;

          // Rounded rect tooltip
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isSelected ? "#a3e635" : "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(tipText, nx, boxY + 17);
        }
      });

      if (!prefersReducedMotion) {
        animationFrameId.current = requestAnimationFrame(render);
      }
    }

    render();

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("click", onClick);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [activeStageId, hoveredNode, onSelectStage]);

  return (
    <div className="circular-canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} className="circular-flow-canvas" />
      <div className="canvas-overlay-legend">
        <span className="legend-indicator">
          <span className="live-pulse-dot" /> 60 FPS PHYSICAL CUSTODY CIRCUIT
        </span>
        <span className="legend-hint">CLICK ANY NODE TO INSPECT TELEMETRY</span>
      </div>
    </div>
  );
}
