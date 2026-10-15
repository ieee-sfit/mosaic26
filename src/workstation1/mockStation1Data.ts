/* ════════════════════════════════════════════════════════════════════
   STATION 1 · GOAT ANC — MOCK DATASETS
   Every question, wave profile, diagnosis waveform and handshake rule the station uses lives in
   this one file. Swap the contents for real material; component and
   logic code only depends on the shapes exported from ./types.
   All content below is PLACEHOLDER.
   ════════════════════════════════════════════════════════════════════ */
import type { DiagWaveDef, HandshakeRoundDef, McqQuestion, ScoringConfig, WaveCalibration, WaveProfile } from './types';

/* ── Scoring & timing ─────────────────────────────────────────────── */
export const SCORING: ScoringConfig = {
  totalSeconds: 12 * 60,
  moduleA: {
    questionCount: 3,
    pointsPerQuestion: 5, // 3 x 5 = 15
    hint1Penalty: 0.4,
    wrongAttemptPenalty: 0.2,
  },
  moduleB: {
    waves: 2,
    stepPoints: [7, 7, 6], // 20 per waveform, 2 waveforms = 40
    hint1Penalty: 0.4,
    wrongAttemptPenalty: 0.2, // a wrong diagnosis costs 20% of that step
    tolerance: 0.08, // a control counts as fixed within 8% of its range (Module C has its own, wider windows)
  },
  moduleC: { pointsPerRound: 15, hint1Penalty: 0.4, missPenalty: 0.2 }, // 3 x 15 = 45; a shot without a lock costs 20% of the target
  moduleD: {
    maxPoints: 20, // bonus on top of the base; never part of the base or the letter grade
    offerMinSeconds: 90, // no cap of its own: D runs on the shared clock, so it is only offered with at least 90 s left
    offerSeconds: 20, // an unanswered BONUS card auto-skips so an idle kiosk still saves
    hint1Penalty: 0.4,
    successAt: 10, // LINK RESTORED needs at least half of the bonus
  },
};

