import { Component } from '@angular/core';
import { TrendingReposFacade } from '../../../application/facades/trending-repos.facade';

/**
 * TrendingReposPageComponent — routable page shell for the trending repos feature.
 *
 * Provides the TrendingReposFacade at this component's injector boundary so that
 * the facade's lifecycle is tied to the page, not the app root.
 *
 * The full repo list, card, infinite scroll, and error states are implemented
 * in Step 5. This shell wires the facade and owns the page layout.
 */
@Component({
  selector: 'app-trending-repos-page',
  providers: [TrendingReposFacade],
  template: `
    <section aria-labelledby="page-title">
      <h1 id="page-title" data-testid="trending-repos-page-title">Trending Repositories</h1>
      <p>
        Data integration is in place. The interactive repository list is being completed in the next
        milestone.
      </p>
    </section>
  `,
})
export class TrendingReposPageComponent {}
