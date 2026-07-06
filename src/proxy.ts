import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-in-production"
);

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("callora_session")?.value;
  let authed = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      authed = true;
    } catch {
      authed = false;
    }
  }

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/panel") && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/giris";
    return NextResponse.redirect(url);
  }

  if ((pathname === "/giris" || pathname === "/kayit") && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/panel";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/giris", "/kayit"],
};
