/* Story beats for Station 3 · eCHALLAN TRACE. Text is final copy: paragraphs reveal one after another on the story screen.
   Images live in public/story/station3/; a missing file falls back to a dark gradient. */

export type BeatId = 'opening' | 'story1' | 'story2' | 'story3' | 'fail' | 'success';

export interface StoryBeat {
  id: BeatId;
  /** Speaker name, or the mission tag on an ending. */
  tag: string;
  tone: 'speaker' | 'fail' | 'success';
  image: string;
  paragraphs: string[];
  /** How strongly the picture is darkened under the text (0.8 = normal, higher for busy pictures). */
  shade: number;
  /** CSS object-position for the picture, to keep the interesting part visible beside the text. */
  focus: string;
}

export const storyImage = (file: string) => `${import.meta.env.BASE_URL}story/station3/${file}`;

export const BEATS: Record<BeatId, StoryBeat> = {
  opening: {
    id: 'opening',
    tag: 'HOBBS',
    tone: 'speaker',
    image: '01-opening.jpg',
    shade: 0.92,
    focus: '70% 50%',
    paragraphs: [
      'Midnight on the expressway, and the street racers are out. Two identical silver coupes keep swapping lanes and flashing near-identical plates, and our cameras cannot tell them apart. One of them is running an expired tag with no insurance and no care for anyone on the road. You are the eChallan Trace crew. Read the plates, find the offender, shut the lane. Twelve minutes.',
    ],
  },
  story1: {
    id: 'story1',
    tag: 'TEJ',
    tone: 'speaker',
    image: '02-after-a.jpg',
    shade: 1,
    focus: '75% 50%',
    paragraphs: [
      "Pre-checks done. Tej pulls up the live feed and winces. 'Rain, headlight glare, smeared digits. The system reads a zero and a letter O the same way, and an eight can pass for a B. Before we chase anything, we rebuild these plates properly. Use the plate format and the witness notes.'",
    ],
  },
  story2: {
    id: 'story2',
    tag: 'BRIAN',
    tone: 'speaker',
    image: '03-after-b.jpg',
    shade: 1,
    focus: '60% 60%',
    paragraphs: [
      "Plates rebuilt, and they are not the same. Two cars, two different plates. 'Now I need clean reads,' Brian says over the radio. 'They are moving fast, in the rain, at night. Tune the camera filters until the confidence hits eighty percent, then lock the plate and issue the challan.'",
    ],
  },
  story3: {
    id: 'story3',
    tag: 'HOBBS',
    tone: 'speaker',
    image: '04-after-c.jpg',
    shade: 0.95,
    focus: '60% 70%',
    paragraphs: [
      "Both plates are locked and on the board. But the two silver coupes just split at the next junction and vanished into traffic. 'I need to know which one is the offender,' Hobbs says. 'Follow each car through the cameras, check the complaint against its record, and close the exit it takes. Do not let it get away.'",
    ],
  },
  fail: {
    id: 'fail',
    tag: 'MISSION FAILED · THE LANE IS LOST',
    tone: 'fail',
    image: '05-fail.jpg',
    shade: 0.85,
    focus: '50% 70%',
    paragraphs: [
      "The clock hits zero. The lane goes quiet, and the silver coupe is gone, its engine fading into the dark. Hobbs shakes his head. 'We had the plate. We ran out of time.' Tej is already resetting the grid. 'Next run, we read it faster.'",
    ],
  },
  success: {
    id: 'success',
    tag: 'MISSION COMPLETE · THE LANE IS CLEAR',
    tone: 'success',
    image: '06-success.jpg',
    shade: 0.95,
    focus: '70% 50%',
    paragraphs: [
      "The lane is shut. Blue lights flare as the offender's silver coupe rolls to a stop, and the other twin passes through with a clean record. Brian steps out to write the challan. Tej leans back. 'Cleanest trace I've seen.' Hobbs nods. 'Good work, everyone.'",
    ],
  },
};

/** Extra success line, only when Module D was played. */
export const D_STOPPED = 'The offender was stopped at the exit.';
export const D_LOST = 'The offender slipped through before the blockade closed. The challan follows by post.';
