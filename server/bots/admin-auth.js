const {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} = require("node:crypto");
const { promisify } = require("node:util");
const { consumeSharedRateLimit } = require("../utils/rate-limit");

const derive = promisify(scrypt);
const HASH_PATTERN = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/;
const COOKIE = "dss_bot_admin";
const SESSION_SECONDS = 1800;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

async function hashAdminPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 256
  )
    throw new Error("Use a password between 8 and 256 characters.");
  const salt = randomBytes(16).toString("hex");
  const key = await derive(
    password,
    Buffer.from(salt, "hex"),
    64,
    SCRYPT_OPTIONS,
  );
  return `scrypt$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password, encoded) {
  if (
    !HASH_PATTERN.test(encoded || "") ||
    typeof password !== "string" ||
    password.length > 256
  )
    return false;
  const [, salt, hash] = encoded.split("$");
  const candidate = await derive(
    password,
    Buffer.from(salt, "hex"),
    64,
    SCRYPT_OPTIONS,
  );
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

function authConfigured(env) {
  const secret = env.BOT_ADMIN_SESSION_SECRET;
  return (
    HASH_PATTERN.test(env.BOT_ADMIN_PASSWORD_HASH || "") &&
    typeof secret === "string" &&
    secret.length >= 32 &&
    secret.length <= 256 &&
    ![
      env.SUPABASE_SERVICE_ROLE,
      env.DELETE_KEY_PEPPER,
      env.REPORT_HASH_SECRET,
      env.AI_GATEWAY_API_KEY,
      env.SPOTIFY_CLIENT_SECRET,
      env.CRON_SECRET,
    ].includes(secret)
  );
}
function signature(payload, env) {
  // Changing the password hash or signing secret invalidates all earlier sessions.
  const key = createHmac("sha256", env.BOT_ADMIN_SESSION_SECRET)
    .update(env.BOT_ADMIN_PASSWORD_HASH)
    .digest();
  return createHmac("sha256", key).update(payload).digest("hex");
}
function createAdminSession(env, now = Date.now()) {
  if (!authConfigured(env)) throw new Error("Admin sign-in is not configured.");
  const issued = Math.floor(now / 1000);
  const payload = `v1.${issued}.${issued + SESSION_SECONDS}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signature(payload, env)}`;
}
function validSession(value, env, now = Date.now()) {
  if (
    !authConfigured(env) ||
    typeof value !== "string" ||
    !/^v1\.\d{10}\.\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value)
  )
    return false;
  const parts = value.split(".");
  const issued = Number(parts[1]),
    expiry = Number(parts[2]),
    current = Math.floor(now / 1000);
  if (
    issued > current ||
    expiry <= current ||
    expiry - issued !== SESSION_SECONDS
  )
    return false;
  const payload = parts.slice(0, 4).join(".");
  return timingSafeEqual(
    Buffer.from(parts[4], "hex"),
    Buffer.from(signature(payload, env), "hex"),
  );
}
function sessionCookie(req) {
  const entries = (req.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${COOKIE}=`));
  if (entries.length !== 1) return "";
  try {
    return decodeURIComponent(entries[0].slice(COOKIE.length + 1));
  } catch {
    return "";
  }
}

function mountAdminAuth(app, { env, getDatabase, allowedOrigins }) {
  const cookieOptions = (req) => {
    const isBot =
      req?.originalUrl?.includes("/bots") || req?.url?.includes("/bots");
    return {
      httpOnly: true,
      sameSite: "strict",
      path: isBot ? "/api/admin/bots" : "/api/admin",
      secure: env.VERCEL === "1" || env.NODE_ENV === "production" || req?.secure,
    };
  };
  const csrf = (req, res, next) => {
    if (
      req.method !== "GET" &&
      ((req.get("x-bot-admin") !== "1" && req.get("x-admin") !== "1") ||
        req.get("sec-fetch-site") === "cross-site" ||
        (req.get("origin") && !allowedOrigins.has(req.get("origin"))))
    )
      return res
        .status(403)
        .json({ error: "Please sign in from this site's admin page." });
    next();
  };
  const limit = (scope, windowMs, maximum) => async (req, res, next) => {
    try {
      const result = await consumeSharedRateLimit({
        env,
        getDatabase,
        scope,
        client: req.ip,
        windowMs,
        limit: maximum,
      });
      if (!result.allowed) {
        res.set("Retry-After", String(result.retry_after || 60));
        return res
          .status(429)
          .json({ error: "Too many attempts. Please try again later." });
      }
      next();
    } catch {
      return res
        .status(503)
        .json({ error: "Sign-in is temporarily unavailable." });
    }
  };
  app.use(
    "/api/admin",
    (req, res, next) => {
      res.set("X-Robots-Tag", "noindex, nofollow");
      next();
    },
    csrf,
  );

  const loginHandler = async (req, res) => {
    if (!authConfigured(env))
      return res
        .status(503)
        .json({ error: "Admin sign-in is not set up yet." });
    try {
      if (
        !(await verifyPassword(req.body?.password, env.BOT_ADMIN_PASSWORD_HASH))
      )
        return res.status(401).json({ error: "Incorrect password." });
      res.cookie(COOKIE, createAdminSession(env), {
        ...cookieOptions(req),
        maxAge: SESSION_SECONDS * 1000,
      });
      return res.json({ authenticated: true });
    } catch {
      console.error("[admin] sign-in unavailable");
      return res
        .status(503)
        .json({ error: "Sign-in is temporarily unavailable." });
    }
  };

  const logoutHandler = (req, res) => {
    res.clearCookie(COOKIE, { ...cookieOptions(req), path: "/api/admin" });
    res.clearCookie(COOKIE, { ...cookieOptions(req), path: "/api/admin/bots" });
    return res.json({ authenticated: false });
  };

  app.post("/api/admin/login", limit("admin-login", 900000, 10), loginHandler);
  app.post(
    "/api/admin/bots/login",
    limit("bot-login", 900000, 10),
    loginHandler,
  );

  app.post("/api/admin/logout", logoutHandler);
  app.post("/api/admin/bots/logout", logoutHandler);

  app.use("/api/admin", limit("admin", 60000, 60), (req, res, next) => {
    if (
      req.path === "/login" ||
      req.path === "/bots/login" ||
      req.path === "/logout" ||
      req.path === "/bots/logout"
    ) {
      return next();
    }
    if (!authConfigured(env))
      return res
        .status(503)
        .json({ error: "Admin sign-in is not set up yet." });
    const session = sessionCookie(req);
    if (!validSession(session, env))
      return res.status(401).json({
        error: "Your admin session expired. Sign in again to continue.",
        code: "ADMIN_SESSION_REQUIRED",
      });
    // Renew authenticated activity before the next operation crosses expiry.
    // Idle sessions still expire; invalid sessions can never renew themselves.
    const issued = Number(session.split(".")[1]);
    if (Math.floor(Date.now() / 1000) - issued >= SESSION_SECONDS / 2)
      res.cookie(COOKIE, createAdminSession(env), {
        ...cookieOptions(req),
        maxAge: SESSION_SECONDS * 1000,
      });
    next();
  });
}

module.exports = {
  mountAdminAuth,
  hashAdminPassword,
  verifyPassword,
  authConfigured,
  createAdminSession,
  validSession,
  COOKIE,
  SESSION_SECONDS,
};
