import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';

/**
 * IntersectionObserverDirective
 *
 * Emits `intersected` (once per intersection event) when the host element
 * enters the viewport and `disabled` is false.
 *
 * Used to trigger infinite scroll when the sentinel element at the bottom
 * of the repo list becomes visible.
 *
 * Pagination policy (whether to load more, guard conditions) stays in the
 * page component — this directive only reports visibility.
 *
 * The `disabled` input lets the page component pause emission while a fetch
 * is in flight, preventing event churn from a single intersection cycle.
 *
 * Usage:
 *   <div
 *     appIntersectionObserver
 *     [disabled]="isLoadingMore()"
 *     (intersected)="onSentinelVisible()"
 *   ></div>
 */
@Directive({
  selector: '[appIntersectionObserver]',
})
export class IntersectionObserverDirective implements OnInit, OnChanges, OnDestroy {
  /** Fraction of the host element that must be visible to trigger. Default: 0 (any pixel). */
  @Input() threshold = 0;

  /**
   * Margin around the root (viewport). Positive values trigger before the
   * element actually enters view — useful for pre-loading.
   * Default: '200px' so the next page fires before the user hits the very bottom.
   */
  @Input() rootMargin = '200px';

  /**
   * When true, the observer is disconnected and no events are emitted.
   * Set this to `isLoadingMore` to prevent event churn while a fetch is in flight.
   */
  @Input() disabled = false;

  /** Emits when the host element intersects the viewport and disabled is false. */
  @Output() intersected = new EventEmitter<void>();

  private observer: IntersectionObserver | null = null;

  private readonly el = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    this.connect();
  }

  ngOnChanges(): void {
    // Reconnect whenever disabled or threshold/rootMargin change.
    this.disconnect();
    if (!this.disabled) {
      this.connect();
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private connect(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!this.disabled && entries[0]?.isIntersecting) {
          this.intersected.emit();
        }
      },
      { threshold: this.threshold, rootMargin: this.rootMargin },
    );
    this.observer.observe(this.el.nativeElement);
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
