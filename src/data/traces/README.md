# Trace panels

One JSON file per trace panel (the Home hero trace and each industry scenario trace), validated by `traceFile` in `src/content/schemas.ts`. The file name is the trace id that an industry's `scenario.trace` names.

- `provenance` is required. An `illustrative` trace is labelled "Illustrative trace"; a `measured` trace also needs `run`, the path of a committed harness run (`src/data/runs/<run-id>/`).
- Each line is `{ "t": "hh:mm:ss", "op": …, "detail": … }` with an optional `metric: { "value": …, "unit": … }`. Metrics go in `metric`, never inside `detail` (CI check 6).
- Only `*.json` files are loaded; this README is ignored.
