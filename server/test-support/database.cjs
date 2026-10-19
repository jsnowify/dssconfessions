const assert = require("node:assert/strict");

function adapter(db, calls) {
  const identifier = (name) => {
    assert.match(name, /^[a-z_]+$/);
    return `"${name}"`;
  };
  return {
    async rpc(name, params = {}) {
      calls.push({ rpc: name, params });
      try {
        if (["confession_preview", "visible_song_replies"].includes(name)) {
          return {
            data: (
              await db.query(`select * from public.${identifier(name)}($1)`, [
                params.p_id,
              ])
            ).rows,
          };
        }
        if (name === "poke_confession") {
          return {
            data: (
              await db.query("select public.poke_confession($1, $2) as count", [
                params.p_confession_id,
                params.p_amount ?? 1,
              ])
            ).rows[0]?.count,
          };
        }
        if (name === "visible_top_searches")
          return {
            data: (
              await db.query("select * from public.visible_top_searches($1)", [
                params.p_limit,
              ])
            ).rows,
          };
        const args = Object.keys(params)
          .map((key, i) => `${identifier(key)} => $${i + 1}`)
          .join(",");
        const values = Object.values(params).map((v) =>
          typeof v === "object" && v !== null ? JSON.stringify(v) : v,
        );
        return {
          data: (
            await db.query(
              `select public.${identifier(name)}(${args}) as result`,
              values,
            )
          ).rows[0].result,
        };
      } catch (error) {
        return { error: { code: error.code } };
      }
    },
    from(table) {
      const state = {
        operation: "select",
        columns: "id",
        filters: [],
        orders: [],
        limit: null,
      };
      const query = {
        select(columns) {
          assert.ok(!columns.includes("*"));
          state.columns = columns;
          return query;
        },
        eq(column, value) {
          state.filters.push([column, "=", value]);
          return query;
        },
        ilike(column, value) {
          state.filters.push([column, "ilike", value]);
          return query;
        },
        gte(column, value) {
          state.filters.push([column, ">=", value]);
          return query;
        },
        order(column, options) {
          state.orders.push(
            `${identifier(column)} ${options.ascending ? "asc" : "desc"}`,
          );
          return query;
        },
        limit(value) {
          state.limit = value;
          return query;
        },
        insert(rows) {
          state.operation = "insert";
          state.rows = rows;
          return query;
        },
        delete() {
          state.operation = "delete";
          return query;
        },
        then(resolve, reject) {
          const execute = async () => {
            try {
              calls.push({
                table,
                operation: state.operation,
                columns: state.columns,
                filters: state.filters,
              });
              let params = [],
                sql;
              if (state.operation === "insert") {
                const row = state.rows[0];
                params = Object.values(row);
                sql = `insert into public.${identifier(table)} (${Object.keys(row).map(identifier)}) values (${params.map((_, i) => `$${i + 1}`)}) returning id`;
              } else {
                sql =
                  state.operation === "delete"
                    ? `delete from public.${identifier(table)}`
                    : `select ${state.columns.split(",").map(identifier)} from public.${identifier(table)}`;
                if (state.filters.length)
                  sql +=
                    " where " +
                    state.filters
                      .map(([column, op, value]) => {
                        params.push(value);
                        return `${identifier(column)} ${op} $${params.length}`;
                      })
                      .join(" and ");
                if (state.orders.length)
                  sql += " order by " + state.orders.join(",");
                if (state.limit !== null) {
                  params.push(state.limit);
                  sql += ` limit $${params.length}`;
                }
              }
              return { data: (await db.query(sql, params)).rows };
            } catch (error) {
              return { error: { code: error.code } };
            }
          };
          return execute().then(resolve, reject);
        },
      };
      return query;
    },
  };
}

module.exports = { adapter };
