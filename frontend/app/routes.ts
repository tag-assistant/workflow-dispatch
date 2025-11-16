import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("/login", "routes/login.tsx"),
  route("/workflows/select", "routes/workflow-select.tsx"),
  route("/workflows/dispatch", "routes/workflow-dispatch.tsx"),
  index("routes/home.tsx"),
] satisfies RouteConfig;
