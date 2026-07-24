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

Each logger initialization owns a unique active filename containing the timestamp, process role, PID, and a random instance identifier. Active files are distinguishable from completed and rotated files and are never selected by cleanup. Initialization, writes, rotation, and shutdown share one ordered lifecycle queue, so concurrent initialization closes the prior stream before replacing its state.

With rotation enabled, queued records that individually fit within the threshold rotate before an active file would exceed 50 MiB. Archived files are reduced to at most 10 and at most 200 MiB in total, and cleanup errors do not interrupt logging. A failed archive move uses a copy/remove fallback; if finalization still fails, the file sink closes instead of reopening the same oversized file with a reset counter. Explicitly disabling rotation continues to permit one active file to exceed 50 MiB.

## [S3] Failure And Shutdown Behavior

Stream failures are consumed by the logger and reported directly to stderr at most once per initialization; they must not create unhandled promise rejections or recursively call the logger. `flush()` waits for queued writes. `shutdown()` runs after earlier queued rotations, closes the final stream, and marks its file completed. CLI hard exits use `Log.exit()`, normal TUI exits return through the top-level shutdown, and the TUI worker closes its log before bounded teardown can be terminated by the host.

## [S5] Testing Boundaries

Tests use real temporary files and streams. They cover unique ownership across repeated and concurrent initialization, same-PID worker recovery, ordered concurrent writes, size rotation, shutdown queued behind a rotation, retention by count and total bytes, active-file preservation, disabled rotation, write failure without unhandled rejection, and flush/shutdown persistence. An isolated dev CLI run verifies that a post-initialization command error exits nonzero with no active log and one completed log.

## [S6] Out Of Scope

This change does not introduce per-record truncation, modify MCP/ACP/voice logging, add time-based retention, compress archives, change session/database retention, or remove the explicit rotation-disable option.

## Tasks

- [ ] T1: Implement unique active-file ownership and a serialized lifecycle queue — acceptance: concurrent initialization cannot target, leak, or clean another live active file, and file/count/total limits hold (covers: S2)
- [ ] T2: Add failure-safe flush, shutdown, and command exit lifecycle — acceptance: write/finalization failures do not reject globally or resume unsafe file writes, and CLI/TUI/worker exit paths close pending logs before termination (covers: S3; depends: T1)
- [ ] T3: Add and run focused tests and package typecheck — acceptance: all S5 cases pass from packages/opencode and typecheck succeeds (covers: S5; depends: T1, T2)
