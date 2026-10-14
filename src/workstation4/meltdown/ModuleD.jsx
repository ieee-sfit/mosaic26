import { useCallback, useEffect, useRef, useState } from 'react'
import { ESCAPE_BOARDS, STATION4_CONFIG } from '../mockStation4Data'
import {
  ROWS, applyAction, detonatorLeds, faultTypes, idealState, intendedRepairs, isWasted, levels, ledLit, passes, pickVariants,
  runTest, targetTable,
} from './escape'
import { Chip, Hole, Led, Switch, Table } from './BoardParts'
import HintDock from '../../core/HintDock'

const cfg = STATION4_CONFIG.moduleD
const round2 = (n) => Math.round(n * 100) / 100
const NODE_NAME = { A: 'INPUT A', B: 'INPUT B', G: 'GATE OUT', L: 'LED IN' }
const NODE_XY = { A: [170, 110], B: [170, 260], G: [470, 225], L: [640, 225] }
const SPARES = [
  ['newA', 'NEW SWITCH A'], ['newB', 'NEW SWITCH B'], ['newLed', 'NEW LED'],
  ['gateAND', 'GATE → AND'], ['gateOR', 'GATE → OR'], ['gateNOT', 'GATE → NOT'],
]

const freshBoard = (v) => ({
  st: v.start, sw: [0, 0], probes: cfg.probes, spares: intendedRepairs(v.start, v.target).length + cfg.spareExtra,
  readings: {}, log: [], tested: null, wasted: 0, hint: 0, status: 'open', pts: 0, msg: '',
})

const boardPts = (i, b) => {
  if (b.hint >= 2) return 0
  const frac = b.wasted * cfg.wastePenaltyFraction + (b.hint >= 1 ? cfg.hint1PenaltyFraction : 0)
  return round2(cfg.boardPoints[i] * Math.max(0, 1 - frac))
}
const armingPts = (a) => {
  if (a.hint >= 2) return 0
  return round2(Math.max(0, cfg.armingPoints * (a.hint >= 1 ? 1 - cfg.hint1PenaltyFraction : 1) - a.rejects * cfg.detonatePenalty))
}
const totalOf = (boards, arm) => round2(boards.reduce((n, b) => n + (b.status === 'fixed' ? b.pts : 0), 0) + (arm.done ? arm.pts : 0))

