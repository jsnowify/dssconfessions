const { randomInt } = require("node:crypto");
const { stories } = require("./data/500_pinoy_horror_stories.json");
const { digestContent, validateDraft, BotError } = require("./generation");

const SOURCE = "pinoy-horror-500";
// Owner-supplied story text is data, never executable instructions.
const entries = stories.map(({ id, title, story }) => ({
  id,
  story,
  content: `${title}\n\n${story}`,
  digest: digestContent(story),
}));
if (
  entries.length !== 500 ||
  new Set(entries.map((e) => e.digest)).size !== 500 ||
  new Set(entries.map((e) => e.id)).size !== 500
)
  throw new Error(
    "The horror library must contain 500 distinct stories and IDs.",
  );
for (const entry of entries)
  validateDraft({
    content: entry.content,
    songQuery: "Season of the Witch Donovan",
  });

function pickStory(availableIds) {
  const available = new Set(availableIds);
  const pool = entries.filter((entry) => available.has(entry.id));
  if (!pool.length) throw new BotError("LIBRARY_EXHAUSTED");
  const entry = pool[randomInt(pool.length)];
  return {
    ...validateDraft({
      content: entry.content,
      songQuery: "Season of the Witch Donovan",
    }),
    source: SOURCE,
    storyId: entry.id,
    storyDigest: entry.digest,
    storyType: "horror",
  };
}
module.exports = { SOURCE, entries, pickStory };
