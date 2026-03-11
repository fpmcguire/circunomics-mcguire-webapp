import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TrendingReposFacade } from '../../../application/facades/trending-repos.facade';
import { GithubRepo } from '../../../domain/models/github-repo.model';
import { RepoListComponent } from '../../components/repo-list/repo-list.component';
import { RepoPaginationComponent } from '../../components/repo-pagination/repo-pagination.component';

@Component({
  selector: 'app-trending-repos-page',
  templateUrl: './trending-repos-page.component.html',
  styleUrl: './trending-repos-page.component.scss',
  providers: [TrendingReposFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RepoListComponent, RepoPaginationComponent, NgTemplateOutlet],
})
export class TrendingReposPageComponent implements OnInit {
  readonly facade = inject(TrendingReposFacade);

  ngOnInit(): void {
    this.facade.loadInitial();
  }

  onNameClick(_repo: GithubRepo): void {
    // Step 6: open RepoDetailsDialogComponent via CDK Dialog
  }
}
