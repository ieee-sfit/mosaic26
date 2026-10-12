/* ==========================================================================
   STATION 3 · eChallan Trace — ISOLATED MOCK DATA
   Everything content-related lives here (question bank, registry, problems,
   suspect rounds, filter presets, tuning constants). Swap this file to
   change the game content; the UI reads nothing hard-coded.
   ========================================================================== */

/* ---------- Tuning ------------------------------------------------------ */
export const CONFIG = {
  totalSeconds: 720, // 12-minute unified countdown
  moduleA: { questionCount: 3, pointsPerQuestion: 5, wrongPenalty: 1 }, // 15 pts
  moduleB: { pointsPerStep: 5, wrongPenalty: 1 }, // 8 steps x 5 = 40 pts
  moduleC: {
    pointsPerRound: 15, // 3 rounds x 15 = 45 pts
    failPenalty: 5, // per burned pip within the round (floor: minRoundPoints)
    minRoundPoints: 5,
    pips: 3,
    roundSeconds: 75, // pursuit window per attempt
    passConfidence: 80,
  },
  hintPenalty: { 1: 0.4, 2: 1.0 }, // fraction of the question's points
  speedBonusMax: 20,
} as const;

export const MAX_BASE_SCORE = 100;

/* ---------- Cheat-sheet columns (referenced by Hint 1) ------------------ */
export interface CheatColumn {
  id: number;
  label: string;
}
export const CHEAT_SHEET_COLUMNS: CheatColumn[] = [
  { id: 1, label: 'EXPOSURE & OPTICS' },
  { id: 2, label: 'BINARIZATION & THRESHOLD' },
  { id: 3, label: 'AI CONFIDENCE METRICS' },
  { id: 4, label: 'PLATE SYNTAX · MH 02 XX 0000' },
];

/* ---------- Module A · 15-question bank ---------------------------------- */
export type Topic = 'exposure' | 'binarization' | 'confidence' | 'syntax';

export interface ForensicQuestion {
  id: string;
  topic: Topic;
  cheatColumn: number;
  prompt: string;
  options: [string, string, string, string];
  correct: number; // index into options
}

