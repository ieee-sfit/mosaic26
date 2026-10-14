import { useEffect, useState } from 'react';
import './hintdock.css';

export type HintLevel = 0 | 1 | 2;

interface Props {
  /** Hints already spent on the current item (question / step / stint / round). */
  level: HintLevel;
  /** Short label of the current item, e.g. "QUESTION 2/3". */
  itemLabel: string;
  /** Shown once Hint 1 is spent. Points the player at the cheat sheet; never gives the answer. */
  hint1Text: string;
  /** Shown once Hint 2 is spent (what was auto-submitted). */
  hint2Text?: string;
  /** Hint 1 penalty as a fraction of the item's points (default 0.4). */
  cost1?: number;
  disabled?: boolean;
  /** Called with the level being bought. Level 2 is only sent after the player confirms. */
  onHint: (next: 1 | 2) => void;
}

/**
 * The one hint control for every station and module, always bottom-right.
 *   Hint 1: column pointer, -40% of the item's points.
 *   Hint 2: reveals AND auto-submits the answer for 0 points (needs a confirming second tap).
 */
export default function HintDock({ level, itemLabel, hint1Text, hint2Text, cost1 = 0.4, disabled, onHint }: Props) {
  const [armed, setArmed] = useState(false);

  // Re-arm the confirmation only for a few seconds, and reset when the item changes.
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  useEffect(() => setArmed(false), [itemLabel, level]);

  const spent = level >= 2;
  const off = disabled || spent;
  const click = () => {
    if (off) return;
    if (level === 0) onHint(1);
    else if (!armed) setArmed(true);
    else {
      setArmed(false);
      onHint(2);
    }
  };

  const label = spent
    ? '[ NO HINTS LEFT ]'
    : level === 0
      ? `[ HINT 1 · -${Math.round(cost1 * 100)}% ]`
      : armed
        ? '[ CONFIRM · AUTO-SUBMIT · 0 PTS ]'
        : '[ HINT 2 · SOLVE FOR ME · 0 PTS ]';

  return (
    <aside className="hd-dock" aria-live="polite" data-hint-dock>
      {level >= 1 && (
        <div className="hd-panel">
          <div className="hd-tag">{itemLabel} · HINT 1</div>
          <p>{hint1Text}</p>
          {level >= 2 && (
            <>
              <div className="hd-tag hd-tag--red">HINT 2 · AUTO-SUBMITTED</div>
              <p>{hint2Text ?? 'The answer was entered for you. This item scores 0.'}</p>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        className={`hd-btn ${armed ? 'is-armed' : ''} ${off ? 'is-off' : ''}`}
        onClick={click}
        disabled={off}
        aria-label={`Hint for ${itemLabel}. ${spent ? 'None left' : level === 0 ? 'Hint 1' : 'Hint 2, solves the item for zero points'}`}
      >
        <span className="hd-pips" aria-hidden>
          <i className={level >= 1 ? 'on' : ''} />
          <i className={level >= 2 ? 'on' : ''} />
        </span>
        {label}
      </button>
    </aside>
  );
}
