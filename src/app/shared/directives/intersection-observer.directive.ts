import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';

/**
 * IntersectionObserverDirective
 *
 * Emits `intersected` when the host element enters the viewport.
 * Used to trigger infinite scroll when the sentinel element at the bottom
 * of the repo list becomes visible.
 *
 * Pagination policy (whether to load more, guard conditions) stays in the
 * page component — this directive only reports visibility.
 *
 * Usage:
 *   <div appIntersectionObserver (intersected)="onSentinelVisible()"></div>
 */
@Directive({
  selector: '[appIntersectionObserver]',
})
export class IntersectionObserverDirective implements OnInit, OnDestroy {
  /** Fraction of the host element that must be visible to trigger. Default: 0 (any pixel). */
  @Input() threshold = 0;

  /**
   * Margin around the root (viewport). Positive values trigger before the
   * element actually enters view — useful for pre-loading.
   * Default: '200px' so the next page loads before the user reaches the bottom.
   */
  @Input() rootMargin = '200px';

  /** Emits when the host element intersects the viewport. */
  @Output() intersected = new EventEmitter<void>();

  private observer: IntersectionObserver | null = null;

  private readonly el = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          this.intersected.emit();
        }
      },
      { threshold: this.threshold, rootMargin: this.rootMargin },
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
