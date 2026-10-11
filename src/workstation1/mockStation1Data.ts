/* ════════════════════════════════════════════════════════════════════
   STATION 1 · GOAT ANC — MOCK DATASETS
   Every question, sheet value and wave profile the station uses lives in
   this one file. Swap the contents for real material; component and
   logic code only depends on the shapes exported from ./types.
   All content below is PLACEHOLDER.
   ════════════════════════════════════════════════════════════════════ */
import type {
  CheatSheetColumnDef,
  LookupProblemDef,
  McqQuestion,
  ScoringConfig,
  TelemetrySheet,
  WaveCalibration,
  WaveProfile,
} from './types';

/* ── Scoring & timing ─────────────────────────────────────────────── */
export const SCORING: ScoringConfig = {
  totalSeconds: 12 * 60,
  moduleA: {
    questionCount: 3,
    pointsPerQuestion: 100,
    hint1Penalty: 0.4,
    wrongAttemptPenalty: 0.25,
  },
  moduleB: { pointsPerStep: 50, hint1Penalty: 0.4, wrongAttemptPenalty: 0.2 },
  moduleC: { pointsPerRound: 100, hint1Penalty: 0.4, missPenalty: 0.35, hullPips: 3 },
};

/* ── Module A · physical cheat-sheet column names (Hint 1 target) ── */
export const CHEAT_SHEET_COLUMNS: CheatSheetColumnDef[] = [
  { index: 1, label: 'PHASE_REF' },
  { index: 2, label: 'FREQ_BANDS' },
  { index: 3, label: 'DB_SCALE' },
  { index: 4, label: 'SAMPLING' },
  { index: 5, label: 'MIC_TOPOLOGY' },
  { index: 6, label: 'ALGORITHMS' },
  { index: 7, label: 'LATENCY' },
  { index: 8, label: 'MATERIALS' },
];

