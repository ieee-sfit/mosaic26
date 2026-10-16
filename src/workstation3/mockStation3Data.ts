/* ==========================================================================
   STATION 3 · eChallan Trace — ISOLATED MOCK DATA
   Everything content-related lives here (question bank, case files with the
   plate-rebuild rounds, suspect rounds and sighting chains, filter presets,
   tuning constants). Swap this file to
   change the game content; the UI reads nothing hard-coded.
   ========================================================================== */

/* ---------- Tuning ------------------------------------------------------ */
export const CONFIG = {
  totalSeconds: 720, // 12-minute unified countdown
  moduleA: { questionCount: 3, pointsPerQuestion: 5, wrongPenalty: 1 }, // 15 pts
  moduleB: { rounds: 4, pointsPerRound: 10, wrongCost: 0.2 }, // 4 plates x 10 = 40 pts; a wrong check costs 20% of the plate
  moduleC: {
    pointsPerRound: 15, // 3 rounds x 15 = 45 pts
    failCost: 0.2, // a failed lock (below the pass mark) costs 20% of that suspect's points; the player keeps trying
    passConfidence: 80,
  },
  moduleD: {
    max: 20, // bonus, never part of the base or the letter grade
    minSecondsToOffer: 90, // the bonus is only offered when at least this much shift time is left after Module C
    offerSeconds: 20, // an unanswered BONUS card auto-skips so an idle kiosk still saves
    items: { chain: 10, offender: 5, blockade: 5 },
    wrongCost: 0.2, // a wrong try costs 20% of the item
  },
  hintPenalty: { 1: 0.4, 2: 1.0 }, // fraction of the question's points
  speedBonusMax: 20,
} as const;

export const MAX_BASE_SCORE = 100;

/* ---------- Module A · 15-question bank ---------------------------------- */
export type Topic = 'exposure' | 'binarization' | 'confidence' | 'syntax';

export interface ForensicQuestion {
  id: string;
  topic: Topic;
  prompt: string;
  options: [string, string, string, string];
  correct: number; // index into options
}

