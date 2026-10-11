import React, { useRef, useEffect, useState } from 'react';
import { SimStep } from '../types';
import { MathInline } from './MathView';

interface MultichannelScopeViewProps {
  steps: SimStep[];
  omegaT: number;
  alpha: number;
}

export const MultichannelScopeView: React.FC<MultichannelScopeViewProps> = ({
  steps,
  omegaT,
  alpha,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeChannels, setActiveChannels] = useState<{
    vs: boolean;
    vo: boolean;
    io: boolean;
    vt: boolean;
    ig: boolean;
  }>({
    vs: true,
    vo: true,
    io: true,
    vt: true,
    ig: true,
  });

  const toggleChannel = (ch: keyof typeof activeChannels) => {
    setActiveChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));
  };

  useEffect(() => {
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

    // Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, W, H);

    const padL = 60;
    const padR = 24;
    const padT = 16;
    const padB = 24;
    const plotW = W - (padL + padR);
    const plotH = H - (padT + padB);

    // Channels config
    const channels = [
      { key: 'vs', label: 'Grid v_s', color: '#38bdf8', maxVal: 450, data: steps.map((s) => s.va) },
      { key: 'vo', label: 'Load v_o', color: '#f59e0b', maxVal: 450, data: steps.map((s) => s.vo) },
      {
        key: 'io',
        label: 'Current i_o',
        color: '#10b981',
        maxVal: Math.max(10, Math.max(...steps.map((s) => s.io)) * 1.2),
        data: steps.map((s) => s.io),
      },
      { key: 'vt', label: 'Switch v_T', color: '#c084fc', maxVal: 450, data: steps.map((s) => s.vDevice) },
      { key: 'ig', label: 'Gate i_g', color: '#f43f5e', maxVal: 1.5, data: steps.map((s) => s.gatePulse) },
    ];

    const enabledChannels = channels.filter((c) => activeChannels[c.key as keyof typeof activeChannels]);
    const numRows = Math.max(1, enabledChannels.length);
    const rowH = plotH / numRows;

    enabledChannels.forEach((ch, idx) => {
      const top = padT + idx * rowH;
      const midY = top + rowH / 2;

      // Divider & grid line
      ctx.strokeStyle = '#111c33';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, midY);
      ctx.lineTo(padL + plotW, midY);
      ctx.stroke();

      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(padL, top + rowH);
      ctx.lineTo(padL + plotW, top + rowH);
      ctx.stroke();

      // Channel label
      ctx.fillStyle = ch.color;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(ch.label, padL - 8, midY - 4);

      // Max value badge
      ctx.font = '500 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`±${ch.maxVal.toFixed(0)}`, padL - 8, midY + 8);

      // Draw trace
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < ch.data.length; i++) {
        const x = padL + (i / ch.data.length) * plotW;
        const normalized = ch.data[i] / ch.maxVal;
        const y = midY - normalized * (rowH / 2 - 4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Instantaneous needle tracker
      const sweepX = padL + (omegaT / 720) * plotW;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sweepX, top);
      ctx.lineTo(sweepX, top + rowH);
      ctx.stroke();

      // Alpha marker
      const alphaX = padL + (alpha / 720) * plotW;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(alphaX, top);
      ctx.lineTo(alphaX, top + rowH);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Time base axis (Degrees)
    const degMarkers = [0, 180, 360, 540, 720];
    degMarkers.forEach((d) => {
      const x = padL + (d / 720) * plotW;
      ctx.fillStyle = '#64748b';
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${d}°`, x, H - 6);
    });

    ctx.restore();
  }, [steps, omegaT, alpha, activeChannels]);

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#03060f] text-slate-100 min-h-0">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Full Multichannel Oscilloscope (5 Channels)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized waveform inspection &bull; Grid voltage, output DC, current, switch blocking voltage, gate pulses
          </p>
        </div>

        {/* Channel Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => toggleChannel('vs')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
              activeChannels.vs
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            CH1: <MathInline math="v_s" />
          </button>
          <button
            onClick={() => toggleChannel('vo')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
              activeChannels.vo
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            CH2: <MathInline math="v_o" />
          </button>
          <button
            onClick={() => toggleChannel('io')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
              activeChannels.io
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            CH3: <MathInline math="i_o" />
          </button>
          <button
            onClick={() => toggleChannel('vt')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
              activeChannels.vt
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            CH4: <MathInline math="v_T" />
          </button>
          <button
            onClick={() => toggleChannel('ig')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
              activeChannels.ig
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            CH5: <MathInline math="i_g" />
          </button>
        </div>
      </div>

      {/* Main Canvas Display */}
      <div className="flex-1 w-full min-h-0 bg-[#02050b] rounded-lg border border-slate-800/80 mt-3 relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