/* ── Module A · 15-question placeholder bank (3 drawn per run) ───── */
export const QUESTION_BANK: McqQuestion[] = [
  {
    id: 'Q-MOCK-01',
    prompt: 'For ideal cancellation, the anti-noise signal must be shifted by how much relative to the incoming noise?',
    options: ['0°', '90°', '180°', '270°'],
    correctIndex: 2,
    anomaly: {
      zone: 'PORT_WING',
      severity: 'caution',
      code: 'ANOM-0101',
      telemetry: [
        { label: 'FLUX_TOL', value: '±0.06' },
        { label: 'ITER_ZONE', value: 'PORT-MK4' },
        { label: 'PHASE_ERR', value: '+41.2°' },
      ],
    },
  },
  {
    id: 'Q-MOCK-02',
    prompt: 'Active noise cancellation is most effective against which kind of noise?',
    options: ['Sharp high-frequency hiss', 'Steady low-frequency drone', 'Random impulse clicks', 'Ultrasonic whine'],
    correctIndex: 1,
    anomaly: {
      zone: 'PORT_ENGINE',
      severity: 'critical',
      code: 'ANOM-0102',
      telemetry: [
        { label: 'DRONE_HZ', value: '112' },
        { label: 'ITER_ZONE', value: 'AFT-MK2' },
        { label: 'SPL', value: '94 dB' },
      ],
    },
  },
  {
    id: 'Q-MOCK-03',
    prompt: 'A feedforward ANC system places its reference microphone where?',
    options: ['Inside the ear cup, next to the ear', 'Outside, to hear noise before it arrives', 'On the speaker cone', 'Inside the battery pack'],
    correctIndex: 1,
    anomaly: {
      zone: 'BOW',
      severity: 'caution',
      code: 'ANOM-0103',
      telemetry: [
        { label: 'REF_MIC', value: 'OFFLINE' },
        { label: 'FLUX_TOL', value: '±0.04' },
        { label: 'ITER_ZONE', value: 'BOW-MK1' },
      ],
    },
  },
  {
    id: 'Q-MOCK-04',
    prompt: 'A feedback ANC system uses an error microphone located…',
    options: ['Far from the listener', 'Inside the cup, near the ear canal', 'Outside the hull', 'Behind the amplifier'],
    correctIndex: 1,
    anomaly: {
      zone: 'STBD_WING',
      severity: 'caution',
      code: 'ANOM-0104',
      telemetry: [
        { label: 'ERR_MIC', value: 'DRIFT' },
        { label: 'ITER_ZONE', value: 'STBD-MK4' },
        { label: 'GAIN', value: '-3.1 dB' },
      ],
    },
  },
  {
    id: 'Q-MOCK-05',
    prompt: 'Two equal-amplitude waves meet exactly out of phase. The resulting amplitude is…',
    options: ['Doubled', 'Unchanged', 'Halved', 'Zero'],
    correctIndex: 3,
    anomaly: {
      zone: 'CORE',
      severity: 'critical',
      code: 'ANOM-0105',
      telemetry: [
        { label: 'RESIDUE', value: '0.82' },
        { label: 'ITER_ZONE', value: 'CORE-MK7' },
        { label: 'FLUX_TOL', value: '±0.06' },
      ],
    },
  },
  {
    id: 'Q-MOCK-06',
    prompt: 'Perfect phase inversion, but the anti-noise amplitude is only half of the noise. Residual level change?',
    options: ['About −6 dB', 'About −3 dB', 'About −12 dB', 'No change'],
    correctIndex: 0,
    anomaly: {
      zone: 'STBD_ENGINE',
      severity: 'caution',
      code: 'ANOM-0106',
      telemetry: [
        { label: 'ANTI_AMP', value: '0.50' },
        { label: 'ITER_ZONE', value: 'AFT-MK3' },
        { label: 'SPL', value: '88 dB' },
      ],
    },
  },
  {
    id: 'Q-MOCK-07',
    prompt: 'Minimum sample rate needed to capture a 4 kHz tone without aliasing?',
    options: ['2 kHz', '4 kHz', '8 kHz', '16 kHz'],
    correctIndex: 2,
    anomaly: {
      zone: 'BOW',
      severity: 'critical',
      code: 'ANOM-0107',
      telemetry: [
        { label: 'ADC_RATE', value: '6 kHz' },
        { label: 'ALIAS', value: 'DETECTED' },
        { label: 'ITER_ZONE', value: 'BOW-MK2' },
      ],
    },
  },
  {
    id: 'Q-MOCK-08',
    prompt: 'A 20 dB rise in sound pressure level corresponds to what change in pressure amplitude?',
    options: ['×2', '×10', '×20', '×100'],
    correctIndex: 1,
    anomaly: {
      zone: 'PORT_WING',
      severity: 'caution',
      code: 'ANOM-0108',
      telemetry: [
        { label: 'DELTA_SPL', value: '+20 dB' },
        { label: 'ITER_ZONE', value: 'PORT-MK2' },
        { label: 'FLUX_TOL', value: '±0.08' },
      ],
    },
  },
  {
    id: 'Q-MOCK-09',
    prompt: 'Which problem does excessive processing latency cause in an ANC loop?',
    options: ['Anti-noise arrives with the wrong phase', 'The battery drains faster', 'The microphone gain drops', 'Noise becomes quieter overall'],
    correctIndex: 0,
    anomaly: {
      zone: 'CORE',
      severity: 'caution',
      code: 'ANOM-0109',
      telemetry: [
        { label: 'LOOP_LAT', value: '1.9 ms' },
        { label: 'ITER_ZONE', value: 'CORE-MK3' },
        { label: 'PHASE_ERR', value: '+68°' },
      ],
    },
  },
  {
    id: 'Q-MOCK-10',
    prompt: 'Which adaptive algorithm family is the workhorse of practical ANC filters?',
    options: ['Bubble sort', 'LMS / FxLMS', 'Run-length coding', 'Huffman coding'],
    correctIndex: 1,
    anomaly: {
      zone: 'STBD_WING',
      severity: 'caution',
      code: 'ANOM-0110',
      telemetry: [
        { label: 'FILTER', value: 'DIVERGING' },
        { label: 'STEP_MU', value: '0.9' },
        { label: 'ITER_ZONE', value: 'STBD-MK1' },
      ],
    },
  },
  {
    id: 'Q-MOCK-11',
    prompt: 'Passive isolation (foam, seals) works best against which part of the spectrum?',
    options: ['High frequencies', 'Very low frequencies', 'Only DC', 'Every frequency equally'],
    correctIndex: 0,
    anomaly: {
      zone: 'PORT_ENGINE',
      severity: 'caution',
      code: 'ANOM-0111',
      telemetry: [
        { label: 'SEAL_INT', value: '71%' },
        { label: 'ITER_ZONE', value: 'AFT-MK1' },
        { label: 'HF_LEAK', value: 'LOW' },
      ],
    },
  },
  {
    id: 'Q-MOCK-12',
    prompt: 'Two equal in-phase waves are summed. The level rises by roughly…',
    options: ['+3 dB', '+6 dB', '+12 dB', '+20 dB'],
    correctIndex: 1,
    anomaly: {
      zone: 'STBD_ENGINE',
      severity: 'critical',
      code: 'ANOM-0112',
      telemetry: [
        { label: 'PHASE_ERR', value: '0.0°' },
        { label: 'SUM_AMP', value: '2.00' },
        { label: 'ITER_ZONE', value: 'AFT-MK4' },
      ],
    },
  },
  {
    id: 'Q-MOCK-13',
    prompt: 'What is the period of a 250 Hz tone?',
    options: ['2 ms', '4 ms', '8 ms', '25 ms'],
    correctIndex: 1,
    anomaly: {
      zone: 'BOW',
      severity: 'caution',
      code: 'ANOM-0113',
      telemetry: [
        { label: 'TONE_HZ', value: '250' },
        { label: 'ITER_ZONE', value: 'BOW-MK3' },
        { label: 'FLUX_TOL', value: '±0.05' },
      ],
    },
  },
  {
    id: 'Q-MOCK-14',
    prompt: 'Speed of sound is about 343 m/s. What is the wavelength of a 343 Hz tone?',
    options: ['0.5 m', '1 m', '2 m', '343 m'],
    correctIndex: 1,
    anomaly: {
      zone: 'PORT_WING',
      severity: 'caution',
      code: 'ANOM-0114',
      telemetry: [
        { label: 'C_AIR', value: '343 m/s' },
        { label: 'ITER_ZONE', value: 'PORT-MK6' },
        { label: 'TONE_HZ', value: '343' },
      ],
    },
  },
  {
    id: 'Q-MOCK-15',
    prompt: 'At 100 Hz, a 90° phase shift equals what time delay?',
    options: ['1.0 ms', '2.5 ms', '5.0 ms', '10 ms'],
    correctIndex: 1,
    anomaly: {
      zone: 'CORE',
      severity: 'critical',
      code: 'ANOM-0115',
      telemetry: [
        { label: 'PHASE', value: '90°' },
        { label: 'TONE_HZ', value: '100' },
        { label: 'ITER_ZONE', value: 'CORE-MK9' },
      ],
    },
  },
];

