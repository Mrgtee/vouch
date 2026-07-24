import test from "node:test";
import assert from "node:assert/strict";
import {
  getApplicationPacketInputFields,
  getApplicationPacketInputRequiredResponse,
  getApplicationPacketInputSchema
} from "../src/lib/schema.js";

test("exposes OKX-compatible input-required field metadata", () => {
  const response = getApplicationPacketInputRequiredResponse();

  assert.equal(response.error, "input_required");
  assert.equal(response.inputRequired, true);
  assert.deepEqual(response.requiredArgs, ["resumeText", "targetJobs"]);
  assert.deepEqual(
    response.fields.map((field) => field.name),
    ["resumeText", "targetJobs"]
  );
  assert.equal(response.inputSchema.required.includes("resumeText"), true);
  assert.equal(response.inputSchema.required.includes("targetJobs"), true);
});

test("keeps manifest schema and explicit field list aligned", () => {
  const schema = getApplicationPacketInputSchema();
  const fields = getApplicationPacketInputFields();

  assert.deepEqual(
    fields.map((field) => field.name),
    schema.required
  );
});
