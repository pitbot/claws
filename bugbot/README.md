# BugBot

Reads bug cards from a Trello board, cross-references them against your GitHub
organisation's repos, and produces developer-focused reports with suggested fix
approaches. Optionally posts the report back as a comment on the Trello card.

## Quick Start

```bash
cd bugbot
cp .env.example .env   # fill in your credentials
npm install
```

Edit **`.env`** with:

| Variable | Purpose |
|---|---|
| `TRELLO_API_KEY` | Your Trello API key |
| `TRELLO_TOKEN` | A **read-only** Trello token (see below) |
| `TRELLO_BOARDS` | Comma-separated board name(s) to watch |
| `TRELLO_LIST_NAME` | The column that holds bug cards (default `Bugs`) |
| `GITHUB_TOKEN` | A **read-only** GitHub fine-grained PAT |
| `GITHUB_ORG` | Your GitHub organisation name |
| `POST_COMMENT` | Set to `true` to post reports back to Trello |

Edit **`repos.json`** so it lists every repo in your org with a short
description and tags — this is how BugBot decides which repos are relevant to a
bug report.

Then run:

```bash
npm start            # process all bug cards
npm run dry-run      # same thing but skip posting comments
```

## Getting Trello Credentials (Read-Only)

1. Go to https://trello.com/power-ups/admin and grab your **API Key**.
2. Generate a **read-only** token by visiting:
   ```
   https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key=YOUR_KEY
   ```
3. If you want BugBot to post comments back (`POST_COMMENT=true`), generate a
   token with `scope=read,write` instead.

## Getting a GitHub Token (Read-Only)

1. Go to https://github.com/settings/tokens → **Fine-grained tokens**.
2. Scope it to your org, **read-only Contents** permission.

## How It Works

1. Fetches all cards from the configured Trello list.
2. For each card, scores every repo in `repos.json` by matching keywords and
   tags from the bug description.
3. Searches GitHub code and issues for relevant keywords.
4. Pulls recent commits from the most likely repos.
5. Produces a structured report:
   - Original bug description
   - Likely affected repos (ranked)
   - Related code files
   - Related issues / PRs
   - Recent commits
   - Suggested fix approach
6. Optionally posts the report as a comment on the Trello card.

## Project Structure

```
bugbot/
├── .env.example          # template for credentials
├── repos.json            # your org's repo map (edit this)
├── package.json
├── README.md
└── src/
    ├── index.js           # CLI entry point
    ├── config.js          # loads env + repos.json
    ├── services/
    │   ├── trello.js      # Trello API (read cards, post comments)
    │   └── github.js      # GitHub API (search code/issues, read files)
    └── lib/
        └── analyser.js    # repo matching, context gathering, report building
```
