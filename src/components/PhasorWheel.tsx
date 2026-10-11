import React, { useRef, useEffect } from 'react';
import { MathInline } from './MathView';

interface PhasorWheelProps {
  omegaT: number;
  phiDeg: number;
}

export const PhasorWheel: React.FC<PhasorWheelProps> = ({ omegaT, phiDeg }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 46;
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const r = 18;

    // Outer circle
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Axes
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Rotating Grid Vector
    const rad = (omegaT * Math.PI) / 180;
    const px = cx + Math.cos(rad) * r;
    const py = cy + Math.sin(rad) * r;

    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [omegaT, phiDeg]);

  return (
    <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
      <div className="flex items-center gap-2.5">
        <canvas ref={canvasRef} style={{ width: 46, height: 46 }} className="block" />
        <div>
          <div className="text-[9px] text-slate-500 font-mono tracking-wider">GRID VECTOR</div>
          <div className="text-xs font-mono font-bold text-amber-400">
            <MathInline math={`\\omega t = ${omegaT.toFixed(1)}^\\circ`} />
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-[9px] text-slate-500 font-mono tracking-wider">IMPEDANCE ANGLE</div>
        <div className="text-xs font-mono font-bold text-cyan-400">
          <MathInline math={`\\phi = ${phiDeg.toFixed(1)}^\\circ`} />
        </div>
      </div>
    </div>
  );
};
