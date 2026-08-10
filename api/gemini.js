const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

emodule.exports = async function handler(request, response) {
 {
<<<<<<< HEAD
  // =========================================================
  // 1) السماح بطلب POST فقط
  // =========================================================
=======
>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)
  if (request.method !== "POST") {
    return response.status(405).json({
      error: "يجب استخدام طلب POST."
    });
  }

<<<<<<< HEAD
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
=======
  try {
    const body =
      typeof request.body === "string"
        ? JSON.parse(request.body)
        : request.body;

    const { task, session } = body || {};

    if (!task || !session) {
      return response.status(400).json({
        error: "بيانات المهمة والجلسة مطلوبة."
      });
    }

    // ==========================================
    // 1. استرجاع أدلة DataHub
    // ==========================================

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
          body: JSON.stringify({
            session
          })
        }
      );

      const datahubData = await datahubResponse.json();

      if (
        datahubResponse.ok &&
        datahubData.connected === true &&
        Array.isArray(datahubData.evidence)
      ) {
        evidence = datahubData.evidence;
      }

      console.log(
        "DataHub evidence retrieved:",
        evidence.length
      );
    } catch (error) {
      console.error(
        "DataHub retrieval failed:",
        error
      );
    }

    // ==========================================
    // 2. قراءة وتنظيف مفتاح Gemini
    // ==========================================

    const rawApiKey = String(
      process.env.GEMINI_API_KEY || ""
    );

    const apiKey = rawApiKey
      .replace(/^GEMINI_API_KEY\s*=\s*/i, "")
      .replace(/^["']+|["']+$/g, "")
      .replace(
        /[\u0000-\u001F\u007F-\u009F\s]/g,
        ""
      )
      .trim();

    // ==========================================
    // 3. إذا لم يوجد المفتاح نستخدم Fallback
    // ==========================================

    if (!apiKey || apiKey.length < 20) {
      console.warn(
        "Gemini API key unavailable. Using pedagogical fallback."
      );

      return sendFallback(
        response,
        task,
        session,
        evidence,
        "api_key_unavailable"
      );
    }

    // ==========================================
    // 4. بناء Prompt
    // ==========================================

    let prompt;

    try {
      prompt = buildPrompt(
>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)
        task,
        session,
        evidence
      );
<<<<<<< HEAD

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
=======
    } catch (error) {
      return response.status(400).json({
        error: error.message
      });
    }

    // ==========================================
    // 5. محاولة Gemini
    // ==========================================

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
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
              temperature: 0.25,
              maxOutputTokens: 5000
            }
          })
        }
      );

      let data = {};

      try {
        data = await geminiResponse.json();
      } catch {
        data = {};
      }

      // ========================================
      // 6. Gemini غير متاح / 429 / 5xx
      // ========================================

      if (!geminiResponse.ok) {
        console.error(
          "Gemini API error:",
          geminiResponse.status,
          JSON.stringify(data)
        );

        // أخطاء الحصة أو الضغط أو الخدمة
        if (
          geminiResponse.status === 429 ||
          geminiResponse.status === 408 ||
          geminiResponse.status === 500 ||
          geminiResponse.status === 502 ||
          geminiResponse.status === 503 ||
          geminiResponse.status === 504
        ) {
          return sendFallback(
            response,
            task,
            session,
            evidence,
            `gemini_${geminiResponse.status}`
          );
        }

        // حتى الأخطاء الأخرى لا توقف العرض التجريبي
        return sendFallback(
          response,
          task,
          session,
          evidence,
          `gemini_error_${geminiResponse.status}`
        );
      }

      // ========================================
      // 7. استخراج النص
      // ========================================

      let text = data?.candidates?.[0]
        ?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

      if (!text) {
        console.warn(
          "Gemini returned no usable text."
        );

        return sendFallback(
          response,
          task,
          session,
          evidence,
          "empty_gemini_response"
        );
      }

      text = cleanText(text);

      // ========================================
      // 8. نجاح Gemini
      // ========================================

      return response.status(200).json({
        text,
        source: "gemini",
        fallback: false,
        evidenceCount: evidence.length
      });

    } catch (error) {
      console.error(
        "Gemini network/runtime error:",
        error
      );

      return sendFallback(
        response,
        task,
        session,
        evidence,
        "gemini_runtime_error"
      );
    }

  } catch (error) {
    console.error(
      "Server error:",
      error
    );

    return response.status(500).json({
      error:
        error?.message ||
        "تعذر تشغيل محرك القرار."
    });
>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)
  }
}


<<<<<<< HEAD
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
=======
// =====================================================
// FALLBACK ENGINE
// =====================================================

