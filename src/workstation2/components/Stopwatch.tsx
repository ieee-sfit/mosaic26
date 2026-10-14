import { mmss } from '../logic';

interface Props {
  seconds: number;
  total: number;
  running: boolean;
  alarm: boolean;
}

/** Race clock: big mm:ss with a draining bar. Alarm turns it into an inverted amber block. */
export default function Stopwatch({ seconds, total, alarm }: Props) {
  const frac = Math.max(0, Math.min(1, seconds / total));
  return (
    <div className={`ws2-watch ${alarm ? 'is-alarm' : ''}`} role="timer" aria-label="Time remaining">
      <small>TIME</small>
      <b>{mmss(seconds)}</b>
      <span className="ws2-watch__bar" aria-hidden><i style={{ transform: `scaleX(${frac})` }} /></span>
    </div>
  );
}
