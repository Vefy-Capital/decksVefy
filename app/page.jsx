import { redirect } from "next/navigation";
import { isAdminRequest } from "../lib/auth";
import { listDecks } from "../lib/db";
import DeckVaultClient from "../components/DeckVaultClient";

export default async function HomePage() {
  if (!(await isAdminRequest())) {
    redirect("/login");
  }

  const decks = await listDecks();
  return <DeckVaultClient initialDecks={decks} />;
}
