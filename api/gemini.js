const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

export default async function handler(request, response) {
  // =========================================================
  // 1) السماح بطلب POST فقط
  // =========================================================
  if (request.method !== "POST") {
    return response.status(405).json({
      error: "يجب استخدام طلب POST."
    });
  }

  // =========================================================
  // 2) قراءة وتنظيف مفتاح Gemini
  // =========================================================
  const rawApiKey = String(
    process.env.GEMINI_API_KEY || ""
  );

  const apiKey = rawApiKey
    .replace(/^GEMINI_API_KEY\s*=\s*/i, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F\s]/g, "")
    .trim();

  if (!apiKey || apiKey.length < 20) {
    return response.status(500).json({
      error:
        "قيمة GEMINI_API_KEY غير موجودة أو غير مكتملة في إعدادات Vercel."
    });
  }

  try {
    // =======================================================
    // 3) قراءة جسم الطلب
    // =======================================================
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

    // =======================================================
    // 4) استرجاع أدلة DataHub
    // =======================================================
    let evidence = [];

    try {
      const protocol =
        request.headers["x-forwarded-proto"] ||
        "https";

      const host =
        request.headers["x-forwarded-host"] ||
        request.headers.host;

      if (host) {
        const datahubResponse = await fetch(
          `${protocol}://${host}/api/datahub`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              session
            })
          }
        );

        let datahubData = {};

        try {
          datahubData =
            await datahubResponse.json();
        } catch {
          datahubData = {};
        }

        if (
          datahubResponse.ok &&
          datahubData?.connected === true &&
          Array.isArray(datahubData?.evidence)
        ) {
          evidence =
            datahubData.evidence;
        }

        console.log(
          "DataHub evidence passed to Gemini:",
          evidence.length
        );
      }
    } catch (error) {
      console.error(
        "Unable to retrieve DataHub evidence:",
        error?.message || error
      );

      evidence = [];
    }

    // =======================================================
    // 5) بناء Prompt
    // =======================================================
    const prompt =
      buildPrompt(
        task,
        session,
        evidence
      );

    // =======================================================
    // 6) استدعاء Gemini
    // =======================================================
    const result =
      await generateWithFallback({
        apiKey,
        prompt
      });

    if (!result?.text) {
      return response.status(502).json({
        error:
          "لم يُرجع Gemini استجابة نصية."
      });
    }

    // =======================================================
    // 7) تنظيف النص
    // =======================================================
    const cleanText =
      cleanOutput(result.text);

    if (!cleanText) {
      return response.status(502).json({
        error:
          "لم يُرجع Gemini محتوى صالحًا للعرض."
      });
    }

    // =======================================================
    // 8) الرد النهائي
    // =======================================================
    return response.status(200).json({
      text: cleanText,
      model: result.model,
      evidenceCount: evidence.length
    });

  } catch (error) {
    console.error(
      "Gemini handler error:",
      error
    );

    const status =
      Number(error?.status) || 500;

    return response
      .status(
        status >= 400 &&
        status < 600
          ? status
          : 500
      )
      .json({
        error:
          error?.message ||
          "تعذر تشغيل محرك القرار."
      });
  }
}


// =========================================================
// GEMINI FALLBACK
// =========================================================

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

      const text =
        await callModel({
          apiKey,
          model,
          prompt
        });

      return {
        text,
        model
      };

    } catch (error) {
      lastError = error;

      console.error(
        `Gemini model ${model} failed:`,
        {
          status:
            error?.status,
          message:
            error?.message
        }
      );

      // -----------------------------------------------
      // 429 = حد الاستخدام / الحصة
      // -----------------------------------------------
      if (error?.status === 429) {
        const quotaError =
          new Error(
            "تم الوصول إلى حد استخدام Gemini API لهذا المشروع. راجعي Usage / Rate Limits أو Billing في Google AI Studio ثم أعيدي المحاولة."
          );

        quotaError.status = 429;

        throw quotaError;
      }

      // -----------------------------------------------
      // أخطاء مؤقتة: نجرب النموذج الاحتياطي
      // -----------------------------------------------
      if (
        error?.status === 500 ||
        error?.status === 502 ||
        error?.status === 503 ||
        error?.status === 504
      ) {
        continue;
      }

      throw error;
    }
  }

  const finalError =
    new Error(
      lastError?.message ||
      "نماذج Gemini غير متاحة مؤقتًا. أعيدي المحاولة بعد قليل."
    );

  finalError.status =
    lastError?.status || 503;

  throw finalError;
}


// =========================================================
// CALL ONE GEMINI MODEL
// =========================================================

