import '@/styles/app.css';
import renderLibraryScreen from '@/components/LibraryScreen';
import renderRideScreen from '@/components/RideScreen';
import renderSettingsScreen from '@/components/SettingsScreen';
import buildFtpTestRide from '@/lib/client/helpers/build-ftp-test-ride';
import { RIDES } from '@/lib/client/models/rides';
import type { Ride } from '@/lib/client/models/types';

const app: HTMLElement | null = document.getElementById('app');

function renderPlaceholder(root: HTMLElement, text: string): void {
  const paragraph: HTMLParagraphElement = document.createElement('p');
  paragraph.textContent = text;
  const back: HTMLAnchorElement = document.createElement('a');
  back.href = '#/';
  back.textContent = 'Back';
  root.replaceChildren(paragraph, back);
}

function renderRoute(): void {
  if (!app) {
    return;
  }

  if (new URLSearchParams(location.search).get('code')) {
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
    renderPlaceholder(app, 'Summary screen coming in a later task');
    return;
  } else if (route === 'history') {
    renderPlaceholder(app, 'History screen coming in a later task');
    return;
  } else if (route === 'settings') {
    renderSettingsScreen(app);
    return;
  }

  renderLibraryScreen(app);
}

window.addEventListener('hashchange', renderRoute);
renderRoute();
