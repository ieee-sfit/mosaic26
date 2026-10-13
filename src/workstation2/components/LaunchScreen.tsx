import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import Panel from './Panel';
import { STATION2_CONFIG } from '../mockStation2Data';

interface Props {
  /** Verified IDs from the arcade launcher, shown locked. There is no ID input in this station. */
  ids: [string, string] | null;
  onGo: () => void;
  onBack?: () => void;
}

const LIGHTS = 5;

/** Power-on screen: locked operator tags, then five start lights go out and the clock starts. */
export default function LaunchScreen({ ids, onGo, onBack }: Props) {
  const [lit, setLit] = useState(-1); // -1 idle, 0..5 lights on, 6 = lights out

  useEffect(() => {
    if (lit < 0) return undefined;
    if (lit > LIGHTS) {
      const t = window.setTimeout(onGo, 450);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setLit((n) => n + 1), lit === LIGHTS ? 700 : 480);
    return () => window.clearTimeout(t);
  }, [lit, onGo]);

  const starting = lit >= 0;

  return (
    <div className="ws2-launch ws2-in">
      <div className="ws2-feedwall" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => <span key={i}><i /></span>)}
      </div>

      <Panel title="STATION 02" tag="LE MANS '66 · PIT WALL" className="ws2-launch__card">
        <div className="ws2-launch__body">
          <h1 className="ws2-title">F1 <b>0-LAG</b> STREAM</h1>

          {ids ? (
            <div className="ws2-tags">
              {ids.map((id, i) => (
                <div key={i} className="ws2-idtag">
                  <small>OP {i + 1}</small>
                  <b>{id}</b>
                  <Lock size={14} aria-label="locked" />
                </div>
              ))}
            </div>
          ) : (
            <p className="ws2-warn">NO SESSION. RETURN TO THE LAUNCHER.</p>
          )}

          <div className="ws2-modchips">
            <span><b>A</b> TELEMETRY <em>{STATION2_CONFIG.moduleMax.A}</em></span>
            <span><b>B</b> RELAY TOWERS <em>{STATION2_CONFIG.moduleMax.B}</em></span>
            <span><b>C</b> BALANCER <em>{STATION2_CONFIG.moduleMax.C}</em></span>
          </div>

          <div className={`ws2-lights ${lit > LIGHTS ? 'is-out' : ''}`} aria-hidden>
            {Array.from({ length: LIGHTS }, (_, i) => <i key={i} className={lit > i && lit <= LIGHTS ? 'on' : ''} />)}
          </div>

          <div className="ws2-launch__actions">
            {ids ? (
              <button type="button" className="ws2-btn ws2-btn--go" disabled={starting} onClick={() => setLit(0)}>
                {starting ? (lit > LIGHTS ? 'GO' : 'STAND BY') : 'GO LIVE'}
              </button>
            ) : null}
            {onBack && !starting && <button type="button" className="ws2-btn ws2-btn--ghost" onClick={onBack}>STATIONS</button>}
          </div>
        </div>
      </Panel>
    </div>
  );
}
