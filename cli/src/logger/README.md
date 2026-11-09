# Fack CLI logger

A NestJS-style terminal logger shared by the mock server, commands, and
presentation helpers in `cli/src/ui/terminal.ts`.

```ts
import { Logger, RequestLogger } from "../logger";

const logger = new Logger("DevCommand");
logger.log("Serving mock endpoints", { port: 3001 });
logger.success("Bundle loaded");

const requests = new RequestLogger(logger.child("http"));
requests.log({ method: "GET", path: "/users", status: 200, durationMs: 8 });
// GET /users -> 200 (8ms)
```

## Levels

Levels use NestJS's vocabulary and map to RFC 5424 severities so JSON output
can be consumed by standard log pipelines.

| Method    | Level     | Syslog | Stream |
| --------- | --------- | ------ | ------ |
| `fatal`   | `fatal`   | 2      | stderr |
| `error`   | `error`   | 3      | stderr |
| `warn`    | `warn`    | 4      | stdout |
| `log`     | `log`     | 6      | stdout |
| `debug`   | `debug`   | 7      | stdout |
| `verbose` | `verbose` | 7      | stdout |

`info` aliases `log`; `trace` aliases `verbose`. `success` is a display variant
of `log` used for command feedback.

A record is emitted when its priority is at or above the configured threshold.
Set `level: "silent"` to suppress all output.

## Options

```ts
const logger = new Logger("Sync", {
  level: "debug",
  format: "json",
  colors: false,
  timestamp: false,
  redact: true,
  sink: (record, line, stream) => collect(record, line, stream),
});
```

`Logger` also exposes `configure()`, `setLevel()`, `child()`, `isLevelEnabled()`,
and getters for `format`, `level`, and `theme`.

## Environment

| Variable          | Values                         | Default                     |
| ----------------- | ------------------------------ | --------------------------- |
| `FACK_LOG_LEVEL`  | `fatal` … `verbose`, `silent`  | `LOG_LEVEL`, then `log`     |
| `LOG_LEVEL`       | same aliases                   | `log`                       |
| `FACK_LOG_FORMAT` | `pretty`, `plain`, `json`      | `pretty` on TTY, else plain |
| `NO_COLOR`        | any value                      | colors off                  |
| `FORCE_COLOR`     | any value except `0` / `false` | colors on                   |
| `TERM=dumb`       | —                              | colors off                  |

## Formats

- **pretty** — colored badge, clock time, context, and aligned HTTP columns.
  Used when stdout is a TTY.
- **plain** — timestamped, colorless lines for pipes, CI, and log files.
- **json** — one NDJSON object per record with `time`, `level`, `severity`,
  `context`, `pid`, `message`, and optional `meta`, `request`, and `err`.

Non-diagnostic presentation output (`banner`, `note`, `raw`, `blank`) still
respects JSON mode so machine-readable runs stay parseable.

## Redaction

Messages and metadata are redacted by default:

- Metadata keys such as `authorization`, `token`, `password`, `api_key`,
  `fack_token`, and `cookie`.
- Text patterns for `Bearer …`, `FACK_PROJECT_KEY=…`, `FACK_TOKEN=…`, and
  `--key` / `--token` / `--secret` flags.
- Error messages and causes.

Pass `redact: false` only for trusted, local debugging.
