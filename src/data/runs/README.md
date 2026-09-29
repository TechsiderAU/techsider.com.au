# Harness runs

One directory per committed evaluation-harness run, `src/data/runs/<run-id>/`, holding that run's output files. None is committed yet: a run needs the evaluation harness, which isn't built yet and is published only after spec §12 item 4, and the model access and budget of spec §12 item 13.

<!-- ⚑ owner: the ④ sample report must come from a committed harness run before launch (spec §9.1, §12 item 13) -->

- A `measured` demo or trace cites its run by path (`"run": "src/data/runs/<run-id>/"`), and the run must contain the metric it is cited for. CI check 6 fails when the directory is missing or empty; the metric-key lookup arrives with the harness's run format.
- Until a run is committed, the ④ sample report (`src/data/demos/ai-evaluation.json`) is `illustrative`, and SampleReport labels it "Illustrative sample: not a real test run" wherever it renders.
- This folder is not a content collection; nothing here renders directly.
