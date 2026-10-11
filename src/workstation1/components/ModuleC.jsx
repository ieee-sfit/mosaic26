import { useState } from "react";
import BitrateControls from "./BitrateControls";
import BufferHealth from "./BufferHealth";
import QuestionCard from "./QuestionCard";
import { moduleCQuestions } from "../config/questions";

export default function ModuleC({
  evaluation,
  selectedBitrateId,
  selectedBufferId,
  selectedPacketLossId,
  onSelectBitrate,
  onSelectBuffer,
  onSelectPacketLoss,
  isModuleACompleted = false,
  isModuleBCompleted = false,
  answers = {},
  onSubmitAnswer,
  isAuthorized = false,
  onAuthorizeBroadcast,
}) {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStep, setAuthStep] = useState(0);

  const q1Answer = answers["moduleC_q1"];
  const q2Answer = answers["moduleC_q2"];
  const isModuleCQuestionsCompleted =
    Boolean(q1Answer?.isCorrect) && Boolean(q2Answer?.isCorrect);

  const {
    isAllocationValid,
    isLatencyTargetAchieved,
    isPeakUtilizationAcceptable,
    isPacketLossAcceptable,
    isBufferAcceptable,
    isBitrateValid,
    currentLatencySeconds,
    peakUtilization,
    packetLossPercent,
  } = evaluation;

  const allConditionsSatisfied =
    isAllocationValid &&
    isLatencyTargetAchieved &&
    isPeakUtilizationAcceptable &&
    isPacketLossAcceptable &&
    isBufferAcceptable &&
    isBitrateValid &&
    isModuleACompleted &&
    isModuleBCompleted &&
    isModuleCQuestionsCompleted;

  const handleAuthorizeClick = () => {
    setIsAuthorizing(true);
    setAuthStep(1); // CHECKING CDN HEALTH

    setTimeout(() => setAuthStep(2), 500); // VERIFYING TRAFFIC
    setTimeout(() => setAuthStep(3), 1000); // CHECKING LATENCY
    setTimeout(() => setAuthStep(4), 1500); // VERIFYING BITRATE & BUFFER
    setTimeout(() => {
      setIsAuthorizing(false);
      onAuthorizeBroadcast();
    }, 2200);
  };

  const authStepMessages = [
    "",
    "CHECKING CDN HEALTH & TOPOLOGY...",
    "VERIFYING TRAFFIC DISTRIBUTION...",
    "CHECKING BROADCAST LATENCY...",
    "VALIDATING BITRATE & BUFFER HEALTH...",
  ];

  return (
    <div className="ws1-module-container ws1-module-c">
      {/* Module Header */}
      <div className="ws1-module-header">
        <div className="ws1-mod-badge-group">
          <span className="ws1-module-code">MODULE C</span>
          <span className="ws1-module-time-est">TARGET: 06:00</span>
        </div>
        <h2 className="ws1-module-title">FINAL BROADCAST OPTIMIZATION</h2>
        <p className="ws1-module-desc">
          The race is entering its final laps. Viewer demand is surging. Optimize the delivery
          profile, tune buffer latency margins, mitigate packet loss, and authorize the global
          Formula 1 live broadcast feed.
        </p>
      </div>

      {/* Task 1: Bitrate Profile */}
      <BitrateControls
        selectedBitrateId={selectedBitrateId}
        onSelectBitrate={onSelectBitrate}
      />

      {/* Tasks 2 & 3: Buffer Health & Packet Loss */}
      <BufferHealth
        selectedBufferId={selectedBufferId}
        selectedPacketLossId={selectedPacketLossId}
        onSelectBuffer={onSelectBuffer}
        onSelectPacketLoss={onSelectPacketLoss}
      />

      {/* Task 4: Final Stream Verification Checklist & System Authorization */}
      <div className="ws1-authorization-card">
        <div className="ws1-auth-header">
          <span className="ws1-auth-tag">BROADCAST AUTHORIZATION INTERLOCK</span>
          <span className="ws1-auth-status">
            {allConditionsSatisfied ? "READY FOR BROADCAST AUTHORIZATION" : "PREREQUISITES INCOMPLETE"}
          </span>
        </div>

        <div className="ws1-checklist-grid">
          <div className={`ws1-auth-item ${isAllocationValid ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isAllocationValid ? "✓" : "○"}</span>
            <span>Traffic Allocation (100% Balanced)</span>
          </div>

          <div className={`ws1-auth-item ${isPeakUtilizationAcceptable ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isPeakUtilizationAcceptable ? "✓" : "○"}</span>
            <span>CDN Peak Utilization (≤ 75% | Current: {peakUtilization}%)</span>
          </div>

          <div className={`ws1-auth-item ${isLatencyTargetAchieved ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isLatencyTargetAchieved ? "✓" : "○"}</span>
            <span>Latency Target (&lt; 1.50s | Current: {currentLatencySeconds}s)</span>
          </div>

          <div className={`ws1-auth-item ${isPacketLossAcceptable ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isPacketLossAcceptable ? "✓" : "○"}</span>
            <span>Packet Loss Margin (≤ 1.0% | Current: {packetLossPercent}%)</span>
          </div>

          <div className={`ws1-auth-item ${isBufferAcceptable ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isBufferAcceptable ? "✓" : "○"}</span>
            <span>Buffer Cushion Health</span>
          </div>

          <div className={`ws1-auth-item ${isBitrateValid ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isBitrateValid ? "✓" : "○"}</span>
            <span>Bitrate Profile Valid</span>
          </div>

          <div className={`ws1-auth-item ${isModuleACompleted ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isModuleACompleted ? "✓" : "○"}</span>
            <span>Module A Briefing Verified</span>
          </div>

          <div className={`ws1-auth-item ${isModuleBCompleted ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isModuleBCompleted ? "✓" : "○"}</span>
            <span>Module B CDN Traffic Stabilized</span>
          </div>

          <div className={`ws1-auth-item ${isModuleCQuestionsCompleted ? "ws1-auth-pass" : ""}`}>
            <span className="ws1-auth-bullet">{isModuleCQuestionsCompleted ? "✓" : "○"}</span>
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
            onClick={handleAuthorizeClick}
          >
            {isAuthorizing ? (
              <>
                <span className="ws1-spinner" aria-hidden="true" />
                <span>{authStepMessages[authStep] || "TRANSMITTING TO WORLD FEED..."}</span>
              </>
            ) : isAuthorized ? (
              <span>✓ LIVE RACE BROADCAST AUTHORIZED & ACTIVE</span>
            ) : (
              <span>AUTHORIZE LIVE BROADCAST</span>
            )}
          </button>
        </div>
      </div>

      {/* Task 5: Module C Final Verification Questions */}
      <div className="ws1-mod-c-questions-container">
        <div className="ws1-section-header">
          <span className="ws1-section-tag">TASK 5: FINAL VERIFICATION QUESTIONS</span>
          <span className="ws1-section-count">2 OF 2 REQUIRED</span>
        </div>

        <div className="ws1-q-double-grid">
          {moduleCQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              submittedAnswer={answers[q.id]}
              onSubmitAnswer={onSubmitAnswer}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