function sendFallback(
  response,
  task,
  session,
  evidence,
  reason
) {
  try {
    const text = buildFallback(
      task,
      session,
      evidence
    );

    console.log(
      "Pedagogical fallback activated:",
      reason
    );

    return response.status(200).json({
      text,
      source: "pedagogical-fallback",
      fallback: true,
      fallbackReason: reason,
      evidenceCount:
        Array.isArray(evidence)
          ? evidence.length
          : 0
    });

  } catch (error) {
    console.error(
      "Fallback generation failed:",
      error
    );

    return response.status(500).json({
      error:
        error?.message ||
        "تعذر إنشاء الاستجابة البديلة."
    });
  }
}


// =====================================================
// DETERMINISTIC PEDAGOGICAL FALLBACK
// =====================================================

function buildFallback(
  task,
  session,
  evidence = []
) {
  const subject =
    session.subject || "المادة المحددة";

  const topic =
    session.lessonTopic || "موضوع الدرس";

  const challenge =
    session.classChallenge ||
    "التحدي التعليمي المحدد";

  const resources =
    session.availableResources ||
    "الموارد المتاحة";

  const goal =
    session.learningGoal ||
    "الهدف التعليمي المحدد";

  const level =
    session.studentLevel ||
    "مستويات متفاوتة";

  const duration =
    session.lessonDuration ||
    "مدة الحصة المحددة";

  const adaptiveAnswer =
    session.adaptiveAnswer ||
    "لم يقدم المعلم إجابة إضافية.";

  const evidenceMessage =
    Array.isArray(evidence) &&
    evidence.length > 0
      ? `تم استرجاع ${evidence.length} عنصرًا من أدلة المنهج عبر DataHub لدعم سياق القرار.`
      : "لم تتوفر أدلة DataHub إضافية في هذه الجلسة، لذلك يعتمد هذا العرض الاحتياطي على بيانات المعلم المدخلة فقط.";


  // -------------------------------------------------
  // السؤال التكيفي
  // -------------------------------------------------

  if (task === "adaptive_question") {
    return cleanText(`
نوع السؤال: سؤال تشخيصي.

السؤال:
ما أكثر جانب يختلف فيه الطلاب حاليًا عند التعامل مع ${topic}: فهم المفهوم، أم تفسيره، أم تطبيقه؟

لماذا نسأل؟:
لأن تحديد موضع الفجوة يساعد على التمييز بين الحاجة إلى إعادة بناء المفهوم والحاجة إلى تغيير طريقة التمثيل أو التطبيق، دون افتراض أن جميع الطلاب يحتاجون التدخل نفسه.
`);
  }


  // -------------------------------------------------
  // ملخص السياق
  // -------------------------------------------------

  if (task === "context_summary") {
    return cleanText(`
1. الأدلة التي قدمها المعلم:
المادة: ${subject}.
موضوع الدرس: ${topic}.
الهدف التعليمي: ${goal}.
التحدي المبلغ عنه: ${challenge}.
مستوى الطلاب: ${level}.
إجابة المعلم الإضافية: ${adaptiveAnswer}.

2. القيود التنفيذية:
مدة الحصة: ${duration}.
الموارد المتاحة: ${resources}.

3. التفضيلات المهنية:
يتم التعامل مع القيود والتفضيلات التي أدخلها المعلم بوصفها جزءًا من سياق القرار، وليست حقائق منهجية مستقلة.

4. استنتاجات النظام:
الموقف يحتاج إلى قرار تربوي يربط بين الهدف التعليمي، موضع صعوبة الطلاب، وطريقة تمثيل المفهوم قبل الانتقال إلى إنتاج نشاط أو خطة.

5. المعلومات غير المؤكدة:
أي معلومات لم يقدمها المعلم صراحة تظل غير مؤكدة ولا يتم افتراضها.

${evidenceMessage}

الملخص بانتظار موافقة المعلم.
`);
  }


  // -------------------------------------------------
  // البدائل
  // -------------------------------------------------

  if (task === "alternatives") {
    return cleanText(`
البديل الأول: المدخل المفاهيمي البصري

اسم القرار:
بناء المفهوم من خلال تمثيل بصري قبل الانتقال إلى الرموز.

الفجوة التي يعالجها:
تنفيذ الطلاب للإجراءات دون فهم كافٍ للمعنى الذي تمثله.

منطق التدريس:
الانتقال من المعنى المحسوس أو البصري إلى التعبير الرمزي.

نقطة البداية:
استدعاء فهم الطلاب الحالي للمفهوم باستخدام مثال بصري قصير.

تسلسل بناء المفهوم:
ملاحظة التمثيل، تفسير العلاقة، مناقشة المعنى، ثم الربط بالصيغة الرمزية.

دور المعلم:
توجيه الملاحظة وطرح أسئلة تكشف فهم الطلاب.

دور الطالب:
تفسير التمثيل وشرح العلاقة بلغته ثم ربطها بالرموز.

نوع التقويم:
تقويم تكويني قائم على تفسير الطالب للمفهوم.

نوع التمايز:
تنويع مستوى الدعم والتمثيلات المستخدمة.

المخرج الأقوى:
فهم أعمق لمعنى ${topic}.

ما قد لا يتحقق بصورة كافية:
قد يقل الوقت المتاح للتدريب الإجرائي المكثف.

القيد الذي قد يمنع اختياره:
ضيق وقت الحصة أو محدودية الوسائل البصرية.


البديل الثاني: الاستقصاء الموجّه

اسم القرار:
الوصول إلى المفهوم من خلال مقارنة أمثلة وحالات مختلفة.

الفجوة التي يعالجها:
اعتماد الطلاب على خطوات محفوظة دون القدرة على تفسير سبب صحتها.

منطق التدريس:
جعل الطلاب يلاحظون النمط ويستنتجون العلاقة قبل تقديم الصياغة النهائية.

نقطة البداية:
عرض مثالين أو حالتين تتطلبان المقارنة.

تسلسل بناء المفهوم:
مقارنة، ملاحظة، تفسير، صياغة استنتاج، ثم اختبار الاستنتاج.

دور المعلم:
تصميم الأسئلة وتوجيه الاستقصاء دون إعطاء الإجابة مباشرة.

دور الطالب:
المقارنة والاستنتاج وتبرير التفكير.

نوع التقويم:
أسئلة تفسيرية قصيرة أثناء الاستقصاء.

نوع التمايز:
اختلاف مستوى الأسئلة والدعم حسب استجابة الطلاب.

المخرج الأقوى:
الاستدلال والتفسير.

ما قد لا يتحقق بصورة كافية:
قد لا يحصل جميع الطلاب على القدر نفسه من التدريب الفردي.

القيد الذي قد يمنع اختياره:
الحاجة إلى إدارة زمن المناقشة بدقة.


البديل الثالث: التمايز حسب موضع الفجوة

اسم القرار:
تقديم مسارات تعلم قصيرة مختلفة وفق احتياج الطلاب.

الفجوة التي يعالجها:
وجود فروق بين الطلاب في فهم ${topic}.

منطق التدريس:
عدم افتراض أن صعوبة الطلاب واحدة، بل توجيه دعم مختلف حسب موضع الحاجة.

نقطة البداية:
مهمة تشخيصية قصيرة.

تسلسل بناء المفهوم:
تشخيص، توزيع الدعم، نشاط موجّه، تحقق سريع، ثم عودة إلى هدف مشترك.

دور المعلم:
تشخيص الاحتياج وتوجيه الدعم لكل مجموعة.

دور الطالب:
تنفيذ المهمة المناسبة لاحتياجه ثم إظهار دليل على الفهم.

نوع التقويم:
تقويم تشخيصي ثم تحقق تكويني قصير.

نوع التمايز:
التمايز في الدعم ونقطة البداية.

المخرج الأقوى:
الاستجابة للفروق بين مستويات الطلاب.

ما قد لا يتحقق بصورة كافية:
قد تكون المناقشة الصفية المشتركة أقل عمقًا.

القيد الذي قد يمنع اختياره:
عدد الطلاب أو صعوبة إدارة أكثر من مسار في الوقت نفسه.

${evidenceMessage}
`);
  }


  // -------------------------------------------------
  // خطة التنفيذ
  // -------------------------------------------------

  if (task === "implementation_plan") {
    if (!session.teacherApproval) {
      throw new Error(
        "لا يمكن إنشاء الخطة قبل موافقة المعلم."
      );
    }

    const approved =
      session.approvedDecision ||
      "القرار الذي اعتمده المعلم";

    return cleanText(`
القرار الذي اعتمده المعلم:
${approved}

هدف التعلم:
أن يُظهر الطالب فهمًا قابلًا للملاحظة للهدف التالي:
${goal}

معايير النجاح:
يشرح الطالب الفكرة الأساسية المرتبطة بـ ${topic}، ويطبقها في مهمة مناسبة، ويبرر إجابته أو اختياره.

مدة الحصة:
${duration}

التمهيد:
ابدأ بموقف قصير يكشف التصور الحالي للطلاب حول ${topic} دون تقديم الحل مباشرة.

خطوات التنفيذ:
أولًا: استدعاء المعرفة السابقة وتحديد موضع الصعوبة.

ثانيًا: تنفيذ المدخل الذي اعتمده المعلم مع إبقاء التركيز على الهدف التعليمي.

ثالثًا: مطالبة الطلاب بتفسير ما توصلوا إليه وليس تنفيذ الإجراء فقط.

رابعًا: استخدام تحقق تكويني قصير للكشف عن الطلاب الذين ما زالوا يحتاجون دعمًا.

دور المعلم:
توجيه التفكير، ملاحظة الأدلة على الفهم، وتعديل مستوى الدعم عند الحاجة.

دور الطالب:
المشاركة في المهمة، تفسير التفكير، وتقديم دليل على الفهم.

التمايز:
يقدم دعم إضافي للطلاب الذين يظهر لديهم نقص في الفهم، مع إمكانية زيادة مستوى التحدي للطلاب الذين حققوا الهدف مبكرًا.

التقويم التكويني:
سؤال قصير أو مهمة تطبيقية تكشف ما إذا كان الطالب يفهم سبب الإجراء وليس الإجراء فقط.

نقطة القرار أثناء التنفيذ:
إذا أظهر التقويم التكويني استمرار سوء الفهم، يعود المعلم إلى التمثيل أو الشرح المناسب قبل الانتقال إلى المهمة التالية.

الإغلاق وبطاقة الخروج:
يجيب الطالب بإيجاز عن سؤال يطلب منه تفسير الفكرة الأساسية في ${topic} أو تطبيقها مع تبرير الإجابة.

ملاحظة:
هذه الخطة ناتجة عن القرار الذي اعتمده المعلم، وهي قابلة للتعديل وفق حكمه المهني وظروف الصف.

${evidenceMessage}
`);
  }

  throw new Error(
    "نوع المهمة غير معروف."
  );
}


