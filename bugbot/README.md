# BugBot

A Claude Code slash command (`/bugbot`) that triages Trello bug cards against
your GitHub organisation's repos. Claude does the analysis — no external LLM
needed.

## Setup

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

Edit **`repos.json`** so it lists every repo in your org with a short
description and tags. You can optionally set a `branch` per repo (e.g.
`"branch": "dev"`). If omitted, BugBot uses the repo's default branch
(main/master) automatically.

## Usage

Inside Claude Code, type:

```
/bugbot
```

Claude will:
1. Pull your bug list from Trello
2. Let you pick which bug(s) to triage
3. Search your GitHub org's code, issues, and recent commits
4. Produce a developer-focused diagnosis with a specific fix plan
5. Optionally post the report back as a Trello comment

## CLI (for debugging / manual use)

```bash
node src/cli.js list                              # List bug cards
node src/cli.js card <cardId>                     # Full card details
node src/cli.js repos                             # Show repo map
node src/cli.js search-code <query>               # Search code in GitHub org
node src/cli.js search-issues <query>             # Search issues/PRs
node src/cli.js commits <owner/repo> [branch]     # Recent commits
node src/cli.js read-file <owner/repo> <path> [branch]  # Read a file
node src/cli.js comment <cardId> <text>           # Post Trello comment
```

All commands output JSON to stdout.

## Getting Trello Credentials (Read-Only)

1. Go to https://trello.com/power-ups/admin and grab your **API Key**.
2. Generate a **read-only** token by visiting:
   ```
   https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key=YOUR_KEY
   ```
3. If you want BugBot to post comments back, generate a token with
   `scope=read,write` instead.

## Getting a GitHub Token (Read-Only)

1. Go to https://github.com/settings/tokens → **Fine-grained tokens**.
2. Scope it to your org, **read-only Contents** permission.

## Project Structure

```
bugbot/
├── .env.example          # template for credentials
├── repos.json            # your org's repo map (edit this)
├── package.json
└── src/
    ├── cli.js             # CLI with subcommands (used by the skill)
    ├── config.js           # loads env + repos.json
    └── services/
        ├── trello.js       # Trello API (read cards, post comments)
        └── github.js       # GitHub API (search code/issues, read files)

.claude/commands/
└── bugbot.md              # Claude Code slash command definition
```
