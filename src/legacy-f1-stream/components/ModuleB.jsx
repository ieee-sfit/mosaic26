import { useState, useRef, useEffect } from "react";
import CDNNetwork from "./CDNNetwork";
import TrafficControls from "./TrafficControls";
import QuestionCard from "./QuestionCard";
import { moduleBQuestions } from "../config/questions";

export default function ModuleB({
  evaluation,
  allocations,
  onAllocationChange,
  onApplyOptimalDistribution,
  onResetDistribution,
  answers = {},
  onSubmitAnswer,
  isCompleted = false,
  onProceedToModuleC,
}) {
  const [selectedNodeId, setSelectedNodeId] = useState("origin");
  const verificationRef = useRef(null);

  const verificationQuestion = moduleBQuestions[0];
  const qAnswer = answers[verificationQuestion.id];
  const isQuestionAnsweredCorrectly = Boolean(qAnswer?.isCorrect);

  const { isLatencyTargetAchieved, isPeakUtilizationAcceptable, isAllocationValid, currentLatencySeconds } = evaluation;
  const isStabilized = isLatencyTargetAchieved && isPeakUtilizationAcceptable && isAllocationValid;

  useEffect(() => {
    if (isStabilized && verificationRef.current) {
      verificationRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isStabilized]);

  return (
    <div className="ws1-module-container ws1-module-b">
      {/* Module Title Header */}
      <div className="ws1-module-header">
        <div className="ws1-mod-badge-group">
          <span className="ws1-module-code">MODULE B</span>
          <span className="ws1-module-time-est">TARGET: 04:30</span>
        </div>
        <h2 className="ws1-module-title">CDN TRAFFIC CONTROL</h2>
        <p className="ws1-module-desc">
          Distribute the live race traffic before latency spikes destroy the broadcast.
          Move viewer traffic away from the 94% overloaded Primary Origin and congested
          Asian PoP toward healthy European and North American edge servers.
        </p>
      </div>

      {/* 1. Global CDN Network Topology */}
      <CDNNetwork
        nodes={evaluation.nodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
      />

      {/* 2. Interactive Traffic Allocation Sliders */}
      <TrafficControls
        allocations={allocations}
        totalAllocation={evaluation.totalAllocation}
        isAllocationValid={isAllocationValid}
        onChangeAllocation={onAllocationChange}
        onApplyOptimalDistribution={onApplyOptimalDistribution}
        onResetDistribution={onResetDistribution}
      />

      {/* 3. Stabilized Banner & Verification Question */}
      {isStabilized && (
        <div ref={verificationRef} className="ws1-mod-b-verification-section">
          <div className="ws1-verified-box ws1-box-glow">
            <div className="ws1-verified-text-wrap">
              <span className="ws1-verified-icon" aria-hidden="true">✓</span>
              <div>
                <h4 className="ws1-verified-headline">CDN TRAFFIC STABILIZED</h4>
                <div className="ws1-calib-telemetry-pill-row">
                  <span>TRAFFIC ROUTING: OPTIMAL</span>
                  <span>•</span>
                  <span>NETWORK HEALTH: STABLE</span>
                  <span>•</span>
                  <span>LATENCY: {currentLatencySeconds}s</span>
                  <span>•</span>
                  <span className="ws1-pill-green">LATENCY TARGET: ACHIEVED (&lt;1.5s)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ws1-verification-q-wrap">
            <QuestionCard
              question={verificationQuestion}
              submittedAnswer={qAnswer}
              onSubmitAnswer={onSubmitAnswer}
            />
          </div>

          {/* Module Complete Banner */}
          {(isQuestionAnsweredCorrectly || isCompleted) && (
            <div className="ws1-advance-banner">
              <div className="ws1-advance-text">
                <span className="ws1-advance-badge">MODULE B COMPLETE</span>
                <span className="ws1-advance-desc">
                  Edge CDN balancing achieved sub-1.5s latency. Proceed to Module C for
                  final broadcast optimization and transmission authorization.
                </span>
              </div>
              <button
                type="button"
                className="ws1-advance-module-btn"
                onClick={onProceedToModuleC}
              >
                PROCEED TO MODULE C (FINAL OPTIMIZATION) →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
