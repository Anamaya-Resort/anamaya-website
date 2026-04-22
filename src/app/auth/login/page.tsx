import Image from "next/image";
import { SSOLoginButton } from "@/modules/auth/sso-login-button";

export const metadata = { title: "Sign In — Anamaya" };

// Matches AO login layout (AnamayaOS_full_logo → h1/subtitle → button → dividers).
// Reuses the same LightningWorks SSO so one login works on both ao.anamaya.com
// and this site.
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-anamaya-brand-subtle p-4">
      <div className="w-full max-w-[860px] space-y-16 text-center">
        <Image
          src="/anamaya-logo-admin.webp"
          alt="Anamaya"
          width={360}
          height={72}
          className="mx-auto"
          priority
        />

        <Image
          src="/flower-divider.png"
          alt=""
          width={640}
          height={32}
          className="mx-auto"
        />

        <div className="space-y-16">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-anamaya-charcoal">
              Welcome back
            </h1>
            <p className="text-sm text-anamaya-charcoal/60">
              Sign in with your LightningWorks account to access the admin
              dashboard.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-xs">
              <SSOLoginButton label="Sign In" />
            </div>
          </div>
        </div>

        <Image
          src="/flower-divider.png"
          alt=""
          width={640}
          height={32}
          className="mx-auto rotate-180"
        />
      </div>
    </div>
  );
}
