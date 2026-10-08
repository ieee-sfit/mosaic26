export default function InputSwitch({
  id,
  label,
  code,
  value,
  onToggle,
  description,
}) {
  const isHigh = value === 1 || value === true;

  return (
    <div className="ws4-input-unit" id={`ws4-input-${id}`} title={description}>
      <div className="ws4-input-header">
        <span className="ws4-input-name">{label}</span>
        <span className="ws4-input-code">{code}</span>
      </div>

      <div className="ws4-toggle-row">
        <button
          type="button"
          className={`ws4-industrial-toggle ${isHigh ? "ws4-high" : ""}`}
          onClick={() => onToggle(id)}
          aria-pressed={isHigh}
          aria-label={`Toggle ${label}`}
        >
          {isHigh ? "[ ON ]" : "[ OFF ]"}
        </button>

        <div className={`ws4-input-signal-readout ${isHigh ? "ws4-sig-1" : "ws4-sig-0"}`}>
          <span
            className={`ws4-led ${isHigh ? "ws4-green" : "ws4-red"}`}
            aria-hidden="true"
          />
          <span>{isHigh ? "● HIGH" : "○ LOW"}</span>
          <span style={{ opacity: 0.8 }}>({isHigh ? "1" : "0"})</span>
        </div>
      </div>
    </div>
  );
}
