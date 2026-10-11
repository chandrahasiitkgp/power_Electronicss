import { GuidedExperiment, TopologyType } from '../types';

export const GUIDED_EXPERIMENTS: GuidedExperiment[] = [
  {
    id: 'resistive_baseline',
    title: '1. Resistive Baseline',
    subtitle: '1-Phase HW Uncontrolled (R=20Ω, L=0, α=0°)',
    topology: '1p_hw_diode',
    Vs: 230,
    R: 20,
    L: 0,
    alpha: 0,
    hasFD: false,
    notes: 'Pure resistive load. Voltage and current are perfectly in-phase with zero negative excursion.',
    observationFocus: 'Notice that load current tracks load voltage exactly: io(t) = vo(t) / R. Extinction occurs precisely at 180°.',
  },
  {
    id: 'inductive_kickback',
    title: '2. Inductive Kickback Demo',
    subtitle: '1-Phase HW Controlled (L=80mH, α=45°, No Diode)',
    topology: '1p_hw_scr',
    Vs: 230,
    R: 10,
    L: 0.08,
    alpha: 45,
    hasFD: false,
    notes: 'Stored inductive energy forces thyristor to conduct into the negative mains half-cycle.',
    observationFocus: 'Watch vo(t) become negative between 180° and the extinction angle β. Current continues flowing until stored magnetic energy discharges.',
  },
  {
    id: 'freewheeling_clamping',
    title: '3. Freewheeling Clamping',
    subtitle: '1-Phase HW Controlled with Freewheeling Diode (DFW)',
    topology: '1p_hw_scr',
    Vs: 230,
    R: 10,
    L: 0.08,
    alpha: 45,
    hasFD: true,
    notes: 'Freewheeling diode turns ON when vs crosses zero, clamping vo(t) >= 0 and isolating AC mains.',
    observationFocus: 'Observe how the freewheeling branch prevents negative terminal voltage, boosts average DC output Vdc, and reduces grid harmonic distortion.',
  },
  {
    id: 'ccm_dcm_boundary',
    title: '4. CCM vs DCM Boundary',
    subtitle: '1-Phase Fully-Controlled Bridge Converter',
    topology: '1p_fw_scr_bridge',
    Vs: 230,
    R: 20,
    L: 0.015,
    alpha: 60,
    hasFD: false,
    notes: 'Observe transition from continuous to discontinuous conduction as inductance or firing angle varies.',
    observationFocus: 'Compare continuous load current (CCM) with discontinuous pulses (DCM) where current touches zero for an idle interval.',
  },
  {
    id: 'industrial_6pulse',
    title: '5. Industrial 6-Pulse Converter',
    subtitle: '3-Phase Fully-Controlled Bridge (400V, α=30°)',
    topology: '3p_fw_scr_bridge',
    Vs: 400,
    R: 15,
    L: 0.05,
    alpha: 30,
    hasFD: false,
    notes: 'Heavy-duty 6-pulse industrial converter showing 6 conduction intervals per grid period.',
    observationFocus: 'Observe the 6-pulse ripple (300 Hz fundamental ripple on 50 Hz grid) and low voltage ripple factor (RF < 5%).',
  },
];

export interface TopologyGroup {
  category: string;
  items: Array<{
    id: TopologyType;
    label: string;
    sublabel: string;
    isControlled: boolean;
  }>;
}

export const TOPOLOGY_GROUPS: TopologyGroup[] = [
  {
    category: '1-Phase Half-Wave',
    items: [
      { id: '1p_hw_diode', label: 'Half-Wave Diode', sublabel: 'Uncontrolled', isControlled: false },
      { id: '1p_hw_scr', label: 'Half-Wave Thyristor', sublabel: 'SCR Controlled', isControlled: true },
    ],
  },
  {
    category: '1-Phase Full-Wave',
    items: [
      { id: '1p_fw_diode_bridge', label: 'Diode Bridge', sublabel: '4 Diodes', isControlled: false },
      { id: '1p_fw_scr_bridge', label: 'Controlled Bridge', sublabel: '4 SCRs (2-Quadrant)', isControlled: true },
      { id: '1p_fw_semi_bridge', label: 'Semi-Converter', sublabel: '2 SCRs + 2 Diodes', isControlled: true },
      { id: '1p_fw_midpoint', label: 'Center-Tapped Midpoint', sublabel: '2 SCRs + Transformer', isControlled: true },
    ],
  },
  {
    category: '3-Phase Half-Wave',
    items: [
      { id: '3p_hw_diode', label: '3-Phase Half-Wave Diode', sublabel: '3 Diodes', isControlled: false },
      { id: '3p_hw_scr', label: '3-Phase Half-Wave SCR', sublabel: '3 SCRs (3-Pulse)', isControlled: true },
    ],
  },
  {
    category: '3-Phase Full-Wave',
    items: [
      { id: '3p_fw_diode_bridge', label: '3-Phase Diode Bridge', sublabel: '6 Diodes', isControlled: false },
      { id: '3p_fw_scr_bridge', label: '6-Pulse Controlled Bridge', sublabel: '6 SCRs (Industrial)', isControlled: true },
    ],
  },
];
