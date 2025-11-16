import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { api } from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader() {
  try {
    const data = await api.hello();
    return { message: data.message, error: null };
  } catch (error) {
    console.error('Failed to fetch from API:', error);
    return { message: null, error: 'Failed to connect to backend API' };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        border: '1px solid #ccc', 
        borderRadius: '8px',
        maxWidth: '600px',
        margin: '2rem auto'
      }}>
        <h2>Backend API Status</h2>
        {loaderData.error ? (
          <p style={{ color: 'red' }}>❌ {loaderData.error}</p>
        ) : (
          <p style={{ color: 'green' }}>✅ {loaderData.message}</p>
        )}
      </div>
    </div>
  );
}
