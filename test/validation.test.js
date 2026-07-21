import test from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS,
  ValidationError,
  validateApplicationPacketRequest
} from "../src/lib/validation.js";

const resumeText =
  "Jane Doe. Product analyst with SQL dashboards, retention analysis, stakeholder reporting, and experimentation results across product teams.";

const jobDescription =
  "Senior Product Analyst role requiring SQL, product analytics, experimentation, dashboards, retention analysis, stakeholder management, and executive-ready recommendations.";

test("normalizes a valid application packet request", () => {
  const request = validateApplicationPacketRequest({
    resume_text: resumeText,
    target_jobs: [
      {
        title: "Senior Product Analyst",
        company: "Acme",
        url: "https://example.com/job",
        description: jobDescription
      }
    ],
    candidate_preferences: {
      location: "Remote",
      salary_goal: "120000 USD",
      tone: "executive"
    }
  });

  assert.equal(request.resumeText, resumeText);
  assert.equal(request.targetJobs.length, 1);
  assert.equal(request.targetJobs[0].id, "job-1");
  assert.equal(request.candidatePreferences.tone, "executive");
});

test("rejects missing resume and target jobs with field details", () => {
  assert.throws(
    () => validateApplicationPacketRequest({ resumeText: "", targetJobs: [] }),
    (error) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.details[0].field, "resumeText");
      assert.equal(error.details[1].field, "targetJobs");
      return true;
    }
  );
});

test("rejects more than three target jobs", () => {
  const jobs = Array.from({ length: LIMITS.maxJobs + 1 }, (_, index) => ({
    title: `Role ${index + 1}`,
    description: jobDescription
  }));

  assert.throws(
    () => validateApplicationPacketRequest({ resumeText, targetJobs: jobs }),
    /Vouch could not create the application packet/
  );
});
