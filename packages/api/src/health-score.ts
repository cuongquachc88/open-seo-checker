import { getIssues, getUrls } from './storage/database.js';

const PRIORITY_WEIGHTS: Record<string, number> = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
  opportunity: 0.5,
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  'response-codes': 0.20,
  'page-titles': 0.15,
  'meta-descriptions': 0.10,
  'headings': 0.10,
  'content': 0.10,
  'links': 0.10,
  'images': 0.05,
  'canonicals': 0.05,
  'redirects': 0.05,
  'structured-data': 0.05,
  'security': 0.05,
  'accessibility': 0.05,
  'local-seo': 0.05,
  'ecommerce': 0.05,
  'urls': 0.05,
  'hreflang': 0.03,
  'pagination': 0.03,
  'duplicates': 0.03,
};

export function calculateHealthScore(runId: number): { score: number; breakdown: Record<string, number>; issues: number } {
  const urls = getUrls(runId, {});
  const issues = getIssues(runId);

  const totalUrls = Math.max(urls.length, 1);
  const totalIssues = issues.length;

  const weightedPenalty = issues.reduce((sum, issue) => {
    const weight = PRIORITY_WEIGHTS[issue.priority] ?? 1;
    return sum + weight;
  }, 0);

  // Normalize penalty by URL count so larger sites aren't unfairly penalized
  const normalizedPenalty = (weightedPenalty / totalUrls) * 10;
  const score = Math.max(0, Math.min(100, Math.round(100 - normalizedPenalty)));

  const breakdown: Record<string, number> = {};

  // Group issues by category and calculate per-category score
  const byCategory = new Map<string, { count: number; weightedPenalty: number }>();
  for (const issue of issues) {
    const category = issue.category || 'other';
    const current = byCategory.get(category) || { count: 0, weightedPenalty: 0 };
    current.count += 1;
    current.weightedPenalty += PRIORITY_WEIGHTS[issue.priority] ?? 1;
    byCategory.set(category, current);
  }

  for (const [category, data] of byCategory) {
    const normalized = (data.weightedPenalty / totalUrls) * 10;
    const categoryScore = Math.max(0, Math.min(100, Math.round(100 - normalized)));
    breakdown[category] = categoryScore;
  }

  // Ensure all categories have a score (default 100 if no issues)
  for (const category of Object.keys(CATEGORY_WEIGHTS)) {
    if (!(category in breakdown)) {
      breakdown[category] = 100;
    }
  }

  return { score, breakdown, issues: totalIssues };
}
