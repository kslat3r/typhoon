import html from '../../index.html?raw';
import app from '../../main.ts?raw';
import css from '../../styles/app.css?raw';
import manifestText from '../../public/manifest.webmanifest?raw';
import worker from '../../public/sw.js?raw';
import { describe, expect, it } from 'vitest';

describe('installable web app', () => {
  it('ships a manifest scoped to /typhoon/ with standalone display and both icon sizes', () => {
    // Arrange
    const manifest = JSON.parse(manifestText) as {
      name: string;
      short_name: string;
      start_url: string;
      scope: string;
      display: string;
      orientation: string;
      theme_color: string;
      background_color: string;
      icons: { src: string; sizes: string; purpose: string; type: string }[];
    };

    // Assert
    expect(manifest.name).toBe('Typhoon');
    expect(manifest.short_name).toBe('Typhoon');
    expect(manifest.start_url).toBe('/typhoon/');
    expect(manifest.scope).toBe('/typhoon/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('any');
    expect(manifest.theme_color).toBe('#0f1219');
    expect(manifest.background_color).toBe('#0f1219');
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: 'icons/icon-192.png', sizes: '192x192', purpose: 'any', type: 'image/png' }),
        expect.objectContaining({ src: 'icons/icon-512.png', sizes: '512x512', purpose: 'any', type: 'image/png' }),
        expect.objectContaining({ src: 'icons/icon-maskable-512.png', sizes: '512x512', purpose: 'maskable', type: 'image/png' }),
      ]),
    );
  });

  it('links the manifest and the iOS standalone tags from the base path', () => {
    // Assert
    expect(html).toContain('href="%BASE_URL%manifest.webmanifest"');
    expect(html).toContain('href="%BASE_URL%apple-touch-icon.png"');
    expect(html).toContain('name="theme-color" content="#0f1219"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
    expect(html).not.toContain('Rotate your phone');
  });

  it('keeps the shell fresh and leaves off-origin requests on the network', () => {
    // Assert
    expect(worker).toContain('skipWaiting');
    expect(worker).toContain('clients.claim');
    expect(worker).toContain("addEventListener('fetch'");
    expect(worker).toContain('url.origin === self.location.origin');
    expect(worker).toContain('networkFirst');
    expect(worker).toContain("cache: 'no-store'");
    expect(worker).toContain('typhoon-shell-__BUILD_ID__');
    expect(worker).not.toContain('spotify');
    expect(app).toContain('controllerchange');
    expect(app).toContain('location.reload');
    expect(app).toContain('registration.update');
  });

  it('follows the phone and does not force a landscape lock or a rotated fallback', () => {
    // Assert
    expect(app).not.toContain('lockLandscape');
    expect(app).not.toContain('orientation.lock');
    expect(app).not.toContain('unlock');
    expect(css).not.toContain('rotate(90deg)');
    expect(html).not.toContain('Rotate your phone');
  });
});
