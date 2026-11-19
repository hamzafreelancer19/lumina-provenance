import { createClient } from '@supabase/supabase-js';

type StoreLike = {
  revision?: number;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function readSupabaseStore<T extends StoreLike>(
  normalize: (value: T) => T,
): Promise<T | null> {
  const supabase = adminClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('lumina_store')
      .select('state')
      .eq('id', 'main')
      .maybeSingle();
    if (error || !data?.state) return null;
    return normalize(data.state as T);
  } catch {
    return null;
  }
}

export async function writeSupabaseStore(store: StoreLike & Record<string, unknown>) {
  const supabase = adminClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('lumina_store').upsert(
      {
        id: 'main',
        state: store,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    return !error;
  } catch {
    return false;
  }
}
