import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const CREATE_ARCHIVE_FOLDER_MUTATION = `
  mutation CreateArchiveFolder($name: String!) {
    createArchiveFolder(name: $name) {
      id
      archiveId
      name
      createdAt
      updatedAt
    }
  }
`;

type CreateArchiveFolderBody = {
  name?: string;
};

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: CreateArchiveFolderBody;
  try {
    body = (await req.json()) as CreateArchiveFolderBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: CREATE_ARCHIVE_FOLDER_MUTATION,
      variables: { name },
    }),
  });
  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message || "Failed to create archive folder",
        details: graphqlBody?.errors ?? null,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    folder: graphqlBody?.data?.createArchiveFolder ?? null,
  });
}
