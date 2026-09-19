import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RadarSignIn } from "@/components/radar/sign-in";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (user) return <Navigate to="/" />;
  return <RadarSignIn authReady={!isPending} />;
}
