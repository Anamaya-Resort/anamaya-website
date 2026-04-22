// Basic-auth gate on /admin/*. Credentials come from env:
//   ADMIN_USERNAME, ADMIN_PASSWORD
// Not a substitute for proper auth when we scale — but good enough for
// a single-operator admin UI while we ship.

import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) {
    return new NextResponse(
      "Admin is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env.local / Vercel env.",
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) {
    return requestAuth();
  }
  const [suppliedUser, suppliedPass] = atob(auth.slice(6)).split(":");
  if (suppliedUser !== user || suppliedPass !== pass) {
    return requestAuth();
  }
  return NextResponse.next();
}

function requestAuth() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Anamaya Admin"' },
  });
}
