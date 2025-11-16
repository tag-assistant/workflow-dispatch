import type { Route } from "./+types/home";
import { api } from "../lib/api";
import { Heading, Text, Button, TextInput, FormControl } from "@primer/react";
import { useState } from "react";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Form submitted! Name: ${name}, Email: ${email}`);
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem'
    }}>
      <Heading as="h1" style={{ marginBottom: '2rem' }}>
        Primer Component Demo
      </Heading>

      {/* Buttons Demo */}
      <div style={{ marginBottom: '2rem' }}>
        <Heading as="h3" style={{ marginBottom: '1rem' }}>Buttons</Heading>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="primary">Primary Button</Button>
          <Button>Default Button</Button>
          <Button variant="danger">Danger Button</Button>
          <Button variant="invisible">Invisible Button</Button>
        </div>
      </div>

      {/* Form Demo */}
      <div style={{ 
        padding: '1.5rem', 
        border: '1px solid var(--borderColor-default)', 
        borderRadius: '6px'
      }}>
        <Heading as="h3" style={{ marginBottom: '1.5rem' }}>Sample Form</Heading>
        <form onSubmit={handleSubmit}>
          <FormControl required style={{ marginBottom: '1.5rem' }}>
            <FormControl.Label>Name</FormControl.Label>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </FormControl>

          <FormControl required style={{ marginBottom: '1.5rem' }}>
            <FormControl.Label>Email</FormControl.Label>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
            <FormControl.Caption>We'll never share your email.</FormControl.Caption>
          </FormControl>

          <Button type="submit" variant="primary">
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
}
