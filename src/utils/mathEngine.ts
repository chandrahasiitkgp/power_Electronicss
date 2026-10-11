import { TopologyType, SimStep, SimMetrics, FftData, FftHarmonic } from '../types';

/**
 * Solves circuit ODE using 4th-Order Runge-Kutta (RK4) for an R-L load under AC excitation.
 */
export function solveCircuitRK4(params: {
  topology: TopologyType;
  Vs: number;
  f: number;
  R: number;
  L: number;
  alpha: number;
  hasFD: boolean;
}): { steps: SimStep[]; metrics: SimMetrics; fft: FftData } {
  const { topology, Vs, f, R: rawR, L, alpha, hasFD } = params;
  const omega = 2 * Math.PI * f;
  const Vm = Vs * Math.SQRT2;
  const R = Math.max(0.1, rawR);

  const N = 720; // 0.5 deg resolution per period
  const totalSteps = N * 3; // 3 cycles to reach steady-state
  const dt = (1 / f) / N;
  const dTheta = 360 / N;

  let current_i = 0;
  const rawTrajectory: SimStep[] = [];

  for (let step = 0; step < totalSteps; step++) {
    const thetaDeg = (step * dTheta) % 360;
    const thetaRad = (thetaDeg * Math.PI) / 180;

    // AC Source Potentials
    const va = Vm * Math.sin(thetaRad);
    const vb = Vm * Math.sin(thetaRad - (2 * Math.PI / 3));
    const vc = Vm * Math.sin(thetaRad + (2 * Math.PI / 3));
    const vab = va - vb;
    const vbc = vb - vc;
    const vca = vc - va;

    let appliedVo = 0;
    let activeDevices: string[] = [];
    let gatePulse = 0;
    let firingDevice: string | null = null;
    let vDevice = 0;
    let pathRoute: SimStep['pathRoute'] = 'IDLE';
    let sectorIndex = 0;

    switch (topology) {
      case '1p_hw_diode': {
        if (va > 0) {
          appliedVo = va;
          activeDevices = ['D1'];
          pathRoute = 'FWD_MAINS';
        } else if (hasFD && current_i > 0) {
          appliedVo = 0;
          activeDevices = ['FD'];
          pathRoute = 'FREEWHEEL';
          vDevice = va;
        } else if (current_i > 0) {
          appliedVo = va;
          activeDevices = ['D1'];
          pathRoute = 'FWD_MAINS';
        } else {
          appliedVo = 0;
          vDevice = va;
          pathRoute = 'IDLE';
        }
        break;
      }

      case '1p_hw_scr': {
        if (Math.abs(thetaDeg - alpha) < 2) {
          gatePulse = 1;
          firingDevice = 'T1';
        }
        const canTrigger = thetaDeg >= alpha;

        if (current_i > 0 || (canTrigger && va > 0 && thetaDeg < 180)) {
          if (hasFD && va < 0) {
            appliedVo = 0;
            activeDevices = ['FD'];
            pathRoute = 'FREEWHEEL';
            vDevice = va;
          } else {
            appliedVo = va;
            activeDevices = ['T1'];
            pathRoute = 'FWD_MAINS';
          }
        } else {
          appliedVo = 0;
          vDevice = va;
          pathRoute = 'IDLE';
        }
        break;
      }

      case '1p_fw_diode_bridge': {
        if (va >= 0) {
          appliedVo = va;
          activeDevices = ['D1', 'D2'];
          pathRoute = 'BRIDGE_POS';
        } else {
          appliedVo = -va;
          activeDevices = ['D3', 'D4'];
          pathRoute = 'BRIDGE_NEG';
        }
        vDevice = va >= 0 ? 0 : va;
        break;
      }

      case '1p_fw_scr_bridge': {
        const a2 = (alpha + 180) % 360;
        if (Math.abs(thetaDeg - alpha) < 2) {
          gatePulse = 1;
          firingDevice = 'T1';
        }
        if (Math.abs(thetaDeg - a2) < 2) {
          gatePulse = 1;
          firingDevice = 'T3';
        }

        const inHalf1 = thetaDeg >= alpha && thetaDeg < alpha + 180;
        if (inHalf1) {
          if (current_i > 0 || va > 0) {
            appliedVo = va;
            activeDevices = ['T1', 'T2'];
            pathRoute = 'BRIDGE_POS';
          } else {
            appliedVo = 0;
            vDevice = va;
            pathRoute = 'IDLE';
          }
        } else {
          if (current_i > 0 || -va > 0) {
            appliedVo = -va;
            activeDevices = ['T3', 'T4'];
            pathRoute = 'BRIDGE_NEG';
            vDevice = -va;
          } else {
            appliedVo = 0;
            vDevice = -va;
            pathRoute = 'IDLE';
          }
        }
        break;
      }

      case '1p_fw_semi_bridge': {
        const a2 = (alpha + 180) % 360;
        if (Math.abs(thetaDeg - alpha) < 2) {
          gatePulse = 1;
          firingDevice = 'T1';
        }
        if (Math.abs(thetaDeg - a2) < 2) {
          gatePulse = 1;
          firingDevice = 'T2';
        }

        if (thetaDeg >= alpha && thetaDeg < 180) {
          appliedVo = va;
          activeDevices = ['T1', 'D2'];
          pathRoute = 'BRIDGE_POS';
        } else if (thetaDeg >= 180 && thetaDeg < 180 + alpha) {
          appliedVo = 0;
          activeDevices = ['D2', 'D4'];
          pathRoute = 'FREEWHEEL_SEMI';
        } else if (thetaDeg >= 180 + alpha && thetaDeg < 360) {
          appliedVo = -va;
          activeDevices = ['T2', 'D1'];
          pathRoute = 'BRIDGE_NEG';
        } else {
          appliedVo = 0;
          activeDevices = ['D1', 'D3'];
          pathRoute = 'FREEWHEEL_SEMI';
        }
        break;
      }

      case '1p_fw_midpoint': {
        const a2 = (alpha + 180) % 360;
        if (Math.abs(thetaDeg - alpha) < 2) {
          gatePulse = 1;
          firingDevice = 'T1';
        }
        if (Math.abs(thetaDeg - a2) < 2) {
          gatePulse = 1;
          firingDevice = 'T2';
        }

        if (thetaDeg >= alpha && thetaDeg < alpha + 180) {
          appliedVo = va;
          activeDevices = ['T1'];
          pathRoute = 'MIDPOINT_TOP';
        } else {
          appliedVo = -va;
          activeDevices = ['T2'];
          pathRoute = 'MIDPOINT_BOT';
        }
        vDevice = appliedVo === va ? 0 : 2 * va;
        break;
      }

      case '3p_hw_diode': {
        if (va >= vb && va >= vc) {
          appliedVo = va;
          activeDevices = ['D1'];
          pathRoute = '3P_A';
        } else if (vb >= va && vb >= vc) {
          appliedVo = vb;
          activeDevices = ['D2'];
          pathRoute = '3P_B';
        } else {
          appliedVo = vc;
          activeDevices = ['D3'];
          pathRoute = '3P_C';
        }
        vDevice = activeDevices.includes('D1') ? 0 : va - appliedVo;
        break;
      }

      case '3p_hw_scr': {
        const f1 = (30 + alpha) % 360;
        const f2 = (150 + alpha) % 360;
        const f3 = (270 + alpha) % 360;
        if (Math.abs(thetaDeg - f1) < 2) {
          gatePulse = 1;
          firingDevice = 'T1';
        }
        if (Math.abs(thetaDeg - f2) < 2) {
          gatePulse = 1;
          firingDevice = 'T2';
        }
        if (Math.abs(thetaDeg - f3) < 2) {
          gatePulse = 1;
          firingDevice = 'T3';
        }

        const shifted = (thetaDeg - alpha + 360) % 360;
        if (shifted >= 30 && shifted < 150) {
          appliedVo = va;
          activeDevices = ['T1'];
          pathRoute = '3P_A';
        } else if (shifted >= 150 && shifted < 270) {
          appliedVo = vb;
          activeDevices = ['T2'];
          pathRoute = '3P_B';
        } else {
          appliedVo = vc;
          activeDevices = ['T3'];
          pathRoute = '3P_C';
        }
        vDevice = activeDevices.includes('T1') ? 0 : va - appliedVo;
        break;
      }

      case '3p_fw_diode_bridge': {
        const lines = [vab, -vca, vbc, -vab, vca, -vbc];
        let maxLine = -Infinity;
        let bestSec = 0;
        for (let s = 0; s < 6; s++) {
          if (lines[s] > maxLine) {
            maxLine = lines[s];
            bestSec = s;
          }
        }
        appliedVo = maxLine;
        sectorIndex = bestSec;
        const diodePairs = [
          ['D1', 'D2'],
          ['D3', 'D2'],
          ['D3', 'D4'],
          ['D5', 'D4'],
          ['D5', 'D6'],
          ['D1', 'D6'],
        ];
        activeDevices = diodePairs[bestSec];
        pathRoute = '3P_6PULSE';
        break;
      }

      case '3p_fw_scr_bridge': {
        const refTheta = (thetaDeg - alpha + 360) % 360;
        sectorIndex = Math.floor(refTheta / 60) % 6;
        const lines = [vab, -vca, vbc, -vab, vca, -vbc];
        appliedVo = lines[sectorIndex];

        const pairTable = [
          ['T1', 'T2'],
          ['T3', 'T2'],
          ['T3', 'T4'],
          ['T5', 'T4'],
          ['T5', 'T6'],
          ['T1', 'T6'],
        ];
        activeDevices = pairTable[sectorIndex];
        pathRoute = '3P_6PULSE';

        // Check if gate triggering boundary occurs
        if (refTheta % 60 < 2) {
          gatePulse = 1;
          firingDevice = activeDevices[0];
        }
        break;
      }
    }

    // RK4 integration for inductor current: L * di/dt + R*i = appliedVo
    if (L <= 0.0001) {
      current_i = Math.max(0, appliedVo / R);
    } else {
      const f_ode = (v: number, iVal: number) => (v - R * iVal) / L;
      const k1 = dt * f_ode(appliedVo, current_i);
      const k2 = dt * f_ode(appliedVo, current_i + 0.5 * k1);
      const k3 = dt * f_ode(appliedVo, current_i + 0.5 * k2);
      const k4 = dt * f_ode(appliedVo, current_i + k3);

      current_i += (k1 + 2 * k2 + 2 * k3 + k4) / 6;

      if (current_i <= 0) {
        current_i = 0;
        if (appliedVo < 0) appliedVo = 0;
      }
    }

    rawTrajectory.push({
      deg: thetaDeg,
      va,
      vb,
      vc,
      vo: appliedVo,
      io: current_i,
      vDevice,
      gatePulse,
      firingDevice,
      activeDevices,
      pathRoute,
      sectorIndex,
    });
  }

  // Steady-state 2 cycles (720 degrees)
  const steadyCycle = rawTrajectory.slice(-N * 2);

  // Compute metrics
  const metrics = computeMetrics(steadyCycle, { Vs, R, L, alpha, topology });
  const fft = computeFft(steadyCycle);

  return { steps: steadyCycle, metrics, fft };
}

