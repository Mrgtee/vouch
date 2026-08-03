import OpenAI from "openai";
import { createApplicationPacket } from "./packet.js";
import { cleanText } from "./text.js";
import { validateApplicationPacketRequest } from "./validation.js";

const LOCAL_MODEL = "vouch-local-benchmark";
const DEFAULT_MODEL = "gpt-5";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 7_000;

export async function createApplicationPacketWithAi(rawPayload, options = {}) {
  const request = validateApplicationPacketRequest(rawPayload);
  const localPacket = createApplicationPacket(rawPayload);
  const aiOptions = normalizeAiOptions(options);

  if (aiOptions.provider !== "openai") {
    return withGeneration(localPacket, {
      provider: "local",
      model: LOCAL_MODEL,
      fallbackUsed: false,
      guardrails: guardrails()
    });
  }

  if (!aiOptions.client && !aiOptions.apiKey && !process.env.OPENAI_API_KEY) {
    return withGeneration(localPacket, {
      provider: "local_fallback",
      requestedProvider: "openai",
      model: LOCAL_MODEL,
      fallbackUsed: true,
      reason: "OPENAI_API_KEY is not configured.",
      guardrails: guardrails()
    });
  }

  try {
    const client = aiOptions.client ?? new OpenAI({
      apiKey: aiOptions.apiKey || undefined,
      timeout: aiOptions.timeoutMs,
      maxRetries: 0
    });
    const response = await runOpenAiWithTimeout(
      client.responses.create({
        model: aiOptions.model,
        input: buildOpenAiInput(request, localPacket),
        text: {
          format: {
            type: "json_schema",
            name: "vouch_application_packet",
            strict: true,
            schema: APPLICATION_PACKET_SCHEMA
          }
        },
        max_output_tokens: aiOptions.maxOutputTokens
      }),
      aiOptions.timeoutMs
    );
    const aiPacket = parseOpenAiPacket(response);

    return mergeOpenAiPacket(localPacket, aiPacket, aiOptions.model);
  } catch (error) {
    return withGeneration(localPacket, {
      provider: "local_fallback",
      requestedProvider: "openai",
      model: LOCAL_MODEL,
      fallbackUsed: true,
      reason: "OpenAI packet generation was unavailable.",
      errorType: cleanText(error?.name || "OpenAIError"),
      guardrails: guardrails()
    });
  }
}

function normalizeAiOptions(options) {
  return {
    provider: cleanText(options.provider || "openai").toLowerCase(),
    model: cleanText(options.model || DEFAULT_MODEL),
    apiKey: cleanText(options.apiKey),
    client: options.client,
    timeoutMs: Number.isInteger(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS,
    maxOutputTokens: Number.isInteger(options.maxOutputTokens) ? options.maxOutputTokens : DEFAULT_MAX_OUTPUT_TOKENS
  };
}

function runOpenAiWithTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error("OpenAI packet generation timed out.");
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
    timeoutId.unref?.();
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function buildOpenAiInput(request, localPacket) {
  return [
    {
      role: "developer",
      content: [
        {
          type: "input_text",
          text: [
            "You are Vouch, a production career workflow agent.",
            "Create a job-to-offer application packet from the supplied resume, target jobs, preferences, and trusted local benchmark.",
            "Use only evidence supplied in the resume and target jobs. Do not invent employers, degrees, certifications, metrics, tools, or dates.",
            "You may improve phrasing and strategy, but unverifiable requirements must remain gaps.",
            "Preserve the trusted fit scores, job breakdown, and evidence statuses from the local benchmark.",
            "Return only JSON matching the schema."
          ].join(" ")
        }
      ]
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: JSON.stringify({
            resumeText: request.resumeText,
            targetJobs: request.targetJobs,
            candidatePreferences: request.candidatePreferences,
            trustedBenchmark: {
              fitScoreBefore: localPacket.packet.fitScoreBefore,
              fitScoreAfter: localPacket.packet.fitScoreAfter,
              gapBenchmark: localPacket.packet.gapBenchmark,
              jobBreakdown: localPacket.packet.jobBreakdown,
              localDraft: {
                atsResume: localPacket.packet.atsResume,
                recruiterSummary: localPacket.packet.recruiterSummary,
                interviewPrep: localPacket.packet.interviewPrep,
                portfolioProjects: localPacket.packet.portfolioProjects
              }
            }
          })
        }
      ]
    }
  ];
}

