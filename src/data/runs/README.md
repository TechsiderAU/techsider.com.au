# Harness runs

One directory per committed evaluation-harness run, `src/data/runs/<run-id>/`, holding that run's output files. Phase D commits the first runs.

- A `measured` demo or trace cites its run by path (`"run": "src/data/runs/<run-id>/"`), and the run must contain the metric it is cited for. CI check 6 fails when the directory is missing or empty; the metric-key lookup arrives with the harness's run format in Phase D.
- This folder is not a content collection; nothing here renders directly.
