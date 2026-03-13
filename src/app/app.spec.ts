import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { render, screen } from '@testing-library/angular';
import { App } from './app';
import { routes } from './app.routes';

describe('App shell', () => {
  it('renders the site header with brand name', async () => {
    await render(App, {
      providers: [provideRouter(routes), provideHttpClient(), provideAnimationsAsync()],
    });

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText('Circunomics – home')).toBeInTheDocument();
  });

  it('renders the main content landmark', async () => {
    await render(App, {
      providers: [provideRouter(routes), provideHttpClient(), provideAnimationsAsync()],
    });

    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the About button in the header', async () => {
    await render(App, {
      providers: [provideRouter(routes), provideHttpClient(), provideAnimationsAsync()],
    });

    expect(screen.getByTestId('app-about-button')).toBeInTheDocument();
  });
});
