import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function required(name) {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing required env var: ${name}  — see .env.example`);
    process.exit(1);
  }
  return val;
}

export const config = {
  trello: {
    apiKey: required('TRELLO_API_KEY'),
    token: required('TRELLO_TOKEN'),
    boards: (process.env.TRELLO_BOARDS || '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean),
    listName: process.env.TRELLO_LIST_NAME || 'Bugs',
  },
  github: {
    token: required('GITHUB_TOKEN'),
    org: required('GITHUB_ORG'),
  },
  postComment: process.env.POST_COMMENT === 'true',
};

const reposPath = resolve(__dirname, '..', 'repos.json');
export const repos = JSON.parse(readFileSync(reposPath, 'utf-8'));
