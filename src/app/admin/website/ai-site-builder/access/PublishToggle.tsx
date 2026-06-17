"use client";

import { useRef } from "react";
import { toggleCanPublish } from "./actions";

/** A checkbox that flips a user's publish override and submits immediately. */
export default function PublishToggle({
  ssoUserId,
  canPublish,
}: {
  ssoUserId: string;
  canPublish: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={toggleCanPublish}>
      <input type="hidden" name="sso_user_id" value={ssoUserId} />
      <input type="hidden" name="value" value={(!canPublish).toString()} />
      <input
        type="checkbox"
        defaultChecked={canPublish}
        onChange={() => ref.current?.requestSubmit()}
        aria-label="Can publish without approval"
        className="h-4 w-4 cursor-pointer accent-[#2271b1]"
      />
    </form>
  );
}
