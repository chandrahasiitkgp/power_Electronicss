import React from 'react';
import { SimStep, SimMetrics } from '../types';
import { MathInline } from './MathView';

interface VirtualMultimeterProps {
  currentStep: SimStep | null;
  metrics: SimMetrics;
  probedComponent: string;
  probeMode: boolean;
  onToggleProbeMode: () => void;
  onSelectComponent: (comp: string) => void;
  topology: string;
  Vs: number;
  R: number;
}

export const VirtualMultimeter: React.FC<VirtualMultimeterProps> = ({
  currentStep,
  metrics,
  probedComponent,
  probeMode,
  onToggleProbeMode,
  onSelectComponent,
  topology,
  Vs,
  R,
}) => {
  let instV = 0;
  let instI = 0;
  let rmsV = metrics.Vrms;
  let avgV = metrics.Vdc;
  let piv = metrics.piv;

  if (currentStep) {
    if (probedComponent.startsWith('LOAD')) {
      instV = currentStep.vo;
      instI = currentStep.io;
      rmsV = metrics.Vrms;
      avgV = metrics.Vdc;
      piv = 0;
    } else if (probedComponent.startsWith('T') || probedComponent.startsWith('D')) {
      instV = currentStep.vDevice;
      instI = currentStep.activeDevices.includes(probedComponent) ? currentStep.io : 0;
      rmsV = Vs;
      avgV = 0;
      piv = metrics.piv;
    } else if (probedComponent.startsWith('SOURCE')) {
      instV = currentStep.va;
      instI = currentStep.io;
      rmsV = Vs;
      avgV = 0;
      piv = 0;
    } else if (probedComponent === 'INDUCTOR') {
      const di_dt = currentStep.vo - R * currentStep.io;
      instV = di_dt;
      instI = currentStep.io;
      rmsV = Math.abs(di_dt) * 0.707;
      avgV = 0;
      piv = 0;
    }
  }

  return (
    <div className="bg-[#03060f] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400"></span>
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase">
            Virtual DMM Probes
          </span>
        </div>

        <button
          onClick={onToggleProbeMode}
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition border ${
            probeMode
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/20'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
          }`}
        >
          PROBE: {probeMode ? 'ACTIVE' : 'OFF'}
        </button>
      </div>

      {/* Probed Target Selector Bar */}
      <div className="flex items-center justify-between text-[10px] font-mono mb-2 bg-slate-950 px-2 py-1 rounded border border-slate-900">
        <span className="text-slate-500">PROBED COMPONENT:</span>
        <span className="text-amber-400 font-bold">{probedComponent}</span>
      </div>

      {/* OLED Readouts Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-slate-950/90 p-2 rounded border border-slate-800/70">
          <div className="text-[9px] text-slate-500">INSTANTANEOUS V</div>
          <div className="text-amber-400 font-bold text-sm tracking-tight">
            {instV.toFixed(1)} V
          </div>
        </div>

        <div className="bg-slate-950/90 p-2 rounded border border-slate-800/70">
          <div className="text-[9px] text-slate-500">INSTANTANEOUS I</div>
          <div className="text-emerald-400 font-bold text-sm tracking-tight">
            {instI.toFixed(2)} A
          </div>
        </div>

        <div className="bg-slate-950/90 p-2 rounded border border-slate-800/70">
          <div className="text-[9px] text-slate-500">TRUE RMS VOLTAGE</div>
          <div className="text-slate-100 font-bold">
            {rmsV.toFixed(1)} V
          </div>
        </div>

        <div className="bg-slate-950/90 p-2 rounded border border-slate-800/70">
          <div className="text-[9px] text-slate-500">AVERAGE DC VOLTAGE</div>
          <div className="text-slate-100 font-bold">
            {avgV.toFixed(1)} V
          </div>
        </div>
      </div>

      {/* Bottom PIV & Quick Probe Buttons */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-500">PEAK INVERSE (PIV):</span>
        <span className="text-rose-400 font-bold">{piv.toFixed(0)} V</span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 text-[9px] font-mono">
        <button
          onClick={() => onSelectComponent('LOAD')}
          className={`py-1 px-0.5 rounded text-center transition border ${
            probedComponent === 'LOAD'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          Load
        </button>
        <button
          onClick={() => onSelectComponent(topology.includes('diode') ? 'D1' : 'T1')}
          className={`py-1 px-0.5 rounded text-center transition border ${
            probedComponent === 'T1' || probedComponent === 'D1'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          Switch
        </button>
        <button
          onClick={() => onSelectComponent('SOURCE')}
          className={`py-1 px-0.5 rounded text-center transition border ${
            probedComponent === 'SOURCE'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          Source
        </button>
        <button
          onClick={() => onSelectComponent('INDUCTOR')}
          className={`py-1 px-0.5 rounded text-center transition border ${
            probedComponent === 'INDUCTOR'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          Inductor
        </button>
      </div>
    </div>
  );
};
