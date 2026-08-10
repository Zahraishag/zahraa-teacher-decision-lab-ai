const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      error: "يجب استخدام طلب POST."
    });
  }

  const rawApiKey = String(process.env.GEMINI_API_KEY || "");

  const apiKey = rawApiKey
    .replace(/^GEMINI_API_KEY\s*=\s*/i, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F\s]/g, "")
    .trim();

  if (!apiKey || apiKey.length < 20) {
    return response.status(500).json({
      error:
        "قيمة GEMINI_API_KEY غير موجودة أو غير مكتملة في Vercel."
    });
  }

  try {
    const body =
      typeof request.body === "string"
        ? JSON.parse(request.body)
        : request.body || {};

    const { task, session } = body;

    if (!task || !session) {
      return response.status(400).json({
        error: "بيانات المهمة والجلسة مطلوبة."
      });
    }

    // --------------------------------------------
    // 1. استرجاع DataHub مرة واحدة
    // --------------------------------------------

    let evidence = [];

    try {
      const protocol =
        request.headers["x-forwarded-proto"] || "https";

      const host =
        request.headers["x-forwarded-host"] ||
        request.headers.host;

      const datahubResponse = await fetch(
        `${protocol}://${host}/api/datahub`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ session })
        }
      );

      const datahubData =
        await datahubResponse.json();

      if (
        datahubResponse.ok &&
        datahubData?.connected === true &&
        Array.isArray(datahubData?.evidence)
      ) {
        evidence = datahubData.evidence;
      }

      console.log(
        "DataHub evidence passed to Gemini:",
        evidence.length
      );

    } catch (error) {
      console.error(
        "Unable to retrieve DataHub evidence:",
        error
      );
    }

    // --------------------------------------------
    // 2. بناء البرومبت
    // --------------------------------------------

    const prompt =
      buildPrompt(task, session, evidence);

    // --------------------------------------------
    // 3. Gemini مع fallback
    // --------------------------------------------

    const result = await generateWithFallback({
      apiKey,
      prompt
    });

    if (!result.text) {
      return response.status(502).json({
        error: "لم يُرجع Gemini استجابة نصية."
      });
    }

    const cleanText =
      cleanOutput(result.text);

    return response.status(200).json({
      text: cleanText,
      model: result.model
    });

  } catch (error) {
    console.error(
      "Gemini handler error:",
      error
    );

    return response.status(500).json({
      error:
        error?.message ||
        "تعذر تشغيل محرك القرار."
    });
  }
}


// ========================================================
// GEMINI FALLBACK
// ========================================================

async function generateWithFallback({
  apiKey,
  prompt
}) {

  const models = [
    PRIMARY_MODEL,
    FALLBACK_MODEL
  ];

  let lastError = null;

  for (const model of models) {

    try {

      console.log(
        "Attempting Gemini model:",
        model
      );

      const result =
        await callModel({
          apiKey,
          model,
          prompt
        });

      return {
        text: result,
        model
      };

    } catch (error) {

      lastError = error;

      console.error(
        `Gemini model ${model} failed:`,
        error.status,
        error.message
      );

      // quota: لا نستمر في ضرب نفس الحصة
      if (error.status === 429) {
        throw new Error(
          "تم الوصول إلى حد استخدام Gemini API لهذا المشروع. راجعي Usage / Rate Limits أو Billing في Google AI Studio ثم أعيدي المحاولة."
        );
      }

      // 503: نجرب النموذج الاحتياطي
      if (error.status === 503) {
        continue;
