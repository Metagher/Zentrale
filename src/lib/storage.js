export async function loadKey(supabase, key, fallback) {
  try {
    const { data, error } = await supabase.from('zuhause_kv_store').select('value').eq('key', key).maybeSingle();
    if (error || !data) return fallback;
    return data.value;
  } catch (e) {
    return fallback;
  }
}

export async function saveKey(supabase, key, value) {
  try {
    const { error } = await supabase.from('zuhause_kv_store').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) console.error('Speichern fehlgeschlagen', key, error);
  } catch (e) {
    console.error('Speichern fehlgeschlagen', key, e);
  }
}
