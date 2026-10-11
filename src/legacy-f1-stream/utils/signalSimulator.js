/**
 * GOAT ANC - Signal Processing & Waveform Simulator Engine
 * Implements real physical sinusoidal wave mathematics, superposition, RMS,
 * logarithmic decibel calculation, and destructive interference validation.
 */

export const EPSILON = 0.001; // Minimum amplitude ratio floor (-60 dB)
export const DEFAULT_WINDOW_SECONDS = 0.015; // 15ms oscilloscope window
export const NUM_SAMPLES = 300; // Number of points across the time graticule

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Normalizes an angle in degrees to [0, 360).
 */
export function normalizeAngle(deg) {
  let val = deg % 360;
  if (val < 0) val += 360;
  return val;
}

/**
 * Calculates shortest angular difference between two angles in degrees (0 to 180).
 */
export function getAngularDifference(angleA, angleB) {
  const normA = normalizeAngle(angleA);
  const normB = normalizeAngle(angleB);
  let diff = Math.abs(normA - normB);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

/**
 * Computes sample points for a sinusoidal signal across a time window.
 * Formula: x(t) = A * sin(2πft + φ)
 *
 * @param {Object} params
 * @param {number} params.amplitude - Peak amplitude (0 to 100)
 * @param {number} params.frequency - Frequency in Hz
 * @param {number} params.phaseDeg - Phase offset in degrees
 * @param {number} [params.durationSeconds] - Window duration in seconds
 * @param {number} [params.numSamples] - Number of discrete points
 * @returns {Array<{t: number, y: number}>} Array of time and amplitude samples
 */
export function generateSignalSamples({
  amplitude,
  frequency,
  phaseDeg,
  durationSeconds = DEFAULT_WINDOW_SECONDS,
  numSamples = NUM_SAMPLES,
}) {
  const samples = [];
  const phaseRad = degreesToRadians(phaseDeg);
  const dt = durationSeconds / (numSamples - 1);

  for (let i = 0; i < numSamples; i++) {
    const t = i * dt;
    const y = amplitude * Math.sin(2 * Math.PI * frequency * t + phaseRad);
    samples.push({ t, y });
  }

  return samples;
}

/**
 * Computes the superposition residual signal:
 * residual(t) = noise(t) + antiNoise(t)
 */
export function calculateResidualSignal(originalSamples, antiNoiseSamples) {
  const length = Math.min(originalSamples.length, antiNoiseSamples.length);
  const residualSamples = [];

  for (let i = 0; i < length; i++) {
    const t = originalSamples[i].t;
    const y = originalSamples[i].y + antiNoiseSamples[i].y;
    residualSamples.push({ t, y });
  }

  return residualSamples;
}

/**
 * Calculates the Root Mean Square (RMS) amplitude of an array of sample points.
 * RMS = sqrt( (1 / N) * sum(y_i^2) )
 */
export function calculateRms(samples) {
  if (!samples || samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSq += samples[i].y * samples[i].y;
  }
  return Math.sqrt(sumSq / samples.length);
}

/**
 * Calculates cancellation efficiency as a percentage:
 * efficiency = max(0, min(100, (1 - residualRms / originalRms) * 100))
 */
export function calculateCancellationEfficiency(originalRms, residualRms) {
  if (originalRms <= 0.0001) return 100;
  const ratio = residualRms / originalRms;
  const efficiency = (1 - ratio) * 100;
  return Math.max(0, Math.min(100, Number(efficiency.toFixed(1))));
}

/**
 * Calculates residual noise level in decibels (dB):
 * residualNoiseDb = originalNoiseDb + 20 * log10(max(residualRms / originalRms, epsilon))
 * Clamped to baseline floor (24 dB) to reflect physical quiet room limits.
 */
export function calculateResidualDb(originalDb, originalRms, residualRms, epsilon = EPSILON) {
  if (originalRms <= 0.0001) return 24.0;
  const ratio = Math.max(residualRms / originalRms, epsilon);
  const deltaDb = 20 * Math.log10(ratio);
  const calculatedDb = originalDb + deltaDb;
  // Floor at 24.0 dB (simulated ambient cabin quiet limit)
  const clampedDb = Math.max(24.0, calculatedDb);
  return Number(clampedDb.toFixed(1));
}

/**
 * Evaluates the full signal status and checks calibration tolerances.
 */
export function evaluateSignals({
  originalAmplitude,
  originalFrequency,
  originalPhaseDeg,
  antiNoiseAmplitude,
  antiNoiseFrequency,
  antiNoisePhaseDeg,
  originalNoiseDb,
  safeNoiseLimitDb,
  targetPhaseDeg,
  targetAmplitude,
  targetFrequency,
  phaseTolDeg,
  ampTolPercent,
  freqTolPercent,
  requiredEfficiencyPercent,
}) {
  // 1. Generate live sinusoidal waveform points
  const originalSamples = generateSignalSamples({
    amplitude: originalAmplitude,
    frequency: originalFrequency,
    phaseDeg: originalPhaseDeg,
  });

  const antiNoiseSamples = generateSignalSamples({
    amplitude: antiNoiseAmplitude,
    frequency: antiNoiseFrequency,
    phaseDeg: antiNoisePhaseDeg,
  });

  // 2. Compute residual superposition
  const residualSamples = calculateResidualSignal(originalSamples, antiNoiseSamples);

  // 3. Compute RMS metrics
  const originalRms = calculateRms(originalSamples);
  const antiNoiseRms = calculateRms(antiNoiseSamples);
  const residualRms = calculateRms(residualSamples);

  // 4. Compute acoustic noise metrics
  const cancellationEfficiency = calculateCancellationEfficiency(originalRms, residualRms);
  const residualNoiseDb = calculateResidualDb(originalNoiseDb, originalRms, residualRms);

  // 5. Tolerance checks
  const phaseDifferenceToTarget = getAngularDifference(antiNoisePhaseDeg, targetPhaseDeg);
  const isPhaseAcceptable = phaseDifferenceToTarget <= phaseTolDeg;

  const amplitudeDiff = Math.abs(antiNoiseAmplitude - targetAmplitude);
  const isAmplitudeMatched = amplitudeDiff <= ampTolPercent;

  const freqTolHz = (freqTolPercent / 100) * targetFrequency;
  const frequencyDiff = Math.abs(antiNoiseFrequency - targetFrequency);
  const isFrequencyLocked = frequencyDiff <= freqTolHz;

  const isResidualSafe = residualNoiseDb <= safeNoiseLimitDb;
  const isEfficiencyAcceptable = cancellationEfficiency >= requiredEfficiencyPercent;

  // System is verified if all required engineering criteria are satisfied
  const isCalibrationVerified =
    isPhaseAcceptable &&
    isAmplitudeMatched &&
    isFrequencyLocked &&
    isResidualSafe &&
    isEfficiencyAcceptable;

  return {
    originalSamples,
    antiNoiseSamples,
    residualSamples,
    originalRms: Number(originalRms.toFixed(2)),
    antiNoiseRms: Number(antiNoiseRms.toFixed(2)),
    residualRms: Number(residualRms.toFixed(2)),
    cancellationEfficiency,
    residualNoiseDb,
    safeNoiseLimitDb,
    phaseDifferenceToTarget: Number(phaseDifferenceToTarget.toFixed(1)),
    amplitudeDiff: Number(amplitudeDiff.toFixed(1)),
    frequencyDiff: Number(frequencyDiff.toFixed(1)),
    isPhaseAcceptable,
    isAmplitudeMatched,
    isFrequencyLocked,
    isResidualSafe,
    isEfficiencyAcceptable,
    isCalibrationVerified,
  };
}

/**
 * Converts sample points into an SVG Path `d` attribute string for display.
 * Maps:
 *   t: [0, duration] -> x: [0, width]
 *   y: [-maxAmp, +maxAmp] -> y: [height, 0] (SVG y is inverted)
 */
export function samplesToSvgPath(samples, width, height, maxAmplitude = 120) {
  if (!samples || samples.length === 0) return "";
  const centerY = height / 2;
  const scaleY = (height / 2) / maxAmplitude;
  const stepX = width / (samples.length - 1);

  let path = `M 0,${centerY - samples[0].y * scaleY}`;
  for (let i = 1; i < samples.length; i++) {
    const x = i * stepX;
    const y = centerY - samples[i].y * scaleY;
    path += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  }

  return path;
}