export const QUESTION_BANK: ForensicQuestion[] = [
  // --- exposure / optics
  {
    id: 'Q01', topic: 'exposure',
    prompt: 'A night capture is almost black with a faint plate. Which fix lifts the characters without blowing out the frame?',
    options: ['Infrared illumination + raised exposure gain', 'Set binarization threshold to 255', 'Engage the polarizer only', 'Drop ISO to its minimum'],
    correct: 0,
  },
  {
    id: 'Q02', topic: 'exposure',
    prompt: 'Oncoming headlights bloom across the plate. Which optical element cuts the reflected glare?',
    options: ['Edge sharpening kernel', 'Polarizing filter', 'IR cut-off removal', 'Gamma crush to zero'],
    correct: 1,
  },
  {
    id: 'Q03', topic: 'exposure',
    prompt: 'The plate background clips to pure white and characters wash out. Correct response?',
    options: ['Raise the gain', 'Add IR illumination', 'Reduce exposure / shutter time', 'Raise brightness in post'],
    correct: 2,
  },
  {
    id: 'Q04', topic: 'exposure',
    prompt: 'Rain streaks smear plate characters diagonally. Which enhancement stage targets this?',
    options: ['Rain de-fog / de-streak', 'Plate syntax validation', 'Challan tier lookup', 'Radar speed gating'],
    correct: 0,
  },
  // --- binarization
  {
    id: 'Q05', topic: 'binarization',
    prompt: 'Binarization converts a grayscale plate image into…',
    options: ['A palette of 16 greys', 'Pure black and white pixels using a threshold', 'A colour-inverted copy', 'A lower-resolution thumbnail'],
    correct: 1,
  },
  {
    id: 'Q06', topic: 'binarization',
    prompt: 'What is the typical symptom of over-aggressive binarization?',
    options: ['Colour saturation spikes', 'Frame rate drops', 'Thin strokes break up and characters fragment', 'Plate syntax errors'],
    correct: 2,
  },
  {
    id: 'Q07', topic: 'binarization',
    prompt: 'Which technique adapts its threshold per local region — ideal for uneven street lighting?',
    options: ['Global fixed thresholding', 'Histogram stretch only', 'Gamma correction', 'Adaptive (local) thresholding'],
    correct: 3,
  },
  {
    id: 'Q08', topic: 'binarization',
    prompt: 'Which step should run BEFORE binarization for the best result?',
    options: ['Grayscale conversion', 'Character validation', 'Challan issuing', 'Speed check'],
    correct: 0,
  },
  // --- AI confidence
  {
    id: 'Q09', topic: 'confidence',
    prompt: 'What ANPR confidence must a read reach before the plate is safe to lock for a challan on this terminal?',
    options: ['50%', '65%', '80%', '100%'],
    correct: 2,
  },
  {
    id: 'Q10', topic: 'confidence',
    prompt: 'The scanner shows ANPR_CONFIDENCE: 42.0%. What is the correct action?',
    options: ['Issue the challan immediately', 'Re-enhance the image and re-scan', 'Round the value up to 80%', 'Delete the vehicle record'],
    correct: 1,
  },
  {
    id: 'Q11', topic: 'confidence',
    prompt: 'Which condition most often drags per-character OCR confidence down on look-alikes such as 0/O and 8/B?',
    options: ['Number of lanes on the road', 'Timestamp overlay colour', 'Look-alike glyphs blurred at low resolution', 'Fine amount of the offence'],
    correct: 2,
  },
  {
    id: 'Q12', topic: 'confidence',
    prompt: 'How does the overall plate confidence behave relative to the individual character scores?',
    options: ['It equals the best single character', 'It is set by the camera megapixel count', 'It equals vehicle speed divided by limit', 'It is pulled down by the weakest characters'],
    correct: 3,
  },
  // --- plate syntax
  {
    id: 'Q13', topic: 'syntax',
    prompt: 'Which plate follows the correct MH 02 XX 0000 layout?',
    options: ['MH 02 CN 4901', '02 MH CN 4901', 'MH CN 02 4901', 'MH 02 4901 CN'],
    correct: 0,
  },
  {
    id: 'Q14', topic: 'syntax',
    prompt: 'In MH 02 CN 4901, what does the "02" block denote?',
    options: ['Month of registration', 'RTO district / office code', 'Vehicle class', 'Engine capacity'],
    correct: 1,
  },
  {
    id: 'Q15', topic: 'syntax',
    prompt: 'In MH 02 XX 0000, the "XX" block is the…',
    options: ['State code', 'Checksum digits', 'Series letters', 'Fine tier'],
    correct: 2,
  },
];


/* ---------- Plates & registry -------------------------------------------- */
export interface RegistryRow {
  plate: string;
  model: string;
  vclass: string;
  rto: string;
  zone: string;
  limit: number;
  radar: number;
  flag: 'CLEAR' | 'EXPIRED_PUC' | 'UNINSURED';
}

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

export const FLAG_TEXT: Record<RegistryRow['flag'], string> = {
  CLEAR: 'RECORD CLEAR',
  EXPIRED_PUC: 'EXPIRED PUC TAG',
  UNINSURED: 'NO INSURANCE',
};

/* ---------- Module B · Plate Rebuild -------------------------------------- *
 * Plate layout: SS DD LL DDDD (2 letters, 2 digits, 2 letters, 4 digits).
 * A rebuild round smudges 3-4 glyphs. Each smudge is one of two look-alikes
 * ([truth, other]); the slot type (letter / digit) settles a mixed pair such as
 * 0 / O, and a witness clue settles a same-type pair such as C / G.
 * ------------------------------------------------------------------------- */
export const SLOT_TYPES: readonly ('L' | 'D')[] = ['L', 'L', 'D', 'D', 'L', 'L', 'D', 'D', 'D', 'D'];

export type Clue =
  | { k: 'alpha' } // first series letter comes before the second
  | { k: 'before'; v: string } // first series letter is before v
  | { k: 'after'; v: string } // first series letter is after v
  | { k: 'gt'; v: number } // serial number above v
  | { k: 'lt'; v: number } // serial number below v
  | { k: 'odd' }
  | { k: 'even' }
  | { k: 'sum'; v: number }; // serial digits add up to v

export interface Smudge {
  idx: number; // position in the 10-glyph plate
  pair: [string, string]; // [true glyph, look-alike]
}

export interface RebuildRound {
  id: string;
  label: string;
  camera: string;
  plate: string; // the true plate
  smudges: Smudge[];
  clues: Clue[];
}

