import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // Lazy-loads the trending repos page. Currently resolves to a placeholder
    // component that will be replaced with the full implementation in Step 3.
    loadComponent: () =>
      import(
        './features/trending-repos/ui/pages/trending-repos-page/trending-repos-page.component'
      ).then((m) => m.TrendingReposPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
