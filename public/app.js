const state = {
  packet: null,
  result: null,
  activeTab: "overview"
};

const elements = {
  statusPill: document.querySelector("#statusPill"),
  statusText: document.querySelector("#statusText"),
  resumeText: document.querySelector("#resumeText"),
  resumeFile: document.querySelector("#resumeFile"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  generateButton: document.querySelector("#generateButton"),
  copyJsonButton: document.querySelector("#copyJsonButton"),
  downloadPdfButton: document.querySelector("#downloadPdfButton"),
  downloadDocxButton: document.querySelector("#downloadDocxButton"),
  resultPanel: document.querySelector("#resultPanel"),
  beforeScore: document.querySelector("#beforeScore"),
  afterScore: document.querySelector("#afterScore"),
  scoreFill: document.querySelector("#scoreFill"),
  tabs: [...document.querySelectorAll(".tab")]
};

const sample = {
  resumeText:
    "Jane Doe\nProduct Analyst with 5 years building SQL dashboards, product analytics, A/B testing, stakeholder reporting, and retention experiments.\nImproved activation by 18% and reduced reporting time by 40% by automating weekly KPI reports.\nLed cross functional roadmap reviews with product, sales, and customer success teams.\nBuilt cohort dashboards in SQL and BI tools to identify churn risks and improve onboarding decisions.",
  targetJobs: [
    {
      title: "Senior Product Analyst",
      company: "Acme",
      url: "https://example.com/jobs/senior-product-analyst",
      description:
        "Senior Product Analyst role requiring SQL, product analytics, experimentation, A/B testing, dashboards, stakeholder management, retention analysis, revenue reporting, customer insights, and cross functional communication. The candidate should translate data into decisions and improve product growth metrics."
    },
    {
      title: "Growth Analyst",
      company: "Northstar Labs",
      url: "https://example.com/jobs/growth-analyst",
      description:
        "Growth Analyst needed for lifecycle analytics, funnel reporting, activation metrics, retention cohorts, experimentation, SQL analysis, product dashboards, customer segmentation, and executive-ready recommendations for product and marketing stakeholders."
    }
  ],
  candidatePreferences: {
    location: "Remote",
    salaryGoal: "120000 USD",
    tone: "confident"
  }
};

checkHealth();
bindEvents();

function bindEvents() {
  elements.loadSampleButton.addEventListener("click", loadSample);
  elements.generateButton.addEventListener("click", generatePacket);
  elements.copyJsonButton.addEventListener("click", copyJson);
  elements.downloadPdfButton.addEventListener("click", () => downloadFile("pdf"));
  elements.downloadDocxButton.addEventListener("click", () => downloadFile("docx"));
  elements.resumeFile.addEventListener("change", importResumeFile);

  for (const tab of elements.tabs) {
    tab.addEventListener("click", () => {
      state.activeTab = tab.dataset.tab;
      updateTabs();
      renderPacket();
    });
  }
}

async function checkHealth() {
  try {
    const response = await fetch("/health");
    if (!response.ok) {
      throw new Error("Health check failed");
    }

    elements.statusPill.classList.add("is-live");
    elements.statusText.textContent = "API live";
  } catch {
    elements.statusPill.classList.add("is-error");
    elements.statusText.textContent = "API offline";
  }
}

function loadSample() {
  elements.resumeText.value = sample.resumeText;
  setValue("jobTitle1", sample.targetJobs[0].title);
  setValue("jobCompany1", sample.targetJobs[0].company);
  setValue("jobUrl1", sample.targetJobs[0].url);
  setValue("jobDescription1", sample.targetJobs[0].description);
  setValue("jobTitle2", sample.targetJobs[1].title);
  setValue("jobCompany2", sample.targetJobs[1].company);
  setValue("jobUrl2", sample.targetJobs[1].url);
  setValue("jobDescription2", sample.targetJobs[1].description);
  setValue("location", sample.candidatePreferences.location);
  setValue("salaryGoal", sample.candidatePreferences.salaryGoal);
  setValue("tone", sample.candidatePreferences.tone);
}

async function importResumeFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  elements.resumeText.value = await file.text();
}

