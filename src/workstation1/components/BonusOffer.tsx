import { useEffect, useRef } from 'react';
import { SCORING } from '../mockStation1Data';
import { HudPanel } from './HudPanel';

interface Props {
  secondsLeft: number;
  onPlay: () => void;
  onSkip: () => void;
}

/** "SECRET HANDSHAKE · BONUS" card shown after a completed Module C. An unanswered card auto-skips so an idle kiosk still saves. */
export function BonusOffer({ secondsLeft, onPlay, onSkip }: Props) {
  const cfg = SCORING.moduleD;
  const skip = useRef(onSkip);
  useEffect(() => {
    skip.current = onSkip;
  });
  useEffect(() => {
    const id = window.setTimeout(() => skip.current(), cfg.offerSeconds * 1000);
    return () => window.clearTimeout(id);
  }, [cfg.offerSeconds]);
  const cap = Math.min(cfg.maxSeconds, secondsLeft);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <HudPanel title="Bonus round" tag="OPTIONAL" tone="gold" cut="both" className="w-[min(92vw,560px)]" bodyClassName="flex flex-col gap-4 p-6" >
        <div role="dialog" aria-label="Secret handshake bonus offer" className="flex flex-col gap-4">
          <div className="font-hud text-3xl font-bold uppercase tracking-[0.18em] text-white">SECRET HANDSHAKE <span className="text-goat-gold">· BONUS</span></div>
          <p className="font-tele text-xs uppercase tracking-widest text-goat-mute">UP TO +{cfg.maxPoints} · {cap} S · SPEED BONUS ALREADY LOCKED IN</p>
          <div className="flex gap-3">
            <button type="button" onClick={onPlay} autoFocus className="tac-btn flex-1 bg-goat-gold px-6 py-3.5 text-sm font-bold text-goat-void">[ PLAY ]</button>
            <button type="button" onClick={onSkip} className="tac-btn flex-1 bg-goat-mute/25 px-6 py-3.5 text-sm font-bold text-goat-cyan">[ SKIP ]</button>
          </div>
          <span className="h-1 w-full overflow-hidden bg-goat-mute/25" aria-hidden>
            <i className="hs-bar-auto block h-full bg-goat-gold" style={{ animationDuration: `${cfg.offerSeconds}s` }} />
          </span>
        </div>
      </HudPanel>
    </div>
  );
}
