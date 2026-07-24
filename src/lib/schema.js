const APPLICATION_PACKET_REQUIRED_FIELDS = ["resumeText", "targetJobs"];

export function getApplicationPacketInputSchema() {
  return {
    type: "object",
    required: APPLICATION_PACKET_REQUIRED_FIELDS,
    properties: {
      resumeText: {
        type: "string",
        description: "Candidate resume, LinkedIn text, or profile notes."
      },
      targetJobs: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        description: "One to three target jobs with title, company, url, and/or description.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            company: { type: "string" },
            url: { type: "string" },
            description: {
              type: "string",
              description: "Paste job text, or provide url and Vouch will fetch the page."
            }
          }
        }
      },
      candidatePreferences: {
        type: "object",
        properties: {
          location: { type: "string" },
          salaryGoal: { type: "string" },
          tone: {
            type: "string",
            enum: ["confident", "concise", "executive", "warm"]
          }
        }
      }
    }
  };
}

export function getApplicationPacketInputFields() {
  return [
    {
      name: "resumeText",
      type: "string",
      required: true,
      description: "Candidate resume, LinkedIn text, or profile notes."
    },
    {
      name: "targetJobs",
      type: "array",
      required: true,
      description: "One to three target jobs with title, company, url, and/or description."
    }
  ];
}

export function getApplicationPacketInputRequiredResponse() {
  const fields = getApplicationPacketInputFields();

  return {
    error: "input_required",
    status: "input_required",
    inputRequired: true,
    message: "Provide resumeText and targetJobs to generate a Vouch application packet.",
    required: APPLICATION_PACKET_REQUIRED_FIELDS,
    requiredArgs: APPLICATION_PACKET_REQUIRED_FIELDS,
    fields,
    inputSchema: getApplicationPacketInputSchema(),
    acceptedShapes: [
      {
        method: "POST",
        body: {
          resumeText: "...",
          targetJobs: [{ title: "...", company: "...", url: "...", description: "..." }]
        }
      },
      { method: "GET", query: { resumeText: "...", targetJobs: "JSON array string" } },
      { method: "GET", query: { serviceParams: "JSON object containing resumeText and targetJobs" } }
    ]
  };
}
