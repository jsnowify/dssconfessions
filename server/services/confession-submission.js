const { validateConfessionInput } = require("../utils/validation");
const { verifiedTrack } = require("../utils/verified-track");
const {
  generateDeleteKey,
  hashDeleteKey,
  isDeleteKeyConfigured,
} = require("../utils/delete-key");

const POST_QUOTA = { scope: "confess", windowMs: 900000, limit: 15 };
class SubmissionError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
function botPostingEnvironment(env) {
  // A local bot may have its own author-key secret. This never rotates the
  // existing human-post secret; automation keys are not returned to visitors.
  return env.BOT_DELETE_KEY_PEPPER
    ? { ...env, DELETE_KEY_PEPPER: env.BOT_DELETE_KEY_PEPPER }
    : env;
}

// Both anonymous submissions and the authenticated worker use this boundary.
// Automation context is supplied by server code, never by a public request body.
function createConfessionSubmission({ env, getDatabase, spotify, getToken }) {
  return async (body, automation) => {
    const postingEnv = automation ? botPostingEnvironment(env) : env;
    const { valid, errors, data } = validateConfessionInput(body);
    if (!valid) throw new SubmissionError(400, "Invalid submission", errors);
    if (
      body.allowReplies !== undefined &&
      typeof body.allowReplies !== "boolean"
    )
      throw new SubmissionError(400, "Allow replies must be a boolean.");
    if (!isDeleteKeyConfigured(postingEnv)) {
      console.error("DELETE_KEY_PEPPER is not configured independently");
      throw new SubmissionError(
        503,
        "Posting is unavailable. Please try again shortly.",
      );
    }
    let track;
    try {
      track = await verifiedTrack(data.songId, spotify, getToken);
    } catch (error) {
      throw new SubmissionError(
        error.status === 400 ? 400 : 503,
        "Song verification is unavailable. Please try again shortly.",
      );
    }
    const deleteKey = generateDeleteKey();
    const { spotify_track_id, ...songColumns } = track;
    void spotify_track_id;
    const row = {
      recipient_to: data.recipient_to,
      sender_from: data.sender_from,
      content: data.content,
      ...songColumns,
      allow_replies: body.allowReplies ?? true,
      delete_key_hash: hashDeleteKey(deleteKey, postingEnv.DELETE_KEY_PEPPER),
    };
    try {
      if (automation) {
        const { data: result, error } = await getDatabase().rpc("bot_control", {
          p_action: "publish",
          p_input: { jobId: automation.id, lease: automation.lease, row },
        });
        if (error) throw error;
        return result;
      }
      const { error } = await getDatabase().from("confessions").insert([row]);
      if (error) throw error;
      return { status: "success", deleteKey };
    } catch {
      throw new SubmissionError(
        503,
        "Saving is unavailable. Please try again shortly.",
      );
    }
  };
}

module.exports = { createConfessionSubmission, POST_QUOTA, SubmissionError, botPostingEnvironment };
