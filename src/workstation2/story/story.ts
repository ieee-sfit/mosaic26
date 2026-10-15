/* Story beats for Station 2 · F1 0-LAG STREAM (modern Le Mans, Ford against Ferrari as light flavour, original crew).
   Text is final copy: paragraphs reveal one after another on the story screen.
   Images live in public/story/station2/; a missing file falls back to a dark gradient. */

export type BeatId = 'opening' | 'story1' | 'story2' | 'story3' | 'fail' | 'success';

export interface StoryBeat {
  id: BeatId;
  /** Speaker name, or the mission tag on an ending. */
  tag: string;
  tone: 'speaker' | 'fail' | 'success';
  image: string;
  /** CSS object-position of the picture (keeps the subject in frame when the file is taller than the screen). */
  focus: string;
  /** Pushes the picture right (percent of its width) so its subject stays clear of the text block. */
  shift?: number;
  paragraphs: string[];
  /** Short name of the broadcast camera the picture is shown as. */
  feed: string;
}

export const storyImage = (file: string) => `${import.meta.env.BASE_URL}story/station2/${file}`;

export const BEATS: Record<BeatId, StoryBeat> = {
  opening: {
    id: 'opening',
    tag: 'MARA VOSS',
    tone: 'speaker',
    image: '01-opening.jpg',
    focus: 'center 62%',
    feed: 'CAM 01 · PIT LANE',
    paragraphs: [
      'Welcome to the broadcast compound at Le Mans. Twenty-four hours, hundreds of cameras, and one promise: zero lag. Every picture travels from the track to your screen through relays, masts and servers, and one slow link makes the whole world watch the past.',
      'Out there, a Ford and a Ferrari are fighting for the lead. In here, we are fighting for the feed.',
      "Twelve minutes on the shift. Let's go.",
    ],
  },
  story1: {
    id: 'story1',
    tag: 'KENJI',
    tone: 'speaker',
    image: '02-after-a.jpg',
    focus: 'center 45%',
    feed: 'CAM 02 · RACE CONTROL',
    paragraphs: [
      'Telemetry checks are green. Kenji pulls up the network map: a camera tower trackside, the pit wall at the far end, six relay sites in between.',
      "'Every hop adds delay,' he says. 'Every hop can drop packets, and the thinnest beam sets your bandwidth. Build a route that meets every line on the NEED panel. The shortest path is not always the one that works.'",
    ],
  },
  story2: {
    id: 'story2',
    tag: 'MARA VOSS',
    tone: 'speaker',
    image: '03-after-b.jpg',
    focus: 'center 68%',
    shift: 14,
    feed: 'CAM 03 · TRACKSIDE',
    paragraphs: [
      'The route is live and the audience is pouring in, millions of viewers all at once.',
      "'Here comes the surge,' says Mara. 'Split the load between the masts so none of them tops eighty percent, then pick a picture quality the network can carry. The backup relay can take some load, but it adds delay, so use it only if you need it. Night is falling and the rain is coming. Keep it smooth.'",
    ],
  },
  story3: {
    id: 'story3',
    tag: 'SOFIA',
    tone: 'speaker',
    image: '04-after-c.jpg',
    focus: 'center center',
    feed: 'CAM 04 · PIT WALL',
    paragraphs: [
      "Two cars, nose to tail, a few laps from the flag. Then the pit-wall radio turns to noise, and the team's call is hidden inside a stream of bits.",
      "'I need that message decoded,' says Sofia. 'Count the run of identical bits between two opposite ones. If the length matches nothing in the codebook, it is corrupted. Ask for a resend.'",
    ],
  },
  fail: {
    id: 'fail',
    tag: 'MISSION FAILED · THE FEED IS DEAD',
    tone: 'fail',
    image: '05-fail.jpg',
    focus: 'center 55%',
    feed: 'CAM 05 · SIGNAL LOST',
    paragraphs: [
      'The clock hits zero. The feed freezes on the final straight, and the audience misses the finish.',
      "Mara closes her laptop. 'The network was ready. The plan was not. We will fix it before next year.'",
    ],
  },
  success: {
    id: 'success',
    tag: 'MISSION COMPLETE · ZERO LAG',
    tone: 'success',
    image: '06-success.jpg',
    focus: 'center 78%',
    feed: 'CAM 06 · FINISH LINE',
    paragraphs: [
      'The feed held from the first lap to the last. Every viewer watched the finish live, with no lag at all. Kenji leans back, Sofia grins, and Mara signs off the broadcast.',
      "'Zero lag,' she says. 'That is how it is done.'",
    ],
  },
};

/** The extra closing line of a success ending, only when Module D was played. */
export const D_ENDING_LINE = {
  decoded: 'The pit-wall call landed exactly as planned.',
  lost: 'The call was lost in the noise. The drivers went on instinct.',
} as const;
