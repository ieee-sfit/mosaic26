import { station1Config } from "../config/stationConfig";

/**
 * Deterministic CDN Traffic & Latency Simulation Engine
 * Formula 1 Broadcast Telemetry Model: Ford vs Ferrari
 */

/**
 * Calculates current CDN node metrics, network utilization,
 * packet loss, buffer health, and end-to-end latency.
 */
export function evaluateStreamingNetwork({
  allocations = {
    origin: 40,
    eu_edge: 25,
    na_edge: 15,
    asia_edge: 12,
    sa_edge: 8,
  },
  selectedBitrateId = "BALANCED",
  selectedBufferId = "BALANCED_LIVE",
  selectedPacketLossId = "CMAF_FEC",
  totalViewersMillions = 2.4,
}) {
  const { initialNodes, targetLatencySeconds } = station1Config;

  // 1. Calculate sum of traffic allocation
  const totalAllocation =
    (allocations.origin || 0) +
    (allocations.eu_edge || 0) +
    (allocations.na_edge || 0) +
    (allocations.asia_edge || 0) +
    (allocations.sa_edge || 0);

  const isAllocationValid = Math.abs(totalAllocation - 100) < 0.1;

  // 2. Deterministic Node Utilization Calculation
  // Initial reference: Origin 94%, EU 85%, NA 72%, Asia 91%, SA 48%
  // Formula accounts for base regional viewer demand and assigned allocation
  const nodes = {};

  // Origin: Bottleneck when overloaded (Frankfurt Origin has limited 100 Gbps egress)
  const originAlloc = allocations.origin ?? 40;
  const originUtil = Math.max(12, Math.min(100, Math.round(originAlloc * 2.35)));
  nodes.origin = {
    ...initialNodes.origin,
    allocation: originAlloc,
    utilization: originUtil,
    status: originUtil >= 88 ? "CRITICAL" : originUtil >= 75 ? "OVERLOADED" : "HEALTHY",
    latencyMs: Math.round(initialNodes.origin.baseLatencyMs * (1 + (originUtil / 100) * 1.5)),
  };

  // EU Edge (Silverstone PoP): Capacity 150 Gbps
  const euAlloc = allocations.eu_edge ?? 25;
  const euUtil = Math.max(20, Math.min(100, Math.round(20 + euAlloc * 1.5)));
  nodes.eu_edge = {
    ...initialNodes.eu_edge,
    allocation: euAlloc,
    utilization: euUtil,
    status: euUtil >= 85 ? "OVERLOADED" : euUtil >= 75 ? "ELEVATED" : "HEALTHY",
    latencyMs: Math.round(initialNodes.eu_edge.baseLatencyMs * (1 + (euUtil / 100) * 0.8)),
  };

  // NA Edge (Detroit PoP): Capacity 150 Gbps
  const naAlloc = allocations.na_edge ?? 15;
  const naUtil = Math.max(15, Math.min(100, Math.round(18 + naAlloc * 1.6)));
  nodes.na_edge = {
    ...initialNodes.na_edge,
    allocation: naAlloc,
    utilization: naUtil,
    status: naUtil >= 85 ? "OVERLOADED" : naUtil >= 75 ? "ELEVATED" : "HEALTHY",
    latencyMs: Math.round(initialNodes.na_edge.baseLatencyMs * (1 + (naUtil / 100) * 0.8)),
  };

  // Asia Edge (Suzuka PoP): Prone to local congestion if traffic isn't routed smartly
  const asiaAlloc = allocations.asia_edge ?? 12;
  const asiaUtil = Math.max(18, Math.min(100, Math.round(35 + asiaAlloc * 2.1)));
  nodes.asia_edge = {
    ...initialNodes.asia_edge,
    allocation: asiaAlloc,
    utilization: asiaUtil,
    status: asiaUtil >= 88 ? "CRITICAL" : asiaUtil >= 75 ? "OVERLOADED" : "HEALTHY",
    latencyMs: Math.round(initialNodes.asia_edge.baseLatencyMs * (1 + (asiaUtil / 100) * 1.2)),
  };

  // SA Edge (Interlagos PoP): Capacity 100 Gbps
  const saAlloc = allocations.sa_edge ?? 8;
  const saUtil = Math.max(10, Math.min(100, Math.round(16 + saAlloc * 1.8)));
  nodes.sa_edge = {
    ...initialNodes.sa_edge,
    allocation: saAlloc,
    utilization: saUtil,
    status: saUtil >= 85 ? "OVERLOADED" : "HEALTHY",
    latencyMs: Math.round(initialNodes.sa_edge.baseLatencyMs * (1 + (saUtil / 100) * 0.9)),
  };

  const peakUtilization = Math.max(
    nodes.origin.utilization,
    nodes.eu_edge.utilization,
    nodes.na_edge.utilization,
    nodes.asia_edge.utilization,
    nodes.sa_edge.utilization
  );

  const averageUtilization = Math.round(
    (nodes.origin.utilization +
      nodes.eu_edge.utilization +
      nodes.na_edge.utilization +
      nodes.asia_edge.utilization +
      nodes.sa_edge.utilization) /
      5
  );

  // 3. Module C Settings modifiers
  const bitrateProfile =
    station1Config.bitrateProfiles.find((b) => b.id === selectedBitrateId) ||
    station1Config.bitrateProfiles[1];

  const bufferProfile =
    station1Config.bufferProfiles.find((b) => b.id === selectedBufferId) ||
    station1Config.bufferProfiles[1];

  const packetLossStrategy =
    station1Config.packetLossStrategies.find((p) => p.id === selectedPacketLossId) ||
    station1Config.packetLossStrategies[1];

  // 4. Deterministic Latency Calculation
  // Base healthy latency = 0.85s
  let baseNetworkLatency = 0.85;

  // Origin Penalty: when Origin > 15%, adds heavy central transit latency
  const originPenalty = Math.max(0, (nodes.origin.utilization - 35) * 0.016);

  // Congestion Penalty: when edge nodes exceed 75%
  let congestionPenalty = 0;
  [nodes.eu_edge, nodes.na_edge, nodes.asia_edge, nodes.sa_edge].forEach((n) => {
    if (n.utilization > 75) {
      congestionPenalty += (n.utilization - 75) * 0.018;
    }
  });

  // Imbalance penalty if allocation does not equal 100%
  const allocationPenalty = !isAllocationValid ? 0.75 : 0;

  // Modifiers
  const bitrateMod = bitrateProfile.latencyDelta;
  const bufferMod = bufferProfile.latencyDelta;
  const packetLossMod = packetLossStrategy.latencyDelta;

  const rawLatency =
    baseNetworkLatency +
    originPenalty +
    congestionPenalty +
    allocationPenalty +
    bitrateMod +
    bufferMod +
    packetLossMod;

  // Clamp latency between realistic broadcast limits: 0.95s to 3.8s
  const currentLatencySeconds = Number(Math.max(0.95, Math.min(3.8, rawLatency)).toFixed(2));

  // 5. Packet Loss calculation (%)
  let calculatedLoss = packetLossStrategy.lossRatePercent;
  if (peakUtilization > 85) {
    calculatedLoss += ((peakUtilization - 85) / 10) * 0.6;
  }
  const packetLossPercent = Number(calculatedLoss.toFixed(2));

  // 6. Network Health Status
  let networkStatus = "DEGRADED";
  if (currentLatencySeconds < targetLatencySeconds && peakUtilization <= 75 && isAllocationValid) {
    networkStatus = "OPTIMAL";
  } else if (currentLatencySeconds <= 2.1 && peakUtilization <= 84 && isAllocationValid) {
    networkStatus = "STABLE";
  }

  // 7. Validation Flags
  const isLatencyTargetAchieved = currentLatencySeconds < targetLatencySeconds;
  const isPeakUtilizationAcceptable = peakUtilization <= 75;
  const isPacketLossAcceptable = packetLossPercent <= 1.0;
  const isBufferAcceptable = bufferProfile.bufferSeconds <= 2.2;
  const isBitrateValid = selectedBitrateId === "BALANCED" || selectedBitrateId === "LOW";

  const isBroadcastStabilized =
    isAllocationValid &&
    isLatencyTargetAchieved &&
    isPeakUtilizationAcceptable &&
    isPacketLossAcceptable;

  return {
    nodes,
    allocations,
    totalAllocation,
    isAllocationValid,
    peakUtilization,
    averageUtilization,
    currentLatencySeconds,
    targetLatencySeconds,
    networkStatus,
    bitrateProfile,
    bufferProfile,
    packetLossStrategy,
    packetLossPercent,
    totalViewersMillions,
    isLatencyTargetAchieved,
    isPeakUtilizationAcceptable,
    isPacketLossAcceptable,
    isBufferAcceptable,
    isBitrateValid,
    isBroadcastStabilized,
  };
}
