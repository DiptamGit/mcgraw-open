import { resetLocalSupabaseDatabase } from "./local-supabase";

export default function globalSetup(): void {
  resetLocalSupabaseDatabase();
}
