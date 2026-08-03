import {
  analyzeVouchFit,
  inferCandidateName,
  inferTargetHeadline,
  summarizeResumeProfile
} from "./benchmark.js";
import { cleanText, extractNumbers, hasKeyword, pickEvidenceLines } from "./text.js";
import { validateApplicationPacketRequest } from "./validation.js";

const LOW_SIGNAL_GAPS = new Set([
  "agent",
  "analyst",
  "best",
  "build",
  "candidate",
  "clear",
  "collaborate",
  "communication",
  "complex",
  "configure",
  "coordinate",
  "contribute",
  "data",
  "delivery",
  "define",
  "design",
  "does",
  "drive",
  "dependencies",
  "engineer",
  "engineering",
  "environments",
  "features",
  "global",
  "improve",
  "initiatives",
  "management",
  "launches",
  "manage",
  "measure",
  "metrics",
  "model",
  "platform",
  "multi-service",
  "practices",
  "productivity",
  "role",
  "senior",
  "software",
  "specs",
  "translate",
  "write",
  "using",
  "workflows"
]);

const DISPLAY_KEYWORDS = new Map([
  ["agentic", "agentic workflow design"],
  ["agentic automation", "agentic workflow automation"],
  ["agile", "Agile delivery"],
  ["api", "API design and integration"],
  ["api contracts", "API contract collaboration"],
  ["apis", "API design and integration"],
  ["automation", "workflow automation"],
  ["ai-powered", "AI-assisted support automation"],
  ["ai operations", "AI operations product strategy"],
  ["backend systems", "backend systems"],
  ["bi dashboards", "BI dashboards"],
  ["ci/cd", "CI/CD automation"],
  ["compliance-sensitive", "compliance-sensitive launch governance"],
  ["compliance-sensitive launch governance", "compliance-sensitive launch governance"],
  ["customer", "customer support operations"],
  ["clinical", "clinical stakeholder coordination"],
  ["clinical stakeholder coordination", "clinical stakeholder coordination"],
  ["diagnostics", "funnel diagnostics"],
  ["distributed", "distributed systems"],
  ["distributed environments", "distributed systems"],
  ["fintech", "fintech operations"],
  ["fraud", "fraud and risk escalation"],
  ["healthcare", "healthcare domain experience"],
  ["healthcare compliance", "healthcare compliance"],
  ["executive", "executive-ready communication"],
  ["executives", "executive-ready communication"],
  ["github actions", "GitHub Actions CI/CD"],
  ["impact", "measurable impact"],
  ["launch", "launch governance"],
  ["launch governance", "launch governance"],
  ["operational impact", "operational impact measurement"],
  ["lead", "team leadership"],
  ["llm", "LLM integration"],
  ["llm apis", "LLM API integration"],
  ["microservices", "microservices architecture"],
  ["microservices architecture", "microservices architecture"],
  ["openai", "OpenAI API integration"],
  ["openai apis", "OpenAI API integration"],
  ["operations", "support operations"],
  ["partner", "product-engineering partnership"],
  ["partnership", "product-engineering partnership"],
  ["product-engineering partnership", "product-engineering partnership"],
  ["product", "product strategy"],
  ["product management", "product management"],
  ["product operations", "product operations"],
  ["operating playbooks", "operating playbooks"],
  ["playbook", "operating playbooks"],
  ["playbooks", "operating playbooks"],
  ["product specs", "product specification writing"],
  ["pipelines", "delivery pipelines"],
  ["react", "React frontends"],
  ["react frontends", "React frontends"],
  ["requirements definition", "requirements definition"],
  ["support operations", "support operations"],
  ["roadmap ownership", "roadmap ownership"],
  ["sql", "SQL"],
  ["stakeholder", "stakeholder communication"],
  ["stakeholder management", "stakeholder management"],
  ["workflow automation", "workflow automation"],
  ["storytelling", "impact storytelling"]
]);

