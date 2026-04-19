import { NextResponse } from "next/server";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY ?? "";
const BASE = "https://api.giphy.com/v1/gifs";

type GiphyImage = { url: string; width: string; height: string };
type GiphyResult = {
  id: string;
  title: string;
  images: {
    fixed_width_small?: GiphyImage;
    fixed_width?: GiphyImage;
  };
};

type GifItem = { id: string; previewUrl: string; url: string; width: number; height: number };

function toGifItem(r: GiphyResult): GifItem | null {
  const preview = r.images.fixed_width_small ?? r.images.fixed_width;
  const full = r.images.fixed_width ?? r.images.fixed_width_small;
  if (!preview || !full) return null;
  return {
    id: r.id,
    previewUrl: preview.url,
    url: full.url,
    width: parseInt(preview.width) || 200,
    height: parseInt(preview.height) || 150,
  };
}

export async function GET(request: Request) {
  if (!GIPHY_API_KEY) {
    return NextResponse.json({ error: "GIF search not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limit = 24;

  const endpoint = q
    ? `${BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g&lang=en`
    : `${BASE}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`;

  const res = await fetch(endpoint);
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch GIFs" }, { status: 502 });
  }

  const data = (await res.json()) as { data: GiphyResult[] };
  const gifs = (data.data ?? []).map(toGifItem).filter(Boolean) as GifItem[];

  return NextResponse.json({ gifs });
}
