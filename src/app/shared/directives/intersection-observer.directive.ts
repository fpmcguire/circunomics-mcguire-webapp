import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';

/**
 * IntersectionObserverDirective
 *
 * Emits `intersected` whenever the host element enters the intersection viewport.
 *
 * Accepts an optional `intersectionRoot` input — pass the native scroll container
 * element here so the sentinel is observed relative to that container rather than
 * the browser viewport. This is required when the list scrolls inside a fixed-
 * height container rather than the window.
 *
 * Usage:
 * ```html
 * <div
 *   appIntersectionObserver
 *   [intersectionRoot]="listContainer"
 *   (intersected)="onSentinelVisible()"
 * ></div>
 * ```
 */
@Directive({
  selector: '[appIntersectionObserver]',
})
export class IntersectionObserverDirective implements OnInit, OnDestroy {
  /**
   * The scroll container to use as the observation root.
   * Pass the native `HTMLElement` of your scroll container.
   * Defaults to `null` (the browser viewport).
   */
  readonly intersectionRoot = input<HTMLElement | null>(null);

  /** Passed directly to IntersectionObserver `rootMargin` option. */
  readonly rootMargin = input('0px');

  /** Passed directly to IntersectionObserver `threshold` option. */
  readonly threshold = input(0);

  /** Fires once each time the host element enters the viewport / scroll root. */
  readonly intersected = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          this.intersected.emit();
        }
      },
      {
        root: this.intersectionRoot() ?? null,
        rootMargin: this.rootMargin(),
        threshold: this.threshold(),
      },
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