/* ── Module C · calibration ranges & 3 wave profiles ─────────────── */
export const WAVE_CALIBRATION: WaveCalibration = {
  ampMin: 0.2,
  ampMax: 1.0,
  freqMin: 1.5,
  freqMax: 6.5,
  // Module C lock windows: phase ±50°, amplitude ±12.5% of its range (±0.10), frequency ±10% of its range (±0.5 cycles).
  // Module B does not use these: it keeps its own 8% tolerance (SCORING.moduleB.tolerance).
  window: { amp: 0.125, freq: 0.1, phase: 50 },
  baselineDb: 92,
  floorDb: 28,
};

/** Module C · 15-profile bank (3 drawn per run, seeded like Module A). W1..W3 are the originals; W4+ were generated and
    checked: every control starts well outside its lock window and no noise value repeats anywhere in B or C. */
export const WAVE_PROFILE_BANK: WaveProfile[] = [
  {
    id: 'W1',
    callsign: 'SAKAARAN-SCOUT-01',
    noise: { amplitude: 0.68, frequency: 3.4, phase: 40 },
    start: { amp: 0.2, freq: 0.8, phase: 0 },
    ship: { x: 30, y: 38, scale: 1 },
  },
  {
    id: 'W2',
    callsign: 'SAKAARAN-SCOUT-02',
    noise: { amplitude: 0.44, frequency: 5.0, phase: 130 },
    start: { amp: 0.8, freq: 0.2, phase: 90 },
    ship: { x: 68, y: 30, scale: 0.85 },
  },
  {
    id: 'W3',
    callsign: 'SAKAARAN-SCOUT-03',
    noise: { amplitude: 0.92, frequency: 2.3, phase: 285 },
    start: { amp: 0.3, freq: 0.75, phase: 200 },
    ship: { x: 50, y: 45, scale: 1.15 },
  },
  {
    id: 'W4',
    callsign: 'SAKAARAN-SCOUT-04',
    noise: { amplitude: 0.5, frequency: 2.1, phase: 275 },
    start: { amp: 0.72, freq: 0.87, phase: 210 },
    ship: { x: 37, y: 34, scale: 0.95 },
  },
  {
    id: 'W5',
    callsign: 'SAKAARAN-SCOUT-05',
    noise: { amplitude: 0.4, frequency: 4.4, phase: 130 },
    start: { amp: 0.97, freq: 0.25, phase: 225 },
    ship: { x: 76, y: 38, scale: 0.95 },
  },
  {
    id: 'W6',
    callsign: 'SAKAARAN-SCOUT-06',
    noise: { amplitude: 0.96, frequency: 2.4, phase: 240 },
    start: { amp: 0.46, freq: 0.99, phase: 340 },
    ship: { x: 26, y: 40, scale: 1.08 },
  },
  {
    id: 'W7',
    callsign: 'SAKAARAN-SCOUT-07',
    noise: { amplitude: 0.82, frequency: 3.2, phase: 120 },
    start: { amp: 0.04, freq: 0.86, phase: 125 },
    ship: { x: 46, y: 39, scale: 1.14 },
  },
  {
    id: 'W8',
    callsign: 'SAKAARAN-SCOUT-08',
    noise: { amplitude: 0.94, frequency: 4.3, phase: 340 },
    start: { amp: 0.33, freq: 0.06, phase: 325 },
    ship: { x: 30, y: 32, scale: 0.85 },
  },
  {
    id: 'W9',
    callsign: 'SAKAARAN-SCOUT-09',
    noise: { amplitude: 0.44, frequency: 2, phase: 35 },
    start: { amp: 0.78, freq: 0.76, phase: 100 },
    ship: { x: 34, y: 31, scale: 1.03 },
  },
  {
    id: 'W10',
    callsign: 'SAKAARAN-SCOUT-10',
    noise: { amplitude: 0.72, frequency: 3.5, phase: 45 },
    start: { amp: 0.27, freq: 0.08, phase: 135 },
    ship: { x: 32, y: 40, scale: 0.88 },
  },
  {
    id: 'W11',
    callsign: 'SAKAARAN-SCOUT-11',
    noise: { amplitude: 0.6, frequency: 5.6, phase: 255 },
    start: { amp: 0.06, freq: 0.34, phase: 265 },
    ship: { x: 74, y: 36, scale: 1.18 },
  },
  {
    id: 'W12',
    callsign: 'SAKAARAN-SCOUT-12',
    noise: { amplitude: 0.48, frequency: 4.4, phase: 130 },
    start: { amp: 0.01, freq: 0.26, phase: 135 },
    ship: { x: 47, y: 40, scale: 0.87 },
  },
  {
    id: 'W13',
    callsign: 'SAKAARAN-SCOUT-13',
    noise: { amplitude: 0.46, frequency: 3.2, phase: 290 },
    start: { amp: 0.91, freq: 0.64, phase: 255 },
    ship: { x: 35, y: 43, scale: 1.06 },
  },
  {
    id: 'W14',
    callsign: 'SAKAARAN-SCOUT-14',
    noise: { amplitude: 0.56, frequency: 2.2, phase: 195 },
    start: { amp: 0.95, freq: 0.92, phase: 305 },
    ship: { x: 68, y: 43, scale: 1.08 },
  },
  {
    id: 'W15',
    callsign: 'SAKAARAN-SCOUT-15',
    noise: { amplitude: 0.48, frequency: 2.5, phase: 135 },
    start: { amp: 0.75, freq: 0.5, phase: 175 },
    ship: { x: 37, y: 43, scale: 1.04 },
  },
];

