export type Lane = 'in' | 'mid' | 'out';

interface Props {
  drsOpen: boolean;
  lane: Lane;
  braking: boolean;
  lifting: boolean;
  /** Last command the car carried out was not what the engineer sent. */
  wrong: boolean;
}

/** Top-down car on a three-lane strip. It does whatever the player answered: DRS flap, lane, brake lights, throttle. */
export default function RaceCar({ drsOpen, lane, braking, lifting, wrong }: Props) {
  const y = lane === 'out' ? 14 : lane === 'in' ? 70 : 42;
  return (
    <svg className={`ws2-car ${wrong ? 'is-wrong' : ''}`} viewBox="0 0 300 116" role="img"
      aria-label={`Car in the ${lane === 'mid' ? 'middle' : lane === 'in' ? 'inside' : 'outside'} lane, DRS ${drsOpen ? 'open' : 'closed'}${braking ? ', braking' : ''}${lifting ? ', lifting off' : ''}`}>
      <g className="ws2-car__road">
        <rect x="0" y="6" width="300" height="104" />
        <path d="M0 40 H300 M0 76 H300" />
      </g>
      <g className="ws2-car__apex"><text x="286" y="110" textAnchor="end">IN</text><text x="286" y="12" textAnchor="end">OUT</text></g>
      <g className="ws2-car__body" style={{ transform: `translateY(${y}px)` }}>
        <rect className="wheel" x="58" y="0" width="22" height="9" /><rect className="wheel" x="58" y="25" width="22" height="9" />
        <rect className="wheel" x="196" y="0" width="20" height="9" /><rect className="wheel" x="196" y="25" width="20" height="9" />
        <rect className={`disc ${braking ? 'hot' : ''}`} x="196" y="-3" width="20" height="3" /><rect className={`disc ${braking ? 'hot' : ''}`} x="196" y="34" width="20" height="3" />
        <polygon className="hull" points="40,10 190,12 262,15 262,19 190,22 40,24" />
        <rect className="hull" x="74" y="8" width="100" height="18" />
        <rect className="cockpit" x="118" y="13" width="26" height="8" />
        <rect className="wing" x="226" y="2" width="8" height="30" />
        <rect className="wing" x="20" y="2" width="12" height="30" />
        <rect className={`flap ${drsOpen ? 'open' : ''}`} x="12" y="2" width="8" height="30" />
        <rect className={`tail ${braking ? 'on' : ''}`} x="34" y="14" width="6" height="6" />
        <g className={`thr ${lifting ? 'low' : ''}`}><rect x="84" y="29" width="86" height="3" /><rect className="lvl" x="84" y="29" width="86" height="3" /></g>
      </g>
    </svg>
  );
}
