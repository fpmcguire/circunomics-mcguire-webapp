import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntersectionObserverDirective } from './intersection-observer.directive';

// ---------------------------------------------------------------------------
// Mock IntersectionObserver — JSDOM does not support it
// ---------------------------------------------------------------------------

type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  static lastCallback: IOCallback | null = null;

  private cb: IOCallback;
  readonly root: HTMLElement | null;

  constructor(cb: IOCallback, options?: IntersectionObserverInit) {
    this.cb = cb;
    this.root = (options?.root as HTMLElement | null) ?? null;
    MockIntersectionObserver.instances.push(this);
    MockIntersectionObserver.lastCallback = cb;
  }

  observe = vi.fn();
  disconnect = vi.fn();

  /** Helper: simulate an element entering the viewport. */
  triggerEntry(isIntersecting: boolean): void {
    this.cb([{ isIntersecting } as IntersectionObserverEntry]);
  }
}

// ---------------------------------------------------------------------------
// Test host
// ---------------------------------------------------------------------------

@Component({
  template: `
    <div
      appIntersectionObserver
      [intersectionRoot]="root"
      (intersected)="onIntersected()"
      data-testid="target"
    ></div>
  `,
  imports: [IntersectionObserverDirective],
})
class TestHostComponent {
  root: HTMLElement | null = null;
  onIntersected = vi.fn();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IntersectionObserverDirective', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    MockIntersectionObserver.lastCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates an IntersectionObserver and observes the host element', async () => {
    await render(TestHostComponent);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].observe).toHaveBeenCalled();
  });

  it('emits intersected when the entry is intersecting', async () => {
    const { fixture } = await render(TestHostComponent);
    MockIntersectionObserver.instances[0].triggerEntry(true);
    expect(fixture.componentInstance.onIntersected).toHaveBeenCalledTimes(1);
  });

  it('does not emit intersected when entry is not intersecting', async () => {
    const { fixture } = await render(TestHostComponent);
    MockIntersectionObserver.instances[0].triggerEntry(false);
    expect(fixture.componentInstance.onIntersected).not.toHaveBeenCalled();
  });

  it('uses the provided root element when intersectionRoot is set', async () => {
    const rootEl = document.createElement('div');
    const { fixture } = await render(TestHostComponent, {
      componentProperties: { root: rootEl },
    });
    fixture.detectChanges();
    expect(MockIntersectionObserver.instances[0].root).toBe(rootEl);
  });

  it('disconnects the observer on destroy', async () => {
    const { fixture } = await render(TestHostComponent);
    const observer = MockIntersectionObserver.instances[0];
    fixture.destroy();
    expect(observer.disconnect).toHaveBeenCalled();
  });
});
