import type { ReactNode } from 'react';
import { fmtClock } from '../utils';

export function StationTimer({ timeLeft, paused = false }: { timeLeft: number; paused?: boolean }) {
  const cls = paused ? 'is-paused' : timeLeft <= 60 ? 'ws3-timer--crit' : timeLeft <= 120 ? 'ws3-timer--warn' : '';
  return (
    <div className={`ws3-timer ${cls}`} role="timer" aria-label={`Time remaining ${fmtClock(timeLeft)}${paused ? ', paused' : ''}`}>
      <span className="ws3-timer-label">{paused ? 'CLOCK · PAUSED' : 'MISSION_CLOCK'}</span>
      <span className="ws3-timer-digits">{fmtClock(timeLeft)}</span>
    </div>
  );
}

const MODULES = [
  { id: 'A', label: 'ANPR FORENSICS', max: 15 },
  { id: 'B', label: 'PLATE REBUILD', max: 40 },
  { id: 'C', label: 'LENS SHUFFLER', max: 45 },
  { id: 'D', label: 'BONUS · BLOCKADE', max: 20 },
] as const;

export function StationHeader({
  active,
  showD,
  score,
  onOpenStationChooser,
}: {
  active: 'A' | 'B' | 'C' | 'D' | null;
  /** The bonus chip is only shown once Module D is on offer. */
  showD: boolean;
  score: number;
  onOpenStationChooser?: () => void;
}) {
  const shown = showD ? MODULES : MODULES.slice(0, 3);
  const activeIdx = shown.findIndex((m) => m.id === active);
  const allDone = active === null && showD;
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
        {shown.map((m, i) => (
          <div
            key={m.id}
            className={`ws3-step ${i === activeIdx ? 'is-active' : ''} ${allDone ? (i < 3 ? 'is-done' : '') : activeIdx === -1 ? '' : i < activeIdx ? 'is-done' : ''}`}
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
