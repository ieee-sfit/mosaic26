import { mmss } from '../logic';

interface Props {
  seconds: number;
  total: number;
  running: boolean;
  alarm: boolean;
}

const TICKS = Array.from({ length: 60 }, (_, i) => i);
const RING = 2 * Math.PI * 57;

/** Race stopwatch, fixed top-right: a sweep hand (CSS rotation), a draining ring and the mm:ss readout. */
export default function Stopwatch({ seconds, total, running, alarm }: Props) {
  const frac = Math.max(0, Math.min(1, seconds / total));
  return (
    <div className={`ws2-watch ${alarm ? 'is-alarm' : ''}`} role="timer" aria-label="Time remaining">
      <svg viewBox="0 0 130 130" className="ws2-watch__dial" aria-hidden>
        <circle cx="65" cy="65" r="63" className="ws2-watch__bezel" />
        <circle cx="65" cy="65" r="57" className="ws2-watch__track" />
        <circle
          cx="65" cy="65" r="57" className="ws2-watch__ring"
          strokeDasharray={RING} strokeDashoffset={RING * (1 - frac)} transform="rotate(-90 65 65)"
        />
        <circle cx="65" cy="65" r="51" className="ws2-watch__face" />
        {TICKS.map((i) => (
          <line
            key={i} x1="65" x2="65" y1={i % 5 === 0 ? 17 : 19} y2="23"
            className={i % 5 === 0 ? 'ws2-tick ws2-tick--major' : 'ws2-tick'} transform={`rotate(${i * 6} 65 65)`}
          />
        ))}
        <g className="ws2-watch__hand" style={{ animationPlayState: running ? 'running' : 'paused' }}>
          <line x1="65" y1="68" x2="65" y2="22" />
        </g>
        <circle cx="65" cy="65" r="4" className="ws2-watch__cap" />
      </svg>
      <div className="ws2-watch__read">
        <small>TIME LEFT</small>
        <b>{mmss(seconds)}</b>
      </div>
    </div>
  );
}