/* ── Module A · 15-question placeholder bank (3 drawn per run) ───── */
export const QUESTION_BANK: McqQuestion[] = [
  {
    id: 'Q-MOCK-01',
    prompt: 'For ideal cancellation, the anti-noise signal must be shifted by how much relative to the incoming noise?',
    options: ['0°', '90°', '180°', '270°'],
    correctIndex: 2,
    cheatSheetColumn: 1,
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
    cheatSheetColumn: 2,
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
    cheatSheetColumn: 5,
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
    cheatSheetColumn: 5,
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
    cheatSheetColumn: 1,
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
    cheatSheetColumn: 3,
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
    cheatSheetColumn: 4,
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
    cheatSheetColumn: 3,
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
    cheatSheetColumn: 7,
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
    cheatSheetColumn: 6,
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
    cheatSheetColumn: 8,
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
    cheatSheetColumn: 3,
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
    cheatSheetColumn: 2,
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
    cheatSheetColumn: 2,
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
    cheatSheetColumn: 7,
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

/* ── Module B · 8-column telemetry sheet ──────────────────────────────
   Columns 1–4 and 5–8 are two independent "families". Within a family
   the pointer columns (2, 4 / 6, 8) reuse the value domain of the key
   columns (1, 3 / 5, 7) so a result from one column can be located in
   another — that is the cross-referencing the steps rely on. */
export const TELEMETRY_SHEET: TelemetrySheet = {
  columns: [
    { index: 1, key: 'UNIT', label: 'COIL_UNIT' },
    { index: 2, key: 'LINK_UNIT', label: 'LINKED_UNIT' },
    { index: 3, key: 'PORT', label: 'FEED_PORT' },
    { index: 4, key: 'RET_PORT', label: 'RETURN_PORT' },
    { index: 5, key: 'SECTOR', label: 'VESSEL_SECTOR' },
    { index: 6, key: 'LINK_SECTOR', label: 'LINKED_SECTOR' },
    { index: 7, key: 'GAS', label: 'FUEL_LINE' },
    { index: 8, key: 'RET_GAS', label: 'EXHAUST_LINE' },
  ],
  rows: [
    ['U-01', 'U-05', 'P-6', 'P-3', 'S-4', 'S-2', 'G-5', 'G-2'],
    ['U-02', 'U-03', 'P-2', 'P-8', 'S-7', 'S-5', 'G-1', 'G-6'],
    ['U-03', 'U-07', 'P-8', 'P-5', 'S-1', 'S-8', 'G-7', 'G-4'],
    ['U-04', 'U-01', 'P-4', 'P-1', 'S-6', 'S-3', 'G-3', 'G-8'],
    ['U-05', 'U-08', 'P-1', 'P-6', 'S-3', 'S-1', 'G-8', 'G-3'],
    ['U-06', 'U-02', 'P-7', 'P-2', 'S-8', 'S-6', 'G-2', 'G-5'],
    ['U-07', 'U-04', 'P-3', 'P-7', 'S-2', 'S-4', 'G-6', 'G-1'],
    ['U-08', 'U-06', 'P-5', 'P-4', 'S-5', 'S-7', 'G-4', 'G-7'],
  ],
};

/* ── Module B · the two problems ──────────────────────────────────────
   Each problem uses 4 of the 8 columns across 4 chained steps.
   Step n searches for the previous step's answer (step 1: the seed). */
export const LOOKUP_PROBLEMS: [LookupProblemDef, LookupProblemDef] = [
  {
    id: 'P1',
    title: 'PROBLEM 1 · COIL CASCADE',
    designation: 'PF-COIL-ALPHA',
    brief: 'Poloidal coil U-03 is dropping field strength. Trace its linked unit chain through the sheet to find the unit to isolate.',
    seed: 'U-03',
    steps: [
      { matchColumn: 1, readColumn: 2 },
      { matchColumn: 1, readColumn: 3 },
      { matchColumn: 4, readColumn: 1 },
      { matchColumn: 2, readColumn: 1 },
    ],
  },
  {
    id: 'P2',
    title: 'PROBLEM 2 · VESSEL LEAK',
    designation: 'VV-SECTOR-BRAVO',
    brief: 'Vacuum vessel sector S-2 reports a pressure leak. Follow the sector and gas-line links to find the sector to seal.',
    seed: 'S-2',
    steps: [
      { matchColumn: 5, readColumn: 6 },
      { matchColumn: 5, readColumn: 7 },
      { matchColumn: 8, readColumn: 5 },
      { matchColumn: 6, readColumn: 5 },
    ],
  },
];

/* ── Module C · calibration ranges & 3 wave profiles ─────────────── */
export const WAVE_CALIBRATION: WaveCalibration = {
  ampMin: 0.2,
  ampMax: 1.0,
  freqMin: 1.5,
  freqMax: 6.5,
  tolerance: 0.06,
  baselineDb: 92,
  floorDb: 28,
};

export const WAVE_PROFILES: [WaveProfile, WaveProfile, WaveProfile] = [
  {
    id: 'W1',
    callsign: 'SAKAARAN-SCOUT-01',
    noise: { amplitude: 0.68, frequency: 3.4, phase: 40 },
    start: { amp: 0.2, freq: 0.8, phase: 0 },
    timeLimitSec: 50,
    ship: { x: 30, y: 38, scale: 1 },
  },
  {
    id: 'W2',
    callsign: 'SAKAARAN-SCOUT-02',
    noise: { amplitude: 0.44, frequency: 5.0, phase: 130 },
    start: { amp: 0.8, freq: 0.2, phase: 90 },
    timeLimitSec: 45,
    ship: { x: 68, y: 30, scale: 0.85 },
  },
  {
    id: 'W3',
    callsign: 'SAKAARAN-SCOUT-03',
    noise: { amplitude: 0.92, frequency: 2.3, phase: 285 },
    start: { amp: 0.3, freq: 0.75, phase: 200 },
    timeLimitSec: 40,
    ship: { x: 50, y: 45, scale: 1.15 },
  },
];
