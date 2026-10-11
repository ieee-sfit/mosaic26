import { useState, type FormEvent } from 'react';
import { HudPanel, TeleChip } from './HudPanel';

interface Props {
  onLaunch: (operators: [string, string]) => void;
}

const ID_RE = /^\d{6}$/;

function validate(a: string, b: string): { a?: string; b?: string } {
  const out: { a?: string; b?: string } = {};
  if (!ID_RE.test(a)) out.a = 'ID MUST BE EXACTLY 6 DIGITS';
  if (!ID_RE.test(b)) out.b = 'ID MUST BE EXACTLY 6 DIGITS';
  if (!out.a && !out.b && a === b) out.b = 'OPERATOR 2 MUST DIFFER FROM OPERATOR 1';
  return out;
}

export function Launcher({ onLaunch }: Props) {
  const [op1, setOp1] = useState('');
  const [op2, setOp2] = useState('');
  const [touched, setTouched] = useState(false);
  const errors = validate(op1, op2);
  const ready = !errors.a && !errors.b;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (ready) onLaunch([op1, op2]);
  };

  return (
    <div className="hud-grid-bg relative flex min-h-screen flex-col justify-between overflow-hidden px-6 pb-8 pt-10 md:px-14">
      {/* rotating nav rings, bleeding off the right edge */}
      <div className="pointer-events-none absolute -right-48 top-1/2 hidden h-[760px] w-[760px] -translate-y-1/2 md:block" aria-hidden>
        <div className="absolute inset-0 border border-goat-cyan/25 goat-ring" />
        <div
          className="absolute inset-10 border border-dashed border-goat-cyan/30 goat-ring"
          style={{ animation: 'goat-spin 60s linear infinite' }}
        />
        <div
          className="absolute inset-24 border-2 border-goat-gold/25 goat-ring"
          style={{ animation: 'goat-spin-rev 40s linear infinite', borderStyle: 'dotted' }}
        />
        <div
          className="absolute inset-40 goat-ring"
          style={{
            background: 'conic-gradient(from var(--goat-ang), rgba(0,242,254,0.35), transparent 30%)',
            animation: 'goat-ang 5s linear infinite',
            mask: 'radial-gradient(closest-side, transparent 30%, #000 31%)',
            WebkitMask: 'radial-gradient(closest-side, transparent 30%, #000 31%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="chamfer-tr bg-goat-gold px-3 py-1 font-hud text-[11px] font-bold tracking-[0.3em] text-goat-void" style={{ ['--c' as string]: '10px' }}>
            STATION 01
          </span>
          <TeleChip label="ITER_ZONE" value="PORT-MK4" />
          <TeleChip label="FLUX_TOL" value="±0.06" />
          <TeleChip label="CLEARANCE" value="PENDING" tone="gold" />
        </div>
        <h1 className="font-hud text-[clamp(64px,13vw,168px)] font-bold uppercase leading-[0.82] tracking-tight text-white">
          <span className="block" style={{ textShadow: '0 0 40px rgba(0,242,254,0.35)' }}>GOAT</span>
          <span className="block text-goat-cyan" style={{ textShadow: '0 0 40px rgba(0,242,254,0.6)' }}>
            A<span className="text-goat-gold">/</span>N<span className="text-goat-gold">/</span>C
          </span>
        </h1>
        <p className="mt-5 max-w-xl font-tele text-xs leading-relaxed text-goat-mute">
          &gt; MILANO BRIDGE // GUARDIANS OF THE GALAXY NOISE-CANCELLATION PROTOCOL
          <br />
          &gt; THREE MODULES · ONE SHARED 12:00 CLOCK · NO SECOND CHANCES ON THE HULL
          <br />
          &gt; BOTH OPERATORS MUST AUTHENTICATE BEFORE THE CLOCK ARMS
        </p>
        <div className="mt-5 flex gap-px font-tele text-[10px] uppercase tracking-widest">
          {['A · FLIGHT TELEMETRY', 'B · TOKAMAK DIAGNOSTIC', 'C · WAVE INTERCEPTION'].map((m) => (
            <span key={m} className="border border-goat-cyan/25 bg-goat-navy/80 px-3 py-1.5 text-goat-cyan-dim">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* docked authentication console — anchored low-left, not floating centre */}
      <form onSubmit={submit} noValidate className="relative z-10 mt-10 w-full max-w-2xl">
        <HudPanel title="OPERATOR AUTH" tag="CHANNEL: SECURE-6D" tone="gold" cut="both" bodyClassName="p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {([
              ['Operator 1 ID', op1, setOp1, errors.a],
              ['Operator 2 ID', op2, setOp2, errors.b],
            ] as const).map(([label, value, set, err], i) => (
              <label key={label} className="block">
                <span className="mb-1 flex justify-between font-tele text-[10px] uppercase tracking-[0.2em] text-goat-mute">
                  <span>{`OP_0${i + 1}`}</span>
                  <span className={value.length === 6 ? 'text-goat-lock' : ''}>{value.length}/6</span>
                </span>
                <input
                  aria-label={label}
                  placeholder={label}
                  value={value}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  onChange={(e) => set(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`chamfer-tr w-full border-0 bg-goat-void px-3 py-3 font-tele text-2xl font-bold tracking-[0.5em] text-goat-cyan outline-none placeholder:text-sm placeholder:font-normal placeholder:tracking-widest placeholder:text-goat-mute/60 focus:bg-goat-deck focus:shadow-[inset_0_-2px_0_#00f2fe] ${
                    touched && err ? 'shadow-[inset_0_-2px_0_#ef4444]' : ''
                  }`}
                  style={{ ['--c' as string]: '10px' }}
                />
                <span className={`mt-1 block min-h-4 font-tele text-[10px] uppercase tracking-wider ${touched && err ? 'text-goat-crimson' : 'text-transparent'}`}>
                  {err ?? '·'}
                </span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            className={`tac-btn mt-2 w-full py-3.5 text-sm font-bold ${
              ready ? 'bg-goat-gold text-goat-void' : 'bg-goat-mute/20 text-goat-mute'
            }`}
          >
            {ready ? '[ ARM CLOCK & LAUNCH ▸ ]' : '[ AWAITING 2 × 6-DIGIT IDS ]'}
          </button>
        </HudPanel>
      </form>
    </div>
  );
}
