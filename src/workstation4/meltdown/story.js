/* Story beats for Station 4 · AREA 51 MELTDOWN (the lab where Patient Zero was born, and how the crew burns it down).
   Text is final copy: each paragraph is typed out one after another on the story screen.
   Images live in public/story/station4/; a missing file falls back to a dark gradient.
   Characters: Dr. Andrew Fassbach (lab director, on the intercom), Thierry Umutoni (the pilot), WARDEN (the facility AI). */

export const storyImage = (file) => `${import.meta.env.BASE_URL}story/station4/${file}`

export const BEATS = {
  opening: {
    id: 'opening',
    tag: 'HELIX SITE 7 · FASSBACH',
    tone: 'speaker',
    image: '01-opening.jpg',
    shade: 0.9,
    focus: '60% 50%',
    paragraphs: [
      'HELIX RESEARCH SITE 7. THE LAB WHERE IT ALL BEGAN.',
      'Patient Zero was born in these halls. Eleven days ago, the first alarm.',
      'The building is sealed. Everything inside is infected or about to be.',
      "Dr. Fassbach's voice crackles on the intercom: 'The helicopter lands on the roof at dusk. Be on it. Nothing leaves this lab but you.'",
      'Doors are failing. Time is short. Start by reading the door logs.',
    ],
  },
  story1: {
    id: 'story1',
    tag: 'WARDEN',
    tone: 'speaker',
    image: '02-after-a.jpg',
    shade: 0.88,
    focus: '60% 50%',
    paragraphs: [
      'The logs match. The lockdown protocol was never finished.',
      'WARDEN, the facility AI, is half awake. It will only open what the wiring allows.',
      'The control room is down a level, behind a dead breaker bay.',
      'Rebuild the logic chips. Every gate you place buys the crew one more door.',
    ],
  },
  story2: {
    id: 'story2',
    tag: 'FASSBACH',
    tone: 'speaker',
    image: '03-after-b.jpg',
    shade: 0.86,
    focus: '55% 50%',
    paragraphs: [
      'The chips hold. Power surges through the corridor, and with it, the sound of the infected waking up.',
      'Two blast doors stand between you and the roof stairs. One must open to let you out. The other must shut behind you.',
      "Fassbach: 'Open the front. Seal the rear. Do not let one of them follow you.'",
      'Read the gates. Make the right door read green, and the rear door read red.',
    ],
  },
  story3: {
    id: 'story3',
    tag: 'UMUTONI',
    tone: 'speaker',
    image: '04-after-c.jpg',
    shade: 0.9,
    focus: '50% 55%',
    paragraphs: [
      'The rear door slams. Behind it, nothing but pounding.',
      'The roof. The helicopter is spinning up, Umutoni shouting over the rotors.',
      'But the lab is still standing, and what is inside must never get out.',
      'WARDEN has one last protocol: demolition charges, locked behind bit codes.',
      'Crack them from the air, and the whole site goes to the ground. Break the codes.',
    ],
  },
  fail: {
    id: 'fail',
    tag: 'MISSION LOST',
    tone: 'fail',
    image: '05-fail.jpg',
    shade: 0.88,
    focus: '50% 50%',
    paragraphs: [
      'THE CLOCK RAN OUT.',
      'The corridor lights go red, then black.',
      'The doors that should have held, did not.',
      'Helix Site 7 is no longer a lab. It is a grave. No one makes the helicopter.',
    ],
  },
  success: {
    id: 'success',
    tag: 'MISSION COMPLETE',
    tone: 'success',
    image: '06-success.jpg',
    shade: 0.86,
    focus: '60% 50%',
    paragraphs: [
      'THE HELICOPTER IS AIRBORNE.',
      'Umutoni banks away as the lab shrinks under the rotor wash. Nothing followed you out. The doors held.',
      'Below, the facility sits quiet, for now.',
      "Fassbach, quietly: 'You are the last ones out. Good work.'",
    ],
  },
}

/** One extra line on the success ending, depending on how the Code Breaker went. */
export const D_RESTORED = 'WARDEN: ALL CHARGES ARMED. DETONATION CONFIRMED. HELIX SITE 7: ERASED.'
export const D_FAILED = 'The facility still stands. The lab will have to be burned down another day.'
