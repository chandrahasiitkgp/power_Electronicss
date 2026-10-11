import React from 'react';
import { TopologyType, SimMetrics } from '../types';
import { getAnalyticalFormulas } from '../utils/mathEngine';
import { MathBlock, MathInline } from './MathView';

interface TheoryDerivationsViewProps {
  topology: TopologyType;
  Vs: number;
  R: number;
  L: number;
  alpha: number;
  f: number;
  metrics: SimMetrics;
}

export const TheoryDerivationsView: React.FC<TheoryDerivationsViewProps> = ({
  topology,
  Vs,
  R,
  L,
  alpha,
  f,
  metrics,
}) => {
  const omega = 2 * Math.PI * f;
  const Z = Math.hypot(R, omega * L);
  const phiRad = Math.atan2(omega * L, R);
  const phiDeg = (phiRad * 180) / Math.PI;
  const tau = L > 0 ? (L / R) * 1000 : 0; // ms
  const Vm = Vs * Math.SQRT2;

  const analytical = getAnalyticalFormulas(topology, Vs, alpha);

  return (
    <div className="flex-1 flex flex-col p-6 bg-[#03060f] text-slate-100 overflow-y-auto min-h-0 space-y-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4">
          <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
            Mathematical Foundations & Rigorous Analytical Models
          </span>
          <h2 className="text-xl font-bold text-white mt-1">{analytical.title}</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {analytical.description}
          </p>
        </div>

        {/* Live Analytical vs Numerical Verification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Average DC Output Voltage <MathInline math="V_{\mathrm{dc}}" />
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Integral Mean</span>
            </div>
            <MathBlock math={analytical.vdcFormula} />
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-400">Analytical: </span>
                <span className="text-amber-300 font-bold">{analytical.calculatedVdc.toFixed(1)} V</span>
              </div>
              <div>
                <span className="text-slate-400">Simulated: </span>
                <span className="text-white font-bold">{metrics.Vdc.toFixed(1)} V</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                RMS Output Voltage <MathInline math="V_{\mathrm{rms}}" />
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Root-Mean-Square</span>
            </div>
            <MathBlock math={analytical.vrmsFormula} />
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-400">Analytical: </span>
                <span className="text-cyan-300 font-bold">{analytical.calculatedVrms.toFixed(1)} V</span>
              </div>
              <div>
                <span className="text-slate-400">Simulated: </span>
                <span className="text-white font-bold">{metrics.Vrms.toFixed(1)} V</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inductive Load Transient ODE Section */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <h3 className="text-sm font-bold text-white">
              Inductive Transient Differential Equation (KVL)
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            During the conduction period, Kirchhoff's Voltage Law across the series <MathInline math="R\text{–}L" /> load branch with sinusoidal grid excitation <MathInline math="v_s(t) = V_m \sin(\omega t)" /> yields the first-order non-homogeneous linear ODE:
          </p>

          <MathBlock math="L \frac{di_o(t)}{dt} + R i_o(t) = V_m \sin(\omega t)" />

          <p className="text-xs text-slate-300 leading-relaxed">
            Subject to the boundary initial condition that the current is zero at the firing instant <MathInline math="i_o(\alpha / \omega) = 0" />, the general solution consists of a steady-state AC response plus a decaying DC transient offset:
          </p>

          <MathBlock math="i_o(\omega t) = \frac{V_m}{Z} \left[ \sin(\omega t - \phi) - \sin(\alpha - \phi) \exp\left( - \frac{\omega t - \alpha}{\omega \tau} \right) \right]" />

          {/* Dynamic evaluated constants */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#02050b] p-3 rounded-lg border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block">Peak Voltage <MathInline math="V_m" /></span>
              <span className="text-slate-200 font-bold">{Vm.toFixed(1)} V</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Impedance <MathInline math="Z = \sqrt{R^2 + (\omega L)^2}" /></span>
              <span className="text-cyan-300 font-bold">{Z.toFixed(2)} Ω</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Phase Angle <MathInline math="\phi = \arctan(\omega L / R)" /></span>
              <span className="text-amber-300 font-bold">{phiDeg.toFixed(1)}°</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Time Constant <MathInline math="\tau = L / R" /></span>
              <span className="text-emerald-300 font-bold">{tau.toFixed(1)} ms</span>
            </div>
          </div>
        </div>

        {/* Transcendental Extinction Equation Section */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <h3 className="text-sm font-bold text-white">
              Transcendental Current Extinction Equation <MathInline math="(\beta)" />
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The exact extinction angle <MathInline math="\beta" /> marks the instant where the inductor has completely discharged its stored magnetic energy <MathInline math="i_o(\beta) = 0" />:
          </p>

          <MathBlock math="\sin(\beta - \phi) = \sin(\alpha - \phi) \exp\left( - \frac{\beta - \alpha}{\tan \phi} \right)" />

          <p className="text-xs text-slate-300 leading-relaxed">
            Because this equation is transcendental, it cannot be solved in closed form with elementary functions and requires root-finding (Newton-Raphson / bisection) or numerical ODE tracking.
          </p>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400">Calculated Extinction Angle: </span>
              <span className="text-rose-400 font-bold">
                {metrics.isCCM ? 'CCM (No Extinction)' : <MathInline math={`\\beta = ${metrics.extinctionDeg.toFixed(1)}^\\circ`} />}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Conduction Angle: </span>
              <span className="text-amber-300 font-bold">
                {metrics.isCCM ? (
                  <MathInline math="\gamma = 180^\circ\text{ or }360^\circ" />
                ) : (
                  <MathInline math={`\\gamma = \\beta - \\alpha = ${(metrics.extinctionDeg - alpha).toFixed(1)}^\\circ`} />
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Performance & Quality Factors */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">
            Power Quality Figures of Merit
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[11px] font-bold text-slate-300 block mb-1">
                Form Factor <MathInline math="FF" />
              </span>
              <MathBlock math="FF = \frac{V_{\mathrm{rms}}}{V_{\mathrm{dc}}}" />
              <div className="mt-2 text-xs font-mono text-cyan-300 font-bold">
                FF = {metrics.FF.toFixed(3)}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[11px] font-bold text-slate-300 block mb-1">
                Ripple Factor <MathInline math="RF" />
              </span>
              <MathBlock math="RF = \sqrt{FF^2 - 1}" />
              <div className="mt-2 text-xs font-mono text-amber-300 font-bold">
                RF = {metrics.RF.toFixed(3)}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-[11px] font-bold text-slate-300 block mb-1">
                Displacement Power Factor <MathInline math="\mathrm{DPF}" />
              </span>
              <MathBlock math="\mathrm{DPF} = \cos \alpha" />
              <div className="mt-2 text-xs font-mono text-emerald-300 font-bold">
                DPF = {metrics.dpf.toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
