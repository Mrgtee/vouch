import { clampText, cleanText } from "./text.js";

export const LIMITS = {
  maxResumeChars: 60_000,
  maxJobChars: 30_000,
  maxJobs: 3,
  minResumeChars: 80,
  minJobChars: 80
};

const ALLOWED_TONES = new Set(["confident", "concise", "executive", "warm"]);

export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
    this.statusCode = 400;
  }
}

export function validateApplicationPacketRequest(payload) {
  const body = normalizeApplicationPacketRequestPayload(payload);
  const errors = [];
  const resumeText = clampText(body.resumeText ?? body.resume_text, LIMITS.maxResumeChars);

  if (resumeText.length < LIMITS.minResumeChars) {
    errors.push({
      field: "resumeText",
      message: `Resume text must be at least ${LIMITS.minResumeChars} characters.`
    });
  }

  const targetJobsInput = parseStructuredParam(body.targetJobs ?? body.target_jobs);
  if (!Array.isArray(targetJobsInput) || targetJobsInput.length === 0) {
    errors.push({
      field: "targetJobs",
      message: "Provide one to three target jobs."
    });
  }

  const targetJobs = Array.isArray(targetJobsInput)
    ? targetJobsInput.slice(0, LIMITS.maxJobs).map((job, index) => normalizeJob(job, index, errors))
    : [];

  if (Array.isArray(targetJobsInput) && targetJobsInput.length > LIMITS.maxJobs) {
    errors.push({
      field: "targetJobs",
      message: `Vouch accepts up to ${LIMITS.maxJobs} target jobs per packet.`
    });
  }

  const candidatePreferences = normalizePreferences(
    parseStructuredParam(body.candidatePreferences ?? body.candidate_preferences)
  );

  if (errors.length > 0) {
    throw new ValidationError("Vouch could not create the application packet.", errors);
  }

  return {
    resumeText,
    targetJobs,
    candidatePreferences
  };
}

export function normalizeApplicationPacketRequestPayload(payload) {
  const body = toPlainObject(parseStructuredParam(normalizeParamValue(payload)));
  const wrapper = toPlainObject(
    parseStructuredParam(
      normalizeParamValue(
        body.serviceParams ??
          body.service_params ??
          body.arguments ??
          body.args ??
          body.params ??
          body.input ??
          body.body
      )
    )
  );

  if (hasApplicationPacketFields(wrapper)) {
    return {
      ...wrapper,
      ...body
    };
  }

  return body;
}

function parseStructuredParam(value) {
  if (typeof value !== "string") {
    return value;
  }

  const text = value.trim();
  if (!text || !["{", "["].includes(text.at(0))) {
    return value;
  }

  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function normalizeParamValue(value) {
  if (!Array.isArray(value)) {
    return value;
  }

  if (value.length === 1 && typeof value[0] === "string") {
    return normalizeParamValue(value[0]);
  }

  return value.map(normalizeParamValue);
}

function toPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      parseStructuredParam(normalizeParamValue(entryValue))
    ])
  );
}

function hasApplicationPacketFields(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value.resumeText || value.resume_text || value.targetJobs || value.target_jobs)
  );
}

function normalizeJob(job, index, errors) {
  const parsedJob = parseStructuredParam(job);
  const source = parsedJob && typeof parsedJob === "object" ? parsedJob : {};
  const title = cleanText(source.title);
  const company = cleanText(source.company);
  const url = cleanText(source.url);
  const description = clampText(source.description ?? source.jobDescription, LIMITS.maxJobChars);

  if (description.length < LIMITS.minJobChars) {
    errors.push({
      field: `targetJobs.${index}.description`,
      message: `Job ${index + 1} needs at least ${LIMITS.minJobChars} characters of description text.`
    });
  }

  if (url && !isSafeUrl(url)) {
    errors.push({
      field: `targetJobs.${index}.url`,
      message: "Job URL must start with http:// or https://."
    });
  }

  return {
    id: `job-${index + 1}`,
    title: title || `Target job ${index + 1}`,
    company,
    url,
    description
  };
}

function normalizePreferences(preferences) {
  const source = preferences && typeof preferences === "object" ? preferences : {};
  const tone = cleanText(source.tone).toLowerCase();

  return {
    location: cleanText(source.location),
    salaryGoal: cleanText(source.salaryGoal ?? source.salary_goal),
    tone: ALLOWED_TONES.has(tone) ? tone : "confident"
  };
}

function isSafeUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
