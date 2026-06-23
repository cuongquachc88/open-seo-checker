import { getDatabase, getCrawlRun } from '../storage/database.js';
import type { BacklinkData } from '../types/index.js';
import { getDomain } from '../utils/url.js';

interface LinkRow {
  id: number;
  source_url: string;
  target_url: string;
  target_normalized_url: string;
  anchor_text: string | null;
  nofollow: number;
  created_at: string;
}

const KNOWN_PLATFORMS = [
  { pattern: /youtube\.com/i, name: 'YouTube', authority: 99 },
  { pattern: /facebook\.com/i, name: 'Facebook', authority: 96 },
  { pattern: /twitter\.com|x\.com/i, name: 'X/Twitter', authority: 94 },
  { pattern: /linkedin\.com/i, name: 'LinkedIn', authority: 95 },
  { pattern: /instagram\.com/i, name: 'Instagram', authority: 93 },
  { pattern: /pinterest\.com/i, name: 'Pinterest', authority: 92 },
  { pattern: /reddit\.com/i, name: 'Reddit', authority: 91 },
  { pattern: /wikipedia\.org/i, name: 'Wikipedia', authority: 98 },
  { pattern: /medium\.com/i, name: 'Medium', authority: 88 },
  { pattern: /github\.com/i, name: 'GitHub', authority: 94 },
  { pattern: /gitlab\.com/i, name: 'GitLab', authority: 90 },
  { pattern: /stackoverflow\.com/i, name: 'Stack Overflow', authority: 92 },
  { pattern: /yelp\.com/i, name: 'Yelp', authority: 89 },
  { pattern: /tripadvisor\.com/i, name: 'TripAdvisor', authority: 88 },
  { pattern: /trustpilot\.com/i, name: 'Trustpilot', authority: 87 },
  { pattern: /g2\.com/i, name: 'G2', authority: 86 },
  { pattern: /capterra\.com/i, name: 'Capterra', authority: 85 },
  { pattern: /crunchbase\.com/i, name: 'Crunchbase', authority: 88 },
  { pattern: /bloomberg\.com/i, name: 'Bloomberg', authority: 95 },
  { pattern: /forbes\.com/i, name: 'Forbes', authority: 93 },
  { pattern: /nytimes\.com/i, name: 'New York Times', authority: 95 },
  { pattern: /theguardian\.com/i, name: 'The Guardian', authority: 94 },
  { pattern: /bbc\.com|bbc\.co\.uk/i, name: 'BBC', authority: 96 },
  { pattern: /wordpress\.com|wordpress\.org/i, name: 'WordPress', authority: 85 },
  { pattern: /blogger\.com|blogspot\.com/i, name: 'Blogger', authority: 82 },
  { pattern: /tumblr\.com/i, name: 'Tumblr', authority: 80 },
  { pattern: /quora\.com/i, name: 'Quora', authority: 86 },
  { pattern: /soundcloud\.com/i, name: 'SoundCloud', authority: 83 },
  { pattern: /vimeo\.com/i, name: 'Vimeo', authority: 88 },
  { pattern: /tiktok\.com/i, name: 'TikTok', authority: 90 },
  { pattern: /snapchat\.com/i, name: 'Snapchat', authority: 88 },
];

export function analyzeBacklinks(runId: number): BacklinkData[] {
  const run = getCrawlRun(runId);
  if (!run) return [];

  const startDomain = getDomain(run.startUrl);
  if (!startDomain) return [];

  const db = getDatabase();
  const rows = db.prepare(
    `SELECT id, source_url, target_url, target_normalized_url, anchor_text, nofollow, created_at
     FROM links
     WHERE crawl_run_id = ? AND is_internal = 1`
  ).all(runId) as LinkRow[];

  const results: BacklinkData[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const sourceDomain = getDomain(row.source_url);
    if (!sourceDomain) continue;
    if (sourceDomain === startDomain) continue; // skip internal inlinks

    const key = `${row.source_url}|${row.target_url}|${row.anchor_text ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const platform = detectPlatform(row.source_url);
    const authority = platform?.authority ?? estimateAuthority(row.source_url, row.nofollow);
    const isToxic = isToxicDomain(row.source_url);

    results.push({
      sourceUrl: row.source_url,
      targetUrl: row.target_url,
      anchorText: row.anchor_text ?? undefined,
      dofollow: row.nofollow === 0,
      firstSeen: row.created_at,
      lastSeen: row.created_at,
      authority,
      isToxic,
    });
  }

  return results.sort((a, b) => (b.authority ?? 0) - (a.authority ?? 0));
}

function detectPlatform(url: string): { name: string; authority: number } | null {
  for (const platform of KNOWN_PLATFORMS) {
    if (platform.pattern.test(url)) {
      return { name: platform.name, authority: platform.authority };
    }
  }
  return null;
}

function estimateAuthority(url: string, nofollow: number): number {
  if (nofollow === 1) return 20;
  const tld = url.match(/\.(com|org|net|edu|gov)$/i);
  if (tld) {
    if (tld[1] === 'edu' || tld[1] === 'gov') return 80;
    return 50;
  }
  return 30;
}

function isToxicDomain(url: string): boolean {
  const toxicPatterns = [
    /spam/i,
    /porn/i,
    /xxx/i,
    /gambling/i,
    /casino/i,
    /payday/i,
    /pharma/i,
    /warez/i,
    /torrent/i,
    /blackhat/i,
  ];
  return toxicPatterns.some(pattern => pattern.test(url));
}
