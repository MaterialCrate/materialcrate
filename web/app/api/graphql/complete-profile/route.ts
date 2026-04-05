import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
const MAX_PROFILE_PICTURE_BYTES = 10 * 1024 * 1024;
const ALLOWED_PROFILE_PICTURE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_PROFILE_BACKGROUND_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_BACKGROUND_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type CompleteProfileBody = {
  username?: string;
  displayName?: string;
  institution?: string;
  program?: string;
  profilePicture?: string | null;
  profileBackground?: string;
  profileBackgroundFileBase64?: string;
  profileBackgroundFileName?: string;
  profileBackgroundMimeType?: string;
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
    $profileBackground: String
    $profileBackgroundFileBase64: String
    $profileBackgroundFileName: String
    $profileBackgroundMimeType: String
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
      profileBackground: $profileBackground
      profileBackgroundFileBase64: $profileBackgroundFileBase64
      profileBackgroundFileName: $profileBackgroundFileName
      profileBackgroundMimeType: $profileBackgroundMimeType
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
      profileBackground
    }
  }
`;

export async function POST(req: Request) {
  let body: CompleteProfileBody = {};
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("profilePictureFile");
    const profileBackgroundFile = formData.get("profileBackgroundFile");
    const username = formData.get("username");
    const displayName = formData.get("displayName");
    const institution = formData.get("institution");
    const program = formData.get("program");
    const profileBackground = formData.get("profileBackground");

    body.username = typeof username === "string" ? username : undefined;
    body.displayName =
      typeof displayName === "string" ? displayName : undefined;
    body.institution =
      typeof institution === "string" ? institution : undefined;
    body.program = typeof program === "string" ? program : undefined;
    body.profileBackground =
      typeof profileBackground === "string" ? profileBackground : undefined;

    if (file instanceof File) {
      const normalizedType = file.type.toLowerCase();
      if (!ALLOWED_PROFILE_PICTURE_MIME_TYPES.has(normalizedType)) {
        return NextResponse.json(
          { error: "Use JPG, PNG, or WEBP only." },
          { status: 400 },
        );
      }
      if (file.size > MAX_PROFILE_PICTURE_BYTES) {
        return NextResponse.json(
          { error: "Profile picture must be 10MB or smaller" },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      body.profilePictureFileBase64 =
        Buffer.from(arrayBuffer).toString("base64");
      body.profilePictureFileName = file.name;
      body.profilePictureMimeType = file.type;
    }

    if (profileBackgroundFile instanceof File) {
      const normalizedType = profileBackgroundFile.type.toLowerCase();
      if (!ALLOWED_PROFILE_BACKGROUND_MIME_TYPES.has(normalizedType)) {
        return NextResponse.json(
          { error: "Use JPG, PNG, WEBP, or GIF only for profile backgrounds." },
          { status: 400 },
        );
      }
      if (profileBackgroundFile.size > MAX_PROFILE_BACKGROUND_BYTES) {
        return NextResponse.json(
          { error: "Profile background must be 5MB or smaller" },
          { status: 400 },
        );
      }

      const arrayBuffer = await profileBackgroundFile.arrayBuffer();
      body.profileBackgroundFileBase64 =
        Buffer.from(arrayBuffer).toString("base64");
      body.profileBackgroundFileName = profileBackgroundFile.name;
      body.profileBackgroundMimeType = profileBackgroundFile.type;
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
        error: "Username, display name, and institution are required",
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
        profileBackground:
          typeof body.profileBackground === "string"
            ? body.profileBackground.trim() || undefined
            : undefined,
        profileBackgroundFileBase64:
          typeof body.profileBackgroundFileBase64 === "string"
            ? body.profileBackgroundFileBase64
            : undefined,
        profileBackgroundFileName:
          typeof body.profileBackgroundFileName === "string"
            ? body.profileBackgroundFileName.trim()
            : undefined,
        profileBackgroundMimeType:
          typeof body.profileBackgroundMimeType === "string"
            ? body.profileBackgroundMimeType.trim()
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
