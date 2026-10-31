import '@/styles/app.css';
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

window.addEventListener('hashchange', renderRoute);
renderRoute();

function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }
  window.addEventListener('load', (): void => {
    const base: string = import.meta.env.BASE_URL;
    void navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' });
  });
}

registerServiceWorker();
