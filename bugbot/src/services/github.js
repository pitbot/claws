import { Octokit } from 'octokit';
import { config } from '../config.js';

const octokit = new Octokit({ auth: config.github.token });

/**
 * Resolve the branch to use for a repo entry.
 * If a branch is specified in repos.json, use that.
 * Otherwise detect the default branch from the GitHub API.
 */
export async function resolveBranch(repoFullName, configuredBranch) {
  if (configuredBranch) return configuredBranch;

  const [owner, repo] = repoFullName.split('/');
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data.default_branch;
}

/**
 * Search code in the org for a query string.
 * Returns the top 10 results with file path + repo.
 */
export async function searchCode(query) {
  const q = `${query} org:${config.github.org}`;
  const { data } = await octokit.rest.search.code({
    q,
    per_page: 10,
  });
  return data.items.map((item) => ({
    repo: item.repository.full_name,
    path: item.path,
    url: item.html_url,
  }));
}

/**
 * Search issues / PRs in the org for a query string.
 */
export async function searchIssues(query) {
  const q = `${query} org:${config.github.org}`;
  const { data } = await octokit.rest.search.issuesAndPullRequests({
    q,
    per_page: 10,
  });
  return data.items.map((item) => ({
    repo: item.repository_url.split('/').slice(-2).join('/'),
    title: item.title,
    number: item.number,
    state: item.state,
    url: item.html_url,
  }));
}

/**
 * Fetch the most recent commits on a specific branch of a repo.
 * If branch is not provided, GitHub returns commits from the default branch.
 */
export async function recentCommits(repoFullName, branch, count = 5) {
  const [owner, repo] = repoFullName.split('/');
  const opts = { owner, repo, per_page: count };
  if (branch) opts.sha = branch;

  const { data } = await octokit.rest.repos.listCommits(opts);
  return data.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    date: c.commit.author.date,
  }));
}

/**
 * Get the contents of a file from a repo at a specific branch/ref.
 */
export async function getFileContent(repoFullName, path, branch) {
  const [owner, repo] = repoFullName.split('/');
  const opts = { owner, repo, path };
  if (branch) opts.ref = branch;

  const { data } = await octokit.rest.repos.getContent(opts);
  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return data.content;
}
