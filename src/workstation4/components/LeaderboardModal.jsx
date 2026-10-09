import { useState, useEffect } from "react";
import {
  fetchGameResults,
  clearAllResults,
  downloadResultsAsJSON,
} from "../utils/resultsManager";

export default function LeaderboardModal({ isOpen, onClose }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchGameResults();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      fetchGameResults().then((data) => {
        if (!ignore) {
          setResults(data);
          setLoading(false);
          setConfirmClear(false);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen]);

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

  return (
    <div className="ws4-fullscreen-overlay" style={{ zIndex: 1100 }}>
      <div
        className="ws4-screen-card"
        style={{
          maxWidth: "860px",
          width: "95%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          textAlign: "left",
          gap: "14px",
          padding: "24px",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="ws4-screen-badge" style={{ color: "var(--ws4-cyan-accent)" }}>
              STATION 04 // OPERATIONAL ARCHIVES
            </div>
            <h2
              className="ws4-screen-title"
              style={{ fontSize: "22px", marginTop: "4px", color: "#fff" }}
            >
              MISSION LEADERBOARD & WINNERS
            </h2>
            <div style={{ fontSize: "11px", color: "var(--ws4-text-secondary)", marginTop: "2px" }}>
              Records saved to: <code style={{ color: "var(--ws4-cyan-accent)" }}>src/workstation4/results.json</code>
            </div>
          </div>

          <button
            type="button"
            className="ws4-btn ws4-btn-secondary"
            onClick={onClose}
            style={{ fontSize: "12px", padding: "6px 14px" }}
          >
            [ CLOSE ✕ ]
          </button>
        </div>

        <div className="ws4-divider" />

        {/* Winner Highlight Card */}
        {winner && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255, 176, 32, 0.12) 0%, rgba(0, 255, 127, 0.08) 100%)",
              border: "2px solid #ffb020",
              borderRadius: "6px",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 0 25px rgba(255, 176, 32, 0.25)",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  fontSize: "36px",
                  lineHeight: "1",
                  background: "rgba(255, 176, 32, 0.2)",
                  padding: "10px",
                  borderRadius: "50%",
                  border: "1px solid #ffb020",
                }}
              >
                🏆
              </div>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    color: "var(--ws4-amber-warn)",
                    letterSpacing: "2px",
                  }}
                >
                  CURRENT 1ST PLACE WINNER
                </div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#fff", marginTop: "2px" }}>
                  {winner.playerName || "Operator Alpha"}
                </div>
                <div style={{ fontSize: "11px", color: "#8b9bb4" }}>
                  Achieved on {winner.formattedDate || new Date(winner.timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: "var(--ws4-text-secondary)" }}>WINNING SCORE</div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--ws4-neon-green)" }}>
                  {winner.score} <span style={{ fontSize: "12px", color: "#8b9bb4" }}>/100</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: "var(--ws4-text-secondary)" }}>TIME REMAINING</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--ws4-cyan-accent)" }}>
                  {winner.timeRemainingFormatted || `${winner.timeRemainingSeconds}s`}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: "var(--ws4-text-secondary)" }}>ERRORS</div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: winner.errors > 0 ? "var(--ws4-crimson-alert)" : "var(--ws4-neon-green)",
                  }}
                >
                  {winner.errors}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Table Section */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            border: "1px solid var(--ws4-border-subtle)",
            borderRadius: "4px",
            background: "#070a0e",
            minHeight: "180px",
          }}
        >
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#8b9bb4", fontSize: "13px" }}>
              Loading leaderboard data...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>📊</div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#fff" }}>
                NO GAME SESSIONS RECORDED YET
              </div>
              <div style={{ fontSize: "12px", color: "#8b9bb4", marginTop: "4px" }}>
                Complete a shift to record results in <code>results.json</code> and crown the first winner!
              </div>
            </div>
          ) : (
            <table
              className="ws4-results-table"
              style={{
                width: "100%",
                margin: 0,
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#0d131b",
                    borderBottom: "2px solid var(--ws4-border-bright)",
                    color: "var(--ws4-text-secondary)",
                    fontSize: "11px",
                    textAlign: "left",
                    letterSpacing: "1px",
                  }}
                >
                  <th style={{ padding: "10px 14px", width: "70px" }}>RANK</th>
                  <th style={{ padding: "10px 14px" }}>OPERATOR / TEAM</th>
                  <th style={{ padding: "10px 14px", textAlign: "center" }}>STATUS</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>SCORE</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>TIME LEFT</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>ERRORS</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>HINTS</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => {
                  const isFirst = idx === 0;
                  const isSecond = idx === 1;
                  const isThird = idx === 2;

                  return (
                    <tr
                      key={r.id || idx}
                      style={{
                        background: isFirst
                          ? "rgba(255, 176, 32, 0.08)"
                          : idx % 2 === 0
                          ? "#070a0e"
                          : "#0a0e14",
                        borderBottom: "1px solid var(--ws4-border-subtle)",
                      }}
                    >
                      <td style={{ padding: "10px 14px", fontWeight: 900 }}>
                        {isFirst && <span style={{ color: "#ffb020" }}>🥇 #1</span>}
                        {isSecond && <span style={{ color: "#e0e6ed" }}>🥈 #2</span>}
                        {isThird && <span style={{ color: "#cd7f32" }}>🥉 #3</span>}
                        {!isFirst && !isSecond && !isThird && (
                          <span style={{ color: "var(--ws4-text-muted)" }}>#{idx + 1}</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 800, color: isFirst ? "#ffb020" : "#fff" }}>
                          {r.playerName || "Operator Alpha"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span
                          className={`ws4-mod-badge ${
                            r.status === "COMPLETED" ? "ws4-badge-done" : "ws4-badge-locked"
                          }`}
                          style={{ fontSize: "9.5px", padding: "2px 6px" }}
                        >
                          {r.status === "COMPLETED" ? "✓ SUCCESS" : "TIMEOUT"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 900,
                          fontSize: "14px",
                          color: "var(--ws4-neon-green)",
                        }}
                      >
                        {r.score}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: "var(--ws4-cyan-accent)",
                          fontFamily: "var(--ws4-font-mono)",
                        }}
                      >
                        {r.timeRemainingFormatted || `${r.timeRemainingSeconds}s`}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: r.errors > 0 ? "var(--ws4-crimson-alert)" : "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {r.errors}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: "#8b9bb4",
                        }}
                      >
                        {r.hintsUsedCount ?? 0}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: "#506177",
                          fontSize: "11px",
                        }}
                      >
                        {r.formattedDate || new Date(r.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "6px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="ws4-btn ws4-btn-primary"
              onClick={handleDownload}
              disabled={results.length === 0}
              style={{ fontSize: "11px", padding: "8px 14px" }}
              title="Download results.json to your computer"
            >
              📥 EXPORT results.json
            </button>

            <button
              type="button"
              className="ws4-btn ws4-btn-secondary"
              onClick={loadData}
              style={{ fontSize: "11px", padding: "8px 12px" }}
            >
              🔄 REFRESH
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {!confirmClear ? (
              <button
                type="button"
                className="ws4-btn ws4-btn-danger"
                onClick={() => setConfirmClear(true)}
                disabled={results.length === 0}
                style={{ fontSize: "11px", padding: "8px 12px", opacity: 0.8 }}
              >
                RESET HISTORY
              </button>
            ) : (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--ws4-crimson-alert)" }}>CONFIRM?</span>
                <button
                  type="button"
                  className="ws4-btn ws4-btn-danger"
                  onClick={handleClear}
                  style={{ fontSize: "10px", padding: "4px 8px" }}
                >
                  YES, CLEAR
                </button>
                <button
                  type="button"
                  className="ws4-btn ws4-btn-secondary"
                  onClick={() => setConfirmClear(false)}
                  style={{ fontSize: "10px", padding: "4px 8px" }}
                >
                  CANCEL
                </button>
              </div>
            )}

            <button
              type="button"
              className="ws4-btn ws4-btn-primary"
              onClick={onClose}
              style={{ fontSize: "12px", padding: "8px 20px" }}
            >
              [ CLOSE ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
