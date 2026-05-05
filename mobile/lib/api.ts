import Constants from "expo-constants";

function getBaseUrl(): string {
  if (!__DEV__) return "https://materialcrate.com";

  // Expo sets hostUri to the Metro bundler address (e.g. "192.168.1.5:8081").
  // Strip the Metro port to get the dev machine's IP, then point at the API server.
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:4000`;

  // Fallback for iOS simulator (localhost works there)
  return "http://localhost:4000";
}

const BASE_URL = getBaseUrl();
const GRAPHQL_URL = `${BASE_URL}/graphql`;

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}
