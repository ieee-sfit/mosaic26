import { useEffect, useRef } from "react";

export default function BreachTransitionCutscene({ onComplete }) {
  const videoRef = useRef(null);
  const hasFinishedRef = useRef(false);

  // Base URL for Vite dev and production build
  const videoSource = `${import.meta.env.BASE_URL}gemini_generated_video_3bec9b28.mp4`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1.0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // If the browser blocks unmuted autoplay before user interaction, start playing muted
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }, []);

  const handleEnded = () => {
    if (!hasFinishedRef.current) {
      hasFinishedRef.current = true;
      if (onComplete) onComplete();
    }
  };

  const handleScreenClick = (e) => {
    e.stopPropagation();
    // Clicking on screen MUST NOT skip or exit cutscene.
    // It unmutes audio in case browser blocked autoplay with sound.
    if (videoRef.current) {
      if (videoRef.current.muted) {
        videoRef.current.muted = false;
      }
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <div
      className="ws4-cinema-overlay"
      id="ws4-cinema-cutscene"
      onClick={handleScreenClick}
      style={{ cursor: "default", background: "#000" }}
    >
      {/* Pure Full-Screen Video with Audio (No UI controls, No overlays, No text) */}
      <video
        ref={videoRef}
        className="ws4-cinema-video-element"
        src={videoSource}
        playsInline
        autoPlay
        onEnded={handleEnded}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          position: "absolute",
          inset: 0,
        }}
      />
    </div>
  );
}
