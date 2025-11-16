import type { Route } from "./+types/home";
import { api } from "../lib/api";
import { Heading, Text, Button, TextInput, FormControl, Avatar, Flash } from "@primer/react";
import { useState } from "react";
import { redirect } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "GitHub Workflow Dispatch" },
    { name: "description", content: "Trigger GitHub workflow dispatches" },
  ];
}

// Use clientLoader to run auth check only on client side where cookies are available
export async function clientLoader() {
  try {
    const user = await api.auth.getUser();
    return { user, error: null };
  } catch (error) {
    // Not authenticated, redirect to login
    throw redirect('/login');
  }
}
// Tell React Router to not use server-side data for hydration
clientLoader.hydrate = false;

export default function Home({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  
  // Workflow dispatch form state
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [ref, setRef] = useState("main");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      const result = await api.workflows.dispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
      });
      setSuccess(`✅ Workflow "${workflowId}" dispatched successfully to ${owner}/${repo}!`);
      // Clear form
      setOwner("");
      setRepo("");
      setWorkflowId("");
      setRef("main");
    } catch (error: any) {
      setError(error.message || 'Failed to dispatch workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* User header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--borderColor-default)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Avatar src={user.avatarUrl || ''} size={48} />
          <div>
            <Heading as="h2" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
              {user.displayName || user.username}
            </Heading>
            <Text as="p" style={{ fontSize: '0.875rem', color: 'var(--fgColor-muted)' }}>
              @{user.username}
            </Text>
          </div>
        </div>
        <Button onClick={handleLogout}>Logout</Button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Heading as="h1" style={{ marginBottom: '0.5rem' }}>
          GitHub Workflow Dispatch
        </Heading>
        
        <Text as="p" style={{ marginBottom: '2rem', color: 'var(--fgColor-muted)' }}>
          Trigger workflow dispatch events on any repository you have access to
        </Text>

        {/* Success/Error messages */}
        {success && (
          <Flash variant="success" style={{ marginBottom: '1rem' }}>
            {success}
          </Flash>
        )}
        
        {error && (
          <Flash variant="danger" style={{ marginBottom: '1rem' }}>
            {error}
          </Flash>
        )}

        {/* Workflow dispatch form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '1.5rem',
            border: '1px solid var(--borderColor-default)',
            borderRadius: '6px'
          }}
        >
          <Heading as="h3" style={{ marginBottom: '1.5rem' }}>
            Dispatch Workflow
          </Heading>

          <FormControl required style={{ marginBottom: '1.5rem' }}>
            <FormControl.Label>Repository Owner</FormControl.Label>
            <TextInput
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="octocat"
              block
            />
            <FormControl.Caption>
              The account owner of the repository (user or organization)
            </FormControl.Caption>
          </FormControl>

          <FormControl required style={{ marginBottom: '1.5rem' }}>
            <FormControl.Label>Repository Name</FormControl.Label>
            <TextInput
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="hello-world"
              block
            />
            <FormControl.Caption>
              The name of the repository
            </FormControl.Caption>
          </FormControl>

          <FormControl required style={{ marginBottom: '1.5rem' }}>
            <FormControl.Label>Workflow ID</FormControl.Label>
            <TextInput
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              placeholder="main.yml or workflow ID number"
              block
            />
            <FormControl.Caption>
              The workflow file name (e.g., main.yml) or workflow ID
            </FormControl.Caption>
          </FormControl>

          <FormControl required style={{ marginBottom: '1.5rem' }}>
            <FormControl.Label>Git Reference</FormControl.Label>
            <TextInput
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="main"
              block
            />
            <FormControl.Caption>
              The git reference (branch, tag, or commit SHA)
            </FormControl.Caption>
          </FormControl>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !owner || !repo || !workflowId || !ref}
          >
            {isSubmitting ? 'Dispatching...' : 'Dispatch Workflow'}
          </Button>
        </form>
      </div>
    </div>
  );
}
