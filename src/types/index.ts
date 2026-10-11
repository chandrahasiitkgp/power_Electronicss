/**
 * Types and definitions for PowerSim Pro
 */

export type TopologyType =
  | '1p_hw_diode'
  | '1p_hw_scr'
  | '1p_fw_diode_bridge'
  | '1p_fw_scr_bridge'
  | '1p_fw_semi_bridge'
  | '1p_fw_midpoint'
  | '3p_hw_diode'
  | '3p_hw_scr'
  | '3p_fw_diode_bridge'
  | '3p_fw_scr_bridge';

export type ActiveTab = 'lab' | 'fft' | 'scope' | 'theory' | 'report';

export type CurrentRoute =
  | 'IDLE'
  | 'FWD_MAINS'
  | 'FREEWHEEL'
  | 'FREEWHEEL_SEMI'
  | 'BRIDGE_POS'
  | 'BRIDGE_NEG'
  | 'MIDPOINT_TOP'
  | 'MIDPOINT_BOT'
  | '3P_A'
  | '3P_B'
  | '3P_C'
  | '3P_6PULSE';

export interface SimStep {
  deg: number;
  va: number;
  vb: number;
  vc: number;
  vo: number;
  io: number;
  vDevice: number;
  gatePulse: number;
  firingDevice: string | null;
  activeDevices: string[];
  pathRoute: CurrentRoute;
  sectorIndex: number;
}

export interface SimMetrics {
  Vdc: number;
  Vrms: number;
  Idc: number;
  Irms: number;
  FF: number; // Form factor
  RF: number; // Ripple factor
  dpf: number; // Displacement power factor
  isCCM: boolean;
  extinctionDeg: number;
  efficiency: number;
  piv: number;
}

export interface FftHarmonic {
  order: number;
  label: string;
  magV: number;
  magI: number;
  ratioV: number; // Vn / V1
  ratioI: number; // In / I1
}

export interface FftData {
  orders: string[];
  harmonics: FftHarmonic[];
  vHarmonics: number[];
  iHarmonics: number[];
  thdV: number;
  thdI: number;
  fundamentalV: number;
  fundamentalI: number;
}

export interface ProbedComponent {
  id: string;
  name: string;
  pLead: { x: number; y: number };
  nLead: { x: number; y: number };
  radius: number;
  type: 'source' | 'switch' | 'load' | 'inductor' | 'diode';
}

export interface GuidedExperiment {
  id: string;
  title: string;
  subtitle: string;
  topology: TopologyType;
  Vs: number;
  R: number;
  L: number; // in Henries
  alpha: number;
  hasFD: boolean;
  notes: string;
  observationFocus: string;
}
