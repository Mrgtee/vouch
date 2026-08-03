import test from "node:test";
import assert from "node:assert/strict";
import { createApplicationPacketWithAi } from "../src/lib/aiPacket.js";
import { createApplicationPacket } from "../src/lib/packet.js";

const resumeText = [
  "Jane Doe",
  "Product Analyst with 5 years building SQL dashboards, product analytics, A/B testing, stakeholder reporting, and retention experiments.",
  "Improved activation by 18% and reduced reporting time by 40% by automating weekly KPI reports.",
  "Led cross functional roadmap reviews with product, sales, and customer success teams.",
  "Built cohort dashboards in SQL and BI tools to identify churn risks and improve onboarding decisions."
].join("\n");

const payload = {
  resumeText,
  targetJobs: [
    {
      title: "Revenue Analyst",
      company: "Acme",
      description:
        "Revenue Analyst role requiring revenue forecasting, pricing analysis, finance dashboards, stakeholder management, SQL, experimentation, and executive recommendations."
    }
  ],
  candidatePreferences: {
    location: "Remote",
    salaryGoal: "120000 USD",
    tone: "executive"
  }
};

function fakeAiPacket() {
  return {
    atsResume: "Jane Doe\nAI-written ATS resume grounded in the supplied evidence.",
    recruiterSummary: "AI recruiter summary that references the trusted benchmark and target role.",
    mockRecruiterScreen: {
      decision: "Likely phone screen after targeted edits",
      beforeScore: 1,
      afterScore: 99,
      whyInterview: ["Strong SQL and stakeholder evidence."],
      concerns: ["Revenue forecasting remains a proof gap."],
      screeningQuestions: [
        {
          topic: "SQL",
          question: "Walk me through a dashboard that changed a business decision.",
          answerFrame: "Situation, data source, analysis, recommendation, measurable result."
        }
      ]
    },
    interviewPrep: [
      {
        question: "How would you translate product analytics experience into revenue analysis?",
        whyAsked: "The role requires adjacent finance-facing work.",
        answerFrame: "Bridge retention and activation work to revenue impact without overstating ownership.",
        strongAnswerSignals: ["Names the gap", "Connects adjacent evidence", "Avoids invented finance claims"]
      }
    ],
    beforeAfterBulletImprovements: [
      {
        original: "Improved activation by 18%.",
        rewritten: "Improved activation by 18% through KPI automation and cohort analysis.",
        whyItWorks: "Keeps the metric and clarifies the mechanism.",
        evidenceRisk: "Low; supported by supplied resume text."
      }
    ],
    portfolioProjects: [
      {
        title: "Revenue bridge analysis sprint",
        objective: "Demonstrate revenue reasoning without claiming past ownership.",
        deliverable: "One-page analysis with assumptions, SQL-style logic, and recommendations.",
        timeline: "3-5 focused hours",
        successCriteria: "Shows pricing or forecasting thinking and names limitations."
      }
    ],
    salaryPositioning: {
      location: "Remote",
      salaryGoal: "120000 USD",
      positioning: "Anchor after validating comparable revenue analyst ranges.",
      leverage: "Use analytics impact and stakeholder work as leverage.",
      caveat: "Directional only; verify against current market data.",
      negotiationScript: "I am targeting a range aligned with the role scope and measurable analytics impact."
    },
    applicationStrategy: {
      firstWeekActions: ["Rewrite top bullets", "Build one revenue proof sprint"],
      recruiterMessage: "I can bring product analytics discipline to revenue-facing decisions.",
      portfolioPriority: "Revenue bridge analysis sprint",
      riskWarnings: ["Do not claim direct revenue forecasting ownership unless true."]
    },
    gapBenchmark: [
      {
        requirement: "revenue",
        status: "strong",
        evidence: ["Hallucinated evidence should not survive merge"],
        recommendation: "Position revenue as adjacent experience and build a proof sprint."
      }
    ]
  };
}

test("uses OpenAI output while preserving trusted local scores and evidence gaps", async () => {
  let request;
  const client = {
    responses: {
      create: async (value) => {
        request = value;
        return { output_text: JSON.stringify(fakeAiPacket()) };
      }
    }
  };
  const local = createApplicationPacket(payload);
  const result = await createApplicationPacketWithAi(payload, {
    provider: "openai",
    model: "gpt-test",
    client
  });

  assert.equal(request.model, "gpt-test");
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(result.generation.provider, "openai");
  assert.equal(result.packet.fitScoreBefore, local.packet.fitScoreBefore);
  assert.equal(result.packet.fitScoreAfter, local.packet.fitScoreAfter);
  assert.match(result.packet.atsResume, /AI-written ATS resume/);
  assert.equal(result.packet.mockRecruiterScreen.beforeScore, local.packet.fitScoreBefore);
  assert.equal(result.packet.mockRecruiterScreen.afterScore, local.packet.fitScoreAfter);

  const revenueGap = result.packet.gapBenchmark.find((gap) => gap.requirement === "revenue");
  assert.equal(revenueGap.status, "missing");
  assert.deepEqual(revenueGap.evidence, []);
  assert.match(revenueGap.recommendation, /adjacent experience/);
});

test("falls back to the local benchmark packet when OpenAI is unavailable", async () => {
  const client = {
    responses: {
      create: async () => {
        throw new Error("network down");
      }
    }
  };
  const result = await createApplicationPacketWithAi(payload, {
    provider: "openai",
    model: "gpt-test",
    client
  });

  assert.equal(result.generation.provider, "local_fallback");
  assert.equal(result.generation.fallbackUsed, true);
  assert.match(result.packet.atsResume, /Jane Doe/);
  assert.ok(result.packet.applicationStrategy);
  assert.equal(Array.isArray(result.packet.applicationStrategy.firstWeekActions), true);
  assert.equal(Array.isArray(result.packet.beforeAfterBulletImprovements), true);
});


test("falls back when OpenAI generation exceeds the configured timeout", async () => {
  const client = {
    responses: {
      create: () => new Promise(() => {})
    }
  };

  const startedAt = Date.now();
  const result = await createApplicationPacketWithAi(payload, {
    provider: "openai",
    model: "gpt-test",
    client,
    timeoutMs: 10
  });

  assert.equal(result.generation.provider, "local_fallback");
  assert.equal(result.generation.fallbackUsed, true);
  assert.equal(result.generation.errorType, "TimeoutError");
  assert.ok(Date.now() - startedAt < 1000);
});
