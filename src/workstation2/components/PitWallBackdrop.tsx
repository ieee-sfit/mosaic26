/**
 * Fixed Le Mans night behind every Station 2 screen: grandstand roof with floodlights, a wet pit straight with
 * kerbs and lane lines, and two rain layers. Pure CSS; only transform/opacity animate. Red alarm tint on `.is-alarm`.
 */
export default function PitWallBackdrop() {
  return (
    <div className="ws2-bg" aria-hidden="true">
      <div className="ws2-bg__sky" />
      <div className="ws2-bg__roof">
        <i /><i /><i /><i /><i /><i /><i />
      </div>
      <div className="ws2-bg__glass" />
      <div className="ws2-bg__track">
        <span className="ws2-bg__kerb" />
        <span className="ws2-bg__lane ws2-bg__lane--a" />
        <span className="ws2-bg__lane ws2-bg__lane--b" />
        <span className="ws2-bg__sheen" />
      </div>
      <div className="ws2-bg__bloom" />
      <div className="ws2-bg__rain ws2-bg__rain--far" />
      <div className="ws2-bg__rain ws2-bg__rain--near" />
      <div className="ws2-bg__vignette" />
      <div className="ws2-bg__alarm" />
    </div>
  );
}
