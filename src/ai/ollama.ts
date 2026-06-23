import type { AICallOptions, AICallResult } from '../types/index.js';

export async function callOllama(options: AICallOptions): Promise<AICallResult> {
  const prompt = combinePrompt(options);
  const body: Record<string, unknown> = {
    model: options.model,
    prompt,
    stream: false,
  };
  if (options.systemPrompt) {
    body.system = options.systemPrompt;
  }
  if (options.temperature !== undefined) {
    body.options = { temperature: options.temperature };
  }

  const baseUrl = options.baseUrl ?? 'http://localhost:11434';
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    response?: string;
    model: string;
    prompt_eval_count?: number;
    eval_count?: number;
  };

  const content = data.response ?? '';

  return {
    content,
    model: data.model ?? options.model,
    usage:
      data.prompt_eval_count !== undefined || data.eval_count !== undefined
        ? {
            promptTokens: data.prompt_eval_count ?? 0,
            completionTokens: data.eval_count ?? 0,
            totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
          }
        : estimateUsage(prompt, content),
  };
}

function combinePrompt(options: AICallOptions): string {
  const parts: string[] = [];
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
