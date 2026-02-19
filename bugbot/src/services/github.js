import { Octokit } from 'octokit';
import { config } from '../config.js';

const octokit = new Octokit({ auth: config.github.token });

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
 * Fetch the most recent commits on the default branch of a repo.
 */
export async function recentCommits(repoFullName, count = 5) {
  const [owner, repo] = repoFullName.split('/');
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    per_page: count,
  });
  return data.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    date: c.commit.author.date,
  }));
}

/**
 * Get the contents of a file from a repo (UTF-8 text only).
 */
export async function getFileContent(repoFullName, path) {
  const [owner, repo] = repoFullName.split('/');
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return data.content;
}
