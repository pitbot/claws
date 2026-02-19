#!/usr/bin/env node

import { config } from './config.js';
import { getBoards, getCardsFromList, addComment } from './services/trello.js';
import { matchRepos, gatherContext, buildReport } from './lib/analyser.js';

const dryRun = process.argv.includes('--dry-run');

async function run() {
  console.log('BugBot starting…');

  // 1. Find boards
  const boards = await getBoards();
  if (boards.length === 0) {
    console.error(
      `No matching Trello boards found for: ${config.trello.boards.join(', ')}`,
    );
    process.exit(1);
  }
  console.log(`Found ${boards.length} board(s): ${boards.map((b) => b.name).join(', ')}`);

  // 2. Collect bug cards from the target list on every board
  let allCards = [];
  for (const board of boards) {
    const cards = await getCardsFromList(board.id);
    console.log(`  ${board.name} → "${config.trello.listName}" has ${cards.length} card(s)`);
    allCards = allCards.concat(cards);
  }

  if (allCards.length === 0) {
    console.log('No bug cards found. Nothing to do.');
    return;
  }

  // 3. Process each card
  for (const card of allCards) {
    console.log(`\nProcessing: ${card.name}`);

    // Match repos
    const matched = matchRepos(card);
    console.log(
      `  Matched ${matched.length} repo(s): ${matched.map((r) => r.repo).join(', ') || 'none'}`,
    );

    // Gather GitHub context
    const context = await gatherContext(card, matched);

    // Build report
    const report = buildReport(card, matched, context);
    console.log('\n' + report);

    // Optionally post as comment
    if (config.postComment && !dryRun) {
      console.log('  Posting report as Trello comment…');
      await addComment(card.id, report);
      console.log('  Comment posted.');
    } else if (config.postComment && dryRun) {
      console.log('  [dry-run] Would post report as Trello comment.');
    }
  }

  console.log('\nBugBot finished.');
}

run().catch((err) => {
  console.error('BugBot failed:', err.message);
  process.exit(1);
});