async function callModel({
  apiKey,
  model,
  prompt
}) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      60000
    );

  try {
    const geminiResponse =
      await fetch(
        url,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-goog-api-key":
              apiKey
          },

          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],

            generationConfig: {
              maxOutputTokens: 4000
            }
          }),

          signal:
            controller.signal
        }
      );

    // -----------------------------------------------------
    // قراءة الاستجابة كنص أولًا لتجنب خطأ JSON الغامض
    // -----------------------------------------------------
    const rawResponse =
      await geminiResponse.text();

    let data = {};

    if (rawResponse) {
      try {
        data =
          JSON.parse(rawResponse);
      } catch {
        const parseError =
          new Error(
            `Gemini أعاد استجابة غير صالحة: ${rawResponse.slice(0, 300)}`
          );

        parseError.status =
          geminiResponse.status || 502;

        throw parseError;
      }
    }

    // -----------------------------------------------------
    // معالجة HTTP errors
    // -----------------------------------------------------
    if (!geminiResponse.ok) {
      const apiError =
        new Error(
          data?.error?.message ||
          `Gemini API error ${geminiResponse.status}`
        );

      apiError.status =
        geminiResponse.status;

      apiError.details =
        data;

      throw apiError;
    }

    // -----------------------------------------------------
    // استخراج النص من candidates
    // -----------------------------------------------------
    const parts =
      data?.candidates?.[0]
        ?.content
        ?.parts;

    const text =
      Array.isArray(parts)
        ? parts
            .map(
              part =>
                typeof part?.text === "string"
                  ? part.text
                  : ""
            )
            .join("")
            .trim()
        : "";

    if (!text) {
      const finishReason =
        data?.candidates?.[0]
          ?.finishReason || "";

      const noTextError =
        new Error(
          finishReason
            ? `لم يُرجع Gemini نصًا. سبب الإنهاء: ${finishReason}`
            : "لم يُرجع Gemini استجابة نصية."
        );

      noTextError.status = 502;

      throw noTextError;
    }

    return text;

  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError =
        new Error(
          "استغرق Gemini وقتًا أطول من المتوقع."
        );

      timeoutError.status = 504;

      throw timeoutError;
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}


// =========================================================
// CLEAN OUTPUT
// =========================================================

