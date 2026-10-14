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

export const WAVE_PROFILES: [WaveProfile, WaveProfile, WaveProfile] = [
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
];

/* ── Module B · DIAGNOSE THE LEFTOVER · two waveforms ─────────────────
   Both use WAVE_CALIBRATION, so B's maths is Module C's maths. ALL THREE conditions start wrong. The fix order
   is dominant-error-first: PITCH always comes first (the swelling hides everything else), then the bigger of
   LOUDNESS / TIMING. B1 is the guided one; B2 swaps the order of the last two steps and keeps the errors closer
   in size. The anti-wave always starts QUIETER than the noise, so a loudness error always shows peaks that
   line up with the noise's peaks. No value below is shared with W1..W3 (asserted in the fairness script). */
export const DIAG_WAVEFORMS: [DiagWaveDef, DiagWaveDef] = [
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
    id: 'B2',
    label: 'DRONE SWEEP 2',
    noise: { amplitude: 0.96, frequency: 4.2, phase: 60 },
    // anti: amplitude 0.82 (a bit quiet), 2.7 cycles (too low), phase 204 deg (target 240)
    start: { amp: 0.775, freq: 0.24, phase: 204 },
    order: ['freq', 'phase', 'amp'],
    guided: false,
  },
];

/* ── Module D · SECRET HANDSHAKE · three rounds ──────────────────────
   4 free demo hops, then the scored hops. Two authored rule variants per round; the seed picks one. */
export const HANDSHAKE_ROUNDS: [HandshakeRoundDef, HandshakeRoundDef, HandshakeRoundDef] = [
  {
    points: 5,
    hopMs: 6000, // speed 100
    scoredHops: 6,
    variants: [
      { id: '1a', rule: { kind: 'step', d: 5 } },
      { id: '1b', rule: { kind: 'step', d: -5 } },
    ],
  },
  {
    points: 7,
    hopMs: 5450, // speed 110
    scoredHops: 8,
    variants: [
      { id: '2a', rule: { kind: 'alt', d1: 7, d2: -2 } },
      { id: '2b', rule: { kind: 'inter', c: 5, e: -1 } },
    ],
  },
  {
    points: 8,
    hopMs: 5000, // speed 120
    scoredHops: 10,
    variants: [
      { id: '3a', rule: { kind: 'grow', d0: 1, g: 3 } },
      { id: '3b', rule: { kind: 'fib' } },
    ],
  },
];
