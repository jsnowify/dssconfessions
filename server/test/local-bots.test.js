const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createGenerator,
  DEFAULT_SETTINGS,
  OPTIONS,
  validateDraft,
  digestContent,
  validateSettings,
} = require("../bots/generation");
const {
  createConfessionSubmission,
} = require("../services/confession-submission");
const { startLocalScheduler } = require("../bots/local-scheduler");
const { entries, pickStory, SOURCE } = require("../bots/story-library");

test("the imported collection is 500 validated original stories and random selection never repeats exhausted entries", () => {
  const available = entries.map((entry) => entry.id);
  const selected = [];
  while (available.length) {
    const draft = pickStory(available);
    const entry = entries.find((entry) => entry.id === draft.storyId);
    validateDraft(draft);
    assert.equal(draft.content, entry.content);
    assert.equal(draft.storyDigest, digestContent(entry.story));
    assert.equal(draft.source, SOURCE);
    selected.push(draft.storyId);
    available.splice(available.indexOf(draft.storyId), 1);
  }
  assert.equal(new Set(selected).size, 500);
  assert.notDeepEqual(
    selected,
    entries.map((entry) => entry.id),
  );
  assert.throws(
    () => pickStory([]),
    (error) => error.code === "LIBRARY_EXHAUSTED",
  );
  assert.equal(
    validateSettings({
      ...DEFAULT_SETTINGS,
      source: SOURCE,
      intervalMinutes: 720,
      language: "Tagalog",
      postLimit: 500,
    }).postLimit,
    500,
  );
});

test("built-in English funny and horror stories cover every style, tone and length without a provider", async () => {
  const generate = createGenerator({
    env: {},
    ai: () => assert.fail("Local writing must never call AI"),
  });
  assert.deepEqual(OPTIONS.languages, ["English"]);
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, language: "Taglish" }),
  );
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, storyTypes: ["unknown"] }),
  );
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, storyTypes: [] }),
  );
  const history = [];
  const digests = new Set();
  for (const storyType of OPTIONS.storyTypes) {
    for (const style of OPTIONS.styles)
      for (const tone of OPTIONS.tones)
        for (const length of OPTIONS.lengths) {
          const draft = await generate(
            {
              ...DEFAULT_SETTINGS,
              storyTypes: [storyType],
              style,
              tone,
              length,
            },
            history,
          );
          validateDraft(draft);
          assert.equal(draft.storyType, storyType);
          assert.ok(
            !digests.has(digestContent(draft.content)),
            "Duplicate writing",
          );
          digests.add(digestContent(draft.content));
          history.push(draft.content);
          if (length === "short") assert.ok(draft.content.length <= 220);
          if (length === "medium")
            assert.ok(
              draft.content.length >= 221 && draft.content.length <= 600,
            );
          if (length === "long")
            assert.ok(
              draft.content.length >= 601 && draft.content.length <= 1200,
              String(draft.content.length),
            );
        }
  }
  assert.equal(history.length, 128);
});

test("a separate bot author secret preserves human posting configuration and cannot be selected by visitors", async () => {
  const env = {
    SUPABASE_SERVICE_ROLE: "fixture-service-".repeat(4),
    BOT_DELETE_KEY_PEPPER: "fixture-bot-only-".repeat(4),
  };
  let publishes = 0;
  const submit = createConfessionSubmission({
    env,
    getDatabase: () => ({
      rpc: async () => {
        publishes++;
        return { data: { state: "submitted" } };
      },
    }),
    getToken: async () => "fixture-token",
    spotify: {
      get: async () => ({
        data: {
          id: "0123456789ABCDEFGHIJKL",
          name: "Sample Song",
          artists: [{ name: "Sample Artist" }],
        },
      }),
    },
  });
  const body = {
    to: "A fictional listener",
    from: "Mixtape Bot (fiction)",
    content:
      "[Automated fiction] A purely fictional test message for a local test.",
    song: { id: "0123456789ABCDEFGHIJKL" },
  };
  assert.equal(
    (await submit(body, { id: "fixture-job", lease: "fixture-lease" })).state,
    "submitted",
  );
  await assert.rejects(
    submit({
      ...body,
      is_automated: true,
      BOT_DELETE_KEY_PEPPER: env.BOT_DELETE_KEY_PEPPER,
    }),
    /Posting is unavailable/,
  );
  assert.equal(publishes, 1);
  assert.equal(env.DELETE_KEY_PEPPER, undefined);
});

test("local scheduler authenticates each tick and is disabled on serverless deployments", async (t) => {
  const calls = [];
  t.mock.timers.enable({ apis: ["setInterval"] });
  const env = {
    BOT_LOCAL_SCHEDULER: "1",
    CRON_SECRET: "fixture-cron-".repeat(4),
  };
  const request = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ state: "idle" }) };
  };
  const stop = startLocalScheduler({ env, port: 5000, request });
  t.mock.timers.tick(60000);
  await Promise.resolve();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:5000/api/cron/confession-bots");
  assert.equal(
    calls[0].options.headers.Authorization,
    `Bearer ${env.CRON_SECRET}`,
  );
  stop();
  startLocalScheduler({ env: { ...env, VERCEL: "1" }, port: 5000, request });
  t.mock.timers.tick(120000);
  assert.equal(calls.length, 1);
});
