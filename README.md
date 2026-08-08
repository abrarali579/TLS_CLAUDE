# TimeLink

Self-contained, single-file business management apps. Each app is one HTML file with no build step and no server — open it in a browser and it runs. Data persists locally in IndexedDB.

## Apps

### `TimeLink-Suite.html` — TIME LINK · Business Suite
The main application. Includes:

- **Data Entry** — spreadsheet-style grid with paste support and a rate engine
- **Invoicing** — invoice builder with printable templates
- **Accounts & Cash Book** — transaction ledger with per-account balances
- **Payments** — payment tracking
- **Statements** — generated customer statements
- **Partners** — distributable profit and per-partner entitlement
- **Audit & Sharing** — change history and export

### `TimeLink-App-Phase1.html` — TimeLink Database (Phase 1)
The earlier phase-1 build: companies, transactions, statement generation, and IndexedDB persistence.

## Running

No install required.

```
Open TimeLink-Suite.html in any modern browser.
```

All state lives in the browser's IndexedDB for that file's origin. Use the built-in Data/Backup view to export or restore data.

## Architecture

Both apps follow the same single-file pattern:

- A `switchView()` router activates a view and calls its render function
- A single in-memory store `D` holds application data
- A debounced `save()` writes `D` to IndexedDB
- Each view has a dedicated `render*()` function that rebuilds its DOM

## Repository contents

| Path | Description |
|---|---|
| `TimeLink-Suite.html` | Main business suite app |
| `TimeLink-App-Phase1.html` | Phase 1 database app |
| `graphify-out/GRAPH_REPORT.md` | Code structure analysis — communities, hub functions, cross-module links |
| `graphify-out/graph.json` | Underlying graph data (246 nodes, 429 edges) |

## Notes

The graph report is generated analysis output, not source. It is committed for reference when navigating the two large HTML files.
