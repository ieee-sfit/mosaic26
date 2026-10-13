/** Fixed cockpit window behind every Station 1 screen: stars, Earth limb, sun bloom, window struts, alarm light. */
export function CockpitBackdrop() {
  return (
    <div className="cockpit" aria-hidden>
      <div className="cockpit-stars goat-stars" />
      <div className="cockpit-sun" />
      <div className="cockpit-earth">
        <div className="cockpit-clouds" />
      </div>
      <div className="cockpit-strut cockpit-strut--l" />
      <div className="cockpit-strut cockpit-strut--r" />
      <div className="cockpit-dash" />
      <div className="cockpit-alarm" />
    </div>
  );
}
