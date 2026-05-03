import { NextRequest, NextResponse } from "next/server";
import { EvoltScanResult } from "@/lib/parseEvolts";
import { logger } from "@/lib/axiom/server";
export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body: EvoltScanResult = await req.json();

    const prompt = buildPrompt(body);

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a professional fitness and nutrition coach. Always respond with valid JSON only, no markdown, no extra text.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
          response_format: { type: "json_object" }, // forces valid JSON output
        }),
      },
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.choices?.[0]?.message?.content ?? "";
    const insights = JSON.parse(text);
    logger.info("Coaching insights generated", {
      duration: Date.now() - start,
      name: data.meta?.name,
    });
    return NextResponse.json(insights);
  } catch (error: any) {
    logger.error("Coaching failed", {
      error: error.message,
      duration: Date.now() - start,
    });
    return NextResponse.json(
      { error: "Failed to generate insights", message: error?.message },
      { status: 500 },
    );
  }
}

function buildPrompt(data: EvoltScanResult): string {
  const { meta, bodyComposition, segmental, nutrition } = data;

  const bodyLines = bodyComposition
    .map((x) => `- ${x.label}: ${x.value}`)
    .join("\n");

  const segLines = segmental.map((x) => `- ${x.label}: ${x.value}`).join("\n");

  const nutLines = [
    nutrition.calories && `- Daily Calories: ${nutrition.calories} kcal`,
    nutrition.protein && `- Protein target: ${nutrition.protein}`,
    nutrition.carbs && `- Carbohydrates target: ${nutrition.carbs}`,
    nutrition.fat && `- Fat target: ${nutrition.fat}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `
You are a professional fitness and nutrition coach analyzing an Evolt 360 body composition scan.

Patient: ${meta.name ?? "Unknown"}, Age: ${meta.age ?? "?"}, Gender: ${meta.gender ?? "?"}, Height: ${meta.height ?? "?"}, Weight: ${meta.weight ?? "?"}

BODY COMPOSITION:
${bodyLines}

SEGMENTAL ANALYSIS:
${segLines}

NUTRITION TARGETS (personalized based on their body scan):
${nutLines}

Based on this data, provide personalized coaching insights. Be encouraging, specific, and actionable.
When discussing nutrition, reference the exact macro targets above (calories, protein, carbs, fat amounts and percentages).
Explain WHY these specific targets were set based on their body composition results.

Respond ONLY with a valid JSON object in this exact structure, no markdown, no extra text:
{
  "summary": "2-3 sentence overall assessment of their body composition",
  "highlights": [
    { "label": "short label", "text": "positive thing to note", "type": "positive" },
    { "label": "short label", "text": "area needing attention", "type": "warning" }
  ],
  "recommendations": [
    { "category": "Training", "tip": "specific actionable advice" },
    { "category": "Nutrition", "tip": "specific actionable advice referencing their exact macro targets" },
    { "category": "Macros", "tip": "explain the macro split (protein/carbs/fat percentages) and how to hit these targets through food choices" },
    { "category": "Recovery", "tip": "specific actionable advice" }
  ],
  "focus": "One single most important thing they should focus on this week",
  "macroInsight": "2-3 sentences explaining their calorie and macro targets in plain language — why these numbers, how they relate to their body composition, and one practical tip to hit them"
}
Highlights should have 2-4 items mixing positive and warning types. Recommendations should have 4 items including the Macros category.
`.trim();
}
