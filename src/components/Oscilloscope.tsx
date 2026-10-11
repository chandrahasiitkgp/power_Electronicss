import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SimStep } from '../types';
import { MathInline } from './MathView';

interface OscilloscopeProps {
  steps: SimStep[];
  omegaT: number;
  alpha: number;
  extinctionDeg: number;
  isCCM: boolean;
  topology: string;
  onAlphaChange: (newAlpha: number) => void;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  steps,
  omegaT,
  alpha,
  extinctionDeg,
  isCCM,
  topology,
  onAlphaChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDraggingAlpha, setIsDraggingAlpha] = useState(false);
  const [dragTooltip, setDragTooltip] = useState<{ x: number; text: string } | null>(null);

  const isControlled = topology.includes('scr');

  // Compute maximum bounds for scaling
  const maxV = 450;
  const maxI = Math.max(10, Math.ceil(Math.max(...steps.map((s) => s.io), 5) * 1.25));

  const drawPlot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || steps.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    const padL = 46;
    const padR = 46;
    const padT = 24;
    const padB = 26;
    const plotW = Math.max(10, W - (padL + padR));
    const plotH = Math.max(10, H - (padT + padB));
    const zeroY = padT + plotH / 2;

    // Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, W, H);

    // Gridlines
    ctx.strokeStyle = '#111c33';
    ctx.lineWidth = 1;

    // Horizontal grid lines (Voltage levels)
    const vSteps = [-400, -200, 0, 200, 400];
    vSteps.forEach((vVal) => {
      const y = zeroY - (vVal / maxV) * (plotH / 2);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      // Left axis ticks (V)
      ctx.fillStyle = '#64748b';
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${vVal}`, padL - 6, y + 3);
    });

    // Right axis ticks (A)
    const iSteps = [0, maxI / 2, maxI];
    iSteps.forEach((iVal) => {
      const y = zeroY - (iVal / maxI) * (plotH / 2);
      ctx.fillStyle = '#10b981';
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${iVal.toFixed(1)}A`, padL + plotW + 6, y + 3);
    });

    // Zero center line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, zeroY);
    ctx.lineTo(padL + plotW, zeroY);
    ctx.stroke();

    // Vertical angle grid lines
    const degMarkers = [0, 90, 180, 270, 360, 450, 540, 630, 720];
    degMarkers.forEach((deg) => {
      const x = padL + (deg / 720) * plotW;
      ctx.strokeStyle = deg % 180 === 0 ? '#1e2d4d' : '#0f172a';
      ctx.lineWidth = deg % 180 === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      if (deg % 90 === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '500 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${deg}°`, x, H - 8);
      }
    });

    // Trace 1: Grid Voltage vs (Cyan dashed line)
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let i = 0; i < steps.length; i++) {
      const x = padL + (i / steps.length) * plotW;
      const y = zeroY - (steps[i].va / maxV) * (plotH / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Trace 2: Output Voltage vo (Amber solid trace)
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < steps.length; i++) {
      const x = padL + (i / steps.length) * plotW;
      const y = zeroY - (steps[i].vo / maxV) * (plotH / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Trace 3: Output Current io (Emerald solid trace)
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < steps.length; i++) {
      const x = padL + (i / steps.length) * plotW;
      const y = zeroY - (steps[i].io / maxI) * (plotH / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Marker Line 1: Extinction angle Beta (if DCM)
    if (!isCCM && extinctionDeg < 360) {
      const betaX = padL + (extinctionDeg / 720) * plotW;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(betaX, padT);
      ctx.lineTo(betaX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`β=${extinctionDeg.toFixed(0)}°`, betaX, padT + 12);
    }

    // Marker Line 2: Firing Angle Alpha (Amber vertical line)
    if (isControlled) {
      const alphaX1 = padL + (alpha / 720) * plotW;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(alphaX1, padT);
      ctx.lineTo(alphaX1, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Alpha draggable grip pill
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(alphaX1 - 12, padT - 18, 24, 16, 3);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`α`, alphaX1, padT - 7);
    }

    // Needle Line 3: Real-time Sweep Tracker (omega t)
    const sweepX = padL + (omegaT / 720) * plotW;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sweepX, padT);
    ctx.lineTo(sweepX, padT + plotH);
    ctx.stroke();

    // Red cursor triangle pointer
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(sweepX - 5, padT);
    ctx.lineTo(sweepX + 5, padT);
    ctx.lineTo(sweepX, padT + 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [steps, omegaT, alpha, extinctionDeg, isCCM, isControlled, maxI]);

  useEffect(() => {
    drawPlot();
  }, [drawPlot]);

  // Handle direct Alpha drag interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isControlled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padL = 46;
    const padR = 46;
    const plotW = rect.width - (padL + padR);
    const alphaX = padL + (alpha / 720) * plotW;

    const mx = e.clientX - rect.left;
    if (Math.abs(mx - alphaX) <= 18) {
      setIsDraggingAlpha(true);
      updateAlphaFromPointer(e.clientX);
    }
  };

  const updateAlphaFromPointer = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padL = 46;
    const padR = 46;
    const plotW = rect.width - (padL + padR);

    const relX = clientX - rect.left - padL;
    const clampedDeg = Math.round(Math.max(0, Math.min(175, (relX / plotW) * 720)));
    onAlphaChange(clampedDeg);

    const gamma = Math.max(0, extinctionDeg - clampedDeg);
    setDragTooltip({
      x: clientX - rect.left,
      text: `Firing Angle α = ${clampedDeg}° | Conduction Angle γ = ${gamma.toFixed(0)}°`,
    });
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDraggingAlpha) {
        updateAlphaFromPointer(e.clientX);
      }
    };
    const handleWindowMouseUp = () => {
      if (isDraggingAlpha) {
        setIsDraggingAlpha(false);
        setDragTooltip(null);
      }
    };

    if (isDraggingAlpha) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDraggingAlpha, extinctionDeg]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className="relative w-full h-full flex flex-col bg-[#030712] rounded select-none overflow-hidden"
    >
      {/* Top Legend Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/90 border-b border-slate-800 text-[10px] shrink-0 font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-400 border-b border-sky-400 border-dashed"></span>
            <span className="text-slate-400">
              Mains Voltage <MathInline math="v_s(t)" />
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-amber-500 rounded"></span>
            <span className="text-amber-400 font-semibold">
              Load Voltage <MathInline math="v_o(t)" />
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-500 rounded"></span>
            <span className="text-emerald-400 font-semibold">
              Load Current <MathInline math="i_o(t)" />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          {isControlled && (
            <span className="text-amber-300 font-bold">
              Drag <MathInline math="\alpha" /> handle to scrub
            </span>
          )}
          <span className="text-slate-500">|</span>
          <span>
            Sweep <MathInline math={`\\omega t = ${omegaT.toFixed(1)}^\\circ`} />
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 w-full min-h-0">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Live Drag Tooltip */}
        {dragTooltip && (
          <div
            style={{ left: `${dragTooltip.x}px` }}
            className="absolute top-2 -translate-x-1/2 pointer-events-none bg-slate-900 border border-amber-500/80 text-amber-300 text-[11px] font-mono px-2.5 py-1 rounded shadow-xl z-20 whitespace-nowrap"
          >
            {dragTooltip.text}
          </div>
        )}
      </div>
    </div>
  );
};
