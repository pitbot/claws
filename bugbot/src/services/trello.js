import { config } from '../config.js';

const BASE = 'https://api.trello.com/1';

async function trelloGet(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('key', config.trello.apiKey);
  url.searchParams.set('token', config.trello.token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Trello API ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Find board IDs that match the configured board names.
 */
export async function getBoards() {
  const all = await trelloGet('/members/me/boards', { fields: 'name' });
  const wanted = config.trello.boards.map((n) => n.toLowerCase());
  return all.filter((b) => wanted.includes(b.name.toLowerCase()));
}

/**
 * Return every card in the target list for a given board.
 */
export async function getCardsFromList(boardId) {
  const lists = await trelloGet(`/boards/${boardId}/lists`, { fields: 'name' });
  const target = lists.find(
    (l) => l.name.toLowerCase() === config.trello.listName.toLowerCase(),
  );
  if (!target) return [];

  const cards = await trelloGet(`/lists/${target.id}/cards`, {
    fields: 'name,desc,url,labels,dateLastActivity',
  });
  return cards;
}

/**
 * Return all lists (columns) for a board.
 */
export async function getLists(boardId) {
  return trelloGet(`/boards/${boardId}/lists`, { fields: 'name' });
}

/**
 * Move a card to a different list by list ID.
 */
export async function moveCard(cardId, listId) {
  const url = new URL(`${BASE}/cards/${cardId}`);
  url.searchParams.set('key', config.trello.apiKey);
  url.searchParams.set('token', config.trello.token);
  url.searchParams.set('idList', listId);

  const res = await fetch(url, { method: 'PUT' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Trello move failed ${res.status}: ${body}`);
  }
}

/**
 * Post a comment on a Trello card.
 */
export async function addComment(cardId, text) {
  const url = new URL(`${BASE}/cards/${cardId}/actions/comments`);
  url.searchParams.set('key', config.trello.apiKey);
  url.searchParams.set('token', config.trello.token);
  url.searchParams.set('text', text);

  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Trello comment failed ${res.status}: ${body}`);
  }
}
