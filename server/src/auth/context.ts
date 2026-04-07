import jwt from "jsonwebtoken";

export const context = async ({ req }: any) => {
  const result: Record<string, unknown> = {};

  const auth = req.headers.authorization;
  if (auth) {
    const token = auth.replace("Bearer ", "");
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        result.user = jwt.verify(token, secret);
      }
    } catch {}
  }

  result.ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;

  const adminSecret = req.headers["x-admin-secret"];
  if (
    adminSecret &&
    process.env.ADMIN_SECRET &&
    adminSecret === process.env.ADMIN_SECRET
  ) {
    result.isAdmin = true;
  }

  return result;
};
