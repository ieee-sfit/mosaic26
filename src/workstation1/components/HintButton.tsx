interface Props {
  /** Hints already spent on the current item (0, 1 or 2). */
  stage: 0 | 1 | 2;
  onClick: () => void;
  disabled?: boolean;
  /** `block` fills its row; `strip` is the compact footer size. */
  size?: 'block' | 'strip';
}

/** Standard two-stage intel button shared by Modules A, B and C. */
export function HintButton({ stage, onClick, disabled, size = 'block' }: Props) {
  const spent = stage >= 2;
  const off = disabled || spent;
  const label = spent ? '[INTEL EXHAUSTED]' : `[REQUEST INTEL / HINT ${stage + 1}]`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={off}
      aria-label={spent ? 'Intel exhausted' : `Request intel, hint ${stage + 1} of 2`}
      className={`tac-btn font-bold ${size === 'block' ? 'w-full px-4 py-2.5 text-[11px]' : 'px-5 py-3 text-xs'} ${
        off ? 'bg-goat-mute/20 text-goat-mute' : 'bg-goat-gold text-goat-void'
      }`}
    >
      {label}
    </button>
  );
}
