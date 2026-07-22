import {
  analyzeVouchFit,
  inferCandidateName,
  inferTargetHeadline,
  summarizeResumeProfile
} from "./benchmark.js";
import { cleanText } from "./text.js";
import { validateApplicationPacketRequest } from "./validation.js";

const LOW_SIGNAL_GAPS = new Set([
  "analyst",
  "candidate",
  "data",
  "improve",
  "management",
  "metrics",
  "role",
  "senior",
  "translate"
]);

const DISPLAY_KEYWORDS = new Map([
  ["diagnostics", "funnel diagnostics"],
  ["executive", "executive-ready communication"],
  ["impact", "measurable impact"],
  ["sql", "SQL"],
  ["stakeholder", "stakeholder communication"],
  ["storytelling", "impact storytelling"]
]);

export function createApplicationPacket(rawPayload) {
  const request = validateApplicationPacketRequest(rawPayload);
  const analysis = analyzeVouchFit(request.resumeText, request.targetJobs);
  const candidateName = inferCandidateName(request.resumeText);
  const targetHeadline = inferTargetHeadline(request.targetJobs);
  const topMatched = selectTopMatchedKeywords(analysis.matchedKeywords);
  const topMissing = analysis.missingKeywords
    .filter((item) => !LOW_SIGNAL_GAPS.has(item.keyword))
    .slice(0, 10)
    .map((item) => item.keyword);
  const evidenceBullets = buildEvidenceBullets(analysis.resumeLines, analysis.matchedKeywords);

  return {
    service: "Vouch",
    version: "0.3.1",
    packet: {
      fitScoreBefore: analysis.scoreBefore,
      fitScoreAfter: analysis.scoreAfter,
      atsResume: buildAtsResume({
        candidateName,
        targetHeadline,
        topMatched,
        topMissing,
        evidenceBullets,
        resumeProfile: summarizeResumeProfile(request.resumeText)
      }),
      recruiterSummary: buildRecruiterSummary({
        candidateName,
        targetHeadline,
        request,
        analysis,
        topMatched,
        topMissing
      }),
      mockRecruiterScreen: buildMockRecruiterScreen({
        analysis,
        topMatched,
        topMissing,
        evidenceBullets
      }),
      interviewPrep: buildInterviewPrep(analysis, request.targetJobs),
      portfolioProjects: buildPortfolioProjects(topMissing, request.targetJobs),
      salaryPositioning: buildSalaryPositioning(request.candidatePreferences, analysis),
      gapBenchmark: analysis.gapBenchmark.filter((gap) => !LOW_SIGNAL_GAPS.has(gap.requirement)),
      jobBreakdown: analysis.jobAnalyses.map((job) => ({
        jobId: job.jobId,
        title: job.title,
        company: job.company,
        url: job.url,
        coverage: job.coverage,
        matchedKeywords: job.matched.slice(0, 10).map((item) => item.keyword),
        missingKeywords: job.missing.slice(0, 10).map((item) => item.keyword)
      })),
      integrityNotes: [
        "Vouch only rewrites from supplied candidate evidence.",
        "Missing requirements are marked as gaps rather than fabricated experience.",
        "Salary positioning is directional and should be checked against current local compensation data."
      ]
    }
  };
}

function selectTopMatchedKeywords(matchedKeywords) {
  const useful = matchedKeywords.filter((item) => !LOW_SIGNAL_GAPS.has(item.keyword));
  const selected = useful.length >= 4 ? useful : matchedKeywords;
  return selected.slice(0, 14).map((item) => item.keyword);
}

function buildAtsResume({
  candidateName,
  targetHeadline,
  topMatched,
  topMissing,
  evidenceBullets,
  resumeProfile
}) {
  const summary = [
    `${candidateName}`,
    targetHeadline,
    "",
    "SUMMARY",
    `Evidence-backed ${targetHeadline.toLowerCase()} with demonstrated strengths in ${formatList(
      topMatched.slice(0, 6)
    ) || "role-relevant execution"}.`,
    ...resumeProfile.slice(0, 2),
    "",
    "CORE SKILLS",
    formatList(topMatched.slice(0, 12)) || "Add role-specific skills from verified experience.",
    "",
    "SELECTED EXPERIENCE",
    ...evidenceBullets.map((bullet) => `- ${bullet}`),
    "",
    "ROLE ALIGNMENT",
    `Strongest signals: ${formatList(topMatched.slice(0, 8)) || "Add stronger evidence."}`,
    `Gaps to address honestly: ${formatList(topMissing.slice(0, 6)) || "No major gaps detected."}`
  ];

  return summary.join("\n");
}

function buildEvidenceBullets(resumeLines, matchedKeywords) {
  const keywordQueue = matchedKeywords.map((item) => item.keyword);
  const bullets = resumeLines.slice(0, 6).map((line, index) => {
    const keyword = keywordQueue[index % Math.max(1, keywordQueue.length)] ?? "target role outcomes";
    return strengthenBullet(line, keyword);
  });

  if (bullets.length > 0) {
    return bullets;
  }

  return [
    "Add measurable evidence from the candidate profile before submitting this resume.",
    "Connect past work directly to the target role requirements without inventing claims."
  ];
}

