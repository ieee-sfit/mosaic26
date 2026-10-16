import { useMemo, useState } from 'react'
import { usePoll } from './usePoll'
import { fmtTime } from './api'

export default function CashReport() {
  const [day, setDay] = useState('all')
  const args = useMemo(() => {
    if (day === 'all') return { p_from: null, p_to: null }
    const from = new Date(`${day}T00:00:00+05:30`)
    return { p_from: from.toISOString(), p_to: new Date(from.getTime() + 86400000).toISOString() }
  }, [day])
  const { data, error } = usePoll<any>('desk_cash_report', args, 15000)
  return (
    <section className="dk-card">
      <h2>Cash report</h2>
      <label>Period
        <select value={day} onChange={(e) => setDay(e.target.value)} name="period">
          <option value="all">Whole event</option>
          <option value="2026-10-16">Day 1 (16 Oct)</option>
          <option value="2026-10-17">Day 2 (17 Oct)</option>
        </select>
      </label>
      {error && <div className="dk-err">{error}</div>}
      {data && (
        <>
          <div className="dk-scroll">
            <table className="dk-table">
              <thead><tr><th>Volunteer</th><th>Cash</th><th>UPI</th><th>Online</th><th>Total Rs</th><th>Credits issued</th><th>Registrations</th><th>Top-ups</th></tr></thead>
              <tbody>
                {data.volunteers.map((v: any) => (
                  <tr key={v.user}><td>{v.display_name}</td><td>{v.cash}</td><td>{v.upi}</td><td>{v.online}</td><td><b>{v.total_inr}</b></td><td>{v.credits_issued}</td><td>{v.registrations}</td><td>{v.topups}</td></tr>
                ))}
                <tr className="dk-total"><td>TOTAL</td>
                  {(['cash', 'upi', 'online', 'total_inr', 'credits_issued', 'registrations', 'topups'] as const).map((k) => (
                    <td key={k}>{data.volunteers.reduce((a: number, v: any) => a + v[k], 0)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <dl className="dk-stats">
            <div><dt>Runs started</dt><dd>{data.event.runs_started}</dd></div>
            <div><dt>Credits spent</dt><dd>{data.event.credits_spent}</dd></div>
            <div><dt>Credits refunded</dt><dd>{data.event.credits_refunded}</dd></div>
            <div><dt>Credits outstanding</dt><dd>{data.event.outstanding_credits}</dd></div>
          </dl>
          <p className="dk-dim">Runs started are event-wide (a run is started by the player, not by a volunteer). Updated {fmtTime(new Date().toISOString())}.</p>
        </>
      )}
    </section>
  )
}