export const QUESTION_BANK: ForensicQuestion[] = [
  // --- exposure / optics
  {
    id: 'Q01', topic: 'exposure', cheatColumn: 1,
    prompt: 'A night capture is almost black with a faint plate. Which fix lifts the characters without blowing out the frame?',
    options: ['Infrared illumination + raised exposure gain', 'Set binarization threshold to 255', 'Engage the polarizer only', 'Drop ISO to its minimum'],
    correct: 0,
  },
  {
    id: 'Q02', topic: 'exposure', cheatColumn: 1,
    prompt: 'Oncoming headlights bloom across the plate. Which optical element cuts the reflected glare?',
    options: ['Edge sharpening kernel', 'Polarizing filter', 'IR cut-off removal', 'Gamma crush to zero'],
    correct: 1,
  },
  {
    id: 'Q03', topic: 'exposure', cheatColumn: 1,
    prompt: 'The plate background clips to pure white and characters wash out. Correct response?',
    options: ['Raise the gain', 'Add IR illumination', 'Reduce exposure / shutter time', 'Raise brightness in post'],
    correct: 2,
  },
  {
    id: 'Q04', topic: 'exposure', cheatColumn: 1,
    prompt: 'Rain streaks smear plate characters diagonally. Which enhancement stage targets this?',
    options: ['Rain de-fog / de-streak', 'Plate syntax validation', 'Challan tier lookup', 'Radar speed gating'],
    correct: 0,
  },
  // --- binarization
  {
    id: 'Q05', topic: 'binarization', cheatColumn: 2,
    prompt: 'Binarization converts a grayscale plate image into…',
    options: ['A palette of 16 greys', 'Pure black and white pixels using a threshold', 'A colour-inverted copy', 'A lower-resolution thumbnail'],
    correct: 1,
  },
  {
    id: 'Q06', topic: 'binarization', cheatColumn: 2,
    prompt: 'What is the typical symptom of over-aggressive binarization?',
    options: ['Colour saturation spikes', 'Frame rate drops', 'Thin strokes break up and characters fragment', 'Plate syntax errors'],
    correct: 2,
  },
  {
    id: 'Q07', topic: 'binarization', cheatColumn: 2,
    prompt: 'Which technique adapts its threshold per local region — ideal for uneven street lighting?',
    options: ['Global fixed thresholding', 'Histogram stretch only', 'Gamma correction', 'Adaptive (local) thresholding'],
    correct: 3,
  },
  {
    id: 'Q08', topic: 'binarization', cheatColumn: 2,
    prompt: 'Which step should run BEFORE binarization for the best result?',
    options: ['Grayscale conversion', 'Character validation', 'Challan issuing', 'Speed check'],
    correct: 0,
  },
  // --- AI confidence
  {
    id: 'Q09', topic: 'confidence', cheatColumn: 3,
    prompt: 'What ANPR confidence must a read reach before the plate is safe to lock for a challan on this terminal?',
    options: ['50%', '65%', '80%', '100%'],
    correct: 2,
  },
  {
    id: 'Q10', topic: 'confidence', cheatColumn: 3,
    prompt: 'The scanner shows ANPR_CONFIDENCE: 42.0%. What is the correct action?',
    options: ['Issue the challan immediately', 'Re-enhance the image and re-scan', 'Round the value up to 80%', 'Delete the vehicle record'],
    correct: 1,
  },
  {
    id: 'Q11', topic: 'confidence', cheatColumn: 3,
    prompt: 'Which condition most often drags per-character OCR confidence down on look-alikes such as 0/O and 8/B?',
    options: ['Number of lanes on the road', 'Timestamp overlay colour', 'Look-alike glyphs blurred at low resolution', 'Fine amount of the offence'],
    correct: 2,
  },
  {
    id: 'Q12', topic: 'confidence', cheatColumn: 3,
    prompt: 'How does the overall plate confidence behave relative to the individual character scores?',
    options: ['It equals the best single character', 'It is set by the camera megapixel count', 'It equals vehicle speed divided by limit', 'It is pulled down by the weakest characters'],
    correct: 3,
  },
  // --- plate syntax
  {
    id: 'Q13', topic: 'syntax', cheatColumn: 4,
    prompt: 'Which plate follows the correct MH 02 XX 0000 layout?',
    options: ['MH 02 CN 4901', '02 MH CN 4901', 'MH CN 02 4901', 'MH 02 4901 CN'],
    correct: 0,
  },
  {
    id: 'Q14', topic: 'syntax', cheatColumn: 4,
    prompt: 'In MH 02 CN 4901, what does the "02" block denote?',
    options: ['Month of registration', 'RTO district / office code', 'Vehicle class', 'Engine capacity'],
    correct: 1,
  },
  {
    id: 'Q15', topic: 'syntax', cheatColumn: 4,
    prompt: 'In MH 02 XX 0000, the "XX" block is the…',
    options: ['State code', 'Checksum digits', 'Series letters', 'Fine tier'],
    correct: 2,
  },
];

/* ---------- Module B · vehicle registry (8 columns) ---------------------- */
export type RegCol = 'plate' | 'model' | 'vclass' | 'rto' | 'zone' | 'limit' | 'radar' | 'flag';

export interface RegistryRow {
  plate: string;
  model: string;
  vclass: string;
  rto: string;
  zone: string;
  limit: number;
  radar: number;
  flag: string;
}

export const REGISTRY_COLUMNS: { key: RegCol; label: string }[] = [
  { key: 'plate', label: 'PLATE' },
  { key: 'model', label: 'MODEL' },
  { key: 'vclass', label: 'VCLASS' },
  { key: 'rto', label: 'RTO' },
  { key: 'zone', label: 'ZONE' },
  { key: 'limit', label: 'LIMIT' },
  { key: 'radar', label: 'RADAR' },
  { key: 'flag', label: 'FLAG' },
];

export const REGISTRY: RegistryRow[] = [
  { plate: 'MH02CN4901', model: 'Mazda RX-7', vclass: 'LMV', rto: 'MH-02', zone: 'SCHOOL', limit: 30, radar: 78, flag: 'CLEAR' },
  { plate: 'MH12AB4721', model: 'Toyota Supra', vclass: 'LMV', rto: 'MH-12', zone: 'URBAN', limit: 50, radar: 71, flag: 'CLEAR' },
  { plate: 'DL01CA0099', model: 'Dodge Charger', vclass: 'LMV', rto: 'DL-01', zone: 'HIGHWAY', limit: 100, radar: 184, flag: 'STOLEN' },
  { plate: 'MH47R1105', model: 'Nissan Skyline', vclass: 'LMV', rto: 'MH-47', zone: 'URBAN', limit: 50, radar: 96, flag: 'EXPIRED_PUC' },
  { plate: 'MH14KT3308', model: 'Kawasaki H2', vclass: '2W', rto: 'MH-14', zone: 'RESIDENTIAL', limit: 40, radar: 63, flag: 'CLEAR' },
  { plate: 'TN09BX5516', model: 'Mitsubishi Evo', vclass: 'LMV', rto: 'TN-09', zone: 'HIGHWAY', limit: 100, radar: 142, flag: 'CLEAR' },
  { plate: 'KA05MN7788', model: 'Ford Mustang', vclass: 'LMV', rto: 'KA-05', zone: 'SCHOOL', limit: 30, radar: 34, flag: 'UNINSURED' },
  { plate: 'MH02DE1544', model: 'Honda NSX', vclass: 'LMV', rto: 'MH-02', zone: 'URBAN', limit: 50, radar: 118, flag: 'CLEAR' },
];

