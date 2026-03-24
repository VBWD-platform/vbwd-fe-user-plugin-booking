/**
 * Shared booking plugin config — set at install() time, read by widgets.
 */
import pluginConfig from '../config.json';

export const bookingConfig = {
  bookingFormSlug: pluginConfig.booking.booking_form_slug || 'booking-form',
};