const CANONICAL_KEYWORDS = new Map([
  ["agile roadmaps", "roadmap ownership"],
  ["ai operations", "ai operations"],
  ["ai-assisted", "llm apis"],
  ["ai-assisted macros", "llm apis"],
  ["ai-powered", "llm apis"],
  ["apis", "api"],
  ["api contracts", "api contracts"],
  ["llm apis", "llm apis"],
  ["llm powered", "llm apis"],
  ["llm-powered", "llm apis"],
  ["llm-powered workflow automation", "llm apis"],
  ["llm-assisted", "llm apis"],
  ["llm-assisted support workflows", "llm apis"],
  ["openai", "openai apis"],
  ["openai apis", "openai apis"],
  ["customer support", "support operations"],
  ["customer support operations", "support operations"],
  ["operational impact", "operational impact"],
  ["operational impact measurement", "operational impact"],
  ["genai", "llm apis"],
  ["genai-powered", "llm apis"],
  ["compliance-sensitive launches", "compliance-sensitive launch governance"],
  ["healthcare compliance", "healthcare compliance"],
  ["executive communication", "executive"],
  ["executive-ready communication", "executive"],
  ["executives", "executive"],
  ["generative ai", "llm apis"],
  ["llms", "llm"],
  ["github actions", "ci/cd"],
  ["patient-support", "support operations"],
  ["fraud-review", "fraud"],
  ["fraud review", "fraud"],
  ["fraud-review handoffs", "fraud"],
  ["launch", "launch governance"],
  ["launched", "launch governance"],
  ["launches", "launch governance"],
  ["partner", "product-engineering partnership"],
  ["partnered", "product-engineering partnership"],
  ["partnering", "product-engineering partnership"],
  ["partnership", "product-engineering partnership"],
  ["pipeline", "ci/cd"],
  ["pipelines", "ci/cd"],
  ["microservices", "microservices architecture"],
  ["distributed", "distributed environments"],
  ["react frontends", "react"],
  ["bi dashboards", "dashboards"],
  ["clinical", "clinical stakeholder coordination"],
  ["clinical stakeholders", "clinical stakeholder coordination"],
  ["product management", "product management"],
  ["product operations", "product operations"],
  ["product specs", "product specs"],
  ["requirements", "requirements definition"],
  ["requirements definition", "requirements definition"],
  ["product-engineering partnership", "product-engineering partnership"],
  ["launch governance", "launch governance"],
  ["roadmap", "roadmap ownership"],
  ["roadmaps", "roadmap ownership"]
]);

export function createApplicationPacket(rawPayload) {
  const request = validateApplicationPacketRequest(rawPayload);
  const analysis = analyzeVouchFit(request.resumeText, request.targetJobs);
  const candidateName = inferCandidateName(request.resumeText);
  const targetHeadline = inferTargetHeadline(request.targetJobs);
  const topMatched = selectRequirementKeywords(analysis.matchedKeywords, {
    resumeText: request.resumeText,
    limit: 12
  });
  const topMissing = selectRequirementKeywords(analysis.missingKeywords, {
    resumeText: request.resumeText,
    limit: 8,
    skipPresent: true
  });
  const evidenceBullets = buildEvidenceBullets({
    resumeLines: analysis.resumeLines,
    matchedKeywords: topMatched,
    targetJobs: request.targetJobs
  });
  const beforeAfterBulletImprovements = buildBeforeAfterBulletImprovements({
    resumeLines: analysis.resumeLines,
    matchedKeywords: topMatched,
    targetJobs: request.targetJobs
  });
  const gapBenchmark = buildPremiumGapBenchmark({
    gaps: analysis.gapBenchmark,
    topMissing,
    resumeText: request.resumeText
  });

  return {
    service: "Vouch",
    version: "0.3.3",
    packet: {
      fitScoreBefore: analysis.scoreBefore,
      fitScoreAfter: analysis.scoreAfter,
      atsResume: buildAtsResume({
        candidateName,
        targetHeadline,
        topMatched,
        topMissing,
        evidenceBullets,
        resumeProfile: summarizeResumeProfile(request.resumeText),
        targetJobs: request.targetJobs
      }),
      recruiterSummary: buildRecruiterSummary({
        candidateName,
        targetHeadline,
        request,
        analysis,
        topMatched,
        topMissing,
        evidenceBullets
      }),
      mockRecruiterScreen: buildMockRecruiterScreen({
        analysis,
        topMatched,
        topMissing,
        evidenceBullets,
        targetJobs: request.targetJobs
      }),
      interviewPrep: buildInterviewPrep({
        matchedKeywords: topMatched,
        missingKeywords: topMissing,
        targetJobs: request.targetJobs
      }),
      beforeAfterBulletImprovements,
      portfolioProjects: buildPortfolioProjects(topMissing, request.targetJobs),
      salaryPositioning: buildSalaryPositioning({
        preferences: request.candidatePreferences,
        analysis,
        topMatched,
        topMissing,
        targetJobs: request.targetJobs
      }),
      applicationStrategy: buildApplicationStrategy({
        candidateName,
        targetJobs: request.targetJobs,
        topMatched,
        topMissing,
        evidenceBullets
      }),
      gapBenchmark,
      jobBreakdown: analysis.jobAnalyses.map((job) => ({
        jobId: job.jobId,
        title: job.title,
        company: job.company,
        url: job.url,
        coverage: job.coverage,
        matchedKeywords: selectRequirementKeywords(job.matched, {
          resumeText: request.resumeText,
          limit: 10
        }),
        missingKeywords: selectRequirementKeywords(job.missing, {
          resumeText: request.resumeText,
          limit: 10,
          skipPresent: true
        })
      })),
      integrityNotes: [
        "Vouch only rewrites from supplied candidate evidence.",
        "Missing requirements are marked as gaps rather than fabricated experience.",
        "Resume bullets preserve candidate-provided facts while improving framing and relevance.",
        "Salary positioning is directional and should be checked against current local compensation data."
      ]
    }
  };
}

