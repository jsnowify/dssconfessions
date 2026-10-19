const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mountModeration(app, { env, getDatabase }) {
  // GET /api/admin/session - check if active session is authenticated
  app.get("/api/admin/session", (req, res) => {
    res.json({ authenticated: true });
  });

  // GET /api/admin/reports - list reported confessions and replies
  app.get("/api/admin/reports", async (req, res) => {
    try {
      const db = getDatabase();

      // 1. Fetch all reports ordered by newest
      const { data: reports, error: reportsErr } = await db
        .from("reports")
        .select(
          "id, target_type, target_id, confession_id, reply_id, reason, details, created_at",
        )
        .order("created_at", { ascending: false });
      if (reportsErr) throw reportsErr;

      // Group reports by target_id
      const confessionReportsMap = new Map();
      const replyReportsMap = new Map();
      for (const r of reports || []) {
        if (r.target_type === "confession") {
          const list = confessionReportsMap.get(r.target_id) || [];
          list.push(r);
          confessionReportsMap.set(r.target_id, list);
        } else if (r.target_type === "reply") {
          const list = replyReportsMap.get(r.target_id) || [];
          list.push(r);
          replyReportsMap.set(r.target_id, list);
        }
      }

      // 2. Fetch confessions: either reported OR flagged (needs_review=true or is_hidden=true)
      const reportedConfessionIds = Array.from(confessionReportsMap.keys());
      const { data: flaggedConfessions, error: flaggedErr } = await db
        .from("confessions")
        .select(
          "id, created_at, recipient_to, sender_from, content, song_name, artist_name, album_art, spotify_url, allow_replies, is_hidden, needs_review, poke_count, is_automated",
        )
        .or("needs_review.eq.true,is_hidden.eq.true")
        .order("created_at", { ascending: false });
      if (flaggedErr) throw flaggedErr;

      const confessionMap = new Map();
      for (const c of flaggedConfessions || []) {
        confessionMap.set(c.id, c);
      }

      // Fetch any reported confessions not yet in map
      const missingConfessionIds = reportedConfessionIds.filter(
        (id) => !confessionMap.has(id),
      );
      if (missingConfessionIds.length > 0) {
        const { data: extraConfessions, error: extraErr } = await db
          .from("confessions")
          .select(
            "id, created_at, recipient_to, sender_from, content, song_name, artist_name, album_art, spotify_url, allow_replies, is_hidden, needs_review, poke_count, is_automated",
          )
          .in("id", missingConfessionIds);
        if (extraErr) throw extraErr;
        for (const c of extraConfessions || []) {
          confessionMap.set(c.id, c);
        }
      }

      // Build enriched confessions list
      const confessions = Array.from(confessionMap.values()).map((c) => {
        const itemReports = confessionReportsMap.get(c.id) || [];
        const reasons = [...new Set(itemReports.map((r) => r.reason))];
        return {
          ...c,
          report_count: itemReports.length,
          reasons,
          reports: itemReports.map((r) => ({
            id: r.id,
            reason: r.reason,
            details: r.details,
            created_at: r.created_at,
          })),
        };
      });

      // 3. Fetch replies: either reported OR flagged (needs_review=true or is_hidden=true)
      const reportedReplyIds = Array.from(replyReportsMap.keys());
      const { data: flaggedReplies, error: replyErr } = await db
        .from("replies")
        .select(
          "id, confession_id, song_name, artist_name, album_art, spotify_url, spotify_track_id, note, is_hidden, needs_review, created_at",
        )
        .or("needs_review.eq.true,is_hidden.eq.true")
        .order("created_at", { ascending: false });
      if (replyErr) throw replyErr;

      const replyMap = new Map();
      for (const r of flaggedReplies || []) {
        replyMap.set(r.id, r);
      }

      const missingReplyIds = reportedReplyIds.filter(
        (id) => !replyMap.has(id),
      );
      if (missingReplyIds.length > 0) {
        const { data: extraReplies, error: extraReplyErr } = await db
          .from("replies")
          .select(
            "id, confession_id, song_name, artist_name, album_art, spotify_url, spotify_track_id, note, is_hidden, needs_review, created_at",
          )
          .in("id", missingReplyIds);
        if (extraReplyErr) throw extraReplyErr;
        for (const r of extraReplies || []) {
          replyMap.set(r.id, r);
        }
      }

      // Fetch parent confession info for all replies
      const parentIds = [
        ...new Set(Array.from(replyMap.values()).map((r) => r.confession_id)),
      ];
      const parentNameMap = new Map();
      if (parentIds.length > 0) {
        const { data: parents } = await db
          .from("confessions")
          .select("id, recipient_to")
          .in("id", parentIds);
        for (const p of parents || []) {
          parentNameMap.set(p.id, p.recipient_to);
        }
      }

      // Build enriched replies list
      const replies = Array.from(replyMap.values()).map((r) => {
        const itemReports = replyReportsMap.get(r.id) || [];
        const reasons = [...new Set(itemReports.map((rep) => rep.reason))];
        return {
          ...r,
          parent_recipient: parentNameMap.get(r.confession_id) || "Unknown",
          report_count: itemReports.length,
          reasons,
          reports: itemReports.map((rep) => ({
            id: rep.id,
            reason: rep.reason,
            details: rep.details,
            created_at: rep.created_at,
          })),
        };
      });

      return res.json({ confessions, replies });
    } catch (err) {
      console.error("[admin-moderation] Error loading reports:", err);
      return res.status(503).json({ error: "Failed to load moderation data." });
    }
  });

  // PATCH /api/admin/confessions/:id - Edit confession
  app.patch("/api/admin/confessions/:id", async (req, res) => {
    const { id } = req.params;
    if (!UUID.test(id))
      return res.status(400).json({ error: "Invalid confession ID." });

    const updates = {};
    const {
      recipient_to,
      sender_from,
      content,
      is_hidden,
      needs_review,
      allow_replies,
    } = req.body || {};

    if (recipient_to !== undefined) {
      if (
        typeof recipient_to !== "string" ||
        !recipient_to.trim() ||
        recipient_to.trim().length > 50
      ) {
        return res
          .status(400)
          .json({ error: "Recipient must be between 1 and 50 characters." });
      }
      updates.recipient_to = recipient_to.trim();
    }

    if (sender_from !== undefined) {
      if (sender_from === null || sender_from === "") {
        updates.sender_from = null;
      } else if (
        typeof sender_from === "string" &&
        sender_from.trim().length <= 50
      ) {
        updates.sender_from = sender_from.trim();
      } else {
        return res
          .status(400)
          .json({ error: "Sender must be at most 50 characters." });
      }
    }

    if (content !== undefined) {
      if (
        typeof content !== "string" ||
        !content.trim() ||
        content.trim().length > 1000
      ) {
        return res
          .status(400)
          .json({ error: "Message must be between 1 and 1000 characters." });
      }
      updates.content = content.trim();
    }

    if (is_hidden !== undefined) {
      if (typeof is_hidden !== "boolean")
        return res.status(400).json({ error: "is_hidden must be boolean." });
      updates.is_hidden = is_hidden;
    }

    if (needs_review !== undefined) {
      if (typeof needs_review !== "boolean")
        return res.status(400).json({ error: "needs_review must be boolean." });
      updates.needs_review = needs_review;
    }

    if (allow_replies !== undefined) {
      if (typeof allow_replies !== "boolean")
        return res
          .status(400)
          .json({ error: "allow_replies must be boolean." });
      updates.allow_replies = allow_replies;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    try {
      const db = getDatabase();
      const { data, error } = await db
        .from("confessions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return res.json({ status: "success", confession: data });
    } catch (err) {
      console.error("[admin-moderation] Error updating confession:", err);
      return res.status(503).json({ error: "Failed to update confession." });
    }
  });

  // DELETE /api/admin/confessions/:id - Delete confession
  app.delete("/api/admin/confessions/:id", async (req, res) => {
    const { id } = req.params;
    if (!UUID.test(id))
      return res.status(400).json({ error: "Invalid confession ID." });

    try {
      const db = getDatabase();
      const { error } = await db.from("confessions").delete().eq("id", id);
      if (error) throw error;
      return res.json({ status: "success", deleted: true, id });
    } catch (err) {
      console.error("[admin-moderation] Error deleting confession:", err);
      return res.status(503).json({ error: "Failed to delete confession." });
    }
  });

  // PATCH /api/admin/replies/:id - Edit reply
  app.patch("/api/admin/replies/:id", async (req, res) => {
    const { id } = req.params;
    if (!UUID.test(id))
      return res.status(400).json({ error: "Invalid reply ID." });

    const updates = {};
    const { note, is_hidden, needs_review } = req.body || {};

    if (note !== undefined) {
      if (note === null || note === "") {
        updates.note = null;
      } else if (typeof note === "string" && note.trim().length <= 140) {
        updates.note = note.trim();
      } else {
        return res
          .status(400)
          .json({ error: "Note must be at most 140 characters." });
      }
    }

    if (is_hidden !== undefined) {
      if (typeof is_hidden !== "boolean")
        return res.status(400).json({ error: "is_hidden must be boolean." });
      updates.is_hidden = is_hidden;
    }

    if (needs_review !== undefined) {
      if (typeof needs_review !== "boolean")
        return res.status(400).json({ error: "needs_review must be boolean." });
      updates.needs_review = needs_review;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    try {
      const db = getDatabase();
      const { data, error } = await db
        .from("replies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return res.json({ status: "success", reply: data });
    } catch (err) {
      console.error("[admin-moderation] Error updating reply:", err);
      return res.status(503).json({ error: "Failed to update reply." });
    }
  });

  // DELETE /api/admin/replies/:id - Delete reply
  app.delete("/api/admin/replies/:id", async (req, res) => {
    const { id } = req.params;
    if (!UUID.test(id))
      return res.status(400).json({ error: "Invalid reply ID." });

    try {
      const db = getDatabase();
      const { error } = await db.from("replies").delete().eq("id", id);
      if (error) throw error;
      return res.json({ status: "success", deleted: true, id });
    } catch (err) {
      console.error("[admin-moderation] Error deleting reply:", err);
      return res.status(503).json({ error: "Failed to delete reply." });
    }
  });

  // POST /api/admin/reports/dismiss - Dismiss reports for a confession or reply
  app.post("/api/admin/reports/dismiss", async (req, res) => {
    const { targetType, targetId } = req.body || {};
    if (!["confession", "reply"].includes(targetType) || !UUID.test(targetId)) {
      return res.status(400).json({ error: "Invalid target type or ID." });
    }

    try {
      const db = getDatabase();
      // 1. Clear needs_review on the target
      if (targetType === "confession") {
        await db
          .from("confessions")
          .update({ needs_review: false })
          .eq("id", targetId);
      } else {
        await db
          .from("replies")
          .update({ needs_review: false })
          .eq("id", targetId);
      }

      // 2. Delete reports for this target
      await db
        .from("reports")
        .delete()
        .eq("target_type", targetType)
        .eq("target_id", targetId);

      return res.json({ status: "success", dismissed: true, targetId });
    } catch (err) {
      console.error("[admin-moderation] Error dismissing reports:", err);
      return res.status(503).json({ error: "Failed to dismiss reports." });
    }
  });
}

module.exports = { mountModeration };

