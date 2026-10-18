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
  let result = await buildQuery(visible, { withPoke: true });
  if (result.error && missingColumn(result.error, "poke_count")) {
    console.warn(
      "[db core-read] Missing public.confessions.poke_count; run npm run check:schema --prefix server and apply the schema catch-up migration.",
    );
    result = await buildQuery(visible, { withPoke: false });
    if (result.data) {
      result.data = result.data.map((item) => ({ ...item, poke_count: 0 }));
    }
  }
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
