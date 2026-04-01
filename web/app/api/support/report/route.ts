import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 3;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const CREATE_REPORT_MUTATION = `
  mutation CreateReport(
    $category: String!
    $title: String!
    $description: String!
    $userAgent: String
    $deviceInfo: String
    $imageBase64s: [String!]
    $imageFileNames: [String!]
    $imageMimeTypes: [String!]
  ) {
    createReport(
      category: $category
      title: $title
      description: $description
      userAgent: $userAgent
      deviceInfo: $deviceInfo
      imageBase64s: $imageBase64s
      imageFileNames: $imageFileNames
      imageMimeTypes: $imageMimeTypes
    ) {
      id
      category
      title
      description
      imageUrls
      userAgent
      deviceInfo
      resolved
      createdAt
    }
  }
`;

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "multipart/form-data required" },
      { status: 400 },
    );
  }

  const formData = await req.formData();

  const title = formData.get("title");
  const description = formData.get("description");
  const category = formData.get("category");
  const userAgent = formData.get("userAgent");
  const deviceInfo = formData.get("deviceInfo");

  if (
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof category !== "string"
  ) {
    return NextResponse.json(
      { error: "title, description, and category are required" },
      { status: 400 },
    );
  }

  const imageFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File);

  if (imageFiles.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `You can attach up to ${MAX_IMAGES} images.` },
      { status: 400 },
    );
  }

  const imageBase64s: string[] = [];
  const imageFileNames: string[] = [];
  const imageMimeTypes: string[] = [];

  for (const file of imageFiles) {
    const normalizedType = file.type.toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(normalizedType)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are supported." },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Each image must be under 5 MB." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    imageBase64s.push(Buffer.from(arrayBuffer).toString("base64"));
    imageFileNames.push(file.name);
    imageMimeTypes.push(file.type);
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
      query: CREATE_REPORT_MUTATION,
      variables: {
        category,
        title,
        description,
        userAgent: typeof userAgent === "string" ? userAgent : null,
        deviceInfo: typeof deviceInfo === "string" ? deviceInfo : null,
        imageBase64s: imageBase64s.length > 0 ? imageBase64s : null,
        imageFileNames: imageFileNames.length > 0 ? imageFileNames : null,
        imageMimeTypes: imageMimeTypes.length > 0 ? imageMimeTypes : null,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to submit report.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    report: graphqlBody?.data?.createReport,
  });
}