// =====================================================
// PROMPT BUILDER
// =====================================================
>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)

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

<<<<<<< HEAD
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
=======
  const evidenceContext =
    Array.isArray(evidence) &&
    evidence.length > 0
      ? evidence
          .slice(0, 5)
          .map(
            (item, index) => `
دليل DataHub ${index + 1}:
- الاسم: ${item.name || "غير محدد"}
- الوصف: ${item.description || "لا يوجد وصف"}
- المنصة: ${item.platform || "zahraa_curriculum"}
- URN: ${item.urn || "غير متاح"}
`
          )
          .join("\n")
      : "لا توجد أدلة DataHub متاحة لهذه الجلسة.";

  const context = `
المادة:
${session.subject || "غير محدد"}
>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)

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

<<<<<<< HEAD
أدلة المنهج:
${evidenceContext}
`;

  // ======================================================
  // TASK 1: ADAPTIVE QUESTION
  // ======================================================

=======
أدلة المنهج المسترجعة من DataHub:
${evidenceContext}
`;

>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)
  if (task === "adaptive_question") {
    return `
${rules}

${context}

المطلوب:

1. حلل الموقف دون إنشاء خطة تنفيذ.
2. حدد معلومة واحدة ناقصة فقط تؤثر فعلًا في القرار التربوي.
3. اطرح سؤالًا واحدًا فقط.
<<<<<<< HEAD
4. صنف السؤال إلى أحد الأنواع التالية:
   - سؤال تشخيصي
   - قيد تنفيذي
   - تفضيل مهني
