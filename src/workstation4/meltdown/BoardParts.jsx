import { PIN_XY, pinAt } from './breadboard'

/**
 * Small SVG building blocks shared by the Module B breadboard and the Module D repair boards, so both look like the
 * same hardware: DIP chips with a notch, round holes, toggle switches, an LED with a glow, and truth tables.
 */

const PIN_COLOR = { VCC: '#f87171', GND: '#60a5fa', OUT: '#4ade80', A: '#e5e7eb', B: '#e5e7eb', NC: '#475569' }

/** A DIP package centred on (cx, cy). `chip.flip` turns it 180 degrees: the notch and the pin labels move with it. */
export function Chip({ cx, cy, chip, labels = true, scale = 1, glow, name, dim, ghost, dataset = {} }) {
  const type = chip?.type
  const flip = chip?.flip ? 1 : 0
  const showName = name ?? type
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`} className={`mz-chip ${glow ? 'is-glow' : ''} ${dim ? 'is-dim' : ''} ${ghost ? 'is-ghost' : ''}`} {...dataset}>
      {PIN_XY.map(([x, y], i) => (
        <rect key={i} className="mz-chip-leg" x={x < 0 ? x : 36} y={y - 4} width={Math.abs(x) - 36} height="8" />
      ))}
      <g transform={flip ? 'rotate(180)' : undefined}>
        <rect className="mz-chip-body" x="-40" y="-55" width="80" height="110" rx="4" />
        <path className="mz-chip-notch" d="M-9 -55 a9 9 0 0 0 18 0" />
        <circle className="mz-chip-dot" cx="-28" cy="-43" r="3" />
        {showName && <text className="mz-chip-name" x="0" y="6" textAnchor="middle">{showName}</text>}
      </g>
      {labels && type && PIN_XY.map(([x, y], i) => {
        const fn = pinAt({ type, flip }, i + 1)
        return (
          <text key={i} className="mz-pinlab" x={x < 0 ? -34 : 34} y={y + 4} textAnchor={x < 0 ? 'start' : 'end'} fill={PIN_COLOR[fn]}>
            {fn === 'NC' ? '–' : fn}
          </text>
        )
      })}
    </g>
  )
}

/** A round hole. `hot` = hint pulse, `snap` = the wire will land here, `magnet` = a legal landing spot while dragging. */
export function Hole({ id, x, y, kind = '', hot, snap, magnet, dataset = {}, r = 6, label, labelDy = -12, labelAnchor = 'middle' }) {
  return (
    <g className={`mz-hole ${kind} ${hot ? 'is-hot' : ''} ${snap ? 'is-snap' : ''} ${magnet ? 'is-magnet' : ''}`} data-act="hole" data-hole={id} {...dataset}>
      <circle className="mz-hole-halo" cx={x} cy={y} r={r + 7} />
      <circle className="mz-hole-ring" cx={x} cy={y} r={r + 3} />
      <circle className="mz-hole-dot" cx={x} cy={y} r={r} />
      <circle className="mz-hole-hit" cx={x} cy={y} r={r + 8} />
      {label && <text className="mz-socklab" x={x} y={y + labelDy} textAnchor={labelAnchor}>{label}</text>}
    </g>
  )
}

/** Toggle switch with its name and current 0/1. Click anywhere on it. */
export function Switch({ x, y, name, value, onToggle, locked, dataset = {}, stuck }) {
  const on = value === 1
  const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.() } }
  return (
    <g className={`mz-sw ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`} data-act="switch" role="button" tabIndex={0} aria-label={`Switch ${name} is ${value}. Click to toggle`} aria-pressed={on}
      onClick={() => onToggle?.()} onKeyDown={key} {...dataset}>
      <rect className="mz-sw-body" x={x - 34} y={y - 28} width="68" height="56" rx="4" />
      <text className="mz-sw-name" x={x - 25} y={y - 10}>{name}</text>
      <rect className="mz-sw-slot" x={x + 4} y={y - 20} width="18" height="40" rx="9" />
      <circle className="mz-sw-knob" cx={x + 13} cy={on ? y - 10 : y + 10} r="8" />
      <text className="mz-sw-val" x={x - 25} y={y + 20}>{value}</text>
      {stuck && <text className="mz-sw-stuck" x={x} y={y + 44} textAnchor="middle">{stuck}</text>}
    </g>
  )
}

/** LED with a glow. `lit` lights it, `dead` crosses it out. */
export function Led({ x, y, lit, dead, rev, resistor = true, ground }) {
  return (
    <g className={`mz-led ${lit ? 'is-lit' : ''} ${dead ? 'is-dead' : ''}`}>
      {lit && <circle className="mz-led-glow" cx={x} cy={y} r="34" />}
      <circle className="mz-led-bulb" cx={x} cy={y} r="17" />
      <path className="mz-led-sym" d={rev ? `M${x - 8} ${y + 7} L${x + 8} ${y + 7} L${x} ${y - 8} Z M${x - 8} ${y - 9} H${x + 8}` : `M${x - 8} ${y - 7} L${x + 8} ${y - 7} L${x} ${y + 8} Z M${x - 8} ${y + 9} H${x + 8}`} />
      {dead && <path className="mz-led-x" d={`M${x - 14} ${y - 14} L${x + 14} ${y + 14} M${x + 14} ${y - 14} L${x - 14} ${y + 14}`} />}
      {resistor && ground != null && (
        <g className="mz-res">
          <path d={`M${x} ${y + 17} V${y + 30} l6 5 l-12 8 l12 8 l-12 8 l6 5 V${ground}`} />
          <text x={x + 12} y={y + 52}>R</text>
        </g>
      )}
    </g>
  )
}

/**
 * A small truth table. cols = ['A','B','Y']. rows = [{ cells:[0,0,'·'], cls:'' }].
 * `tone` colours the Y cell per row: 'ok' | 'bad' | ''.
 */
export function Table({ x, y, title, cols, rows, width = 128, accent, dataset = {} }) {
  const cw = width / cols.length
  return (
    <g className="mz-tbl" transform={`translate(${x} ${y})`} {...dataset}>
      <text className="mz-tbl-title" x="0" y="-6" fill={accent}>{title}</text>
      <rect className="mz-tbl-bg" x="0" y="0" width={width} height={18 + rows.length * 18} />
      {cols.map((c, i) => (
        <text key={c} className="mz-tbl-head" x={cw * i + cw / 2} y="13" textAnchor="middle">{c}</text>
      ))}
      {rows.map((r, ri) => (
        <g key={ri} transform={`translate(0 ${18 + ri * 18})`} className={`mz-tbl-row ${r.cls ?? ''}`} data-row={r.key}>
          <line x1="0" x2={width} y1="0" y2="0" className="mz-tbl-rule" />
          {r.cells.map((c, ci) => (
            <text key={ci} x={cw * ci + cw / 2} y="14" textAnchor="middle" className={`mz-tbl-cell ${ci === r.cells.length - 1 ? `y ${r.tone ?? ''}` : ''}`}>{c}</text>
          ))}
        </g>
      ))}
    </g>
  )
}
