import test from "node:test";
import assert from "node:assert/strict";
import { formatApplicationPacketResult } from "../src/lib/deliverable.js";

const packet = {
  fitScoreBefore: 54,
  fitScoreAfter: 83,
  atsResume: "Jane Doe\nEvidence-backed ATS resume.",
  recruiterSummary: "Jane is a credible fit after targeted edits.",
  mockRecruiterScreen: {
    decision: "Likely phone screen",
    whyInterview: ["Relevant system design evidence."],
    concerns: ["Limited GenAI production proof."],
    screeningQuestions: [
      {
        topic: "GenAI",
        question: "How did you design a safe LLM workflow?"
      }
    ]
  },
  interviewPrep: [
    {
      question: "Tell me about a distributed system you improved.",
      whyAsked: "The role has multi-service ownership.",
      answerFrame: "Situation, services, tradeoff, result."
    }
  ],
  portfolioProjects: [
    {
      title: "Agentic workflow proof sprint",
      objective: "Show LLM workflow ability.",
      deliverable: "Small demo and one-page writeup.",
      timeline: "3-5 hours"
    }
  ],
  salaryPositioning: {
    location: "Remote",
    salaryGoal: "120000 USD",
    positioning: "Validate current market ranges."
  },
  applicationStrategy: {
    recruiterMessage: "Jane can bring systems evidence to the target team.",
    portfolioPriority: "GenAI proof sprint",
    firstWeekActions: ["Verify every rewritten bullet."],
    riskWarnings: ["Do not invent GenAI production ownership."]
  },
  beforeAfterBulletImprovements: [
    {
      before: "Built dashboards.",
      after: "Built dashboards that clarified product decisions.",
      evidenceUsed: "Supported by supplied resume text.",
      whyItWorks: "Adds impact framing without new claims."
    }
  ],
  gapBenchmark: [
    {
      requirement: "GenAI",
      status: "missing",
      recommendation: "Build a proof sprint."
    }
  ],
  jobBreakdown: [
    {
      title: "Senior Software Engineer",
      company: "Visa"
    }
  ]
};

test("formats application packets as A2MCP-friendly paid deliverables", () => {
  const result = formatApplicationPacketResult({
    service: "Vouch",
    version: "0.3.3",
    packet,
    generation: {
      provider: "openai",
      model: "gpt-5",
      fallbackUsed: false
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.version, "0.3.3");
  assert.equal(result.packet, packet);
  assert.equal(result.structuredContent.packet, packet);
  assert.equal(result.deliverable.packet, packet);
  assert.match(result.summary, /54 to 83/);
  assert.match(result.title, /Visa Senior Software Engineer/);
  assert.match(result.deliverable.markdown, /# Vouch Resume-to-Offer Packet/);
  assert.match(result.deliverable.markdown, /## Application Strategy/);
  assert.match(result.deliverable.markdown, /## Bullet Improvements/);
  assert.match(result.deliverable.markdown, /Built dashboards that clarified product decisions/);
  assert.equal(result.deliverable.format, "markdown+json+pdf+docx");
  assert.equal(result.files.length, 2);
  assert.equal(result.deliverable.files.length, 2);
  assert.equal(result.structuredContent.files.length, 2);
  assert.match(result.content[0].text, /Likely phone screen/);
  assert.equal(result.content[1].type, "json");
  assert.equal(result.content[1].json.files.length, 2);

  const pdf = result.files.find((file) => file.name === "pdf");
  const docx = result.files.find((file) => file.name === "docx");
  assert.equal(pdf.mediaType, "application/pdf");
  assert.equal(docx.mediaType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal(Buffer.from(pdf.data, "base64").subarray(0, 4).toString("latin1"), "%PDF");
  const docxBytes = Buffer.from(docx.data, "base64");
  assert.equal(docxBytes.subarray(0, 2).toString("latin1"), "PK");
  assert.ok(docxBytes.includes(Buffer.from("[Content_Types].xml")));
});
