export const station1Config = {
  stationId: "station-1",
  stationName: "F1 0-Lag Stream",
  stationSubtitle: "FORD VS FERRARI — LIVE BROADCAST CRISIS",
  stationCode: "STATION 01",
  tagline: "EVERY MILLISECOND COUNTS. EVERY SECOND WINS.",
  totalDurationSeconds: 720, // 12 minutes total countdown

  moduleDurations: {
    A: 90,  // 1 min 30 sec
    B: 270, // 4 min 30 sec
    C: 360, // 6 min 00 sec
  },

  targetLatencySeconds: 1.5,
  initialLatencySeconds: 2.8,
  criticalLatencyThreshold: 2.0,

  // Initial CDN Node Specifications
  initialNodes: {
    origin: {
      id: "origin",
      name: "PRIMARY ORIGIN",
      region: "Frankfurt Hub",
      code: "FRA-01",
      initialAllocation: 40,
      capacityGbps: 100,
      baseLatencyMs: 120,
    },
    eu_edge: {
      id: "eu_edge",
      name: "EUROPE EDGE",
      region: "Silverstone PoP",
      code: "LHR-04",
      initialAllocation: 25,
      capacityGbps: 150,
      baseLatencyMs: 22,
    },
    na_edge: {
      id: "na_edge",
      name: "NORTH AMERICA EDGE",
      region: "Detroit PoP",
      code: "ORD-02",
      initialAllocation: 15,
      capacityGbps: 150,
      baseLatencyMs: 45,
    },
    asia_edge: {
      id: "asia_edge",
      name: "ASIA EDGE",
      region: "Suzuka PoP",
      code: "NRT-07",
      initialAllocation: 12,
      capacityGbps: 120,
      baseLatencyMs: 65,
    },
    sa_edge: {
      id: "sa_edge",
      name: "SOUTH AMERICA EDGE",
      region: "Interlagos PoP",
      code: "GRU-03",
      initialAllocation: 8,
      capacityGbps: 100,
      baseLatencyMs: 80,
    },
  },

  // Target optimal allocation reference for Module B
  optimalAllocation: {
    origin: 5,
    eu_edge: 35,
    na_edge: 30,
    asia_edge: 18,
    sa_edge: 12,
  },

  // Module C Configuration
  bitrateProfiles: [
    {
      id: "LOW",
      label: "LOW — 2 Mbps",
      bitrateMbps: 2,
      bandwidthGbps: 1.8,
      qualityScore: 65,
      latencyDelta: -0.15,
      description: "Lowest bandwidth demand. Reduced video resolution and compression artifacts.",
    },
    {
      id: "BALANCED",
      label: "BALANCED — 4 Mbps",
      bitrateMbps: 4,
      bandwidthGbps: 3.6,
      qualityScore: 88,
      latencyDelta: 0.0,
      description: "Optimal race broadcast profile. Crisp 1080p60 fidelity with controlled bandwidth.",
      isOptimal: true,
    },
    {
      id: "HIGH",
      label: "HIGH — 6 Mbps",
      bitrateMbps: 6,
      bandwidthGbps: 5.4,
      qualityScore: 98,
      latencyDelta: 0.35,
      description: "Maximum 4K HDR quality. Significantly elevates network congestion and CDN load.",
    },
  ],

  bufferProfiles: [
    {
      id: "AGGRESSIVE_LOW",
      label: "ULTRA LOW (1.0s)",
      bufferSeconds: 1.0,
      stallRisk: "HIGH",
      latencyDelta: -0.2,
      description: "Minimal playback cushion. Extreme risk of video freezing during network jitter.",
    },
    {
      id: "BALANCED_LIVE",
      label: "LIVE OPTIMIZED (1.8s)",
      bufferSeconds: 1.8,
      stallRisk: "LOW",
      latencyDelta: 0.0,
      description: "Recommended sports broadcast buffer. Absorbs packet fluctuations while staying sub-1.5s.",
      isOptimal: true,
    },
    {
      id: "SAFE_DEEP",
      label: "DEEP BUFFER (3.5s)",
      bufferSeconds: 3.5,
      stallRisk: "NONE",
      latencyDelta: 0.8,
      description: "Large safety margin. Completely prevents stalls but pushes latency above 2.0s.",
    },
  ],

  packetLossStrategies: [
    {
      id: "TCP_RETRY",
      label: "AGGRESSIVE TCP RETRY",
      lossRatePercent: 0.8,
      latencyDelta: 0.45,
      description: "Retransmits lost packets across standard TCP. Adds queueing delay and head-of-line blocking.",
    },
    {
      id: "CMAF_FEC",
      label: "DYNAMIC CMAF + FORWARD ERROR CORRECTION (FEC)",
      lossRatePercent: 0.1,
      latencyDelta: 0.0,
      description: "Redundant parity packets repair stream in real-time without retransmission delay.",
      isOptimal: true,
    },
    {
      id: "RAW_UDP",
      label: "UNCOMPRESSED UDP PASSTHROUGH",
      lossRatePercent: 4.5,
      latencyDelta: -0.1,
      description: "Zero retransmission latency, but causes visible frame tearing and pixelation on high load.",
    },
  ],

  // Scoring weights
  scoring: {
    moduleAMax: 20,
    moduleBMax: 35,
    moduleCMax: 45,
    totalMax: 100,
    wrongQuestionPenalty: 5,
    failedVerificationPenalty: 2,
    hintPenalty: 3,
  },

  // Hints
  hints: [
    {
      id: "hint-1",
      level: 1,
      title: "Identify Bottlenecks",
      text: "Identify the most overloaded edge nodes. The Primary Origin and Asia Edge nodes are operating near 100% capacity. Shift traffic to healthier edge servers.",
    },
    {
      id: "hint-2",
      level: 2,
      title: "Edge Offloading",
      text: "Consider whether traffic is distributed efficiently. Heavy origin traffic creates massive backhaul latency. Offload origin traffic to European and North American edge caches.",
    },
    {
      id: "hint-3",
      level: 3,
      title: "Bitrate & Buffer Balancing",
      text: "Balance bitrate quality against bandwidth demand and latency. Deep buffering (>3.5s) directly adds latency. Choose Balanced Bitrate (4 Mbps) and Low-Latency CMAF + FEC.",
    },
  ],
};

export default station1Config;
