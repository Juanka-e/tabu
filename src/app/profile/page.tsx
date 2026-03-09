import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard%3Ftab%3Dsettings");
  }

  redirect("/dashboard?tab=settings");
}
