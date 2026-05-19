import { redirect } from "next/navigation";
import { isAdminRequest } from "../lib/auth";
import DeckVaultClient from "../components/DeckVaultClient";

export default async function HomePage() {
  if (!(await isAdminRequest())) {
    redirect("/login");
  }

  return <DeckVaultClient />;
}
