import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TrendingReposFacade } from '../../../application/facades/trending-repos.facade';
import { GithubRepo } from '../../../domain/models/github-repo.model';
import { RepoListComponent } from '../../components/repo-list/repo-list.component';
import { IntersectionObserverDirective } from '../../../../../shared/directives/intersection-observer.directive';

@Component({
  selector: 'app-trending-repos-page',
  templateUrl: './trending-repos-page.component.html',
  styleUrl: './trending-repos-page.component.scss',
  providers: [TrendingReposFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RepoListComponent, IntersectionObserverDirective],
})
export class TrendingReposPageComponent implements OnInit {
  readonly facade = inject(TrendingReposFacade);

  ngOnInit(): void {
    this.facade.loadInitial();
  }

  onNameClick(repo: GithubRepo): void {
    // Step 6: open RepoDetailsDialogComponent via CDK Dialog
    // void repo; // suppress unused-variable lint until Step 6 wires this
  }

  onSentinelVisible(): void {
    this.facade.loadNextPage();
  }
}
