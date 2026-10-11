import React, { useRef, useEffect } from 'react';
import { TopologyType, SimStep, ProbedComponent } from '../types';

interface VectorSchematicEngineProps {
  topology: TopologyType;
  currentStep: SimStep | null;
  R: number;
  L: number;
  Vs: number;
  hasFD: boolean;
  probeMode: boolean;
  probedComponent: string;
  onSelectComponent: (componentId: string) => void;
  speed?: number;
}

export const VectorSchematicEngine: React.FC<VectorSchematicEngineProps> = ({
  topology,
  currentStep,
  R,
  L,
  Vs,
  hasFD,
  probeMode,
  probedComponent,
  onSelectComponent,
  speed = 0.25,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hitBoxesRef = useRef<ProbedComponent[]>([]);
  const particlesRef = useRef<Array<{ pos: number }>>(
    Array.from({ length: 48 }, () => ({ pos: Math.random() }))
  );
  const sparkTimerRef = useRef<number>(0);
  const sparkDeviceRef = useRef<string | null>(null);

  // Trigger gate spark when firingDevice appears (extended timer for clear visual observation)
  useEffect(() => {
    if (currentStep?.firingDevice) {
      sparkTimerRef.current = 28;
      sparkDeviceRef.current = currentStep.firingDevice;
    }
  }, [currentStep?.firingDevice, currentStep?.deg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const W = rect.width;
      const H = rect.height;

      // Draw dark laboratory technical grid background
      drawGridBackground(ctx, W, H);

      hitBoxesRef.current = [];

      if (currentStep) {
        let activePath: Array<{ x: number; y: number }> = [];

        if (topology.startsWith('1p_hw')) {
          activePath = drawSinglePhaseHalfWave(ctx, W, H, topology, currentStep, R, L, hasFD);
        } else if (topology === '1p_fw_midpoint') {
          activePath = drawCenterTappedMidpoint(ctx, W, H, currentStep, R, L);
        } else if (topology.startsWith('1p_fw')) {
          activePath = drawSinglePhaseBridge(ctx, W, H, topology, currentStep, R, L);
        } else if (topology.startsWith('3p_hw')) {
          activePath = drawThreePhaseHalfWave(ctx, W, H, topology, currentStep, R, L);
        } else if (topology.startsWith('3p_fw')) {
          activePath = drawThreePhaseBridge(ctx, W, H, topology, currentStep, R, L);
        }

        // Draw physical current flow along path
        renderCurrentConduction(ctx, activePath, currentStep.io, currentStep.pathRoute, particlesRef.current);

        // Draw gate pulse spark
        if (sparkTimerRef.current > 0 && sparkDeviceRef.current) {
          const target = hitBoxesRef.current.find((h) => h.id === sparkDeviceRef.current);
          if (target) {
            drawGateSpark(ctx, target.pLead.x, target.pLead.y, sparkTimerRef.current, sparkDeviceRef.current);
          }
          sparkTimerRef.current--;
        }

        // Draw virtual multimeter probe clips
        const probed = hitBoxesRef.current.find((h) => h.id === probedComponent);
        if (probed) {
          drawMultimeterProbeClips(ctx, probed.pLead, probed.nLead, probed.name);
        }
      }

      ctx.restore();
      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [topology, currentStep, R, L, Vs, hasFD, probedComponent]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const hb of hitBoxesRef.current) {
      const dist = Math.hypot(mx - (hb.pLead.x + hb.nLead.x) / 2, my - (hb.pLead.y + hb.nLead.y) / 2);
      if (dist <= hb.radius + 14) {
        onSelectComponent(hb.id);
        return;
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#050811] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`w-full h-full block ${probeMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
      />

      {/* Floating Schematic HUD Overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-md backdrop-blur-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>Vector Circuit Schematic Engine</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400">IEEE Std 315</span>
        </div>
        {probeMode && (
          <div className="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 shadow-sm animate-pulse">
            Probe Mode: Click component to attach DMM leads
          </div>
        )}
      </div>

      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800/80 text-[10px] font-mono text-slate-500 pointer-events-none">
        Probed: <span className="text-amber-300 font-semibold">{probedComponent}</span>
      </div>
    </div>
  );

  /* =========================================================================
     DRAWING HELPERS FOR IEEE HIGH-RESOLUTION ELECTRICAL SCHEMATICS
     ========================================================================= */

  function drawGridBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#0e172a';
    ctx.lineWidth = 1;
    const gridStep = 32;

    ctx.beginPath();
    for (let x = 0; x < W; x += gridStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y < H; y += gridStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // Subtle center watermark crosshair
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 8, H / 2);
    ctx.lineTo(W / 2 + 8, H / 2);
    ctx.moveTo(W / 2, H / 2 - 8);
    ctx.lineTo(W / 2, H / 2 + 8);
    ctx.stroke();
  }

  function registerHit(
    id: string,
    name: string,
    pLead: { x: number; y: number },
    nLead: { x: number; y: number },
    radius: number,
    type: ProbedComponent['type']
  ) {
    hitBoxesRef.current.push({ id, name, pLead, nLead, radius, type });
  }

  function drawWire(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, isHot = false) {
    ctx.strokeStyle = isHot ? '#00f2fe' : '#1e293b';
    ctx.lineWidth = isHot ? 3.5 : 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawJunctionDot(ctx: CanvasRenderingContext2D, x: number, y: number, isHot = false) {
    ctx.fillStyle = isHot ? '#00f2fe' : '#334155';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#050811';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawACSourceSymbol(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    voltage: number,
    label: string,
    color = '#00f2fe'
  ) {
    ctx.save();
    // Outer circle
    ctx.fillStyle = '#0b1329';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner subtle glow
    ctx.strokeStyle = `${color}40`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Sine symbol inside
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = -11; i <= 11; i++) {
      const sy = Math.sin((i / 11) * Math.PI) * 7;
      if (i === -11) ctx.moveTo(x + i, y + sy);
      else ctx.lineTo(x + i, y + sy);
    }
    ctx.stroke();

    // Text labels
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 28);

    ctx.fillStyle = color;
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillText(`${voltage >= 0 ? '+' : ''}${voltage.toFixed(0)} V`, x, y + 36);

    ctx.restore();
  }

  function drawThyristorSymbol(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    name: string,
    isConducting: boolean,
    isSCR: boolean
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Glowing aura if conducting
    if (isConducting) {
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main Diode Triangle (Anode at bottom/input, pointing to Cathode bar)
    ctx.fillStyle = isConducting ? '#10b981' : '#0f172a';
    ctx.strokeStyle = isConducting ? '#34d399' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, 12);
    ctx.lineTo(11, 12);
    ctx.lineTo(0, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cathode horizontal bar
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.lineTo(12, -10);
    ctx.stroke();

    // Gate terminal (for SCR)
    if (isSCR) {
      ctx.strokeStyle = isConducting ? '#f59e0b' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(-14, 11);
      ctx.lineTo(-19, 11);
      ctx.stroke();

      // Gate terminal node
      ctx.fillStyle = isConducting ? '#f59e0b' : '#64748b';
      ctx.beginPath();
      ctx.arc(-19, 11, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(-angle);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = isConducting ? '#34d399' : '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(name, 14, 4);

    if (isConducting) {
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText('ON', 14, 14);
    }
    ctx.restore();
  }

  function drawSeriesRLoad(
    ctx: CanvasRenderingContext2D,
    x: number,
    topY: number,
    botY: number,
    resistance: number,
    inductance: number,
    current: number
  ) {
    const midY = (topY + botY) / 2;
    const rStartY = topY + 22;
    const rEndY = midY - 14;
    const lStartY = midY + 12;
    const lEndY = botY - 22;

    // Resistor Top lead
    drawWire(ctx, x, topY, x, rStartY);

    // Zig-zag Resistor Symbol (IEEE standard 6 peaks)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, rStartY);
    const rLen = rEndY - rStartY;
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const sy = rStartY + ((i + 0.5) * rLen) / segs;
      const offset = i % 2 === 0 ? -8 : 8;
      ctx.lineTo(x + offset, sy);
    }
    ctx.lineTo(x, rEndY);
    ctx.stroke();

    // Resistor label
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`R = ${resistance} Ω`, x + 14, (rStartY + rEndY) / 2 + 4);

    // Intermediate wire connecting R and L
    drawWire(ctx, x, rEndY, x, lStartY);
    drawJunctionDot(ctx, x, midY, current > 0.05);

    // Inductor Coiled Loops (4 semicircular turns)
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, lStartY);
    const lLen = lEndY - lStartY;
    const turns = 4;
    const turnH = lLen / turns;
    for (let i = 0; i < turns; i++) {
      const ty = lStartY + i * turnH + turnH / 2;
      ctx.arc(x, ty, turnH / 2, -Math.PI / 2, Math.PI / 2, false);
    }
    ctx.lineTo(x, lEndY);
    ctx.stroke();

    // Magnetic Flux Lines around inductor when current conducts
    if (current > 0.04) {
      ctx.save();
      const fluxAlpha = Math.min(0.8, current * 0.12 + 0.15);
      ctx.strokeStyle = `rgba(0, 242, 254, ${fluxAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(x - 4, (lStartY + lEndY) / 2, 14 + current * 1.5, lLen / 2 + 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Inductor label
    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`L = ${(inductance * 1000).toFixed(0)} mH`, x + 14, (lStartY + lEndY) / 2 + 4);

    // Bottom lead
    drawWire(ctx, x, lEndY, x, botY);

    // Load branch bracket indicator
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('DC LOAD', x - 64, midY + 4);
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = current > 0.05 ? '#10b981' : '#64748b';
    ctx.fillText(`${current.toFixed(2)} A`, x - 64, midY + 18);
  }

  /* =========================================================================
     TOPOLOGY 1: SINGLE-PHASE HALF-WAVE (UNCONTROLLED & CONTROLLED)
     ========================================================================= */
  function drawSinglePhaseHalfWave(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    topo: TopologyType,
    snap: SimStep,
    resistance: number,
    inductance: number,
    hasFreewheeling: boolean
  ): Array<{ x: number; y: number }> {
    const srcX = W * 0.16;
    const srcY = H * 0.5;
    const swX = W * 0.44;
    const swY = H * 0.24;
    const loadX = W * 0.82;
    const topY = H * 0.24;
    const botY = H * 0.76;
    const fdX = W * 0.64;

    const isSCR = topo === '1p_hw_scr';
    const devName = isSCR ? 'T1' : 'D1';
    const isDevOn = snap.activeDevices.includes(devName);
    const isFdOn = snap.activeDevices.includes('FD');

    // Wires
    drawWire(ctx, srcX, srcY - 26, swX - 25, swY, isDevOn);
    drawWire(ctx, swX + 25, swY, loadX, topY, isDevOn || isFdOn);
    drawWire(ctx, loadX, botY, srcX, botY, isDevOn);
    drawWire(ctx, srcX, botY, srcX, srcY + 26, isDevOn);

    // Source
    drawACSourceSymbol(ctx, srcX, srcY, snap.va, 'v_s(t)');
    registerHit('SOURCE', 'AC Mains (v_s)', { x: srcX, y: srcY - 26 }, { x: srcX, y: srcY + 26 }, 24, 'source');

    // Switch (T1 / D1)
    drawThyristorSymbol(ctx, swX, swY, 0, devName, isDevOn, isSCR);
    registerHit(devName, devName, { x: swX - 25, y: swY }, { x: swX + 25, y: swY }, 22, 'switch');

    // Freewheeling Diode Branch
    if (hasFreewheeling) {
      drawWire(ctx, fdX, topY, fdX, botY, isFdOn);
      drawJunctionDot(ctx, fdX, topY, isFdOn);
      drawJunctionDot(ctx, fdX, botY, isFdOn);

      drawThyristorSymbol(ctx, fdX, H * 0.5, -Math.PI / 2, 'D_FW', isFdOn, false);
      registerHit('FD', 'Freewheeling Diode (D_FW)', { x: fdX, y: botY }, { x: fdX, y: topY }, 22, 'diode');
    }

    // Load (R + L)
    drawSeriesRLoad(ctx, loadX, topY, botY, resistance, inductance, snap.io);
    registerHit('LOAD', 'Load (R + L)', { x: loadX, y: topY }, { x: loadX, y: botY }, 36, 'load');
    registerHit('INDUCTOR', 'Inductor (L)', { x: loadX, y: H * 0.5 + 10 }, { x: loadX, y: botY - 14 }, 24, 'inductor');

    // Current Pathway
    if (snap.pathRoute === 'FREEWHEEL' && hasFreewheeling) {
      return [
        { x: loadX, y: botY },
        { x: fdX, y: botY },
        { x: fdX, y: topY },
        { x: loadX, y: topY },
        { x: loadX, y: botY },
      ];
    } else if (snap.pathRoute === 'FWD_MAINS') {
      return [
        { x: srcX, y: srcY - 26 },
        { x: swX - 25, y: swY },
        { x: swX + 25, y: swY },
        { x: loadX, y: topY },
        { x: loadX, y: botY },
        { x: srcX, y: botY },
        { x: srcX, y: srcY + 26 },
      ];
    }
    return [];
  }

  /* =========================================================================
     TOPOLOGY 2: SINGLE-PHASE FULL-WAVE BRIDGE (CONTROLLED, UNCONTROLLED, SEMI)
     ========================================================================= */
  function drawSinglePhaseBridge(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    topo: TopologyType,
    snap: SimStep,
    resistance: number,
    inductance: number
  ): Array<{ x: number; y: number }> {
    const srcX = W * 0.15;
    const srcY = H * 0.5;
    const leg1X = W * 0.40;
    const leg2X = W * 0.60;
    const dcTopY = H * 0.18;
    const dcBotY = H * 0.82;
    const loadX = W * 0.84;

    const isSemi = topo === '1p_fw_semi_bridge';
    const isDiode = topo === '1p_fw_diode_bridge';

    const sw1Name = isDiode ? 'D1' : 'T1';
    const sw3Name = isDiode ? 'D3' : 'T3';
    const sw4Name = isSemi || isDiode ? 'D4' : 'T4';
    const sw2Name = isSemi || isDiode ? 'D2' : 'T2';

    const isSw1On = snap.activeDevices.includes(sw1Name);
    const isSw3On = snap.activeDevices.includes(sw3Name);
    const isSw4On = snap.activeDevices.includes(sw4Name);
    const isSw2On = snap.activeDevices.includes(sw2Name);

    // AC Mains leads
    drawWire(ctx, srcX, srcY - 32, leg1X, srcY - 32, isSw1On || isSw4On);
    drawWire(ctx, srcX, srcY + 32, leg2X, srcY + 32, isSw3On || isSw2On);

    // DC Busbars
    drawWire(ctx, leg1X, dcTopY, loadX, dcTopY, isSw1On || isSw3On);
    drawWire(ctx, leg1X, dcBotY, loadX, dcBotY, isSw2On || isSw4On);

    // Vertical Leg wires
    drawWire(ctx, leg1X, dcTopY, leg1X, dcBotY);
    drawWire(ctx, leg2X, dcTopY, leg2X, dcBotY);

    drawJunctionDot(ctx, leg1X, srcY - 32, true);
    drawJunctionDot(ctx, leg2X, srcY + 32, true);
    drawJunctionDot(ctx, leg1X, dcTopY, isSw1On);
    drawJunctionDot(ctx, leg2X, dcTopY, isSw3On);
    drawJunctionDot(ctx, leg1X, dcBotY, isSw4On);
    drawJunctionDot(ctx, leg2X, dcBotY, isSw2On);

    // AC Source
    drawACSourceSymbol(ctx, srcX, srcY, snap.va, 'v_s(t)');
    registerHit('SOURCE', 'AC Mains', { x: srcX, y: srcY - 32 }, { x: srcX, y: srcY + 32 }, 24, 'source');

    // Switches
    const yTop = (dcTopY + (srcY - 32)) / 2;
    const yBot = (dcBotY + (srcY + 32)) / 2;

    drawThyristorSymbol(ctx, leg1X, yTop, -Math.PI / 2, sw1Name, isSw1On, !isDiode);
    drawThyristorSymbol(ctx, leg2X, yTop, -Math.PI / 2, sw3Name, isSw3On, !isDiode);
    drawThyristorSymbol(ctx, leg1X, yBot, -Math.PI / 2, sw4Name, isSw4On, !(isSemi || isDiode));
    drawThyristorSymbol(ctx, leg2X, yBot, -Math.PI / 2, sw2Name, isSw2On, !(isSemi || isDiode));

    registerHit(sw1Name, sw1Name, { x: leg1X, y: srcY - 32 }, { x: leg1X, y: dcTopY }, 20, 'switch');
    registerHit(sw3Name, sw3Name, { x: leg2X, y: srcY + 32 }, { x: leg2X, y: dcTopY }, 20, 'switch');
    registerHit(sw4Name, sw4Name, { x: leg1X, y: dcBotY }, { x: leg1X, y: srcY - 32 }, 20, 'switch');
    registerHit(sw2Name, sw2Name, { x: leg2X, y: dcBotY }, { x: leg2X, y: srcY + 32 }, 20, 'switch');

    // Load
    drawSeriesRLoad(ctx, loadX, dcTopY, dcBotY, resistance, inductance, snap.io);
    registerHit('LOAD', 'Load (R + L)', { x: loadX, y: dcTopY }, { x: loadX, y: dcBotY }, 36, 'load');
    registerHit('INDUCTOR', 'Inductor (L)', { x: loadX, y: H * 0.5 + 10 }, { x: loadX, y: dcBotY - 14 }, 24, 'inductor');

    if (snap.pathRoute === 'BRIDGE_POS') {
      return [
        { x: srcX, y: srcY - 32 },
        { x: leg1X, y: srcY - 32 },
        { x: leg1X, y: dcTopY },
        { x: loadX, y: dcTopY },
        { x: loadX, y: dcBotY },
        { x: leg2X, y: dcBotY },
        { x: leg2X, y: srcY + 32 },
        { x: srcX, y: srcY + 32 },
      ];
    } else if (snap.pathRoute === 'BRIDGE_NEG') {
      return [
        { x: srcX, y: srcY + 32 },
        { x: leg2X, y: srcY + 32 },
        { x: leg2X, y: dcTopY },
        { x: loadX, y: dcTopY },
        { x: loadX, y: dcBotY },
        { x: leg1X, y: dcBotY },
        { x: leg1X, y: srcY - 32 },
        { x: srcX, y: srcY - 32 },
      ];
    } else if (snap.pathRoute === 'FREEWHEEL_SEMI') {
      return [
        { x: loadX, y: dcBotY },
        { x: leg2X, y: dcBotY },
        { x: leg2X, y: dcTopY },
        { x: loadX, y: dcTopY },
        { x: loadX, y: dcBotY },
      ];
    }
    return [];
  }

  /* =========================================================================
     TOPOLOGY 3: SINGLE-PHASE CENTER-TAPPED TRANSFORMER MIDPOINT
     ========================================================================= */
  function drawCenterTappedMidpoint(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    snap: SimStep,
    resistance: number,
    inductance: number
  ): Array<{ x: number; y: number }> {
    const trafoX = W * 0.26;
    const midY = H * 0.5;
    const topY = H * 0.22;
    const botY = H * 0.78;
    const sw1X = W * 0.52;
    const sw2X = W * 0.52;
    const loadX = W * 0.84;

    const isT1On = snap.activeDevices.includes('T1');
    const isT2On = snap.activeDevices.includes('T2');

    // Transformer Coils Graphic
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(trafoX, midY - 32, 22, -Math.PI / 2, Math.PI / 2);
    ctx.arc(trafoX, midY + 32, 22, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Core parallel lines
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(trafoX - 10, topY);
    ctx.lineTo(trafoX - 10, botY);
    ctx.moveTo(trafoX - 14, topY);
    ctx.lineTo(trafoX - 14, botY);
    ctx.stroke();

    // Wires
    drawWire(ctx, trafoX, topY, sw1X - 25, topY, isT1On);
    drawWire(ctx, sw1X + 25, topY, loadX, topY, isT1On || isT2On);
    drawWire(ctx, trafoX, botY, sw2X - 25, botY, isT2On);
    drawWire(ctx, sw2X + 25, botY, loadX, topY, isT2On);
    drawWire(ctx, loadX, botY, trafoX, midY, isT1On || isT2On);

    drawJunctionDot(ctx, trafoX, midY, true);
    drawJunctionDot(ctx, loadX, topY, isT1On || isT2On);

    // Thyristors
    drawThyristorSymbol(ctx, sw1X, topY, 0, 'T1', isT1On, true);
    drawThyristorSymbol(ctx, sw2X, botY, 0, 'T2', isT2On, true);

    registerHit('T1', 'Thyristor T1', { x: sw1X - 25, y: topY }, { x: sw1X + 25, y: topY }, 22, 'switch');
    registerHit('T2', 'Thyristor T2', { x: sw2X - 25, y: botY }, { x: sw2X + 25, y: botY }, 22, 'switch');
    registerHit('SOURCE', 'Transformer Midpoint', { x: trafoX, y: topY }, { x: trafoX, y: midY }, 26, 'source');

    // Load
    drawSeriesRLoad(ctx, loadX, topY, botY, resistance, inductance, snap.io);
    registerHit('LOAD', 'Load (R + L)', { x: loadX, y: topY }, { x: loadX, y: botY }, 36, 'load');
    registerHit('INDUCTOR', 'Inductor (L)', { x: loadX, y: H * 0.5 + 10 }, { x: loadX, y: botY - 14 }, 24, 'inductor');

    if (snap.pathRoute === 'MIDPOINT_TOP') {
      return [
        { x: trafoX, y: topY },
        { x: sw1X, y: topY },
        { x: loadX, y: topY },
        { x: loadX, y: botY },
        { x: trafoX, y: midY },
      ];
    } else if (snap.pathRoute === 'MIDPOINT_BOT') {
      return [
        { x: trafoX, y: botY },
        { x: sw2X, y: botY },
        { x: loadX, y: topY },
        { x: loadX, y: botY },
        { x: trafoX, y: midY },
      ];
    }
    return [];
  }

  /* =========================================================================
     TOPOLOGY 4: THREE-PHASE HALF-WAVE (3-PULSE)
     ========================================================================= */
  function drawThreePhaseHalfWave(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    topo: TopologyType,
    snap: SimStep,
    resistance: number,
    inductance: number
  ): Array<{ x: number; y: number }> {
    const srcX = W * 0.12;
    const yA = H * 0.22;
    const yB = H * 0.44;
    const yC = H * 0.66;
    const swX = W * 0.45;
    const dcTopY = H * 0.14;
    const neutralY = H * 0.86;
    const loadX = W * 0.84;

    const isSCR = topo === '3p_hw_scr';
    const isAOn = snap.activeDevices.includes('T1') || snap.activeDevices.includes('D1');
    const isBOn = snap.activeDevices.includes('T2') || snap.activeDevices.includes('D2');
    const isCOn = snap.activeDevices.includes('T3') || snap.activeDevices.includes('D3');

    // 3 Sources
    drawACSourceSymbol(ctx, srcX, yA, snap.va, 'Phase A', '#f59e0b');
    drawACSourceSymbol(ctx, srcX, yB, snap.vb, 'Phase B', '#00f2fe');
    drawACSourceSymbol(ctx, srcX, yC, snap.vc, 'Phase C', '#f43f5e');

    // Horizontal Lines to Switches
    drawWire(ctx, srcX + 22, yA, swX - 25, yA, isAOn);
    drawWire(ctx, srcX + 22, yB, swX - 25, yB, isBOn);
    drawWire(ctx, srcX + 22, yC, swX - 25, yC, isCOn);

    // Switches
    drawThyristorSymbol(ctx, swX, yA, 0, isSCR ? 'T1' : 'D1', isAOn, isSCR);
    drawThyristorSymbol(ctx, swX, yB, 0, isSCR ? 'T2' : 'D2', isBOn, isSCR);
    drawThyristorSymbol(ctx, swX, yC, 0, isSCR ? 'T3' : 'D3', isCOn, isSCR);

    registerHit('T1', isSCR ? 'T1 (Phase A)' : 'D1 (Phase A)', { x: swX - 25, y: yA }, { x: swX + 25, y: yA }, 20, 'switch');
    registerHit('T2', isSCR ? 'T2 (Phase B)' : 'D2 (Phase B)', { x: swX - 25, y: yB }, { x: swX + 25, y: yB }, 20, 'switch');
    registerHit('T3', isSCR ? 'T3 (Phase C)' : 'D3 (Phase C)', { x: swX - 25, y: yC }, { x: swX + 25, y: yC }, 20, 'switch');
    registerHit('SOURCE', '3-Phase AC Source', { x: srcX, y: yA }, { x: srcX, y: neutralY }, 30, 'source');

    // Busbars to Load
    drawWire(ctx, swX + 25, yA, swX + 25, dcTopY, isAOn);
    drawWire(ctx, swX + 25, yB, swX + 25, dcTopY, isBOn);
    drawWire(ctx, swX + 25, yC, swX + 25, dcTopY, isCOn);
    drawWire(ctx, swX + 25, dcTopY, loadX, dcTopY, isAOn || isBOn || isCOn);

    // Neutral return
    drawWire(ctx, loadX, neutralY, srcX - 24, neutralY, true);
    drawWire(ctx, srcX - 24, neutralY, srcX - 24, yA, true);

    // Load
    drawSeriesRLoad(ctx, loadX, dcTopY, neutralY, resistance, inductance, snap.io);
    registerHit('LOAD', 'Load (R + L)', { x: loadX, y: dcTopY }, { x: loadX, y: neutralY }, 36, 'load');
    registerHit('INDUCTOR', 'Inductor (L)', { x: loadX, y: H * 0.5 + 10 }, { x: loadX, y: neutralY - 14 }, 24, 'inductor');

    let activeY = yA;
    if (snap.pathRoute === '3P_B') activeY = yB;
    if (snap.pathRoute === '3P_C') activeY = yC;

    return [
      { x: srcX + 22, y: activeY },
      { x: swX - 25, y: activeY },
      { x: swX + 25, y: activeY },
      { x: swX + 25, y: dcTopY },
      { x: loadX, y: dcTopY },
      { x: loadX, y: neutralY },
      { x: srcX - 24, y: neutralY },
      { x: srcX - 24, y: activeY },
    ];
  }

  /* =========================================================================
     TOPOLOGY 5: THREE-PHASE FULL-WAVE (6-PULSE BRIDGE)
     ========================================================================= */
  function drawThreePhaseBridge(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    topo: TopologyType,
    snap: SimStep,
    resistance: number,
    inductance: number
  ): Array<{ x: number; y: number }> {
    const srcX = W * 0.12;
    const yA = H * 0.36;
    const yB = H * 0.50;
    const yC = H * 0.64;

    const leg1X = W * 0.36;
    const leg2X = W * 0.49;
    const leg3X = W * 0.62;

    const dcTopY = H * 0.16;
    const dcBotY = H * 0.84;
    const loadX = W * 0.86;

    const isSCR = topo === '3p_fw_scr_bridge';
    const activeDevs = snap.activeDevices;

    // AC Sources
    drawACSourceSymbol(ctx, srcX, yA, snap.va, 'Phase A', '#f59e0b');
    drawACSourceSymbol(ctx, srcX, yB, snap.vb, 'Phase B', '#00f2fe');
    drawACSourceSymbol(ctx, srcX, yC, snap.vc, 'Phase C', '#f43f5e');

    // Horizontal AC Feed lines
    drawWire(ctx, srcX + 22, yA, leg1X, yA);
    drawWire(ctx, srcX + 22, yB, leg2X, yB);
    drawWire(ctx, srcX + 22, yC, leg3X, yC);

    // DC Rails
    drawWire(ctx, leg1X, dcTopY, loadX, dcTopY, true);
    drawWire(ctx, leg1X, dcBotY, loadX, dcBotY, true);

    // Leg wires
    drawWire(ctx, leg1X, dcTopY, leg1X, dcBotY);
    drawWire(ctx, leg2X, dcTopY, leg2X, dcBotY);
    drawWire(ctx, leg3X, dcTopY, leg3X, dcBotY);

    // Junctions
    drawJunctionDot(ctx, leg1X, yA, true);
    drawJunctionDot(ctx, leg2X, yB, true);
    drawJunctionDot(ctx, leg3X, yC, true);

    // Upper and Lower Switches (IEEE Numbering: T1, T3, T5 on top; T4, T6, T2 on bottom)
    const yTop = (dcTopY + yA) / 2;
    const yBot = (dcBotY + yC) / 2;

    const swPrefix = isSCR ? 'T' : 'D';
    drawThyristorSymbol(ctx, leg1X, yTop, -Math.PI / 2, `${swPrefix}1`, activeDevs.includes('T1') || activeDevs.includes('D1'), isSCR);
    drawThyristorSymbol(ctx, leg2X, yTop, -Math.PI / 2, `${swPrefix}3`, activeDevs.includes('T3') || activeDevs.includes('D3'), isSCR);
    drawThyristorSymbol(ctx, leg3X, yTop, -Math.PI / 2, `${swPrefix}5`, activeDevs.includes('T5') || activeDevs.includes('D5'), isSCR);

    drawThyristorSymbol(ctx, leg1X, yBot, -Math.PI / 2, `${swPrefix}4`, activeDevs.includes('T4') || activeDevs.includes('D4'), isSCR);
    drawThyristorSymbol(ctx, leg2X, yBot, -Math.PI / 2, `${swPrefix}6`, activeDevs.includes('T6') || activeDevs.includes('D6'), isSCR);
    drawThyristorSymbol(ctx, leg3X, yBot, -Math.PI / 2, `${swPrefix}2`, activeDevs.includes('T2') || activeDevs.includes('D2'), isSCR);

    registerHit('T1', `${swPrefix}1 (Phase A Upper)`, { x: leg1X, y: yA }, { x: leg1X, y: dcTopY }, 20, 'switch');
    registerHit('T3', `${swPrefix}3 (Phase B Upper)`, { x: leg2X, y: yB }, { x: leg2X, y: dcTopY }, 20, 'switch');
    registerHit('T5', `${swPrefix}5 (Phase C Upper)`, { x: leg3X, y: yC }, { x: leg3X, y: dcTopY }, 20, 'switch');
    registerHit('T4', `${swPrefix}4 (Phase A Lower)`, { x: leg1X, y: dcBotY }, { x: leg1X, y: yA }, 20, 'switch');
    registerHit('T6', `${swPrefix}6 (Phase B Lower)`, { x: leg2X, y: dcBotY }, { x: leg2X, y: yB }, 20, 'switch');
    registerHit('T2', `${swPrefix}2 (Phase C Lower)`, { x: leg3X, y: dcBotY }, { x: leg3X, y: yC }, 20, 'switch');
    registerHit('SOURCE', '3-Phase AC Grid', { x: srcX, y: yA }, { x: srcX, y: yC }, 30, 'source');

    // Load
    drawSeriesRLoad(ctx, loadX, dcTopY, dcBotY, resistance, inductance, snap.io);
    registerHit('LOAD', 'Load (R + L)', { x: loadX, y: dcTopY }, { x: loadX, y: dcBotY }, 36, 'load');
    registerHit('INDUCTOR', 'Inductor (L)', { x: loadX, y: H * 0.5 + 10 }, { x: loadX, y: dcBotY - 14 }, 24, 'inductor');

    const legs = [
      { legX: leg1X, lineY: yA },
      { legX: leg2X, lineY: yB },
      { legX: leg3X, lineY: yC },
    ];

    const secMap = [
      { posLeg: legs[0], negLeg: legs[2] },
      { posLeg: legs[1], negLeg: legs[2] },
      { posLeg: legs[1], negLeg: legs[0] },
      { posLeg: legs[2], negLeg: legs[0] },
      { posLeg: legs[2], negLeg: legs[1] },
      { posLeg: legs[0], negLeg: legs[1] },
    ];

    const activePair = secMap[snap.sectorIndex || 0];

    return [
      { x: srcX + 22, y: activePair.posLeg.lineY },
      { x: activePair.posLeg.legX, y: activePair.posLeg.lineY },
      { x: activePair.posLeg.legX, y: dcTopY },
      { x: loadX, y: dcTopY },
      { x: loadX, y: dcBotY },
      { x: activePair.negLeg.legX, y: dcBotY },
      { x: activePair.negLeg.legX, y: activePair.negLeg.lineY },
      { x: srcX + 22, y: activePair.negLeg.lineY },
    ];
  }

  /* =========================================================================
     PHYSICAL CURRENT PARTICLES & CHEVRON MOTION
     ========================================================================= */
  function renderCurrentConduction(
    ctx: CanvasRenderingContext2D,
    path: Array<{ x: number; y: number }>,
    current: number,
    route: string,
    particles: Array<{ pos: number }>
  ) {
    if (!path || path.length < 2 || current < 0.04 || route === 'IDLE') return;

    const segLengths: number[] = [];
    let totalLength = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const len = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
      segLengths.push(len);
      totalLength += len;
    }

    if (totalLength === 0) return;

    // Directional Chevrons
    ctx.save();
    ctx.strokeStyle = route.includes('FREEWHEEL') ? 'rgba(0, 242, 254, 0.5)' : 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const segLen = segLengths[i];
      if (segLen > 30) {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-5, -4);
        ctx.lineTo(2, 0);
        ctx.lineTo(-5, 4);
        ctx.moveTo(1, -4);
        ctx.lineTo(8, 0);
        ctx.lineTo(1, 4);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();

    // Flowing Particles scaled comfortably for observation
    const speedFactor = Math.max(0.4, Math.min(1.4, speed * 2.5));
    const flowSpeed = Math.min(0.016, (current * 0.0012 + 0.002) * speedFactor);
    ctx.fillStyle = route.includes('FREEWHEEL') ? '#00f2fe' : '#ffffff';
    ctx.shadowColor = route.includes('FREEWHEEL') ? '#00f2fe' : '#38bdf8';
    ctx.shadowBlur = 9;

    particles.forEach((p) => {
      p.pos = (p.pos + flowSpeed) % 1;
      const target = p.pos * totalLength;

      let accum = 0;
      let px = path[0].x;
      let py = path[0].y;
      for (let i = 0; i < segLengths.length; i++) {
        if (accum + segLengths[i] >= target) {
          const segT = (target - accum) / segLengths[i];
          px = path[i].x + (path[i + 1].x - path[i].x) * segT;
          py = path[i].y + (path[i + 1].y - path[i].y) * segT;
          break;
        }
        accum += segLengths[i];
      }

      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  function drawGateSpark(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    timer: number,
    devName: string
  ) {
    ctx.save();
    ctx.translate(x, y);

    const r = (18 - timer) * 2.4;
    ctx.strokeStyle = `rgba(245, 158, 11, ${timer / 18})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + timer;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4), 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Badge
    ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
    ctx.fillRect(-32, -26, 64, 16);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${devName} TRIGGER`, 0, -14);

    ctx.restore();
  }

  function drawMultimeterProbeClips(
    ctx: CanvasRenderingContext2D,
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    name: string
  ) {
    // Red Positive Probe Lead (+)
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(p1.x - 25, p1.y - 35, p1.x - 50, p1.y - 20, p1.x - 45, p1.y - 50);
    ctx.stroke();

    // Red Alligator Clip Node
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+', p1.x - 10, p1.y - 8);

    // Black Negative Probe Lead (-)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.bezierCurveTo(p2.x - 25, p2.y + 35, p2.x - 50, p2.y + 20, p2.x - 45, p2.y + 50);
    ctx.stroke();

    // Black Alligator Clip Node
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('−', p2.x - 10, p2.y + 14);

    // Probing Reticle Ring around probed component
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rad = Math.hypot(p1.x - p2.x, p1.y - p2.y) / 2 + 16;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(26, rad), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
};