function cleanOutput(text) {
  return String(text || "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\Rightarrow/g, "⇒")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


// =========================================================
// BUILD PROMPT
// =========================================================

function buildPrompt(
  task,
  session,
  evidence = []
) {
  const rules = `
أنت محرك الاستدلال التربوي داخل منصة:
ZAHRAA™ Teacher Decision Lab
مختبر زهراء للقرار التربوي.

مبدأ المنصة:
Decision Before Generation
القرار قبل التوليد.

قواعد إلزامية:
- لا تنشئ خطة تنفيذ قبل موافقة المعلم الصريحة.
- القرار النهائي دائمًا بيد المعلم.
- لا تخترع أرقامًا أو نسبًا أو أزمنة غير موجودة في بيانات الجلسة.
- افصل بين دليل المعلم والقيد التنفيذي والتفضيل المهني واستنتاج النظام.
- إذا لم تتوفر أدلة DataHub فلا تدّع وجودها.
- لا تستخدم خيارات ثنائية كاذبة.
- لا ترشح قرارًا نهائيًا بدل المعلم.
- استخدم لغة عربية واضحة ومهنية.
- راجع الأخطاء اللغوية قبل إخراج النتيجة.
`;

  // ======================================================
  // DATAHUB EVIDENCE
  // ======================================================

  const evidenceContext =
    Array.isArray(evidence) &&
    evidence.length > 0
      ? evidence
          .slice(0, 5)
          .map(
            (item, index) => `
دليل DataHub ${index + 1}:
الاسم: ${item?.name || "غير محدد"}
الوصف: ${item?.description || "لا يوجد وصف"}
المنصة: ${item?.platform || "zahraa_curriculum"}
URN: ${item?.urn || "غير متاح"}
`
          )
          .join("\n")
      : `
لا توجد أدلة DataHub مسترجعة لهذه الجلسة.
اعتمد فقط على بيانات المعلم، ولا تدّع وجود دليل منهجي خارجي.
`;

  // ======================================================
  // SESSION CONTEXT
  // ======================================================

  const context = `
بيانات الموقف التعليمي:

المادة:
${session?.subject || "غير محدد"}

الصف أو المرحلة:
${session?.gradeLevel || "غير محدد"}

موضوع الدرس:
${session?.lessonTopic || "غير محدد"}

مدة الحصة:
${session?.lessonDuration || "غير محدد"}

عدد الطلاب:
${session?.studentCount || "غير محدد"}

مستوى الطلاب:
${session?.studentLevel || "غير محدد"}

الهدف التعليمي:
${session?.learningGoal || "غير محدد"}

التحدي التربوي:
${session?.classChallenge || "غير محدد"}

الموارد المتاحة:
${session?.availableResources || "غير محدد"}

القيود والتفضيلات:
${session?.additionalConstraints || "غير محدد"}

إجابة المعلم عن السؤال التكيفي:
${session?.adaptiveAnswer || "لا توجد إجابة بعد"}

أدلة المنهج:
${evidenceContext}
`;

  // ======================================================
  // TASK 1: ADAPTIVE QUESTION
  // ======================================================

  if (task === "adaptive_question") {
    return `
${rules}

${context}

المطلوب:

1. حلل الموقف دون إنشاء خطة تنفيذ.
2. حدد معلومة واحدة ناقصة فقط تؤثر فعلًا في القرار التربوي.
3. اطرح سؤالًا واحدًا فقط.
4. صنف السؤال إلى أحد الأنواع التالية:
   - سؤال تشخيصي
   - قيد تنفيذي
   - تفضيل مهني
5. اشرح باختصار لماذا تؤثر الإجابة في القرار.
6. اسمح بإجابة مفتوحة.
7. لا تقترح الحل النهائي.

اكتب النتيجة بهذه الصيغة بالضبط:

نوع السؤال: ...
السؤال: ...
لماذا نسأل؟: ...
`;
  }

  // ======================================================
  // TASK 2: CONTEXT SUMMARY
  // ======================================================

  if (task === "context_summary") {
    return `
${rules}

${context}

أنشئ ملخصًا موجزًا للموقف التعليمي.

استخدم العناوين التالية بالضبط:

1. الأدلة التي قدمها المعلم.
2. القيود التنفيذية.
3. التفضيلات المهنية.
4. استنتاجات النظام.
5. المعلومات غير المؤكدة.

قواعد:
- فرّق بوضوح بين ما أدخله المعلم وما استنتجه النظام.
- لا تنشئ بدائل.
- لا تنشئ خطة تنفيذ.
- لا تتخذ القرار بدل المعلم.

اختم بالعبارة التالية:

الملخص بانتظار موافقة المعلم.
`;
  }

  // ======================================================
  // TASK 3: ALTERNATIVES
  // ======================================================

  if (task === "alternatives") {
    return `
${rules}

${context}

أنشئ ثلاثة بدائل تربوية مختلفة جوهريًا للموقف الحالي.

يجب ألا تكون البدائل مجرد إعادة صياغة لنفس الفكرة.

يجب أن يختلف كل بديل عن الآخرين في متغيرين تربويين على الأقل من:

- نقطة بداية التعلم.
- تسلسل بناء المفهوم.
- دور المعلم.
- دور الطالب.
- نوع التمثيل.
- نوع التقويم.
- نوع التمايز.
- المخرج الأساسي.

اكتب البديل الأول بهذه الصيغة:

اسم القرار: ...
الفجوة التي يعالجها: ...
منطق التدريس: ...
نقطة البداية: ...
تسلسل بناء المفهوم: ...
دور المعلم: ...
دور الطالب: ...
نوع التقويم: ...
نوع التمايز: ...
المخرج الأقوى: ...
ما قد لا يتحقق بصورة كافية: ...
القيد الذي قد يمنع اختياره: ...

ثم اكتب البديل الثاني بنفس الصيغة.

ثم اكتب البديل الثالث بنفس الصيغة.

تعليمات إلزامية:
- أنشئ ثلاثة بدائل فقط.
- لا ترتبها من الأفضل إلى الأسوأ.
- لا ترشح أي بديل.
- لا تتخذ القرار بدل المعلم.
- لا تنشئ خطة تنفيذ.
`;
  }

  // ======================================================
  // TASK 4: IMPLEMENTATION PLAN
  // ======================================================

  if (task === "implementation_plan") {
    if (session?.teacherApproval !== true) {
      const approvalError =
        new Error(
          "لا يمكن إنشاء الخطة قبل موافقة المعلم."
        );

      approvalError.status = 400;

      throw approvalError;
    }

    return `
${rules}

${context}

القرار الذي راجعه المعلم ووافق عليه:

${session?.approvedDecision || "غير محدد"}

أنشئ خطة تنفيذ مرتبطة مباشرة بهذا القرار.

يجب أن تتضمن:

1. هدف التعلم.
2. معيار النجاح.
3. توزيع الزمن.
4. التمهيد.
5. خطوات التنفيذ.
6. دور المعلم.
7. دور الطالب.
8. التمايز.
9. التقويم التكويني.
10. نقطة قرار أثناء التنفيذ.
11. الإغلاق.
12. بطاقة الخروج.

قواعد الزمن:
- استخدم مدة الحصة التي أدخلها المعلم فقط.
- لا تخترع مدة حصة جديدة.
- يجب ألا يتجاوز مجموع الأزمنة مدة الحصة.

قواعد الحوكمة:
- وضح أن الخطة ناتجة بعد موافقة المعلم.
- وضح أن المعلم يستطيع تعديل الخطة.
- لا تدّع أن الذكاء الاصطناعي اتخذ القرار النهائي.
`;
  }

  // ======================================================
  // UNKNOWN TASK
  // ======================================================

  const unknownTaskError =
    new Error(
      "نوع المهمة غير معروف."
    );

  unknownTaskError.status = 400;

  throw unknownTaskError;
}