5. اشرح باختصار لماذا تؤثر الإجابة في القرار.
=======
4. صنف السؤال إلى سؤال تشخيصي أو قيد تنفيذي أو تفضيل مهني.
5. اشرح باختصار سبب تأثير الإجابة.
>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)
6. اسمح بإجابة مفتوحة.
7. لا تقترح الحل النهائي.

اكتب النتيجة بهذه الصيغة:

نوع السؤال: ...
السؤال: ...
لماذا نسأل؟: ...
`;
  }

<<<<<<< HEAD
  // ======================================================
  // TASK 2: CONTEXT SUMMARY
  // ======================================================

=======
>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)
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

<<<<<<< HEAD
  // ======================================================
  // TASK 3: ALTERNATIVES
  // ======================================================

=======
>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)
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

<<<<<<< HEAD
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

=======
  if (task === "implementation_plan") {
    if (!session.teacherApproval) {
      throw new Error(
        "لا يمكن إنشاء الخطة قبل موافقة المعلم."
      );
    }

>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)
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

<<<<<<< HEAD
  // ======================================================
  // UNKNOWN TASK
  // ======================================================

  const unknownTaskError =
    new Error(
      "نوع المهمة غير معروف."
    );

  unknownTaskError.status = 400;

  throw unknownTaskError;
=======
  throw new Error(
    "نوع المهمة غير معروف."
  );
>>>>>>> 66d0950 (Add resilient Gemini pedagogical fallback)
}


// =====================================================
// TEXT CLEANER
// =====================================================

function cleanText(text) {
  return String(text || "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\$.*?\$/g, "")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\Rightarrow/g, "⇒")
    .replace(/\\[a-zA-Z]+/g, "")
    .trim();
}