import {
  createC2pa,
  isSupportedReaderFormat,
  type Manifest,
  type ManifestStore,
} from '@contentauth/c2pa-web';
import type { C2paClaim, C2paState } from './types';

let sdkPromise: ReturnType<typeof createC2pa> | undefined;

export async function getSdk() {
  if (typeof window === 'undefined') {
    throw new Error('C2PA SDK can only be initialized in browser environments.');
  }
  if (!sdkPromise) {
    sdkPromise = createC2pa({
      wasmSrc: '/wasm/c2pa.wasm',
    }).catch((err) => {
      sdkPromise = undefined; // allow retry on transient error
      throw err;
    });
  }
  return sdkPromise;
}

/**
 * Pre-warm the C2PA WASM engine in the background so manifest inspection is instant.
 */
export function preloadC2pa(): void {
  if (typeof window === 'undefined') return;
  getSdk().catch(() => undefined);
}

const readable = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const formatDate = (value: unknown) => {
  const date = readable(value);
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed);
};

function validationState(store: ManifestStore): C2paState {
  const state = readable(store.validation_state)?.toLowerCase();
  if (state === 'trusted') return 'trusted';
  if (state === 'valid') return 'valid';
  if (state === 'invalid') return 'invalid';

  const statuses = store.validation_status ?? [];
  if (statuses.some((status) => status.success === false)) return 'invalid';
  if (statuses.length > 0 && statuses.every((status) => status.success === true)) {
    return 'valid';
  }
  return 'unverified';
}

function actionNames(manifest: Manifest) {
  const actionAssertions = (manifest.assertions ?? []).filter((assertion) =>
    assertion.label.toLowerCase().includes('actions'),
  );
  const names = actionAssertions.flatMap((assertion) => {
    const data = assertion.data;
    const candidates =
      Array.isArray(data) ? data : data && typeof data === 'object' && 'actions' in data
        ? (data as { actions?: unknown }).actions
        : [];
    if (!Array.isArray(candidates)) return [];
    return candidates
      .map((action) => {
        if (!action || typeof action !== 'object') return null;
        const record = action as Record<string, unknown>;
        return readable(record.action) ?? readable(record.name) ?? readable(record.description);
      })
      .filter((name): name is string => Boolean(name));
  });
  return [...new Set(names)];
}

function claimFields(store: ManifestStore, manifest: Manifest) {
  const fields: string[] = [];
  const generator =
    manifest.claim_generator_info?.map((item) => {
      const version = readable(item.version);
      return version ? `${item.name} ${version}` : item.name;
    }).filter(Boolean).join(', ') ??
    readable(manifest.claim_generator);
  const issuer = readable(manifest.signature_info?.common_name) ?? readable(manifest.signature_info?.issuer);
  const signedAt = formatDate(manifest.signature_info?.time);
  const actions = actionNames(manifest);
  const ingredients = manifest.ingredients?.filter((ingredient) => readable(ingredient.title));

  if (generator) fields.push(`Claim generator: ${generator}`);
  if (issuer) fields.push(`Issued by: ${issuer}`);
  if (signedAt) fields.push(`Signed: ${signedAt}`);
  if (actions.length > 0) fields.push(`Recorded actions: ${actions.join(', ')}`);
  if (ingredients && ingredients.length > 0) {
    const titles = ingredients.slice(0, 2).map((ingredient) => readable(ingredient.title)).filter(Boolean);
    const suffix = ingredients.length > 2 ? ` +${ingredients.length - 2} more` : '';
    fields.push(`Linked ingredients: ${titles.join(', ')}${suffix}`);
  }
  if (manifest.format) fields.push(`Manifest format: ${manifest.format}`);
  if (store.active_manifest) fields.push(`Active manifest: ${store.active_manifest}`);
  return fields;
}

function manifestCount(store: ManifestStore) {
  return Object.keys(store.manifests ?? {}).length;
}

function stateDetail(state: C2paState) {
  switch (state) {
    case 'trusted':
      return 'A C2PA manifest was found and its signature/trust checks passed.';
    case 'valid':
      return 'A C2PA manifest was found and its structural and cryptographic checks passed, but trust may not be established.';
    case 'invalid':
      return 'A C2PA manifest was found, but one or more validation checks failed.';
    case 'unverified':
      return 'A C2PA manifest was found, but the verifier did not return a complete validation state.';
    case 'none':
      return 'The official reader did not find a C2PA manifest in this file.';
    case 'unsupported':
      return 'The official reader does not support this image format in the browser.';
    case 'error':
      return 'The official reader could not initialize or parse this file. No verification result was produced.';
  }
}

function stateLabel(state: C2paState) {
  return state === 'trusted'
    ? 'Trusted'
    : state === 'valid'
      ? 'Valid'
      : state === 'invalid'
        ? 'Invalid'
        : 'Manifest read';
}

export async function inspectC2pa(file: File): Promise<C2paClaim> {
  const format = file.type || 'application/octet-stream';
  if (!isSupportedReaderFormat(format)) {
    return { state: 'unsupported', detail: stateDetail('unsupported'), fields: [] };
  }

  let reader: Awaited<ReturnType<Awaited<ReturnType<typeof getSdk>>['reader']['fromBlob']>> = null;
  try {
    const sdk = await getSdk();
    reader = await sdk.reader.fromBlob(format, file);
    if (!reader) return { state: 'none', detail: stateDetail('none'), fields: [] };

    const store = await reader.manifestStore();
    const active =
      (store.active_manifest && store.manifests?.[store.active_manifest]) ??
      (await reader.activeManifest().catch(() => null));
    if (!active) {
      return { state: 'unverified', detail: stateDetail('unverified'), fields: [] };
    }

    const state = validationState(store);
    const fields = claimFields(store, active);
    fields.unshift(`Validation state: ${stateLabel(state)}`);
    if (manifestCount(store) > 1) fields.push(`Manifest chain: ${manifestCount(store)} manifests`);
    return {
      state,
      detail: stateDetail(state),
      fields,
    };
  } catch {
    return { state: 'error', detail: stateDetail('error'), fields: [] };
  } finally {
    await reader?.free().catch(() => undefined);
  }
}
