export function generateTitleImprovementPrompt(
  url: string,
  currentTitle: string,
  h1: string,
  content: string
): string {
  return `You are an SEO expert reviewing a page title.

URL: ${url}
Current title: ${currentTitle || '(none)'}
H1: ${h1 || '(none)'}
Page content excerpt:
${truncate(content, 2000)}

Suggest an improved title tag. Explain why it is better. Keep it under 60 characters and make it compelling for search results.`;
}

export function generateMetaDescriptionImprovementPrompt(
  url: string,
  title: string,
  currentDescription: string,
  content: string
): string {
  return `You are an SEO expert reviewing a meta description.

URL: ${url}
Page title: ${title || '(none)'}
Current meta description: ${currentDescription || '(none)'}
Page content excerpt:
${truncate(content, 2000)}

Suggest an improved meta description. Explain why it is better. Keep it between 120-158 characters and make it click-worthy.`;
}

export function generateContentQualityPrompt(
  url: string,
  content: string,
  targetKeyword: string
): string {
  return `You are an SEO content strategist reviewing a page.

URL: ${url}
Target keyword: ${targetKeyword}
Page content:
${truncate(content, 3000)}

Evaluate the content quality for SEO. Provide a short score (1-10) and a list of 3-5 specific, actionable improvements to better target the keyword and satisfy search intent.`;
}

export function generateIssueFixPrompt(
  url: string,
  issueType: string,
  issueDescription: string
): string {
  return `You are an SEO technical expert helping fix a website issue.

URL: ${url}
Issue type: ${issueType}
Issue description: ${issueDescription}

Provide a concise, step-by-step fix recommendation. Include file or template areas to check when relevant.`;
}

function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
