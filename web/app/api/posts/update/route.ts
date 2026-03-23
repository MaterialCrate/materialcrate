import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const UPDATE_POST_MUTATION = `
  mutation UpdatePost(
    $postId: ID!
    $title: String!
    $courseCode: String!
    $description: String
    $year: Int
  ) {
    updatePost(
      postId: $postId
      title: $title
      courseCode: $courseCode
      description: $description
      year: $year
    ) {
      id
      fileUrl
      thumbnailUrl
      title
      courseCode
      description
      year
      createdAt
      likeCount
      commentCount
      viewerHasLiked
      author {
        id
        displayName
        username
        profilePicture
        subscriptionPlan
      }
    }
  }
`;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const courseCode =
    typeof body?.courseCode === "string" ? body.courseCode.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : null;
  const rawYear =
    typeof body?.year === "string" ? body.year.trim() : body?.year;

  if (!postId || !title || !courseCode) {
    return NextResponse.json(
      { error: "Post id, title and course code are required" },
      { status: 400 },
    );
  }

  let parsedYear: number | null = null;
  if (typeof rawYear === "string" && rawYear.length) {
    if (!/^\d{4}$/.test(rawYear)) {
      return NextResponse.json(
        { error: "Year must be a 4-digit number" },
        { status: 400 },
      );
    }

    parsedYear = Number.parseInt(rawYear, 10);
  } else if (typeof rawYear === "number" && Number.isFinite(rawYear)) {
    parsedYear = rawYear;
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: UPDATE_POST_MUTATION,
      variables: {
        postId,
        title,
        courseCode,
        description,
        year: parsedYear,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to update post",
        details: graphqlBody?.errors ?? null,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, post: graphqlBody?.data?.updatePost });
}
