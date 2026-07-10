---
name: alpha-agent-stale
description: A stale cached copy of alpha at 2.0.0 that is NOT the active installed_plugins.json version — must be excluded to prevent duplicate-scan false positives.
tools: [Read]
---

You must never be loaded by plugin-cache source since installed_plugins.json pins alpha@marketplace-a to 1.0.0.
