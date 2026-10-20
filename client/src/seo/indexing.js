// Local builds remain indexable for production validation. Vercel preview and
// development deployments must keep noindex even after client navigation.
export function robotsForEnvironment(robots, environment = "") {
  return environment && environment !== "production" ? "noindex, nofollow" : robots;
}
