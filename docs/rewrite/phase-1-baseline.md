# Phase 1 Rewrite Baseline

Captured on 2026-09-07 from branch `refactor/v2-foundation`, based on `main` commit
`5563ce3eda5ab41dce5a71ec8be2f34b9d5f56bc`.

This document records the legacy behavior that the incremental rewrite must preserve or deliberately migrate. It is a
baseline, not a description of the intended v2 architecture.

## Toolchain

| Tool       | Baseline                                  |
| ---------- | ----------------------------------------- |
| Node.js    | 22.23.2                                   |
| Yarn       | 1.22.22                                   |
| TypeScript | 4.9.3                                     |
| Vite       | 4.4.4 resolved from the existing lockfile |
| React      | 18.2.0                                    |
| Dexie      | 3.2.3                                     |
| Firebase   | 10.4.0                                    |
| Capacitor  | 5.4.1                                     |

The repository now declares Node 20 or newer and Yarn 1.22.22. The production build succeeds with pre-existing
Browserslist, third-party `"use client"`, and large-chunk warnings.

## Local Database

The legacy IndexedDB database is named `BudgetDB4` and declares Dexie schema version 3 in
`src/models/db.ts`.

| Table         | Primary key and indexes                 | Relationship behavior                                                                          |
| ------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `collections` | `++id, collectionType, _id`             | Numeric `id` is local; string `_id` is the portable identifier.                                |
| `sections`    | `++id, collectionId, _id`               | `collectionId` normally references `collection._id`.                                           |
| `items`       | `++id, sectionId, collectionId, status` | Parent fields normally reference string `_id` values. Item `_id` is stored but is not indexed. |

The secondary `firebaseBackup` IndexedDB database has one `backups` table with an auto-incrementing `id`. It does not
provide a versioned restore workflow.

### Collection Shape

The legacy collection interface permits:

- Numeric `id` and string `_id`.
- `collectionType`: observed values are `budget`, `general`, and `quick`.
- `title`, `dateCreated`, `comment`, `tag`, `sorted`, `archived`, `isTemplate`, `sections`, and `allTags`.
- `tag` and `allTags` are currently untyped.

### Section Shape

The legacy section interface permits:

- Numeric `id`, string `_id`, and string `collectionId`.
- `title`, `comment`, `commentVisible`, `tag`, `archived`, and `createdAt`.
- Budget fields: `locked`, `amount`, and `showLockedAmount`.
- List behavior: `numberedList`, `checkListMode`, `hideFinished`, `reverseOrder`, `sortBy`, and `customOrder`.
- `checkListMode`: observed values are `check`, `tag`, and `none`.
- `sortBy`: observed values are empty, `progress`, `status`, and `tag`.
- `customOrder` stores numeric local item IDs rather than portable item `_id` values.

### Item Shape

The legacy item interface permits:

- Numeric `id`, string `_id`, string `sectionId`, and optional string `collectionId`.
- Shared content: `title`, `date`, `comment`, `commentVisible`, and nested `subItems`.
- Budget fields: `amount`, `isIncome`, untyped `multiplier`, and `multiplierMode` values `list`, `x`, or `none`.
- General-task fields: `status`, untyped `tags`, `progress`, `sublistMode`, and `timerSettings`.
- Observed statuses: `none`, `done`, `active`, `started`, `paused`, `nah`, and `do now!`.
- Observed progress types: `parts`, `chapters`, `levels`, `episodes`, and `seasons`.
- `checklistItems` contain `text`, optional `checked`, optional `amount`, and an observed but currently omitted-from-model
  `createdAt` date string.
- `timerSettings.date` is declared as a native `Date`; `timerSettings.isCompleted` is a boolean.

Characterization fixtures covering these values live in `src/test/fixtures/legacyData.ts`.

## Legacy Firestore Shape

Manual sync stores data below the authenticated user's document:

```text
users/{uid}
└── collections/{collection._id}
    ├── collection fields
    └── sections[]
        ├── section fields
        └── items[]
            └── item fields
```

Sections and items are nested arrays, not Firestore subcollections. Upload removes numeric collection and section IDs,
but currently leaves numeric item IDs and section `customOrder` values in the document. Writes use top-level merge
semantics, so replacing `sections` replaces the complete nested array.

Download flattens the nested arrays and calls `resetDatabase`, which clears all three local tables before adding the
remote records. Numeric item IDs are removed and regenerated, but `customOrder` remains unchanged. The executable
characterization test confirms that the regenerated IDs no longer match the stored order IDs.

Other verified sync constraints:

- Sync is manual upload/download rather than automatic reconciliation.
- No per-record revision, durable outbox, conflict detection, or deletion protocol exists.
- Dates may cross the cloud boundary as strings or Firestore timestamp-like values without explicit hydration.
- Authentication identity is read from `localStorage` by sync functions.
- No Firestore rules or emulator configuration is versioned in this repository.

The old Firestore namespace must remain untouched during v2 development. Future extraction should read this nested
shape and pass it through a versioned adapter rather than reusing the destructive download path.

## Legacy Export Contract

`src/data/legacy/exportLegacyData.ts` reads all three `BudgetDB4` tables in one read-only transaction and returns:

- Format name `vite-budget-legacy-export`.
- Format version 1.
- Export timestamp and source database/schema metadata.
- Collection, section, and item counts.
- JSON-safe table snapshots ordered by numeric local ID.
- Recursive ISO conversion for native dates.
- A SHA-256 checksum over canonical source metadata, counts, and data. The export timestamp is excluded so the same
  database content has the same checksum across exports.

The exporter preserves numeric local IDs because they are required to diagnose and repair legacy `customOrder`
relationships. It does not write to either legacy database. No user-facing download control exists yet.

## Web and PWA Baseline

The production preview passed a browser smoke test:

- The root route rendered without page or console errors.
- `/manifest.webmanifest` returned HTTP 200.
- A service worker registered for the application origin.

Known baseline problems:

- HTML title and generated manifest identity still use Vite starter text.
- The generated manifest references eight `assets/icons/icon-{size}x{size}.png` files, none of which exist in the build.
- The repository instead contains seven `icon-{size}.webp` files, while the separate public manifest declares them as
  `image/png`.
- PWA configuration caches all files through `**/*` patterns rather than an intentional update/cache policy.
- The initial accessibility snapshot exposes an unlabeled icon button and empty list items.
- The main JavaScript chunk is approximately 1.01 MB before gzip, and background images range from approximately
  440 KB to 1.62 MB.

## Android Baseline

Capacitor identifies the app as `Summit` with app ID `com.summit.app`, web directory `dist`, Google authentication,
and splash-screen configuration.

Android could not be built in this phase:

- The `android/` directory is ignored and absent from the workspace.
- Capacitor lists no installed native platform project.
- Java is unavailable on `PATH`.
- `ANDROID_HOME` and `ANDROID_SDK_ROOT` are unset.
- Installed Capacitor packages are 5.4.1; Capacitor Doctor reported 8.5.1 as current on the capture date.

The Android project should be regenerated only after the coordinated Capacitor upgrade. Native configuration and
Google service files must be recovered or recreated at that point. Capacitor telemetry is explicitly disabled on this
machine.

## Phase 1 Quality Gates

The baseline commands are:

```text
yarn format:check
yarn lint
yarn typecheck
yarn test
yarn build
```

The legacy source currently reports 188 lint warnings and zero lint errors. New Phase 1 modules and tests have zero
lint findings. Five characterization/export tests pass under Vitest with jsdom and fake IndexedDB.
