# vbwd-fe-user-plugin-booking

User-facing booking plugin — browse resources, pick slots, book, manage bookings.

## Structure

```
plugins/booking/
├── index.ts              # bookingPlugin: IPlugin (named export)
├── booking/              # Source code
│   ├── views/
│   ├── stores/
│   ├── components/
│   └── composables/
├── locales/
└── tests/
    ├── unit/
    └── e2e/
```

## Documentation

Full platform documentation lives at **[vbwd.cc/docs](https://vbwd.cc/docs)**.

- [Frontend plugins](https://vbwd.cc/docs-frontend-plugins) — how fe-admin / fe-user plugins are built and mounted
- [Booking](https://vbwd.cc/docs-core-booking) — documentation for this plugin's domain
- [Architecture](https://vbwd.cc/docs-architecture) — platform layering and the core-agnosticism rule
- [Getting started](https://vbwd.cc/docs-getting-started) — install a VBWD instance and enable plugins
