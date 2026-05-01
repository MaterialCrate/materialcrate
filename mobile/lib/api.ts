const BASE_URL = __DEV__ ? "http://localhost:4000" : "https://materialcrate.com";

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
