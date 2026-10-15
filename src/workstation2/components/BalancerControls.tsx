import { QUALITY_PROFILES, STATION2_CONFIG } from '../mockStation2Data';
import type { Controls } from '../logic';
import type { Stint } from '../types';

/** The three balancer controls, drawn once and shared by Module C and its tutorial picture. */
const STOPS = QUALITY_PROFILES.length;
const HOP = STATION2_CONFIG.relayHopMs;

/** Centre of the slider thumb (20 px wide) at value v of 0..100, as a CSS length. */
const thumbAt = (v: number) => `calc(${v}% + ${(10 - 0.2 * v).toFixed(2)}px)`;
export const bandText = (bands: [number, number][]) => bands.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ');

interface SplitProps {
  ctl: Controls;
  /** Every split run that meets the whole contract for the quality and relay chosen now. */
  bands: [number, number][];
  qualityOk: boolean;
  busy: boolean;
  onChange: (split: number) => void;
}

/** LOAD SPLIT with a live green band showing which splits satisfy the whole contract right now. */
export function SplitControl({ ctl, bands, qualityOk, busy, onChange }: SplitProps) {
  const prof = QUALITY_PROFILES[ctl.qualityIdx];
  const safeLabel = !qualityOk ? 'QUALITY IS BELOW THE CONTRACT' : bands.length ? `SAFE SPLIT ${bandText(bands)}` : `NO SAFE SPLIT AT ${prof.label}${ctl.divert ? ' WITH RELAY' : ''}`;
  return (
    <div className="ws2-ctl" data-part="split">
      <label htmlFor="ws2-split">LOAD SPLIT</label>
      <div className="ws2-sz" data-safe={bands.map(([a, b]) => `${a}-${b}`).join(',')}>
        <i className="ws2-sz__base" aria-hidden />
        {bands.map(([a, b]) => (
          <i
            key={`${a}-${b}`} className="ws2-sz__ok" aria-hidden
            style={{ left: a <= 0 ? '0px' : thumbAt(a - 0.5), right: b >= 100 ? '0px' : `calc(100% - ${thumbAt(b + 0.5)})` }}
          />
        ))}
        <input id="ws2-split" type="range" min={0} max={100} step={1} value={ctl.split} disabled={busy}
          aria-describedby="ws2-safe" onChange={(e) => onChange(Number(e.target.value))} />
      </div>
      <div className="ws2-ctl__scale"><span>MULSANNE {ctl.split}</span><span>{100 - ctl.split} PIT</span></div>
      <small id="ws2-safe" className={`ws2-ctl__safe ${bands.length && qualityOk ? 'has' : ''}`}>{safeLabel}</small>
    </div>
  );
}

interface QualityProps { stint: Stint; ctl: Controls; busy: boolean; onChange: (qualityIdx: number) => void }

/** QUALITY: green zone = the qualities the lap's contract accepts, hatched red = under the contract. */
export function QualityControl({ stint, ctl, busy, onChange }: QualityProps) {
  // Allowed zone: stops 0..worst. The thumb centre travels 10px..(W-10px).
  const zoneF = stint.worstQualityIdx / (STOPS - 1);
  const zoneEdge = `calc(${zoneF * 100}% + ${20 - 20 * zoneF}px)`;
  return (
    <div className="ws2-ctl" data-part="quality">
      <label htmlFor="ws2-quality">QUALITY</label>
      <div className="ws2-qz">
        <i className="ws2-qz__ok" style={{ width: zoneEdge }} aria-hidden />
        <i className="ws2-qz__no" style={{ left: zoneEdge }} aria-hidden />
        <input id="ws2-quality" type="range" min={0} max={STOPS - 1} step={1} value={ctl.qualityIdx} disabled={busy}
          onChange={(e) => onChange(Number(e.target.value))} />
      </div>
      <div className="ws2-ctl__scale ws2-ctl__ticks">
        {QUALITY_PROFILES.map((p, i) => (
          <button key={p.id} type="button" disabled={busy} className={`${i === ctl.qualityIdx ? 'on' : ''} ${i > stint.worstQualityIdx ? 'is-no' : ''}`} onClick={() => onChange(i)}>{p.label}</button>
        ))}
      </div>
    </div>
  );
}

/** BACKUP RELAY switch: optional, and it costs +90 ms. */
export function RelayControl({ ctl, busy, onToggle }: { ctl: Controls; busy: boolean; onToggle: () => void }) {
  return (
    <div className="ws2-ctl ws2-ctl--sw" data-part="relay">
      <span id="ws2-relay-lbl">BACKUP RELAY</span>
      <button type="button" role="switch" aria-checked={ctl.divert} aria-labelledby="ws2-relay-lbl" disabled={busy}
        className={`ws2-switch ${ctl.divert ? 'on' : ''}`} onClick={onToggle}>
        <i /><b>{ctl.divert ? 'ON' : 'OFF'}</b>
      </button>
      <small className="ws2-ctl__cost">OPTIONAL · +{HOP} ms</small>
    </div>
  );
}
