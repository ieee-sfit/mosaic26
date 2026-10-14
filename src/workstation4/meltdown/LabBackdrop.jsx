/** Fixed quarantine-lab backdrop: fogged observation glass, green hatch glow, server racks, red alarm tint. */
export default function LabBackdrop() {
  return (
    <div className="mz-lab" aria-hidden="true">
      <div className="mz-lab-glass" />
      <div className="mz-lab-fog mz-lab-fog--a" />
      <div className="mz-lab-fog mz-lab-fog--b" />
      <div className="mz-lab-drips"><i /><i /><i /><i /><i /></div>
      <div className="mz-lab-hatch" />
      <div className="mz-lab-racks"><span /></div>
      <div className="mz-lab-alarm" />
    </div>
  )
}
