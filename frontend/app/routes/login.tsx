import { Button, Heading, Text } from "@primer/react";
import { MarkGithubIcon } from "@primer/octicons-react";
import { api } from "../lib/api";
import type { Route } from "./+types/login";
import { redirect } from "react-router";

export function meta() {
  return [
    { title: "Login - GitHub Workflow Dispatch" },
    { name: "description", content: "Login with GitHub to trigger workflows" },
  ];
}

// Use clientLoader to run auth check only on client side where cookies are available
export async function clientLoader() {
  try {
    // Check if user is already authenticated
    await api.auth.getUser();
    // If authenticated, redirect to home
    throw redirect('/');
  } catch (error: any) {
    // If 401, user is not authenticated - stay on login page
    if (error.status === 401) {
      return null;
    }
    // For redirect errors, let them through
    throw error;
  }
}
// Tell React Router to not use server-side data for hydration
clientLoader.hydrate = false;

export default function Login() {
  const handleLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = api.auth.getLoginUrl();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem'
      }}
    >
      <div
        style={{
          maxWidth: '400px',
          width: '100%',
          padding: '2rem',
          border: '1px solid var(--borderColor-default)',
          borderRadius: '6px',
          backgroundColor: 'var(--bgColor-default)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <MarkGithubIcon size={64} />
        </div>
        
        <Heading as="h1" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          GitHub Workflow Dispatch
        </Heading>
        
        <Text as="p" style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--fgColor-muted)' }}>
          Login with your GitHub account to trigger workflow dispatch events
        </Text>
        
        <Button
          variant="primary"
          size="large"
          onClick={handleLogin}
          style={{ width: '100%' }}
        >
          <MarkGithubIcon size={16} />
          <span style={{ marginLeft: '8px' }}>Login with GitHub</span>
        </Button>
        
        <Text as="p" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--fgColor-muted)' }}>
          This app requires <strong>repo</strong> and <strong>workflow</strong> scopes
          to trigger workflow dispatches on your behalf.
        </Text>
      </div>
    </div>
  );
}
