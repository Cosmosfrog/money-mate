import { useEffect } from "react";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { RadarApp } from "@/components/radar/app-shell";
import { Landing } from "@/components/radar/landing";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { captureCheckoutReturn } from "@/lib/radar/pro";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { sessionUser } = useRouteContext({ from: "__root__" });
  const { user, isPending } = useCurrentUserState();
  useEffect(() => {
    captureCheckoutReturn();
  }, []);
  if (user || sessionUser) return <RadarApp />;
  return <Landing authReady={!isPending} />;
}
