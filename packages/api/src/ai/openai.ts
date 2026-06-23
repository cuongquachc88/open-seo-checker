import type { AICallOptions, AICallResult } from '../types/index.js';

export async function callOpenAI(options: AICallOptions): Promise<AICallResult> {
  const messages = options.messages ?? buildMessages(options);
  const body: Record<string, unknown> = {
    model: options.model,
    messages,
  };
  if (options.maxTokens !== undefined) {
    body.max_tokens = options.maxTokens;
  }
  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    choices: { message: { role: string; content: string } }[];
    model: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  const content = data.choices[0]?.message?.content ?? '';
  const usage = data.usage;

  return {
    content,
    model: data.model ?? options.model,
    usage: usage
      ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        }
      : undefined,
  };
}

function buildMessages(options: AICallOptions): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.prompt });
  return messages;
}
