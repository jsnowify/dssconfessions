const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createApp } = require("../app");

const TRACK_ID = "0123456789ABCDEFGHIJKL";
const env = {
  SPOTIFY_CLIENT_ID: "test",
  SPOTIFY_CLIENT_SECRET: "test",
  DELETE_KEY_PEPPER: "test-pepper-".repeat(5),
};

function fakeDatabase({
  error = null,
  rpcResult = { data: { allowed: true, retry_after: 60 } },
} = {}) {
  const calls = [];
  const database = {
    calls,
    rpc: async (...args) => {
      calls.push(["rpc", ...args]);
      return rpcResult;
    },
    from(table) {
      calls.push(["from", table]);
      const query = {
        select: (columns) => {
          calls.push(["select", columns]);
          return query;
        },
        ilike: (...args) => {
          calls.push(["ilike", ...args]);
          return query;
        },
        eq: (...args) => {
          calls.push(["eq", ...args]);
          return query;
        },
        order: (...args) => {
          calls.push(["order", ...args]);
          return query;
        },
        limit: async (count) => {
          calls.push(["limit", count]);
          return { data: [], error };
        },
        insert: async (rows) => {
          calls.push(["insert", rows]);
          return { error };
        },
      };
      return query;
    },
  };
  return database;
}

async function serve(t, options = {}) {
  const server = createApp({ env, ...options }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return async (path, init) => {
    const response = await fetch(origin + path, init);
    return {
      status: response.status,
      headers: response.headers,
      body: await response.json(),
    };
  };
}

test("health reports database outages without exposing upstream details", async (t) => {
  const request = await serve(t, {
    database: fakeDatabase({ error: { message: "secret connection details" } }),
  });
  const res = await request("/api/health");
  assert.equal(res.status, 503);
  assert.deepEqual(res.body, {
    status: "degraded",
    database: "unavailable",
    spotify: "configured",
    posting: "configured",
  });
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("missing config still serves diagnostics instead of crashing the function", async (t) => {
  const request = await serve(t, { env: {} });
  assert.equal((await request("/")).status, 200);
  assert.equal((await request("/api/health")).status, 503);
  assert.equal((await request("/api/confessions")).status, 503);
});

test("health returns 200 with a working database, Spotify and posting configuration", async (t) => {
  const request = await serve(t, { database: fakeDatabase() });
  const response = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.posting, "configured");
});

test("health detects posting configuration failures before release without exposing secrets or writing data", async (t) => {
  for (const pepper of [undefined, "too-short", "service-role-".repeat(4)]) {
    const name =
      pepper === undefined
        ? "missing"
        : pepper === "too-short"
          ? "short"
          : "reused service role";
    await t.test(name, async (t) => {
      const database = fakeDatabase();
      let tokenCalls = 0;
      const request = await serve(t, {
        database,
        env: {
          ...env,
          SUPABASE_SERVICE_ROLE: "service-role-".repeat(4),
          DELETE_KEY_PEPPER: pepper,
        },
        getToken: async () => {
          tokenCalls++;
          throw new Error("Spotify must not be called");
        },
      });
      const health = await request("/api/health");
      assert.equal(health.status, 503);
      assert.deepEqual(health.body, {
        status: "degraded",
        database: "ok",
        spotify: "configured",
        posting: "unavailable",
      });
      assert.equal(health.headers.get("cache-control"), "no-store");
      const post = await request("/api/confess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "SAMPLE",
          content: "SAMPLE",
          song: { id: TRACK_ID },
        }),
      });
      assert.equal(post.status, 503);
      assert.equal(
        post.body.error,
        "Posting is unavailable. Please try again shortly.",
      );
      assert.equal(database.calls.some(([name]) => name === "insert"), false);
      assert.equal(tokenCalls, 0);
      assert.equal((await request("/api/confessions")).status, 200);
    });
  }
});

test("feed limits data and selects only public fields", async (t) => {
  const database = fakeDatabase();
  const request = await serve(t, { database });
  const res = await request("/api/confessions");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(
    database.calls.find(([name]) => name === "limit"),
    ["limit", 20],
  );
  assert.notEqual(database.calls.find(([name]) => name === "select")[1], "*");
});

test("recipient searches escape wildcards, cap results and stay uncached", async (t) => {
  const database = fakeDatabase();
  const request = await serve(t, { database });
  const res = await request(
    "/api/confessions?to=" + encodeURIComponent("50%_\\"),
  );
  assert.equal(res.status, 200);
  assert.deepEqual(
    database.calls.find(([name]) => name === "ilike"),
    ["ilike", "recipient_to", "%50\\%\\_\\\\%"],
  );
  assert.deepEqual(
    database.calls.find(([name]) => name === "limit"),
    ["limit", 50],
  );
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal((await request("/api/confessions?to=a&to=b")).status, 400);
});

