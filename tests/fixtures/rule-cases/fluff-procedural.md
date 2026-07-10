---
name: fluff-procedural
description: Use when you need to run a deployment checklist step by step.
tools: [Bash, Read]
---

Follow these steps in order to deploy the service safely.

1. Run the test suite and confirm all tests pass.
2. Build the release artifact with the build script.
3. Tag the release commit with the version number.
4. Push the tag and trigger the deploy pipeline.

- [ ] Confirm health checks pass after deploy.
- [ ] Confirm error rate stays below baseline for 10 minutes.
- [ ] Notify the on-call channel that the deploy completed.

Run the rollback script immediately if any health check fails.
Verify logs for unexpected errors after each step above.
Check the dashboard for latency regressions before closing the ticket.

```bash
./scripts/deploy.sh --env production
```
