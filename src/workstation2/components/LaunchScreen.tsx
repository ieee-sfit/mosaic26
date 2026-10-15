import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import LeMansMap from './LeMansMap';
import { STATION2_CONFIG } from '../mockStation2Data';

interface Props {
  /** Verified ID from the arcade launcher, shown locked. There is no ID input in this station. */
  playerId: string | null;
  onGo: () => void;
  onBack?: () => void;
}

const LIGHTS = 5;
const RED_MS = 650; // gap between red lights
const HOLD_MS = 700; // all five red, before green
const GREEN_MS = 800; // green + GO, then the clock starts

/** Start gantry: five red lights one by one, then all green with GO, then the clock starts. */
export default function LaunchScreen({ playerId, onGo, onBack }: Props) {
  // -1 idle, 0..5 = that many red lights on, 6 = all green
  const [lit, setLit] = useState(-1);

  useEffect(() => {
    if (lit < 0) return undefined;
    if (lit > LIGHTS) {
      const t = window.setTimeout(onGo, GREEN_MS);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setLit((n) => n + 1), lit === LIGHTS ? HOLD_MS : RED_MS);
    return () => window.clearTimeout(t);
  }, [lit, onGo]);

  const starting = lit >= 0;
  const green = lit > LIGHTS;

  return (
    <div className="ws2-launch ws2-in">
      <LeMansMap className="ws2-launch__map" names={false} label="Circuit" />

      <div className="ws2-launch__card">
        <span className="ws2-launch__tag">STATION 02</span>
        <h1 className="ws2-title">F1 <b>0-LAG</b> STREAM</h1>

        {playerId ? (
          <div className="ws2-tags">
            <div className="ws2-idtag">
              <small>OP</small>
              <b>{playerId}</b>
              <Lock size={16} aria-label="locked" />
            </div>
          </div>
        ) : (
          <p className="ws2-warn">NO SESSION. RETURN TO THE LAUNCHER.</p>
        )}

        <div className="ws2-modchips">
          <span><b>A</b> TELEMETRY <em>{STATION2_CONFIG.moduleMax.A}</em></span>
          <span><b>B</b> ROUTES <em>{STATION2_CONFIG.moduleMax.B}</em></span>
          <span><b>C</b> RACE <em>{STATION2_CONFIG.moduleMax.C}</em></span>
        </div>

        <div className={`ws2-gantry ${green ? 'is-green' : ''}`} data-lit={lit} aria-hidden>
          <div className="ws2-gantry__housing">
            {Array.from({ length: LIGHTS }, (_, i) => (
              <span key={i} className={`ws2-lamp ${green ? 'go' : lit > i ? 'red' : ''}`}>
                <i className="ws2-lamp__glow" />
                <i className="ws2-lamp__lens" />
              </span>
            ))}
          </div>
          <b className="ws2-gantry__go">GO</b>
        </div>
        <p className="ws2-sr" role="status">{green ? 'Go' : starting ? 'Stand by' : ''}</p>

        <div className="ws2-launch__actions">
          {playerId ? (
            <button type="button" className="ws2-btn ws2-btn--go" disabled={starting} onClick={() => setLit(0)}>
              {starting ? (green ? 'GO' : 'STAND BY') : 'START'}
            </button>
          ) : null}
          {onBack && !starting && <button type="button" className="ws2-btn ws2-btn--ghost" onClick={onBack}>STATIONS</button>}
        </div>
      </div>
    </div>
  );
}
