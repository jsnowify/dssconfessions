const { AsyncLocalStorage } = require("node:async_hooks");

const context = new AsyncLocalStorage();
const IDENTIFIER = "[a-z_][a-z_0-9]*";
const identifier = new RegExp(`^${IDENTIFIER}(?:\\.${IDENTIFIER})*$`, "i");

// PostgreSQL details can contain entire rejected rows or submitted values.
// Only structural schema/permission diagnostics are safe to reproduce verbatim.
function diagnostic(value) {
  if (value == null) return null;
  if (typeof value !== "string") return "[redacted]";
  const patterns = [
    /^column [a-z_0-9.\"]+(?: of relation "[a-z_0-9]+")? does not exist$/i,
    /^relation "[a-z_0-9.]+" does not exist$/i,
    /^function [a-z_0-9.]+\([a-z_0-9 ,]*\) does not exist$/i,
    /^permission denied for (?:table|schema|function|relation) [a-z_0-9.]+$/i,
    /^Could not find the '[a-z_0-9]+' column of '[a-z_0-9]+' in the schema cache$/i,
    /^Could not find the (?:table|function) '[a-z_0-9. () ,]+' in the schema cache$/i,
    /^Perhaps you meant to reference the column "[a-z_0-9.]+"\.$/i,
    /^Perhaps you meant to call the function [a-z_0-9. () ,]+$/i,
    /^Searched for the function [a-z_0-9. () ,]+ in the schema cache, but no matches were found\.$/i,
    /^The schema cache is empty\.?$/i,
  ];
  return patterns.some((pattern) => pattern.test(value))
    ? value
    : "[redacted: diagnostic may contain private data]";
}

function logDatabaseError(error, operation, route) {
  const location = route || context.getStore()?.route() || "background";
  console.error(
    `[db ${location} ${operation}]`,
    JSON.stringify({
      code: /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(error?.code)
        ? error.code
        : "upstream",
      message: diagnostic(error?.message),
      details: diagnostic(error?.details),
      hint: diagnostic(error?.hint),
    }),
  );
}

function databaseContext(req, res, next) {
  context.run(
    {
      route: () =>
        `${req.method} ${Array.isArray(req.route?.path) ? req.route.path.join("|") : req.route?.path || "unmatched"}`,
    },
    next,
  );
}

function instrumentDatabase(database) {
  const wrap = (query, operation) =>
    new Proxy(query, {
      get(target, property) {
        if (property === "then")
          return (resolve, reject) =>
            target.then(
              (result) => {
                if (result?.error) logDatabaseError(result.error, operation);
                return typeof resolve === "function" ? resolve(result) : result;
              },
              (error) => {
                logDatabaseError(error, operation);
                if (typeof reject === "function") return reject(error);
                throw error;
              },
            );
        const value = target[property];
        if (typeof value !== "function") return value;
        return (...args) => {
          const action = [
            "select",
            "insert",
            "update",
            "delete",
            "upsert",
          ].includes(property)
            ? `${operation.split(" ")[0]} ${property}`
            : operation;
          try {
            const result = value.apply(target, args);
            return result && typeof result === "object"
              ? wrap(result, action)
              : result;
          } catch (error) {
            logDatabaseError(error, action);
            throw error;
          }
        };
      },
    });
  return new Proxy(database, {
    get(target, property) {
      if (property === "from")
        return (table) =>
          execute(
            () => target.from(table),
            identifier.test(table) ? table : "table",
          );
      if (property === "rpc")
        return (name, params) =>
          execute(
            () => target.rpc(name, params),
            `rpc:${identifier.test(name) ? name : "function"}`,
          );
      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  function execute(call, operation) {
    try {
      return wrap(call(), operation);
    } catch (error) {
      logDatabaseError(error, operation);
      throw error;
    }
  }
}

module.exports = {
  databaseContext,
  instrumentDatabase,
  logDatabaseError,
  diagnostic,
};
