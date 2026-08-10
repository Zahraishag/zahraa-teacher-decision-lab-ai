export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      connected: false,
      error: "POST request required."
    });
  }

  const datahubUrl = String(process.env.DATAHUB_GMS_URL || "")
    .trim()
    .replace(/\/+$/, "");

  const datahubToken = String(process.env.DATAHUB_TOKEN || "").trim();

  if (!datahubUrl) {
    return res.status(500).json({
      connected: false,
      error: "DATAHUB_GMS_URL is not configured."
    });
  }

  if (!datahubToken) {
    return res.status(500).json({
      connected: false,
      error: "DATAHUB_TOKEN is not configured."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const session = body.session || body;

    const subject = String(session.subject || "").trim();
    const gradeLevel = String(session.gradeLevel || "").trim();
    const lessonTopic = String(session.lessonTopic || "").trim();
    const learningGoal = String(session.learningGoal || "").trim();
    const classChallenge = String(session.classChallenge || "").trim();

    if (!subject && !gradeLevel && !lessonTopic && !learningGoal) {
      return res.status(400).json({
        connected: true,
        error: "Teacher context is required."
      });
    }

    const searchTerm =
      lessonTopic ||
      learningGoal ||
      `${subject} ${gradeLevel}`.trim() ||
      subject;

    const graphqlQuery = `
      query SearchCurriculum($query: String!) {
        search(
          input: {
            type: DATASET
            query: $query
            start: 0
            count: 10
          }
        ) {
          total
          searchResults {
            entity {
              urn
              type
              ... on Dataset {
                name
                properties {
                  name
                  description
                }
                platform {
                  name
                }
              }
            }
          }
        }
      }
    `;

    const datahubResponse = await fetch(
      `${datahubUrl}/api/graphql`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${datahubToken}`
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: {
            query: searchTerm
          }
        })
      }
    );

    const data = await datahubResponse.json();

    if (!datahubResponse.ok) {
      return res.status(datahubResponse.status).json({
        connected: false,
        error:
          data?.message ||
          data?.error ||
          "DataHub request failed."
      });
    }

    if (data?.errors?.length) {
      return res.status(502).json({
        connected: false,
        error: data.errors
          .map((item) => item.message)
          .join(" | ")
      });
    }

    const results =
      data?.data?.search?.searchResults || [];

    const zahraaResults = results.filter((item) => {
      const platform =
        item?.entity?.platform?.name || "";

      const description =
        item?.entity?.properties?.description || "";

      const urn =
        item?.entity?.urn || "";

      return (
        platform
          .toLowerCase()
          .includes("zahraa_curriculum") ||
        description
          .toLowerCase()
          .includes("zahraa curriculum metadata") ||
        urn
          .toLowerCase()
          .includes("zahraa_curriculum")
      );
    });

    const selectedResults =
      zahraaResults.length > 0
        ? zahraaResults
        : results;

    const evidence = selectedResults.map(
      (item, index) => {
        const entity = item.entity || {};

        return {
          id: index + 1,
          urn: entity.urn || "",
          name:
            entity.properties?.name ||
            entity.name ||
            "Curriculum Dataset",
          platform:
            entity.platform?.name || "",
          description:
            entity.properties?.description || "",
          source: "DataHub"
        };
      }
    );

    const evidenceUrns = evidence
      .map((item) => item.urn)
      .filter(Boolean);

    const evidenceNames = evidence
      .map((item) => item.name)
      .filter(Boolean);

    const decisionTrace = [
      {
        step: 1,
        stage: "Teacher Context",
        detail: {
          subject,
          gradeLevel,
          lessonTopic,
          learningGoal,
          classChallenge
        }
      },
      {
        step: 2,
        stage: "DataHub Metadata Search",
        detail: {
          searchTerm
        }
      },
      {
        step: 3,
        stage: "Curriculum Evidence Retrieved",
        detail: {
          count: evidence.length,
          urns: evidenceUrns,
          names: evidenceNames
        }
      },
      {
        step: 4,
        stage: "Pedagogical Reasoning",
        detail:
          "Retrieved DataHub evidence is passed to the reasoning workflow."
      },
      {
        step: 5,
        stage: "Teacher Decision",
        detail:
          "The teacher remains the final authority before implementation."
      }
    ];

    console.log("DataHub evidence trace:", {
      searchTerm,
      evidenceCount: evidence.length,
      evidenceUrns
    });

    return res.status(200).json({
      connected: true,
      source: "DataHub",
      searchTerm,
      evidenceCount: evidence.length,

      teacherContext: {
        subject,
        gradeLevel,
        lessonTopic,
        learningGoal,
        classChallenge
      },

      evidence,

      evidenceReferences: {
        urns: evidenceUrns,
        names: evidenceNames
      },

      trace: decisionTrace
    });
  } catch (error) {
    console.error("DataHub endpoint error:", error);

    return res.status(500).json({
      connected: false,
      error:
        error?.message ||
        "Unable to query DataHub metadata."
    });
  }
}
