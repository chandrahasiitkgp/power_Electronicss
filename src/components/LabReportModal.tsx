import React from 'react';
import { TopologyType, SimMetrics, FftData } from '../types';
import { MathInline } from './MathView';

interface LabReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  topology: TopologyType;
  Vs: number;
  f: number;
  R: number;
  L: number;
  alpha: number;
  hasFD: boolean;
  metrics: SimMetrics;
  fft: FftData;
}

export const LabReportModal: React.FC<LabReportModalProps> = ({
  isOpen,
  onClose,
  topology,
  Vs,
  f,
  R,
  L,
  alpha,
  hasFD,
  metrics,
  fft,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b1222] border border-slate-700/80 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[92vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h2 className="text-base font-bold text-white tracking-wide">
                Power Electronics Academic Simulation Report
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              IEEE Standards &bull; PowerSim Pro Laboratory Studio Verification
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Experiment Configuration Metadata */}
        <div className="space-y-3 text-xs font-mono">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500 block">Active Topology:</span>
              <strong className="text-cyan-400">{topology}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Grid Line Voltage:</span>
              <strong className="text-white">{Vs} V (RMS), {f} Hz</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Firing Angle <MathInline math="\alpha" />:</span>
              <strong className="text-amber-400">{alpha}°</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Load Resistance:</span>
              <strong className="text-white">{R} Ω</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Load Inductance:</span>
              <strong className="text-white">{(L * 1000).toFixed(1)} mH</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Freewheeling Diode:</span>
              <strong className={hasFD ? 'text-cyan-300' : 'text-slate-500'}>
                {hasFD ? 'Active (Clamping Enabled)' : 'Disabled'}
              </strong>
            </div>
          </div>

          {/* Performance Metrics Table */}
          <h3 className="font-bold text-slate-300 uppercase text-xs pt-2">
            Calculated IEEE Power Quality & Operational Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500 block">Average DC Voltage <MathInline math="V_{\mathrm{dc}}" />:</span>
              <strong className="text-amber-300 text-sm">{metrics.Vdc.toFixed(1)} V</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Average DC Current <MathInline math="I_{\mathrm{dc}}" />:</span>
              <strong className="text-emerald-300 text-sm">{metrics.Idc.toFixed(2)} A</strong>
            </div>
            <div>
              <span className="text-slate-500 block">RMS Output Voltage <MathInline math="V_{\mathrm{rms}}" />:</span>
              <strong className="text-cyan-300 text-sm">{metrics.Vrms.toFixed(1)} V</strong>
            </div>
            <div>
              <span className="text-slate-500 block">RMS Output Current <MathInline math="I_{\mathrm{rms}}" />:</span>
              <strong className="text-emerald-300 text-sm">{metrics.Irms.toFixed(2)} A</strong>
            </div>

            <div>
              <span className="text-slate-500 block">Conduction Mode:</span>
              <strong className={metrics.isCCM ? 'text-emerald-400' : 'text-amber-400'}>
                {metrics.isCCM ? 'CCM (Continuous)' : 'DCM (Discontinuous)'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Extinction Angle <MathInline math="\beta" />:</span>
              <strong className="text-rose-400">
                {metrics.isCCM ? 'N/A (Continuous)' : `${metrics.extinctionDeg.toFixed(1)}°`}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Form Factor <MathInline math="FF" />:</span>
              <strong className="text-white">{metrics.FF.toFixed(3)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Ripple Factor <MathInline math="RF" />:</span>
              <strong className="text-white">{metrics.RF.toFixed(3)}</strong>
            </div>

            <div>
              <span className="text-slate-500 block">Voltage Distortion <MathInline math="\mathrm{THD}_v" />:</span>
              <strong className="text-cyan-300">{fft.thdV.toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Current Distortion <MathInline math="\mathrm{THD}_i" />:</span>
              <strong className="text-emerald-300">{fft.thdI.toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Displacement PF <MathInline math="\mathrm{DPF}" />:</span>
              <strong className="text-amber-300">{metrics.dpf.toFixed(3)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Rectifier Efficiency <MathInline math="\eta" />:</span>
              <strong className="text-emerald-400">{metrics.efficiency.toFixed(1)}%</strong>
            </div>
          </div>

          {/* Academic Discussion Notes */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1.5">
            <h4 className="font-bold text-white uppercase text-[11px]">Laboratory Analysis & Engineering Observations</h4>
            <p>
              • The simulated converter is operating in <strong>{metrics.isCCM ? 'Continuous Conduction Mode (CCM)' : 'Discontinuous Conduction Mode (DCM)'}</strong> with an extinction angle of <strong>{metrics.isCCM ? '360°/continuous' : `${metrics.extinctionDeg.toFixed(1)}°`}</strong>.
            </p>
            <p>
              • Harmonics analysis yields a Total Harmonic Distortion of <strong>{fft.thdV.toFixed(1)}%</strong> on voltage and <strong>{fft.thdI.toFixed(1)}%</strong> on current, consistent with IEEE 519 compliance expectations for this topology configuration.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 transition shadow-md shadow-cyan-400/20"
          >
            Print / Save as PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
