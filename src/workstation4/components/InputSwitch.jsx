export default function InputSwitch({
  id,
  label,
  code,
  value,
  onToggle,
  description,
  disabled = false,
  disabledLabel,
}) {
  const isHigh = !disabled && (value === 1 || value === true);

  return (
    <div
      className={`ws4-input-unit ${disabled ? "ws4-input-disabled" : ""}`}
      id={`ws4-input-${id}`}
      title={disabled ? (disabledLabel || "Input disabled for single-input gate") : description}
      style={disabled ? { opacity: 0.75, borderColor: "var(--ws4-crimson-dim)" } : undefined}
    >
      <div className="ws4-input-header">
        <span className="ws4-input-name" style={disabled ? { color: "#ff8080" } : undefined}>
          {label} {disabled ? "[N/C]" : ""}
        </span>
        <span className="ws4-input-code">{code}</span>
      </div>

      <div className="ws4-toggle-row">
        <button
          type="button"
          className={`ws4-industrial-toggle ${isHigh ? "ws4-high" : ""}`}
          onClick={() => !disabled && onToggle && onToggle(id)}
          aria-pressed={isHigh}
          aria-label={`Toggle ${label}`}
          disabled={disabled}
          style={
            disabled
              ? {
                  cursor: "not-allowed",
                  borderColor: "var(--ws4-crimson-dim)",
                  color: "var(--ws4-crimson-alert)",
                  background: "rgba(255, 51, 68, 0.08)",
                }
              : undefined
          }
        >
          {disabled ? "[ N/C ]" : isHigh ? "[ ON ]" : "[ OFF ]"}
        </button>

        <div className={`ws4-input-signal-readout ${isHigh ? "ws4-sig-1" : "ws4-sig-0"}`}>
          <span
            className={`ws4-led ${isHigh ? "ws4-green" : "ws4-red"}`}
            aria-hidden="true"
          />
          <span style={{ color: isHigh ? "var(--ws4-neon-green)" : "var(--ws4-crimson-alert)" }}>
            {isHigh ? "● HIGH" : "○ LOW"}
          </span>
          <span
            style={{
              opacity: 0.8,
              color: isHigh ? "var(--ws4-neon-green)" : "var(--ws4-crimson-alert)",
            }}
          >
            ({isHigh ? "1" : "0"})
          </span>
        </div>
      </div>
    </div>
  );
}
