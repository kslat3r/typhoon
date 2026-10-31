import '@/styles/app.css';
import { lockRideLandscape, unlockRideOrientation } from '@/lib/client/helpers/lock-landscape';
import renderHistoryScreen from '@/components/HistoryScreen';
import renderLibraryScreen from '@/components/LibraryScreen';
import renderRideScreen from '@/components/RideScreen';
import renderSettingsScreen from '@/components/SettingsScreen';
import renderSummaryScreen from '@/components/SummaryScreen';
import { RIDES } from '@/lib/client/models/rides';
import type { Ride } from '@/lib/client/models/types';

const app: HTMLElement | null = document.getElementById('app');

function renderRoute(): void {
  if (!app) {
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

function rideOnScreen(): boolean {
  const [, route, param] = location.hash.split('/');
  if (route !== 'ride') {
    return false;
  }
  return RIDES.some((candidate: Ride): boolean => candidate.id === param);
}

function syncRideOrientation(): void {
  if (rideOnScreen()) {
    lockRideLandscape(screen.orientation);
    return;
  }
  unlockRideOrientation(screen.orientation);
}

window.addEventListener('hashchange', (): void => {
  renderRoute();
  syncRideOrientation();
});
renderRoute();
syncRideOrientation();

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
  if (document.visibilityState === 'visible' && rideOnScreen()) {
    lockRideLandscape(screen.orientation);
  }
});
