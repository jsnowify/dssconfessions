const assert = require("node:assert/strict");

function adapter(db, calls) {
  const identifier = (name) => {
    const trimmed = String(name || "").trim();
    assert.match(trimmed, /^[a-z_]+$/);
    return `"${trimmed}"`;
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
        return { error: { code: error.code, message: error.message } };
      }
    },
    from(table) {
      const state = {
        operation: "select",
        columns: "id",
        filters: [],
        inFilters: [],
        orCondition: null,
        orders: [],
        limit: null,
        single: false,
      };
      const query = {
        select(columns) {
          if (typeof columns === "string" && columns.trim()) {
            assert.ok(!columns.includes("*"));
            state.columns = columns;
          }
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
        lt(column, value) {
          state.filters.push([column, "<", value]);
          return query;
        },
        in(column, values) {
          state.inFilters.push([column, values]);
          return query;
        },
        or(condition) {
          state.orCondition = condition;
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
        update(values) {
          state.operation = "update";
          state.updates = values;
          return query;
        },
        delete() {
          state.operation = "delete";
          return query;
        },
        single() {
          state.single = true;
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
              } else if (state.operation === "update") {
                const entries = Object.entries(state.updates);
                const setClauses = entries.map(([col, val]) => {
                  params.push(val);
                  return `${identifier(col)} = $${params.length}`;
                });
                sql = `update public.${identifier(table)} set ${setClauses.join(", ")}`;
                if (state.filters.length) {
                  sql +=
                    " where " +
                    state.filters
                      .map(([column, op, value]) => {
                        params.push(value);
                        return `${identifier(column)} ${op} $${params.length}`;
                      })
                      .join(" and ");
                }
                sql += " returning *";
              } else {
                sql =
                  state.operation === "delete"
                    ? `delete from public.${identifier(table)}`
                    : `select ${state.columns.split(",").map((column) => {
                      if (column === "reply_activity:replies(count)" && table === "confessions")
                        return `(select jsonb_build_array(jsonb_build_object('count',count(*))) from public.replies r where r.confession_id=confessions.id and r.is_hidden=false) as reply_activity`;
                      return identifier(column);
                    }).join(", ")} from public.${identifier(table)}`;
                const conditions = [];
                if (state.filters.length) {
                  for (const [column, op, value] of state.filters) {
                    if (column === "reply_activity.is_hidden") {
                      assert.equal(value, false);
                      continue;
                    }
                    params.push(value);
                    conditions.push(
                      `${identifier(column)} ${op} $${params.length}`,
                    );
                  }
                }
                if (state.inFilters.length) {
                  for (const [column, values] of state.inFilters) {
                    if (values.length === 0) {
                      conditions.push("1=0");
                    } else {
                      const placeholders = values.map((val) => {
                        params.push(val);
                        return `$${params.length}`;
                      });
                      conditions.push(
                        `${identifier(column)} in (${placeholders.join(",")})`,
                      );
                    }
                  }
                }
                if (state.orCondition) {
                  const parts = state.orCondition.split(",").map((p) => {
                    const [c, op, val] = p.trim().split(".");
                    if (op === "eq") {
                      return `${identifier(c)} = ${val === "true" ? "true" : val === "false" ? "false" : `'${val}'`}`;
                    }
                    return "true";
                  });
                  conditions.push(`(${parts.join(" or ")})`);
                }
                if (conditions.length) {
                  sql += " where " + conditions.join(" and ");
                }
                if (state.orders.length)
                  sql += " order by " + state.orders.join(",");
                if (state.limit !== null) {
                  params.push(state.limit);
                  sql += ` limit $${params.length}`;
                }
              }
              const rows = (await db.query(sql, params)).rows;
              return { data: state.single ? (rows[0] || null) : rows };
            } catch (error) {
              return { error: { code: error.code, message: error.message } };
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
