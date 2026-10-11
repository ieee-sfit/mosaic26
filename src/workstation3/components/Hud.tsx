import type { ReactNode } from 'react';
import { fmtClock } from '../utils';

export function StationTimer({ timeLeft }: { timeLeft: number }) {
  const cls = timeLeft <= 60 ? 'ws3-timer--crit' : timeLeft <= 120 ? 'ws3-timer--warn' : '';
  return (
    <div className={`ws3-timer ${cls}`} role="timer" aria-label={`Time remaining ${fmtClock(timeLeft)}`}>
      <span className="ws3-timer-label">MISSION_CLOCK</span>
      <span className="ws3-timer-digits">{fmtClock(timeLeft)}</span>
    </div>
  );
}

const MODULES = [
  { id: 'A', label: 'ANPR FORENSICS', max: 15 },
  { id: 'B', label: 'RADAR & STROBE', max: 40 },
  { id: 'C', label: 'LENS SHUFFLER', max: 45 },
] as const;

export function StationHeader({
  active,
  score,
  onOpenStationChooser,
}: {
  active: 'A' | 'B' | 'C' | null;
  score: number;
  onOpenStationChooser?: () => void;
}) {
  const activeIdx = MODULES.findIndex((m) => m.id === active);
  return (
    <header className="ws3-header">
      <div className="ws3-brand">
        {onOpenStationChooser && (
          <button type="button" className="ws3-btn ws3-btn--ghost ws3-arena-btn" onClick={onOpenStationChooser}>
            ◂ LAUNCHER
          </button>
        )}
        <div>
          <div className="ws3-brand-code">STATION 03 // HIGHWAY PATROL ANPR</div>
          <h1 className="ws3-brand-title">eCHALLAN TRACE</h1>
        </div>
      </div>
      <nav className="ws3-steps" aria-label="Module progress">
        {MODULES.map((m, i) => (
          <div
            key={m.id}
            className={`ws3-step ${i === activeIdx ? 'is-active' : ''} ${activeIdx === -1 ? '' : i < activeIdx ? 'is-done' : ''}`}
          >
            <span className="ws3-step-id">MOD_{m.id}</span>
            <span className="ws3-step-name">{m.label}</span>
            <span className="ws3-step-pts">{m.max} PTS</span>
          </div>
        ))}
      </nav>
      <div className="ws3-score" aria-label={`Raw score ${score}`}>
        <span className="ws3-score-label">RAW_PTS</span>
        <span className="ws3-score-val">{String(score).padStart(3, '0')}</span>
      </div>
    </header>
  );
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <footer className="ws3-actionbar">{children}</footer>;
}

export function Readout({ label, value, tone }: { label: string; value: ReactNode; tone?: 'warn' | 'bad' | 'ok' }) {
  return (
    <div className={`ws3-readout ${tone ? `ws3-readout--${tone}` : ''}`}>
      <span className="ws3-readout-k">{label}:</span>
      <span className="ws3-readout-v">{value}</span>
    </div>
  );
}