export const registryRow = (plate: string): RegistryRow => {
  const row = REGISTRY.find((r) => r.plate === plate);
  if (!row) throw new Error(`Unknown plate ${plate}`);
  return row;
};

/** Spaced display form: MH02CN4901 -> MH 02 CN 4901 */
export const formatPlate = (plate: string): string =>
  plate.replace(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/, '$1 $2 $3 $4');

export interface FineTier {
  code: string;
  min: number;
  max: number; // inclusive
  fine: string;
  points: number; // violation (demerit) points logged on challan
  note: string;
}
export const FINE_TIERS: FineTier[] = [
  { code: 'SPD-01', min: 1, max: 10, fine: '₹500', points: 2, note: 'WARNING TIER' },
  { code: 'SPD-02', min: 11, max: 25, fine: '₹1000', points: 4, note: 'STANDARD TIER' },
  { code: 'SPD-03', min: 26, max: 999, fine: '₹2000', points: 6, note: 'IMPOUND TIER' },
];
export const tierFor = (overspeed: number): FineTier =>
  FINE_TIERS.find((t) => overspeed >= t.min && overspeed <= t.max) ?? FINE_TIERS[0];

export const DISPATCH_CODES: Record<string, string> = {
  CLEAR: 'LOG & CHALLAN',
  STOLEN: 'CODE-7 INTERCEPT',
  EXPIRED_PUC: 'CHALLAN + PUC NOTICE',
  UNINSURED: 'CHALLAN + INS NOTICE',
};

export interface LookupStep {
  prompt: string;
  refs: RegCol[]; // registry columns lit up once the step is verified
  options: string[];
  answer: string;
}
export interface RegistryProblem {
  id: string;
  title: string;
  camera: string;
  plate: string;
  steps: LookupStep[]; // always 4
}

const p1 = registryRow('MH02CN4901');
const p2 = registryRow('DL01CA0099');

export const PROBLEMS: RegistryProblem[] = [
  {
    id: 'P1',
    title: 'SCHOOL-ZONE SPEED TRAP',
    camera: 'CAM-03',
    plate: p1.plate,
    steps: [
      {
        prompt: 'Find this plate in the registry. Read its ZONE.',
        refs: ['plate', 'zone'],
        options: ['SCHOOL', 'URBAN', 'HIGHWAY', 'RESIDENTIAL'],
        answer: p1.zone,
      },
      {
        prompt: 'Read the posted LIMIT (km/h) for this row.',
        refs: ['limit'],
        options: ['30', '40', '50', '100'],
        answer: String(p1.limit),
      },
      {
        prompt: 'OVERSPEED = RADAR − LIMIT. What is it (km/h)?',
        refs: ['radar', 'limit'],
        options: ['48', '38', '78', '18'],
        answer: String(p1.radar - p1.limit),
      },
      {
        prompt: 'Match the overspeed to the FINE TIER table. Which code applies?',
        refs: [],
        options: ['SPD-03', 'SPD-02', 'SPD-01', 'RLV-02'],
        answer: tierFor(p1.radar - p1.limit).code,
      },
    ],
  },
  {
    id: 'P2',
    title: 'EXPRESSWAY INTERCEPT',
    camera: 'CAM-11',
    plate: p2.plate,
    steps: [
      {
        prompt: 'Find this plate in the registry. Read its MODEL.',
        refs: ['plate', 'model'],
        options: ['Dodge Charger', 'Honda NSX', 'Ford Mustang', 'Toyota Supra'],
        answer: p2.model,
      },
      {
        prompt: 'Read the posted LIMIT (km/h) for this row.',
        refs: ['limit'],
        options: ['100', '50', '80', '120'],
        answer: String(p2.limit),
      },
      {
        prompt: 'OVERSPEED = RADAR − LIMIT. What is it (km/h)?',
        refs: ['radar', 'limit'],
        options: ['84', '184', '74', '94'],
        answer: String(p2.radar - p2.limit),
      },
      {
        prompt: 'Read the FLAG, then pick its action from the DISPATCH table.',
        refs: ['flag'],
        options: ['CODE-7 INTERCEPT', 'LOG & CHALLAN', 'CHALLAN + PUC NOTICE', 'CHALLAN + INS NOTICE'],
        answer: DISPATCH_CODES[p2.flag],
      },
    ],
  },
];

