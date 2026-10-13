import type { ReactNode } from 'react';

interface Props {
  title?: string;
  tag?: string;
  tone?: 'red' | 'steel';
  className?: string;
  children?: ReactNode;
}

/** Hard-edged panel: chamfered corner, red edge bar, short title strip. */
export default function Panel({ title, tag, tone = 'red', className = '', children }: Props) {
  return (
    <section className={`ws2-panel ws2-tone-${tone} ${className}`}>
      {(title || tag) && (
        <header className="ws2-plate">
          <h2><i className="ws2-led" aria-hidden />{title}</h2>
          {tag && <span className="ws2-plate__tag">{tag}</span>}
        </header>
      )}
      <div className="ws2-panel__body">{children}</div>
    </section>
  );
}
