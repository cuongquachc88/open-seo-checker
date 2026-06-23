import type { AICallOptions, AICallResult } from '../types/index.js';

export async function callGemini(options: AICallOptions): Promise<AICallResult> {
  const text = combinePrompt(options);
  const body: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text }],
      },
    ],
  };
  if (options.maxTokens !== undefined || options.temperature !== undefined) {
    const generationConfig: Record<string, unknown> = {};
    if (options.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (options.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    body.generationConfig = generationConfig;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent?key=${encodeURIComponent(options.apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  };

  const content = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
  const usage = data.usageMetadata;

  return {
    content,
    model: options.model,
    usage: usage
      ? {
          promptTokens: usage.promptTokenCount ?? 0,
          completionTokens: usage.candidatesTokenCount ?? 0,
          totalTokens: usage.totalTokenCount ?? (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0),
        }
      : estimateUsage(text, content),
  };
}

function combinePrompt(options: AICallOptions): string {
  const parts: string[] = [];
  if (options.systemPrompt) {
    parts.push(options.systemPrompt);
  }
  if (options.messages) {
    for (const m of options.messages) {
      parts.push(`${m.role}: ${m.content}`);
    }
  } else {
    parts.push(options.prompt);
  }
  return parts.join('\n\n');
}

function estimateUsage(prompt: string, completion: string): { promptTokens: number; completionTokens: number; totalTokens: number } {
  const promptTokens = Math.ceil(prompt.length / 4);
  const completionTokens = Math.ceil(completion.length / 4);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}
