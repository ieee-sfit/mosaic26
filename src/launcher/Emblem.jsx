const RING = { fill: 'none', stroke: 'currentColor' }

export default function Emblem({ type }) {
  return (
    <svg className={`arc-emblem arc-emblem--${type}`} viewBox="-100 -100 200 200" aria-hidden="true">
      {type === 'tokamak' && (
        <g {...RING} strokeWidth="2">
          <g className="spin-slow">
            <ellipse rx="85" ry="40" />
            <ellipse rx="60" ry="28" />
            <ellipse rx="85" ry="40" transform="rotate(60)" />
            <ellipse rx="85" ry="40" transform="rotate(120)" />
          </g>
          <circle r="14" fill="currentColor" className="pulse" />
        </g>
      )}
      {type === 'track' && (
        <g {...RING} strokeWidth="3">
          <path
            d="M-70 30 C-90 -10 -50 -60 -5 -55 C30 -50 20 -15 55 -20 C90 -25 95 35 55 50 C20 62 -10 40 -30 55 C-45 66 -62 52 -70 30Z"
            strokeDasharray="6 8"
            className="dash"
          />
          <circle r="6" fill="currentColor" className="lap" />
        </g>
      )}
      {type === 'radar' && (
        <g {...RING} strokeWidth="2">
          <circle r="80" />
          <circle r="50" />
          <circle r="20" />
          <path d="M-95 0H95M0-95V95" opacity=".5" />
          <path className="sweep" d="M0 0 L80 0 A80 80 0 0 0 56 -57Z" fill="currentColor" opacity=".35" stroke="none" />
          <path d="M-30 -30h-14v-14M30 -30h14v-14M-30 30h-14v14M30 30h14v14" strokeWidth="4" />
        </g>
      )}
      {type === 'biohazard' && (
        <g {...RING} strokeWidth="4" className="spin-slow">
          {[0, 120, 240].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <circle cx="0" cy="-48" r="30" />
              <path d="M-26 -30 L-45 -75 M26 -30 L45 -75" opacity=".6" strokeWidth="2" />
            </g>
          ))}
          <circle r="10" fill="currentColor" />
          <circle r="82" strokeWidth="2" strokeDasharray="4 6" />
        </g>
      )}
    </svg>
  )
}
