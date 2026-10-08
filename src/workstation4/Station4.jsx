import { useState, useEffect, useRef, useCallback } from "react";
import StationHeader from "./components/StationHeader";
import ModuleProgress from "./components/ModuleProgress";
import ModuleA from "./components/ModuleA";
import ModuleB from "./components/ModuleB";
import ModuleC from "./components/ModuleC";
import OutputStatusPanel from "./components/OutputStatusPanel";
import SystemLog from "./components/SystemLog";
import HintPanel from "./components/HintPanel";
import StartScreen from "./components/StartScreen";
import SuccessScreen from "./components/SuccessScreen";
import FailureScreen from "./components/FailureScreen";
import DebugDrawer from "./components/DebugDrawer";

import { stationConfig } from "./config/stationConfig";
import { circuitConfig } from "./config/circuitConfig";
import { evaluateCircuit } from "./utils/logicSimulator";
import { validateCircuit } from "./utils/circuitValidator";
import { calculateScore } from "./utils/scoreCalculator";
import { updateStationResult } from "./utils/stationResult";
import {
  saveStationState,
  loadStationState,
  clearStationState,
  hasSavedShift,
} from "./utils/storage";

import "./station4.css";

export default function Station4() {
  // 1. Shift lifecycle states
  const [shiftStarted, setShiftStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [resumePromptVisible, setResumePromptVisible] = useState(() => hasSavedShift());
  const [debugOpen, setDebugOpen] = useState(false);

  // 2. Timer states (Timestamp-driven)
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(stationConfig.totalDurationSeconds);
  const timerIntervalRef = useRef(null);

  // 3. Navigation
  const [currentModule, setCurrentModule] = useState("A"); // "A" | "B" | "C"

  // 4. Questions & verification
  const [moduleAAnswers, setModuleAAnswers] = useState({});
  const [moduleBAnswers, setModuleBAnswers] = useState({});
  const [moduleCAnswers, setModuleCAnswers] = useState({});
  const [isModuleACompleted, setIsModuleACompleted] = useState(false);
  const [isModuleBCompleted, setIsModuleBCompleted] = useState(false);

  // 5. Circuit states (Module B)
  const [circuitInputs, setCircuitInputs] = useState(() => {
    const init = {};
    circuitConfig.inputs.forEach((inp) => {
      init[inp.id] = inp.initial;
    });
    return init;
  });
  const [slotBGateType, setSlotBGateType] = useState("OR"); // Initial intentional fault
  const [isCircuitSolved, setIsCircuitSolved] = useState(false);
  const [wrongGateAttempts, setWrongGateAttempts] = useState(0);

  // 6. Module C states
  const [toleranceValues, setToleranceValues] = useState(() => {
    const init = {};
    Object.keys(stationConfig.tolerance).forEach((key) => {
      init[key] = stationConfig.tolerance[key].initial;
    });
    return init;
  });
  const [isBypassActive, setIsBypassActive] = useState(false);
  const [bypassTriggeredCount, setBypassTriggeredCount] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [wrongCodeAttempts, setWrongCodeAttempts] = useState(0);

  // 7. Scoring, errors & hints
  const [errors, setErrors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState([]);

  // 8. System logs
  const [logs, setLogs] = useState(() => [
    {
      id: "log_init",
      time: new Date().toLocaleTimeString("en-GB"),
      message: "SYSTEM INITIALIZED // AREA 51 INTERLOCK CONSOLE READY",
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

  // Compute live circuit state
  const currentCircuitEval = evaluateCircuit(circuitInputs, slotBGateType);
  const currentCircuitValidation = validateCircuit(circuitInputs, slotBGateType);

  // Check if all tolerance parameters are within safe limits
  const allTolerancesSafe = Object.keys(stationConfig.tolerance).every((key) => {
    const cfg = stationConfig.tolerance[key];
    const val = toleranceValues[key] ?? cfg.initial;
    return val >= cfg.min && val <= cfg.max;
  });

  // Calculate live score
  const scoreData = calculateScore({
    moduleAAnswers,
    circuitSolved: isCircuitSolved,
    moduleBAnswers,
    tolerancesSafe: allTolerancesSafe,
    bypassTriggered: bypassTriggeredCount > 0,
    authorized: isAuthorized,
    moduleCAnswers,
    hintsUsed,
    errors,
    wrongGateAttempts,
    wrongCodeAttempts,
  });

  // Synchronize global result export
  useEffect(() => {
    updateStationResult(
      {
        isCompleted,
        errors,
        hintsUsed,
      },
      scoreData,
      timeRemaining
    );
  }, [scoreData, isCompleted, timeRemaining, errors, hintsUsed]);

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
      if (saved.circuitInputs) setCircuitInputs(saved.circuitInputs);
      if (saved.slotBGateType) setSlotBGateType(saved.slotBGateType);
      setIsCircuitSolved(Boolean(saved.isCircuitSolved));
      if (saved.toleranceValues) setToleranceValues(saved.toleranceValues);
      setIsBypassActive(Boolean(saved.isBypassActive));
      setBypassTriggeredCount(saved.bypassTriggeredCount || 0);
      setIsAuthorized(Boolean(saved.isAuthorized));
      setErrors(saved.errors || 0);
      setHintsUsed(saved.hintsUsed || []);
      setWrongGateAttempts(saved.wrongGateAttempts || 0);
      setWrongCodeAttempts(saved.wrongCodeAttempts || 0);
      if (saved.logs && Array.isArray(saved.logs)) setLogs(saved.logs);

      // Recalculate remaining time from timestamp
      const elapsed = Math.floor((Date.now() - saved.startTimestamp) / 1000);
      const remaining = Math.max(0, stationConfig.totalDurationSeconds - elapsed);
      setTimeRemaining(remaining);

      addLog("SESSION RESTORED FROM LOCAL RECOVERY CACHE", "info");
    }
    setResumePromptVisible(false);
  };

  const handleRestartShift = () => {
    clearStationState();
    setResumePromptVisible(false);
  };

  // --------------------------------------------------------------------------
  // TIMER (Timestamp-driven to prevent drift)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!shiftStarted || isCompleted || isTimedOut) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const interval = setInterval(() => {
      if (!startTimestamp) return;
      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
      const remaining = stationConfig.totalDurationSeconds - elapsedSeconds;

      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsTimedOut(true);
        clearInterval(interval);
        addLog("CRITICAL: 12:00 SHIFT TIMEOUT EXPIRED // FAIL-SAFE DEFAULT ACTIVE", "error");
      } else {
        setTimeRemaining(remaining);
      }
    }, 250);

    timerIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [shiftStarted, startTimestamp, isCompleted, isTimedOut, addLog]);

  // --------------------------------------------------------------------------
  // LOCAL STORAGE STATE PERSISTENCE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!shiftStarted) return;
    saveStationState({
      shiftStarted,
      startTimestamp,
      currentModule,
      moduleAAnswers,
      moduleBAnswers,
      moduleCAnswers,
      isModuleACompleted,
      isModuleBCompleted,
      circuitInputs,
      slotBGateType,
      isCircuitSolved,
      toleranceValues,
      isBypassActive,
      bypassTriggeredCount,
      isAuthorized,
      errors,
      hintsUsed,
      wrongGateAttempts,
      wrongCodeAttempts,
      isCompleted,
      isTimedOut,
      timeRemaining,
      logs: logs.slice(0, 30),
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
    circuitInputs,
    slotBGateType,
    isCircuitSolved,
    toleranceValues,
    isBypassActive,
    bypassTriggeredCount,
    isAuthorized,
    errors,
    hintsUsed,
    wrongGateAttempts,
    wrongCodeAttempts,
    isCompleted,
    isTimedOut,
    timeRemaining,
    logs,
  ]);

  // --------------------------------------------------------------------------
  // DEBUG MODE KEYBOARD SHORTCUT (Ctrl + Shift + D)
  // --------------------------------------------------------------------------
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
  // EVENT HANDLERS
  // --------------------------------------------------------------------------

  const handleStartShift = () => {
    const now = Date.now();
    setStartTimestamp(now);
    setShiftStarted(true);
    setTimeRemaining(stationConfig.totalDurationSeconds);
    addLog("SHIFT INITIALIZED // 12:00 COUNTDOWN RUNNING", "info");
    addLog("MODULE A ACTIVATED: SYSTEM KNOWLEDGE CHECK", "info");
  };

  // Module A answer submission
  const handleSubmitModuleAAnswer = ({ questionId, selectedKey, isCorrect }) => {
    setModuleAAnswers((prev) => {
      const existing = prev[questionId] || { wrongAttempts: 0 };
      return {
        ...prev,
        [questionId]: {
          selectedKey,
          isCorrect,
          wrongAttempts: isCorrect ? existing.wrongAttempts : existing.wrongAttempts + 1,
          answeredAt: Date.now(),
        },
      };
    });

    if (isCorrect) {
      addLog(`MODULE A: ${questionId} ANSWER [${selectedKey}] VERIFIED CORRECT`, "success");
    } else {
      setErrors((prev) => prev + 1);
      addLog(`MODULE A: ${questionId} ANSWER [${selectedKey}] INCORRECT`, "warn");
    }
  };

  const handleCompleteModuleA = () => {
    setIsModuleACompleted(true);
    setCurrentModule("B");
    addLog("MODULE A KNOWLEDGE CHECK PASSED // PROCEEDING TO MODULE B", "success");
    addLog("MODULE B ACTIVATED: EMERGENCY INTERLOCK SCHEMATIC LOADED", "info");
  };

  // Module B circuit handlers
  const handleToggleCircuitInput = (inputId) => {
    setCircuitInputs((prev) => {
      const nextVal = prev[inputId] ? 0 : 1;
      const updated = { ...prev, [inputId]: nextVal };
      addLog(`INPUT ${inputId} TOGGLED TO ${nextVal ? "HIGH (1)" : "LOW (0)"}`, "info");
      return updated;
    });
  };

  const handleChangeSlotBGate = (newGateType) => {
    setSlotBGateType(newGateType);
    if (newGateType === "AND") {
      addLog("GATE 02 INSTALLED: AND GATE CONNECTED", "info");
    } else {
      setWrongGateAttempts((prev) => prev + 1);
      setErrors((prev) => prev + 1);
      addLog(`GATE 02 REPLACED WITH ${newGateType} // LOGIC FAILURE DETECTED`, "warn");
    }
  };

  const handleVerifyCircuit = () => {
    if (currentCircuitValidation.isValid) {
      setIsCircuitSolved(true);
      addLog("LOGIC INTEGRITY VERIFIED // SAFE OUTPUT = HIGH (1)", "success");
    } else {
      setErrors((prev) => prev + 1);
      addLog(`CIRCUIT VERIFICATION FAILED: ${currentCircuitValidation.message}`, "error");
    }
  };

  const handleSubmitModuleBAnswer = ({ questionId, selectedKey, isCorrect }) => {
    setModuleBAnswers((prev) => {
      const existing = prev[questionId] || { wrongAttempts: 0 };
      return {
        ...prev,
        [questionId]: {
          selectedKey,
          isCorrect,
          wrongAttempts: isCorrect ? existing.wrongAttempts : existing.wrongAttempts + 1,
          answeredAt: Date.now(),
        },
      };
    });

    if (isCorrect) {
      addLog(`MODULE B: VERIFICATION QUESTION VERIFIED CORRECT`, "success");
    } else {
      setErrors((prev) => prev + 1);
      addLog(`MODULE B: VERIFICATION QUESTION INCORRECT`, "warn");
    }
  };

  const handleCompleteModuleB = () => {
    setIsModuleBCompleted(true);
    setCurrentModule("C");
    addLog("MODULE B COMPLETED // PROCEEDING TO MODULE C AUTHORIZATION", "success");
    addLog("MODULE C ACTIVATED: TOLERANCE MATRIX & CLEARANCE KEYPAD ONLINE", "info");
  };

  // Module C tolerance handlers
  const handleChangeTolerance = (paramId, value) => {
    setToleranceValues((prev) => ({
      ...prev,
      [paramId]: value,
    }));
  };

  const handleToggleBypass = () => {
    setIsBypassActive((prev) => {
      const next = !prev;
      if (next) {
        setBypassTriggeredCount((c) => c + 1);
        setErrors((e) => e + 1);
        addLog("WARNING: EMERGENCY SAFETY BYPASS ENGAGED // SAFE OUTPUT FORCED LOW", "error");
      } else {
        addLog("EMERGENCY SAFETY BYPASS DISENGAGED // FAIL-SAFE RESUMED", "info");
      }
      return next;
    });
  };

  const handleAuthorized = () => {
    setIsAuthorized(true);
    addLog("CLEARANCE CODE 1947 VERIFIED // AUTHORIZATION ACCEPTED", "success");
  };

  const handleFailedAuthAttempt = () => {
    setWrongCodeAttempts((prev) => prev + 1);
    setErrors((prev) => prev + 1);
    addLog("SECURITY KEYPAD: INVALID AUTHORIZATION CODE REJECTED", "warn");
  };

  const handleSubmitModuleCAnswer = ({ questionId, selectedKey, isCorrect }) => {
    setModuleCAnswers((prev) => {
      const existing = prev[questionId] || { wrongAttempts: 0 };
      return {
        ...prev,
        [questionId]: {
          selectedKey,
          isCorrect,
          wrongAttempts: isCorrect ? existing.wrongAttempts : existing.wrongAttempts + 1,
          answeredAt: Date.now(),
        },
      };
    });

    if (isCorrect) {
      addLog(`MODULE C: ${questionId} QUESTION VERIFIED CORRECT`, "success");
    } else {
      setErrors((prev) => prev + 1);
      addLog(`MODULE C: ${questionId} QUESTION INCORRECT`, "warn");
    }
  };

  const handleTriggerFinalAuthorization = () => {
    setIsCompleted(true);
    addLog("ALL SYSTEMS NOMINAL // FACILITY AUTHORIZATION GRANTED", "success");
  };

  const handleRestartStation = () => {
    clearStationState();
    setIsCompleted(false);
    setIsTimedOut(false);
    setShiftStarted(false);
    setStartTimestamp(null);
    setTimeRemaining(stationConfig.totalDurationSeconds);
    setCurrentModule("A");
    setModuleAAnswers({});
    setModuleBAnswers({});
    setModuleCAnswers({});
    setIsModuleACompleted(false);
    setIsModuleBCompleted(false);
    setSlotBGateType("OR");
    setIsCircuitSolved(false);
    setToleranceValues(() => {
      const init = {};
      Object.keys(stationConfig.tolerance).forEach((key) => {
        init[key] = stationConfig.tolerance[key].initial;
      });
      return init;
    });
    setIsBypassActive(false);
    setIsAuthorized(false);
    setErrors(0);
    setHintsUsed([]);
    setWrongGateAttempts(0);
    setWrongCodeAttempts(0);
    addLog("WORKSTATION RESET TO DEFAULT STATE", "info");
  };

  const handleUnlockHint = (hintId) => {
    if (!hintsUsed.includes(hintId)) {
      setHintsUsed((prev) => [...prev, hintId]);
      addLog(`ADVISORY HINT ${hintId} UNLOCKED`, "warn");
    }
  };

  // --------------------------------------------------------------------------
  // DEBUG HELPER ACTIONS
  // --------------------------------------------------------------------------
  const debugActions = {
        skipModuleA: () => {
      setModuleAAnswers({
        q_mod_a_1: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
        q_mod_a_2: { selectedKey: "D", isCorrect: true, wrongAttempts: 0 },
        q_mod_a_3: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
        q_mod_a_4: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
        q_mod_a_5: { selectedKey: "C", isCorrect: true, wrongAttempts: 0 },
      });
      setIsModuleACompleted(true);
      setCurrentModule("B");
      addLog("[DEBUG] MODULE A SKIPPED", "info");
    },
    autoSolveCircuit: () => {
      setSlotBGateType("AND");
      setCircuitInputs({
        DOOR_LOCKED: 1,
        FIRE_CLEAR: 1,
        POWER_STABLE: 1,
        SECURITY_AUTHORIZED: 1,
      });
      setIsCircuitSolved(true);
      setModuleBAnswers({
        q_mod_b_1: { selectedKey: "A", isCorrect: true, wrongAttempts: 0 },
      });
      setIsModuleBCompleted(true);
      setCurrentModule("C");
      addLog("[DEBUG] CIRCUIT SOLVED WITH AND GATE & INPUTS SET TO 1", "info");
    },
        setAllTolerancesSafe: () => {
      setToleranceValues({
        powerStability: 97,
        temperature: 35,
        doorPressure: 90,
        securitySignal: 98,
      });
      setIsBypassActive(false);
      setIsAuthorized(true);
      setModuleCAnswers({
        q_mod_c_1: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
        q_mod_c_2: { selectedKey: "C", isCorrect: true, wrongAttempts: 0 },
        q_mod_c_3: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
        q_mod_c_4: { selectedKey: "A", isCorrect: true, wrongAttempts: 0 },
        q_mod_c_5: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
        q_mod_c_6: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
        q_mod_c_7: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
        q_mod_c_8: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
        q_mod_c_9: { selectedKey: "B", isCorrect: true, wrongAttempts: 0 },
      });
      addLog("[DEBUG] TOLERANCES SET TO SAFE SPEC & PASSCODE AUTHORIZED", "info");
    },
    resetTimer: () => {
      setStartTimestamp(Date.now());
      setTimeRemaining(stationConfig.totalDurationSeconds);
      addLog("[DEBUG] TIMER RESET TO 12:00", "info");
    },
    setTimerShort: () => {
      const newStart = Date.now() - (stationConfig.totalDurationSeconds - 10) * 1000;
      setStartTimestamp(newStart);
      setTimeRemaining(10);
      addLog("[DEBUG] TIMER SET TO 10 SECONDS", "warn");
    },
    toggleBypass: handleToggleBypass,
    triggerWrongPasscode: handleFailedAuthAttempt,
    triggerSuccess: () => {
      setIsCompleted(true);
      addLog("[DEBUG] FORCED SUCCESS SCREEN", "success");
    },
    triggerTimeout: () => {
      setIsTimedOut(true);
      setTimeRemaining(0);
      addLog("[DEBUG] FORCED TIMEOUT SCREEN", "error");
    },
    resetStorage: () => {
      clearStationState();
      addLog("[DEBUG] LOCALSTORAGE CLEARED", "info");
    },
  };

  // Count modules completed for failure screen
  const modulesCompletedCount =
    (isModuleACompleted ? 1 : 0) +
    (isModuleBCompleted ? 1 : 0) +
    (isCompleted ? 1 : 0);

  return (
    <div className="ws4-shell" id="ws4-root">
      {/* Station Header */}
      <StationHeader
        timeRemaining={timeRemaining}
        isCritical={timeRemaining < 120 || isBypassActive}
        systemStatus={
          isTimedOut
            ? "TIMEOUT"
            : isCompleted
            ? "AUTHORIZED"
            : isBypassActive
            ? "BYPASS ACTIVE"
            : shiftStarted
            ? "ACTIVE"
            : "STANDBY"
        }
        onDebugClick={() => setDebugOpen(true)}
      />

      {/* Main 3-Column Industrial Layout */}
      <main className="ws4-main-grid">
        {/* Left Column: Mission Progress & Hints */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <ModuleProgress
            currentModule={currentModule}
            moduleACompleted={isModuleACompleted}
            moduleBCompleted={isModuleBCompleted}
            moduleCCompleted={isCompleted}
            score={scoreData.totalScore}
            errors={errors}
            onSelectModule={(modId) => setCurrentModule(modId)}
          />

          <HintPanel
            hintsUsed={hintsUsed}
            onUnlockHint={handleUnlockHint}
          />
        </div>

        {/* Center Column: Current Active Module */}
        {currentModule === "A" && (
          <ModuleA
            moduleAnswers={moduleAAnswers}
            onSubmitAnswer={handleSubmitModuleAAnswer}
            onModuleCompleted={handleCompleteModuleA}
          />
        )}

        {currentModule === "B" && (
          <ModuleB
            inputs={circuitInputs}
            onToggleInput={handleToggleCircuitInput}
            slotBGateType={slotBGateType}
            onChangeSlotBGate={handleChangeSlotBGate}
            onCircuitVerified={handleVerifyCircuit}
            isCircuitSolved={isCircuitSolved}
            moduleAnswers={moduleBAnswers}
            onSubmitAnswer={handleSubmitModuleBAnswer}
            onModuleCompleted={handleCompleteModuleB}
            isCompleted={isModuleBCompleted}
            isBypassActive={isBypassActive}
          />
        )}

        {currentModule === "C" && (
          <ModuleC
            toleranceValues={toleranceValues}
            onChangeTolerance={handleChangeTolerance}
            allTolerancesSafe={allTolerancesSafe}
            isBypassActive={isBypassActive}
            onToggleBypass={handleToggleBypass}
            isAuthorized={isAuthorized}
            onAuthorized={handleAuthorized}
            onFailedAuthAttempt={handleFailedAuthAttempt}
            moduleAnswers={moduleCAnswers}
            onSubmitAnswer={handleSubmitModuleCAnswer}
            isModuleACompleted={isModuleACompleted}
            isCircuitSolved={isCircuitSolved}
            safeOutput={currentCircuitEval.safeOutput}
            onTriggerFinalAuthorization={handleTriggerFinalAuthorization}
          />
        )}

        {/* Right Column: Live Telemetry Status Panel */}
        <OutputStatusPanel
          inputs={circuitInputs}
          safeOutput={currentCircuitEval.safeOutput}
          isCircuitValid={currentCircuitValidation.isValid}
          isBypassActive={isBypassActive}
          allTolerancesSafe={allTolerancesSafe}
        />

        {/* Bottom Panel: Live Terminal Event Log */}
        <SystemLog logs={logs} />
      </main>

      {/* Start Screen Briefing Modal */}
      {!shiftStarted && !resumePromptVisible && (
        <StartScreen onStartShift={handleStartShift} />
      )}

      {/* Refresh Recovery Modal */}
      {resumePromptVisible && (
        <div className="ws4-fullscreen-overlay">
          <div className="ws4-recovery-modal">
            <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--ws4-cyan-accent)" }}>
              RESUME CURRENT SHIFT?
            </div>
            <div style={{ fontSize: "12px", color: "#c4d1e2", lineHeight: "1.5" }}>
              Active station progress was detected in local storage. Would you like to resume
              the current shift or restart from the beginning?
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                className="ws4-btn ws4-btn-primary"
                onClick={handleResumeShift}
                id="ws4-resume-shift-btn"
              >
                [ RESUME SHIFT ]
              </button>
              <button
                type="button"
                className="ws4-btn ws4-btn-danger"
                onClick={handleRestartShift}
                id="ws4-restart-fresh-btn"
              >
                [ RESTART FRESH ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isCompleted && (
        <SuccessScreen
          score={scoreData.totalScore}
          timeRemaining={timeRemaining}
          errors={errors}
          hintsUsedCount={hintsUsed.length}
          onCompleteStation={handleRestartStation}
        />
      )}

      {/* Timeout / Failure Modal */}
      {isTimedOut && !isCompleted && (
        <FailureScreen
          score={scoreData.totalScore}
          modulesCompletedCount={modulesCompletedCount}
          errors={errors}
          timeUsedSeconds={stationConfig.totalDurationSeconds - timeRemaining}
          onRestartStation={handleRestartStation}
        />
      )}

      {/* Developer Debug Drawer (Ctrl + Shift + D) */}
      <DebugDrawer
        isOpen={debugOpen}
        onClose={() => setDebugOpen(false)}
        onSkipModuleA={debugActions.skipModuleA}
        onResetTimer={debugActions.resetTimer}
        onSetTimerShort={debugActions.setTimerShort}
        onAutoSolveCircuit={debugActions.autoSolveCircuit}
        onSetAllTolerancesSafe={debugActions.setAllTolerancesSafe}
        onToggleBypass={debugActions.toggleBypass}
        onTriggerWrongPasscode={debugActions.triggerWrongPasscode}
        onTriggerSuccess={debugActions.triggerSuccess}
        onTriggerTimeout={debugActions.triggerTimeout}
        onResetStorage={debugActions.resetStorage}
      />
    </div>
  );
}
