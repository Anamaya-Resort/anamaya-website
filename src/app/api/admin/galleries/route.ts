import { NextResponse } from "next/server";
import { getSessionUser, isAdminUser } from "@/lib/session";
import {
  listGalleriesForChooser,
  getGalleryImagesForAdmin,
} from "@/lib/galleries";

/**
 * The gallery chooser's data, and the admin preview's.
 *
 * Both read AnamayaOS with the service key so drafts are visible, so
 * both are behind the admin check — no session, no galleries. The
 * public render path never comes here; it reads with the anon key and
 * sees published galleries only.
 *
 * GET                    -> every gallery, as chooser rows
 * GET ?code=gallery_4    -> that gallery's images, for the live preview
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (code) {
    return NextResponse.json({ images: await getGalleryImagesForAdmin(code) });
  }
  return NextResponse.json({ galleries: await listGalleriesForChooser() });
}
