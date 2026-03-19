import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';

export const bookingPlugin: IPlugin = {
  name: 'booking',
  version: '0.1.0',

  install(sdk: IPlatformSDK) {
    // Register CMS vue-component widgets
    try {
      const { registerCmsVueComponent } = require('../cms/src/registry/vueComponentRegistry');
      Promise.all([
        import('./booking/views/BookingCatalogue.vue'),
      ]).then(([catalogue]) => {
        registerCmsVueComponent('BookingCatalogue', catalogue.default);
      });
    } catch {
      // CMS plugin not installed — skip widget registration
    }

    // Public CMS routes (rendered inside CMS layout)
    sdk.addRoute({
      path: '/booking',
      name: 'booking-catalogue',
      component: () => import('./booking/views/BookingCatalogue.vue'),
      meta: { requiresAuth: false, cmsLayout: true },
    });

    sdk.addRoute({
      path: '/booking/:slug',
      name: 'booking-resource',
      component: () => import('./booking/views/BookingCatalogue.vue'),
      meta: { requiresAuth: false, cmsLayout: true },
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
