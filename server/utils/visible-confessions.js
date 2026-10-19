function missingColumn(error, column) {
  if (!["42703", "PGRST204"].includes(error?.code)) return false;
  const message = String(error.message || "");
  return new RegExp(`(?:\\b|["'])${column}(?:\\b|["'])`).test(message);
}

function missingTable(error, table) {
  return (
    ["42P01", "PGRST205"].includes(error?.code) &&
    new RegExp(`(?:\\b|["'])${table}(?:\\b|["'])`).test(
      String(error.message || ""),
    )
  );
}

async function executeQueryWithPokeFallback(buildQuery, visible) {
  const options = { withPoke: true, withAutomation: true, withReplies: true };
  let result = await buildQuery(visible, options);
  for (let attempt = 0; attempt < 3 && result.error; attempt++) {
    if (options.withPoke && missingColumn(result.error, "poke_count")) options.withPoke = false;
    else if (options.withAutomation && missingColumn(result.error, "is_automated")) options.withAutomation = false;
    else if (options.withReplies && (
      missingTable(result.error, "replies") ||
      (result.error.code === "PGRST200" && /replies|reply_activity/.test(result.error.message || "")) ||
      (missingColumn(result.error, "is_hidden") && /replies|reply_activity/.test(result.error.message || ""))
    )) options.withReplies = false;
    else break;
    console.warn("[db core-read] Optional confession columns missing; run npm run check:schema --prefix server and apply migrations.");
    result = await buildQuery(visible, options);
  }
  if (result.data) result.data = result.data.map(item => ({
    ...item,
    ...(!options.withPoke ? { poke_count: 0 } : {}),
    ...(!options.withAutomation ? { is_automated: false } : {}),
  }));
  return result;
}

async function readVisibleConfessions(getDatabase, buildQuery) {
  const result = await executeQueryWithPokeFallback(buildQuery, true);
  if (!missingColumn(result.error, "is_hidden")) return result;
  console.warn(
    "[db core-read] Missing public.confessions.is_hidden; run npm run check:schema --prefix server and apply the schema catch-up migration.",
  );
  // Legacy databases have no moderation state. Never ignore existing reports
  // when a partially applied schema prevents enforcing the visibility filter.
  const reports = await getDatabase().from("reports").select("id").limit(1);
  if (reports.error && !missingTable(reports.error, "reports")) return result;
  if (!reports.error && (!Array.isArray(reports.data) || reports.data.length))
    return result;
  return executeQueryWithPokeFallback(buildQuery, false);
}

module.exports = { readVisibleConfessions, missingColumn, missingTable };
