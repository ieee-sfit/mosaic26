import { useSession } from '../session/sessionContext'

/** Station 2 (F1 0-Lag Stream) mount point. Replace body with the game build. */
export default function Station2({ onOpenStationChooser }) {
  const session = useSession()
  return (
    <div className="arc-placeholder">
      <h1>STATION 02 // F1 0-LAG STREAM</h1>
      <p>WORKSTATION ONLINE — AWAITING BUILD</p>
      {session && (
        <p>
          OP1 {session.p1_id} · OP2 {session.p2_id}
        </p>
      )}
      <button type="button" onClick={onOpenStationChooser}>[ RETURN TO LAUNCHER ]</button>
    </div>
  )
}