/* ---------- Module D · Sighting Chains ----------------------------------- */
export interface Sighting {
  id: string;
  gantry: 1 | 2 | 3;
  lane: 1 | 2 | 3 | 4;
  reads: Partial<Record<number, string>>; // plate positions this camera could read
  truth: 0 | 1; // which twin it really was (never shown)
  note?: string; // behaviour log, shown in the evidence once the chains are locked
}

export type Complaint = 'EXPIRED_PUC' | 'UNINSURED' | 'WEAVING';
export const COMPLAINT_TEXT: Record<Complaint, string> = {
  EXPIRED_PUC: 'EXPIRED PUC TAG',
  UNINSURED: 'NO INSURANCE',
  WEAVING: 'DANGEROUS DRIVING · LANE WEAVING',
};

export interface ChaseCase {
  complaint: Complaint;
  /** Kilometre marker of CAM 1, CAM 2 and CAM 3 on the expressway (display only). */
  kms: [number, number, number];
  offender: 0 | 1; // the twin that matches the complaint
  sightings: Sighting[]; // 2 per gantry; the G1 pair are the locked anchors
}

/* ---------- Case files (two authored variants) ---------------------------- */
export interface CaseFile {
  id: string;
  twins: [string, string]; // the two silver coupes
  decoy: string; // the unrelated car in Module C
  rebuild: RebuildRound[]; // Module B: warm-up, decoy, twin 1, twin 2
  registry: RegistryRow[];
  rounds: SuspectRound[]; // Module C: twin 1, decoy, twin 2
  chase: ChaseCase;
}

const row = (plate: string, model: string, rto: string, zone: string, limit: number, radar: number, flag: RegistryRow['flag']): RegistryRow =>
  ({ plate, model, vclass: 'LMV', rto, zone, limit, radar, flag });

