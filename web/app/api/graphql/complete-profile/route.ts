import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
const MAX_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_PICTURE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

type CompleteProfileBody = {
  username?: string;
  displayName?: string;
  institution?: string;
  program?: string;
  profilePicture?: string | null;
  profilePictureFileBase64?: string;
  profilePictureFileName?: string;
  profilePictureMimeType?: string;
  email?: string;
};

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const COMPLETE_PROFILE_MUTATION = `
  mutation CompleteProfile(
    $username: String!
    $displayName: String!
    $institution: String!
    $program: String
    $profilePicture: String
    $profilePictureFileBase64: String
    $profilePictureFileName: String
    $profilePictureMimeType: String
  ) {
    completeProfile(
      username: $username
      displayName: $displayName
      institution: $institution
      program: $program
      profilePicture: $profilePicture
      profilePictureFileBase64: $profilePictureFileBase64
      profilePictureFileName: $profilePictureFileName
      profilePictureMimeType: $profilePictureMimeType
    ) {
      email
      username
      displayName
      institution
      program
      profilePicture
    }
  }
`;

export async function POST(req: Request) {
  let body: CompleteProfileBody = {};
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("profilePictureFile");
    const username = formData.get("username");
    const displayName = formData.get("displayName");
    const institution = formData.get("institution");
    const program = formData.get("program");

    body.username = typeof username === "string" ? username : undefined;
    body.displayName =
      typeof displayName === "string" ? displayName : undefined;
    body.institution = typeof institution === "string" ? institution : undefined;
    body.program = typeof program === "string" ? program : undefined;

    if (file instanceof File) {
      const normalizedType = file.type.toLowerCase();
      if (!ALLOWED_PROFILE_PICTURE_MIME_TYPES.has(normalizedType)) {
        return NextResponse.json(
          { error: "Use JPG, JPEG, or PNG only." },
          { status: 400 },
        );
      }
      if (file.size > MAX_PROFILE_PICTURE_BYTES) {
        return NextResponse.json(
          { error: "Profile picture must be 5MB or smaller" },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      body.profilePictureFileBase64 = Buffer.from(arrayBuffer).toString("base64");
      body.profilePictureFileName = file.name;
      body.profilePictureMimeType = file.type;
    }
  } else {
    try {
      body = (await req.json()) as CompleteProfileBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  if (!body.username || !body.displayName || !body.institution) {
    return NextResponse.json(
      {
        error:
          "Username, display name, and institution are required",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Authentication required to complete profile" },
      { status: 401 },
    );
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: COMPLETE_PROFILE_MUTATION,
      variables: {
        username: body.username,
        displayName: body.displayName,
        institution: body.institution,
        program: body.program,
        profilePicture:
          typeof body.profilePicture === "string"
            ? body.profilePicture.trim() || null
            : undefined,
        profilePictureFileBase64:
          typeof body.profilePictureFileBase64 === "string"
            ? body.profilePictureFileBase64
            : undefined,
        profilePictureFileName:
          typeof body.profilePictureFileName === "string"
            ? body.profilePictureFileName.trim()
            : undefined,
        profilePictureMimeType:
          typeof body.profilePictureMimeType === "string"
            ? body.profilePictureMimeType.trim()
            : undefined,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message || "GraphQL completeProfile failed",
        details: graphqlBody?.errors ?? null,
        status: graphqlResponse.status,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: graphqlBody.data?.completeProfile,
  });
}
