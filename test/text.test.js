import test from "node:test";
import assert from "node:assert/strict";
import { hasKeyword, pickEvidenceLines } from "../src/lib/text.js";

test("matches common career wording variants", () => {
  const resume = "Product analyst who built SQL dashboards, ran A/B testing, led stakeholder reporting, and used funnel analysis to improve retention.";

  assert.equal(hasKeyword(resume, "product analytics"), true);
  assert.equal(hasKeyword(resume, "dashboarding"), true);
  assert.equal(hasKeyword(resume, "experimentation"), true);
  assert.equal(hasKeyword(resume, "diagnostics"), true);
  assert.equal(hasKeyword(resume, "executive"), true);
});

test("picks evidence through variant matches", () => {
  const lines = pickEvidenceLines(
    "Built cohort dashboards in SQL. Presented retention narrative to stakeholders.",
    "storytelling"
  );

  assert.equal(lines.length, 1);
  assert.match(lines[0], /retention narrative/);
});
