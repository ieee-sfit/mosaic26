export default function SystemLog({ logs = [] }) {
  return (
    <div className="ws4-system-log-panel" id="ws4-system-log">
      <div className="ws4-log-header">
        <span>AREA51 TERMINAL EVENT LOG // TELEMETRY</span>
        <span>BUFFER: {logs.length} ENTRIES</span>
      </div>

      <div className="ws4-log-feed">
        {logs.map((log) => {
          let typeClass = "ws4-log-info";
          if (log.type === "success") typeClass = "ws4-log-success";
          if (log.type === "warn") typeClass = "ws4-log-warn";
          if (log.type === "error") typeClass = "ws4-log-error";

          return (
            <div key={log.id} className="ws4-log-entry">
              <span className="ws4-log-timestamp">[{log.time}]</span>
              <span className={`ws4-log-msg ${typeClass}`}>{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
