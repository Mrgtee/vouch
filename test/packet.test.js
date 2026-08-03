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


const alexResumeText = `
Alex Mercer | Senior Software Engineer | alex.mercer@email.com
Summary: I have over 6 years of experience building web apps. I focus on backend systems but do full-stack work. I like working with Node.js, Python, React, and AWS. I have led teams and want to work on AI/LLM integrations now.
Experience:
Lead Engineer at CloudScale Tech (2023 - Present): Managed a team of 4 developers. We moved our platform to a microservices architecture on AWS. It made the site faster and reduced our server bill by 25%. I also started adding LLM features to our customer support chatbot using OpenAI APIs.
Software Engineer at DevLaunch Corp (2020 - 2023): Built web features using React and Node.js. Fixed legacy bugs which reduced user drop-offs. Set up CI/CD pipelines using GitHub Actions to deploy code automatically.
Skills: JavaScript, TypeScript, Python, Node.js, React, AWS, Docker, Git, CI/CD, SQL, Prompt Engineering.
`;

const visaJobDescription = `
Design and build GenAI-powered features, workflows, and agentic automation using LLM APIs. Manage complex, multi-service dependencies across distributed environments. Contribute to React frontends and collaborate on API contracts. Configure CI/CD pipelines and drive engineering best practices within an Agile delivery model.
`;

test("creates a premium local packet for the Alex/Visa paid flow", () => {
  const result = createApplicationPacket({
    resumeText: alexResumeText,
    targetJobs: [
      {
        title: "Senior Software Engineer",
        company: "Visa",
        url: "https://visa.example/job",
        description: visaJobDescription
      }
    ]
  });

  const packet = result.packet;
  const requirements = packet.gapBenchmark.map((gap) => gap.requirement);
  const joinedQuestions = packet.interviewPrep.map((item) => item.question).join("\n");

  assert.match(packet.atsResume, /^Alex Mercer\nSenior Software Engineer/m);
  assert.doesNotMatch(packet.atsResume, /\bCandidate\b\nSenior Software Engineer Candidate/);
  assert.doesNotMatch(packet.atsResume, /used engineer|reinforcing engineer|Improved the site faster|our server bill/i);
  assert.match(packet.atsResume, /CI\/CD automation/);
  assert.match(packet.atsResume, /LLM API integration/);
  assert.match(packet.atsResume, /React frontends/);
  assert.ok(packet.beforeAfterBulletImprovements.length >= 2);
  assert.ok(packet.beforeAfterBulletImprovements.every((item) => item.after.length > item.before.length));
  assert.equal(requirements.includes("api") && requirements.includes("apis"), false);
  assert.ok(requirements.includes("api contracts"));
  assert.doesNotMatch(joinedQuestions, /used engineer|used engineering/);
  assert.match(packet.applicationStrategy.recruiterMessage, /Visa Senior Software Engineer/);
  assert.match(packet.salaryPositioning.negotiationScript, /CI\/CD automation|LLM API integration|React frontends/);
});


const ninaResumeText = `
Nina Adeyemi | Product Operations Lead | nina.adeyemi@example.com
Summary: I have 7 years of experience leading product operations, workflow automation, and healthcare SaaS programs. I work closely with engineering, design, support, and compliance teams. I use SQL, Looker, Jira, Zendesk, Salesforce, and light Python scripting to improve operational workflows.
Experience:
Product Operations Lead at CareLoop Health (2022 - Present): Owned the intake triage platform for patient-support operations. Reduced manual review time by 38% by redesigning routing rules, creating SQL dashboards, and improving escalation workflows. Partnered with engineering to define API handoff requirements for a scheduling partner integration. Piloted AI-assisted ticket summaries with compliance review before rollout.
Senior Product Analyst at MedBridge Labs (2019 - 2022): Built cohort reporting in Looker, ran product experiments, documented operating playbooks, and improved new-user activation by 14%. Coordinated Agile backlog grooming with design and engineering for analytics, onboarding, and support tooling.
Skills: Product strategy, SQL, Looker, Jira, workflow automation, API requirements, healthcare compliance, Zendesk, Salesforce, stakeholder management, experimentation.
`;

const horizonJobDescription = `
Lead AI operations product initiatives for a healthcare platform. Define requirements for LLM-powered workflow automation, partner with engineering on API contracts, measure operational impact with SQL and BI dashboards, manage Agile roadmaps, write product specs, coordinate clinical and compliance stakeholders, and improve patient-support agent productivity.
`;

test("polishes local packet labels for healthcare product operations flow", () => {
  const result = createApplicationPacket({
    resumeText: ninaResumeText,
    targetJobs: [
      {
        title: "Senior Product Manager, AI Operations",
        company: "Horizon Health",
        url: "https://horizon-health.example/jobs/ai-ops-pm",
        description: horizonJobDescription
      }
    ]
  });

  const packet = result.packet;
  const labels = packet.gapBenchmark.map((gap) => gap.label || gap.requirement);
  const userFacing = [
    packet.atsResume,
    packet.recruiterSummary,
    ...packet.interviewPrep.map((item) => item.question),
    ...packet.portfolioProjects.map((item) => item.title + " " + item.objective),
    ...labels
  ].join("\n");

  assert.match(packet.atsResume, /^Nina Adeyemi\nSenior Product Manager, AI Operations/m);
  assert.ok(labels.every((label) => !/^(agent|coordinate|initiatives|llm-powered)$/i.test(label)));
  assert.doesNotMatch(userFacing, /asks for agent\b|Agent proof sprint|Coordinate proof sprint|Initiatives proof sprint|Llm-powered proof sprint/i);
  assert.doesNotMatch(packet.atsResume, /remaining proof gaps are agent, clinical and coordinate/i);
  assert.ok(labels.includes("clinical stakeholder coordination") || labels.includes("LLM API integration"));
  assert.ok(packet.beforeAfterBulletImprovements.length >= 2);
});
