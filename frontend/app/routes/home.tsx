import type { Route } from "./+types/home";
import { redirect } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "GitHub Workflow Dispatch" },
    { name: "description", content: "Trigger GitHub workflow dispatches" },
  ];
}

// Redirect home to workflow selection page
export async function clientLoader() {
  throw redirect('/workflows/select');
}
clientLoader.hydrate = false;

export default function Home() {
  // This component should never render due to the redirect
  return null;
}
