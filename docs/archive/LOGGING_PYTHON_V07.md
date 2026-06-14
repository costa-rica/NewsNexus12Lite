---
created_at: 2026-05-17
updated_at: 2026-05-17
created_by: claude (opus-4.7)
modified_by: claude (opus-4.7)
---

# LOGGING_PYTHON_V07

## Overview

This document defines **concise, production-aligned logging requirements** for Python services using **Loguru** with daily-rotated log files.
It mirrors Node.js behavior while remaining implementation-focused and explicit.

Python services use **`RUN_ENVIRONMENT`**, not `NODE_ENV`.

Valid values:

- `development`
- `testing`
- `production`

---

## Required Environment Variables (Fatal if Missing)

Missing required variables **MUST trigger immediate fatal errors** at startup.
The error **MUST clearly name the missing variable** and exit with a non‑zero code.

| Variable          | Required In         | Fatal Behavior                    |
| ----------------- | ------------------- | --------------------------------- |
| `NAME_APP`        | All environments    | Fatal error if missing or empty   |
| `RUN_ENVIRONMENT` | All environments    | Fatal error if missing or invalid |
| `PATH_TO_LOGS`    | testing, production | Fatal error if missing            |

**Fatal error requirements:**

- Log at `ERROR` or `CRITICAL`
- Write to stderr
- Message MUST explicitly name the missing variable
- Application MUST NOT continue

---

## Logging Modes

### Development

- Output: Terminal only
- Level: `DEBUG` and above
- Files: Disabled

### Testing

- Output: Terminal **and** file
- Level: `INFO` and above
- Files: Enabled with daily + size rotation

### Production

- Output: File only
- Level: `INFO` and above
- Files: Enabled with daily + size rotation

---

## Environment Comparison Table

| Feature                  | Development | Testing | Production |
| ------------------------ | ----------- | ------- | ---------- |
| Terminal Output          | Yes         | Yes     | No         |
| File Output              | No          | Yes     | Yes        |
| Log Level                | DEBUG       | INFO    | INFO       |
| Rotation                 | No          | Yes     | Yes        |
| Process Safe (`enqueue`) | No          | Yes     | Yes        |

---

## Log File Behavior

Files are written using the date-suffixed convention so each day's log is preserved as a historical record and the active file does not grow unbounded.

- **Active file (per day)**: `{NAME_APP}-YYYY-MM-DD.log`
- **Rotated / historical files**: Loguru renames the file in place at rotation time, inserting a timestamp before the `.log` extension. The natural output looks like `{NAME_APP}-YYYY-MM-DD.YYYY-MM-DD_HH-MM-SS_microseconds.log`. Do not try to rewrite this naming — TSM's log reader picks the newest segment by modification time, so the cosmetic suffix does not matter for log retrieval.
- **Directory**: `PATH_TO_LOGS`
- **Date basis**: use the **local timezone** of the host (matches operator expectations when tailing logs).
- **Rotation cadence**:
  - **Daily** — at local midnight, a new dated file is started.
  - **Size** — within a single day, files roll over when they exceed `LOG_MAX_SIZE_IN_MB` (default `3 MB`).
- **Retention**: keep the most recent `LOG_MAX_FILES` files (default `3`); delete older ones.

Example directory contents after several days of activity:

```
MyPythonApp-2026-05-15.log
MyPythonApp-2026-05-16.log
MyPythonApp-2026-05-17.log
MyPythonApp-2026-05-17.2026-05-17_12-56-30_269989.log   (rolled earlier today)
```

### Loguru Configuration

Use **one** file sink with a single `rotation` callable that returns `True` when *either* the local date has advanced past the active file's date *or* the file has reached the configured size limit. Registering two file sinks pointed at the same filename pattern would cause every log record to be written twice, because Loguru sends each record to every matching sink.

```python
import os
from datetime import datetime
from loguru import logger

def make_daily_or_size_rotation(size_mb: int):
    """Rotate on local-midnight rollover OR on size overflow within the day."""
    size_bytes = size_mb * 1024 * 1024

    def should_rotate(message, file):
        # Size check: account for the pending message that is about to be written.
        if file.tell() + len(message) > size_bytes:
            return True
        # Date check: rotate if the record's local date is past the file's local date.
        try:
            file_local_date = datetime.fromtimestamp(os.path.getmtime(file.name)).date()
        except OSError:
            return False
        return message.record["time"].date() > file_local_date

    return should_rotate

logger.add(
    f"{PATH_TO_LOGS}/{NAME_APP}-{{time:YYYY-MM-DD}}.log",
    rotation=make_daily_or_size_rotation(LOG_MAX_SIZE_IN_MB),
    retention=LOG_MAX_FILES,
    enqueue=True,
    backtrace=True,
    diagnose=True,
)
```

---

## Log Formatting Specs

**Development (Console):**

```
HH:MM:SS.mmm | LEVEL | module:function:line | message
```

**Testing / Production (File):**

```
YYYY-MM-DD HH:MM:SS.mmm | LEVEL | module:function:line | message
```

Formatting MUST include:

- Timestamp
- Level
- Code location
- Message

---

## Process Safety Requirements

- Testing and Production MUST enable:
  - `enqueue=True` (thread/process safety)
- No shared file handles between parent and child processes
- Each process initializes its own logger instance

---

## Early Exit Logging (Mandatory)

If the service exits early (startup guardrails, config failures, cron exits):

Required behavior:

1. Log the exit reason
2. Ensure it writes to the active sink (terminal or file)
3. Flush logs before exiting
4. Exit with a non‑zero code if failure-related

Early exits **MUST leave a log record** explaining why the service ran and stopped.

---

## Uncaught Exception Handling (Mandatory)

**Problem:** Systemd services may crash without writing errors to log files, causing silent failures.

**Solution:** Install `sys.excepthook` to catch and log all uncaught exceptions before exit.

Requirements:

- Log at `CRITICAL` with full traceback via `logger.opt(exception=...)`
- Preserve `KeyboardInterrupt` (allow Ctrl+C)
- Enable `backtrace=True` and `diagnose=True` on all sinks

---

## Child Process Rules

- Each child process MUST receive its own `NAME_APP`
- Parent injects child name via `NAME_CHILD_PROCESS_*`
- Parent and child log to separate dated files
- No process may write to another process's log file

---

## Implementation Checklist

- [ ] Install Loguru
- [ ] Centralize logger configuration
- [ ] Validate required env vars at startup
- [ ] Fail fast with explicit fatal errors
- [ ] Configure sinks per `RUN_ENVIRONMENT`
- [ ] Configure a **single** file sink to write `{NAME_APP}-YYYY-MM-DD.log`
- [ ] Pass a custom `rotation` callable that triggers on midnight rollover OR on `LOG_MAX_SIZE_IN_MB` overflow (do **not** register two file sinks for the same pattern — Loguru would write each record twice)
- [ ] Set `retention` from `LOG_MAX_FILES`
- [ ] Enable process safety (`enqueue=True`) where required
- [ ] Install `sys.excepthook` for uncaught exceptions
- [ ] Enable `backtrace=True` and `diagnose=True` on all sinks
- [ ] Verify early-exit logs exist
- [ ] Verify a new active `{NAME_APP}-YYYY-MM-DD.log` is created at local midnight and that within-day size overflow produces a Loguru-renamed sibling such as `{NAME_APP}-YYYY-MM-DD.YYYY-MM-DD_HH-MM-SS_microseconds.log`
