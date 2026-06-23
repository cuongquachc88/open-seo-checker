import type { AICallOptions, AICallResult } from '../types/index.js';

export async function callAnthropic(options: AICallOptions): Promise<AICallResult> {
  const messages = options.messages ?? buildMessages(options);
  const anthropicMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  const systemMessage = options.systemPrompt ?? messages.find(m => m.role === 'system')?.content;

  const body: Record<string, unknown> = {
    model: options.model,
    messages: anthropicMessages,
    max_tokens: options.maxTokens ?? 4096,
  };
  if (systemMessage) {
    body.system = systemMessage;
  }
  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    content: { type: string; text: string }[];
    model: string;
    usage?: { input_tokens: number; output_tokens: number };
  };

  const text = data.content?.map(c => c.text).join('') ?? '';
  const usage = data.usage;

  return {
    content: text,
    model: data.model ?? options.model,
    usage: usage
      ? {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
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
