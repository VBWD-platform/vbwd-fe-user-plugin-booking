import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { bookingConfig } from './booking/bookingConfig';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import zh from './locales/zh.json';

export const bookingPlugin: IPlugin = {
  name: 'booking',
  version: '0.1.0',

  install(sdk: IPlatformSDK) {
    // Translations
    sdk.addTranslations('en', en);
    sdk.addTranslations('de', de);
    sdk.addTranslations('es', es);
    sdk.addTranslations('fr', fr);
    sdk.addTranslations('ja', ja);
    sdk.addTranslations('ru', ru);
    sdk.addTranslations('th', th);
    sdk.addTranslations('zh', zh);

    // Register booking confirmation details into checkout confirmation page
    import('../../vue/src/registries/checkoutConfirmationRegistry')
      .then(({ checkoutConfirmationRegistry }) => {
        import('./booking/components/BookingConfirmationDetails.vue').then((module) => {
          checkoutConfirmationRegistry.register('booking', module.default);
        });
      })
      .catch(() => {
        // Registry not available — skip
      });

    // Register CMS vue-component widgets
    import('../cms/src/registry/vueComponentRegistry')
      .then(({ registerCmsVueComponent }) => {
        Promise.all([
          import('./booking/views/BookingCatalogue.vue'),
          import('./booking/views/BookingResourceDetail.vue'),
          import('./booking/views/BookingForm.vue'),
          import('./booking/views/BookingSuccess.vue'),
          import('./booking/views/BookingCancel.vue'),
        ]).then(([catalogue, detail, form, success, cancel]) => {
          registerCmsVueComponent('BookingCatalogue', catalogue.default);
          registerCmsVueComponent('BookingResourceDetail', detail.default);
          registerCmsVueComponent('BookingForm', form.default);
          registerCmsVueComponent('BookingSuccess', success.default);
          registerCmsVueComponent('BookingCancel', cancel.default);
        });
      })
      .catch(() => {
        // CMS plugin not installed — skip widget registration
      });

    // Public CMS routes — rendered via CmsPage.vue which resolves the layout + widgets
    sdk.addRoute({
      path: '/booking',
      name: 'booking-catalogue',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: 'booking' },
      meta: { requiresAuth: false, cmsLayout: true },
    });

    sdk.addRoute({
      path: '/booking/:slug',
      name: 'booking-resource',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: 'booking-resource-detail' },
      meta: { requiresAuth: false, cmsLayout: true },
    });

    // Booking form — CMS page with configurable slug
    const formSlug = bookingConfig.bookingFormSlug;
    sdk.addRoute({
      path: `/${formSlug}/:slug`,
      name: 'booking-form',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: formSlug },
      meta: { requiresAuth: false, cmsLayout: true },
    });

    // Booking payment page (standalone, no dashboard layout — same as checkout plugin)
    sdk.addRoute({
      path: '/booking/:slug/book/pay',
      name: 'booking-checkout',
      component: () => import('./booking/views/BookingCheckout.vue'),
      meta: { requiresAuth: false, noLayout: true },
    });

    // Dashboard routes (auth required)
    sdk.addRoute({
      path: '/dashboard/bookings',
      name: 'my-bookings',
      component: () => import('./booking/views/MyBookings.vue'),
      meta: { requiresAuth: true },
    });
  },

  activate() {},
  deactivate() {},
};
