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


const amaraResumeText = `
Amara Okafor | Customer Operations Lead | amara.okafor@example.com
Summary: Customer operations lead with 8 years improving support workflows, onboarding playbooks, fraud-review handoffs, and customer success operations for fintech teams. Experienced in Zendesk, Salesforce, SQL, Looker, Stripe, and AI-assisted macros.
Experience:
Customer Operations Lead at PayPilot (2022 - Present): Led 18 support specialists across Lagos and remote teams. Reduced first-response time by 42% by redesigning Zendesk routing, operating playbooks, and QA scorecards. Partnered with product and engineering to launch AI-assisted ticket summaries and fraud-review escalation workflows. Built SQL dashboards to measure operational impact and executive service metrics.
Support Operations Manager at NovaPay (2018 - 2022): Improved onboarding completion by 24%, reduced manual refund review by 31%, and coordinated compliance-sensitive launches across support, risk, and product.
Skills: Customer support operations, support tooling, Zendesk, Salesforce, SQL, Looker, Stripe, fraud review, playbooks, AI-assisted macros, stakeholder management.
`;

const stripeCustomerOpsJobDescription = `
AI Customer Operations Lead role at Stripe. Own global customer support operations, launch AI-powered support workflows, define agent productivity metrics, partner with product and engineering on support tooling, manage compliance-sensitive launches, improve fraud-review handoffs, build clear operating playbooks, and present operational impact to executives.
`;

test("polishes customer operations labels for the Stripe paid flow", () => {
  const result = createApplicationPacket({
    resumeText: amaraResumeText,
    targetJobs: [
      {
        title: "AI Customer Operations Lead",
        company: "Stripe",
        description: stripeCustomerOpsJobDescription
      }
    ],
    candidatePreferences: {
      location: "Remote or Lagos",
      salaryGoal: "180000 USD total compensation",
      seniority: "executive"
    }
  });

  const packet = result.packet;
  const labels = packet.gapBenchmark.map((gap) => gap.label || gap.requirement);
  const userFacing = [
    packet.atsResume,
    packet.recruiterSummary,
    packet.applicationStrategy.portfolioPriority,
    ...packet.interviewPrep.map((item) => item.question),
    ...packet.portfolioProjects.map((item) => item.title + " " + item.objective),
    ...labels
  ].join("\n");

  assert.match(packet.atsResume, /^Amara Okafor\nAI Customer Operations Lead/m);
  assert.ok(packet.fitScoreAfter >= packet.fitScoreBefore);
  assert.match(packet.recruiterSummary, /no major proof gap detected/);
  assert.doesNotMatch(packet.recruiterSummary, /highest-risk missing requirement/);
  assert.ok(labels.includes("support operations"));
  assert.ok(labels.includes("operating playbooks"));
  assert.ok(labels.includes("compliance-sensitive launch governance"));
  assert.ok(labels.includes("executive-ready communication"));
  assert.ok(labels.every((label) => !/^(platform|ai-powered|clear|define|global|partner|executives)$/i.test(label)));
  assert.doesNotMatch(userFacing, /Ai-powered proof sprint|Clear proof sprint|Compliance-sensitive proof sprint|Partner proof sprint|Executives proof sprint/i);
  assert.doesNotMatch(packet.atsResume, /Proof to add before submitting: .*(platform|ai-powered|clear|define|global)/i);
  assert.equal(packet.portfolioProjects[0]?.title, "Offer-readiness evidence sprint");
});


