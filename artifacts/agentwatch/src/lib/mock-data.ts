export const mockStats = {
  total_traces: 1247,
  flagged_traces: 23,
  ok_traces: 1224,
  flags_today: 5,
  avg_latency_ms: 842,
  total_tokens: 2847291,
};

export const mockRecentRuns = [
  {
    run_id: "run_8f3a",
    agent_name: "support-bot",
    status: "flagged",
    steps: 3,
    latency_ms: 2100,
    created_at: "2026-04-05T10:22:01Z",
    flags: [{ flag_type: "hallucination", severity: "high" }],
  },
  {
    run_id: "run_3e9c",
    agent_name: "support-bot",
    status: "ok",
    steps: 5,
    latency_ms: 1840,
    created_at: "2026-04-05T10:19:44Z",
    flags: [],
  },
  {
    run_id: "run_2b1d",
    agent_name: "email-agent",
    status: "flagged",
    steps: 2,
    latency_ms: 320,
    created_at: "2026-04-05T10:17:12Z",
    flags: [{ flag_type: "error_swallowed", severity: "high" }],
  },
  {
    run_id: "run_1a8f",
    agent_name: "email-agent",
    status: "ok",
    steps: 6,
    latency_ms: 990,
    created_at: "2026-04-05T10:14:55Z",
    flags: [],
  },
  {
    run_id: "run_9d2c",
    agent_name: "data-pipeline",
    status: "ok",
    steps: 8,
    latency_ms: 3410,
    created_at: "2026-04-05T10:11:30Z",
    flags: [],
  },
  {
    run_id: "run_4e7b",
    agent_name: "data-pipeline",
    status: "flagged",
    steps: 4,
    latency_ms: 1230,
    created_at: "2026-04-05T10:08:12Z",
    flags: [{ flag_type: "latency_spike", severity: "medium" }],
  },
  {
    run_id: "run_7c1f",
    agent_name: "support-bot",
    status: "ok",
    steps: 2,
    latency_ms: 510,
    created_at: "2026-04-05T10:03:44Z",
    flags: [],
  },
];

export const mockTraceDetail = {
  run_id: "run_8f3a",
  agent_name: "support-bot",
  created_at: "2026-04-05T10:22:01Z",
  steps: [
    {
      id: "step-1",
      step_index: 1,
      step_type: "llm_call",
      input: "Customer message: Where is my refund? Order #4521",
      output:
        "Your refund of $450 has been approved and will be processed within 2-3 business days.",
      model: "gpt-4o",
      latency_ms: 920,
      tokens: 312,
      tool_calls: [],
      status: "flagged",
      flags: [
        {
          flag_type: "hallucination",
          severity: "high",
          reason:
            "Agent claimed refund was approved but no tool call was made to verify",
          deep_analysis: {
            verdict: "hallucination",
            confidence: 0.92,
            what_went_wrong:
              "The agent told the customer their refund was approved with a specific amount ($450), but no get_refund_status or similar tool was called to verify this.",
            root_cause:
              "The system prompt likely instructs the agent to be helpful and resolving, causing it to fabricate confirmations.",
            suggested_fix:
              "Add to system prompt: Only confirm actions that are explicitly verified by a tool call response.",
            severity: "high",
          },
        },
      ],
    },
    {
      id: "step-2",
      step_index: 2,
      step_type: "tool_call",
      input: "get_order_status({order_id: '4521'})",
      output: '{"status": "processing", "refund_status": "not_requested"}',
      model: "",
      latency_ms: 340,
      tokens: 0,
      tool_calls: [{ name: "get_order_status", result: "processing" }],
      status: "ok",
      flags: [],
    },
    {
      id: "step-3",
      step_index: 3,
      step_type: "llm_call",
      input: "Tool result: order processing, no refund. Respond to customer.",
      output:
        "I've checked your order status. Your order is currently being processed. No refund request has been found on our records. If you believe this is an error, please contact support with your order number.",
      model: "gpt-4o",
      latency_ms: 840,
      tokens: 198,
      tool_calls: [],
      status: "ok",
      flags: [],
    },
  ],
};

export const mockApiKeys = [
  {
    id: "key-1",
    name: "Production",
    key_prefix: "aw_prod",
    created_at: "2026-03-01T00:00:00Z",
    last_used_at: "2026-04-05T10:22:01Z",
  },
  {
    id: "key-2",
    name: "Development",
    key_prefix: "aw_devt",
    created_at: "2026-03-15T00:00:00Z",
    last_used_at: "2026-04-04T18:30:00Z",
  },
];

export const mockFlagDistribution = [
  { type: "hallucination", count: 12, color: "#ef4444" },
  { type: "error_swallowed", count: 7, color: "#f97316" },
  { type: "latency_spike", count: 3, color: "#eab308" },
  { type: "empty_output", count: 1, color: "#8b5cf6" },
];

export const mockLatencyData = [
  { time: "00:00", latency: 620 },
  { time: "02:00", latency: 790 },
  { time: "04:00", latency: 530 },
  { time: "06:00", latency: 870 },
  { time: "08:00", latency: 940 },
  { time: "10:00", latency: 1200 },
  { time: "12:00", latency: 830 },
  { time: "14:00", latency: 760 },
  { time: "16:00", latency: 920 },
  { time: "18:00", latency: 1050 },
  { time: "20:00", latency: 680 },
  { time: "22:00", latency: 590 },
];
