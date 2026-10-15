/* Story beats for Station 1 · GOAT ANC. Text is final copy: paragraphs reveal one after another on the story screen.
   Images live in public/story/station1/; a missing file falls back to a dark gradient. */

export type BeatId = 'opening' | 'story1' | 'story2' | 'story3' | 'fail' | 'success';

export interface StoryBeat {
  id: BeatId;
  /** Speaker name, or the mission tag on an ending. */
  tag: string;
  tone: 'speaker' | 'fail' | 'success';
  image: string;
  paragraphs: string[];
  /** Short name of the "camera feed" the picture is shown as. */
  feed: string;
}

export const storyImage = (file: string) => `${import.meta.env.BASE_URL}story/station1/${file}`;

/** Each station gets its own typewriter face; Station 1 is a retro space-age mono (the "Awesome Mix" cockpit). */
export const STORY_FONT = {
  family: "'Space Mono', 'JetBrains Mono', ui-monospace, monospace",
  tagFamily: "'Orbitron', 'Chakra Petch', sans-serif",
  href: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
} as const;

export const BEATS: Record<Exclude<BeatId, 'fail' | 'success'>, StoryBeat> & Record<'fail' | 'success', StoryBeat> = {
  opening: {
    id: 'opening',
    tag: 'STAR-LORD',
    tone: 'speaker',
    image: '01-opening.jpg',
    feed: 'MILANO · EXTERNAL CAM',
    paragraphs: [
      'Somewhere past the Kree border, the Tokamak lane is screaming. A cosmic storm has turned every channel into static, and nothing on the scanners can be trusted.',
      'Worse, Sakaaran scouts are hiding inside the noise, invisible and silent, heading straight for the Nova fleet.',
      'Twelve minutes until the fleet arrives. The Milano is the only ship close enough to clear the lane. Everybody to your stations.',
    ],
  },
  story1: {
    id: 'story1',
    tag: 'ROCKET',
    tone: 'speaker',
    image: '02-after-a.jpg',
    feed: 'MILANO · BRIDGE CAM',
    paragraphs: [
      'Pre-flight is done, and Rocket is already elbow-deep in the sensor bus.',
      "'Listen up, because I'm only explaining this once. When we blast the storm with our own wave, something is always left over. That leftover line tells you exactly what we got wrong: too high, too loud, or too late. Read it before you touch a single dial.'",
      "Gamora folds her arms. 'And if we guess?'",
      "'Then we all go home in pieces.'",
    ],
  },
  story2: {
    id: 'story2',
    tag: 'GAMORA',
    tone: 'speaker',
    image: '03-after-b.jpg',
    feed: 'MILANO · AFT CAM',
    paragraphs: [
      'The Milano slows as the storm thickens outside the glass.',
      "'Contact,' Gamora says. 'Four scouts, maybe five. They're inside the static, which is why we can't see them.'",
      "Drax leans over the console. 'Then we remove the static.'",
      "'Exactly,' says Rocket. 'Match the storm, cancel it, and the scouts show up on the glass. The moment that line goes flat, fire.'",
      'Groot gives a thumbs-up. Sort of.',
    ],
  },
  story3: {
    id: 'story3',
    tag: 'STAR-LORD',
    tone: 'speaker',
    image: '04-after-c.jpg',
    feed: 'MILANO · DEBRIS FIELD',
    paragraphs: [
      'The last scout burns up, and the lane falls silent. Then the Nova flagship calls.',
      "Most of its fleet was caught in the storm, and all that's left is a single beacon hopping between twelve channels in a pattern only a friendly ship would know.",
      "'Answer on the right channel, every single hop,' Quill says, 'and they'll know it's us.'",
      "Groot sways, tapping the beat. 'I am Groot.' For once, nobody argues.",
    ],
  },
  fail: {
    id: 'fail',
    tag: 'MISSION FAILED · THE LANE IS LOST',
    tone: 'fail',
    image: '05-fail.jpg',
    feed: 'MILANO · LAST KNOWN POSITION',
    paragraphs: [
      'The clock hits zero. The storm closes over the Tokamak lane, and the scouts slip through to the Nova fleet unseen.',
      "Rocket slams the console. 'We were this close.'",
      "Quill stares at the dark glass. 'We go again. Next time, we read it right.'",
    ],
  },
  success: {
    id: 'success',
    tag: 'MISSION COMPLETE · THE LANE IS CLEAR',
    tone: 'success',
    image: '06-success.jpg',
    feed: 'MILANO · CREW CAM',
    paragraphs: [
      'The lane is clear. The static is gone, the scouts are scrap, and the Nova fleet is rolling through safely.',
      "Rocket pretends he isn't impressed. Drax is impressed out loud. Gamora gives a small nod, the highest praise there is.",
      "Quill spins around in his seat. 'Not bad, team. Not bad at all.'",
    ],
  },
};

/** The extra closing line of a success ending, only when Module D was played. */
export const D_ENDING_LINE = {
  success: 'The flagship answers your handshake. Every ship that is left comes home.',
  fail: 'The beacon fades before you can answer. The fleet will find its own way home.',
} as const;
