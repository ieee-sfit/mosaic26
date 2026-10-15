import { contactOn, rungsOn } from './escape'

/**
 * The relay circuit of one demolition charge, drawn battery -> rungs -> detonator, with the current shown live:
 * a wire that carries current is green (1), a wire that does not is red (0). Used by Module D and the tutorial picture.
 *   rungs in a row = AND, contacts side by side = OR, a NOT contact conducts when its bit is 0.
 */
const COL = 132 // horizontal space per rung
const ROW = 62 // vertical space between side-by-side contacts
const BOX = [78, 38] // contact box
const PAD_L = 112
const PAD_R = 120

const diagramSize = (charge) => {
  const tallest = Math.max(...charge.rungs.map((r) => r.length))
  const h = Math.max(150, (tallest - 1) * ROW + BOX[1] + 70)
  return { w: PAD_L + charge.rungs.length * COL + PAD_R, h, cy: h / 2 }
}

export default function RelayDiagram({ charge, bits, hotBit = null, lockedBits = [], armed = false, className = '', bare = false, ...svgProps }) {
  const { w, h, cy } = diagramSize(charge)
  const on = rungsOn(charge, bits)
  const open = on.indexOf(false)
  const reach = open < 0 ? on.length : open // rungs the current has fully passed
  const reached = (i) => i <= reach // current arrives at rung i
  const live = (v) => (v ? 'live' : 'dead')
  const x0 = (i) => PAD_L + i * COL
  const bus = 82 // distance between a rung's left and right bus

  const detLive = reach === charge.rungs.length
  return (
    <svg className={bare ? className || undefined : `mz-relay ${className}`} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Relay circuit between the battery and the detonator" data-relay {...svgProps}>
      {/* battery */}
      <g className="mz-bat">
        <rect x="14" y={cy - 34} width="58" height="68" rx="4" />
        <text x="43" y={cy - 10} textAnchor="middle" className="mz-bat-p">+</text>
        <text x="43" y={cy + 12} textAnchor="middle" className="mz-bat-t">BATT</text>
        <text x="43" y={cy + 27} textAnchor="middle" className="mz-bat-t">1</text>
      </g>
      <path className="mz-rw live" d={`M72 ${cy} H${x0(0)}`} />

      {charge.rungs.map((rung, i) => {
        const inLive = reached(i)
        const passed = on[i] && inLive
        const n = rung.length
        const ys = rung.map((_, j) => cy + (j - (n - 1) / 2) * ROW)
        const xl = x0(i)
        const xr = xl + bus
        const nextX = i + 1 < charge.rungs.length ? x0(i + 1) : w - PAD_R + 6
        return (
          <g key={i} data-rung={i} className={`mz-rung ${on[i] ? 'is-on' : 'is-off'}`}>
            {/* vertical buses */}
            {n > 1 && <path className={`mz-rw ${live(inLive)}`} d={`M${xl} ${ys[0]} V${ys[n - 1]}`} />}
            {n > 1 && <path className={`mz-rw ${live(passed)}`} d={`M${xr} ${ys[0]} V${ys[n - 1]}`} />}
            {/* contacts */}
            {rung.map((c, j) => {
              const closed = contactOn(c, bits)
              const bit = Math.abs(c) - 1
              const cx = (xl + xr) / 2
              const hot = hotBit === bit
              return (
                <g key={j} data-contact={c} className={`mz-contact ${closed ? 'is-closed' : 'is-open'} ${hot ? 'is-hot' : ''}`}>
                  <path className={`mz-rw ${live(inLive)}`} d={`M${xl} ${ys[j]} H${cx - BOX[0] / 2}`} />
                  <path className={`mz-rw ${live(inLive && closed)}`} d={`M${cx + BOX[0] / 2} ${ys[j]} H${xr}`} />
                  <rect x={cx - BOX[0] / 2} y={ys[j] - BOX[1] / 2} width={BOX[0]} height={BOX[1]} rx="4" />
                  <text x={cx} y={ys[j] + 5} textAnchor="middle" className="mz-contact-t">{c < 0 ? `NOT B${-c}` : `B${c}`}</text>
                  {c < 0 && <path className="mz-contact-bar" d={`M${cx - 20} ${ys[j] - 11} H${cx + 20}`} />}
                  {lockedBits.includes(bit) && <text x={cx + BOX[0] / 2 - 2} y={ys[j] - BOX[1] / 2 - 3} textAnchor="end" className="mz-contact-lock">LOCKED</text>}
                </g>
              )
            })}
            {/* link to the next rung or the detonator */}
            <path className={`mz-rw ${live(passed)}`} d={`M${xr} ${cy} H${nextX}`} />
          </g>
        )
      })}

      {/* detonator */}
      <g className={`mz-det ${detLive || armed ? 'is-live' : ''}`} data-det>
        <circle cx={w - 56} cy={cy} r="34" />
        <path d={`M${w - 70} ${cy + 10} L${w - 56} ${cy - 16} L${w - 42} ${cy + 10} Z`} />
        <text x={w - 56} y={cy + 56} textAnchor="middle">{detLive || armed ? 'ARMED' : 'DETONATOR'}</text>
      </g>
    </svg>
  )
}