function parseOpenAiPacket(response) {
  const outputText = response?.output_text || extractOutputText(response);
  if (!outputText) {
    throw new Error("OpenAI response did not include output_text.");
  }

  const parsed = JSON.parse(outputText);
  assertUsablePacket(parsed);
  return parsed;
}

function extractOutputText(response) {
  const chunks = [];
  for (const item of response?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("");
}

function assertUsablePacket(packet) {
  const requiredStrings = ["atsResume", "recruiterSummary"];
  for (const field of requiredStrings) {
    if (!cleanText(packet?.[field])) {
      throw new Error("OpenAI packet is missing " + field + ".");
    }
  }

  if (!Array.isArray(packet.interviewPrep) || packet.interviewPrep.length === 0) {
    throw new Error("OpenAI packet is missing interview prep.");
  }
}

function mergeOpenAiPacket(localPacket, aiPacket, model) {
  const local = localPacket.packet;
  return {
    service: "Vouch",
    version: localPacket.version,
    packet: {
      ...local,
      atsResume: cleanText(aiPacket.atsResume) || local.atsResume,
      recruiterSummary: cleanText(aiPacket.recruiterSummary) || local.recruiterSummary,
      mockRecruiterScreen: normalizeRecruiterScreen(aiPacket.mockRecruiterScreen, local),
      interviewPrep: normalizeArray(aiPacket.interviewPrep, local.interviewPrep),
      beforeAfterBulletImprovements: normalizeArray(aiPacket.beforeAfterBulletImprovements, []),
      portfolioProjects: normalizeArray(aiPacket.portfolioProjects, local.portfolioProjects),
      salaryPositioning: normalizeObject(aiPacket.salaryPositioning, local.salaryPositioning),
      applicationStrategy: normalizeObject(aiPacket.applicationStrategy, {}),
      fitScoreBefore: local.fitScoreBefore,
      fitScoreAfter: local.fitScoreAfter,
      gapBenchmark: mergeGapBenchmark(local.gapBenchmark, aiPacket.gapBenchmark),
      jobBreakdown: local.jobBreakdown,
      integrityNotes: [
        "Vouch uses OpenAI to draft the paid career packet after x402 payment verification.",
        "Fit scores, job coverage, and gap evidence are anchored by Vouch's local benchmark engine.",
        "The model is instructed not to invent candidate experience; missing requirements remain gaps.",
        "Salary positioning is directional and should be checked against current local compensation data."
      ]
    },
    generation: {
      provider: "openai",
      model,
      fallbackUsed: false,
      guardrails: guardrails()
    }
  };
}

function normalizeRecruiterScreen(value, local) {
  const screen = normalizeObject(value, local.mockRecruiterScreen);
  return {
    ...screen,
    beforeScore: local.fitScoreBefore,
    afterScore: local.fitScoreAfter
  };
}

function mergeGapBenchmark(localGaps, aiGaps) {
  const aiByRequirement = new Map(
    normalizeArray(aiGaps, []).map((gap) => [cleanText(gap.requirement).toLowerCase(), gap])
  );

  return localGaps.map((localGap) => {
    const aiGap = aiByRequirement.get(cleanText(localGap.requirement).toLowerCase());
    const recommendation = cleanText(aiGap?.recommendation);
    return {
      ...localGap,
      recommendation: recommendation || localGap.recommendation
    };
  });
}

function withGeneration(packet, generation) {
  return {
    ...packet,
    packet: normalizeFallbackPacket(packet.packet),
    generation
  };
}

function normalizeFallbackPacket(packet) {
  const firstJob = packet.jobBreakdown?.[0];
  const topGap = packet.gapBenchmark?.find((gap) => gap.status === "missing") ?? packet.gapBenchmark?.[0];
  return {
    ...packet,
    beforeAfterBulletImprovements: normalizeArray(packet.beforeAfterBulletImprovements, []),
    applicationStrategy: normalizeObject(packet.applicationStrategy, {
      firstWeekActions: [
        "Verify every rewritten bullet against real candidate evidence before submitting.",
        topGap
          ? "Close or explain the visible gap around " + topGap.requirement + "."
          : "Package the strongest matched evidence into the top resume summary.",
        firstJob
          ? "Tailor the recruiter note to " + (firstJob.company || firstJob.title) + "."
          : "Tailor the recruiter note to the target role."
      ],
      recruiterMessage: firstJob
        ? "I am applying with a role-specific packet for " + firstJob.title + "."
        : "I am applying with a role-specific packet grounded in supplied evidence.",
      portfolioPriority: topGap
        ? "Build a small proof artifact for " + topGap.requirement + "."
        : "Turn the strongest existing project into a concise proof artifact.",
      riskWarnings: [
        "Do not add tools, metrics, employers, or certifications that are not present in the supplied resume.",
        "Treat salary guidance as directional until checked against live market data."
      ]
    }),
    salaryPositioning: {
      ...packet.salaryPositioning,
      negotiationScript: packet.salaryPositioning?.negotiationScript ||
        "I am targeting compensation aligned with the role scope, location, and the measurable evidence in this packet."
    },
    integrityNotes: [
      ...packet.integrityNotes,
      "OpenAI generation is available when OPENAI_API_KEY is configured."
    ]
  };
}

function normalizeArray(value, fallback) {
  return Array.isArray(value) && value.length > 0 ? value : fallback;
}

function normalizeObject(value, fallback) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

function guardrails() {
  return [
    "paid endpoint enforced before generation",
    "local benchmark preserves scores and evidence statuses",
    "fallback packet available if OpenAI is unavailable"
  ];
}

const STRING_ARRAY = {
  type: "array",
  items: { type: "string" }
};

const APPLICATION_PACKET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "atsResume",
    "recruiterSummary",
    "mockRecruiterScreen",
    "interviewPrep",
    "beforeAfterBulletImprovements",
    "portfolioProjects",
    "salaryPositioning",
    "applicationStrategy",
    "gapBenchmark"
  ],
  properties: {
    atsResume: { type: "string" },
    recruiterSummary: { type: "string" },
    mockRecruiterScreen: {
      type: "object",
      additionalProperties: false,
      required: ["decision", "beforeScore", "afterScore", "whyInterview", "concerns", "screeningQuestions"],
      properties: {
        decision: { type: "string" },
        beforeScore: { type: "number" },
        afterScore: { type: "number" },
        whyInterview: STRING_ARRAY,
        concerns: STRING_ARRAY,
        screeningQuestions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["topic", "question", "answerFrame"],
            properties: {
              topic: { type: "string" },
              question: { type: "string" },
              answerFrame: { type: "string" }
            }
          }
        }
      }
    },
    interviewPrep: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "whyAsked", "answerFrame", "strongAnswerSignals"],
        properties: {
          question: { type: "string" },
          whyAsked: { type: "string" },
          answerFrame: { type: "string" },
          strongAnswerSignals: STRING_ARRAY
        }
      }
    },
    beforeAfterBulletImprovements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["original", "rewritten", "whyItWorks", "evidenceRisk"],
        properties: {
          original: { type: "string" },
          rewritten: { type: "string" },
          whyItWorks: { type: "string" },
          evidenceRisk: { type: "string" }
        }
      }
    },
    portfolioProjects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "objective", "deliverable", "timeline", "successCriteria"],
        properties: {
          title: { type: "string" },
          objective: { type: "string" },
          deliverable: { type: "string" },
          timeline: { type: "string" },
          successCriteria: { type: "string" }
        }
      }
    },
    salaryPositioning: {
      type: "object",
      additionalProperties: false,
      required: ["location", "salaryGoal", "positioning", "leverage", "caveat", "negotiationScript"],
      properties: {
        location: { type: "string" },
        salaryGoal: { type: "string" },
        positioning: { type: "string" },
        leverage: { type: "string" },
        caveat: { type: "string" },
        negotiationScript: { type: "string" }
      }
    },
    applicationStrategy: {
      type: "object",
      additionalProperties: false,
      required: ["firstWeekActions", "recruiterMessage", "portfolioPriority", "riskWarnings"],
      properties: {
        firstWeekActions: STRING_ARRAY,
        recruiterMessage: { type: "string" },
        portfolioPriority: { type: "string" },
        riskWarnings: STRING_ARRAY
      }
    },
    gapBenchmark: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["requirement", "status", "evidence", "recommendation"],
        properties: {
          requirement: { type: "string" },
          status: { type: "string" },
          evidence: STRING_ARRAY,
          recommendation: { type: "string" }
        }
      }
    }
  }
};