function selectRequirementKeywords(items, { resumeText = "", limit = 10, skipPresent = false } = {}) {
  const selected = [];
  const seen = new Set();

  for (const item of items) {
    const canonical = canonicalKeyword(item.keyword ?? item);
    if (!canonical || LOW_SIGNAL_GAPS.has(canonical) || seen.has(canonical)) {
      continue;
    }

    if (skipPresent && hasKeyword(resumeText, canonical)) {
      // Do not list a requirement as missing when variant matching finds resume evidence.
      continue;
    }

    seen.add(canonical);
    selected.push(canonical);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function buildAtsResume({
  candidateName,
  targetHeadline,
  topMatched,
  topMissing,
  evidenceBullets,
  resumeProfile,
  targetJobs
}) {
  const targetJob = targetJobs[0] ?? {};
  const proofSummary = buildProofSummary(topMatched, topMissing);
  const profileLines = resumeProfile
    .filter((line) => !line.includes("@"))
    .map(cleanProfileLine)
    .filter(Boolean)
    .slice(0, 2);

  return [
    candidateName,
    targetHeadline.replace(/ Candidate$/, ""),
    "",
    "SUMMARY",
    `${targetHeadline.replace(/ Candidate$/, "")} with ${proofSummary}.`,
    ...profileLines,
    "",
    "CORE SKILLS",
    formatList(topMatched.slice(0, 10)) || "Role-relevant execution, delivery ownership, and measurable impact",
    "",
    "SELECTED EXPERIENCE",
    ...evidenceBullets.slice(0, 5).map((bullet) => `- ${bullet}`),
    "",
    "TARGET ROLE ALIGNMENT",
    `Target role: ${targetJob.company ? `${targetJob.company} ` : ""}${targetJob.title || "Target role"}.`,
    `Strongest proof to lead with: ${formatList(topMatched.slice(0, 6)) || "verified delivery evidence"}.`,
    `Proof to add before submitting: ${formatList(topMissing.slice(0, 5)) || "no major proof gap detected"}.`
  ].filter(Boolean).join("\n");
}

function buildProofSummary(topMatched, topMissing) {
  const strongest = formatList(topMatched.slice(0, 5));
  const gaps = formatList(topMissing.slice(0, 3));

  if (strongest && gaps) {
    return `verified evidence in ${strongest}; remaining proof gaps are ${gaps}`;
  }

  if (strongest) {
    return `verified evidence in ${strongest}`;
  }

  return "a resume that needs more role-specific evidence before submission";
}

function buildEvidenceBullets({ resumeLines, matchedKeywords, targetJobs }) {
  const targetTitle = targetJobs[0]?.title || "the target role";
  const usefulLines = resumeLines
    .filter((line) => isUsefulExperienceLine(line))
    .slice(0, 6);
  const sourceLines = usefulLines.length > 0 ? usefulLines : resumeLines.slice(0, 4);
  const bullets = sourceLines.map((line) => toEvidenceBullet(line, matchedKeywords, targetTitle));

  if (bullets.length > 0) {
    return bullets;
  }

  return [
    `Add evidence-backed bullets tied to ${targetTitle}; do not submit a generic resume.`,
    "Quantify scope, tools, team size, systems owned, and business outcome wherever the source resume supports it."
  ];
}

function buildBeforeAfterBulletImprovements({ resumeLines, matchedKeywords, targetJobs }) {
  const targetTitle = targetJobs[0]?.title || "the target role";
  const lines = resumeLines
    .filter((line) => isUsefulExperienceLine(line))
    .slice(0, 4);

  return lines.map((line) => {
    const improvedBullet = toEvidenceBullet(line, matchedKeywords, targetTitle);
    const tags = evidenceTagsForLine(line, matchedKeywords).slice(0, 3);

    return {
      before: cleanResumeLine(line),
      after: improvedBullet,
      whyItWorks: tags.length > 0
        ? `Connects supplied evidence to ${formatList(tags)} without inventing unsupported claims.`
        : "Turns a raw responsibility into a clearer result-oriented application bullet.",
      evidenceUsed: meaningfulNumbers(line).length > 0
        ? `Uses supplied metric(s): ${meaningfulNumbers(line).join(", ")}.`
        : "Uses supplied resume facts; add a verified outcome metric if the candidate can provide one."
    };
  });
}

function isUsefulExperienceLine(line) {
  const text = cleanText(line).toLowerCase();
  if (!text || text.includes("@")) {
    return false;
  }

  if (/^(summary|skills)\s*:/.test(text)) {
    return false;
  }

  return /(led|lead|managed|built|fixed|set up|moved|reduced|improved|started|launched|owned|created|delivered|automated|designed|implemented)/i.test(text);
}

function toEvidenceBullet(line, matchedKeywords, targetTitle) {
  const cleaned = cleanResumeLine(line);
  const tags = evidenceTagsForLine(cleaned, matchedKeywords).slice(0, 3);
  const hasMetric = extractNumbers(cleaned).length > 0;
  const relevance = tags.length > 0
    ? ` Shows ${formatList(tags)} evidence for ${targetTitle}.`
    : ` Aligns to ${targetTitle}; add verified tools, scope, and outcome if available.`;
  const metricCue = hasMetric ? "" : " Add a verified metric before final submission if possible.";

  return `${ensureTerminalPunctuation(cleaned)}${relevance}${metricCue}`;
}

function cleanResumeLine(line) {
  return cleanText(line)
    .replace(/^[-*•]\s*/, "")
    .replace(/^Experience:\s*/i, "")
    .replace(/^Summary:\s*/i, "")
    .replace(/\bI have over\b/gi, "")
    .replace(/\bI focus on\b/gi, "Focused on")
    .replace(/\bI like working with\b/gi, "Hands-on with")
    .replace(/\bI have led\b/gi, "Led")
    .replace(/\bdo full-stack work\b/gi, "full-stack delivery")
    .replace(/\bWe moved\b/g, "Moved")
    .replace(/\bIt made the site faster\b/g, "Improved site performance")
    .replace(/\bIt made\b/g, "Improved")
    .replace(/\bI also started adding\b/g, "Started adding")
    .replace(/\bour platform\b/gi, "the platform")
    .replace(/\bour server bill\b/gi, "server bill")
    .replace(/\bour customer support chatbot\b/gi, "customer support chatbot")
    .replace(/\bbut full-stack delivery\b/gi, "and full-stack delivery")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanProfileLine(line) {
  const cleaned = cleanResumeLine(line);
  return cleaned
    .replace(/^I\s+/i, "")
    .replace(/^have\s+/i, "")
    .replace(/^over\s+(\d+)/i, "$1+")
    .trim();
}

function meaningfulNumbers(value) {
  return extractNumbers(value).filter((number) => !/^20\d{2}$/.test(number));
}

function evidenceTagsForLine(line, matchedKeywords) {
  return matchedKeywords
    .filter((keyword) => hasKeyword(line, keyword))
    .map(displayKeyword)
    .filter(Boolean);
}

function buildRecruiterSummary({ candidateName, targetHeadline, request, analysis, topMatched, topMissing, evidenceBullets }) {
  const targetCompanies = request.targetJobs
    .map((job) => job.company)
    .filter(Boolean)
    .join(", ");
  const decision = screenDecision(analysis.scoreAfter);
  const strongestBullet = evidenceBullets[0] || "No single high-confidence proof bullet was found.";

  const mainRisk = formatList(topMissing.slice(0, 5));
  const recommendation = mainRisk
    ? "Recommendation: submit after the candidate verifies every rewritten bullet and adds proof for the highest-risk missing requirement."
    : "Recommendation: submit after a final truth check on the rewritten bullets, metrics, and role-specific positioning.";

  return [
    `${candidateName} is a ${decision.toLowerCase()} for ${targetHeadline.replace(/ Candidate$/, "")} with a before-fit score of ${analysis.scoreBefore} and optimized-fit score of ${analysis.scoreAfter}.`,
    `Best submission angle: ${formatList(topMatched.slice(0, 6)) || "clearer role-specific evidence is needed"}.`,
    targetCompanies ? `Target company reviewed: ${targetCompanies}.` : "Target company was not specified.",
    `Strongest evidence to put near the top: ${strongestBullet}`,
    `Main risk to handle honestly: ${mainRisk || "no major proof gap detected"}.`,
    recommendation
  ].join("\n");
}

function buildMockRecruiterScreen({ analysis, topMatched, topMissing, evidenceBullets, targetJobs }) {
  return {
    decision: screenDecision(analysis.scoreAfter),
    beforeScore: analysis.scoreBefore,
    afterScore: analysis.scoreAfter,
    whyInterview: evidenceBullets.slice(0, 4),
    concerns: topMissing.slice(0, 5).map((keyword) => concernForRequirement(keyword)),
    screeningQuestions: topMatched.slice(0, 4).map((keyword) => ({
      topic: displayKeyword(keyword),
      question: matchedScreenQuestion(keyword, targetJobs[0])
    }))
  };
}

function screenDecision(scoreAfter) {
  if (scoreAfter >= 84) {
    return "Likely phone screen";
  }

  if (scoreAfter >= 70) {
    return "Borderline screen with credible targeted edits";
  }

  return "Needs stronger evidence before applying";
}

function concernForRequirement(keyword) {
  return `Add verifiable proof for ${displayKeyword(keyword)} before positioning this as a senior-level strength.`;
}

function matchedScreenQuestion(keyword, targetJob = {}) {
  const label = displayKeyword(keyword);
  const title = targetJob.title || "this role";

  if (canonicalKeyword(keyword) === "llm" || canonicalKeyword(keyword) === "llm apis" || canonicalKeyword(keyword) === "openai apis") {
    return `Describe the LLM or OpenAI API work you shipped. What user workflow, failure mode, and measurable outcome did you own?`;
  }

  if (canonicalKeyword(keyword) === "ci/cd" || canonicalKeyword(keyword) === "pipelines") {
    return `Walk me through the CI/CD pipeline you set up. What changed in release speed, reliability, or developer workflow?`;
  }

  if (canonicalKeyword(keyword) === "microservices architecture" || canonicalKeyword(keyword) === "distributed environments") {
    return `Tell me about the distributed or microservices migration. What boundaries, dependencies, and tradeoffs did you manage?`;
  }

  return `Walk me through your strongest ${label} example for ${title}. What was the problem, tradeoff, and result?`;
}

function buildInterviewPrep({ matchedKeywords, missingKeywords, targetJobs }) {
  const targetTitle = targetJobs[0]?.title || "the target role";
  const coreQuestions = matchedKeywords.slice(0, 5).map((keyword) => ({
    question: matchedScreenQuestion(keyword, targetJobs[0]),
    whyAsked: `The resume has evidence for ${displayKeyword(keyword)}, so the candidate should be ready to defend depth, scope, and tradeoffs.`,
    answerFrame: "Situation, system/workflow, responsibility, tradeoff, measurable result, lesson."
  }));

  const gapQuestions = missingKeywords.slice(0, 4).map((keyword) => ({
    question: `The ${targetTitle} role asks for ${displayKeyword(keyword)}. What adjacent evidence can you show, and what proof sprint will close the gap?`,
    whyAsked: "This is a visible fit gap that may come up in screening.",
    answerFrame: "Name the gap plainly, connect adjacent experience, describe a concrete proof plan, and avoid exaggeration."
  }));

  return [...coreQuestions, ...gapQuestions];
}

function buildPortfolioProjects(missingKeywords, targetJobs) {
  const usefulGaps = missingKeywords.filter((keyword) => !LOW_SIGNAL_GAPS.has(keyword));

  if (usefulGaps.length === 0) {
    return [
      {
        title: "Offer-readiness evidence sprint",
        objective: `Create a concise case study that packages the strongest verified result for ${targetJobs[0].title}.`,
        deliverable: "One-page case study with problem, constraints, operating method, measurable result, and screenshots or sample output.",
        timeline: "2-5 focused hours"
      }
    ];
  }

  return usefulGaps.slice(0, 5).map((keyword) => proofSprintFor(keyword, targetJobs[0]));
}

function proofSprintFor(keyword, targetJob = {}) {
  const title = targetJob.title || "target role";
  const canonical = canonicalKeyword(keyword);

  if (canonical === "agentic" || canonical === "agentic automation") {
    return {
      title: "Agentic workflow proof sprint",
      objective: `Show readiness for ${title} by building a small agent workflow with explicit inputs, tool calls, guardrails, and evaluation notes.`,
      deliverable: "Short repo or gist, architecture note, example run, failure-handling notes, and a one-page case study.",
      timeline: "4-8 focused hours"
    };
  }

  if (canonical === "api" || canonical === "api contracts") {
    return {
      title: "API contract proof sprint",
      objective: `Demonstrate API design judgment for ${title} with request/response contracts, validation, errors, and integration tests.`,
      deliverable: "OpenAPI-style contract, mock endpoint, test cases, and a case-study paragraph tying it to the target role.",
      timeline: "3-6 focused hours"
    };
  }

  if (canonical === "automation" || canonical === "ci/cd") {
    return {
      title: "Automation reliability proof sprint",
      objective: `Show automation depth for ${title} with a workflow that reduces manual release or support effort.`,
      deliverable: "Workflow diagram, config sample, before/after manual steps, and a measurable success criterion.",
      timeline: "3-6 focused hours"
    };
  }

  return {
    title: `${titleCase(keyword)} proof sprint`,
    objective: `Create a focused artifact that demonstrates ${displayKeyword(keyword)} for ${title}.`,
    deliverable: "One-page case study with problem, method, tools, result, and screenshots or sample output.",
    timeline: "2-5 focused hours"
  };
}

function buildSalaryPositioning({ preferences, analysis, topMatched, topMissing, targetJobs }) {
  const target = targetJobs[0] ?? {};
  const targetLabel = [target.company, target.title].filter(Boolean).join(" ") || "the target role";
  const alignment = analysis.scoreAfter >= 82 ? "strong" : analysis.scoreAfter >= 70 ? "moderate" : "developing";
  const topLeverage = formatList(topMatched.slice(0, 4)) || "verified delivery evidence";
  const risk = formatList(topMissing.slice(0, 3)) || "no major proof gap";

  return {
    location: preferences.location || "Not specified",
    salaryGoal: preferences.salaryGoal || "Not specified",
    positioning: preferences.salaryGoal
      ? `Use ${preferences.salaryGoal} as an internal anchor only after checking current market data for ${targetLabel}, level, location, and total rewards.`
      : `Set a target range after checking current market data for ${targetLabel}, level, location, and total rewards.`,
    leverage: `Negotiation leverage is ${alignment}: lead with ${topLeverage}.`,
    proofNeededBeforeTopOfRange: risk === "no major proof gap"
      ? "Keep metrics and scope visible in the first half of the resume."
      : `Strengthen proof for ${risk} before pushing for the top of range.`,
    negotiationScript: `I am most interested in a scope-appropriate package for ${target.title || "this role"}. The strongest match I bring is ${topLeverage}, and I would like to align level and compensation to that impact.`,
    caveat: "Vouch does not provide live compensation data in this MVP. Validate ranges externally before negotiating."
  };
}

function buildApplicationStrategy({ candidateName, targetJobs, topMatched, topMissing, evidenceBullets }) {
  const target = targetJobs[0] ?? {};
  const targetLabel = [target.company, target.title].filter(Boolean).join(" ") || "the target role";
  const topGap = topMissing[0];
  const strongest = evidenceBullets[0] || "the strongest verified resume accomplishment";

  return {
    firstWeekActions: [
      `Put this proof near the top of the resume: ${strongest}`,
      topGap
        ? `Create or add a credible proof artifact for ${displayKeyword(topGap)} before submitting.`
        : "Run a final truth check on every rewritten bullet before submitting.",
      `Tailor the recruiter note specifically to ${targetLabel}, not a generic senior engineering role.`
    ],
    recruiterMessage: `${candidateName} is applying for ${targetLabel}. The clearest fit signal is ${formatList(topMatched.slice(0, 4)) || "verified delivery evidence"}; the packet also calls out remaining proof gaps honestly.`,
    portfolioPriority: topGap
      ? `Prioritize this proof sprint: ${displayKeyword(topGap)}.`
      : "Prioritize a concise case study around the strongest measured delivery result.",
    riskWarnings: [
      "Do not add tools, metrics, employers, or certifications that are not present in the supplied resume.",
      "Do not treat missing proof as experience; label it as a proof sprint or interview preparation topic.",
      "Validate compensation data externally before using salary positioning in negotiation."
    ]
  };
}

function buildPremiumGapBenchmark({ gaps, topMissing, resumeText }) {
  const byRequirement = new Map();

  for (const gap of gaps) {
    const requirement = canonicalKeyword(gap.requirement);
    if (!requirement || LOW_SIGNAL_GAPS.has(requirement) || byRequirement.has(requirement)) {
      continue;
    }

    const evidence = Array.isArray(gap.evidence) ? gap.evidence : [];
    const canonicalEvidence = evidence.length > 0 ? evidence : pickEvidenceLines(resumeText, requirement, 2);
    byRequirement.set(requirement, {
      requirement,
      label: displayKeyword(requirement),
      status: canonicalEvidence.length > 0 ? (evidence.length > 0 ? gap.status : "present") : "missing",
      evidence: canonicalEvidence,
      recommendation: recommendationForGap(requirement, canonicalEvidence)
    });
  }

  for (const keyword of topMissing) {
    if (!byRequirement.has(keyword)) {
      byRequirement.set(keyword, {
        requirement: keyword,
        label: displayKeyword(keyword),
        status: "missing",
        evidence: [],
        recommendation: recommendationForGap(keyword, [])
      });
    }
  }

  return [...byRequirement.values()].slice(0, 18);
}

function recommendationForGap(requirement, evidence) {
  const label = displayKeyword(requirement);
  if (evidence.length > 0) {
    return `Keep ${label} visible with the strongest supplied evidence; add scope, metric, or architecture detail if the candidate can verify it.`;
  }

  if (requirement === "agentic" || requirement === "agentic automation") {
    return "Build a small agentic workflow proof sprint with tool calls, guardrails, failure handling, and example output.";
  }

  if (requirement === "api" || requirement === "api contracts") {
    return "Add a concrete API example: contract, integration, validation, error handling, or production dependency managed.";
  }

  if (requirement === "agile") {
    return "Add evidence of sprint planning, backlog tradeoffs, ceremonies led, or Agile delivery outcomes if true.";
  }

  return `Add credible proof for ${label} through a project, metric, architecture note, tool, or role example.`;
}

function canonicalKeyword(keyword) {
  const cleaned = cleanText(keyword).toLowerCase();
  return CANONICAL_KEYWORDS.get(cleaned) ?? cleaned;
}

function displayKeyword(keyword) {
  return DISPLAY_KEYWORDS.get(canonicalKeyword(keyword)) ?? cleanText(keyword);
}

function formatList(values) {
  const cleanValues = values
    .map((value) => cleanText(displayKeyword(value)))
    .filter(Boolean);
  const uniqueValues = [...new Set(cleanValues)];

  if (uniqueValues.length === 0) {
    return "";
  }

  if (uniqueValues.length === 1) {
    return uniqueValues[0];
  }

  return `${uniqueValues.slice(0, -1).join(", ")} and ${uniqueValues.at(-1)}`;
}

function titleCase(value) {
  return cleanText(displayKeyword(value))
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ensureTerminalPunctuation(value) {
  const cleaned = cleanText(value);
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}
