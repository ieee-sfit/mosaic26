import type { CodeEntry } from './types';

interface Props {
  entries: readonly CodeEntry[];
  /** One short line under the entries (stage 2 and 3): what to do with a run that matches nothing. */
  rule?: string;
  className?: string;
}

/** The on-screen codebook: each entry drawn as the frame it looks like on the wire, delimiters dim, run lit. */
export default function Codebook({ entries, rule, className = '' }: Props) {
  return (
    <div className={`rl-codebook ${className}`} role="list" aria-label="Codebook" style={{ ['--rl-cols' as string]: entries.length >= 6 ? 3 : entries.length }}>
      {entries.map((e) => (
        <div key={e.id} className="rl-code" role="listitem">
          <span className="rl-code__bits" aria-hidden>
            <i className="d">{1 - e.bit}</i>
            {Array.from({ length: e.run }, (_, k) => <i key={k} className={e.bit ? 'one' : 'zero'}>{e.bit}</i>)}
            <i className="d">{1 - e.bit}</i>
          </span>
          <b>{e.label}</b>
          <span className="rl-sr"> {1 - e.bit} then {e.run} times {e.bit} then {1 - e.bit}</span>
        </div>
      ))}
      {rule && <p className="rl-rule">{rule}</p>}
    </div>
  );
}
