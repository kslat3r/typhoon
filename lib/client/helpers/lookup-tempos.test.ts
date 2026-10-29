import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import lookupTempos from '@/lib/client/helpers/lookup-tempos';

function reply(content: unknown): Response {
  return new Response(JSON.stringify({ content }));
}

describe('lookupTempos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests all ids in one call and keys tempos by Spotify track id', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      reply([
        { href: 'https://open.spotify.com/track/a', tempo: 128.4 },
        { href: 'https://open.spotify.com/track/b', tempo: '95' },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    // Act
    const tempos = await lookupTempos(['a', 'b', 'c']);

    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined];
    expect(url).toBe('https://api.reccobeats.com/v1/audio-features?ids=a,b,c');
    expect(init).toBeUndefined();
    expect(tempos).toEqual({ a: 128.4, b: 95 });
  });

  it('drops entries with no id or a bad tempo and tolerates an empty body', async () => {
    // Arrange / Act / Assert
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply([{ tempo: 120 }, { href: 'https://open.spotify.com/track/a', tempo: 0 }])));
    expect(await lookupTempos(['a'])).toEqual({});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(undefined)));
    expect(await lookupTempos(['a'])).toEqual({});
  });

  it('throws on a failed response', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));

    // Act / Assert
    await expect(lookupTempos(['a'])).rejects.toThrow('Tempo lookup failed: 429');
  });
});
