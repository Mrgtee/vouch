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
  assert.match(result.content[0].text, /Likely phone screen/);
  assert.equal(result.content[1].type, "json");
});
