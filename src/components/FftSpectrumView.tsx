import React, { useState } from 'react';
import { FftData } from '../types';
import { MathInline, MathBlock } from './MathView';

interface FftSpectrumViewProps {
  fft: FftData;
  topology: string;
}

export const FftSpectrumView: React.FC<FftSpectrumViewProps> = ({ fft, topology }) => {
  const [selectedSignal, setSelectedSignal] = useState<'voltage' | 'current'>('voltage');

  const maxV = Math.max(...fft.vHarmonics, 10);
  const maxI = Math.max(...fft.iHarmonics, 1);

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#03060f] text-slate-100 overflow-y-auto min-h-0 space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <h2 className="text-base font-bold text-white tracking-wide">
              Discrete Fourier Transform (DFT) Harmonic Spectrum
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time harmonic decomposition up to the 25th order &bull; IEEE 519 standard distortion assessment
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Signal toggle */}
          <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setSelectedSignal('voltage')}
              className={`px-3 py-1 rounded transition font-medium ${
                selectedSignal === 'voltage' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Voltage Harmonics <MathInline math="V_n" />
            </button>
            <button
              onClick={() => setSelectedSignal('current')}
              className={`px-3 py-1 rounded transition font-medium ${
                selectedSignal === 'current' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Current Harmonics <MathInline math="I_n" />
            </button>
          </div>

          {/* Metric cards */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-mono">
                <MathInline math="\mathrm{THD}_v" />
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {fft.thdV.toFixed(1)}%
              </span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-mono">
                <MathInline math="\mathrm{THD}_i" />
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {fft.thdI.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Voltage Bar Spectrum */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-amber-400 tracking-wide flex items-center gap-1.5">
              <span>Output Voltage Harmonic Magnitudes</span>
              <MathInline math="(V_n / V_1)" />
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Fundamental <MathInline math={`V_1 = ${fft.fundamentalV.toFixed(1)}\\text{ V}`} />
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="h-56 flex items-end gap-1.5 pt-6 pb-4 px-2 bg-[#02050b] rounded-lg border border-slate-800/80 overflow-x-auto">
            {fft.harmonics.map((h) => {
              const heightPct = Math.max(2, Math.min(100, (h.magV / maxV) * 100));
              const isDominant = h.order === 1 || h.ratioV > 0.15;
              return (
                <div key={`v-${h.order}`} className="flex-1 min-w-[20px] flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-950 border border-amber-500/50 text-amber-300 text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-10 whitespace-nowrap">
                    {h.label}: {h.magV.toFixed(1)}V ({(h.ratioV * 100).toFixed(1)}%)
                  </div>

                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      h.order === 1
                        ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                        : isDominant
                        ? 'bg-amber-500/80'
                        : 'bg-amber-600/35 hover:bg-amber-500/60'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-500 mt-1.5 truncate">
                    {h.order === 0 ? 'DC' : h.order}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Harmonic Order <MathInline math="n \in [0, 25]" /></span>
            <span className="text-amber-300">
              Total Harmonic Distortion <MathInline math="\mathrm{THD}_v" />: {fft.thdV.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Current Bar Spectrum */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-emerald-400 tracking-wide flex items-center gap-1.5">
              <span>Output Current Harmonic Magnitudes</span>
              <MathInline math="(I_n / I_1)" />
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Fundamental <MathInline math={`I_1 = ${fft.fundamentalI.toFixed(2)}\\text{ A}`} />
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="h-56 flex items-end gap-1.5 pt-6 pb-4 px-2 bg-[#02050b] rounded-lg border border-slate-800/80 overflow-x-auto">
            {fft.harmonics.map((h) => {
              const heightPct = Math.max(2, Math.min(100, (h.magI / maxI) * 100));
              const isDominant = h.order === 1 || h.ratioI > 0.15;
              return (
                <div key={`i-${h.order}`} className="flex-1 min-w-[20px] flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-slate-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-10 whitespace-nowrap">
                    {h.label}: {h.magI.toFixed(2)}A ({(h.ratioI * 100).toFixed(1)}%)
                  </div>

                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      h.order === 1
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        : isDominant
                        ? 'bg-emerald-500/80'
                        : 'bg-emerald-600/35 hover:bg-emerald-500/60'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-500 mt-1.5 truncate">
                    {h.order === 0 ? 'DC' : h.order}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Harmonic Order <MathInline math="n \in [0, 25]" /></span>
            <span className="text-emerald-300">
              Total Harmonic Distortion <MathInline math="\mathrm{THD}_i" />: {fft.thdI.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Analytical Harmonic Theory Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-2">
          <span>Mathematical Formulation of Discrete Fourier Transform</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The periodic output waveform is decomposed into an infinite sum of sinusoidal components:
        </p>
        <MathBlock math="f(t) = a_0 + \sum_{n=1}^{\infty} \left[ a_n \cos(n\omega t) + b_n \sin(n\omega t) \right] = C_0 + \sum_{n=1}^{\infty} C_n \sin(n\omega t + \theta_n)" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-bold text-amber-300">Voltage Total Harmonic Distortion</span>
            <MathBlock math="\mathrm{THD}_v = \frac{\sqrt{\sum_{n=2}^{\infty} V_n^2}}{V_1} \times 100\%" />
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-bold text-emerald-300">Current Total Harmonic Distortion</span>
            <MathBlock math="\mathrm{THD}_i = \frac{\sqrt{\sum_{n=2}^{\infty} I_n^2}}{I_1} \times 100\%" />
          </div>
        </div>
      </div>

      {/* Tabular Harmonic Breakdown Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Harmonic Orders Tabular Spectrum
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Order <MathInline math="n" /></th>
                <th className="py-2 px-3">Frequency</th>
                <th className="py-2 px-3">Voltage <MathInline math="V_n\text{ (V)}" /></th>
                <th className="py-2 px-3">Ratio <MathInline math="V_n / V_1" /></th>
                <th className="py-2 px-3">Current <MathInline math="I_n\text{ (A)}" /></th>
                <th className="py-2 px-3">Ratio <MathInline math="I_n / I_1" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {fft.harmonics.slice(0, 16).map((h) => (
                <tr key={`row-${h.order}`} className="hover:bg-slate-800/40">
                  <td className="py-1.5 px-3 font-bold text-slate-200">{h.label}</td>
                  <td className="py-1.5 px-3 text-slate-400">{h.order * 50} Hz</td>
                  <td className="py-1.5 px-3 text-amber-300">{h.magV.toFixed(2)} V</td>
                  <td className="py-1.5 px-3 text-slate-300">{(h.ratioV * 100).toFixed(1)}%</td>
                  <td className="py-1.5 px-3 text-emerald-300">{h.magI.toFixed(2)} A</td>
                  <td className="py-1.5 px-3 text-slate-300">{(h.ratioI * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
