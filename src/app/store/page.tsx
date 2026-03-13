import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function StorePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?callbackUrl=/dashboard%3Ftab%3Dshop");
  }

  redirect("/dashboard?tab=shop");
}
