/** Public leaderboard URL shown on slips and end screens (set VITE_BOARD_URL in the kiosk and board builds). */
export const boardUrl = (): string =>
  ((import.meta.env.VITE_BOARD_URL as string | undefined) || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')
