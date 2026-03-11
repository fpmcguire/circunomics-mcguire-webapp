import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // Lazy-loaded in Step 3 when the feature page exists
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
