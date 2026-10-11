import { useState } from "react";

export default function SystemLog({ logs = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayLogs = isExpanded ? logs : logs.slice(0, 4);

  return (
    <div className="ws1-system-log-terminal" aria-label="System Event Terminal">
      <div className="ws1-log-header">
        <div className="ws1-log-title-wrap">
          <span className="ws1-terminal-prompt" aria-hidden="true">&gt;_</span>
          <span className="ws1-log-title">SYSTEM TELEMETRY LOG</span>
        </div>
        <button
          type="button"
          className="ws1-log-expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "COLLAPSE [▲]" : `VIEW ALL (${logs.length}) [▼]`}
        </button>
      </div>

      <div className="ws1-log-body">
        {displayLogs.length === 0 ? (
          <div className="ws1-log-empty">INITIALIZING EVENT STREAM...</div>
        ) : (
          displayLogs.map((log) => {
            let typeClass = "ws1-log-info";
            if (log.type === "warn") typeClass = "ws1-log-warn";
            if (log.type === "error") typeClass = "ws1-log-error";
            if (log.type === "success") typeClass = "ws1-log-success";

            return (
              <div key={log.id} className={`ws1-log-line ${typeClass}`}>
                <span className="ws1-log-time">[{log.time}]</span>
                <span className="ws1-log-msg">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
