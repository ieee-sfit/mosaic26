import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import StationHeader from "./components/StationHeader";
import MissionSidebar from "./components/MissionSidebar";
import RaceScene from "./components/RaceScene";
import StreamingDashboard from "./components/StreamingDashboard";
import StartScreen from "./components/StartScreen";
import ModuleA from "./components/ModuleA";
import ModuleB from "./components/ModuleB";
import ModuleC from "./components/ModuleC";
import HintPanel from "./components/HintPanel";
import SystemLog from "./components/SystemLog";
import SuccessScreen from "./components/SuccessScreen";
import FailureScreen from "./components/FailureScreen";
import DebugDrawer from "./components/DebugDrawer";
import LeaderboardModal from "./components/LeaderboardModal";

import { station1Config } from "./config/stationConfig";
import { evaluateStreamingNetwork } from "./utils/streamSimulator";
import { calculateScore, formatStationResult } from "./utils/scoreCalculator";
import { updateStationResult } from "./utils/stationResult";
import { saveGameResult } from "./utils/resultsManager";
import {
  saveStationState,
  loadStationState,
  clearStationState,
  hasSavedShift,
} from "./utils/storage";

import "./station1.css";

export default function Station1({
  onComplete,
  onNavigateStation,
  initialOperatorName = "Shelby F1 Pit Wall",
}) {
  // 1. Shift lifecycle states
  const [shiftStarted, setShiftStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [resumePromptVisible, setResumePromptVisible] = useState(() => hasSavedShift());
  const [debugOpen, setDebugOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [operatorName, setOperatorName] = useState(() => {
    return localStorage.getItem("ws1_current_operator") || initialOperatorName;
  });
  const hasSavedResultRef = useRef(false);

  // 2. Timer states (Timestamp-driven)
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(station1Config.totalDurationSeconds);
  const timerIntervalRef = useRef(null);

  // 3. Navigation
  const [currentModule, setCurrentModule] = useState("A"); // "A" | "B" | "C"

  // 4. Questions & answer records
  const [moduleAAnswers, setModuleAAnswers] = useState({});
  const [moduleBAnswers, setModuleBAnswers] = useState({});
  const [moduleCAnswers, setModuleCAnswers] = useState({});
  const [isModuleACompleted, setIsModuleACompleted] = useState(false);
  const [isModuleBCompleted, setIsModuleBCompleted] = useState(false);
  const [isModuleCCompleted, setIsModuleCCompleted] = useState(false);

  // 5. Module B CDN traffic allocations (Initial: Origin 40%, EU 25%, NA 15%, Asia 12%, SA 8%)
  const [allocations, setAllocations] = useState({
    origin: 40,
    eu_edge: 25,
    na_edge: 15,
    asia_edge: 12,
    sa_edge: 8,
  });
  const [failedVerificationAttempts, setFailedVerificationAttempts] = useState(0);

  // 6. Module C settings
  const [selectedBitrateId, setSelectedBitrateId] = useState("BALANCED");
  const [selectedBufferId, setSelectedBufferId] = useState("BALANCED_LIVE");
  const [selectedPacketLossId, setSelectedPacketLossId] = useState("CMAF_FEC");
  const [isBroadcastAuthorized, setIsBroadcastAuthorized] = useState(false);

  // 7. Scoring, errors & hints
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState([]);
  const [wrongQuestionAttempts, setWrongQuestionAttempts] = useState(0);

  // 8. Real-time Telemetry Logs
  const [logs, setLogs] = useState(() => [
    {
      id: "log_init",
      time: new Date().toLocaleTimeString("en-GB"),
      message: "BROADCAST INITIALIZED // F1 PIT WALL TELEMETRY ONLINE",
      type: "info",
    },
  ]);

  const addLog = useCallback((message, type = "info") => {
    const newEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString("en-GB"),
      message,
      type,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
  }, []);

  // Compute live CDN streaming evaluation
  const evaluation = useMemo(() => {
    return evaluateStreamingNetwork({
      allocations,
      selectedBitrateId,
      selectedBufferId,
      selectedPacketLossId,
      totalViewersMillions: 2.4,
    });
  }, [allocations, selectedBitrateId, selectedBufferId, selectedPacketLossId]);

  // Log notification when latency target is achieved (<1.5s)
  const hasLoggedLatencyTargetRef = useRef(false);
  useEffect(() => {
    if (evaluation.isLatencyTargetAchieved && !hasLoggedLatencyTargetRef.current) {
      hasLoggedLatencyTargetRef.current = true;
      addLog(`LATENCY TARGET ACHIEVED // ${evaluation.currentLatencySeconds}s (<1.5s)`, "success");
    } else if (!evaluation.isLatencyTargetAchieved) {
      hasLoggedLatencyTargetRef.current = false;
    }
  }, [evaluation.isLatencyTargetAchieved, evaluation.currentLatencySeconds, addLog]);

  // Compute live score
  const scoreData = useMemo(() => {
    return calculateScore({
      moduleAAnswers,
      isModuleACompleted,
      isLatencyTargetAchieved: evaluation.isLatencyTargetAchieved,
      moduleBAnswers,
      isModuleBCompleted,
      isBroadcastVerified: isBroadcastAuthorized,
      moduleCAnswers,
      isModuleCCompleted,
      wrongQuestionAttempts,
      failedVerificationAttempts,
      hintsUsed,
      errors,
    });
  }, [
    moduleAAnswers,
    isModuleACompleted,
    evaluation.isLatencyTargetAchieved,
    moduleBAnswers,
    isModuleBCompleted,
    isBroadcastAuthorized,
    moduleCAnswers,
    isModuleCCompleted,
    wrongQuestionAttempts,
    failedVerificationAttempts,
    hintsUsed,
    errors,
  ]);

  // Synchronize global result export
  useEffect(() => {
    updateStationResult(
      {
        isCompleted,
        errors,
        hintsUsed,
      },
      scoreData,
      timeRemaining,
      operatorName
    );
  }, [scoreData, isCompleted, timeRemaining, errors, hintsUsed, operatorName]);

  // Save gameplay results when completed or timed out
  useEffect(() => {
    if ((isCompleted || isTimedOut) && shiftStarted && !hasSavedResultRef.current) {
      hasSavedResultRef.current = true;
      const formatted = formatStationResult(
        { isCompleted, errors, hintsUsed },
        scoreData,
        timeRemaining,
        operatorName,
        evaluation.currentLatencySeconds
      );
      saveGameResult(formatted);
      addLog(
        `SHIFT RESULTS ARCHIVED FOR [${operatorName}] // SCORE: ${scoreData.totalScore}/100`,
        isCompleted ? "success" : "warn"
      );

      if (onComplete && isCompleted) {
        onComplete(formatted);
      }
    }
  }, [
    isCompleted,
    isTimedOut,
    shiftStarted,
    scoreData,
    timeRemaining,
    operatorName,
    evaluation.currentLatencySeconds,
    errors,
    hintsUsed,
    addLog,
    onComplete,
  ]);

  // Handle session resume
  const handleResumeShift = () => {
    const saved = loadStationState();
    if (saved) {
      setShiftStarted(true);
      setStartTimestamp(saved.startTimestamp || Date.now());
      setCurrentModule(saved.currentModule || "A");
      setModuleAAnswers(saved.moduleAAnswers || {});
      setModuleBAnswers(saved.moduleBAnswers || {});
      setModuleCAnswers(saved.moduleCAnswers || {});
      setIsModuleACompleted(Boolean(saved.isModuleACompleted));
      setIsModuleBCompleted(Boolean(saved.isModuleBCompleted));
      setIsModuleCCompleted(Boolean(saved.isModuleCCompleted));
      if (saved.allocations) setAllocations(saved.allocations);
      if (saved.selectedBitrateId) setSelectedBitrateId(saved.selectedBitrateId);
      if (saved.selectedBufferId) setSelectedBufferId(saved.selectedBufferId);
      if (saved.selectedPacketLossId) setSelectedPacketLossId(saved.selectedPacketLossId);
      setIsBroadcastAuthorized(Boolean(saved.isBroadcastAuthorized));
      setErrors(saved.errors || 0);
      setHintsUsed(saved.hintsUsed || []);
      setFailedVerificationAttempts(saved.failedVerificationAttempts || 0);
      setWrongQuestionAttempts(saved.wrongQuestionAttempts || 0);
      if (saved.operatorName) setOperatorName(saved.operatorName);
      if (saved.logs && Array.isArray(saved.logs)) setLogs(saved.logs);

      const elapsed = Math.floor((Date.now() - saved.startTimestamp) / 1000);
      const remaining = Math.max(0, station1Config.totalDurationSeconds - elapsed);
      setTimeRemaining(remaining);

      addLog("SESSION RESTORED FROM LOCAL STORAGE CACHE", "info");
    }
    setResumePromptVisible(false);
  };

  const handleRestartShift = () => {
    clearStationState();
    setResumePromptVisible(false);
  };

  // --------------------------------------------------------------------------
  // TIMER (Timestamp-driven)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!shiftStarted || isCompleted || isTimedOut) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const interval = setInterval(() => {
      if (!startTimestamp) return;
      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
      const remaining = station1Config.totalDurationSeconds - elapsedSeconds;

      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsTimedOut(true);
        clearInterval(interval);
        addLog("CRITICAL: 12:00 SHIFT TIMEOUT EXPIRED // BROADCAST DEGRADED", "error");
      } else {
        setTimeRemaining(remaining);
      }
    }, 250);

    timerIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [shiftStarted, startTimestamp, isCompleted, isTimedOut, addLog]);

  // Periodic LocalStorage state save
  useEffect(() => {
    if (!shiftStarted || isCompleted || isTimedOut) return;

    saveStationState({
      shiftStarted,
      startTimestamp,
      currentModule,
      moduleAAnswers,
      moduleBAnswers,
      moduleCAnswers,
      isModuleACompleted,
      isModuleBCompleted,
      isModuleCCompleted,
      allocations,
      selectedBitrateId,
      selectedBufferId,
      selectedPacketLossId,
      isBroadcastAuthorized,
      errors,
      hintsUsed,
      failedVerificationAttempts,
      wrongQuestionAttempts,
      operatorName,
      logs: logs.slice(0, 30),
      isCompleted,
      isTimedOut,
    });
  }, [
    shiftStarted,
    startTimestamp,
    currentModule,
    moduleAAnswers,
    moduleBAnswers,
    moduleCAnswers,
    isModuleACompleted,
    isModuleBCompleted,
    isModuleCCompleted,
    allocations,
    selectedBitrateId,
    selectedBufferId,
    selectedPacketLossId,
    isBroadcastAuthorized,
    errors,
    hintsUsed,
    failedVerificationAttempts,
    wrongQuestionAttempts,
    operatorName,
    logs,
    isCompleted,
    isTimedOut,
  ]);

  // Keyboard shortcut for Organizer / Dev drawer (Ctrl + Shift + D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setDebugOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --------------------------------------------------------------------------
  // USER ACTIONS & HANDLERS
  // --------------------------------------------------------------------------
  const handleStartShift = (name) => {
    setOperatorName(name);
    try {
      localStorage.setItem("ws1_current_operator", name);
    } catch (e) {
      console.warn(e);
    }
    const now = Date.now();
    setStartTimestamp(now);
    setTimeRemaining(station1Config.totalDurationSeconds);
    setShiftStarted(true);
    addLog(`RACE SHIFT COMMENCED FOR [${name}]`, "info");
    addLog("TRAFFIC SPIKE DETECTED // 2.4M VIEWERS OVERLOADING ORIGIN", "warn");
  };

  // Module A question submission
  const handleSubmitModuleA = ({ questionId, selected, isCorrect }) => {
    setModuleAAnswers((prev) => {
      const prevRecord = prev[questionId] || { wrongAttempts: 0 };
      const newWrongAttempts = isCorrect
        ? prevRecord.wrongAttempts
        : prevRecord.wrongAttempts + 1;

      return {
        ...prev,
        [questionId]: {
          selected,
          isCorrect,
          wrongAttempts: newWrongAttempts,
        },
      };
    });

    if (isCorrect) {
      addLog(`RACE BRIEFING [${questionId}] VERIFIED`, "success");
    } else {
      setErrors((prev) => prev + 1);
      setWrongQuestionAttempts((prev) => prev + 1);
      addLog(`RACE BRIEFING [${questionId}] INCORRECT SUBMISSION`, "warn");
    }
  };

  const handleProceedToModuleB = () => {
    setIsModuleACompleted(true);
    setCurrentModule("B");
    addLog("MODULE A COMPLETED // CDN EDGE TOPOLOGY BUS UNLOCKED", "success");
    addLog("WARNING: ORIGIN UTILIZATION 94% // LATENCY AT 2.8s", "warn");
  };

  // Module B allocation change
  const handleChangeAllocation = (nodeKey, value) => {
    setAllocations((prev) => ({
      ...prev,
      [nodeKey]: value,
    }));
    addLog(`TRAFFIC REALLOCATION UPDATED [${nodeKey.toUpperCase()}: ${value}%]`, "info");
  };

  const handleApplyOptimalDistribution = () => {
    setAllocations({
      eu_edge: 35,
      na_edge: 30,
      asia_edge: 18,
      sa_edge: 12,
      origin: 5,
    });
    addLog("OPTIMAL RACE DISTRIBUTION APPLIED (EU 35%, NA 30%, AS 18%, SA 12%, ORG 5%)", "success");
  };

  const handleResetDistribution = () => {
    setAllocations({
      origin: 40,
      eu_edge: 25,
      na_edge: 15,
      asia_edge: 12,
      sa_edge: 8,
    });
    addLog("TRAFFIC RESET TO DEFAULT OVERLOADED CRISIS STATE", "warn");
  };

  // Module B verification question
  const handleSubmitModuleB = ({ questionId, selected, isCorrect }) => {
    setModuleBAnswers((prev) => {
      const prevRecord = prev[questionId] || { wrongAttempts: 0 };
      const newWrongAttempts = isCorrect
        ? prevRecord.wrongAttempts
        : prevRecord.wrongAttempts + 1;

      return {
        ...prev,
        [questionId]: {
          selected,
          isCorrect,
          wrongAttempts: newWrongAttempts,
        },
      };
    });

    if (isCorrect) {
      setIsModuleBCompleted(true);
      addLog("MODULE B VERIFICATION QUESTION PASSED", "success");
    } else {
      setErrors((prev) => prev + 1);
      setWrongQuestionAttempts((prev) => prev + 1);
      addLog("MODULE B VERIFICATION QUESTION INCORRECT", "warn");
    }
  };

  const handleProceedToModuleC = () => {
    setIsModuleBCompleted(true);
    setCurrentModule("C");
    addLog("MODULE B COMPLETED // ADVANCING TO FINAL BROADCAST OPTIMIZATION", "success");
    addLog("FINAL LAPS APPROACHING // DEMAND SURGING", "info");
  };

  // Module C selection changes
  const handleSelectBitrate = (bitrateId) => {
    setSelectedBitrateId(bitrateId);
    addLog(`BITRATE PROFILE CHANGED // ${bitrateId}`, "info");
  };

  const handleSelectBuffer = (bufferId) => {
    setSelectedBufferId(bufferId);
    addLog(`BUFFER PROFILE CHANGED // ${bufferId}`, "info");
  };

  const handleSelectPacketLoss = (packetLossId) => {
    setSelectedPacketLossId(packetLossId);
    addLog(`PACKET LOSS STRATEGY CHANGED // ${packetLossId}`, "info");
  };

  // Module C question submissions
  const handleSubmitModuleC = ({ questionId, selected, isCorrect }) => {
    setModuleCAnswers((prev) => {
      const prevRecord = prev[questionId] || { wrongAttempts: 0 };
      const newWrongAttempts = isCorrect
        ? prevRecord.wrongAttempts
        : prevRecord.wrongAttempts + 1;

      return {
        ...prev,
        [questionId]: {
          selected,
          isCorrect,
          wrongAttempts: newWrongAttempts,
        },
      };
    });

    if (isCorrect) {
      addLog(`MODULE C QUESTION [${questionId}] VERIFIED`, "success");
    } else {
      setErrors((prev) => prev + 1);
      setWrongQuestionAttempts((prev) => prev + 1);
      addLog(`MODULE C QUESTION [${questionId}] INCORRECT SUBMISSION`, "warn");
    }
  };

  // Final Broadcast Authorization
  const handleAuthorizeBroadcast = () => {
    setIsBroadcastAuthorized(true);
    setIsModuleCCompleted(true);
    setIsCompleted(true);
    addLog("BROADCAST AUTHORIZED // LIVE WORLD FEED RUNNING OPTIMAL AT <1.5s", "success");
  };

  // Hint unlock
  const handleUnlockHint = (hintId) => {
    if (!hintsUsed.includes(hintId)) {
      setHintsUsed((prev) => [...prev, hintId]);
      addLog(`RACE GUIDANCE [${hintId}] ACCESSED (-${station1Config.scoring.hintPenalty} PTS)`, "info");
    }
  };

  // Final complete click
  const handleCompleteStation = () => {
    setLeaderboardOpen(true);
    const formatted = formatStationResult(
      { isCompleted: true, errors, hintsUsed },
      scoreData,
      timeRemaining,
      operatorName,
      evaluation.currentLatencySeconds
    );
    if (onComplete) {
      onComplete(formatted);
    }
    addLog("STATION 01 COMPLETED // LEADERBOARD ARCHIVES DISPLAYED", "success");
  };

  // Reset station
  const handleResetEntireStation = () => {
    clearStationState();
    setShiftStarted(false);
    setIsCompleted(false);
    setIsTimedOut(false);
    setCurrentModule("A");
    setModuleAAnswers({});
    setModuleBAnswers({});
    setModuleCAnswers({});
    setIsModuleACompleted(false);
    setIsModuleBCompleted(false);
    setIsModuleCCompleted(false);
    setAllocations({
      origin: 40,
      eu_edge: 25,
      na_edge: 15,
      asia_edge: 12,
      sa_edge: 8,
    });
    setSelectedBitrateId("BALANCED");
    setSelectedBufferId("BALANCED_LIVE");
    setSelectedPacketLossId("CMAF_FEC");
    setIsBroadcastAuthorized(false);
    setErrors(0);
    setHintsUsed([]);
    setFailedVerificationAttempts(0);
    setWrongQuestionAttempts(0);
    setTimeRemaining(station1Config.totalDurationSeconds);
    hasSavedResultRef.current = false;
    addLog("STATION RESET TO DEFAULT INITIAL STATE", "warn");
  };

  // --------------------------------------------------------------------------
  // RENDER LIFECYCLE
  // --------------------------------------------------------------------------

  // A. Resume Prompt Modal
  if (resumePromptVisible) {
    return (
      <div className="ws1-shell">
        <div className="ws1-modal-backdrop">
          <div className="ws1-resume-modal-card">
            <div className="ws1-resume-icon" aria-hidden="true">🔄</div>
            <h2 className="ws1-resume-title">ACTIVE RACE SHIFT DETECTED</h2>
            <p className="ws1-resume-desc">
              A previous active race broadcast shift was found in session storage.
              Would you like to resume pit-wall streaming engineering or restart from briefing?
            </p>
            <div className="ws1-resume-actions">
              <button
                type="button"
                className="ws1-resume-btn-confirm"
                onClick={handleResumeShift}
              >
                RESUME ACTIVE SHIFT
              </button>
              <button
                type="button"
                className="ws1-resume-btn-restart"
                onClick={handleRestartShift}
              >
                RESTART FROM BRIEFING
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // B. Start Screen
  if (!shiftStarted) {
    return (
      <div className="ws1-shell">
        <StartScreen
          onStartShift={handleStartShift}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          initialOperatorName={operatorName}
        />
        <LeaderboardModal
          isOpen={leaderboardOpen}
          onClose={() => setLeaderboardOpen(false)}
          currentOperator={operatorName}
        />
        <DebugDrawer
          isOpen={debugOpen}
          onClose={() => setDebugOpen(false)}
          onSkipModuleA={() => {
            setShiftStarted(true);
            setStartTimestamp(Date.now());
            setIsModuleACompleted(true);
            setCurrentModule("B");
          }}
          onAutoBalanceB={() => {
            setShiftStarted(true);
            setStartTimestamp(Date.now());
            setIsModuleACompleted(true);
            setCurrentModule("B");
            handleApplyOptimalDistribution();
          }}
          onAutoOptimizeC={() => {
            setShiftStarted(true);
            setStartTimestamp(Date.now());
            setIsModuleACompleted(true);
            setIsModuleBCompleted(true);
            setCurrentModule("C");
            handleApplyOptimalDistribution();
            setSelectedBitrateId("BALANCED");
            setSelectedBufferId("BALANCED_LIVE");
            setSelectedPacketLossId("CMAF_FEC");
          }}
          onSetTimer={(sec) => {
            setTimeRemaining(sec);
            setStartTimestamp(Date.now() - (station1Config.totalDurationSeconds - sec) * 1000);
          }}
          onTriggerSuccess={() => {
            setShiftStarted(true);
            setIsCompleted(true);
          }}
          onTriggerTimeout={() => {
            setShiftStarted(true);
            setIsTimedOut(true);
          }}
          onResetStation={handleResetEntireStation}
          currentModule={currentModule}
          timeRemaining={timeRemaining}
          score={scoreData.totalScore}
        />
      </div>
    );
  }

  // C. Success Screen (Checkered Flag)
  if (isCompleted) {
    const formattedResult = formatStationResult(
      { isCompleted: true, errors, hintsUsed },
      scoreData,
      timeRemaining,
      operatorName,
      evaluation.currentLatencySeconds
    );

    return (
      <div className="ws1-shell">
        <StationHeader
          systemStatus="OPTIMAL"
          timeRemaining={timeRemaining}
          errors={errors}
          hintsUsedCount={hintsUsed.length}
          score={scoreData.totalScore}
          operatorName={operatorName}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenDebug={() => setDebugOpen(true)}
        />
        <SuccessScreen
          finalResult={formattedResult}
          scoreData={scoreData}
          timeRemaining={timeRemaining}
          errors={errors}
          hintsUsedCount={hintsUsed.length}
          finalLatency={evaluation.currentLatencySeconds}
          operatorName={operatorName}
          onCompleteStation={handleCompleteStation}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onRestartStation={handleResetEntireStation}
          onNavigateNext={onNavigateStation ? () => onNavigateStation(4) : null}
        />
        <LeaderboardModal
          isOpen={leaderboardOpen}
          onClose={() => setLeaderboardOpen(false)}
          currentOperator={operatorName}
        />
        <DebugDrawer
          isOpen={debugOpen}
          onClose={() => setDebugOpen(false)}
          onSkipModuleA={() => {}}
          onAutoBalanceB={() => {}}
          onAutoOptimizeC={() => {}}
          onSetTimer={(sec) => setTimeRemaining(sec)}
          onTriggerSuccess={() => setIsCompleted(true)}
          onTriggerTimeout={() => {
            setIsCompleted(false);
            setIsTimedOut(true);
          }}
          onResetStation={handleResetEntireStation}
          currentModule={currentModule}
          timeRemaining={timeRemaining}
          score={scoreData.totalScore}
        />
      </div>
    );
  }

  // D. Timeout Screen
  if (isTimedOut) {
    return (
      <div className="ws1-shell">
        <StationHeader
          systemStatus="DEGRADED"
          timeRemaining={0}
          errors={errors}
          hintsUsedCount={hintsUsed.length}
          score={scoreData.totalScore}
          operatorName={operatorName}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenDebug={() => setDebugOpen(true)}
        />
        <FailureScreen
          finalScore={scoreData.totalScore}
          scoreData={scoreData}
          timeUsedSeconds={station1Config.totalDurationSeconds}
          errors={errors}
          hintsUsedCount={hintsUsed.length}
          completedModules={[
            isModuleACompleted ? "A" : null,
            isModuleBCompleted ? "B" : null,
            isModuleCCompleted ? "C" : null,
          ].filter(Boolean)}
          finalLatency={evaluation.currentLatencySeconds}
          onRestartStation={handleResetEntireStation}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
        />
        <LeaderboardModal
          isOpen={leaderboardOpen}
          onClose={() => setLeaderboardOpen(false)}
          currentOperator={operatorName}
        />
        <DebugDrawer
          isOpen={debugOpen}
          onClose={() => setDebugOpen(false)}
          onSkipModuleA={() => {}}
          onAutoBalanceB={() => {}}
          onAutoOptimizeC={() => {}}
          onSetTimer={(sec) => {
            setIsTimedOut(false);
            setTimeRemaining(sec);
            setStartTimestamp(Date.now() - (station1Config.totalDurationSeconds - sec) * 1000);
          }}
          onTriggerSuccess={() => {
            setIsTimedOut(false);
            setIsCompleted(true);
          }}
          onTriggerTimeout={() => setIsTimedOut(true)}
          onResetStation={handleResetEntireStation}
          currentModule={currentModule}
          timeRemaining={timeRemaining}
          score={scoreData.totalScore}
        />
      </div>
    );
  }

  // E. Main Command Center View (3-Column Layout: Left Sidebar, Center Simulation & Module Controls, Right Telemetry)
  return (
    <div className="ws1-shell">
      {/* Top Navigation Bar */}
      <StationHeader
        systemStatus={evaluation.networkStatus}
        timeRemaining={timeRemaining}
        errors={errors}
        hintsUsedCount={hintsUsed.length}
        score={scoreData.totalScore}
        operatorName={operatorName}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenDebug={() => setDebugOpen(true)}
      />

      {/* Main Command Center Layout Grid */}
      <div className="ws1-command-center-grid">
        {/* Left Column: Mission Sidebar */}
        <MissionSidebar
          currentModule={currentModule}
          isModuleACompleted={isModuleACompleted}
          isModuleBCompleted={isModuleBCompleted}
          isModuleCCompleted={isModuleCCompleted}
          currentLatency={evaluation.currentLatencySeconds}
          targetLatency={station1Config.targetLatencySeconds}
          score={scoreData.totalScore}
          errors={errors}
          hintsUsedCount={hintsUsed.length}
          onSelectModule={(modId) => setCurrentModule(modId)}
        />

        {/* Center Column: Race Scene & Active Module Engineering Controls */}
        <main className="ws1-center-stage" role="main">
          {/* Main Cinematic Racing Scene & HUD */}
          <RaceScene
            currentLatency={evaluation.currentLatencySeconds}
            networkStatus={evaluation.networkStatus}
            totalViewersMillions={evaluation.totalViewersMillions}
            lap={24}
            totalLaps={66}
          />

          {/* Active Module Engineering Controls */}
          <div className="ws1-module-workspace-card">
            {currentModule === "A" && (
              <ModuleA
                answers={moduleAAnswers}
                isCompleted={isModuleACompleted}
                onSubmitAnswer={handleSubmitModuleA}
                onProceedToModuleB={handleProceedToModuleB}
              />
            )}

            {currentModule === "B" && (
              <ModuleB
                evaluation={evaluation}
                allocations={allocations}
                onAllocationChange={handleChangeAllocation}
                onApplyOptimalDistribution={handleApplyOptimalDistribution}
                onResetDistribution={handleResetDistribution}
                answers={moduleBAnswers}
                onSubmitAnswer={handleSubmitModuleB}
                isCompleted={isModuleBCompleted}
                onProceedToModuleC={handleProceedToModuleC}
              />
            )}

            {currentModule === "C" && (
              <ModuleC
                evaluation={evaluation}
                selectedBitrateId={selectedBitrateId}
                selectedBufferId={selectedBufferId}
                selectedPacketLossId={selectedPacketLossId}
                onSelectBitrate={handleSelectBitrate}
                onSelectBuffer={handleSelectBuffer}
                onSelectPacketLoss={handleSelectPacketLoss}
                isModuleACompleted={isModuleACompleted}
                isModuleBCompleted={isModuleBCompleted}
                answers={moduleCAnswers}
                onSubmitAnswer={handleSubmitModuleC}
                isAuthorized={isBroadcastAuthorized}
                onAuthorizeBroadcast={handleAuthorizeBroadcast}
              />
            )}
          </div>
        </main>

        {/* Right Column: Streaming Telemetry Console */}
        <aside className="ws1-right-telemetry-col">
          <StreamingDashboard
            currentLatency={evaluation.currentLatencySeconds}
            peakUtilization={evaluation.peakUtilization}
            averageUtilization={evaluation.averageUtilization}
            packetLossPercent={evaluation.packetLossPercent}
            bitrateProfile={evaluation.bitrateProfile}
            bufferProfile={evaluation.bufferProfile}
            totalViewersMillions={evaluation.totalViewersMillions}
          />
        </aside>
      </div>

      {/* Bottom Telemetry Stream & Hint Assistant */}
      <footer className="ws1-bottom-dock">
        <SystemLog logs={logs} />
        <HintPanel hintsUsed={hintsUsed} onUnlockHint={handleUnlockHint} />
      </footer>

      {/* Developer / Organizer Diagnostic Drawer */}
      <DebugDrawer
        isOpen={debugOpen}
        onClose={() => setDebugOpen(false)}
        onSkipModuleA={() => {
          setIsModuleACompleted(true);
          setCurrentModule("B");
          addLog("[DEV] MODULE A SKIPPED", "warn");
        }}
        onAutoBalanceB={() => {
          setIsModuleACompleted(true);
          setCurrentModule("B");
          handleApplyOptimalDistribution();
          addLog("[DEV] AUTO-BALANCED CDN TRAFFIC APPLIED", "warn");
        }}
        onAutoOptimizeC={() => {
          setIsModuleACompleted(true);
          setIsModuleBCompleted(true);
          setCurrentModule("C");
          handleApplyOptimalDistribution();
          setSelectedBitrateId("BALANCED");
          setSelectedBufferId("BALANCED_LIVE");
          setSelectedPacketLossId("CMAF_FEC");
          addLog("[DEV] AUTO-OPTIMIZED MODULE C PARAMS", "warn");
        }}
        onSetTimer={(sec) => {
          setTimeRemaining(sec);
          setStartTimestamp(Date.now() - (station1Config.totalDurationSeconds - sec) * 1000);
          addLog(`[DEV] SHIFT TIMER ADJUSTED TO ${sec}s`, "warn");
        }}
        onTriggerSuccess={() => {
          setIsCompleted(true);
          addLog("[DEV] SUCCESS SCREEN FORCED", "warn");
        }}
        onTriggerTimeout={() => {
          setIsTimedOut(true);
          addLog("[DEV] TIMEOUT SCREEN FORCED", "warn");
        }}
        onResetStation={handleResetEntireStation}
        currentModule={currentModule}
        timeRemaining={timeRemaining}
        score={scoreData.totalScore}
      />

      {/* Operational Leaderboard & Winners Modal */}
      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        currentOperator={operatorName}
      />
    </div>
  );
}
