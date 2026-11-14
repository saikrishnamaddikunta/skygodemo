import { GoogleGenAI } from "@google/genai";
import { ZodSchema } from "zod";
import { env, integrationStatus } from "../../config/env";
import { logger } from "../../utils/logger";

export const OMNITRANSIT_SYSTEM_INSTRUCTION = `You are SKYGO AI, an intelligent urban mobility advisory assistant.

Your purpose is to help commuters make safer, more economical,
environmentally responsible, and reliable transportation decisions.

You operate within a multi-modal transportation ecosystem.

Your responsibilities include:

1. Explaining optimized transportation routes.
2. Comparing journey alternatives.
3. Providing eco-friendly travel recommendations.
4. Explaining Carbon Coin earning opportunities.
5. Interpreting verified weather alerts.
6. Summarizing available safety indicators.
7. Recommending alternative transportation modes.
8. Helping commuters understand journey costs and duration.

CORE RULES:

SAFETY:
- Never guarantee that a route is completely safe.
- Never invent crime statistics or lighting information.
- Use only supplied safety data.
- Explicitly identify missing or outdated safety information.
- Prioritize verified road closures and severe hazards.

WEATHER:
- Use supplied weather information only.
- Never invent forecasts.
- Never independently classify a road as safe.
- Respect verified flood zones and official restrictions.
- Explain uncertainty clearly.

ROUTING:
- Never invent public transportation schedules.
- Never invent fares.
- Never invent journey availability.
- Distinguish estimates from verified information.
- Explain route trade-offs.

SUSTAINABILITY:
- Use supplied emission factors.
- Explain estimated CO2 savings.
- Never invent Carbon Coin balances.
- Never directly modify wallet transactions.
- Never bypass reward limits.

PERSONALIZATION:
- Respect user preferences.
- Provide understandable recommendations.
- Avoid unnecessary personal information.
- Do not make discriminatory assumptions.

RESPONSE STYLE:
- Be clear and concise.
- Explain technical information in everyday language.
- Use structured responses.
- Mention important warnings.
- Identify missing information.
- Never claim an action has been completed unless the application confirms it.

IMPORTANT:
You are an advisory intelligence layer, not the authoritative routing,
emergency, weather, or financial transaction system.

All operational decisions must be validated by the backend.`;

let genAIClient: GoogleGenAI | null = null;

if (integrationStatus.geminiConfigured) {
  genAIClient = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY
  });
}

export const aiUsageStats = {
  totalRequests: 0,
  geminiCallsSucceeded: 0,
  fallbackCallsUsed: 0
};

/**
 * Executes a structured JSON prompt against Gemini using `@google/genai`,
 * validates the output with Zod, and falls back deterministically if Gemini
 * is not configured or returns invalid output.
 */
export async function executeStructuredGeminiPrompt<T>(params: {
  taskName: string;
  userPrompt: string;
  schema: ZodSchema<T>;
  fallbackGenerator: () => T;
}): Promise<{ data: T; source: "GEMINI_AI" | "DETERMINISTIC_FALLBACK" }> {
  aiUsageStats.totalRequests += 1;

  if (!genAIClient) {
    aiUsageStats.fallbackCallsUsed += 1;
    const fallbackData = params.schema.parse(params.fallbackGenerator());
    return { data: fallbackData, source: "DETERMINISTIC_FALLBACK" };
  }

  const modelName = env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const response = await Promise.race([
      genAIClient.models.generateContent({
        model: modelName,
        contents: params.userPrompt,
        config: {
          systemInstruction: OMNITRANSIT_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.2
        }
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini request timeout (8000ms)")), 8000)
      )
    ]);

    const rawText = response.text || "";
    const parsedJson = JSON.parse(rawText);
    const validated = params.schema.parse(parsedJson);

    aiUsageStats.geminiCallsSucceeded += 1;
    logger.info("Gemini structured response validated", {
      taskName: params.taskName,
      model: modelName
    });

    return { data: validated, source: "GEMINI_AI" };
  } catch (err) {
    aiUsageStats.fallbackCallsUsed += 1;
    logger.warn("Gemini call failed or failed schema validation; using deterministic fallback", {
      taskName: params.taskName,
      reason: err instanceof Error ? err.message : "Unknown error"
    });
    const fallbackData = params.schema.parse(params.fallbackGenerator());
    return { data: fallbackData, source: "DETERMINISTIC_FALLBACK" };
  }
}
