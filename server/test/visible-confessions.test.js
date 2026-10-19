const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readVisibleConfessions } = require("../utils/visible-confessions");

test("optional reply counts fail soft alongside older optional columns", async () => {
  for (const replyError of [
    { code: "42P01", message: 'relation "public.replies" does not exist' },
    { code: "PGRST200", message: "Could not find a relationship between 'confessions' and 'replies' in the schema cache" },
    { code: "42703", message: "column reply_activity.is_hidden does not exist" },
  ]) {
    const attempts = [];
    const result = await readVisibleConfessions(() => { throw new Error("Must retain the moderation filter"); }, async (visible, options) => {
      attempts.push({ visible, ...options });
      if (options.withPoke) return { error: { code: "42703", message: "column confessions.poke_count does not exist" } };
      if (options.withAutomation) return { error: { code: "42703", message: "column confessions.is_automated does not exist" } };
      if (options.withReplies) return { error: replyError };
      return { data: [{ id: "sample" }] };
    });
    assert.equal(result.error, undefined);
    assert.deepEqual(result.data, [{ id: "sample", poke_count: 0, is_automated: false }]);
    assert.equal(attempts.length, 4);
    assert.ok(attempts.every(attempt => attempt.visible));
  }
});

test("optional count fallback never ignores permissions or parent moderation errors", async () => {
  for (const error of [
    { code: "42501", message: "permission denied for table replies" },
    { code: "42703", message: "column confessions.is_hidden does not exist" },
  ]) {
    const result = await readVisibleConfessions(() => ({
      from: () => ({ select: () => ({ limit: async () => ({ data: [{ id: "existing-report" }] }) }) }),
    }), async () => ({ error }));
    assert.equal(result.error, error);
  }
});
