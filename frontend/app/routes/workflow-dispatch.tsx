import type { Route } from "./+types/workflow-dispatch";
import { api } from "../lib/api";
import { 
  Heading, 
  Text, 
  Button, 
  Avatar, 
  Flash,
  FormControl,
  TextInput,
  Textarea,
  Checkbox,
  Select,
  Spinner,
} from "@primer/react";
import { useState, useEffect } from "react";
import { redirect, useNavigate, useSearchParams, Link } from "react-router";
import { ArrowLeftIcon } from "@primer/octicons-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dispatch Workflow - GitHub Workflow Dispatch" },
    { name: "description", content: "Configure and dispatch workflow" },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const user = await api.auth.getUser();
    
    // Parse URL parameters
    const url = new URL(request.url);
    const params = {
      owner: url.searchParams.get('owner'),
      repo: url.searchParams.get('repo'),
      workflow_id: url.searchParams.get('workflow_id'),
      ref: url.searchParams.get('ref') || 'main',
    };
    
    // Validate required params
    if (!params.owner || !params.repo || !params.workflow_id) {
      throw redirect('/workflows/select');
    }
    
    return { user, params };
  } catch (error) {
    throw redirect('/login');
  }
}
clientLoader.hydrate = false;

export default function WorkflowDispatch({ loaderData }: Route.ComponentProps) {
  const { user, params } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [workflowSchema, setWorkflowSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflowSchema();
  }, [params.owner, params.repo, params.workflow_id]);

  const loadWorkflowSchema = async () => {
    setLoading(true);
    setError(null);
    try {
      const schema = await api.github.getWorkflowSchema(
        params.owner!,
        params.repo!,
        params.workflow_id!
      );
      setWorkflowSchema(schema);

      // Initialize inputs with default values
      if (schema.inputs) {
        const defaultInputs: Record<string, string> = {};
        Object.entries(schema.inputs).forEach(([key, config]: [string, any]) => {
          defaultInputs[key] = config.default || '';
        });
        setInputs(defaultInputs);
      }

      // Check if workflow has workflow_dispatch trigger
      if (!schema.has_workflow_dispatch) {
        setError('⚠️ This workflow does not have a workflow_dispatch trigger. You may not be able to dispatch it manually.');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load workflow schema');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      // Validate required inputs
      if (workflowSchema?.inputs) {
        for (const [key, config] of Object.entries(workflowSchema.inputs) as [string, any][]) {
          if (config.required && !inputs[key]) {
            throw new Error(`Required input "${key}" is missing`);
          }
        }
      }

      await api.workflows.dispatch({
        owner: params.owner!,
        repo: params.repo!,
        workflow_id: params.workflow_id!,
        ref: params.ref!,
        inputs,
      });

      setSuccess(`✅ Workflow "${workflowSchema?.name}" dispatched successfully!`);
      
      // Clear inputs after successful dispatch
      const defaultInputs: Record<string, string> = {};
      if (workflowSchema?.inputs) {
        Object.entries(workflowSchema.inputs).forEach(([key, config]: [string, any]) => {
          defaultInputs[key] = config.default || '';
        });
      }
      setInputs(defaultInputs);
    } catch (error: any) {
      setError(error.message || 'Failed to dispatch workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleBack = () => {
    const backParams = new URLSearchParams({
      owner: params.owner!,
      repo: params.repo!,
      workflow_id: params.workflow_id!,
      ref: params.ref!,
    });
    navigate(`/workflows/select?${backParams.toString()}`);
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            leadingVisual={ArrowLeftIcon}
            onClick={handleBack}
          >
            Change Workflow
          </Button>
          <Button onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Heading as="h1" style={{ marginBottom: '0.5rem' }}>
          {workflowSchema?.name || 'Dispatch Workflow'}
        </Heading>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Spinner size="large" />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <a 
                href={`https://github.com/${params.owner}/${params.repo}/actions/workflows/${workflowSchema?.path?.split('/').pop()}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.875rem', color: 'var(--fgColor-accent)' }}
              >
                {params.owner}/{params.repo}/{workflowSchema?.path}
              </a>
            </div>

            {success && (
              <Flash variant="success" style={{ marginBottom: '1rem' }}>
                {success}
              </Flash>
            )}
            
            {error && (
              <Flash variant={workflowSchema?.has_workflow_dispatch === false ? 'warning' : 'danger'} style={{ marginBottom: '1rem' }}>
                {error}
              </Flash>
            )}

            {/* Dispatch Form */}
            <form onSubmit={handleSubmit}>
              {workflowSchema?.inputs && Object.keys(workflowSchema.inputs).length > 0 && (
                <>
                  <Heading as="h3" style={{ marginBottom: '1.5rem' }}>
                    Workflow Inputs
                  </Heading>
                  
                  {Object.entries(workflowSchema.inputs).map(([key, config]: [string, any]) => (
                      <FormControl 
                        key={key} 
                        required={config.required}
                        style={{ marginBottom: '1.5rem' }}
                      >
                        <FormControl.Label>
                          {key}
                        </FormControl.Label>
                        
                        {config.type === 'choice' && config.options ? (
                          <Select
                            value={inputs[key] || ''}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            block
                          >
                            <Select.Option value="">Select an option...</Select.Option>
                            {config.options.map((option: string) => (
                              <Select.Option key={option} value={option}>
                                {option}
                              </Select.Option>
                            ))}
                          </Select>
                        ) : config.type === 'boolean' ? (
                          <Checkbox
                            checked={inputs[key] === 'true'}
                            onChange={(e) => handleInputChange(key, e.target.checked ? 'true' : 'false')}
                          />
                        ) : (
                          <TextInput
                            value={inputs[key] || ''}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            placeholder={config.default || ''}
                            block
                          />
                        )}
                        
                        {config.description && (
                          <FormControl.Caption>
                            {config.description}
                            {config.default && ` (default: ${config.default})`}
                          </FormControl.Caption>
                        )}
                      </FormControl>
                    ))}
                  </>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !workflowSchema?.has_workflow_dispatch}
                  >
                    {isSubmitting ? 'Dispatching...' : 'Dispatch Workflow'}
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={handleBack}
                  >
                    Cancel
                  </Button>
                </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