const danielResumeText = `
Daniel Hart | Senior Risk Analytics Manager | daniel.hart@example.com
Summary: Financial risk and analytics leader with 9 years of experience across investment banking, market risk, credit risk, model governance, stress testing, and regulatory reporting. Experienced in Python, SQL, Tableau, Snowflake, data controls, model validation, executive risk packs, and cross-functional delivery with compliance, trading, finance, and technology teams.
Experience:
Senior Risk Analytics Manager at Meridian Capital Markets (2022 - Present): Led a 7-person analytics team supporting market and counterparty credit risk for rates and FX desks. Built Python and SQL monitoring that reduced manual VaR exception review time by 36% and improved daily breach escalation accuracy. Partnered with model risk, compliance, and engineering to document controls for AI-assisted anomaly detection in trade surveillance workflows. Presented weekly risk insights to directors and front-office stakeholders.
Risk Analytics Lead at Atlantic Trust Bank (2019 - 2022): Delivered CCAR and stress-testing analytics across wholesale lending portfolios. Improved data reconciliation controls, built Tableau dashboards for credit concentration exposure, and coordinated remediation plans with audit, finance, and technology teams. Reduced month-end reporting defects by 28%.
Quantitative Risk Analyst at Northbridge Securities (2016 - 2019): Built SQL pipelines for PnL attribution, liquidity risk reporting, and scenario analysis. Supported model validation evidence packs and documented assumptions for regulators and internal risk committees.
Skills: Market risk, credit risk, model risk governance, stress testing, CCAR, Basel III, trade surveillance, Python, SQL, Snowflake, Tableau, controls documentation, stakeholder management, executive reporting, regulatory audit readiness.
`;

const goldmanRiskJobDescription = `
Top financial-sector role for a Vice President, AI Risk Strategy and Controls. Own risk governance for AI-enabled trading, credit, and surveillance workflows. Design controls for model monitoring, data quality, explainability, operational risk, and regulatory audit readiness. Partner with trading desks, compliance, model risk, engineering, and data science teams. Build executive reporting, lead cross-functional control remediation, support stress testing, and communicate risk posture to senior leaders and regulators. Requires financial risk domain expertise, Python or SQL fluency, model governance, control design, stakeholder management, and experience delivering audit-ready documentation in a regulated environment.
`;

test("polishes finance and AI risk labels for top financial-sector paid flow", () => {
  const result = createApplicationPacket({
    resumeText: danielResumeText,
    targetJobs: [
      {
        title: "Vice President, AI Risk Strategy and Controls",
        company: "Goldman Sachs",
        description: goldmanRiskJobDescription
      }
    ],
    candidatePreferences: {
      location: "New York or hybrid",
      salaryGoal: "260000 USD total compensation",
      tone: "executive"
    }
  });

  const packet = result.packet;
  const labels = packet.gapBenchmark.map((gap) => gap.label || gap.requirement);
  const portfolioTitles = packet.portfolioProjects.map((item) => item.title);
  const generated = [
    packet.recruiterSummary,
    packet.atsResume.split("TARGET ROLE ALIGNMENT")[1] || "",
    ...packet.interviewPrep.map((item) => item.question),
    ...packet.portfolioProjects.map((item) => item.title + " " + item.objective),
    ...labels
  ].join("\n");

  assert.match(packet.atsResume, /^Daniel Hart\nVice President, AI Risk Strategy and Controls/m);
  assert.ok(packet.fitScoreAfter >= packet.fitScoreBefore);
  assert.ok(labels.includes("risk control design"));
  assert.ok(labels.includes("data quality controls"));
  assert.ok(labels.includes("regulatory audit readiness"));
  assert.ok(labels.includes("AI risk controls"));
  assert.ok(labels.includes("AI explainability controls"));
  assert.ok(labels.includes("data science collaboration"));
  assert.ok(labels.every((label) => !/^(domain|environment|expertise|financial-sector|fluency|posture|regulated|requires|science|support|top|vice|president)$/i.test(label)));
  assert.doesNotMatch(generated, /President proof sprint|Vice proof sprint|Ai-enabled proof sprint|Audit-ready proof sprint|Science proof sprint|Support proof sprint|Top proof sprint/i);
  assert.deepEqual(portfolioTitles, ["AI Explainability Controls proof sprint", "Data Science Collaboration proof sprint"]);
});
