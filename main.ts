import '@/styles/app.css';
import { lockLandscape } from '@/lib/client/helpers/lock-landscape';
import renderHistoryScreen from '@/components/HistoryScreen';
import renderLibraryScreen from '@/components/LibraryScreen';
import renderRideScreen from '@/components/RideScreen';
import renderSettingsScreen from '@/components/SettingsScreen';
import renderSummaryScreen from '@/components/SummaryScreen';
import { RIDES } from '@/lib/client/models/rides';
import type { Ride } from '@/lib/client/models/types';

const frame: HTMLElement | null = document.getElementById('app');
const app: HTMLElement | null = frame === null ? null : document.createElement('div');
if (frame !== null && app !== null) {
  app.className = 'app-scroll';
  frame.append(app);
}

function renderRoute(): void {
  if (!app) {
    return;
  }

  const query: URLSearchParams = new URLSearchParams(location.search);
  if (query.get('code')) {
    renderSettingsScreen(app);
    return;
  }

  if (query.get('error')) {
    history.replaceState(null, '', location.pathname + '#/settings');
    sessionStorage.setItem('typhoon.spotifyLoginCancelled', '1');
    renderSettingsScreen(app);
    return;
  }

  const [, route, param] = location.hash.split('/');

  if (route === 'ride') {
    const ride: Ride | undefined = RIDES.find((candidate: Ride): boolean => candidate.id === param);
    if (ride) {
      renderRideScreen(app, ride);
      return;
    }
  } else if (route === 'summary') {
    renderSummaryScreen(app, param);
    return;
  } else if (route === 'history') {
    renderHistoryScreen(app);
    return;
  } else if (route === 'settings') {
    renderSettingsScreen(app);
    return;
  }

  renderLibraryScreen(app);
}

function bindPortraitScroll(scroller: HTMLElement): void {
  const portrait: MediaQueryList = window.matchMedia('(orientation: portrait)');
  let startX = 0;
  let startTop = 0;
  let dragging = false;
  let velocity = 0;
  let lastX = 0;
  let lastTime = 0;
  let coasting = 0;

  const stopCoast = (): void => {
    if (coasting !== 0) {
      cancelAnimationFrame(coasting);
      coasting = 0;
    }
  };

  scroller.addEventListener(
    'touchstart',
    (event: TouchEvent): void => {
      if (!portrait.matches || event.touches.length !== 1) {
        dragging = false;
        return;
      }
      const touch: Touch | undefined = event.touches[0];
      if (touch === undefined) {
        return;
      }
      const target: EventTarget | null = event.target;
      if (target instanceof Element && target.closest('input, textarea, select') !== null) {
        dragging = false;
        return;
      }
      stopCoast();
      startX = touch.clientX;
      lastX = touch.clientX;
      lastTime = event.timeStamp;
      startTop = scroller.scrollTop;
      velocity = 0;
      dragging = true;
    },
    { passive: true },
  );

  scroller.addEventListener(
    'touchmove',
    (event: TouchEvent): void => {
      if (!dragging || event.touches.length !== 1) {
        return;
      }
      const touch: Touch | undefined = event.touches[0];
      if (touch === undefined) {
        return;
      }
      const dx: number = touch.clientX - startX;
      if (Math.abs(dx) < 8 && scroller.scrollTop === startTop) {
        return;
      }
      const elapsed: number = event.timeStamp - lastTime;
      if (elapsed > 0) {
        velocity = (touch.clientX - lastX) / elapsed;
      }
      lastX = touch.clientX;
      lastTime = event.timeStamp;
      scroller.scrollTop = startTop + dx;
      event.preventDefault();
    },
    { passive: false },
  );

  const endDrag = (): void => {
    if (!dragging) {
      return;
    }
    dragging = false;
    let speed: number = Math.max(-48, Math.min(48, velocity * 16));
    const coast = (): void => {
      speed *= 0.92;
      if (Math.abs(speed) < 0.4) {
        coasting = 0;
        return;
      }
      scroller.scrollTop += speed;
      coasting = requestAnimationFrame(coast);
    };
    coasting = requestAnimationFrame(coast);
  };

  scroller.addEventListener('touchend', endDrag);
  scroller.addEventListener('touchcancel', endDrag);
}

window.addEventListener('hashchange', (): void => {
  renderRoute();
});
renderRoute();
lockLandscape(screen.orientation);
if (app !== null) {
  bindPortraitScroll(app);
}

function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }
  window.addEventListener('load', (): void => {
    const base: string = import.meta.env.BASE_URL;
    const hadController: boolean = navigator.serviceWorker.controller !== null;
    if (hadController) {
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', (): void => {
        if (reloading) {
          return;
        }
        reloading = true;
        window.location.reload();
      });
    }
    void navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' }).then((registration): void => {
      document.addEventListener('visibilitychange', (): void => {
        if (document.visibilityState === 'visible') {
          void registration.update();
        }
      });
    });
  });
}

registerServiceWorker();

document.addEventListener('visibilitychange', (): void => {
  if (document.visibilityState === 'visible') {
    lockLandscape(screen.orientation);
  }
});
