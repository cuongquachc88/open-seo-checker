import * as cheerio from 'cheerio';
import type { AICallOptions, AICallResult, AIPrompt, CrawlConfig, CrawlUrl } from '../types/index.js';
import {
  getIssues,
  getUrlById,
  getUrls,
  updateIssue,
  updateUrl,
} from '../storage/database.js';
import { callAnthropic } from './anthropic.js';
import { callGemini } from './gemini.js';
import { callKimi } from './kimi.js';
import { callMinimax } from './minimax.js';
import { callOllama } from './ollama.js';
import { callOpenAI } from './openai.js';
import {
  generateContentQualityPrompt,
  generateIssueFixPrompt,
  generateMetaDescriptionImprovementPrompt,
  generateTitleImprovementPrompt,
} from './prompts.js';

export async function callAI(options: AICallOptions): Promise<AICallResult> {
  switch (options.provider) {
    case 'openai':
      return callOpenAI(options);
    case 'anthropic':
      return callAnthropic(options);
    case 'gemini':
      return callGemini(options);
    case 'kimi':
      return callKimi(options);
    case 'minimax':
      return callMinimax(options);
    case 'ollama':
      return callOllama(options);
    default:
      throw new Error(`Unsupported AI provider: ${(options as AICallOptions).provider}`);
  }
}

export async function runAIAnalysis(runId: number, config: CrawlConfig): Promise<void> {
  if (!config.aiPrompts || config.aiPrompts.length === 0) return;

  const allUrls = getUrls(runId, { isInternal: true });
  if (allUrls.length === 0) return;

  for (const prompt of config.aiPrompts) {
    const apiKey = config.apiKeys?.[prompt.provider];
    if (!apiKey) continue;

    const targetUrls = selectTargetUrls(allUrls, prompt, runId);
    if (targetUrls.length === 0) continue;

    for (const url of targetUrls) {
      const promptText = substitutePrompt(prompt.prompt, url, config);
      try {
        const result = await callAI({
          provider: prompt.provider,
          model: prompt.model,
          prompt: promptText,
          systemPrompt: 'You are an SEO expert. Provide concise, actionable advice.',
          apiKey,
          maxTokens: 1024,
          temperature: 0.4,
        });
        const aiResults = url.aiResults ? { ...url.aiResults } : {};
        aiResults[prompt.name] = result.content;
        updateUrl(url.id!, { aiResults });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`AI analysis failed for ${url.address} prompt "${prompt.name}": ${message}`);
      }
    }
  }
}

export async function generateRecommendations(runId: number, config: CrawlConfig): Promise<void> {
  const prompt = config.aiPrompts?.find(p => p.applyTo === 'issue') ?? config.aiPrompts?.[0];
  if (!prompt) return;

  const apiKey = config.apiKeys?.[prompt.provider];
  if (!apiKey) return;

  const issues = getIssues(runId);
  if (issues.length === 0) return;

  for (const issue of issues) {
    if (issue.howToFix && issue.howToFix.trim().length > 0) continue;

    const url = getUrlById(issue.urlId);
    if (!url) continue;

    const promptText = generateIssueFixPrompt(url.address, issue.type, issue.description);
    try {
      const result = await callAI({
        provider: prompt.provider,
        model: prompt.model,
        prompt: promptText,
        systemPrompt: 'You are an SEO expert. Provide a concise, actionable fix recommendation.',
        apiKey,
        maxTokens: 600,
        temperature: 0.3,
      });
      updateIssue(issue.id!, { howToFix: result.content });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Recommendation failed for issue ${issue.id}: ${message}`);
    }
  }
}

function selectTargetUrls(urls: CrawlUrl[], prompt: AIPrompt, runId: number): CrawlUrl[] {
  if (prompt.applyTo === 'issue') {
    if (!prompt.targetIssueType) return [];
    const issues = getIssues(runId, prompt.targetIssueType);
    const urlIds = new Set(issues.map(i => i.urlId));
    return urls.filter(u => u.id !== undefined && urlIds.has(u.id));
  }
  return urls;
}

function substitutePrompt(template: string, url: CrawlUrl, config: CrawlConfig): string {
  const content = extractTextContent(url.rawHtml || url.renderedHtml || '');
  const replacements: Record<string, string> = {
    url: url.address,
    title: url.title1 || '',
    currentTitle: url.title1 || '',
    h1: url.h1 || '',
    h2: url.h2 || '',
    currentDescription: url.metaDescription1 || '',
    metaDescription: url.metaDescription1 || '',
    content,
  };

  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    return replacements[key] ?? `{${key}}`;
  });
}

function extractTextContent(html: string): string {
  if (!html) return '';
  try {
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
