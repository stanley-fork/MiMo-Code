---
feature: log-safety
status: in-progress
updated: 2026-07-24
branch: fix/log-safety
commits:
---

# Log Safety

## Report

## [S1] Problem

The CLI main context and TUI worker initialize logging independently but can target the same file. Rotation and cleanup can therefore rename, truncate, or delete a file another context still writes. Log writes also discard asynchronous failures and fatal exits do not flush.

## [S2] File Ownership And Retention

Each logger initialization owns a unique active filename containing the timestamp, process role, PID, and a random instance identifier. Active files are distinguishable from completed and rotated files and are never selected by cleanup. Reinitializing the same module closes its previous stream first.

Writes and rotations execute through one ordered queue. With rotation enabled, queued records that individually fit within the threshold rotate before an active file would exceed 50 MiB. Archived files are reduced to at most 10 and at most 200 MiB in total, and cleanup errors do not interrupt logging. Explicitly disabling rotation continues to permit one active file to exceed 50 MiB.

## [S3] Failure And Shutdown Behavior

Stream failures are consumed by the logger and reported directly to stderr at most once per initialization; they must not create unhandled promise rejections or recursively call the logger. `flush()` waits for queued writes. `shutdown()` flushes, closes the stream, and marks its file completed. CLI fatal exit and TUI worker shutdown await the appropriate operation before termination.

## [S5] Testing Boundaries

Tests use real temporary files and streams. They cover unique ownership across repeated initialization, ordered concurrent writes, size rotation, retention by count and total bytes, active-file preservation, disabled rotation, write failure without unhandled rejection, and flush/shutdown persistence.

## [S6] Out Of Scope

This change does not introduce per-record truncation, modify MCP/ACP/voice logging, add time-based retention, compress archives, change session/database retention, or remove the explicit rotation-disable option.

## Tasks

- [ ] T1: Implement unique active-file ownership and serialized write/rotation/cleanup — acceptance: concurrent contexts cannot target or clean each other's active files, and file/count/total limits hold (covers: S2)
- [ ] T2: Add failure-safe flush and shutdown lifecycle — acceptance: write failures do not reject globally and fatal/worker shutdown paths await pending writes (covers: S3; depends: T1)
- [ ] T3: Add and run focused tests and package typecheck — acceptance: all S5 cases pass from packages/opencode and typecheck succeeds (covers: S5; depends: T1, T2)
