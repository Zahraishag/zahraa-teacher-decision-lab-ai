const MODEL_NAME = "gemini-3.6-flash";

/*
  ZAHRAA™ Teacher Decision Lab
  Unified Gemini Reasoning Endpoint

  Workflow:
  Teacher Context
      ↓
  DataHub Evidence
      ↓
  Gemini Reasoning
      ↓
  Structured pedagogical output

  Important:
  - DataHub is retrieved once per Gemini request.
  - No implementation plan is generated before teacher approval.
  - Gemini quota errors are returned to the frontend in a readable form.
*/


export default async function handler(request, response) {

  /* =========================================================
     1. METHOD
  ========================================================= */

  if (request.method !== "POST") {

    return response.status(405).json({
      error: "يجب استخدام طلب POST."
    });

  }


  /* =========================================================
     2. API KEY
  ========================================================= */

  const rawApiKey = String(
    process.env.GEMINI_API_KEY || ""
  );


  const apiKey = rawApiKey

    .replace(
      /^GEMINI_API_KEY\s*=\s*/i,
      ""
    )

    .replace(
      /^["']+|["']+$/g,
      ""
    )

    .replace(
      /[\u0000-\u001F\u007F-\u009F\s]/g,
      ""
    )

    .trim();


  if (
    !apiKey ||
    apiKey.length < 20
  ) {

    return response.status(500).json({

      error:
        "قيمة GEMINI_API_KEY غير موجودة أو غير مكتملة في إعدادات Vercel."

    });

  }


  try {

    /* =========================================================
       3. READ REQUEST
    ========================================================= */

    const body =

      typeof request.body === "string"

        ? JSON.parse(request.body)

        : request.body;


    const {

      task,

      session,

      datahubEvidence

    } = body || {};


    if (
      !task ||
      !session
    ) {

      return response.status(400).json({

        error:
          "بيانات المهمة والجلسة مطلوبة."

      });

    }


    /* =========================================================
       4. EVIDENCE
    ========================================================= */

    let evidence = [];


    /*
      إذا تم تمرير evidence مسبقًا،
      نستخدمه مباشرة ولا نطلب DataHub مرة أخرى.
    */

    if (
      Array.isArray(datahubEvidence) &&
      datahubEvidence.length > 0
    ) {

      evidence =
        datahubEvidence.slice(0, 5);

      console.log(
        "Using supplied DataHub evidence:",
        evidence.length
      );

    } else {

      /*
        وإلا نجلب DataHub مرة واحدة فقط.
      */

      try {

        const protocol =

          request.headers[
            "x-forwarded-proto"
          ] || "https";


        const host =

          request.headers[
            "x-forwarded-host"
          ] ||

          request.headers.host;


        if (host) {

          const datahubResponse =
            await fetch(

              `${protocol}://${host}/api/datahub`,

              {

                method: "POST",

                headers: {

                  "Content-Type":
                    "application/json"

                },

                body:
                  JSON.stringify({

                    session

                  })

              }

            );


          if (
            datahubResponse.ok
          ) {

            const datahubData =
              await datahubResponse.json();


            if (
              datahubData?.connected === true &&
              Array.isArray(
                datahubData.evidence
              )
            ) {

              evidence =
                datahubData.evidence.slice(
                  0,
                  5
                );

            }

          } else {

            console.warn(
              "DataHub endpoint returned:",
              datahubResponse.status
            );

          }

        }


        console.log(
          "DataHub evidence count:",
          evidence.length
        );


      } catch (datahubError) {

        /*
          DataHub failure should NOT stop Gemini.
        */

        console.error(
          "Unable to retrieve DataHub evidence:",
          datahubError
        );

        evidence = [];

      }

    }


    /* =========================================================
       5. PROMPT
    ========================================================= */

    const prompt =
      buildPrompt(
        task,
        session,
        evidence
      );


    /* =========================================================
       6. GEMINI REQUEST
    ========================================================= */

    const geminiResponse =
      await fetch(

        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,

        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "x-goog-api-key":
              apiKey

          },

          body:
            JSON.stringify({

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


              /*
                لا نرسل temperature أو top_p أو top_k.
                هذه المعاملات deprecated في Gemini 3.6.
              */

              generationConfig: {

                maxOutputTokens: 4000

              }

            })

        }

      );


    /* =========================================================
       7. READ GEMINI RESPONSE SAFELY
    ========================================================= */

    let data = {};


    try {

      data =
        await geminiResponse.json();

    } catch {

      return response
        .status(502)
        .json({

          error:
            "لم تُرجع خدمة Gemini استجابة JSON صحيحة."

        });

    }


    /* =========================================================
       8. HANDLE 429 QUOTA
    ========================================================= */

    if (
      geminiResponse.status === 429
    ) {

      console.error(
        "Gemini quota exceeded:",
        JSON.stringify(data)
      );


      const retryAfter =

        geminiResponse.headers.get(
          "retry-after"
        );


      return response
        .status(429)
        .json({

          error:
            "تم الوصول إلى حد استخدام Gemini API لهذا المشروع. انتظري حتى يتجدد الحد أو راجعي Rate Limits / Billing في Google AI Studio.",

          code:
            "GEMINI_QUOTA_EXCEEDED",

          model:
            MODEL_NAME,

          retryAfter:
            retryAfter || null

        });

    }


    /* =========================================================
       9. HANDLE OTHER GEMINI ERRORS
    ========================================================= */

    if (
      !geminiResponse.ok
    ) {

      console.error(
        "Gemini API error:",
        JSON.stringify(data)
      );


      return response
        .status(
          geminiResponse.status
        )
        .json({

          error:

            data?.error?.message ||

            "حدث خطأ أثناء الاتصال بخدمة Gemini.",

          code:
            "GEMINI_API_ERROR",

          model:
            MODEL_NAME

        });

    }


    /* =========================================================
       10. EXTRACT TEXT
    ========================================================= */

    let text =

      data
        ?.candidates
        ?.[0]
        ?.content
        ?.parts

        ?.map(
          part =>
            part?.text || ""
        )

        .join("")

        .trim();


    /*
      تحقق أولًا قبل إجراء التنظيف.
    */

    if (!text) {

      console.error(
        "Gemini returned no text:",
        JSON.stringify(data)
      );


      return response
        .status(502)
        .json({

          error:
            "لم يُرجع Gemini استجابة نصية.",

          code:
            "EMPTY_GEMINI_RESPONSE"

        });

    }


    /* =========================================================
       11. CLEAN OUTPUT
    ========================================================= */

    text = cleanText(text);


    if (!text) {

      return response
        .status(502)
        .json({

          error:
            "أصبحت استجابة Gemini فارغة بعد المعالجة.",

          code:
            "EMPTY_CLEAN_RESPONSE"

        });

    }


    /* =========================================================
       12. SUCCESS
    ========================================================= */

    return response
      .status(200)
      .json({

        text,

        model:
          MODEL_NAME,

        evidenceCount:
          evidence.length,

        evidenceUsed:
          evidence.length > 0

      });


  } catch (error) {


    console.error(
      "Gemini endpoint server error:",
      error
    );


    return response
      .status(500)
      .json({

        error:

          error?.message ||

          "تعذر تشغيل محرك القرار."

      });

  }

}



