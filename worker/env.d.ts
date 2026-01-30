// Extend the Env interface to include KV namespace binding and API key
declare global {
  interface Env {
    NETFLIX_KV?: KVNamespace;
    API_KEY?: string;
  }
}

export {};