/** The default trio (the first three of the bank): used when no draw is supplied. */
export const WAVE_PROFILES: [WaveProfile, WaveProfile, WaveProfile] = [WAVE_PROFILE_BANK[0], WAVE_PROFILE_BANK[1], WAVE_PROFILE_BANK[2]];

/* ── Module B · DIAGNOSE THE LEFTOVER · two waveforms ─────────────────
   Both use WAVE_CALIBRATION, so B's maths is Module C's maths. ALL THREE conditions start wrong. The fix order
   is dominant-error-first: PITCH always comes first (the swelling hides everything else), then the bigger of
   LOUDNESS / TIMING. B1 is the guided one; B2 swaps the order of the last two steps and keeps the errors closer
   in size. The anti-wave always starts QUIETER than the noise, so a loudness error always shows peaks that
   line up with the noise's peaks. No value below is shared with W1..W3 (asserted in the fairness script). */
/** Module B · 16-waveform bank: 8 guided (first waveform of a run, loudness second) and 8 open (second waveform, timing second).
    One of each is drawn per run. Every entry was checked with fixOrder: PITCH is the dominant error first, the authored
    order equals the computed order, all three controls start wrong, and the anti-wave starts quieter than the noise. */
export const DIAG_BANK_GUIDED: DiagWaveDef[] = [
  {
    id: 'B1',
    label: 'DRONE SWEEP 1',
    noise: { amplitude: 0.86, frequency: 2.8, phase: 200 },
    // anti: amplitude 0.26 (too quiet), 4.2 cycles (too high), phase 56 deg (target 20)
    start: { amp: 0.0725, freq: 0.54, phase: 56 },
    order: ['freq', 'amp', 'phase'],
    guided: true,
  },
  {
    id: 'BG2',
    label: 'DRONE SWEEP G2',
    noise: { amplitude: 0.9, frequency: 2.1, phase: 140 },
    start: { amp: 0.0772, freq: 0.4035, phase: 352 },
    order: ['freq', 'amp', 'phase'],
    guided: true,
  },
  {
    id: 'BG3',
    label: 'DRONE SWEEP G3',
    noise: { amplitude: 0.98, frequency: 4.4, phase: 280 },
    start: { amp: 0.0086, freq: 0.974, phase: 134 },
    order: ['freq', 'amp', 'phase'],
    guided: true,
  },
  {
    id: 'BG4',
    label: 'DRONE SWEEP G4',
    noise: { amplitude: 0.82, frequency: 3.9, phase: 180 },
    start: { amp: 0.0898, freq: 0.102, phase: 328 },
    order: ['freq', 'amp', 'phase'],
    guided: true,
  },
  {
    id: 'BG5',
    label: 'DRONE SWEEP G5',
    noise: { amplitude: 0.66, frequency: 4.5, phase: 290 },
    start: { amp: 0.1174, freq: 0.8965, phase: 81 },
    order: ['freq', 'amp', 'phase'],
    guided: true,
  },
  {
    id: 'BG6',
    label: 'DRONE SWEEP G6',
    noise: { amplitude: 0.54, frequency: 5.7, phase: 15 },
    start: { amp: 0.0418, freq: 0.5309, phase: 225 },
    order: ['freq', 'amp', 'phase'],
    guided: true,
  },
  {
    id: 'BG7',
    label: 'DRONE SWEEP G7',
    noise: { amplitude: 0.98, frequency: 3.7, phase: 145 },
    start: { amp: 0.0897, freq: 0.7519, phase: 296 },
    order: ['freq', 'amp', 'phase'],
    guided: true,
  },
  {
    id: 'BG8',
    label: 'DRONE SWEEP G8',
    noise: { amplitude: 0.82, frequency: 3.3, phase: 340 },
    start: { amp: 0.0535, freq: 0.6428, phase: 124 },
    order: ['freq', 'amp', 'phase'],
    guided: true,
  },
];
export const DIAG_BANK_OPEN: DiagWaveDef[] = [
  {
    id: 'B2',
    label: 'DRONE SWEEP 2',
    noise: { amplitude: 0.96, frequency: 4.2, phase: 60 },
    // anti: amplitude 0.82 (a bit quiet), 2.7 cycles (too low), phase 204 deg (target 240)
    start: { amp: 0.775, freq: 0.24, phase: 204 },
    order: ['freq', 'phase', 'amp'],
    guided: false,
  },
  {
    id: 'BO2',
    label: 'DRONE SWEEP O2',
    noise: { amplitude: 0.94, frequency: 3.8, phase: 290 },
    start: { amp: 0.6953, freq: 0.2455, phase: 153 },
    order: ['freq', 'phase', 'amp'],
    guided: false,
  },
  {
    id: 'BO3',
    label: 'DRONE SWEEP O3',
    noise: { amplitude: 0.54, frequency: 4.7, phase: 120 },
    start: { amp: 0.3441, freq: 0.8731, phase: 330 },
    order: ['freq', 'phase', 'amp'],
    guided: false,
  },
  {
    id: 'BO4',
    label: 'DRONE SWEEP O4',
    noise: { amplitude: 0.7, frequency: 2.5, phase: 65 },
    start: { amp: 0.4458, freq: 0.4, phase: 285 },
    order: ['freq', 'phase', 'amp'],
    guided: false,
  },
  {
    id: 'BO5',
    label: 'DRONE SWEEP O5',
    noise: { amplitude: 0.94, frequency: 4, phase: 285 },
    start: { amp: 0.6418, freq: 0.2678, phase: 140 },
    order: ['freq', 'phase', 'amp'],
    guided: false,
  },
  {
    id: 'BO6',
    label: 'DRONE SWEEP O6',
    noise: { amplitude: 0.64, frequency: 4.3, phase: 310 },
    start: { amp: 0.3116, freq: 0.853, phase: 75 },
    order: ['freq', 'phase', 'amp'],
    guided: false,
  },
  {
    id: 'BO7',
    label: 'DRONE SWEEP O7',
    noise: { amplitude: 0.94, frequency: 4.1, phase: 50 },
    start: { amp: 0.7478, freq: 0.7974, phase: 184 },
    order: ['freq', 'phase', 'amp'],
    guided: false,
  },
  {
    id: 'BO8',
    label: 'DRONE SWEEP O8',
    noise: { amplitude: 0.6, frequency: 3.8, phase: 30 },
    start: { amp: 0.3912, freq: 0.1761, phase: 153 },
    order: ['freq', 'phase', 'amp'],
    guided: false,
  },
];

