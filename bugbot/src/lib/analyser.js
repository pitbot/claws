import { repos } from '../config.js';
import { searchCode, searchIssues, recentCommits } from '../services/github.js';

/**
 * Score each repo in repos.json against a bug card.
 * Returns repos sorted by relevance (highest first).
 */
export function matchRepos(card) {
  const text = `${card.name} ${card.desc}`.toLowerCase();

  const scored = repos.map((r) => {
    let score = 0;

    // Check repo name fragments
    const repoName = r.repo.split('/').pop().toLowerCase();
    if (text.includes(repoName)) score += 3;

    // Check tags
    for (const tag of r.tags) {
      if (text.includes(tag.toLowerCase())) score += 1;
    }

    // Check description keywords
    const descWords = r.description.toLowerCase().split(/\W+/);
    for (const w of descWords) {
      if (w.length > 3 && text.includes(w)) score += 0.5;
    }

    return { ...r, score };
  });

  return scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}

/**
 * Pull together GitHub context for a set of matched repos + the card text.
 */
export async function gatherContext(card, matchedRepos) {
  const keywords = extractKeywords(card);
  const context = { codeHits: [], issueHits: [], commits: [] };

  // Search code + issues using the card's keywords
  if (keywords.length) {
    const query = keywords.slice(0, 5).join(' ');
    const [code, issues] = await Promise.all([
      searchCode(query).catch(() => []),
      searchIssues(query).catch(() => []),
    ]);
    context.codeHits = code;
    context.issueHits = issues;
  }

  // Fetch recent commits for the top matched repos
  const topRepos = matchedRepos.slice(0, 3);
  context.commits = (
    await Promise.all(
      topRepos.map(async (r) => {
        const commits = await recentCommits(r.repo).catch(() => []);
        return { repo: r.repo, commits };
      }),
    )
  ).filter((r) => r.commits.length > 0);

  return context;
}

/**
 * Build the developer-focused report.
 */
export function buildReport(card, matchedRepos, context) {
  const lines = [];

  lines.push('═══════════════════════════════════════════════════');
  lines.push(`BUG REPORT: ${card.name}`);
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');

  // Original description
  lines.push('── Original Bug Report ──');
  lines.push(card.desc || '(no description)');
  lines.push('');

  // Likely repos
  lines.push('── Likely Affected Repos ──');
  if (matchedRepos.length === 0) {
    lines.push('  Could not determine affected repos from the bug description.');
  }
  for (const r of matchedRepos) {
    lines.push(`  • ${r.repo}  (score ${r.score.toFixed(1)}) — ${r.description}`);
  }
  lines.push('');

  // Related code
  if (context.codeHits.length) {
    lines.push('── Related Code ──');
    for (const hit of context.codeHits.slice(0, 5)) {
      lines.push(`  ${hit.repo}  ${hit.path}`);
      lines.push(`    ${hit.url}`);
    }
    lines.push('');
  }

  // Related issues / PRs
  if (context.issueHits.length) {
    lines.push('── Related Issues / PRs ──');
    for (const issue of context.issueHits.slice(0, 5)) {
      lines.push(`  [${issue.state}] ${issue.repo}#${issue.number}: ${issue.title}`);
      lines.push(`    ${issue.url}`);
    }
    lines.push('');
  }

  // Recent commits in matched repos
  if (context.commits.length) {
    lines.push('── Recent Commits in Matched Repos ──');
    for (const group of context.commits) {
      lines.push(`  ${group.repo}:`);
      for (const c of group.commits) {
        lines.push(`    ${c.sha}  ${c.message}`);
      }
    }
    lines.push('');
  }

  // Suggested fix approach
  lines.push('── Suggested Fix Approach ──');
  lines.push(suggestFix(card, matchedRepos, context));
  lines.push('');

  lines.push(`── Trello Card ──`);
  lines.push(`  ${card.url}`);
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
}

// ── helpers ──────────────────────────────────────────────────

function extractKeywords(card) {
  const text = `${card.name} ${card.desc}`;
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'but', 'and', 'or', 'if',
    'this', 'that', 'these', 'those', 'it', 'its', 'i', 'we', 'you', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'our', 'your', 'his', 'their',
    'what', 'which', 'who', 'whom', 'bug', 'issue', 'error', 'problem',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 15);
}

function suggestFix(card, matchedRepos, context) {
  const parts = [];

  if (matchedRepos.length === 0) {
    return '  Not enough info to suggest a fix — review the bug description and add more detail.';
  }

  const primary = matchedRepos[0];
  parts.push(`  Primary repo: ${primary.repo}`);

  if (context.codeHits.length) {
    const topHit = context.codeHits[0];
    parts.push(`  Start investigation at: ${topHit.path} in ${topHit.repo}`);
  }

  if (context.issueHits.length) {
    const open = context.issueHits.filter((i) => i.state === 'open');
    if (open.length) {
      parts.push(`  There are ${open.length} open issue(s) that may be related — check those first to avoid duplicating work.`);
    }
  }

  const descLower = (card.desc || '').toLowerCase();
  if (descLower.includes('crash') || descLower.includes('exception') || descLower.includes('stack trace')) {
    parts.push('  The report mentions a crash/exception — look for unhandled errors or null checks in the related code paths.');
  } else if (descLower.includes('slow') || descLower.includes('performance') || descLower.includes('timeout')) {
    parts.push('  This looks performance-related — check for N+1 queries, missing indexes, or unbounded loops in the matched code.');
  } else if (descLower.includes('ui') || descLower.includes('display') || descLower.includes('css') || descLower.includes('layout')) {
    parts.push('  Appears to be a UI issue — inspect the relevant components and check for responsive / CSS regressions.');
  }

  if (parts.length === 1) {
    parts.push('  Review the matched code and recent commits for regressions or overlooked edge cases.');
  }

  return parts.join('\n');
}