function computeMetrics(
  steps: SimStep[],
  params: { Vs: number; R: number; L: number; alpha: number; topology: TopologyType }
): SimMetrics {
  const len = steps.length;
  let sumVo = 0;
  let sumVoSq = 0;
  let sumIo = 0;
  let sumIoSq = 0;
  let minIo = Infinity;
  let extinctionDeg = 180;

  for (let i = 0; i < len; i++) {
    const vo = steps[i].vo;
    const io = steps[i].io;
    sumVo += vo;
    sumVoSq += vo * vo;
    sumIo += io;
    sumIoSq += io * io;
    if (io < minIo) minIo = io;

    if (steps[i].deg > 180 && steps[i].deg < 340 && io === 0 && steps[i - 1] && steps[i - 1].io > 0.02) {
      extinctionDeg = steps[i].deg;
    }
  }

  const Vdc = sumVo / len;
  const Vrms = Math.sqrt(sumVoSq / len);
  const Idc = sumIo / len;
  const Irms = Math.sqrt(sumIoSq / len);
  const FF = Vdc !== 0 ? Vrms / Math.abs(Vdc) : 0;
  const RF = Math.sqrt(Math.max(0, FF * FF - 1));
  const dpf = Math.cos((params.alpha * Math.PI) / 180);
  const isCCM = minIo > 0.04 * Idc && params.L > 0.005;

  const Vm = params.Vs * Math.SQRT2;
  const piv = params.topology === '1p_fw_midpoint' ? 2 * Vm : params.topology.startsWith('3p_fw') ? Math.sqrt(3) * Vm : Vm;
  const efficiency = (Vdc * Idc) / Math.max(0.001, Vrms * Irms) * 100;

  return {
    Vdc,
    Vrms,
    Idc,
    Irms,
    FF,
    RF,
    dpf,
    isCCM,
    extinctionDeg,
    efficiency: Math.min(100, Math.max(0, efficiency)),
    piv,
  };
}

