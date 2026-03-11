import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // Lazy-loads the trending repos feature page.
    loadComponent: () =>
      import('./features/trending-repos/ui/pages/trending-repos-page/trending-repos-page.component').then(
        (m) => m.TrendingReposPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
