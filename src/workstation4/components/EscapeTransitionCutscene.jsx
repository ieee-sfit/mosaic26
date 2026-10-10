import { useRef } from "react";

export default function EscapeTransitionCutscene({ onComplete }) {
  const videoRef = useRef(null);
  const hasFinishedRef = useRef(false);

  const handleEnded = () => {
    if (!hasFinishedRef.current) {
      hasFinishedRef.current = true;
      if (onComplete) onComplete();
    }
  };

  const handleScreenClick = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      className="ws4-cinema-overlay"
      id="ws4-escape-cutscene"
      onClick={handleScreenClick}
      style={{ cursor: "default", background: "#000" }}
    >
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}WhatsApp Video 2026-10-10 at 11.08.10.mp4`}
        autoPlay
        playsInline
        onEnded={handleEnded}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none"
        }}
      />
    </div>
  );
}