/* ---------- Module C · filters & suspect rounds -------------------------- */
export type FilterKey = 'ir' | 'pol' | 'fog' | 'bin';
export const FILTER_KEYS: FilterKey[] = ['ir', 'pol', 'fog', 'bin'];

export interface FilterDef {
  key: FilterKey;
  label: string; // button caption
  weight: number; // confidence lost per level of error
  levels: [string, string, string]; // what OFF / LVL 1 / LVL 2 do
  signal: [string, string, string]; // scene telemetry that implies the needed level
  signalLabel: string;
}

export const FILTER_DEFS: FilterDef[] = [
  {
    key: 'ir', label: '[IR INFRARED]', weight: 20.5, signalLabel: 'LUX_LEVEL',
    levels: ['SENSOR PASSIVE', 'NEAR-IR FILL', 'FULL IR FLOOD'],
    signal: ['62 · ADEQUATE', '18 · LOW', '03 · CRITICAL'],
  },
  {
    key: 'pol', label: '[POLARIZED ANTI-GLARE]', weight: 22.5, signalLabel: 'GLARE_IDX',
    levels: ['NO POLARIZER', 'PARTIAL CUT', 'CROSS-POLARIZED'],
    signal: ['0.1 · CLEAN', '0.5 · MODERATE', '0.9 · BLINDING'],
  },
  {
    key: 'fog', label: '[RAIN DEFOG]', weight: 24, signalLabel: 'RAIN_STREAK',
    levels: ['NO DESTREAK', 'LIGHT DESTREAK', 'HEAVY DESTREAK'],
    signal: ['0.1 · DRY', '0.5 · LIGHT', '0.9 · HEAVY'],
  },
  {
    key: 'bin', label: '[EDGE BINARIZATION]', weight: 21.5, signalLabel: 'EDGE_SHARP',
    levels: ['GRAYSCALE RAW', 'SOFT THRESHOLD', 'HARD THRESHOLD'],
    signal: ['0.8 · CRISP', '0.5 · SOFT', '0.2 · SMEARED'],
  },
];

export type FilterLevels = Record<FilterKey, number>;

export interface SuspectRound {
  id: string;
  label: string;
  model: string;
  plate: string; // registry key
  location: string;
  target: FilterLevels; // the sweet-spot combination (also = scene severity)
  peak: number; // confidence at the sweet spot
  floor: number; // never reads below this
  ocrNoise: string; // character shown for unresolved glyphs
}

export const ROUNDS: SuspectRound[] = [
  {
    id: 'R1', label: 'SUSPECT 01', model: 'Mazda RX-7', plate: 'MH02CN4901',
    location: 'BANDRA LINK · KM 14', target: { ir: 1, pol: 0, fog: 2, bin: 1 },
    peak: 96.4, floor: 6.0, ocrNoise: '▒',
  },
  {
    id: 'R2', label: 'SUSPECT 02', model: 'Toyota Supra', plate: 'MH12AB4721',
    location: 'EASTERN EXPRESSWAY · KM 31', target: { ir: 2, pol: 2, fog: 1, bin: 0 },
    peak: 97.2, floor: 8.0, ocrNoise: '▒',
  },
  {
    id: 'R3', label: 'SUSPECT 03', model: 'Dodge Charger', plate: 'DL01CA0099',
    location: 'YAMUNA EXPRESSWAY · KM 62', target: { ir: 0, pol: 1, fog: 2, bin: 2 },
    peak: 95.8, floor: 5.0, ocrNoise: '▒',
  },
];

/** Live ANPR confidence for a filter combination (0–100). */
export const computeConfidence = (round: SuspectRound, levels: FilterLevels): number => {
  let c = round.peak;
  for (const def of FILTER_DEFS) {
    c -= def.weight * Math.abs(levels[def.key] - round.target[def.key]);
  }
  return Math.max(round.floor, Math.min(99.9, Math.round(c * 10) / 10));
};
