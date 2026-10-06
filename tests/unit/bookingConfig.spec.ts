/**
 * S152 16b — the booking form slug follows the admin setting at runtime.
 *
 * fe-admin saves ``booking_form_slug`` into the fe-user plugin config the
 * frontend serves as ``/config.json`` (var/plugins/fe-user-plugins-config.json).
 * The SPA read only the build-time config.json, so the admin value never
 * reached the ``/<booking_form_slug>/:slug`` route or the Book Now link.
 * Faked at the transport (global fetch).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { IPlatformSDK } from 'vbwd-view-component';
import { bookingConfig } from '../../booking/bookingConfig';
import { bookingPlugin } from '../../index';

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

function installFakeFetch(status: number, body: unknown): string[] {
  const requestedUrls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    requestedUrls.push(url);
    return new Response(JSON.stringify(body), { status });
  }));
  return requestedUrls;
}

async function installAndCollectPaths(): Promise<string[]> {
  const paths: string[] = [];
  const sdk = {
    addTranslations: vi.fn(),
    addComponent: vi.fn(),
    addRoute: (route: { path: string }) => paths.push(route.path),
  } as unknown as IPlatformSDK;
  await bookingPlugin.install!(sdk);
  return paths;
}

describe('booking runtime config (S152 16b)', () => {
  afterEach(async () => {
    // install() fires un-awaited dynamic imports (confirmation-registry and CMS
    // widget registration load the booking views, which import @/api). Let them
    // finish inside the test environment, not after its teardown.
    await vi.dynamicImportSettled();
    vi.unstubAllGlobals();
  });

  it('uses the admin-saved booking_form_slug from the runtime /config.json', async () => {
    const requestedUrls = installFakeFetch(HTTP_OK, { booking: { booking_form_slug: 'reserve' } });
    const paths = await installAndCollectPaths();

    expect(requestedUrls).toEqual(['/config.json']);
    expect(bookingConfig.bookingFormSlug).toBe('reserve');
    expect(paths).toContain('/reserve/:slug');
    expect(paths).not.toContain('/booking-form/:slug');
  });

  it('falls back to the build-time slug when the runtime config has none', async () => {
    installFakeFetch(HTTP_OK, { booking: {} });
    const paths = await installAndCollectPaths();

    expect(bookingConfig.bookingFormSlug).toBe('booking-form');
    expect(paths).toContain('/booking-form/:slug');
  });

  it('falls back to the build-time slug when /config.json is unavailable', async () => {
    installFakeFetch(HTTP_NOT_FOUND, {});
    await installAndCollectPaths();

    expect(bookingConfig.bookingFormSlug).toBe('booking-form');
  });
});