function computeFft(steps: SimStep[]): FftData {
  const N = 720;
  const cycleData = steps.slice(0, N);

  const orders: string[] = [];
  const harmonics: FftHarmonic[] = [];
  const vHarmonics: number[] = [];
  const iHarmonics: number[] = [];

  for (let n = 0; n <= 25; n++) {
    const label = n === 0 ? 'DC' : `h${n}`;
    orders.push(label);
    let sumCosV = 0;
    let sumSinV = 0;
    let sumCosI = 0;
    let sumSinI = 0;

    for (let k = 0; k < N; k++) {
      const theta = (k * 2 * Math.PI) / N;
      const vo = cycleData[k].vo;
      const io = cycleData[k].io;

      if (n === 0) {
        sumCosV += vo;
        sumCosI += io;
      } else {
        sumCosV += vo * Math.cos(n * theta);
        sumSinV += vo * Math.sin(n * theta);
        sumCosI += io * Math.cos(n * theta);
        sumSinI += io * Math.sin(n * theta);
      }
    }

    let magV = 0;
    let magI = 0;
    if (n === 0) {
      magV = sumCosV / N;
      magI = sumCosI / N;
    } else {
      magV = (2 / N) * Math.hypot(sumCosV, sumSinV);
      magI = (2 / N) * Math.hypot(sumCosI, sumSinI);
    }

    vHarmonics.push(magV);
    iHarmonics.push(magI);
  }

  const fundamentalV = vHarmonics[1] > 0.001 ? vHarmonics[1] : 1;
  const fundamentalI = iHarmonics[1] > 0.001 ? iHarmonics[1] : 1;

  for (let n = 0; n <= 25; n++) {
    harmonics.push({
      order: n,
      label: orders[n],
      magV: vHarmonics[n],
      magI: iHarmonics[n],
      ratioV: vHarmonics[n] / fundamentalV,
      ratioI: iHarmonics[n] / fundamentalI,
    });
  }

  let sumSquareV = 0;
  let sumSquareI = 0;
  for (let n = 2; n <= 25; n++) {
    sumSquareV += vHarmonics[n] * vHarmonics[n];
    sumSquareI += iHarmonics[n] * iHarmonics[n];
  }

  const thdV = (Math.sqrt(sumSquareV) / fundamentalV) * 100;
  const thdI = (Math.sqrt(sumSquareI) / fundamentalI) * 100;

  return {
    orders,
    harmonics,
    vHarmonics,
    iHarmonics,
    thdV,
    thdI,
    fundamentalV,
    fundamentalI,
  };
}

