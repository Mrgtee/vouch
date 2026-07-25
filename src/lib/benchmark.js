import {
  cleanText,
  extractKeywords,
  extractNumbers,
  hasKeyword,
  pickEvidenceLines,
  splitLines,
  splitSentences,
  uniqueKeywords
} from "./text.js";

const SENIORITY_TERMS = [
  "lead",
  "leader",
  "manager",
  "managed",
  "senior",
  "principal",
  "director",
  "strategy",
  "stakeholder",
  "ownership",
  "mentored",
  "built",
  "launched"
];

const IMPACT_TERMS = [
  "improved",
  "increased",
  "decreased",
  "reduced",
  "grew",
  "saved",
  "launched",
  "delivered",
  "automated",
  "optimized",
  "revenue",
  "retention",
  "conversion",
  "pipeline",
  "cost"
];

export function analyzeVouchFit(resumeText, targetJobs) {
  const resumeKeywords = extractKeywords(resumeText, { limit: 72 });
  const resumeNumbers = extractNumbers(resumeText);
  const resumeLines = rankResumeEvidenceLines(resumeText);

  const jobAnalyses = targetJobs.map((job) => analyzeJobFit(job, resumeText, resumeKeywords));
  const combinedJobKeywords = uniqueKeywords(
    jobAnalyses.map((analysis) => analysis.keywords),
    72
  );

  const matchedKeywords = combinedJobKeywords.filter((item) => hasKeyword(resumeText, item.keyword));
  const missingKeywords = combinedJobKeywords.filter((item) => !hasKeyword(resumeText, item.keyword));
  const scoreBefore = scoreFit({
    coverage: weightedCoverage(matchedKeywords, combinedJobKeywords),
    resumeNumbers,
    resumeText,
    resumeLines
  });
  const scoreAfter = scoreAfterOptimization(scoreBefore, matchedKeywords, missingKeywords, resumeLines);

  return {
    resumeKeywords,
    resumeNumbers,
    resumeLines,
    jobAnalyses,
    combinedJobKeywords,
    matchedKeywords,
    missingKeywords,
    scoreBefore,
    scoreAfter,
    gapBenchmark: buildGapBenchmark(resumeText, combinedJobKeywords)
  };
}

function analyzeJobFit(job, resumeText, resumeKeywords) {
  const keywords = extractKeywords(`${job.title}\n${job.description}`, { limit: 42 });
  const matched = keywords
    .filter((item) => hasKeyword(resumeText, item.keyword))
    .map((item) => ({
      ...item,
      evidence: pickEvidenceLines(resumeText, item.keyword, 2)
    }));
  const missing = keywords.filter((item) => !hasKeyword(resumeText, item.keyword));
  const coverage = weightedCoverage(matched, keywords);

  return {
    jobId: job.id,
    title: job.title,
    company: job.company,
    url: job.url,
    coverage,
    keywords,
    matched,
    missing,
    resumeOverlap: resumeKeywords.filter((item) =>
      keywords.some((keyword) => keyword.keyword === item.keyword)
    )
  };
}

function weightedCoverage(matched, total) {
  const totalWeight = total.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  const matchedWeight = matched.reduce((sum, item) => sum + item.weight, 0);
  return Math.round((matchedWeight / totalWeight) * 100);
}

function scoreFit({ coverage, resumeNumbers, resumeText, resumeLines }) {
  const metricScore = Math.min(14, resumeNumbers.length * 3);
  const seniorityScore = Math.min(12, countMatches(resumeText, SENIORITY_TERMS) * 3);
  const impactScore = Math.min(12, countMatches(resumeText, IMPACT_TERMS) * 3);
  const evidenceScore = Math.min(10, resumeLines.length * 2);
  const raw = Math.round(coverage * 0.72 + metricScore + seniorityScore + impactScore + evidenceScore);

  return clamp(raw, 18, 92);
}

function scoreAfterOptimization(scoreBefore, matchedKeywords, missingKeywords, resumeLines) {
  const provenKeywordLift = Math.min(24, Math.round(matchedKeywords.length * 1.1));
  const structureLift = resumeLines.length >= 6 ? 12 : 7;
  const gapPenalty = Math.min(10, Math.round(missingKeywords.length * 0.2));

  return clamp(scoreBefore + provenKeywordLift + structureLift - gapPenalty, scoreBefore, 96);
}

function buildGapBenchmark(resumeText, keywords) {
  return keywords.slice(0, 18).map((item) => {
    const evidence = pickEvidenceLines(resumeText, item.keyword, 2);
    const status = evidence.length > 0 ? classifyEvidence(evidence) : "missing";

    return {
      requirement: item.keyword,
      status,
      evidence,
      recommendation:
        status === "missing"
          ? `Add credible proof for ${item.keyword} through a project, metric, tool, or role example.`
          : `Keep ${item.keyword} visible in the top summary and experience bullets.`
    };
  });
}

function classifyEvidence(evidence) {
  const text = evidence.join(" ").toLowerCase();
  if (extractNumbers(text).length > 0 || countMatches(text, IMPACT_TERMS) >= 2) {
    return "strong";
  }

  return "present";
}

export function rankResumeEvidenceLines(resumeText) {
  return splitLines(resumeText)
    .map((line) => ({
      line: cleanText(line),
      score: evidenceLineScore(line)
    }))
    .filter((item) => item.line.length >= 24)
    .sort((a, b) => b.score - a.score || b.line.length - a.line.length)
    .slice(0, 10)
    .map((item) => item.line);
}

export function inferCandidateName(resumeText) {
  const firstLine = splitLines(resumeText)[0] ?? "Candidate";
  const withoutEmail = firstLine.replace(/\b\S+@\S+\b/g, " ");
  const primarySegment = withoutEmail.split(/[|,;•]/)[0] ?? withoutEmail;
  const cleaned = primarySegment.replace(/[^a-zA-Z .'-]/g, " ").replace(/\s+/g, " ").trim();

  if (!cleaned || cleaned.length > 60 || cleaned.split(/\s+/).length > 5) {
    return "Candidate";
  }

  return cleaned;
}

export function inferTargetHeadline(targetJobs) {
  const titles = targetJobs.map((job) => job.title).filter(Boolean);
  if (titles.length === 0) {
    return "Target Role Candidate";
  }

  const firstTitle = titles[0];
  const sharedTitle = titles.every((title) => title.toLowerCase() === firstTitle.toLowerCase());
  return sharedTitle ? `${firstTitle} Candidate` : `${firstTitle} / Related Roles Candidate`;
}

export function summarizeResumeProfile(resumeText) {
  return splitSentences(resumeText)
    .filter((sentence) => sentence.length <= 220)
    .slice(0, 5);
}

function evidenceLineScore(line) {
  const text = cleanText(line).toLowerCase();
  const numbers = extractNumbers(text).length;
  const impact = countMatches(text, IMPACT_TERMS);
  const seniority = countMatches(text, SENIORITY_TERMS);
  const lengthScore = text.length > 70 ? 2 : 0;

  return numbers * 4 + impact * 3 + seniority * 2 + lengthScore;
}

function countMatches(value, terms) {
  return terms.reduce((count, term) => (hasKeyword(value, term) ? count + 1 : count), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