export default function ModuleD({ deadline, onScore, onDone, fx, log, track, seed }) {
  const [variants] = useState(() => pickVariants(ESCAPE_BOARDS, seed ?? Date.now()))
  const [boards, setBoards] = useState(() => variants.map(freshBoard))
  const [arm, setArm] = useState({ sw: [[0, 0], [0, 0], [0, 0]], rejects: 0, hint: 0, shown: null, done: false, pts: 0 })
  const [bi, setBi] = useState(0) // 0..2 boards, 3 = detonator
  const [probing, setProbing] = useState(false)
  const [ending, setEnding] = useState(null) // null | 'win' | 'fail'
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
  const live = useRef({ boards, arm })
  const closed = useRef(false)
  useEffect(() => { live.current = { boards, arm } })

  const patch = (i, fn) => setBoards((bs) => bs.map((b, k) => (k === i ? fn(b) : b)))
  const score = (bs, a) => onScore(totalOf(bs, a))

  const end = useCallback((how) => {
    if (closed.current) return
    closed.current = true
    setEnding(how)
    fx?.(how === 'win' ? 'shake' : 'strobe')
    const { boards: bs, arm: a } = live.current
    window.setTimeout(() => onDone(totalOf(bs, a), how), how === 'win' ? 2400 : 2000)
  }, [fx, onDone])

  // D's own countdown (capped at 180 s or the shift time left, whichever is shorter)
  useEffect(() => {
    const t = window.setInterval(() => {
      const l = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setLeft(l)
      if (l <= 0) end('fail')
    }, 250)
    return () => window.clearInterval(t)
  }, [deadline, end])

  const frozen = ending !== null
  const onBoard = bi < 3
  // never null: the React Compiler reads the fields of `b` unconditionally, so on the detonator it points at the last board
  const b = boards[Math.min(bi, 2)]
  const v = variants[Math.min(bi, 2)]
  const open = onBoard && b.status === 'open' && !frozen

  const advance = (from, bs) => {
    window.setTimeout(() => {
      if (closed.current) return
      if (from < 2) { setBi(from + 1); setProbing(false) }
      else if (bs.every((x) => x.status === 'fixed')) { setBi(3); setProbing(false); log?.('ALL THREE KITS ONLINE // ARM THE DETONATOR', 'ok') }
      else end('fail')
    }, 1300)
  }

  const closeBoard = (i, status, extra) => {
    const next = live.current.boards.map((x, k) => (k === i ? { ...x, ...extra, status, pts: status === 'fixed' ? boardPts(i, { ...x, ...extra }) : 0 } : x))
    setBoards(next)
    live.current = { ...live.current, boards: next }
    score(next, live.current.arm)
    if (status === 'fixed') log?.(`BOARD ${i + 1} REPAIRED // +${next[i].pts} PTS`, 'ok')
    else log?.(`BOARD ${i + 1} LOST // OUT OF SPARES`, 'crit')
    advance(i, next)
  }

  // ------------------------------------------------------------ board actions
  const toggleSw = (k) => {
    if (frozen) return
    if (onBoard) patch(bi, (x) => ({ ...x, sw: x.sw.map((s, j) => (j === k ? 1 - s : s)), msg: '' }))
  }

  const probe = (node) => {
    if (!open || !probing) return
    if (b.probes <= 0) { patch(bi, (x) => ({ ...x, msg: 'NO PROBES LEFT' })); return }
    const val = levels(b.st, b.sw[0], b.sw[1])[node]
    patch(bi, (x) => ({
      ...x, probes: x.probes - 1, msg: '',
      readings: { ...x.readings, [node]: { v: val, a: x.sw[0], b: x.sw[1] } },
      log: [{ node, a: x.sw[0], b: x.sw[1], v: val }, ...x.log].slice(0, 6),
    }))
    setProbing(false)
  }

  const runTestNow = () => {
    if (!open) return
    const rows = runTest(b.st, v.target)
    if (rows.every(Boolean)) { patch(bi, (x) => ({ ...x, tested: rows })); closeBoard(bi, 'fixed', { tested: rows, msg: 'ALL ROWS PASS' }); return }
    track?.('D', 'wrong', `B${bi + 1} TEST`)
    patch(bi, (x) => ({ ...x, tested: rows, msg: `${rows.filter((r) => !r).length} ROW(S) FAIL` }))
  }

  const spend = (action) => {
    if (!open || b.spares <= 0) return
    const wasted = isWasted(b.st, action, v.target)
    const st = applyAction(b.st, action)
    const spares = b.spares - 1
    if (wasted) { track?.('D', 'wrong', `B${bi + 1} SPARE`); fx?.('glitch') }
    log?.(`BOARD ${bi + 1} SPARE USED // ${spares} LEFT`, wasted ? 'warn' : 'info')
    const extra = { st, spares, readings: {}, tested: null, wasted: b.wasted + (wasted ? 1 : 0), msg: '' }
    patch(bi, (x) => ({ ...x, ...extra }))
    if (spares === 0) {
      // last spare: the board is tested automatically
      const ok = passes(st, v.target)
      closeBoard(bi, ok ? 'fixed' : 'failed', { ...extra, tested: runTest(st, v.target), msg: ok ? 'ALL ROWS PASS' : 'OUT OF SPARES' })
    }
  }

  // ------------------------------------------------------------ detonator
  const armLeds = () => detonatorLeds(boards.map((x) => x.st), arm.sw)
  const toggleArm = (board, k) => {
    if (frozen || arm.done) return
    setArm((a) => ({ ...a, shown: null, sw: a.sw.map((p, i) => (i === board ? p.map((s, j) => (j === k ? 1 - s : s)) : p)) }))
  }
  const detonate = () => {
    if (frozen || arm.done) return
    const lit = armLeds()
    if (lit.every(Boolean)) {
      const a = { ...arm, done: true, pts: armingPts(arm), shown: lit }
      setArm(a)
      live.current = { ...live.current, arm: a }
      score(boards, a)
      log?.(`DETONATOR ARMED // +${a.pts} PTS`, 'ok')
      end('win')
    } else {
      track?.('D', 'wrong', 'DETONATE')
      fx?.('glitch')
      setArm((a) => ({ ...a, rejects: a.rejects + 1, shown: lit }))
      log?.(`DETONATE REJECTED // ${lit.filter(Boolean).length}/3 LEDS LIT // -${cfg.detonatePenalty} PT`, 'warn')
    }
  }

  // ------------------------------------------------------------ hints
  const requestHint = (next) => {
    if (frozen) return
    if (!onBoard) {
      if (arm.hint >= next) return
      track?.('D', 'hint', `ARM H${next}`)
      if (next === 1) { setArm((a) => ({ ...a, hint: 1 })); return }
      // Hint 2: set a pattern that lights all three, then fire for 0 points
      const sw = boards.map((x) => (ROWS.find(([a, c]) => ledLit(x.st, a, c)) ?? [0, 0]))
      const a = { ...arm, hint: 2, sw, done: true, pts: 0, shown: [true, true, true] }
      setArm(a)
      live.current = { ...live.current, arm: a }
      score(boards, a)
      end('win')
      return
    }
    if (!open || b.hint >= next) return
    track?.('D', 'hint', `B${bi + 1} H${next}`)
    if (next === 1) { patch(bi, (x) => ({ ...x, hint: 1 })); return }
    const st = idealState(v.target)
    closeBoard(bi, 'fixed', { st, hint: 2, tested: ROWS.map(() => true), msg: 'REPAIRED FOR YOU', readings: {} })
  }

  // ------------------------------------------------------------ rendering
  const renderBoard = () => {
    const tgt = targetTable(v.target)
    const tgtRows = tgt.map((r) => ({ key: `${r.a}${r.b}`, cells: [r.a, r.b, r.y] }))
    const testRows = ROWS.map(([a, c], i) => ({
      key: `${a}${c}`, cells: [a, c, b.tested ? (b.tested[i] ? '✔' : '✖') : '·'], tone: b.tested ? (b.tested[i] ? 'ok' : 'bad') : '',
    }))
    const lit = ledLit(b.st, b.sw[0], b.sw[1])
    const gateHole = (id, x, y) => <Hole key={id} id={id} x={x} y={y} kind="p" r={5} />
    const pad = (node) => {
      const [x, y] = NODE_XY[node]
      const r = b.readings[node]
      return (
        <g key={node}>
          <Hole id={`probe:${node}`} x={x} y={y} kind="s" r={8} magnet={probing && open && b.probes > 0} dataset={{ 'data-probe': node, onClick: () => probe(node), role: 'button', 'aria-label': `Probe ${NODE_NAME[node]}` }} />
          <text className="mz-socklab" x={x} y={y + 26} textAnchor="middle">{NODE_NAME[node]}</text>
          {r && (
            <g className="mz-probe-read" data-reading={`${node}:${r.v}`}>
              <rect x={x - 21} y={y - 40} width="42" height="24" rx="3" />
              <text x={x} y={y - 23} textAnchor="middle">{r.v}</text>
            </g>
          )}
        </g>
      )
    }
    return (
      <svg className="mz-bb mz-esc-svg" viewBox="0 0 800 330" role="group" aria-label={`Broken board ${bi + 1}`} data-esc-board={bi} data-variant={v.id}>
        <rect className="mz-bay-frame" x="1" y="1" width="798" height="328" rx="6" style={{ '--bay': '#ef4444' }} />
        {/* fixed traces (neutral: levels only show on probes) */}
        <path className="mz-trace" d="M94 110 H170 M94 260 H170 M178 110 H220 V145 H270 M178 260 H220 V185 H270 M390 225 H462 M478 225 H510 M570 225 H632 M648 225 H692" />
        <Switch x={60} y={110} name="A" value={b.sw[0]} onToggle={() => toggleSw(0)} dataset={{ 'data-switch': 'esc:A' }} />
        <Switch x={60} y={260} name="B" value={b.sw[1]} onToggle={() => toggleSw(1)} dataset={{ 'data-switch': 'esc:B' }} />
        <Chip cx={330} cy={185} chip={{ type: v.target.gate, flip: 0 }} labels={false} name="GATE" />
        {[[270, 145], [270, 185], [270, 225], [390, 145], [390, 185], [390, 225]].map(([x, y], i) => gateHole(`g${i}`, x, y))}
        {b.st.not ? (
          <g className="mz-notsym" data-not="1">
            <path d="M512 204 L552 225 L512 246 Z" /><circle cx="558" cy="225" r="6" /><text x="530" y="270" textAnchor="middle">NOT</text>
          </g>
        ) : (
          <g className="mz-notsym is-empty" data-not="0"><path d="M520 225 H560" /><text x="540" y="270" textAnchor="middle">NO NOT</text></g>
        )}
        {['A', 'B', 'G', 'L'].map(pad)}
        <Led x={710} y={225} lit={lit} dead={false} resistor ground={300} />
        <Table x={520} y={36} title="TARGET" cols={['A', 'B', 'Y']} rows={tgtRows} width={120} accent="#ef4444" dataset={{ 'data-table': 'esc:target' }} />
        <Table x={660} y={36} title="TEST" cols={['A', 'B', '✓']} rows={testRows} width={120} accent="#c9e8d4" dataset={{ 'data-table': 'esc:test' }} />
      </svg>
    )
  }

  const renderArming = () => {
    const shown = arm.shown
    return (
      <div className="mz-arm">
        <svg className="mz-bb mz-esc-svg" viewBox="0 0 1000 300" role="group" aria-label="Detonator" data-esc-arm>
          {boards.map((x, i) => {
            const t = variants[i].target
            const rows = targetTable(t).map((r) => ({ key: `${r.a}${r.b}`, cells: [r.a, r.b, r.y], cls: arm.hint >= 1 && r.y === 1 ? 'is-hint' : '' }))
            const ox = 20 + i * 330
            const sw = arm.sw[i]
            const lit = shown ? shown[i] : null
            return (
              <g key={i} transform={`translate(${ox} 0)`} data-arm-board={i}>
                <rect className="mz-bay-frame" x="0" y="8" width="310" height="284" rx="6" style={{ '--bay': ['#22d3ee', '#f59e0b', '#e879f9'][i] }} />
                <text className="mz-bay-title" x="14" y="30">BOARD {i + 1}</text>
                <Switch x={60} y={90} name="A" value={sw[0]} onToggle={() => toggleArm(i, 0)} dataset={{ 'data-switch': `arm${i}:A` }} />
                <Switch x={60} y={185} name="B" value={sw[1]} onToggle={() => toggleArm(i, 1)} dataset={{ 'data-switch': `arm${i}:B` }} />
                <Table x={160} y={60} title="TARGET" cols={['A', 'B', 'Y']} rows={rows} width={120} accent="#c9e8d4" />
                <Led x={220} y={235} lit={lit === true} dead={false} resistor={false} />
                {lit === null && <text className="mz-lamp-q" x="220" y="241" textAnchor="middle">?</text>}
                <text className="mz-socklab" x="220" y="268" textAnchor="middle" data-lamp={i}>{lit === null ? 'SEALED' : lit ? 'LIT' : 'DARK'}</text>
              </g>
            )
          })}
        </svg>
        <div className="mz-arm-bar">
          <span className="mz-dim">3 LEDS → ONE AND → BOOM</span>
          <button type="button" className="mz-btn mz-btn-amber mz-big" data-detonate onClick={() => detonate()} disabled={frozen || arm.done}>[ DETONATE ]</button>
          <span className="mz-dim">REJECTED {arm.rejects}</span>
        </div>
      </div>
    )
  }

  const hint1 = onBoard
    ? `FAULTY PART${faultTypes(b.st, v.target).length > 1 ? 'S' : ''}: ${faultTypes(b.st, v.target).join(' + ') || 'NONE LEFT'}.`
    : 'Each LED lights on a different row. The rows that give Y = 1 are marked in each TARGET table.'
  const level = onBoard ? b.hint : arm.hint
  const mm = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`

  return (
    <section className="mz-modD mz-fade-in">
      <div className="mz-panel mz-chamfer mz-escape">
        <header className="mz-panel-head">
          <span>FINAL ESCAPE · {onBoard ? `BOARD ${bi + 1}/3` : 'DETONATOR'}</span>
          <span className={left <= 30 ? 'mz-red' : 'mz-amber'} role="timer" aria-label="Final escape time left" data-dtimer>{mm}</span>
        </header>

        {onBoard ? renderBoard() : renderArming()}

        {onBoard && (
          <footer className="mz-esc-bar">
            <div className="mz-esc-grp">
              <button type="button" className={`mz-btn mz-btn-green ${probing ? 'is-on' : ''}`} data-probe-mode disabled={!open || b.probes <= 0} onClick={() => setProbing((p) => !p)}>
                [ PROBE {probing ? '· CLICK A PAD' : ''} ]
              </button>
              <span className="mz-pips" data-probes={b.probes} aria-label={`${b.probes} probes left`}>
                {Array.from({ length: cfg.probes }, (_, i) => <i key={i} className={i < b.probes ? 'on' : ''} />)}
              </span>
              <button type="button" className="mz-btn mz-btn-green" data-runtest disabled={!open} onClick={runTestNow}>[ RUN TEST ]</button>
              <span className={`mz-esc-msg ${b.status === 'fixed' ? 'mz-green' : b.status === 'failed' ? 'mz-red' : 'mz-amber'}`} data-msg>
                {b.status === 'fixed' ? 'BOARD OK ✔' : b.status === 'failed' ? 'BOARD LOST' : b.msg}
              </span>
            </div>
            <div className="mz-esc-grp mz-esc-spares">
              <span className="mz-dim">SPARES</span>
              <span className="mz-pips" data-spares={b.spares} aria-label={`${b.spares} spares left`}>
                {Array.from({ length: Math.max(b.spares, intendedRepairs(v.start, v.target).length + cfg.spareExtra) }, (_, i) => <i key={i} className={i < b.spares ? 'on' : ''} />)}
              </span>
              {SPARES.map(([a, label]) => (
                <button key={a} type="button" className="mz-btn mz-btn-amber mz-sm" data-spare={a} disabled={!open || b.spares <= 0} onClick={() => spend(a)}>{label}</button>
              ))}
              <button type="button" className="mz-btn mz-btn-amber mz-sm" data-spare="toggleNot" disabled={!open || b.spares <= 0} onClick={() => spend('toggleNot')}>
                {b.st.not ? 'REMOVE NOT' : 'ADD NOT'}
              </button>
            </div>
            <ul className="mz-esc-log" data-probelog>
              {b.log.length === 0 && <li className="mz-dim">PROBE LOG EMPTY</li>}
              {b.log.map((l, i) => <li key={i}>{NODE_NAME[l.node]} @ A{l.a} B{l.b} → <b>{l.v}</b></li>)}
            </ul>
          </footer>
        )}

        {ending && (
          <div className={`mz-ending ${ending === 'win' ? 'is-win' : 'is-fail'}`} role="alert" data-ending={ending}>
            <h2>{ending === 'win' ? 'FACILITY DESTROYED' : 'DETONATION FAILED'}</h2>
            <p>{ending === 'win' ? 'OUTBREAK ENDED' : left <= 0 ? 'TIME RAN OUT · THE FACILITY STANDS' : 'THE FACILITY STANDS'}</p>
          </div>
        )}
      </div>
      <HintDock
        level={level}
        itemLabel={onBoard ? `BOARD ${bi + 1}/3` : 'DETONATOR'}
        hint1Text={hint1}
        hint2Text={onBoard ? 'The board was repaired for you. It scores 0.' : 'The detonator was armed for you. It scores 0.'}
        cost1={cfg.hint1PenaltyFraction}
        disabled={frozen || (onBoard && b.status !== 'open') || (!onBoard && arm.done)}
        onHint={requestHint}
      />
    </section>
  )
}

