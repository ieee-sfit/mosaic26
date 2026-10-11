import { useState, useEffect } from "react";
import {
  fetchGameResults,
  clearAllResults,
  downloadResultsAsJSON,
} from "../utils/resultsManager";

export default function LeaderboardModal({ isOpen, onClose, currentOperator = "" }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchGameResults();
      setResults(data);
    } catch (err) {
      console.error("[Station 1 Leaderboard] Error fetching results:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      setLoading(true);
      fetchGameResults().then((data) => {
        if (!ignore) {
          setResults(data || []);
          setLoading(false);
          setConfirmClear(false);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const winner = results.length > 0 ? results[0] : null;

  const handleClear = async () => {
    await clearAllResults();
    setResults([]);
    setConfirmClear(false);
  };

  const handleDownload = () => {
    downloadResultsAsJSON(results);
  };

  const formatRemaining = (seconds) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return String(isoString);
    }
  };

  return (
    <div
      className="ws1-modal-backdrop ws1-leaderboard-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ws1-lb-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="ws1-leaderboard-card">
        {/* Header */}
        <div className="ws1-lb-header">
          <div className="ws1-lb-header-text">
            <div className="ws1-lb-badge-strip">
              <span className="ws1-lb-badge">STATION 01 // PIT WALL ARCHIVES</span>
              <span className="ws1-badge-pill ws1-pill-blue">FORD MOTOR CO.</span>
              <span className="ws1-badge-pill ws1-pill-red">SCUDERIA FERRARI</span>
            </div>
            <h2 id="ws1-lb-title" className="ws1-lb-title">
              WORLD FEED SPEED & SCORE LEADERBOARD
            </h2>
            <p className="ws1-lb-subtitle">
              Live broadcast engineering performance saved to:{" "}
              <code>src/workstation1/results.json</code>
            </p>
          </div>

          <button
            type="button"
            className="ws1-lb-close-btn"
            onClick={onClose}
            aria-label="Close leaderboard modal"
            id="ws1-leaderboard-close-btn"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Winner Highlight Card (Pole Position) */}
        {winner && (
          <div className="ws1-lb-podium-card">
            <div className="ws1-lb-podium-left">
              <div className="ws1-lb-trophy-circle" aria-hidden="true">
                🏆
              </div>
              <div className="ws1-lb-podium-info">
                <span className="ws1-lb-podium-tag">
                  🏁 POLE POSITION // CURRENT #1 RACE ENGINEER
                </span>
                <h3 className="ws1-lb-winner-name">
                  {winner.operator || winner.playerName || "Pit Wall Crew"}
                </h3>
                <span className="ws1-lb-winner-time">
                  Recorded on {formatDate(winner.timestamp)}
                </span>
              </div>
            </div>

            <div className="ws1-lb-podium-stats">
              <div className="ws1-lb-podium-stat">
                <span className="ws1-stat-kpi-label">SCORE</span>
                <span className="ws1-stat-kpi-value ws1-text-green">
                  {winner.score} <span className="ws1-stat-sub">/ 100</span>
                </span>
              </div>

              <div className="ws1-lb-podium-stat">
                <span className="ws1-stat-kpi-label">STREAM LATENCY</span>
                <span className="ws1-stat-kpi-value ws1-text-cyan">
                  {typeof winner.finalLatency === "number"
                    ? `${winner.finalLatency.toFixed(2)}s`
                    : "< 1.50s"}
                </span>
              </div>

              <div className="ws1-lb-podium-stat">
                <span className="ws1-stat-kpi-label">TIME REMAINING</span>
                <span className="ws1-stat-kpi-value">
                  {formatRemaining(winner.timeRemainingSeconds ?? winner.timeRemaining)}
                </span>
              </div>

              <div className="ws1-lb-podium-stat">
                <span className="ws1-stat-kpi-label">ERRORS</span>
                <span
                  className={`ws1-stat-kpi-value ${
                    winner.errors > 0 ? "ws1-text-red" : "ws1-text-green"
                  }`}
                >
                  {winner.errors ?? 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Table Body */}
        <div className="ws1-lb-table-container">
          {loading ? (
            <div className="ws1-lb-empty-state">
              <div className="ws1-loading-spinner" aria-hidden="true" />
              <p>Fetching telemetry archives from pit wall server...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="ws1-lb-empty-state">
              <span className="ws1-empty-icon" aria-hidden="true">⏱</span>
              <p className="ws1-empty-main">NO RACE ARCHIVES FOUND</p>
              <p className="ws1-empty-sub">
                Complete an F1 broadcast engineering shift to claim pole position on the leaderboard!
              </p>
            </div>
          ) : (
            <table className="ws1-lb-table">
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>GRID POS</th>
                  <th>ENGINEERING CREW / CALLSIGN</th>
                  <th style={{ textAlign: "center" }}>STATUS</th>
                  <th style={{ textAlign: "right" }}>FINAL LATENCY</th>
                  <th style={{ textAlign: "right" }}>SCORE</th>
                  <th style={{ textAlign: "right" }}>TIME LEFT</th>
                  <th style={{ textAlign: "right" }}>ERRORS</th>
                  <th style={{ textAlign: "right" }}>HINTS</th>
                  <th style={{ textAlign: "right" }}>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => {
                  const isFirst = idx === 0;
                  const isSecond = idx === 1;
                  const isThird = idx === 2;
                  const crewName = r.operator || r.playerName || "Pit Wall Crew";
                  const isCurrent =
                    Boolean(currentOperator) &&
                    crewName.toLowerCase() === currentOperator.toLowerCase();

                  const isComplete = r.completed === true || r.status === "COMPLETED";

                  return (
                    <tr
                      key={r.id || idx}
                      className={`${isFirst ? "ws1-row-p1" : ""} ${
                        isCurrent ? "ws1-row-current" : ""
                      }`}
                    >
                      <td className="ws1-col-pos">
                        {isFirst && <span className="ws1-badge-gold">🥇 P1</span>}
                        {isSecond && <span className="ws1-badge-silver">🥈 P2</span>}
                        {isThird && <span className="ws1-badge-bronze">🥉 P3</span>}
                        {!isFirst && !isSecond && !isThird && (
                          <span className="ws1-pos-standard">P{idx + 1}</span>
                        )}
                      </td>

                      <td className="ws1-col-crew">
                        <span className="ws1-crew-name">{crewName}</span>
                        {isCurrent && <span className="ws1-you-pill">YOU</span>}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`ws1-status-pill-small ${
                            isComplete ? "ws1-pill-green" : "ws1-pill-red"
                          }`}
                        >
                          {isComplete ? "● RESTORED" : "✕ TIMEOUT"}
                        </span>
                      </td>

                      <td style={{ textAlign: "right" }} className="ws1-col-mono ws1-text-cyan">
                        {typeof r.finalLatency === "number"
                          ? `${r.finalLatency.toFixed(2)}s`
                          : "—"}
                      </td>

                      <td style={{ textAlign: "right" }} className="ws1-col-score">
                        <span className="ws1-score-val">{r.score ?? 0}</span>
                        <span className="ws1-score-max">/100</span>
                      </td>

                      <td style={{ textAlign: "right" }} className="ws1-col-mono">
                        {formatRemaining(r.timeRemainingSeconds ?? r.timeRemaining)}
                      </td>

                      <td
                        style={{ textAlign: "right" }}
                        className={r.errors > 0 ? "ws1-text-red" : "ws1-text-green"}
                      >
                        {r.errors ?? 0}
                      </td>

                      <td style={{ textAlign: "right", color: "var(--ws1-text-muted)" }}>
                        {r.hintsUsedCount ??
                          (Array.isArray(r.hintsUsed) ? r.hintsUsed.length : 0)}
                      </td>

                      <td style={{ textAlign: "right", color: "var(--ws1-text-muted)" }}>
                        {formatDate(r.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="ws1-lb-footer">
          <div className="ws1-lb-footer-left">
            <button
              type="button"
              className="ws1-btn-download"
              onClick={handleDownload}
              disabled={results.length === 0}
              id="ws1-lb-export-btn"
            >
              📥 EXPORT results.json
            </button>
            <button
              type="button"
              className="ws1-btn-refresh"
              onClick={loadData}
              id="ws1-lb-refresh-btn"
            >
              🔄 REFRESH
            </button>
          </div>

          <div className="ws1-lb-footer-right">
            {!confirmClear ? (
              <button
                type="button"
                className="ws1-btn-clear"
                onClick={() => setConfirmClear(true)}
                disabled={results.length === 0}
                id="ws1-lb-reset-btn"
              >
                RESET HISTORY
              </button>
            ) : (
              <div className="ws1-lb-confirm-box">
                <span className="ws1-confirm-text">CONFIRM RESET?</span>
                <button
                  type="button"
                  className="ws1-btn-clear-confirm"
                  onClick={handleClear}
                >
                  YES, CLEAR
                </button>
                <button
                  type="button"
                  className="ws1-btn-refresh"
                  onClick={() => setConfirmClear(false)}
                >
                  CANCEL
                </button>
              </div>
            )}

            <button
              type="button"
              className="ws1-primary-complete-btn ws1-lb-done-btn"
              onClick={onClose}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
