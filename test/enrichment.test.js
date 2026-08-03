import test from "node:test";
import assert from "node:assert/strict";
import {
  extractReadablePageText,
  fetchJobUrlText,
  prepareApplicationPacketPayload
} from "../src/lib/enrichment.js";

test("extracts readable text from a job page", () => {
  const text = extractReadablePageText(`
    <html>
      <head><style>.x{display:none}</style><script>alert("x")</script></head>
      <body>
        <h1>Senior Product Analyst</h1>
        <p>Use SQL, product analytics, experimentation, dashboards, and stakeholder management.</p>
      </body>
    </html>
  `);

  assert.match(text, /Senior Product Analyst/);
  assert.match(text, /product analytics/);
  assert.doesNotMatch(text, /display:none/);
});

test("fills missing job descriptions from a URL fetcher", async () => {
  const payload = await prepareApplicationPacketPayload(
    {
      resumeText:
        "Jane Doe is a product analyst with SQL dashboards, experimentation, and stakeholder reporting experience.",
      targetJobs: [
        {
          title: "Senior Product Analyst",
          url: "https://example.com/job"
        }
      ]
    },
    {
      fetchJobUrls: true,
      fetcher: async () =>
        "Senior Product Analyst role requiring SQL, product analytics, experimentation, dashboards, retention analysis, revenue reporting, and stakeholder management."
    }
  );

  assert.match(payload.targetJobs[0].description, /retention analysis/);
  assert.equal(payload.targetJobs[0].source.fetchedJobUrl, "https://example.com/job");
});

test("does not fetch when description is already present", async () => {
  let calls = 0;
  const payload = await prepareApplicationPacketPayload(
    {
      resumeText:
        "Jane Doe is a product analyst with SQL dashboards, experimentation, and stakeholder reporting experience.",
      targetJobs: [
        {
          title: "Senior Product Analyst",
          url: "https://example.com/job",
          description:
            "Senior Product Analyst role requiring SQL, product analytics, experimentation, dashboards, retention analysis, revenue reporting, and stakeholder management."
        }
      ]
    },
    {
      fetchJobUrls: true,
      fetcher: async () => {
        calls += 1;
        return "Should not be used.";
      }
    }
  );

  assert.equal(calls, 0);
  assert.match(payload.targetJobs[0].description, /product analytics/);
});


test("blocks private network job URLs before fetching", async () => {
  await assert.rejects(
    fetchJobUrlText("http://127.0.0.1/job", {
      fetcher: async () => new Response("should not fetch"),
      lookup: async () => [{ address: "127.0.0.1" }]
    }),
    /host is not allowed/
  );
});

test("blocks redirects to private network job URLs", async () => {
  await assert.rejects(
    fetchJobUrlText("https://jobs.example.test/role", {
      lookup: async () => [{ address: "93.184.216.34" }],
      fetcher: async () =>
        new Response("", {
          status: 302,
          headers: { location: "http://127.0.0.1/internal" }
        })
    }),
    /host is not allowed/
  );
});


test("blocks hostnames with any private DNS answer before fetching", async () => {
  let fetched = false;

  await assert.rejects(
    fetchJobUrlText("https://jobs.example.test/role", {
      lookup: async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.8", family: 4 }
      ],
      fetcher: async () => {
        fetched = true;
        return new Response("should not fetch");
      }
    }),
    /host is not allowed/
  );
  assert.equal(fetched, false);
});
