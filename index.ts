import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';

export const bookingPlugin: IPlugin = {
  name: 'booking',
  version: '0.1.0',
  install(sdk: IPlatformSDK) {
    // Routes and components will be registered here
  },
  activate() {},
  deactivate() {},
};