/**
 * Theoretical closed-form formulas and LaTeX expressions for each topology.
 */
export function getAnalyticalFormulas(topology: TopologyType, Vs: number, alphaDeg: number): {
  title: string;
  vdcFormula: string;
  vrmsFormula: string;
  calculatedVdc: number;
  calculatedVrms: number;
  description: string;
} {
  const Vm = Vs * Math.SQRT2;
  const aRad = (alphaDeg * Math.PI) / 180;
  let title = '';
  let vdcFormula = '';
  let vrmsFormula = '';
  let calculatedVdc = 0;
  let calculatedVrms = 0;
  let description = '';

  switch (topology) {
    case '1p_hw_diode':
      title = '1-Phase Half-Wave Uncontrolled Diode Rectifier';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{V_m}{\\pi} \\approx 0.318 V_m';
      vrmsFormula = 'V_{\\mathrm{rms}} = \\frac{V_m}{2} = 0.5 V_m';
      calculatedVdc = Vm / Math.PI;
      calculatedVrms = Vm / 2;
      description = 'Conduction occurs over interval [0, \\pi]. No control angle applies.';
      break;

    case '1p_hw_scr':
      title = '1-Phase Half-Wave Thyristor (SCR) Controlled Converter';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{V_m}{2\\pi} (1 + \\cos\\alpha)';
      vrmsFormula = 'V_{\\mathrm{rms}} = \\frac{V_m}{2} \\sqrt{1 - \\frac{\\alpha}{\\pi} + \\frac{\\sin(2\\alpha)}{2\\pi}}';
      calculatedVdc = (Vm / (2 * Math.PI)) * (1 + Math.cos(aRad));
      calculatedVrms = (Vm / 2) * Math.sqrt(Math.max(0, 1 - aRad / Math.PI + Math.sin(2 * aRad) / (2 * Math.PI)));
      description = 'Firing delay \\alpha retards switch conduction. Inductive loads prolong conduction beyond \\pi to extinction angle \\beta.';
      break;

    case '1p_fw_diode_bridge':
      title = '1-Phase Full-Wave Diode Bridge (Uncontrolled)';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{2V_m}{\\pi} \\approx 0.636 V_m';
      vrmsFormula = 'V_{\\mathrm{rms}} = \\frac{V_m}{\\sqrt{2}} \\approx 0.707 V_m';
      calculatedVdc = (2 * Vm) / Math.PI;
      calculatedVrms = Vm / Math.SQRT2;
      description = 'Full-wave rectification across all four bridge diodes with zero phase displacement.';
      break;

    case '1p_fw_scr_bridge':
      title = '1-Phase Fully-Controlled Bridge Converter (4 SCRs)';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{2V_m}{\\pi} \\cos\\alpha \\quad (\\text{Continuous Conduction Mode - CCM})';
      vrmsFormula = 'V_{\\mathrm{rms}} = \\frac{V_m}{\\sqrt{2}}';
      calculatedVdc = ((2 * Vm) / Math.PI) * Math.cos(aRad);
      calculatedVrms = Vm / Math.SQRT2;
      description = 'Two-quadrant converter capable of rectifier operation (\\alpha < 90^\\circ) and synchronous inversion (\\alpha > 90^\\circ).';
      break;

    case '1p_fw_semi_bridge':
      title = '1-Phase Half-Controlled Semi-Converter (2 SCRs + 2 Diodes)';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{V_m}{\\pi} (1 + \\cos\\alpha)';
      vrmsFormula = 'V_{\\mathrm{rms}} = V_m \\sqrt{\\frac{1}{2\\pi} \\left( \\pi - \\alpha + \\frac{\\sin(2\\alpha)}{2} \\right)}';
      calculatedVdc = (Vm / Math.PI) * (1 + Math.cos(aRad));
      calculatedVrms = Vm * Math.sqrt(Math.max(0, (1 / (2 * Math.PI)) * (Math.PI - aRad + Math.sin(2 * aRad) / 2)));
      description = 'Natural freewheeling occurs via diode branches when grid voltage inverts, preventing negative terminal voltages.';
      break;

    case '1p_fw_midpoint':
      title = '1-Phase Center-Tapped Transformer Midpoint Converter';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{2V_m}{\\pi} \\cos\\alpha';
      vrmsFormula = 'V_{\\mathrm{rms}} = \\frac{V_m}{\\sqrt{2}}';
      calculatedVdc = ((2 * Vm) / Math.PI) * Math.cos(aRad);
      calculatedVrms = Vm / Math.SQRT2;
      description = 'Uses two thyristors with secondary center-tap return. Peak inverse voltage across switches reaches 2V_m.';
      break;

    case '3p_hw_diode':
      title = '3-Phase Half-Wave Diode Rectifier (3-Pulse)';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{3\\sqrt{3}V_m}{2\\pi} \\approx 0.827 V_m';
      vrmsFormula = 'V_{\\mathrm{rms}} = V_m \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{8\\pi}}';
      calculatedVdc = (3 * Math.sqrt(3) * Vm) / (2 * Math.PI);
      calculatedVrms = Vm * Math.sqrt(0.5 + (3 * Math.sqrt(3)) / (8 * Math.PI));
      description = 'Each phase conducts during the 120^\\circ interval when its phase voltage is most positive.';
      break;

    case '3p_hw_scr':
      title = '3-Phase Half-Wave Controlled Converter (3-Pulse SCR)';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{3\\sqrt{3}V_m}{2\\pi} \\cos\\alpha';
      vrmsFormula = 'V_{\\mathrm{rms}} = \\sqrt{3}V_m \\sqrt{\\frac{1}{6} + \\frac{\\sqrt{3}}{8\\pi}\\cos(2\\alpha)}';
      calculatedVdc = ((3 * Math.sqrt(3) * Vm) / (2 * Math.PI)) * Math.cos(aRad);
      calculatedVrms = Math.sqrt(3) * Vm * Math.sqrt(Math.max(0, 1 / 6 + (Math.sqrt(3) / (8 * Math.PI)) * Math.cos(2 * aRad)));
      description = 'Triggered relative to the 30^\\circ natural commutation intersection of adjacent phase waveforms.';
      break;

    case '3p_fw_diode_bridge':
      title = '3-Phase Full-Wave Diode Bridge (6-Pulse Uncontrolled)';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{3V_{m,LL}}{\\pi} = \\frac{3\\sqrt{3}V_m}{\\pi} \\approx 1.654 V_m';
      vrmsFormula = 'V_{\\mathrm{rms}} = \\sqrt{3}V_m \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi}}';
      calculatedVdc = (3 * Math.sqrt(3) * Vm) / Math.PI;
      calculatedVrms = Math.sqrt(3) * Vm * 0.9558;
      description = 'Standard industrial 6-diode rectifier bridge with low ripple factor (4.2%).';
      break;

    case '3p_fw_scr_bridge':
      title = '3-Phase Fully-Controlled 6-Pulse Converter Bridge';
      vdcFormula = 'V_{\\mathrm{dc}} = \\frac{3V_{m,LL}}{\\pi} \\cos\\alpha = \\frac{3\\sqrt{3}V_m}{\\pi} \\cos\\alpha';
      vrmsFormula = 'V_{\\mathrm{rms}} = \\sqrt{3}V_m \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi}\\cos(2\\alpha)}';
      calculatedVdc = ((3 * Math.sqrt(3) * Vm) / Math.PI) * Math.cos(aRad);
      calculatedVrms = Math.sqrt(3) * Vm * 0.9558;
      description = 'Industrial heavy-duty drive converter operating in six distinct 60^\\circ conduction intervals.';
      break;
  }

  return {
    title,
    vdcFormula,
    vrmsFormula,
    calculatedVdc,
    calculatedVrms,
    description,
  };
}
