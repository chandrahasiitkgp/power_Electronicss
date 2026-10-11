import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TopologyType, ActiveTab } from './types';
import { solveCircuitRK4 } from './utils/mathEngine';
import { GUIDED_EXPERIMENTS, TOPOLOGY_GROUPS } from './data/experiments';
import { MathInline } from './components/MathView';
import { VectorSchematicEngine } from './components/VectorSchematicEngine';
import { Oscilloscope } from './components/Oscilloscope';
import { FftSpectrumView } from './components/FftSpectrumView';
import { MultichannelScopeView } from './components/MultichannelScopeView';
import { TheoryDerivationsView } from './components/TheoryDerivationsView';
import { VirtualMultimeter } from './components/VirtualMultimeter';
import { PhasorWheel } from './components/PhasorWheel';
import { LabReportModal } from './components/LabReportModal';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('lab');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Circuit Parameters
  const [topology, setTopology] = useState<TopologyType>('1p_hw_scr');
  const [Vs, setVs] = useState(230);
  const [f] = useState(50);
  const [R, setR] = useState(20);
  const [L, setL] = useState(0.045); // in Henries
  const [alpha, setAlpha] = useState(45);
  const [hasFD, setHasFD] = useState(false);

  // Playback & Simulation State - Calibrated for human observation
  const [running, setRunning] = useState(true);
  const [omegaT, setOmegaT] = useState(45); // degrees [0, 720)
  const [speed, setSpeed] = useState(0.25); // Recommended educational speed: 22.5 deg/sec

  // Interactive Probing State
  const [probeMode, setProbeMode] = useState(false);
  const [probedComponent, setProbedComponent] = useState('LOAD');

  // Selected experiment preset tracker
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Simulation RK4 solver
  const { steps, metrics, fft } = useMemo(() => {
    return solveCircuitRK4({
      topology,
      Vs,
      f,
      R,
      L,
      alpha,
      hasFD,
    });
  }, [topology, Vs, f, R, L, alpha, hasFD]);

  // Current instantaneous step at omegaT
  const currentStep = useMemo(() => {
    if (!steps || steps.length === 0) return null;
    const idx = Math.floor((omegaT / 720) * steps.length) % steps.length;
    return steps[idx];
  }, [steps, omegaT]);

  // Impedance angle phi
  const phiDeg = useMemo(() => {
    const omega = 2 * Math.PI * f;
    return (Math.atan2(omega * L, R) * 180) / Math.PI;
  }, [f, L, R]);

  // Animation Loop - Calibrated so 1.0x = 90 deg/sec (4s per cycle), 0.25x = 22.5 deg/sec (16s per cycle)
  const animRef = useRef<number | null>(null);
  useEffect(() => {
    let lastTime = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (running) {
        const baseDegreesPerSec = 90;
        setOmegaT((prev) => (prev + baseDegreesPerSec * delta * speed) % 720);
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [running, speed]);

  // Load textbook experiment preset
  const handleLoadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const exp = GUIDED_EXPERIMENTS.find((e) => e.id === presetId);
    if (!exp) return;

    setTopology(exp.topology);
    setVs(exp.Vs);
    setR(exp.R);
    setL(exp.L);
    setAlpha(exp.alpha);
    setHasFD(exp.hasFD);
  };

  const isControlled = topology.includes('scr');
  const allowsFreewheeling = topology.startsWith('1p_hw');

  // Narrative message describing the physical conduction pathway
  const narrative = useMemo(() => {
    if (!currentStep) return { text: 'Simulating circuit...', color: 'text-slate-300' };
    if (currentStep.pathRoute === 'FREEWHEEL' || currentStep.pathRoute === 'FREEWHEEL_SEMI') {
      return {
        text: 'FREEWHEELING CONDUCTION: Stored inductor energy (L di/dt) forces current upward through the freewheeling diode loop. AC mains draw is ZERO.',
        color: 'text-cyan-400',
      };
    }
    if (currentStep.pathRoute === 'IDLE' || currentStep.io < 0.02) {
      return {
        text: 'DISCONTINUOUS IDLE: Inductor energy fully extinguished (i = 0). Circuit awaits the next thyristor gate firing pulse at α.',
        color: 'text-rose-400',
      };
    }
    if (currentStep.vo < 0) {
      return {
        text: 'INDUCTIVE KICKBACK: Collapsing magnetic field forces terminal voltage negative, maintaining thyristor conduction into reverse grid line.',
        color: 'text-amber-400',
      };
    }
    return {
      text: `ACTIVE MAINS CONDUCTION: Supplying energy from grid source via [${currentStep.activeDevices.join(' + ')}]. Inductor field charging.`,
      color: 'text-emerald-400',
    };
  }, [currentStep]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#050811] text-slate-100 font-sans select-none">
      {/* 1. TOP APP BAR */}
      <header className="bg-slate-950/95 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between z-30 shrink-0 gap-8">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-black px-2.5 py-1 rounded text-xs tracking-wider flex items-center gap-1.5 shadow-md shadow-cyan-500/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            POWERSIM PRO
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wide">
              Academic Power Electronics Studio
            </h1>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Vector Schematics &bull; RK4 ODE Solver &bull; Harmonic FFT &bull; KaTeX Notation
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('lab')}
            className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'lab'
                ? 'bg-cyan-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2" strokeWidth="2" />
              <circle cx="9" cy="9" r="2" strokeWidth="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" strokeWidth="2" />
            </svg>
            Laboratory
          </button>
          <button
            onClick={() => setActiveTab('fft')}
            className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'fft'
                ? 'bg-cyan-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M3 3v18h18M9 17V9m4 8V5m4 12v-6" />
            </svg>
            Harmonics &amp; FFT
          </button>
          <button
            onClick={() => setActiveTab('scope')}
            className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'scope'
                ? 'bg-cyan-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
            Multichannel Scope
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'theory'
                ? 'bg-cyan-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Derivations
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setProbeMode(!probeMode)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition flex items-center gap-1.5 ${
              probeMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M12 2v20M2 12h20M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            </svg>
            <span>PROBE: {probeMode ? 'ACTIVE' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition flex items-center gap-1.5 shadow-sm shadow-amber-400/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Report
          </button>
        </div>
      </header>

      {/* 2. SUB-BAR: INTUITIVE TOPOLOGY SELECTION & GUIDED PRESET WORKFLOW */}
      <section className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-20">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            TOPOLOGY ARCHITECTURE:
          </span>
          <select
            value={topology}
            onChange={(e) => setTopology(e.target.value as TopologyType)}
            className="bg-slate-950 border border-slate-700 text-cyan-300 text-xs rounded-lg px-2.5 py-1 outline-none focus:border-cyan-400 font-semibold cursor-pointer"
          >
            {TOPOLOGY_GROUPS.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} ({item.sublabel})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          {/* Guided experiments dropdown */}
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono hidden md:inline">
            GUIDED EXPERIMENTS:
          </span>
          <select
            value={selectedPresetId}
            onChange={(e) => handleLoadPreset(e.target.value)}
            className="bg-slate-950 border border-amber-500/40 text-amber-300 text-xs rounded-lg px-2.5 py-1 outline-none focus:border-amber-400 font-medium cursor-pointer"
          >
            <option value="" disabled>-- Select Textbook Experiment --</option>
            {GUIDED_EXPERIMENTS.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.title}
              </option>
            ))}
          </select>
        </div>

        {/* Conduction Status Badges */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div
            className={`px-2.5 py-0.5 rounded border flex items-center gap-1.5 font-bold ${
              metrics.isCCM
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                metrics.isCCM ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            {metrics.isCCM ? 'CCM (Continuous)' : 'DCM (Discontinuous)'}
          </div>

          <div className="text-slate-400 hidden lg:flex items-center gap-3">
            <span>
              Extinction <strong className="text-rose-400">{metrics.isCCM ? 'N/A' : <MathInline math={`\\beta = ${metrics.extinctionDeg.toFixed(0)}^\\circ`} />}</strong>
            </span>
            <span>&bull;</span>
            <span>
              <MathInline math="\mathrm{THD}_v" />: <strong className="text-cyan-300">{fft.thdV.toFixed(1)}%</strong>
            </span>
            <span>&bull;</span>
            <span>
              <MathInline math="\mathrm{DPF}" />: <strong className="text-amber-300">{metrics.dpf.toFixed(3)}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN WORKSPACE */}
      <div className="flex flex-1 min-h-0 relative">
        {/* LEFT CONTROL SIDEBAR */}
        <aside className="w-80 bg-[#080d1a]/95 border-r border-slate-800/80 flex flex-col shrink-0 overflow-y-auto z-10 text-xs">
          {/* Circuit Parameter Controls */}
          <div className="p-3.5 space-y-3.5 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
                Circuit Parameters
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Interactive RK4</span>
            </div>

            {/* Rotating Phasor Wheel Widget */}
            <PhasorWheel omegaT={omegaT} phiDeg={phiDeg} />

            {/* Line Voltage Vs */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300">
                  Line Voltage <MathInline math="V_{\mathrm{rms}}" />
                </span>
                <span className="text-cyan-400 font-mono font-bold">{Vs} V</span>
              </div>
              <input
                type="range"
                min="24"
                max="440"
                step="1"
                value={Vs}
                onChange={(e) => setVs(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Firing Angle Alpha */}
            {isControlled && (
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-300">
                    Firing Angle <MathInline math="\alpha" />
                  </span>
                  <span className="text-amber-400 font-mono font-bold">{alpha}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="175"
                  step="1"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            )}

            {/* Resistance R */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300">
                  Load Resistance <MathInline math="R" />
                </span>
                <span className="text-cyan-400 font-mono font-bold">{R} Ω</span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="1"
                value={R}
                onChange={(e) => setR(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Inductance L */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300">
                  Load Inductance <MathInline math="L" />
                </span>
                <span className="text-cyan-400 font-mono font-bold">{(L * 1000).toFixed(0)} mH</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="1"
                value={L * 1000}
                onChange={(e) => setL(parseFloat(e.target.value) / 1000)}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Freewheeling Diode Branch Checkbox */}
            {allowsFreewheeling && (
              <div className="flex items-center justify-between pt-1">
                <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasFD}
                    onChange={(e) => setHasFD(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-400 focus:ring-0 cursor-pointer"
                  />
                  <span>Freewheeling Branch <MathInline math="D_{\mathrm{FW}}" /></span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Clamps <MathInline math="v_o \ge 0" />
                </span>
              </div>
            )}
          </div>

          {/* Virtual DMM Probes Module */}
          <div className="p-3 flex-1 flex flex-col justify-end">
            <VirtualMultimeter
              currentStep={currentStep}
              metrics={metrics}
              probedComponent={probedComponent}
              probeMode={probeMode}
              onToggleProbeMode={() => setProbeMode(!probeMode)}
              onSelectComponent={(c) => setProbedComponent(c)}
              topology={topology}
              Vs={Vs}
              R={R}
            />
          </div>

          {/* Simulation Playback & Speed Toolbar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800/80 space-y-2.5 shrink-0">
            {/* Top row: Transport Controls + Speed Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRunning(!running)}
                  className="w-8 h-8 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-cyan-400/20 transition"
                  title={running ? 'Pause Simulation' : 'Play Simulation'}
                >
                  {running ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    setRunning(false);
                    setOmegaT((prev) => (prev - 5 + 720) % 720);
                  }}
                  className="px-1.5 h-7 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center text-[10px] transition font-mono"
                  title="Step -5°"
                >
                  -5°
                </button>
                <button
                  onClick={() => {
                    setRunning(false);
                    setOmegaT((prev) => (prev - 1 + 720) % 720);
                  }}
                  className="px-1.5 h-7 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center text-[10px] transition font-mono"
                  title="Step -1°"
                >
                  -1°
                </button>
                <button
                  onClick={() => {
                    setRunning(false);
                    setOmegaT((prev) => (prev + 1 + 720) % 720);
                  }}
                  className="px-1.5 h-7 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center text-[10px] transition font-mono"
                  title="Step +1°"
                >
                  +1°
                </button>
                <button
                  onClick={() => {
                    setRunning(false);
                    setOmegaT((prev) => (prev + 5 + 720) % 720);
                  }}
                  className="px-1.5 h-7 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center text-[10px] transition font-mono"
                  title="Step +5°"
                >
                  +5°
                </button>
                <button
                  onClick={() => {
                    setOmegaT(0);
                  }}
                  className="w-7 h-7 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center text-xs transition font-mono"
                  title="Reset to 0°"
                >
                  ↺
                </button>
              </div>

              {/* Speed scale selector with clear educational descriptions */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-mono">Speed:</span>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-cyan-300 text-[10px] rounded px-1.5 py-1 font-mono cursor-pointer"
                >
                  <option value="0.05">0.05x (Slow-Mo)</option>
                  <option value="0.1">0.1x (Step Study)</option>
                  <option value="0.25">0.25x (Educational)</option>
                  <option value="0.5">0.5x (Smooth)</option>
                  <option value="1.0">1.0x (Standard)</option>
                  <option value="2.0">2.0x (Fast)</option>
                </select>
              </div>
            </div>

            {/* Interactive Phase Angle Scrub Slider */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-[11px] mb-1 font-mono">
                <span className="text-slate-400">
                  Phase Scrub <MathInline math="\omega t" />:
                </span>
                <span className="text-amber-400 font-bold">{omegaT.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="720"
                step="0.5"
                value={omegaT}
                onChange={(e) => {
                  setRunning(false);
                  setOmegaT(parseFloat(e.target.value));
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />

              {/* Quick Jump Buttons to Key Physical Converter Instants */}
              <div className="grid grid-cols-4 gap-1 mt-1.5 text-[9px] font-mono">
                <button
                  onClick={() => {
                    setRunning(false);
                    setOmegaT(0);
                  }}
                  className="py-1 px-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center transition"
                  title="Jump to cycle origin (0°)"
                >
                  0°
                </button>
                {isControlled ? (
                  <button
                    onClick={() => {
                      setRunning(false);
                      setOmegaT(alpha);
                    }}
                    className="py-1 px-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-center transition font-bold"
                    title={`Jump to firing instant α = ${alpha}°`}
                  >
                    α ({alpha}°)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setRunning(false);
                      setOmegaT(90);
                    }}
                    className="py-1 px-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center transition"
                    title="Jump to 90°"
                  >
                    90°
                  </button>
                )}
                <button
                  onClick={() => {
                    setRunning(false);
                    setOmegaT(180);
                  }}
                  className="py-1 px-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center transition"
                  title="Jump to zero-crossing (180°)"
                >
                  180°
                </button>
                <button
                  onClick={() => {
                    setRunning(false);
                    setOmegaT(metrics.isCCM ? 360 : Math.round(metrics.extinctionDeg));
                  }}
                  className="py-1 px-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-center transition font-bold"
                  title={
                    metrics.isCCM
                      ? 'CCM Continuous (360°)'
                      : `Jump to current extinction angle β = ${metrics.extinctionDeg.toFixed(0)}°`
                  }
                >
                  {metrics.isCCM ? '360°' : `β (${metrics.extinctionDeg.toFixed(0)}°)`}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN STAGE ACCORDING TO ACTIVE TAB */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#050811] overflow-hidden relative">
          {/* TAB 1: LABORATORY */}
          {activeTab === 'lab' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Live Operational Narrative Banner */}
              <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-[10px]">
                    CONDUCTION PATHWAY
                  </span>
                  <span className={`font-medium ${narrative.color}`}>{narrative.text}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400 hidden sm:flex">
                  <span>
                    Sweep <MathInline math={`\\omega t = ${omegaT.toFixed(1)}^\\circ`} />
                  </span>
                  {isControlled && (
                    <span>
                      Alpha <MathInline math={`\\alpha = ${alpha}^\\circ`} />
                    </span>
                  )}
                </div>
              </div>

              {/* Upper Section: High-Resolution Vector Circuit Schematic Canvas */}
              <div className="h-[54%] relative w-full border-b border-slate-800/80 overflow-hidden">
                <VectorSchematicEngine
                  topology={topology}
                  currentStep={currentStep}
                  R={R}
                  L={L}
                  Vs={Vs}
                  hasFD={hasFD}
                  probeMode={probeMode}
                  probedComponent={probedComponent}
                  onSelectComponent={(comp) => setProbedComponent(comp)}
                  speed={speed}
                />
              </div>

              {/* Lower Section: Synchronized Oscilloscope with Direct Alpha Drag */}
              <div className="h-[46%] relative w-full p-2 bg-[#02050b] flex flex-col min-h-0">
                <Oscilloscope
                  steps={steps}
                  omegaT={omegaT}
                  alpha={alpha}
                  extinctionDeg={metrics.extinctionDeg}
                  isCCM={metrics.isCCM}
                  topology={topology}
                  onAlphaChange={(newAlpha) => setAlpha(newAlpha)}
                />
              </div>
            </div>
          )}

          {/* TAB 2: HARMONIC FFT SPECTRUM */}
          {activeTab === 'fft' && (
            <FftSpectrumView fft={fft} topology={topology} />
          )}

          {/* TAB 3: MULTICHANNEL OSCILLOSCOPE */}
          {activeTab === 'scope' && (
            <MultichannelScopeView steps={steps} omegaT={omegaT} alpha={alpha} />
          )}

          {/* TAB 4: STRICT KATEX THEORY & DERIVATIONS */}
          {activeTab === 'theory' && (
            <TheoryDerivationsView
              topology={topology}
              Vs={Vs}
              R={R}
              L={L}
              alpha={alpha}
              f={f}
              metrics={metrics}
            />
          )}
        </main>
      </div>

      {/* 4. LAB REPORT MODAL */}
      <LabReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        topology={topology}
        Vs={Vs}
        f={f}
        R={R}
        L={L}
        alpha={alpha}
        hasFD={hasFD}
        metrics={metrics}
        fft={fft}
      />
    </div>
  );
}