/* =========================================================
   CLEAN TEXT
========================================================= */

function cleanText(text) {

  return String(text || "")

    /*
      Markdown headings
    */

    .replace(
      /#{1,6}\s*/g,
      ""
    )


    /*
      Bold / bullets
    */

    .replace(
      /\*\*/g,
      ""
    )

    .replace(
      /^\s*\*\s+/gm,
      ""
    )


    /*
      Simple LaTeX
    */

    .replace(
      /\$([^$]+)\$/g,
      "$1"
    )

    .replace(
      /\\rightarrow/g,
      "→"
    )

    .replace(
      /\\Rightarrow/g,
      "⇒"
    )


    /*
      Avoid deleting normal Arabic text.
      Only remove leftover LaTeX commands.
    */

    .replace(
      /\\[a-zA-Z]+/g,
      ""
    )


    /*
      Excess blank lines
    */

    .replace(
      /\n{3,}/g,
      "\n\n"
    )

    .trim();

}



/* =========================================================
   PROMPT
========================================================= */

function buildPrompt(
  task,
  session,
  evidence = []
) {


  /* =========================================================
     CORE RULES
  ========================================================= */

  const rules = `

أنت محرك الاستدلال التربوي داخل منصة:

ZAHRAA™ Teacher Decision Lab
مختبر زهراء للقرار التربوي.

مهمتك دعم تفكير المعلم قبل توليد الحل.

قواعد إلزامية:

1. القرار النهائي دائمًا بيد المعلم.

2. لا تنشئ خطة تنفيذ قبل موافقة المعلم الصريحة.

3. لا تخترع أرقامًا أو نسبًا أو بيانات غير موجودة في سياق الجلسة.

4. ميّز بوضوح بين:
   - ما أدخله المعلم.
   - أدلة المنهج.
   - القيود التنفيذية.
   - التفضيلات المهنية.
   - استنتاج النظام.

5. إذا كانت أدلة DataHub غير متاحة فلا تدّعِ أنها متاحة.

6. لا تستخدم خيارات ثنائية كاذبة.

7. لا تفترض أن هناك بديلًا واحدًا صحيحًا دائمًا.

8. استخدم العربية الفصحى الواضحة والمهنية.

9. اجعل المحتوى موجزًا بما يكفي ليقرأه المعلم بسهولة.

10. راجع الصياغة والأخطاء اللغوية قبل إخراج النتيجة.

`;


  /* =========================================================
     DATAHUB EVIDENCE
  ========================================================= */

  const evidenceContext =

    Array.isArray(evidence) &&
    evidence.length > 0

      ? evidence

          .slice(0,5)

          .map(
            (item,index) => `

دليل DataHub ${index + 1}:

الاسم:
${item?.name || "غير محدد"}

الوصف:
${item?.description || "لا يوجد وصف"}

المنصة:
${item?.platform || "zahraa_curriculum"}

URN:
${item?.urn || "غير متاح"}

`
          )

          .join("\n")

      : `

لا توجد أدلة DataHub متاحة لهذه الجلسة.

لا تدّعِ الاستناد إلى DataHub إذا لم توجد أدلة.

`;


  /* =========================================================
     TEACHER CONTEXT
  ========================================================= */

  const context = `

السياق الذي أدخله المعلم:

المادة:
${session.subject || "غير محدد"}

الصف أو المرحلة:
${session.gradeLevel || "غير محدد"}

موضوع الدرس:
${session.lessonTopic || "غير محدد"}

مدة الحصة:
${session.lessonDuration || "غير محدد"}

عدد الطلاب:
${session.studentCount || "غير محدد"}

مستوى الطلاب:
${session.studentLevel || "غير محدد"}

الهدف التعليمي:
${session.learningGoal || "غير محدد"}

التحدي التربوي:
${session.classChallenge || "غير محدد"}

الموارد المتاحة:
${session.availableResources || "غير محدد"}

القيود والتفضيلات:
${session.additionalConstraints || "غير محدد"}

إجابة المعلم عن السؤال التكيفي:
${session.adaptiveAnswer || "لا توجد إجابة بعد"}


أدلة المنهج:

${evidenceContext}

`;


  /* =========================================================
     ADAPTIVE QUESTION
  ========================================================= */

  if (
    task === "adaptive_question"
  ) {

    return `

${rules}

${context}

المطلوب:

حلل الموقف الحالي فقط.

حدد معلومة واحدة ناقصة ستغير القرار التربوي فعلًا.

اطرح سؤالًا واحدًا فقط على المعلم.

صنف السؤال إلى واحد فقط من:

سؤال تشخيصي
قيد تنفيذي
تفضيل مهني

اشرح في جملة قصيرة لماذا تؤثر الإجابة في القرار.

لا تنشئ بدائل.
لا تنشئ خطة تنفيذ.

اكتب النتيجة بهذه الصيغة حرفيًا:

نوع السؤال: ...
السؤال: ...
لماذا نسأل؟: ...

`;

  }


  /* =========================================================
     CONTEXT SUMMARY
  ========================================================= */

  if (
    task === "context_summary"
  ) {

    return `

${rules}

${context}

أنشئ ملخصًا مهنيًا موجزًا للموقف.

استخدم العناوين التالية فقط:

الأدلة التي قدمها المعلم:
...

القيود التنفيذية:
...

التفضيلات المهنية:
...

استنتاجات النظام:
...

المعلومات غير المؤكدة:
...

لا تنشئ بدائل.
لا ترشح قرارًا.
لا تنشئ خطة تنفيذ.

اختم بالعبارة:

الملخص بانتظار موافقة المعلم.

`;

  }


  /* =========================================================
     ALTERNATIVES
  ========================================================= */

  if (
    task === "alternatives"
  ) {

    return `

${rules}

${context}

المطلوب:

أنشئ ثلاثة بدائل تربوية مختلفة جوهريًا للموقف الحالي.

يجب أن تختلف البدائل في متغيرين تربويين على الأقل من:

نقطة بداية التعلم
تسلسل بناء المفهوم
دور المعلم
دور الطالب
نوع التمثيل
نوع التقويم
نوع التمايز
المخرج الأساسي

مهم:

لا تجعل البدائل مجرد إعادة صياغة للفكرة نفسها.

لا ترتبها من الأفضل إلى الأسوأ.

لا تقل إن أحدها هو الخيار الصحيح.

لا ترشح أي بديل.

لا تنشئ خطة تنفيذ.

اكتب ثلاثة بدائل فقط.

استخدم الصيغة التالية حرفيًا لكل بديل:


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


ثم ابدأ البديل التالي مباشرة بنفس الصيغة.

`;

  }


  /* =========================================================
     IMPLEMENTATION PLAN
  ========================================================= */

  if (
    task === "implementation_plan"
  ) {


    if (
      session.teacherApproval !== true
    ) {

      throw new Error(
        "لا يمكن إنشاء الخطة قبل موافقة المعلم."
      );

    }


    return `

${rules}

${context}

القرار الذي اختاره ووافق عليه المعلم:

${session.approvedDecision || "غير محدد"}


المطلوب:

أنشئ خطة تنفيذ لهذا القرار فقط.

يجب أن تعتمد الخطة على سياق المعلم والقرار الذي اعتمده.

يجب أن تتضمن:

هدف التعلم:
...

معايير النجاح:
...

التمهيد:
...

خطوات التنفيذ:
...

دور المعلم:
...

دور الطالب:
...

التمايز:
...

التقويم التكويني:
...

نقطة القرار أثناء التنفيذ:
...

الإغلاق:
...

بطاقة الخروج:
...


قواعد الزمن:

إذا كانت مدة الحصة محددة، يجب ألا يتجاوز مجموع أزمنة الأنشطة مدة الحصة.

إذا لم تكن مدة الحصة محددة، لا تخترع مدة كلية للحصة.

وضح في النهاية أن الخطة قابلة للتعديل من المعلم.

`;

  }


  /* =========================================================
     UNKNOWN TASK
  ========================================================= */

  throw new Error(
    "نوع المهمة غير معروف."
  );

}
