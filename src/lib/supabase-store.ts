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

export async function saveSupabasePaymentQr(
  id: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<boolean> {
  const supabase = adminClient();
  if (!supabase) return false;
  const { error } = await supabase.from('lumina_payment_qr').upsert(
    {
      id,
      content_type: contentType,
      image_base64: Buffer.from(bytes).toString('base64'),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`Could not save payment QR in the database: ${error.message}`);
  return true;
}

export async function readSupabasePaymentQr(
  id: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const supabase = adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('lumina_payment_qr')
    .select('content_type, image_base64')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not read payment QR from the database: ${error.message}`);
  if (!data) return null;
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(data.content_type) ||
    typeof data.image_base64 !== 'string'
  ) {
    throw new Error('The saved payment QR record is invalid.');
  }
  return {
    bytes: Buffer.from(data.image_base64, 'base64'),
    contentType: data.content_type,
  };
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
