import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const UPDATE_THEME_MUTATION = `
  mutation UpdateTheme($theme: String!) {
    updateTheme(theme: $theme) {
      id
      theme
    }
  }
`;

const VALID_THEMES = ["system", "light", "dark", "sepia"];

type UpdateThemeBody = {
  theme?: string;
};

export async function POST(req: Request) {
  let body: UpdateThemeBody = {};

  try {
    body = (await req.json()) as UpdateThemeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const theme = typeof body.theme === "string" ? body.theme.trim().toLowerCase() : "";

  if (!VALID_THEMES.includes(theme)) {
    return NextResponse.json(
      { error: "theme must be one of: system, light, dark, sepia" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: UPDATE_THEME_MUTATION,
      variables: { theme },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message || "Failed to update theme",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    theme: graphqlBody?.data?.updateTheme?.theme ?? theme,
  });
}
