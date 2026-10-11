import PhaseControl from "./PhaseControl";
import AmplitudeControl from "./AmplitudeControl";
import FrequencyControl from "./FrequencyControl";

export default function OptimizationPanel({
  phase = 120,
  amplitude = 60,
  frequency = 290,
  targetPhase = 225,
  targetAmplitude = 90,
  targetFrequency = 320,
  phaseTol = 5,
  ampTol = 4,
  freqTolPercent = 1,
  isPhaseAcceptable = false,
  isAmplitudeMatched = false,
  isFrequencyLocked = false,
  isResidualSafe = false,
  isEfficiencyAcceptable = false,
  isModuleACompleted = false,
  isModuleBCompleted = false,
  isModuleCQuestionsCompleted = false,
  isAuthorized = false,
  onPhaseChange,
  onAmplitudeChange,
  onFrequencyChange,
  onAuthorizeSystem,
  isAuthorizing = false,
}) {
  const allConditionsSatisfied =
    isPhaseAcceptable &&
    isAmplitudeMatched &&
    isFrequencyLocked &&
    isResidualSafe &&
    isEfficiencyAcceptable &&
    isModuleACompleted &&
    isModuleBCompleted &&
    isModuleCQuestionsCompleted;

  return (
    <div className="ws1-optimization-panel">
      <div className="ws1-optimization-briefing">
        <div className="ws1-briefing-badge">
          <span className="ws1-radar-pulse" aria-hidden="true" />
          <span>FLIGHT REGIME SHIFT DETECTED</span>
        </div>
        <h4 className="ws1-briefing-heading">
          AIRCRAFT CABIN CONDITIONS HAVE CHANGED
        </h4>
        <p className="ws1-briefing-body">
          Engine throttle has increased to cruise cruise power (86 dB). Recalibrate the
          anti-noise signal to offset the acoustic transmission delay (target 225° phase),
          match 90% acoustic amplitude, and lock onto the 320 Hz engine harmonic.
        </p>
      </div>

      {/* Recalibration Controls */}
      <div className="ws1-controls-3col">
        <PhaseControl
          phase={phase}
          targetPhase={targetPhase}
          tolerance={phaseTol}
          isAcceptable={isPhaseAcceptable}
          onChange={onPhaseChange}
        />

        <AmplitudeControl
          amplitude={amplitude}
          targetAmplitude={targetAmplitude}
          tolerance={ampTol}
          isMatched={isAmplitudeMatched}
          onChange={onAmplitudeChange}
        />

        <FrequencyControl
          frequency={frequency}
          targetFrequency={targetFrequency}
          tolerancePercent={freqTolPercent}
          isLocked={isFrequencyLocked}
          onChange={onFrequencyChange}
        />
      </div>

      {/* Final Verification Checklist & System Authorization */}
      <div className="ws1-authorization-card">
        <div className="ws1-auth-header">
          <span className="ws1-auth-tag">SYSTEM AUTHORIZATION PROTOCOL</span>
          <span className="ws1-auth-status">
            {allConditionsSatisfied ? "READY FOR AUTHORIZATION" : "PREREQUISITES INCOMPLETE"}
          </span>
        </div>

        <div className="ws1-checklist-grid">
          <div className={`ws1-auth-item ${isPhaseAcceptable ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isPhaseAcceptable ? "✓" : "○"}</span>
            <span>Phase Calibration (225° ± 5°)</span>
          </div>

          <div className={`ws1-auth-item ${isAmplitudeMatched ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isAmplitudeMatched ? "✓" : "○"}</span>
            <span>Amplitude Matching (90% ± 4%)</span>
          </div>

          <div className={`ws1-auth-item ${isFrequencyLocked ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isFrequencyLocked ? "✓" : "○"}</span>
            <span>Frequency Synchronization (320 Hz)</span>
          </div>

          <div className={`ws1-auth-item ${isResidualSafe ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isResidualSafe ? "✓" : "○"}</span>
            <span>Residual Noise Threshold (&lt; 50 dB)</span>
          </div>

          <div className={`ws1-auth-item ${isModuleACompleted ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isModuleACompleted ? "✓" : "○"}</span>
            <span>Module A Verification</span>
          </div>

          <div className={`ws1-auth-item ${isModuleBCompleted ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isModuleBCompleted ? "✓" : "○"}</span>
            <span>Module B Verification</span>
          </div>

          <div
            className={`ws1-auth-item ${
              isModuleCQuestionsCompleted ? "ws1-auth-pass" : ""
            }`}
          >
            <span className="ws1-auth-bullet">
              {isModuleCQuestionsCompleted ? "✓" : "○"}
            </span>
            <span>Module C Technical Questions</span>
          </div>
        </div>

        <div className="ws1-auth-action-box">
          <button
            type="button"
            className={`ws1-authorize-btn ${
              allConditionsSatisfied ? "ws1-btn-auth-ready" : "ws1-btn-auth-disabled"
            } ${isAuthorizing ? "ws1-btn-authorizing" : ""}`}
            disabled={!allConditionsSatisfied || isAuthorizing || isAuthorized}
            onClick={onAuthorizeSystem}
          >
            {isAuthorizing ? (
              <>
                <span className="ws1-spinner" aria-hidden="true" />
                <span>RUNNING ACOUSTIC INTERLOCK CHECKS...</span>
              </>
            ) : isAuthorized ? (
              <span>✓ ANC SYSTEM AUTHORIZED & ACTIVE</span>
            ) : (
              <span>AUTHORIZE ANC SYSTEM</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
