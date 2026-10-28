import '@/styles/app.css';
import renderHistoryScreen from '@/components/HistoryScreen';
import renderLibraryScreen from '@/components/LibraryScreen';
import renderRideScreen from '@/components/RideScreen';
import renderSettingsScreen from '@/components/SettingsScreen';
import renderSummaryScreen from '@/components/SummaryScreen';
import buildFtpTestRide from '@/lib/client/helpers/build-ftp-test-ride';
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
  } else if (route === 'ftp-test') {
    const seconds: number = Number(param);
    if (seconds === 60 || seconds === 180 || seconds === 300) {
      const ride: Ride = buildFtpTestRide(seconds);
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
