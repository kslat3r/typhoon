import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import lookupTempo from '@/lib/client/helpers/lookup-tempo';
import type { Track } from '@/lib/client/models/types';

const TRACK: Track = { id: 'a', uri: 'spotify:track:a', name: 'Song One', artist: 'Band', artworkUrl: '', durationMs: 180000 };

describe('lookupTempo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null tempo when GetSongBPM has no match', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ search: { error: 'no result' } }))));

    // Act / Assert
    expect(await lookupTempo('key', TRACK)).toBeNull();
  });

  it('returns the first result tempo as a number and sends the key', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ search: [{ tempo: '128' }] })));
    vi.stubGlobal('fetch', fetchMock);

    // Act
    const tempo = await lookupTempo('key', TRACK);

    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(tempo).toBe(128);
    expect(url).toBe(`https://api.getsongbpm.com/search/?type=both&lookup=${encodeURIComponent('song:Song One artist:Band')}`);
    expect(new Headers(init.headers).get('X-API-KEY')).toBe('key');
  });

  it('returns null for an empty list, a bad tempo and a 404', async () => {
    // Arrange / Act / Assert
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ search: [] }))));
    expect(await lookupTempo('key', TRACK)).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ search: [{ tempo: '0' }] }))));
    expect(await lookupTempo('key', TRACK)).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    expect(await lookupTempo('key', TRACK)).toBeNull();
  });

  it('throws when unauthorised', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));

    // Act / Assert
    await expect(lookupTempo('key', TRACK)).rejects.toThrow('Tempo lookup unauthorised: 403');
  });

  it('throws on other failures', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));

    // Act / Assert
    await expect(lookupTempo('key', TRACK)).rejects.toThrow('Tempo lookup failed: 500');
  });
});
