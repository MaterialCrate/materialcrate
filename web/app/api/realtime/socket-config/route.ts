import { NextResponse } from "next/server";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
const DEFAULT_SOCKET_PATH = "/socket.io";

const buildSocketUrl = () => {
  const endpoint = new URL(GRAPHQL_ENDPOINT);
  endpoint.pathname = "";
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint.toString().replace(/\/$/, "");
};

export async function GET() {
  try {
    return NextResponse.json({
      enabled: true,
      socketUrl: buildSocketUrl(),
      socketPath: DEFAULT_SOCKET_PATH,
    });
  } catch {
    return NextResponse.json({
      enabled: false,
      socketUrl: null,
      socketPath: DEFAULT_SOCKET_PATH,
    });
  }
}