async function generatePacket() {
  const payload = collectPayload();
  setLoading(true);

  try {
    const response = await fetch("/api/v1/vouch/application-packet", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await readJsonResponse(response);

    if (response.status === 402) {
      throw {
        message: "Payment required before Vouch can generate this packet. Use an OKX.AI/x402-capable client to pay and replay the request.",
        paymentRequired: data
      };
    }

    if (!response.ok) {
      throw data;
    }

    state.result = data;
    state.packet = data.packet;
    updateOutputActions();
    renderPacket();
  } catch (error) {
    renderError(error);
  } finally {
    setLoading(false);
  }
}

function collectPayload() {
  const targetJobs = [1, 2, 3]
    .map((index) => ({
      title: getValue(`jobTitle${index}`),
      company: getValue(`jobCompany${index}`),
      url: getValue(`jobUrl${index}`),
      description: getValue(`jobDescription${index}`)
    }))
    .filter((job) => job.description.length > 0 || job.title.length > 0 || job.url.length > 0);

  return {
    resumeText: elements.resumeText.value,
    targetJobs,
    candidatePreferences: {
      location: getValue("location"),
      salaryGoal: getValue("salaryGoal"),
      tone: getValue("tone")
    }
  };
}

function renderPacket() {
  const packet = state.packet;
  if (!packet) {
    return;
  }

  elements.beforeScore.textContent = packet.fitScoreBefore;
  elements.afterScore.textContent = packet.fitScoreAfter;
  elements.scoreFill.style.width = `${Math.max(packet.fitScoreBefore, packet.fitScoreAfter)}%`;

  const renderers = {
    overview: renderOverview,
    resume: renderResume,
    interview: renderInterview,
    json: renderJson
  };

  elements.resultPanel.innerHTML = renderers[state.activeTab](packet);
}

function renderOverview(packet) {
  const strongGaps = packet.gapBenchmark
    .filter((gap) => gap.status === "missing")
    .slice(0, 6);
  const matched = packet.jobBreakdown[0]?.matchedKeywords ?? [];

  return `
    <div class="section-stack">
      <div class="metric-grid">
        <div class="metric"><span>Before fit</span><strong>${packet.fitScoreBefore}</strong></div>
        <div class="metric"><span>After fit</span><strong>${packet.fitScoreAfter}</strong></div>
        <div class="metric"><span>Decision</span><strong>${escapeHtml(packet.mockRecruiterScreen.decision)}</strong></div>
      </div>
      <article class="result-card">
        <h3>Recruiter summary</h3>
        <p>${escapeHtml(packet.recruiterSummary).replaceAll("\n", "<br />")}</p>
      </article>
      <article class="result-card">
        <h3>Visible strengths</h3>
        <div class="chip-row">${matched.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
      </article>
      <article class="result-card">
        <h3>Gaps to close</h3>
        <ul>${strongGaps.map((gap) => `<li>${escapeHtml(gap.label || gap.requirement)}: ${escapeHtml(gap.recommendation)}</li>`).join("")}</ul>
      </article>
    </div>
  `;
}

function renderResume(packet) {
  return `
    <div class="section-stack">
      <article class="result-card">
        <h3>ATS resume</h3>
        <pre>${escapeHtml(packet.atsResume)}</pre>
      </article>
    </div>
  `;
}

function renderInterview(packet) {
  return `
    <div class="section-stack">
      <article class="result-card">
        <h3>Mock recruiter screen</h3>
        <ul>
          ${packet.mockRecruiterScreen.whyInterview.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </article>
      <article class="result-card">
        <h3>Interview prep</h3>
        <ul>
          ${packet.interviewPrep
            .slice(0, 8)
            .map((item) => `<li><strong>${escapeHtml(item.question)}</strong><br />${escapeHtml(item.answerFrame)}</li>`)
            .join("")}
        </ul>
      </article>
      <article class="result-card">
        <h3>Portfolio proof sprints</h3>
        <ul>
          ${packet.portfolioProjects
            .map((item) => `<li><strong>${escapeHtml(item.title)}</strong><br />${escapeHtml(item.objective)}</li>`)
            .join("")}
        </ul>
      </article>
    </div>
  `;
}

function renderJson(packet) {
  return `
    <div class="section-stack">
      <article class="result-card">
        <h3>Raw packet</h3>
        <pre>${escapeHtml(JSON.stringify(packet, null, 2))}</pre>
      </article>
    </div>
  `;
}

function renderError(error) {
  state.result = null;
  state.packet = null;
  updateOutputActions();
  const details = Array.isArray(error?.details)
    ? `<ul>${error.details.map((item) => `<li>${escapeHtml(item.field)}: ${escapeHtml(item.message)}</li>`).join("")}</ul>`
    : "";

  elements.resultPanel.innerHTML = `
    <div class="error-box">
      <strong>${escapeHtml(error?.message ?? "Vouch could not generate the packet.")}</strong>
      ${details}
    </div>
  `;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function copyJson() {
  if (!state.packet) {
    return;
  }

  await navigator.clipboard.writeText(JSON.stringify(state.result ?? state.packet, null, 2));
  elements.copyJsonButton.textContent = "Copied";
  setTimeout(() => {
    elements.copyJsonButton.textContent = "Copy JSON";
  }, 1200);
}

function updateOutputActions() {
  const files = state.result?.files ?? [];
  elements.copyJsonButton.disabled = !state.result;
  elements.downloadPdfButton.disabled = !files.some((file) => file.name === "pdf");
  elements.downloadDocxButton.disabled = !files.some((file) => file.name === "docx");
}

function downloadFile(name) {
  const file = state.result?.files?.find((item) => item.name === name);
  if (!file?.data) {
    return;
  }

  const link = document.createElement("a");
  link.href = "data:" + file.mediaType + ";base64," + file.data;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
}

function updateTabs() {
  for (const tab of elements.tabs) {
    tab.classList.toggle("is-active", tab.dataset.tab === state.activeTab);
  }
}

function setLoading(isLoading) {
  elements.generateButton.disabled = isLoading;
  elements.generateButton.textContent = isLoading ? "Generating packet..." : "Generate application packet";
}

function getValue(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function setValue(id, value) {
  document.querySelector(`#${id}`).value = value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
