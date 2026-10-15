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

/* ---------- Case files (15 variants: two authored, thirteen generated) -----
 * CASE-A / CASE-B are authored. CASE-C.. were generated, then proven by the repo's own solvers (logic.ts): every plate-rebuild
 * round has exactly one answer, the warm-up needs only the slot rule, every other round needs BOTH the slot rule and its clues (and no
 * clue is spare), and every chase has exactly one valid chain that needs BOTH the plates rule and the lanes rule.
 * ------------------------------------------------------------------------- */
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
  {
    id: 'CASE-C',
    twins: ['DL47GC9086', 'DL47CC9085'],
    decoy: 'TN23AA1066',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-03', plate: 'RJ17TY7534',
        smudges: [
          { idx: 2, pair: ['1', 'I'] },
          { idx: 7, pair: ['5', 'S'] },
          { idx: 9, pair: ['4', 'A'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-01', plate: 'TN23AA1066',
        smudges: [
          { idx: 4, pair: ['A', '4'] },
          { idx: 6, pair: ['1', '7'] },
          { idx: 9, pair: ['6', 'G'] },
        ],
        clues: [{ k: 'lt', v: 6000 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-05', plate: 'DL47GC9086',
        smudges: [
          { idx: 2, pair: ['4', 'A'] },
          { idx: 4, pair: ['G', 'C'] },
          { idx: 9, pair: ['6', '5'] },
        ],
        clues: [{ k: 'after', v: 'E' }, { k: 'even' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-05', plate: 'DL47CC9085',
        smudges: [
          { idx: 2, pair: ['4', 'A'] },
          { idx: 4, pair: ['C', 'G'] },
          { idx: 8, pair: ['8', '0'] },
          { idx: 9, pair: ['5', '6'] },
        ],
        clues: [{ k: 'before', v: 'E' }, { k: 'sum', v: 22 }],
      },
    ],
    registry: [
      row('DL47GC9086', 'Silver Coupe', 'DL-47', 'RESIDENTIAL', 40, 55, 'CLEAR'),
      row('DL47CC9085', 'Silver Coupe', 'DL-47', 'SCHOOL', 30, 51, 'EXPIRED_PUC'),
      row('TN23AA1066', 'Blue Hatchback', 'TN-23', 'HIGHWAY', 100, 119, 'UNINSURED'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'DL47GC9086', location: 'COASTAL ROAD · KM 57', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'TN23AA1066', location: 'GACHIBOWLI FLYOVER · KM 44', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'DL47CC9085', location: 'ANNA SALAI · KM 45', ocrNoise: '▒' },
    ],
    chase: {
      kms: [57, 58, 59],
      complaint: 'EXPIRED_PUC',
      offender: 1,
      sightings: [
        { id: 'a1', gantry: 1, lane: 3, truth: 0, reads: { 4: 'G' } },
        { id: 'a2', gantry: 1, lane: 2, truth: 1, reads: { 7: '0' } },
        { id: 'b1', gantry: 2, lane: 2, truth: 0, reads: { 6: '9' } },
        { id: 'b2', gantry: 2, lane: 3, truth: 1, reads: { 4: 'C' } },
        { id: 'c1', gantry: 3, lane: 4, truth: 1, reads: { 9: '5' } },
        { id: 'c2', gantry: 3, lane: 2, truth: 0, reads: { 7: '0', 9: '6' } },
      ],
    },
  },
  {
    id: 'CASE-D',
    twins: ['GJ28ZJ1556', 'GJ28SJ1555'],
    decoy: 'KL56DJ3588',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-02', plate: 'RJ15YK8791',
        smudges: [
          { idx: 3, pair: ['5', 'S'] },
          { idx: 6, pair: ['8', 'B'] },
          { idx: 9, pair: ['1', 'I'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-01', plate: 'KL56DJ3588',
        smudges: [
          { idx: 2, pair: ['5', 'S'] },
          { idx: 7, pair: ['5', '9'] },
          { idx: 9, pair: ['8', 'B'] },
        ],
        clues: [{ k: 'sum', v: 24 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-05', plate: 'GJ28ZJ1556',
        smudges: [
          { idx: 4, pair: ['Z', 'S'] },
          { idx: 6, pair: ['1', 'I'] },
          { idx: 9, pair: ['6', '5'] },
        ],
        clues: [{ k: 'even' }, { k: 'after', v: 'S' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-05', plate: 'GJ28SJ1555',
        smudges: [
          { idx: 2, pair: ['2', 'Z'] },
          { idx: 3, pair: ['8', 'B'] },
          { idx: 4, pair: ['S', 'Z'] },
          { idx: 9, pair: ['5', '6'] },
        ],
        clues: [{ k: 'before', v: 'Z' }, { k: 'odd' }],
      },
    ],
    registry: [
      row('GJ28ZJ1556', 'Silver Coupe', 'GJ-28', 'RESIDENTIAL', 40, 78, 'EXPIRED_PUC'),
      row('GJ28SJ1555', 'Silver Coupe', 'GJ-28', 'SCHOOL', 30, 67, 'UNINSURED'),
      row('KL56DJ3588', 'Blue Hatchback', 'KL-56', 'URBAN', 50, 77, 'EXPIRED_PUC'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'GJ28ZJ1556', location: 'PUNE EXPRESSWAY · KM 57', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'KL56DJ3588', location: 'GRAND TRUNK ROAD · KM 34', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'GJ28SJ1555', location: 'YAMUNA EXPRESSWAY · KM 58', ocrNoise: '▒' },
    ],
    chase: {
      kms: [57, 58, 59],
      complaint: 'UNINSURED',
      offender: 1,
      sightings: [
        { id: 'a1', gantry: 1, lane: 2, truth: 1, reads: { 6: '1', 9: '5' } },
        { id: 'a2', gantry: 1, lane: 3, truth: 0, reads: { 4: 'Z' } },
        { id: 'b1', gantry: 2, lane: 1, truth: 1, reads: { 7: '5' } },
        { id: 'b2', gantry: 2, lane: 2, truth: 0, reads: { 4: 'Z' } },
        { id: 'c1', gantry: 3, lane: 1, truth: 1, reads: { 6: '1', 9: '5' } },
        { id: 'c2', gantry: 3, lane: 2, truth: 0, reads: { 9: '6' } },
      ],
    },
  },
  {
    id: 'CASE-E',
    twins: ['WB10BZ7233', 'WB10RZ7239'],
    decoy: 'UP01EC7223',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-03', plate: 'KL30SY7511',
        smudges: [
          { idx: 3, pair: ['0', 'O'] },
          { idx: 7, pair: ['5', 'S'] },
          { idx: 8, pair: ['1', 'I'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-07', plate: 'UP01EC7223',
        smudges: [
          { idx: 2, pair: ['0', 'O'] },
          { idx: 7, pair: ['2', 'Z'] },
          { idx: 8, pair: ['2', '7'] },
        ],
        clues: [{ k: 'sum', v: 14 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-08', plate: 'WB10BZ7233',
        smudges: [
          { idx: 3, pair: ['0', 'O'] },
          { idx: 4, pair: ['B', 'R'] },
          { idx: 9, pair: ['3', '9'] },
        ],
        clues: [{ k: 'before', v: 'F' }, { k: 'sum', v: 15 }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-08', plate: 'WB10RZ7239',
        smudges: [
          { idx: 2, pair: ['1', 'I'] },
          { idx: 3, pair: ['0', 'O'] },
          { idx: 4, pair: ['R', 'B'] },
          { idx: 9, pair: ['9', '3'] },
        ],
        clues: [{ k: 'sum', v: 21 }, { k: 'after', v: 'M' }],
      },
    ],
    registry: [
      row('WB10BZ7233', 'Silver Coupe', 'WB-10', 'RESIDENTIAL', 40, 72, 'UNINSURED'),
      row('WB10RZ7239', 'Silver Coupe', 'WB-10', 'URBAN', 50, 65, 'EXPIRED_PUC'),
      row('UP01EC7223', 'Blue Hatchback', 'UP-01', 'RESIDENTIAL', 40, 74, 'EXPIRED_PUC'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'WB10BZ7233', location: 'AIRPORT LINK · KM 30', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'UP01EC7223', location: 'HOSUR ROAD · KM 15', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'WB10RZ7239', location: 'OLD MADRAS ROAD · KM 35', ocrNoise: '▒' },
    ],
    chase: {
      kms: [30, 31, 32],
      complaint: 'EXPIRED_PUC',
      offender: 1,
      sightings: [
        { id: 'a1', gantry: 1, lane: 3, truth: 0, reads: { 4: 'B', 9: '3' } },
        { id: 'a2', gantry: 1, lane: 4, truth: 1, reads: { 7: '2' } },
        { id: 'b1', gantry: 2, lane: 3, truth: 1, reads: { 7: '2', 9: '9' } },
        { id: 'b2', gantry: 2, lane: 4, truth: 0, reads: { 4: 'B', 7: '2' } },
        { id: 'c1', gantry: 3, lane: 2, truth: 1, reads: { 6: '7' } },
        { id: 'c2', gantry: 3, lane: 4, truth: 0, reads: { 4: 'B', 6: '7' } },
      ],
    },
  },
  {
    id: 'CASE-F',
    twins: ['UP36KD5294', 'UP36XD5299'],
    decoy: 'GJ25ML7898',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-06', plate: 'GJ33TY1881',
        smudges: [
          { idx: 7, pair: ['8', 'B'] },
          { idx: 8, pair: ['8', 'B'] },
          { idx: 9, pair: ['1', 'I'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-08', plate: 'GJ25ML7898',
        smudges: [
          { idx: 3, pair: ['5', 'S'] },
          { idx: 6, pair: ['7', '1'] },
          { idx: 9, pair: ['8', 'B'] },
        ],
        clues: [{ k: 'gt', v: 2000 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-09', plate: 'UP36KD5294',
        smudges: [
          { idx: 3, pair: ['6', 'G'] },
          { idx: 4, pair: ['K', 'X'] },
          { idx: 9, pair: ['4', '9'] },
        ],
        clues: [{ k: 'even' }, { k: 'before', v: 'R' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-09', plate: 'UP36XD5299',
        smudges: [
          { idx: 3, pair: ['6', 'G'] },
          { idx: 4, pair: ['X', 'K'] },
          { idx: 7, pair: ['2', 'Z'] },
          { idx: 9, pair: ['9', '4'] },
        ],
        clues: [{ k: 'after', v: 'K' }, { k: 'odd' }],
      },
    ],
    registry: [
      row('UP36KD5294', 'Silver Coupe', 'UP-36', 'HIGHWAY', 100, 106, 'EXPIRED_PUC'),
      row('UP36XD5299', 'Silver Coupe', 'UP-36', 'SCHOOL', 30, 45, 'UNINSURED'),
      row('GJ25ML7898', 'Blue Hatchback', 'GJ-25', 'RESIDENTIAL', 40, 80, 'CLEAR'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'UP36KD5294', location: 'ANNA SALAI · KM 32', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'GJ25ML7898', location: 'MYSORE EXPRESSWAY · KM 44', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'UP36XD5299', location: 'NH-48 BYPASS · KM 9', ocrNoise: '▒' },
    ],
    chase: {
      kms: [32, 33, 34],
      complaint: 'UNINSURED',
      offender: 1,
      sightings: [
        { id: 'a1', gantry: 1, lane: 3, truth: 0, reads: { 7: '2', 9: '4' } },
        { id: 'a2', gantry: 1, lane: 1, truth: 1, reads: { 4: 'X', 9: '9' } },
        { id: 'b1', gantry: 2, lane: 2, truth: 1, reads: { 6: '5', 7: '2' } },
        { id: 'b2', gantry: 2, lane: 3, truth: 0, reads: { 6: '5' } },
        { id: 'c1', gantry: 3, lane: 3, truth: 1, reads: { 6: '5' } },
        { id: 'c2', gantry: 3, lane: 2, truth: 0, reads: { 9: '4' } },
      ],
    },
  },
  {
    id: 'CASE-G',
    twins: ['RJ20BP3615', 'RJ20RP3619'],
    decoy: 'WB05JE6804',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-07', plate: 'DL49AM3231',
        smudges: [
          { idx: 2, pair: ['4', 'A'] },
          { idx: 4, pair: ['A', '4'] },
          { idx: 9, pair: ['1', 'I'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-07', plate: 'WB05JE6804',
        smudges: [
          { idx: 3, pair: ['5', 'S'] },
          { idx: 7, pair: ['8', '0'] },
          { idx: 9, pair: ['4', 'A'] },
        ],
        clues: [{ k: 'sum', v: 18 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-06', plate: 'RJ20BP3615',
        smudges: [
          { idx: 3, pair: ['0', 'O'] },
          { idx: 4, pair: ['B', 'R'] },
          { idx: 9, pair: ['5', '9'] },
        ],
        clues: [{ k: 'sum', v: 15 }, { k: 'before', v: 'P' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-06', plate: 'RJ20RP3619',
        smudges: [
          { idx: 2, pair: ['2', 'Z'] },
          { idx: 4, pair: ['R', 'B'] },
          { idx: 7, pair: ['6', '5'] },
          { idx: 9, pair: ['9', '5'] },
        ],
        clues: [{ k: 'sum', v: 19 }, { k: 'after', v: 'N' }],
      },
    ],
    registry: [
      row('RJ20BP3615', 'Silver Coupe', 'RJ-20', 'URBAN', 50, 56, 'UNINSURED'),
      row('RJ20RP3619', 'Silver Coupe', 'RJ-20', 'RESIDENTIAL', 40, 80, 'CLEAR'),
      row('WB05JE6804', 'Blue Hatchback', 'WB-05', 'HIGHWAY', 100, 133, 'UNINSURED'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'RJ20BP3615', location: 'SION-PANVEL ROAD · KM 20', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'WB05JE6804', location: 'AIRPORT LINK · KM 16', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'RJ20RP3619', location: 'GACHIBOWLI FLYOVER · KM 20', ocrNoise: '▒' },
    ],
    chase: {
      kms: [20, 21, 22],
      complaint: 'UNINSURED',
      offender: 0,
      sightings: [
        { id: 'a1', gantry: 1, lane: 4, truth: 0, reads: { 7: '6' } },
        { id: 'a2', gantry: 1, lane: 3, truth: 1, reads: { 7: '6', 9: '9' } },
        { id: 'b1', gantry: 2, lane: 3, truth: 0, reads: { 4: 'B' } },
        { id: 'b2', gantry: 2, lane: 4, truth: 1, reads: { 6: '3' } },
        { id: 'c1', gantry: 3, lane: 2, truth: 0, reads: { 4: 'B', 9: '5' } },
        { id: 'c2', gantry: 3, lane: 3, truth: 1, reads: { 6: '3' } },
      ],
    },
  },
  {
    id: 'CASE-H',
    twins: ['GJ54HN4505', 'GJ54NN4509'],
    decoy: 'WB24AX6236',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-08', plate: 'TS19NV2557',
        smudges: [
          { idx: 6, pair: ['2', 'Z'] },
          { idx: 7, pair: ['5', 'S'] },
          { idx: 8, pair: ['5', 'S'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-05', plate: 'WB24AX6236',
        smudges: [
          { idx: 2, pair: ['2', 'Z'] },
          { idx: 6, pair: ['6', '5'] },
          { idx: 8, pair: ['3', '8'] },
        ],
        clues: [{ k: 'sum', v: 17 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-05', plate: 'GJ54HN4505',
        smudges: [
          { idx: 2, pair: ['5', 'S'] },
          { idx: 4, pair: ['H', 'N'] },
          { idx: 9, pair: ['5', '9'] },
        ],
        clues: [{ k: 'sum', v: 14 }, { k: 'before', v: 'N' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-05', plate: 'GJ54NN4509',
        smudges: [
          { idx: 2, pair: ['5', 'S'] },
          { idx: 4, pair: ['N', 'H'] },
          { idx: 8, pair: ['0', 'O'] },
          { idx: 9, pair: ['9', '5'] },
        ],
        clues: [{ k: 'sum', v: 18 }, { k: 'after', v: 'J' }],
      },
    ],
    registry: [
      row('GJ54HN4505', 'Silver Coupe', 'GJ-54', 'URBAN', 50, 60, 'UNINSURED'),
      row('GJ54NN4509', 'Silver Coupe', 'GJ-54', 'SCHOOL', 30, 71, 'UNINSURED'),
      row('WB24AX6236', 'Blue Hatchback', 'WB-24', 'URBAN', 50, 58, 'EXPIRED_PUC'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'GJ54HN4505', location: 'MYSORE EXPRESSWAY · KM 42', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'WB24AX6236', location: 'AIRPORT LINK · KM 56', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'GJ54NN4509', location: 'RING ROAD NORTH · KM 25', ocrNoise: '▒' },
    ],
    chase: {
      kms: [42, 43, 44],
      complaint: 'WEAVING',
      offender: 1,
      sightings: [
        { id: 'a1', gantry: 1, lane: 4, truth: 0, reads: { 9: '5' } },
        { id: 'a2', gantry: 1, lane: 3, truth: 1, reads: { 4: 'N' }, note: 'WEAVING' },
        { id: 'b1', gantry: 2, lane: 4, truth: 1, reads: { 6: '4', 7: '5' }, note: 'WEAVING' },
        { id: 'b2', gantry: 2, lane: 3, truth: 0, reads: { 7: '5' } },
        { id: 'c1', gantry: 3, lane: 2, truth: 0, reads: { 7: '5' } },
        { id: 'c2', gantry: 3, lane: 4, truth: 1, reads: { 6: '4', 9: '9' }, note: 'WEAVING' },
      ],
    },
  },
  {
    id: 'CASE-I',
    twins: ['WB57NU2389', 'WB57HU2384'],
    decoy: 'RJ25ZM1229',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-08', plate: 'RJ19FM1624',
        smudges: [
          { idx: 2, pair: ['1', 'I'] },
          { idx: 6, pair: ['1', 'I'] },
          { idx: 8, pair: ['2', 'Z'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-05', plate: 'RJ25ZM1229',
        smudges: [
          { idx: 2, pair: ['2', 'Z'] },
          { idx: 4, pair: ['Z', 'S'] },
          { idx: 8, pair: ['2', 'Z'] },
        ],
        clues: [{ k: 'after', v: 'U' }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-04', plate: 'WB57NU2389',
        smudges: [
          { idx: 4, pair: ['N', 'H'] },
          { idx: 6, pair: ['2', 'Z'] },
          { idx: 9, pair: ['9', '4'] },
        ],
        clues: [{ k: 'odd' }, { k: 'after', v: 'M' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-04', plate: 'WB57HU2384',
        smudges: [
          { idx: 2, pair: ['5', 'S'] },
          { idx: 4, pair: ['H', 'N'] },
          { idx: 6, pair: ['2', '7'] },
          { idx: 9, pair: ['4', '9'] },
        ],
        clues: [{ k: 'sum', v: 17 }, { k: 'before', v: 'M' }],
      },
    ],
    registry: [
      row('WB57NU2389', 'Silver Coupe', 'WB-57', 'HIGHWAY', 100, 108, 'UNINSURED'),
      row('WB57HU2384', 'Silver Coupe', 'WB-57', 'SCHOOL', 30, 57, 'EXPIRED_PUC'),
      row('RJ25ZM1229', 'Blue Hatchback', 'RJ-25', 'SCHOOL', 30, 50, 'EXPIRED_PUC'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'WB57NU2389', location: 'OUTER RING ROAD · KM 33', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'RJ25ZM1229', location: 'NH-44 EXPRESSWAY · KM 15', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'WB57HU2384', location: 'AIRPORT LINK · KM 41', ocrNoise: '▒' },
    ],
    chase: {
      kms: [33, 34, 35],
      complaint: 'UNINSURED',
      offender: 0,
      sightings: [
        { id: 'a1', gantry: 1, lane: 1, truth: 0, reads: { 4: 'N', 7: '3' } },
        { id: 'a2', gantry: 1, lane: 3, truth: 1, reads: { 7: '3' } },
        { id: 'b1', gantry: 2, lane: 2, truth: 1, reads: { 9: '4' } },
        { id: 'b2', gantry: 2, lane: 1, truth: 0, reads: { 6: '2', 9: '9' } },
        { id: 'c1', gantry: 3, lane: 2, truth: 1, reads: { 9: '4' } },
        { id: 'c2', gantry: 3, lane: 1, truth: 0, reads: { 6: '2' } },
      ],
    },
  },
  {
    id: 'CASE-J',
    twins: ['KA57XF6798', 'KA57KF6793'],
    decoy: 'TN03ZB6692',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-08', plate: 'WB35ZK5553',
        smudges: [
          { idx: 3, pair: ['5', 'S'] },
          { idx: 4, pair: ['Z', '2'] },
          { idx: 8, pair: ['5', 'S'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-06', plate: 'TN03ZB6692',
        smudges: [
          { idx: 4, pair: ['Z', 'S'] },
          { idx: 7, pair: ['6', 'G'] },
          { idx: 9, pair: ['2', '7'] },
        ],
        clues: [{ k: 'even' }, { k: 'after', v: 'X' }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-08', plate: 'KA57XF6798',
        smudges: [
          { idx: 4, pair: ['X', 'K'] },
          { idx: 6, pair: ['6', 'G'] },
          { idx: 9, pair: ['8', '3'] },
        ],
        clues: [{ k: 'after', v: 'K' }, { k: 'even' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-08', plate: 'KA57KF6793',
        smudges: [
          { idx: 2, pair: ['5', 'S'] },
          { idx: 4, pair: ['K', 'X'] },
          { idx: 7, pair: ['7', '1'] },
          { idx: 9, pair: ['3', '8'] },
        ],
        clues: [{ k: 'sum', v: 25 }, { k: 'before', v: 'P' }],
      },
    ],
    registry: [
      row('KA57XF6798', 'Silver Coupe', 'KA-57', 'HIGHWAY', 100, 127, 'CLEAR'),
      row('KA57KF6793', 'Silver Coupe', 'KA-57', 'RESIDENTIAL', 40, 50, 'UNINSURED'),
      row('TN03ZB6692', 'Blue Hatchback', 'TN-03', 'RESIDENTIAL', 40, 73, 'UNINSURED'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'KA57XF6798', location: 'GACHIBOWLI FLYOVER · KM 26', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'TN03ZB6692', location: 'OLD MADRAS ROAD · KM 35', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'KA57KF6793', location: 'BANDRA LINK · KM 74', ocrNoise: '▒' },
    ],
    chase: {
      kms: [26, 27, 28],
      complaint: 'UNINSURED',
      offender: 1,
      sightings: [
        { id: 'a1', gantry: 1, lane: 4, truth: 1, reads: { 7: '7' } },
        { id: 'a2', gantry: 1, lane: 2, truth: 0, reads: { 6: '6' } },
        { id: 'b1', gantry: 2, lane: 2, truth: 0, reads: { 7: '7' } },
        { id: 'b2', gantry: 2, lane: 3, truth: 1, reads: { 4: 'K', 6: '6' } },
        { id: 'c1', gantry: 3, lane: 2, truth: 0, reads: { 4: 'X', 9: '8' } },
        { id: 'c2', gantry: 3, lane: 3, truth: 1, reads: { 6: '6' } },
      ],
    },
  },
  {
    id: 'CASE-K',
    twins: ['KA54SV2926', 'KA54ZV2928'],
    decoy: 'GJ31KG1902',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-03', plate: 'UP04GA7199',
        smudges: [
          { idx: 3, pair: ['4', 'A'] },
          { idx: 4, pair: ['G', '6'] },
          { idx: 5, pair: ['A', '4'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-05', plate: 'GJ31KG1902',
        smudges: [
          { idx: 4, pair: ['K', 'X'] },
          { idx: 8, pair: ['0', 'O'] },
          { idx: 9, pair: ['2', '7'] },
        ],
        clues: [{ k: 'even' }, { k: 'before', v: 'S' }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-06', plate: 'KA54SV2926',
        smudges: [
          { idx: 2, pair: ['5', 'S'] },
          { idx: 4, pair: ['S', 'Z'] },
          { idx: 9, pair: ['6', '8'] },
        ],
        clues: [{ k: 'sum', v: 19 }, { k: 'alpha' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-06', plate: 'KA54ZV2928',
        smudges: [
          { idx: 3, pair: ['4', 'A'] },
          { idx: 4, pair: ['Z', 'S'] },
          { idx: 7, pair: ['9', '5'] },
          { idx: 9, pair: ['8', '6'] },
        ],
        clues: [{ k: 'sum', v: 21 }, { k: 'after', v: 'Y' }],
      },
    ],
    registry: [
      row('KA54SV2926', 'Silver Coupe', 'KA-54', 'HIGHWAY', 100, 114, 'EXPIRED_PUC'),
      row('KA54ZV2928', 'Silver Coupe', 'KA-54', 'HIGHWAY', 100, 114, 'EXPIRED_PUC'),
      row('GJ31KG1902', 'Blue Hatchback', 'GJ-31', 'HIGHWAY', 100, 117, 'CLEAR'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'KA54SV2926', location: 'BANDRA LINK · KM 24', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'GJ31KG1902', location: 'NH-44 EXPRESSWAY · KM 28', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'KA54ZV2928', location: 'COASTAL ROAD · KM 41', ocrNoise: '▒' },
    ],
    chase: {
      kms: [24, 25, 26],
      complaint: 'WEAVING',
      offender: 0,
      sightings: [
        { id: 'a1', gantry: 1, lane: 2, truth: 0, reads: { 6: '2' }, note: 'WEAVING' },
        { id: 'a2', gantry: 1, lane: 1, truth: 1, reads: { 6: '2', 9: '8' } },
        { id: 'b1', gantry: 2, lane: 2, truth: 1, reads: { 4: 'Z', 9: '8' } },
        { id: 'b2', gantry: 2, lane: 1, truth: 0, reads: { 9: '6' }, note: 'WEAVING' },
        { id: 'c1', gantry: 3, lane: 3, truth: 1, reads: { 6: '2', 7: '9' } },
        { id: 'c2', gantry: 3, lane: 1, truth: 0, reads: { 7: '9' }, note: 'WEAVING' },
      ],
    },
  },
  {
    id: 'CASE-L',
    twins: ['UP36OA1687', 'UP36DA1682'],
    decoy: 'TS38RA8419',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-07', plate: 'DL10JA6288',
        smudges: [
          { idx: 3, pair: ['0', 'O'] },
          { idx: 8, pair: ['8', 'B'] },
          { idx: 9, pair: ['8', 'B'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-09', plate: 'TS38RA8419',
        smudges: [
          { idx: 4, pair: ['R', 'P'] },
          { idx: 7, pair: ['4', 'A'] },
          { idx: 8, pair: ['1', 'I'] },
        ],
        clues: [{ k: 'after', v: 'P' }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-06', plate: 'UP36OA1687',
        smudges: [
          { idx: 4, pair: ['O', 'D'] },
          { idx: 8, pair: ['8', 'B'] },
          { idx: 9, pair: ['7', '2'] },
        ],
        clues: [{ k: 'odd' }, { k: 'after', v: 'F' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-06', plate: 'UP36DA1682',
        smudges: [
          { idx: 3, pair: ['6', 'G'] },
          { idx: 4, pair: ['D', 'O'] },
          { idx: 6, pair: ['1', 'I'] },
          { idx: 9, pair: ['2', '7'] },
        ],
        clues: [{ k: 'before', v: 'J' }, { k: 'sum', v: 17 }],
      },
    ],
    registry: [
      row('UP36OA1687', 'Silver Coupe', 'UP-36', 'URBAN', 50, 84, 'EXPIRED_PUC'),
      row('UP36DA1682', 'Silver Coupe', 'UP-36', 'HIGHWAY', 100, 131, 'UNINSURED'),
      row('TS38RA8419', 'Blue Hatchback', 'TS-38', 'HIGHWAY', 100, 138, 'EXPIRED_PUC'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'UP36OA1687', location: 'OUTER RING ROAD · KM 37', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'TS38RA8419', location: 'GACHIBOWLI FLYOVER · KM 19', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'UP36DA1682', location: 'GRAND TRUNK ROAD · KM 70', ocrNoise: '▒' },
    ],
    chase: {
      kms: [37, 38, 39],
      complaint: 'EXPIRED_PUC',
      offender: 0,
      sightings: [
        { id: 'a1', gantry: 1, lane: 2, truth: 1, reads: { 6: '1' } },
        { id: 'a2', gantry: 1, lane: 4, truth: 0, reads: { 6: '1', 7: '6' } },
        { id: 'b1', gantry: 2, lane: 4, truth: 0, reads: { 9: '7' } },
        { id: 'b2', gantry: 2, lane: 3, truth: 1, reads: { 4: 'D', 6: '1' } },
        { id: 'c1', gantry: 3, lane: 4, truth: 1, reads: { 6: '1', 9: '2' } },
        { id: 'c2', gantry: 3, lane: 3, truth: 0, reads: { 6: '1', 9: '7' } },
      ],
    },
  },
  {
    id: 'CASE-M',
    twins: ['MH04SU8464', 'MH04ZU8469'],
    decoy: 'GJ17AT7498',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-07', plate: 'KA38DH1963',
        smudges: [
          { idx: 4, pair: ['D', '0'] },
          { idx: 6, pair: ['1', 'I'] },
          { idx: 8, pair: ['6', 'G'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-09', plate: 'GJ17AT7498',
        smudges: [
          { idx: 4, pair: ['A', '4'] },
          { idx: 7, pair: ['4', '9'] },
          { idx: 9, pair: ['8', 'B'] },
        ],
        clues: [{ k: 'sum', v: 28 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-01', plate: 'MH04SU8464',
        smudges: [
          { idx: 4, pair: ['S', 'Z'] },
          { idx: 7, pair: ['4', 'A'] },
          { idx: 9, pair: ['4', '9'] },
        ],
        clues: [{ k: 'even' }, { k: 'before', v: 'T' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-01', plate: 'MH04ZU8469',
        smudges: [
          { idx: 2, pair: ['0', 'O'] },
          { idx: 4, pair: ['Z', 'S'] },
          { idx: 8, pair: ['6', 'G'] },
          { idx: 9, pair: ['9', '4'] },
        ],
        clues: [{ k: 'odd' }, { k: 'after', v: 'U' }],
      },
    ],
    registry: [
      row('MH04SU8464', 'Silver Coupe', 'MH-04', 'RESIDENTIAL', 40, 68, 'CLEAR'),
      row('MH04ZU8469', 'Silver Coupe', 'MH-04', 'HIGHWAY', 100, 117, 'EXPIRED_PUC'),
      row('GJ17AT7498', 'Blue Hatchback', 'GJ-17', 'RESIDENTIAL', 40, 66, 'CLEAR'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'MH04SU8464', location: 'PUNE EXPRESSWAY · KM 19', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'GJ17AT7498', location: 'EASTERN EXPRESSWAY · KM 20', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'MH04ZU8469', location: 'HOSUR ROAD · KM 25', ocrNoise: '▒' },
    ],
    chase: {
      kms: [19, 20, 21],
      complaint: 'EXPIRED_PUC',
      offender: 1,
      sightings: [
        { id: 'a1', gantry: 1, lane: 2, truth: 1, reads: { 6: '8', 9: '9' } },
        { id: 'a2', gantry: 1, lane: 3, truth: 0, reads: { 7: '4' } },
        { id: 'b1', gantry: 2, lane: 3, truth: 1, reads: { 6: '8', 9: '9' } },
        { id: 'b2', gantry: 2, lane: 2, truth: 0, reads: { 4: 'S', 9: '4' } },
        { id: 'c1', gantry: 3, lane: 4, truth: 1, reads: { 7: '4' } },
        { id: 'c2', gantry: 3, lane: 1, truth: 0, reads: { 7: '4' } },
      ],
    },
  },
  {
    id: 'CASE-N',
    twins: ['KL60ZE5666', 'KL60SE5665'],
    decoy: 'UP13ER2665',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-09', plate: 'GJ46SG2118',
        smudges: [
          { idx: 2, pair: ['4', 'A'] },
          { idx: 3, pair: ['6', 'G'] },
          { idx: 6, pair: ['2', 'Z'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-05', plate: 'UP13ER2665',
        smudges: [
          { idx: 2, pair: ['1', 'I'] },
          { idx: 8, pair: ['6', 'G'] },
          { idx: 9, pair: ['5', '6'] },
        ],
        clues: [{ k: 'sum', v: 19 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-07', plate: 'KL60ZE5666',
        smudges: [
          { idx: 2, pair: ['6', 'G'] },
          { idx: 4, pair: ['Z', 'S'] },
          { idx: 9, pair: ['6', '5'] },
        ],
        clues: [{ k: 'sum', v: 23 }, { k: 'after', v: 'V' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-07', plate: 'KL60SE5665',
        smudges: [
          { idx: 4, pair: ['S', 'Z'] },
          { idx: 6, pair: ['5', 'S'] },
          { idx: 8, pair: ['6', 'G'] },
          { idx: 9, pair: ['5', '6'] },
        ],
        clues: [{ k: 'before', v: 'T' }, { k: 'odd' }],
      },
    ],
    registry: [
      row('KL60ZE5666', 'Silver Coupe', 'KL-60', 'HIGHWAY', 100, 135, 'UNINSURED'),
      row('KL60SE5665', 'Silver Coupe', 'KL-60', 'HIGHWAY', 100, 122, 'EXPIRED_PUC'),
      row('UP13ER2665', 'Blue Hatchback', 'UP-13', 'RESIDENTIAL', 40, 77, 'UNINSURED'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'KL60ZE5666', location: 'GACHIBOWLI FLYOVER · KM 52', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'UP13ER2665', location: 'AIRPORT LINK · KM 50', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'KL60SE5665', location: 'PUNE EXPRESSWAY · KM 51', ocrNoise: '▒' },
    ],
    chase: {
      kms: [52, 53, 54],
      complaint: 'EXPIRED_PUC',
      offender: 1,
      sightings: [
        { id: 'a1', gantry: 1, lane: 2, truth: 0, reads: { 9: '6' } },
        { id: 'a2', gantry: 1, lane: 3, truth: 1, reads: { 7: '6' } },
        { id: 'b1', gantry: 2, lane: 3, truth: 0, reads: { 4: 'Z', 9: '6' } },
        { id: 'b2', gantry: 2, lane: 2, truth: 1, reads: { 7: '6', 9: '5' } },
        { id: 'c1', gantry: 3, lane: 1, truth: 1, reads: { 7: '6' } },
        { id: 'c2', gantry: 3, lane: 3, truth: 0, reads: { 4: 'Z' } },
      ],
    },
  },
  {
    id: 'CASE-O',
    twins: ['KL48KH8502', 'KL48XH8507'],
    decoy: 'KA58YY6668',
    rebuild: [
      {
        id: 'P1', label: 'WARM-UP CAR', camera: 'CAM-03', plate: 'TS18HB6439',
        smudges: [
          { idx: 2, pair: ['1', 'I'] },
          { idx: 5, pair: ['B', '8'] },
          { idx: 7, pair: ['4', 'A'] },
        ],
        clues: [],
      },
      {
        id: 'P2', label: 'TRAFFIC CAR', camera: 'CAM-06', plate: 'KA58YY6668',
        smudges: [
          { idx: 2, pair: ['5', 'S'] },
          { idx: 3, pair: ['8', 'B'] },
          { idx: 6, pair: ['6', '5'] },
        ],
        clues: [{ k: 'sum', v: 26 }],
      },
      {
        id: 'P3', label: 'TWIN 1', camera: 'CAM-01', plate: 'KL48KH8502',
        smudges: [
          { idx: 4, pair: ['K', 'X'] },
          { idx: 6, pair: ['8', 'B'] },
          { idx: 9, pair: ['2', '7'] },
        ],
        clues: [{ k: 'before', v: 'X' }, { k: 'even' }],
      },
      {
        id: 'P4', label: 'TWIN 2', camera: 'CAM-01', plate: 'KL48XH8507',
        smudges: [
          { idx: 4, pair: ['X', 'K'] },
          { idx: 7, pair: ['5', 'S'] },
          { idx: 8, pair: ['0', 'O'] },
          { idx: 9, pair: ['7', '2'] },
        ],
        clues: [{ k: 'odd' }, { k: 'after', v: 'V' }],
      },
    ],
    registry: [
      row('KL48KH8502', 'Silver Coupe', 'KL-48', 'RESIDENTIAL', 40, 86, 'UNINSURED'),
      row('KL48XH8507', 'Silver Coupe', 'KL-48', 'SCHOOL', 30, 47, 'CLEAR'),
      row('KA58YY6668', 'Blue Hatchback', 'KA-58', 'RESIDENTIAL', 40, 46, 'UNINSURED'),
    ],
    rounds: [
      { id: 'R1', label: 'TWIN 1', model: 'Silver Coupe', plate: 'KL48KH8502', location: 'JAIPUR BYPASS · KM 33', ocrNoise: '▒' },
      { id: 'R2', label: 'TRAFFIC CAR', model: 'Blue Hatchback', plate: 'KA58YY6668', location: 'MYSORE EXPRESSWAY · KM 21', ocrNoise: '▒' },
      { id: 'R3', label: 'TWIN 2', model: 'Silver Coupe', plate: 'KL48XH8507', location: 'NH-48 BYPASS · KM 22', ocrNoise: '▒' },
    ],
    chase: {
      kms: [33, 34, 35],
      complaint: 'UNINSURED',
      offender: 0,
      sightings: [
        { id: 'a1', gantry: 1, lane: 2, truth: 1, reads: { 7: '5', 9: '7' } },
        { id: 'a2', gantry: 1, lane: 3, truth: 0, reads: { 6: '8' } },
        { id: 'b1', gantry: 2, lane: 2, truth: 1, reads: { 7: '5' } },
        { id: 'b2', gantry: 2, lane: 3, truth: 0, reads: { 9: '2' } },
        { id: 'c1', gantry: 3, lane: 1, truth: 1, reads: { 7: '5' } },
        { id: 'c2', gantry: 3, lane: 3, truth: 0, reads: { 7: '5' } },
      ],
    },
  },
];

export const caseFor = (seed: number): CaseFile => CASES[(Math.imul((seed >>> 0) ^ 0x9e3779b9, 2654435761) >>> 0) % CASES.length];
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
