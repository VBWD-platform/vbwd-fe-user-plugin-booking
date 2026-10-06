/**
 * Shared booking plugin config — resolved at install() time, read by widgets.
 *
 * ``booking_form_slug`` is admin-editable (admin-config.json). fe-admin saves it
 * into the fe-user plugin config the frontend serves at runtime as
 * ``/config.json`` (keyed by plugin name); the build-time config.json is only
 * the fallback.
 */
import { fetchPluginConfigs } from 'vbwd-view-component';
import pluginConfig from '../config.json';

const PLUGIN_NAME = 'booking';
const BUILD_TIME_BOOKING_FORM_SLUG = pluginConfig.booking.booking_form_slug || 'booking-form';

export const bookingConfig = {
  bookingFormSlug: BUILD_TIME_BOOKING_FORM_SLUG,
};

/** Adopt the runtime (admin-saved) settings; keep the build-time ones otherwise. */
export async function loadBookingConfig(): Promise<void> {
  const runtimeConfigs = await fetchPluginConfigs(`${import.meta.env.BASE_URL}config.json`);
  const runtimeSlug = runtimeConfigs[PLUGIN_NAME]?.booking_form_slug;
  bookingConfig.bookingFormSlug =
    typeof runtimeSlug === 'string' && runtimeSlug.trim()
      ? runtimeSlug.trim()
      : BUILD_TIME_BOOKING_FORM_SLUG;
}
