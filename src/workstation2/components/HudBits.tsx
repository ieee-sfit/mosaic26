import { useEffect, useState } from 'react';
import { mmss } from '../logic';

export function HudTicker({ sector }: { sector: number }) {
  const [rpm, setRpm] = useState(6850);
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now() / 1000;
      setRpm(Math.round(6850 + Math.sin(t * 1.7) * 380 + Math.sin(t * 5.3) * 90));
    }, 450);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="ws2-ticker" aria-hidden="true">
      <span>CIRCUIT_DE_LA_SARTHE: <b>SECTOR-{sector}</b></span>
      <span>CAR_7_RPM: <b>{rpm.toLocaleString('en-US')}</b></span>
      <span>24H_LE_MANS: <b>1966</b></span>
    </div>
  );
}

export function TimerBadge({ timeLeft, total }: { timeLeft: number; total: number }) {
  const urgent = timeLeft <= 120;
  return (
    <div className={`ws2-timer ${urgent ? 'ws2-timer-urgent' : ''}`} role="timer" aria-label="Time remaining">
      <span className="ws2-timer-label">T-MINUS</span>
      <span className="ws2-timer-val">{mmss(timeLeft)}</span>
      <span className="ws2-timer-bar"><i style={{ width: `${Math.max(0, (timeLeft / total) * 100)}%` }} /></span>
    </div>
  );
}

export function Waveform({ locked, severity }: { locked: boolean; severity: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => p + 0.45), 70);
    return () => clearInterval(id);
  }, []);
  const W = 600, H = 120, N = 120;
  const amp = locked ? 34 : 18 + severity * 22;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * W;
    const base = Math.sin(i * 0.28 + phase) * amp;
    const noise = locked ? 0 : Math.sin(i * 12.9898 + phase * 7.233) * severity * 34 + Math.sin(i * 2.1 - phase * 3) * severity * 14;
    pts.push(`${x.toFixed(1)},${(H / 2 + base + noise).toFixed(1)}`);
  }
  const color = locked ? '#22c55e' : severity > 0.55 ? '#dc2626' : '#f59e0b';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ws2-wave" preserveAspectRatio="none" role="img"
      aria-label={locked ? 'Telemetry locked' : 'Telemetry unstable'}>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#1e293b" strokeWidth="1" />)}
      {[1, 2, 3, 4, 5].map((i) => <line key={i} y1="0" y2={H} x1={(W / 6) * i} x2={(W / 6) * i} stroke="#1e293b" strokeWidth="1" />)}
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="6" opacity="0.22" strokeLinejoin="round" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
    </svg>
  );
}

export function Tachometer({ rpm, slam }: { rpm: number; slam: boolean }) {
  const MAX = 9000, RED = 7500;
  const ang = (v: number) => -120 + (Math.min(v, MAX) / MAX) * 240;
  const polar = (deg: number, r: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = polar(ang(from), r);
    const [x2, y2] = polar(ang(to), r);
    const large = ang(to) - ang(from) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const value = slam ? MAX : rpm;
  const hot = value >= RED;
  return (
    <svg viewBox="-100 -96 200 192" className="ws2-tach" role="img" aria-label={`Engine tachometer ${Math.round(value)} rpm`}>
      <circle r="92" fill="#090d16" stroke="#334155" strokeWidth="3" />
      <circle r="86" fill="none" stroke="#0f172a" strokeWidth="1" />
      <path d={arc(0, RED, 76)} stroke="#f59e0b" strokeWidth="5" fill="none" opacity="0.85" />
      <path d={arc(RED, MAX, 76)} stroke="#dc2626" strokeWidth="7" fill="none" />
      {Array.from({ length: 10 }, (_, i) => {
        const [x1, y1] = polar(ang(i * 1000), 68);
        const [x2, y2] = polar(ang(i * 1000), 58);
        const [tx, ty] = polar(ang(i * 1000), 47);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={i >= 8 ? '#dc2626' : '#fef08a'} strokeWidth="2" />
            <text x={tx} y={ty + 3} textAnchor="middle" fontSize="9" fill={i >= 8 ? '#dc2626' : '#fef08a'}
              fontFamily="JetBrains Mono, monospace">{i}</text>
          </g>
        );
      })}
      <text y="26" textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="JetBrains Mono, monospace">x1000 RPM</text>
      <text y="62" textAnchor="middle" fontSize="14" fontWeight="700" fill={hot ? '#dc2626' : '#fef08a'}
        fontFamily="JetBrains Mono, monospace">{Math.round(value).toLocaleString('en-US')}</text>
      <g style={{ transform: `rotate(${ang(value)}deg)`, transition: slam ? 'transform 0.18s ease-out' : 'transform 0.35s ease-out' }}>
        <g className={hot ? 'ws2-vib' : ''}>
          <polygon points="-2.5,8 2.5,8 1,-70 -1,-70" fill="#dc2626" style={{ filter: 'drop-shadow(0 0 3px #dc2626)' }} />
        </g>
      </g>
      <circle r="6" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
    </svg>
  );
}

export function SteamOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="ws2-steam" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} style={{ left: `${6 + i * 11}%`, animationDelay: `${(i % 4) * 0.22}s`, width: `${90 + (i % 3) * 50}px`, height: `${90 + (i % 3) * 50}px` }} />
      ))}
      <b>ENGINE OVERHEAT // GASKET BLOWN</b>
    </div>
  );
}
