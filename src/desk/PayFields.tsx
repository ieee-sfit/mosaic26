export interface Pay { credits: number; mode: 'cash' | 'upi' | 'online'; ref: string; by: string }

/** Shared payment block: credits stepper (amount = credits x price), mode, reference, received-by. */
export default function PayFields({ price, value, onChange }: { price: number; value: Pay; onChange: (p: Pay) => void }) {
  const set = <K extends keyof Pay>(k: K, v: Pay[K]) => onChange({ ...value, [k]: v })
  return (
    <div className="dk-grid">
      <div className="dk-stepper">
        <span>Credits (Rs {price} each)</span>
        <div>
          <button type="button" className="dk-btn" aria-label="fewer credits" onClick={() => set('credits', Math.max(1, value.credits - 1))}>−</button>
          <output aria-label="credits">{value.credits}</output>
          <button type="button" className="dk-btn" aria-label="more credits" onClick={() => set('credits', Math.min(50, value.credits + 1))}>+</button>
          <b className="dk-amount">Rs {value.credits * price}</b>
        </div>
      </div>
      <fieldset className="dk-seg">
        <legend>Payment mode</legend>
        {(['cash', 'upi', 'online'] as const).map((m) => (
          <label key={m}><input type="radio" name="mode" checked={value.mode === m} onChange={() => set('mode', m)} /> {m.toUpperCase()}</label>
        ))}
      </fieldset>
      <label>Payment reference<input value={value.ref} onChange={(e) => set('ref', e.target.value)} autoComplete="off" name="payref" placeholder="UPI last digits / UTR (optional)" /></label>
      <label>Received by (first name)<input value={value.by} onChange={(e) => set('by', e.target.value)} autoComplete="off" name="receivedby" /></label>
    </div>
  )
}