/** The default pair (the first of each list): used by the tutorial and when no draw is supplied. */
export const DIAG_WAVEFORMS: [DiagWaveDef, DiagWaveDef] = [DIAG_BANK_GUIDED[0], DIAG_BANK_OPEN[0]];

/* ── Module D · SECRET HANDSHAKE · three rounds ──────────────────────
   4 free demo hops, then the scored hops. 6 / 15 / 15 authored rule variants per round; the seed picks one per round.
   Round 1 stops at 6: a 6-hop round may not revisit a channel, which only the jumps 1, 2, 5, 7, 10 and 11 satisfy.
   Every variant was checked from all 132 start pairs: the beacon always moves, no channel repeats more than the cap,
   and no other rule in the round's family fits the 4 demo hops but predicts a different future.
   Every rule is a plain, regular jump pattern, always counted clockwise (+1..+12): round 1 repeats one jump, round 2 alternates two
   jumps, round 3 makes each jump bigger by a fixed amount. The 4 free hops show the jumps so the pattern can be read off. */
export const HANDSHAKE_ROUNDS: [HandshakeRoundDef, HandshakeRoundDef, HandshakeRoundDef] = [
  {
    points: 5,
    hopMs: 6000, // speed 100
    scoredHops: 6,
    variants: [
      { id: '1a', rule: { kind: 'step', d: 5 } },
      { id: '1b', rule: { kind: 'step', d: 7 } },
      { id: '1c', rule: { kind: 'step', d: 1 } },
      { id: '1d', rule: { kind: 'step', d: 2 } },
      { id: '1e', rule: { kind: 'step', d: 10 } },
      { id: '1f', rule: { kind: 'step', d: 11 } },
    ],
  },
  {
    points: 7,
    hopMs: 5450, // speed 110
    scoredHops: 8,
    variants: [
      { id: '2a', rule: { kind: 'alt', d1: 5, d2: 2 } },
      { id: '2b', rule: { kind: 'alt', d1: 3, d2: 7 } },
      { id: '2c', rule: { kind: 'alt', d1: 1, d2: 2 } },
      { id: '2d', rule: { kind: 'alt', d1: 1, d2: 3 } },
      { id: '2e', rule: { kind: 'alt', d1: 2, d2: 1 } },
      { id: '2f', rule: { kind: 'alt', d1: 2, d2: 3 } },
      { id: '2g', rule: { kind: 'alt', d1: 3, d2: 1 } },
      { id: '2h', rule: { kind: 'alt', d1: 3, d2: 2 } },
      { id: '2i', rule: { kind: 'alt', d1: 4, d2: 1 } },
      { id: '2j', rule: { kind: 'alt', d1: 4, d2: 2 } },
      { id: '2k', rule: { kind: 'alt', d1: 5, d2: 1 } },
      { id: '2l', rule: { kind: 'alt', d1: 6, d2: 1 } },
      { id: '2m', rule: { kind: 'alt', d1: 6, d2: 2 } },
      { id: '2n', rule: { kind: 'alt', d1: 7, d2: 2 } },
      { id: '2o', rule: { kind: 'alt', d1: 8, d2: 3 } },
    ],
  },
  {
    points: 8,
    hopMs: 5000, // speed 120
    scoredHops: 10,
    variants: [
      { id: '3a', rule: { kind: 'grow', d0: 1, g: 3 } },
      { id: '3b', rule: { kind: 'grow', d0: 2, g: 3 } },
      { id: '3c', rule: { kind: 'grow', d0: 1, g: 4 } },
      { id: '3d', rule: { kind: 'grow', d0: 1, g: 6 } },
      { id: '3e', rule: { kind: 'grow', d0: 2, g: 6 } },
      { id: '3f', rule: { kind: 'grow', d0: 3, g: 4 } },
      { id: '3g', rule: { kind: 'grow', d0: 3, g: 8 } },
      { id: '3h', rule: { kind: 'grow', d0: 4, g: 3 } },
      { id: '3i', rule: { kind: 'grow', d0: 4, g: 6 } },
      { id: '3j', rule: { kind: 'grow', d0: 5, g: 3 } },
      { id: '3k', rule: { kind: 'grow', d0: 5, g: 4 } },
      { id: '3l', rule: { kind: 'grow', d0: 7, g: 3 } },
      { id: '3m', rule: { kind: 'grow', d0: 8, g: 3 } },
      { id: '3n', rule: { kind: 'grow', d0: 9, g: 4 } },
      { id: '3o', rule: { kind: 'grow', d0: 1, g: 8 } },
    ],
  },
];