export const CASES: CaseFile[] = [
  {
    id: 'CASE-A',
    twins: ['MH02CN4901', 'MH02GN4907'],
    decoy: 'DL04RV3592',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-03', plate: 'GJ06KD2085',
        smudges: [
          { idx: 2, pair: ['0', 'O'] },
          { idx: 5, pair: ['D', '0'] },
          { idx: 8, pair: ['8', 'B'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-07', plate: 'DL04RV3592',
        smudges: [
          { idx: 2, pair: ['0', 'O'] },
          { idx: 6, pair: ['3', '8'] },
          { idx: 9, pair: ['2', 'Z'] },
        ],
        clues: [{ k: 'lt', v: 5000 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-07', plate: 'MH02CN4901',
        smudges: [
          { idx: 2, pair: ['0', 'O'] },
          { idx: 4, pair: ['C', 'G'] },
          { idx: 9, pair: ['1', '7'] },
        ],
        clues: [{ k: 'before', v: 'F' }, { k: 'sum', v: 14 }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-07', plate: 'MH02GN4907',
        smudges: [
          { idx: 3, pair: ['2', 'Z'] },
          { idx: 4, pair: ['G', 'C'] },
          { idx: 8, pair: ['0', '8'] },
          { idx: 9, pair: ['7', '1'] },
        ],
        clues: [{ k: 'after', v: 'F' }, { k: 'sum', v: 20 }],
      },
    ],
    registry: [
      row('MH02CN4901', 'Silver Coupe', 'MH-02', 'URBAN', 50, 78, 'UNINSURED'),
      row('MH02GN4907', 'Silver Coupe', 'MH-02', 'HIGHWAY', 100, 142, 'EXPIRED_PUC'),
      row('DL04RV3592', 'Blue Hatchback', 'DL-04', 'SCHOOL', 30, 61, 'CLEAR'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'MH02CN4901', location: 'BANDRA LINK · KM 14', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'DL04RV3592', location: 'EASTERN EXPRESSWAY · KM 31', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'MH02GN4907', location: 'YAMUNA EXPRESSWAY · KM 62', ocrNoise: '▒' },
    ],
    chase: {
      kms: [14, 15, 16],
      complaint: 'EXPIRED_PUC',
      offender: 1,
      sightings: [
        { id: 'a1', gantry: 1, lane: 1, truth: 0, reads: { 4: 'C', 6: '4' } },
        { id: 'a2', gantry: 1, lane: 4, truth: 1, reads: { 4: 'G', 7: '9' } },
        { id: 'b1', gantry: 2, lane: 2, truth: 0, reads: { 6: '4' } },
        { id: 'b2', gantry: 2, lane: 3, truth: 1, reads: { 7: '9' } },
        { id: 'c1', gantry: 3, lane: 2, truth: 1, reads: { 4: 'G', 9: '7' } },
        { id: 'c2', gantry: 3, lane: 3, truth: 0, reads: { 4: 'C', 9: '1' } },
      ],
    },
  },
  {
    id: 'CASE-B',
    twins: ['KA05HM3814', 'KA05NM3819'],
    decoy: 'RJ14PT2760',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-02', plate: 'TN09BX5516',
        smudges: [
          { idx: 2, pair: ['0', 'O'] },
          { idx: 6, pair: ['5', 'S'] },
          { idx: 9, pair: ['6', 'G'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-09', plate: 'RJ14PT2760',
        smudges: [
          { idx: 3, pair: ['4', 'A'] },
          { idx: 4, pair: ['P', 'R'] },
          { idx: 9, pair: ['0', 'O'] },
        ],
        clues: [{ k: 'before', v: 'Q' }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-09', plate: 'KA05HM3814',
        smudges: [
          { idx: 2, pair: ['0', 'O'] },
          { idx: 4, pair: ['H', 'N'] },
          { idx: 9, pair: ['4', '9'] },
        ],
        clues: [{ k: 'before', v: 'K' }, { k: 'even' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-09', plate: 'KA05NM3819',
        smudges: [
          { idx: 3, pair: ['5', 'S'] },
          { idx: 4, pair: ['N', 'H'] },
          { idx: 8, pair: ['1', '7'] },
          { idx: 9, pair: ['9', '4'] },
        ],
        clues: [{ k: 'after', v: 'K' }, { k: 'sum', v: 21 }],
      },
    ],
    registry: [
      row('KA05HM3814', 'Silver Coupe', 'KA-05', 'URBAN', 50, 92, 'CLEAR'),
      row('KA05NM3819', 'Silver Coupe', 'KA-05', 'HIGHWAY', 100, 131, 'EXPIRED_PUC'),
      row('RJ14PT2760', 'Blue Hatchback', 'RJ-14', 'RESIDENTIAL', 40, 63, 'CLEAR'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'KA05HM3814', location: 'OUTER RING ROAD · KM 9', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'RJ14PT2760', location: 'MYSORE EXPRESSWAY · KM 22', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'KA05NM3819', location: 'MYSORE EXPRESSWAY · KM 48', ocrNoise: '▒' },
    ],
    chase: {
      kms: [9, 10, 11],
      complaint: 'WEAVING',
      offender: 0,
      sightings: [
        { id: 'a1', gantry: 1, lane: 2, truth: 0, reads: { 4: 'H', 6: '3' }, note: 'WEAVING' },
        { id: 'a2', gantry: 1, lane: 3, truth: 1, reads: { 4: 'N', 7: '8' } },
        { id: 'b1', gantry: 2, lane: 2, truth: 0, reads: { 6: '3' }, note: 'WEAVING' },
        { id: 'b2', gantry: 2, lane: 3, truth: 1, reads: { 7: '8' } },
        { id: 'c1', gantry: 3, lane: 1, truth: 0, reads: { 4: 'H', 9: '4' }, note: 'WEAVING' },
        { id: 'c2', gantry: 3, lane: 4, truth: 1, reads: { 4: 'N', 9: '9' } },
      ],
    },
  },
];

export const caseFor = (seed: number): CaseFile => CASES[(seed >>> 0) % CASES.length];
export const registryRow = (cas: CaseFile, plate: string): RegistryRow => {
  const r = cas.registry.find((x) => x.plate === plate);
  if (!r) throw new Error(`Unknown plate ${plate}`);
  return r;
};

/* ---------- Module C · suspect rounds ------------------------------------- *
 * The filters, reading scales and authored confidence tables live in ./lens.ts.
 * ------------------------------------------------------------------------- */
export interface SuspectRound {
  id: string;
  label: string;
  model: string;
  plate: string; // registry key
  location: string;
  ocrNoise: string; // character shown for unresolved glyphs
}