function strengthenBullet(line, keyword) {
  const cleaned = cleanText(line).replace(/^[-*•]\s*/, "");
  const hasMetric = /\d/.test(cleaned);
  const suffix = hasMetric
    ? `, reinforcing ${displayKeyword(keyword)} for the target role.`
    : `, with clearer proof needed to quantify impact around ${displayKeyword(keyword)}.`;

  if (cleaned.endsWith(".")) {
    return `${cleaned.slice(0, -1)}${suffix}`;
  }

  return `${cleaned}${suffix}`;
}

function buildRecruiterSummary({ candidateName, targetHeadline, request, analysis, topMatched, topMissing }) {
  const targetCompanies = request.targetJobs
    .map((job) => job.company)
    .filter(Boolean)
    .join(", ");

  return [
    `${candidateName} is positioned as a ${targetHeadline.toLowerCase()} with a before-fit score of ${analysis.scoreBefore} and an optimized-fit score of ${analysis.scoreAfter}.`,
    `Most visible strengths: ${formatList(topMatched.slice(0, 7)) || "not enough role evidence yet"}.`,
    targetCompanies ? `Target companies reviewed: ${targetCompanies}.` : "Target companies were not specified.",
    `Primary risks to close: ${formatList(topMissing.slice(0, 5)) || "no obvious keyword gaps"}.`,
    "Recommendation: submit only after the candidate confirms that each revised bullet is true and supported by their real work."
  ].join("\n");
}

function buildMockRecruiterScreen({ analysis, topMatched, topMissing, evidenceBullets }) {
  const decision =
    analysis.scoreAfter >= 82
      ? "Likely phone screen"
      : analysis.scoreAfter >= 68
        ? "Borderline screen with targeted edits"
        : "Needs stronger evidence before applying";

  return {
    decision,
    beforeScore: analysis.scoreBefore,
    afterScore: analysis.scoreAfter,
    whyInterview: evidenceBullets.slice(0, 3),
    concerns: topMissing.slice(0, 5).map((keyword) => `Limited visible proof for ${displayKeyword(keyword)}.`),
    screeningQuestions: topMatched.slice(0, 4).map((keyword) => ({
      topic: keyword,
      question: `Walk me through a specific example where you used ${displayKeyword(keyword)} to create a measurable outcome.`
    }))
  };
}

function buildInterviewPrep(analysis, targetJobs) {
  const matchedQuestionKeywords = analysis.matchedKeywords.filter((item) => !LOW_SIGNAL_GAPS.has(item.keyword));
  const coreQuestions = matchedQuestionKeywords.slice(0, 5).map((item) => ({
    question: `Tell me about a time you used ${displayKeyword(item.keyword)} in a role similar to ${targetJobs[0].title}.`,
    whyAsked: "The resume has evidence for this requirement, so the candidate should be ready to defend it.",
    answerFrame: "Situation, target metric, action taken, tradeoff, result, lesson."
  }));

  const gapQuestions = analysis.missingKeywords
    .filter((item) => !LOW_SIGNAL_GAPS.has(item.keyword))
    .slice(0, 4)
    .map((item) => ({
    question: `This role mentions ${displayKeyword(item.keyword)}. What adjacent experience can you credibly point to?`,
    whyAsked: "This is a visible fit gap that may come up in screening.",
    answerFrame: "Name the gap, connect adjacent experience, describe a fast learning plan, avoid exaggeration."
  }));

  return [...coreQuestions, ...gapQuestions];
}

function buildPortfolioProjects(missingKeywords, targetJobs) {
  const usefulGaps = missingKeywords.filter((keyword) => !LOW_SIGNAL_GAPS.has(keyword));

  if (usefulGaps.length === 0) {
    return [
      {
        title: "Role evidence proof sprint",
        objective: `Create a concise case study that proves readiness for ${targetJobs[0].title}.`,
        deliverable: "One-page case study with problem, method, tools, result, and screenshots or sample output.",
        timeline: "2-5 focused hours"
      }
    ];
  }

  return usefulGaps.slice(0, 5).map((keyword) => ({
    title: `${titleCase(keyword)} proof sprint`,
    objective: `Create a small, public artifact that demonstrates ${displayKeyword(keyword)} for ${targetJobs[0].title}.`,
    deliverable: "One-page case study with problem, method, tools, result, and screenshots or sample output.",
    timeline: "2-5 focused hours"
  }));
}

function buildSalaryPositioning(preferences, analysis) {
  const baseAdvice = preferences.salaryGoal
    ? `Anchor around ${preferences.salaryGoal} only after validating current market ranges for the target location.`
    : "Set a compensation range after checking current market data for title, level, location, and company stage.";

  return {
    location: preferences.location || "Not specified",
    salaryGoal: preferences.salaryGoal || "Not specified",
    positioning: baseAdvice,
    leverage:
      analysis.scoreAfter >= 82
        ? "Strong role alignment gives the candidate room to negotiate on scope, level, and total compensation."
        : "Improve evidence for the missing requirements before using an aggressive compensation anchor.",
    caveat: "Vouch does not provide live compensation data in this MVP."
  };
}

function displayKeyword(keyword) {
  return DISPLAY_KEYWORDS.get(keyword) ?? keyword;
}

function formatList(values) {
  const cleanValues = values.map((value) => cleanText(displayKeyword(value))).filter(Boolean);
  if (cleanValues.length === 0) {
    return "";
  }

  if (cleanValues.length === 1) {
    return cleanValues[0];
  }

  return `${cleanValues.slice(0, -1).join(", ")} and ${cleanValues.at(-1)}`;
}

function titleCase(value) {
  return cleanText(displayKeyword(value))
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
