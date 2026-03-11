import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { githubAuthInterceptor } from './core/services/github-auth.interceptor';
import { TrendingReposRepository } from './features/trending-repos/domain/repositories/trending-repos.repository';
import { GithubTrendingReposRepository } from './features/trending-repos/infrastructure/repositories/github-trending-repos.repository';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([githubAuthInterceptor])),
    provideAnimationsAsync(),
    // Bind abstract repository token to GitHub implementation.
    // Swap with a mock provider in tests.
    { provide: TrendingReposRepository, useClass: GithubTrendingReposRepository },
    // TrendingReposFacade is provided in TrendingReposPageComponent so its
    // lifecycle is scoped to the feature page, not the application root.
  ],
};
