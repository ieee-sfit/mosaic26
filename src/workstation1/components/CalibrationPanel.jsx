import PhaseControl from "./PhaseControl";
import AmplitudeControl from "./AmplitudeControl";
import FrequencyControl from "./FrequencyControl";

export default function CalibrationPanel({
  phase = 90,
  amplitude = 45,
  frequency = 220,
  targetPhase = 180,
  targetAmplitude = 75,
  targetFrequency = 200,
  phaseTol = 5,
  ampTol = 5,
  freqTolPercent = 1,
  isPhaseAcceptable = false,
  isAmplitudeMatched = false,
  isFrequencyLocked = false,
  isResidualSafe = false,
  isEfficiencyAcceptable = false,
  isCalibrationVerified = false,
  onPhaseChange,
  onAmplitudeChange,
  onFrequencyChange,
  onTestCalibration,
  isLocked = false,
}) {
  return (
    <div className="ws1-calibration-panel">
      <div className="ws1-panel-banner">
        <div className="ws1-banner-text">
          <span className="ws1-banner-tag">ACTIVE NOISE CALIBRATION CONTROLS</span>
          <p className="ws1-banner-desc">
            Adjust the anti-noise generator to invert phase, match amplitude, and synchronize
            carrier frequency against the incoming cabin acoustic signature.
          </p>
        </div>

        <div className="ws1-banner-action">
          <button
            type="button"
            className={`ws1-test-calibration-btn ${
              isCalibrationVerified ? "ws1-btn-verified" : ""
            }`}
            onClick={onTestCalibration}
            disabled={isLocked}
          >
            {isCalibrationVerified ? "✓ CALIBRATION VERIFIED" : "VERIFY ANC ALIGNMENT"}
          </button>
        </div>
      </div>

      {/* Grid of 3 Primary Controls */}
      <div className="ws1-controls-3col">
        <PhaseControl
          phase={phase}
          targetPhase={targetPhase}
          tolerance={phaseTol}
          isAcceptable={isPhaseAcceptable}
          onChange={onPhaseChange}
          disabled={isLocked}
        />

        <AmplitudeControl
          amplitude={amplitude}
          targetAmplitude={targetAmplitude}
          tolerance={ampTol}
          isMatched={isAmplitudeMatched}
          onChange={onAmplitudeChange}
          disabled={isLocked}
        />

        <FrequencyControl
          frequency={frequency}
          targetFrequency={targetFrequency}
          tolerancePercent={freqTolPercent}
          isLocked={isFrequencyLocked}
          onChange={onFrequencyChange}
          disabled={isLocked}
        />
      </div>

      {/* Live Calibration Checklist Strip */}
      <div className="ws1-calib-checklist-strip">
        <div
          className={`ws1-chk-item ${
            isPhaseAcceptable ? "ws1-chk-pass" : "ws1-chk-pending"
          }`}
        >
          <span className="ws1-chk-icon">{isPhaseAcceptable ? "✓" : "○"}</span>
          <span className="ws1-chk-label">
            PHASE: {isPhaseAcceptable ? "ACCEPTABLE" : "MISALIGNED"}
          </span>
        </div>

        <div
          className={`ws1-chk-item ${
            isAmplitudeMatched ? "ws1-chk-pass" : "ws1-chk-pending"
          }`}
        >
          <span className="ws1-chk-icon">{isAmplitudeMatched ? "✓" : "○"}</span>
          <span className="ws1-chk-label">
            AMPLITUDE: {isAmplitudeMatched ? "MATCHED" : "UNBALANCED"}
          </span>
        </div>

        <div
          className={`ws1-chk-item ${
            isFrequencyLocked ? "ws1-chk-pass" : "ws1-chk-pending"
          }`}
        >
          <span className="ws1-chk-icon">{isFrequencyLocked ? "✓" : "○"}</span>
          <span className="ws1-chk-label">
            FREQUENCY: {isFrequencyLocked ? "LOCKED" : "UNLOCKED"}
          </span>
        </div>

        <div
          className={`ws1-chk-item ${
            isResidualSafe ? "ws1-chk-pass" : "ws1-chk-pending"
          }`}
        >
          <span className="ws1-chk-icon">{isResidualSafe ? "✓" : "○"}</span>
          <span className="ws1-chk-label">
            RESIDUAL NOISE: {isResidualSafe ? "BELOW LIMIT" : "ABOVE LIMIT"}
          </span>
        </div>

        <div
          className={`ws1-chk-item ${
            isEfficiencyAcceptable ? "ws1-chk-pass" : "ws1-chk-pending"
          }`}
        >
          <span className="ws1-chk-icon">{isEfficiencyAcceptable ? "✓" : "○"}</span>
          <span className="ws1-chk-label">
            EFFICIENCY: {isEfficiencyAcceptable ? "OPTIMAL" : "SUB-OPTIMAL"}
          </span>
        </div>
      </div>
    </div>
  );
}
