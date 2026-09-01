import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER ONLY.
 *
 * Used exclusively by code that runs OUTSIDE a user session but inside our
 * trusted server boundary, i.e. the payment webhook processor. Every RPC it
 * invokes is SECURITY DEFINER with its own validation, so no client input is
 * ever trusted. Requires SUPABASE_SERVICE_ROLE_KEY which must NEVER be
 * exposed to the browser (it is not NEXT_PUBLIC_*).
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is required for webhook processing."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
