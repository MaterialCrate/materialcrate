import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const CREATE_POST_MUTATION = `
  mutation CreatePost(
    $fileBase64: String!
    $fileName: String!
    $mimeType: String!
    $title: String!
    $courseCode: String!
    $description: String
    $year: Int
  ) {
    createPost(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      title: $title
      courseCode: $courseCode
      description: $description
      year: $year
    ) {
      id
      fileUrl
      title
      courseCode
      description
      year
    }
  }
`;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const title = formData.get("title");
  const courseCode = formData.get("courseCode");
  const description = formData.get("description");
  const yearValue = formData.get("year");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (typeof title !== "string" || typeof courseCode !== "string") {
    return NextResponse.json(
      { error: "Title and course code are required" },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileBase64 = Buffer.from(arrayBuffer).toString("base64");
  let parsedYear: number | null = null;
  if (typeof yearValue === "string" && yearValue.trim().length) {
    const trimmedYear = yearValue.trim();
    if (!/^\d{4}$/.test(trimmedYear)) {
      return NextResponse.json(
        { error: "Year must be a 4-digit number" },
        { status: 400 },
      );
    }

    parsedYear = Number.parseInt(trimmedYear, 10);
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: CREATE_POST_MUTATION,
      variables: {
        fileBase64,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        title: title.trim(),
        courseCode: courseCode.trim(),
        description: typeof description === "string" ? description.trim() : null,
        year: Number.isFinite(parsedYear) ? parsedYear : null,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to create post",
        details: graphqlBody?.errors ?? null,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, post: graphqlBody?.data?.createPost });
}
