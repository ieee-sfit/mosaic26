/**
 * Fixed modern backdrop behind every Station 2 screen: dark plate, faint grid, one red slab and a slow speed-line
 * layer. Alarm adds an amber hazard frame. Only transform and opacity animate.
 */
export default function PitWallBackdrop() {
  return (
    <div className="ws2-bg" aria-hidden="true">
      <div className="ws2-bg__grid" />
      <div className="ws2-bg__slab" />
      <div className="ws2-bg__slab ws2-bg__slab--b" />
      <div className="ws2-bg__lines" />
      <div className="ws2-bg__vignette" />
    </div>
  );
}
