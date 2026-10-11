export const moduleAQuestions = [
  {
    id: "moduleA_q1",
    questionNumber: 1,
    title: "QUESTION 1 OF 2 — CDN ARCHITECTURE",
    prompt: "What does a Content Delivery Network (CDN) primarily do?",
    options: [
      { id: "A", label: "A", text: "Stores all passwords in a browser" },
      { id: "B", label: "B", text: "Distributes content through geographically distributed servers" },
      { id: "C", label: "C", text: "Increases image resolution automatically" },
      { id: "D", label: "D", text: "Replaces the internet connection" },
    ],
    correctAnswer: "B",
    explanation:
      "A CDN caches and delivers media from edge servers closest to viewers, reducing physical distance, network hops, and origin server congestion.",
  },
  {
    id: "moduleA_q2",
    questionNumber: 2,
    title: "QUESTION 2 OF 2 — BROADCAST METRICS",
    prompt:
      "Which metric most directly represents the delay between a live event and its display to viewers?",
    options: [
      { id: "A", label: "A", text: "Screen brightness" },
      { id: "B", label: "B", text: "CPU temperature" },
      { id: "C", label: "C", text: "End-to-end latency" },
      { id: "D", label: "D", text: "File size" },
    ],
    correctAnswer: "C",
    explanation:
      "End-to-end latency measures the total glass-to-glass transit time from the trackside cameras to the viewer's screen.",
  },
];

export const moduleBQuestions = [
  {
    id: "moduleB_q1",
    questionNumber: 1,
    title: "MODULE B VERIFICATION — EDGE TRAFFIC DYNAMICS",
    prompt:
      "Why can routing viewers to a geographically closer, less congested edge server improve streaming performance?",
    options: [
      { id: "A", label: "A", text: "It always increases video resolution" },
      { id: "B", label: "B", text: "It can reduce network delay and congestion" },
      { id: "C", label: "C", text: "It removes the need for a network connection" },
      { id: "D", label: "D", text: "It guarantees zero packet loss" },
    ],
    correctAnswer: "B",
    explanation:
      "Edge routing minimizes round-trip time (RTT) and bypasses congested transcontinental backbones, directly reducing stream delay.",
  },
];

export const moduleCQuestions = [
  {
    id: "moduleC_q1",
    questionNumber: 1,
    title: "QUESTION 1 OF 2 — BITRATE TRADE-OFFS",
    prompt:
      "What is a likely trade-off when increasing video bitrate?",
    options: [
      { id: "A", label: "A", text: "It can increase bandwidth demand" },
      { id: "B", label: "B", text: "It removes every source of latency" },
      { id: "C", label: "C", text: "It disables the CDN" },
      { id: "D", label: "D", text: "It guarantees zero packet loss" },
    ],
    correctAnswer: "A",
    explanation:
      "Higher bitrates provide sharper visual fidelity but require proportionally higher network throughput, risking buffer stalls if pipes become congested.",
  },
  {
    id: "moduleC_q2",
    questionNumber: 2,
    title: "QUESTION 2 OF 2 — BUFFERING DYNAMICS",
    prompt:
      "Why is excessive buffering undesirable in a live sports broadcast?",
    options: [
      { id: "A", label: "A", text: "It always lowers video resolution" },
      { id: "B", label: "B", text: "It can increase the delay between the live event and playback" },
      { id: "C", label: "C", text: "It removes all network traffic" },
      { id: "D", label: "D", text: "It guarantees immediate delivery" },
    ],
    correctAnswer: "B",
    explanation:
      "In live sports, excessive buffering delays the playback stream, spoiling live race moments via spoilers or social media delays.",
  },
];
