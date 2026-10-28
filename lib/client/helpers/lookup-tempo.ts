import type { Track } from '@/lib/client/models/types';

export default async function lookupTempo(apiKey: string, track: Track): Promise<number | null> {
  const lookup = encodeURIComponent(`song:${track.name} artist:${track.artist}`);
  const url = `https://api.getsongbpm.com/search/?type=both&lookup=${lookup}`;
  let response: Response;
  let body: { search?: unknown };

  try {
    response = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
  } catch (error) {
    throw new Error('Tempo lookup request failed', { cause: error });
  }

  if (response.status === 404) {
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(`Tempo lookup unauthorised: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`Tempo lookup failed: ${response.status}`);
  }

  try {
    body = await response.json();
  } catch (error) {
    throw new Error('Tempo lookup response parse failed', { cause: error });
  }

  if (!Array.isArray(body.search) || body.search.length === 0) {
    return null;
  }

  const tempo = Number((body.search[0] as { tempo?: unknown }).tempo);

  return Number.isFinite(tempo) && tempo > 0 ? tempo : null;
}