test("confessions route supports fetching by UUID and validates UUID format", async (t) => {
  const database = fakeDatabase();
  const request = await serve(t, { database });
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";
  const res = await request("/api/confessions?id=" + validUuid);
  assert.equal(res.status, 200);
  assert.deepEqual(
    database.calls.find(([name, column]) => name === "eq" && column === "id"),
    ["eq", "id", validUuid],
  );
  assert.deepEqual(
    database.calls.find(([name]) => name === "limit"),
    ["limit", 1],
  );
  assert.equal((await request("/api/confessions?id=not-a-uuid")).status, 400);
});

test("upstream database failures are uncached 503 responses", async (t) => {
  const request = await serve(t, {
    database: fakeDatabase({ error: { code: "PGRST000" } }),
  });
  const res = await request("/api/confessions");
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("submissions verify Spotify metadata and accept the UI's 3000-character limit", async (t) => {
  const database = fakeDatabase();
  const spotify = {
    get: async (url) => {
      assert.ok(url.endsWith(TRACK_ID));
      return {
        data: {
          id: TRACK_ID,
          name: "Verified song",
          artists: [{ name: "Verified artist" }],
        },
      };
    },
  };
  const request = await serve(t, {
    database,
    spotify,
    getToken: async () => "test-token",
  });
  const payload = {
    to: " Test ",
    content: "x".repeat(3000),
    song: { id: TRACK_ID, name: "Forged" },
  };
  const post = (body) =>
    request("/api/confess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal((await post(payload)).status, 200);
  const row = database.calls.find(([name]) => name === "insert")[1][0];
  assert.equal(row.recipient_to, "Test");
  assert.equal(row.sender_from, "Anonymous");
  assert.equal(row.song_name, "Verified song");
  assert.equal(row.content.length, 3000);
  assert.equal(
    (await post({ ...payload, content: "x".repeat(3001) })).status,
    400,
  );
  assert.equal(
    (await post({ ...payload, song: { id: "../bad" } })).status,
    400,
  );
});

test("Spotify failures cannot insert a confession", async (t) => {
  const database = fakeDatabase();
  const request = await serve(t, {
    database,
    getToken: async () => {
      throw new Error("offline");
    },
  });
  const res = await request("/api/confess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "Test",
      content: "Hello",
      song: { id: TRACK_ID },
    }),
  });
  assert.equal(res.status, 503);
  assert.equal(
    database.calls.some(([name]) => name === "insert"),
    false,
  );
});

test("song search validates queries and returns cacheable results", async (t) => {
  const request = await serve(t, {
    getToken: async () => "token",
    spotify: {
      get: async (url, options) => {
        assert.equal(options.params.q, "hello");
        return { data: { tracks: { items: [{ id: TRACK_ID }] } } };
      },
    },
  });
  assert.equal((await request("/api/search-song")).status, 400);
  assert.equal(
    (await request("/api/search-song?q=" + "x".repeat(201))).status,
    400,
  );
  const res = await request("/api/search-song?q=hello");
  assert.equal(res.status, 200);
  assert.ok(res.headers.get("cache-control").includes("s-maxage=60"));
});

test("Vercel uses shared counters with hashed IPs and rejects exhausted limits", async (t) => {
  const database = fakeDatabase({
    rpcResult: { data: { allowed: false, retry_after: 42 } },
  });
  const request = await serve(t, {
    env: { ...env, VERCEL: "1", SUPABASE_SERVICE_ROLE: "server-only" },
    database,
  });
  const res = await request("/api/confessions");
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), "42");
  const [, name, params] = database.calls[0];
  assert.equal(name, "read_confession_feed");
  assert.match(params.p_key, /^[a-f0-9]{64}$/);
  assert.equal(params.p_read_limit, 60);
  assert.equal(
    database.calls.some(([name]) => name === "from"),
    false,
  );
});

test("Vercel fails closed when the rate-limit migration/store is unavailable", async (t) => {
  const database = fakeDatabase({ rpcResult: { error: { code: "PGRST202" } } });
  const request = await serve(t, {
    env: { ...env, VERCEL: "1", SUPABASE_SERVICE_ROLE: "secret" },
    database,
  });
  assert.equal((await request("/api/confessions")).status, 503);
  assert.equal(
    database.calls.some(([name]) => name === "from"),
    false,
  );
});

test("CORS allows the exact preview host and rejects unrelated hosts", async (t) => {
  const request = await serve(t, {
    env: { ...env, VERCEL_URL: "this-preview.vercel.app" },
  });
  assert.equal(
    (
      await request("/", {
        headers: { Origin: "https://this-preview.vercel.app" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/", {
        headers: { Origin: "https://unrelated.vercel.app" },
      })
    ).status,
    403,
  );
});

test("malformed JSON, oversized bodies and unknown routes keep correct HTTP statuses", async (t) => {
  const request = await serve(t);
  assert.equal((await request("/api/missing")).status, 404);
  assert.equal(
    (
      await request("/api/confess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/confess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "x".repeat(11000) }),
      })
    ).status,
    413,
  );
});
