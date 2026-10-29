export default async function lookupTempos(trackIds: string[]): Promise<Record<string, number>> {
  const url = `https://api.reccobeats.com/v1/audio-features?ids=${trackIds.map(encodeURIComponent).join(',')}`;
  let response: Response;
  let body: { content?: unknown };

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error('Tempo lookup request failed', { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Tempo lookup failed: ${response.status}`);
  }

  try {
    body = await response.json();
  } catch (error) {
    throw new Error('Tempo lookup response parse failed', { cause: error });
  }

  const tempos: Record<string, number> = {};
  if (!Array.isArray(body.content)) {
    return tempos;
  }

  for (const entry of body.content as { href?: unknown; tempo?: unknown }[]) {
    const id = typeof entry.href === 'string' ? entry.href.split('/').pop() : undefined;
    const tempo = Number(entry.tempo);
    if (id !== undefined && id !== '' && Number.isFinite(tempo) && tempo > 0) {
      tempos[id] = tempo;
    }
  }

  return tempos;
}
