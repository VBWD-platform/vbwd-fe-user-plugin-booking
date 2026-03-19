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
