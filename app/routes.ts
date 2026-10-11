import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/dashboard.tsx"),
  route("browser", "routes/browser.tsx"),
  route("api/state", "routes/api.state.ts"),
] satisfies RouteConfig;
