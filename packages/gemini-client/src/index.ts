import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

/** Wraps @google/generative-ai with error handling for all Nexus Civic modules */
export class GeminiClient {
  private readonly textModel: GenerativeModel;
  private readonly visionModel: GenerativeModel;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Initialize Gemini models for text and vision workloads.
    this.textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.visionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /** Used by: PulseReport (grievance classification), CivicPulse (sentiment)
   * @returns { category, confidence (0-1), reasoning }
   * Fallback: { category: categories[0], confidence: 0, reasoning: 'classification failed' }
   */
  async classifyText(text: string, categories: string[]): Promise<ClassificationResult> {
    const fallback: ClassificationResult = {
      category: categories[0] ?? 'unknown',
      confidence: 0,
      reasoning: 'classification failed',
    };

    const prompt = [
      'You are a civic incident text classifier.',
      'Classify the provided text into one of the allowed categories.',
      `Allowed categories: ${JSON.stringify(categories)}.`,
      'Return ONLY valid JSON with this exact shape:',
      '{"category":"string","confidence":0.0,"reasoning":"string"}',
      `Input text: ${text}`,
    ].join('\n');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.textModel.generateContent(prompt);
        const parsed = this.parseJson<Partial<ClassificationResult>>(response.response.text());
        const category =
          typeof parsed.category === 'string' && categories.includes(parsed.category)
            ? parsed.category
            : fallback.category;
        return {
          category,
          confidence: this.clampNumber(parsed.confidence, 0, 1, 0),
          reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : fallback.reasoning,
        };
      } catch {
        if (attempt < 2) {
          await this.waitWithBackoff(attempt);
          continue;
        }
        // Fallback return when Gemini classification fails after retries.
        return fallback;
      }
    }

    // Fallback return when Gemini classification fails after retries.
    return fallback;
  }

  /** Used by: TerraScan (env reports), SentinelAI (crime briefings), CivicPulse (daily briefing)
   * @returns markdown string report
   * Fallback: 'Report generation failed. Please try again.'
   */
  async generateReport(prompt: string, contextData: Record<string, unknown>): Promise<string> {
    const fallback = 'Report generation failed. Please try again.';
    const request = [
      'You are a civic analytics report writer.',
      'Produce a concise but informative markdown report from the prompt and context.',
      'Return ONLY valid JSON with this exact shape:',
      '{"reportMarkdown":"string"}',
      `Prompt: ${prompt}`,
      `Context JSON: ${JSON.stringify(contextData)}`,
    ].join('\n');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.textModel.generateContent(request);
        const parsed = this.parseJson<{ reportMarkdown?: unknown }>(response.response.text());
        if (typeof parsed.reportMarkdown === 'string' && parsed.reportMarkdown.trim().length > 0) {
          return parsed.reportMarkdown;
        }
        return fallback;
      } catch {
        if (attempt < 2) {
          await this.waitWithBackoff(attempt);
          continue;
        }
        // Fallback return when Gemini report generation fails after retries.
        return fallback;
      }
    }

    // Fallback return when Gemini report generation fails after retries.
    return fallback;
  }

  /** Used by: PulseReport (prevent duplicate grievances)
   * @returns { isDuplicate, matchedId?, similarity (0-1) }
   * Fallback: { isDuplicate: false, similarity: 0 }
   */
  async detectDuplicate(
    newText: string,
    existing: Array<{ id: string; text: string }>,
  ): Promise<DuplicateResult> {
    const fallback: DuplicateResult = { isDuplicate: false, similarity: 0 };

    const request = [
      'You are a duplicate detector for civic grievances.',
      'Compare a new grievance against existing grievances and identify the closest duplicate.',
      'Return ONLY valid JSON with this exact shape:',
      '{"isDuplicate":true,"matchedId":"string","similarity":0.0}',
      `New grievance: ${newText}`,
      `Existing grievances JSON: ${JSON.stringify(existing)}`,
    ].join('\n');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.textModel.generateContent(request);
        const parsed = this.parseJson<Partial<DuplicateResult>>(response.response.text());
        return {
          isDuplicate: Boolean(parsed.isDuplicate),
          matchedId: typeof parsed.matchedId === 'string' ? parsed.matchedId : undefined,
          similarity: this.clampNumber(parsed.similarity, 0, 1, 0),
        };
      } catch {
        if (attempt < 2) {
          await this.waitWithBackoff(attempt);
          continue;
        }
        // Fallback return when Gemini duplicate detection fails after retries.
        return fallback;
      }
    }

    // Fallback return when Gemini duplicate detection fails after retries.
    return fallback;
  }

  /** Used by: NearGive (item quality check), TerraScan (satellite image analysis)
   * @param base64Image - base64 encoded image
   * @returns { findings, severity (1-5), recommendations, accepted }
   * Fallback: { findings: [], severity: 1, recommendations: [], accepted: true }
   */
  async analyzeImage(base64Image: string, prompt: string): Promise<ImageAnalysisResult> {
    const fallback: ImageAnalysisResult = {
      findings: [],
      severity: 1,
      recommendations: [],
      accepted: true,
    };

    const { data, mimeType } = this.normalizeImageInput(base64Image);
    const instruction = [
      'You are an image analysis assistant for civic safety and aid workflows.',
      'Analyze the image based on the provided prompt.',
      'Return ONLY valid JSON with this exact shape:',
      '{"findings":["string"],"severity":1,"recommendations":["string"],"accepted":true}',
      `Analysis prompt: ${prompt}`,
    ].join('\n');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.visionModel.generateContent([
          { text: instruction },
          {
            inlineData: {
              data,
              mimeType,
            },
          },
        ]);
        const parsed = this.parseJson<Partial<ImageAnalysisResult>>(response.response.text());
        return {
          findings: Array.isArray(parsed.findings)
            ? parsed.findings.filter((item): item is string => typeof item === 'string')
            : [],
          severity: this.clampNumber(parsed.severity, 1, 5, 1),
          recommendations: Array.isArray(parsed.recommendations)
            ? parsed.recommendations.filter((item): item is string => typeof item === 'string')
            : [],
          accepted: typeof parsed.accepted === 'boolean' ? parsed.accepted : true,
        };
      } catch {
        if (attempt < 2) {
          await this.waitWithBackoff(attempt);
          continue;
        }
        // Fallback return when Gemini image analysis fails after retries.
        return fallback;
      }
    }

    // Fallback return when Gemini image analysis fails after retries.
    return fallback;
  }

  /** Used by: LedgerCivic (budget Q&A for citizens)
   * @returns plain language answer string
   * Fallback: 'Unable to answer at this time. Please check back later.'
   */
  async answerQuestion(question: string, context: string): Promise<string> {
    const fallback = 'Unable to answer at this time. Please check back later.';
    const request = [
      'You are a civic assistant that explains budget and governance topics in plain language.',
      'Answer the user question using only the provided context.',
      'Return ONLY valid JSON with this exact shape:',
      '{"answer":"string"}',
      `Question: ${question}`,
      `Context: ${context}`,
    ].join('\n');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.textModel.generateContent(request);
        const parsed = this.parseJson<{ answer?: unknown }>(response.response.text());
        if (typeof parsed.answer === 'string' && parsed.answer.trim().length > 0) {
          return parsed.answer;
        }
        return fallback;
      } catch {
        if (attempt < 2) {
          await this.waitWithBackoff(attempt);
          continue;
        }
        // Fallback return when Gemini Q&A fails after retries.
        return fallback;
      }
    }

    // Fallback return when Gemini Q&A fails after retries.
    return fallback;
  }

  /** Used by: SentinelAI (crime risk per location+time)
   * @returns { riskScore (1-10), reasoning, recommendedPatrols }
   * Fallback: { riskScore: 3, reasoning: 'prediction unavailable', recommendedPatrols: [] }
   */
  async predictCrimeRisk(
    location: { lat: number; lng: number },
    timeSlot: string,
    historicalData: unknown[],
  ): Promise<RiskPrediction> {
    const fallback: RiskPrediction = {
      riskScore: 3,
      reasoning: 'prediction unavailable',
      recommendedPatrols: [],
    };

    const request = [
      'You are a crime-risk prediction assistant for city patrol planning.',
      'Estimate risk from 1 to 10 and recommend practical patrol actions.',
      'Return ONLY valid JSON with this exact shape:',
      '{"riskScore":1,"reasoning":"string","recommendedPatrols":["string"]}',
      `Location JSON: ${JSON.stringify(location)}`,
      `Time slot: ${timeSlot}`,
      `Historical data JSON: ${JSON.stringify(historicalData)}`,
    ].join('\n');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.textModel.generateContent(request);
        const parsed = this.parseJson<Partial<RiskPrediction>>(response.response.text());
        return {
          riskScore: this.clampNumber(parsed.riskScore, 1, 10, 3),
          reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : fallback.reasoning,
          recommendedPatrols: Array.isArray(parsed.recommendedPatrols)
            ? parsed.recommendedPatrols.filter((item): item is string => typeof item === 'string')
            : [],
        };
      } catch {
        if (attempt < 2) {
          await this.waitWithBackoff(attempt);
          continue;
        }
        // Fallback return when Gemini crime risk prediction fails after retries.
        return fallback;
      }
    }

    // Fallback return when Gemini crime risk prediction fails after retries.
    return fallback;
  }

  /** Used by: AuraAssist (intent detection from user query)
   * @returns { action: string, module: string } — parsed from Gemini JSON response
   * Fallback: { action: 'unknown', module: 'unknown' }
   */
  async detectIntent(
    query: string,
    knownActions: string[],
    knownModules: string[],
  ): Promise<IntentResult> {
    const fallback: IntentResult = { action: 'unknown', module: 'unknown' };

    const request = [
      'You are an intent router for a civic AI assistant.',
      'Choose the best action and module based on the user query.',
      `Known actions: ${JSON.stringify(knownActions)}`,
      `Known modules: ${JSON.stringify(knownModules)}`,
      'Return ONLY valid JSON with this exact shape:',
      '{"action":"string","module":"string"}',
      `Query: ${query}`,
    ].join('\n');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.textModel.generateContent(request);
        const parsed = this.parseJson<Partial<IntentResult>>(response.response.text());

        const action =
          typeof parsed.action === 'string' && knownActions.includes(parsed.action)
            ? parsed.action
            : fallback.action;
        const module =
          typeof parsed.module === 'string' && knownModules.includes(parsed.module)
            ? parsed.module
            : fallback.module;

        return { action, module };
      } catch {
        if (attempt < 2) {
          await this.waitWithBackoff(attempt);
          continue;
        }
        // Fallback return when Gemini intent detection fails after retries.
        return fallback;
      }
    }

    // Fallback return when Gemini intent detection fails after retries.
    return fallback;
  }

  private async waitWithBackoff(attempt: number): Promise<void> {
    const delayMs = 1000 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private parseJson<T>(raw: string): T {
    const trimmed = raw.trim();

    if (trimmed.startsWith('```')) {
      const withoutFences = trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '');
      return JSON.parse(withoutFences) as T;
    }

    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      return JSON.parse(candidate) as T;
    }

    return JSON.parse(trimmed) as T;
  }

  private clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, value));
  }

  private normalizeImageInput(base64Image: string): { data: string; mimeType: string } {
    const match = /^data:(.+);base64,(.+)$/i.exec(base64Image.trim());
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
    return { mimeType: 'image/png', data: base64Image.trim() };
  }
}

export function createGeminiClient(apiKey: string): GeminiClient {
  return new GeminiClient(apiKey);
}

/** Export all return type interfaces */
export interface ClassificationResult {
  category: string;
  confidence: number;
  reasoning: string;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  matchedId?: string;
  similarity: number;
}

export interface ImageAnalysisResult {
  findings: string[];
  severity: number;
  recommendations: string[];
  accepted: boolean;
}

export interface RiskPrediction {
  riskScore: number;
  reasoning: string;
  recommendedPatrols: string[];
}

export interface IntentResult {
  action: string;
  module: string;
}
