import { NextResponse } from "next/server";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY ?? "";
const BASE = "https://api.giphy.com/v1/gifs";

type GiphyImage = { url: string; width: string; height: string; mp4?: string };
type GiphyResult = {
  id: string;
  images: {
    fixed_width_small_still?: GiphyImage; // static JPEG — fast picker thumbnail
    fixed_width_small?: GiphyImage;       // animated, for hover
    fixed_width?: GiphyImage;             // animated GIF + mp4
  };
};

export type GifItem = {
  id: string;
  stillUrl: string;   // static preview for picker grid
  mp4Url: string;     // MP4 for sent messages (5-10x smaller than GIF)
  width: number;
  height: number;
};

function toGifItem(r: GiphyResult): GifItem | null {
  const still = r.images.fixed_width_small_still ?? r.images.fixed_width_small;
  const animated = r.images.fixed_width ?? r.images.fixed_width_small;
  if (!still || !animated?.mp4) return null;
  return {
    id: r.id,
    stillUrl: still.url,
    mp4Url: animated.mp4,
    width: parseInt(still.width) || 200,
    height: parseInt(still.height) || 150,
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
