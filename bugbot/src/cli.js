#!/usr/bin/env node

import { config, repos } from './config.js';
import { getBoards, getCardsFromList, addComment } from './services/trello.js';
import { searchCode, searchIssues, recentCommits, resolveBranch, getFileContent } from './services/github.js';

const [,, command, ...args] = process.argv;

function out(data) {
  console.log(JSON.stringify(data, null, 2));
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

const commands = {
  /** List all bug cards from configured Trello boards + list */
  async list() {
    const boards = await getBoards();
    if (!boards.length) die(`No boards found matching: ${config.trello.boards.join(', ')}`);

    const allCards = [];
    for (const board of boards) {
      const cards = await getCardsFromList(board.id);
      for (const card of cards) {
        allCards.push({
          id: card.id,
          board: board.name,
          name: card.name,
          labels: (card.labels || []).map((l) => l.name).filter(Boolean),
          lastActivity: card.dateLastActivity,
          url: card.url,
        });
      }
    }
    out(allCards);
  },

  /** Get full details of a single card by ID */
  async card() {
    const cardId = args[0];
    if (!cardId) die('Usage: cli.js card <cardId>');

    const boards = await getBoards();
    for (const board of boards) {
      const cards = await getCardsFromList(board.id);
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        out({
          id: card.id,
          board: board.name,
          name: card.name,
          desc: card.desc,
          labels: (card.labels || []).map((l) => l.name).filter(Boolean),
          lastActivity: card.dateLastActivity,
          url: card.url,
        });
        return;
      }
    }
    die(`Card ${cardId} not found in any configured board/list`);
  },

  /** Show the repos.json config */
  async repos() {
    out(repos);
  },

  /** Search code across the GitHub org */
  async 'search-code'() {
    const query = args.join(' ');
    if (!query) die('Usage: cli.js search-code <query>');
    out(await searchCode(query));
  },

  /** Search issues/PRs across the GitHub org */
  async 'search-issues'() {
    const query = args.join(' ');
    if (!query) die('Usage: cli.js search-issues <query>');
    out(await searchIssues(query));
  },

  /** Get recent commits for a repo (uses branch from repos.json or default) */
  async commits() {
    const repoName = args[0];
    const branchOverride = args[1];
    if (!repoName) die('Usage: cli.js commits <owner/repo> [branch]');

    const repoEntry = repos.find((r) => r.repo === repoName);
    const branch = branchOverride || await resolveBranch(repoName, repoEntry?.branch).catch(() => null);
    const commits = await recentCommits(repoName, branch, 10);
    out({ repo: repoName, branch, commits });
  },

  /** Read a file from a repo (uses branch from repos.json or default) */
  async 'read-file'() {
    const repoName = args[0];
    const filePath = args[1];
    const branchOverride = args[2];
    if (!repoName || !filePath) die('Usage: cli.js read-file <owner/repo> <path> [branch]');

    const repoEntry = repos.find((r) => r.repo === repoName);
    const branch = branchOverride || repoEntry?.branch || undefined;
    const content = await getFileContent(repoName, filePath, branch);
    console.log(content);
  },

  /** Post a comment on a Trello card */
  async comment() {
    const cardId = args[0];
    const text = args.slice(1).join(' ');
    if (!cardId || !text) die('Usage: cli.js comment <cardId> <text>');
    await addComment(cardId, text);
    out({ ok: true, cardId });
  },

  /** Show available commands */
  async help() {
    out({
      commands: [
        'list                              — List all bug cards from Trello',
        'card <cardId>                     — Get full details of a card',
        'repos                             — Show configured repo mappings',
        'search-code <query>               — Search code in the GitHub org',
        'search-issues <query>             — Search issues/PRs in the GitHub org',
        'commits <owner/repo> [branch]     — Recent commits for a repo',
        'read-file <owner/repo> <path> [branch] — Read a file from a repo',
        'comment <cardId> <text>           — Post a comment on a Trello card',
      ],
    });
  },
};

if (!command || !commands[command]) {
  die(`Unknown command: ${command || '(none)'}\nRun: node src/cli.js help`);
}

commands[command]().catch((err) => {
  die(`Error: ${err.message}`);
});
