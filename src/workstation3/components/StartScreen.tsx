import { useState } from 'react';
import { CONFIG } from '../mockStation3Data';

const ID_RE = /^\d{6}$/;

export default function StartScreen({ onStart }: { onStart: (p1: string, p2: string) => void }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [touched, setTouched] = useState(false);

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);
  const e1 = !ID_RE.test(p1) ? 'ENTER A 6-DIGIT NUMERIC ID' : '';
  const e2 = !ID_RE.test(p2) ? 'ENTER A 6-DIGIT NUMERIC ID' : p1 === p2 ? 'OPERATORS MUST HAVE DIFFERENT IDs' : '';
  const valid = !e1 && !e2;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (valid) onStart(p1, p2);
  };

  return (
    <main className="ws3-main ws3-start">
      <form className="ws3-panel ws3-start-card" onSubmit={submit} noValidate>
        <div className="ws3-panel-tag">PURSUIT TERMINAL // OPERATOR LOGIN</div>
        <h2 className="ws3-start-title">
          INTERCEPT. ENHANCE. <span>ISSUE.</span>
        </h2>
        <p className="ws3-start-lede">
          Midnight, wet asphalt, a street racer doing triple the limit. Decode the plate before the nitrous kicks in and the
          eChallan goes out.
        </p>

        <div className="ws3-fields">
          <label className="ws3-field">
            <span className="ws3-field-label">OPERATOR 1 ID</span>
            <input
              className="ws3-input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              placeholder="000000"
              value={p1}
              onChange={(e) => setP1(digits(e.target.value))}
              aria-invalid={touched && !!e1}
              autoFocus
            />
            {touched && e1 && <span className="ws3-field-err">{e1}</span>}
          </label>
          <label className="ws3-field">
            <span className="ws3-field-label">OPERATOR 2 ID</span>
            <input
              className="ws3-input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              placeholder="000000"
              value={p2}
              onChange={(e) => setP2(digits(e.target.value))}
              aria-invalid={touched && !!e2}
            />
            {touched && e2 && <span className="ws3-field-err">{e2}</span>}
          </label>
        </div>

        <ul className="ws3-brief">
          <li><b>MOD_A</b> 3 forensic questions · 15 pts · hints cost points</li>
          <li><b>MOD_B</b> 2 registry lookups × 4 steps · 40 pts · charges the strobe</li>
          <li><b>MOD_C</b> 3 suspects · 45 pts · reach {CONFIG.moduleC.passConfidence}% confidence, {CONFIG.moduleC.pips} radar pips</li>
          <li><b>BONUS</b> up to +{CONFIG.speedBonusMax} pts for time left on the {CONFIG.totalSeconds / 60}-minute clock</li>
        </ul>

        <button type="submit" className="ws3-btn ws3-btn--primary ws3-start-go">
          [ENGAGE PURSUIT TERMINAL]
        </button>
      </form>
    </main>
  );
}
