import type { ReactNode } from 'react';

interface Props {
  title?: string;
  tag?: string;
  tone?: 'amber' | 'red' | 'brass';
  className?: string;
  children?: ReactNode;
}

/** Hard-edged hardware panel: chamfered plate, four screws, engraved title bar with a lamp. */
export default function Panel({ title, tag, tone = 'amber', className = '', children }: Props) {
  return (
    <section className={`ws2-panel ws2-tone-${tone} ${className}`}>
      <div className="ws2-panel__in">
        <i className="ws2-screw ws2-screw--tl" aria-hidden />
        <i className="ws2-screw ws2-screw--tr" aria-hidden />
        <i className="ws2-screw ws2-screw--bl" aria-hidden />
        <i className="ws2-screw ws2-screw--br" aria-hidden />
        {(title || tag) && (
          <header className="ws2-plate">
            <h2><span className="ws2-led" aria-hidden />{title}</h2>
            {tag && <span className="ws2-plate__tag">{tag}</span>}
          </header>
        )}
        <div className="ws2-panel__body">{children}</div>
      </div>
    </section>
  );
}
