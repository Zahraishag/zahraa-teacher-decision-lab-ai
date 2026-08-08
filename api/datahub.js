export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST request required."
    });
  }

  const datahubUrl = String(process.env.DATAHUB_GMS_URL || "")
    .trim()
    .replace(/\/+$/, "");

  const datahubToken = String(process.env.DATAHUB_TOKEN || "").trim();

  if (!datahubUrl) {
    return res.status(503).json({
      connected: false,
      mode: "configuration_required",
      error: "DATAHUB_GMS_URL is not configured."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const {
      subject = "",
      gradeLevel = "",
      lessonTopic = "",
      learningGoal = "",
      classChallenge = ""
    } = body;

    const searchText = [
      subject,
      gradeLevel,
      lessonTopic,
      learningGoal,
      classChallenge
    ]
      .filter(Boolean)
      .join(" ");

    if (!searchText) {
      return res.status(400).json({
        connected: true,
        error: "Teacher context is required."
      });
    }

    const query = `
      query SearchCurriculumMetadata($input: SearchAcrossEntitiesInput!) {
        searchAcrossEntities(input: $input) {
          start
          count
          total
          searchResults {
            entity {
              urn
              type
              ... on Dataset {
                properties {
                  name
                  description
                }
              }
            }
          }
        }
      }
    `;

    const graphqlResponse = await fetch(
      `${datahubUrl}/api/graphql`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(datahubToken
            ? { Authorization: `Bearer ${datahubToken}` }
            : {})
        },
        body: JSON.stringify({
          query,
          variables: {
            input: {
              query: searchText,
              start: 0,
              count: 10
            }
          }
        })
      }
    );

    const payload = await graphqlResponse.json();

    if (!graphqlResponse.ok || payload.errors) {
      console.error(
        "DataHub GraphQL error:",
        JSON.stringify(payload)
      );

      return res.status(502).json({
        connected: true,
        mode: "datahub_error",
        error:
          payload?.errors?.[0]?.message ||
          "DataHub metadata search failed."
      });
    }

    const results =
      payload?.data?.searchAcrossEntities?.searchResults || [];

    const evidence = results.map((item) => {
      const entity = item.entity || {};

      return {
        urn: entity.urn || null,
        entityType: entity.type || null,
        name: entity.properties?.name || null,
        description: entity.properties?.description || null
      };
    });

    return res.status(200).json({
      connected: true,
      source: "DataHub",
      query: searchText,
      evidenceCount: evidence.length,
      evidence,
      trace: [
        "Teacher Context",
        "DataHub Metadata Search",
        "Metadata Evidence",
        "Pedagogical Reasoning",
        "Teacher Decision"
      ]
    });
  } catch (error) {
    console.error("DataHub endpoint error:", error);

    return res.status(500).json({
      connected: false,
      error:
        error?.message ||
        "Unable to query DataHub."
    });
  }
}

