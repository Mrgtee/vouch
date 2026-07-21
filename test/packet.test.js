import test from "node:test";
import assert from "node:assert/strict";
import { createApplicationPacket } from "../src/lib/packet.js";

const resumeText = `
Jane Doe
Product Analyst with 5 years building SQL dashboards, product analytics, A/B testing, stakeholder reporting, and retention experiments.
Improved activation by 18% and reduced reporting time by 40% by automating weekly KPI reports.
Led cross functional roadmap reviews with product, sales, and customer success teams.
Built cohort dashboards in SQL and BI tools to identify churn risks and improve onboarding decisions.
`;

const jobDescription = `
Senior Product Analyst role requiring SQL, product analytics, experimentation, A/B testing, dashboards, stakeholder management, retention analysis, revenue reporting, customer insights, and cross functional communication.
The candidate should translate data into decisions and improve product growth metrics.
`;

test("creates an evidence-backed application packet", () => {
  const result = createApplicationPacket({
    resumeText,
    targetJobs: [
      {
        title: "Senior Product Analyst",
        company: "Acme",
        description: jobDescription
      }
    ],
    candidatePreferences: {
      location: "Remote",
      salaryGoal: "120000 USD"
    }
  });

  assert.equal(result.service, "Vouch");
  assert.ok(result.packet.fitScoreAfter >= result.packet.fitScoreBefore);
  assert.match(result.packet.atsResume, /Jane Doe/);
  assert.match(result.packet.recruiterSummary, /before-fit score/);
  assert.ok(result.packet.gapBenchmark.some((gap) => gap.requirement === "stakeholder management"));
  assert.match(result.packet.salaryPositioning.caveat, /does not provide live compensation/);
});

test("keeps missing requirements as gaps instead of claiming them", () => {
  const result = createApplicationPacket({
    resumeText,
    targetJobs: [
      {
        title: "Revenue Analyst",
        description:
          "Revenue Analyst role requiring revenue forecasting, pricing analysis, finance dashboards, stakeholder management, SQL, experimentation, and executive recommendations."
      }
    ]
  });

  const missingRevenue = result.packet.gapBenchmark.find((gap) => gap.requirement === "revenue");

  assert.equal(missingRevenue?.status, "missing");
  assert.equal(missingRevenue?.evidence.length, 0);
});
