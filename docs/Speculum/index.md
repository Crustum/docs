# CakePHP Speculum Plugin

<a name="introduction"></a>
## Introduction

[CakePHP Speculum](https://github.com/Crustum/speculum) makes a wonderful companion to your local CakePHP development environment. Speculum provides insight into the requests coming into your application, exceptions, log entries, database queries, queued jobs, mail, notifications, cache operations, scheduled tasks, broadcasts, and more.

Speculum provides insight into requests, exceptions, log entries, database queries, queued jobs, mail, notifications, cache operations, scheduled tasks, broadcasts, BlazeCast WebSocket traffic, variable dumps, and more. It is adapted to CakePHP events, queue, mail, and related Crustum plugins.


<a name="installation"></a>
## Installation

### Installing the Plugin

Install via Composer (`crustum/mcp` is a hard dependency):

```bash
composer require crustum/speculum
```

Load **both** Speculum and Mcp. Speculum does not auto-load Mcp; MCP tools need the Mcp plugin loaded.

```bash
bin/cake plugin load Crustum/Mcp
bin/cake plugin load Crustum/Speculum
```

> [!NOTE]
> Register both plugins in `config/plugins.php` (or `Application::bootstrap()`). Mcp must be loaded before `bin/cake speculum mcp` / agent tool calls will work.

> [!TIP]
> **After the plugins are loaded**, install assets with PluginManifest. Speculum declares `Crustum/Mcp` as a required manifest dependency — use `--with-dependencies` so Mcp config/bootstrap are installed too:

```bash
bin/cake manifest install --plugin Crustum/Speculum --with-dependencies
```

That publishes Speculum's `config/speculum.php`, migrations, bootstrap append, and the built SPA under `webroot/speculum` (from the package `webroot/frontend` build), and installs Mcp's declared assets (`config/mcp.php` + bootstrap load). Use `--all-deps` to skip optional-dependency prompts, or `--no-dependencies` if Mcp assets are already installed. After upgrading Speculum, re-run the install with `--force` (or the webroot tag alone) so the copied SPA matches the new package build.

```bash
bin/cake manifest install --plugin Crustum/Speculum --tag webroot --force
```

The dashboard then loads `/speculum/app.js` with the default `Speculum.assets.path` of `speculum`. That path is the simple install for Speculum **without** host-composed extension panels.

If you prefer Cake’s plugin asset link instead of copying, symlink the plugin webroot and point assets at the Cake layout:

```bash
bin/cake plugin assets symlink Crustum/Speculum
```

```php
'assets' => [
    'path' => 'crustum/speculum/frontend',
],
```

That serves `/crustum/speculum/frontend/app.js`. Symlink does not compose third-party Vue panels into the bundle; for those hosts use the [host SPA build](#custom-plugins-and-panels) (`resources/host-spa` → `{APP}/resources/speculum`, `npm run build`) which also writes `webroot/speculum` and keeps the default assets path.

Or build Vite output elsewhere and point Speculum at it:

```php
// config/speculum.php
'assets' => [
    'path' => 'my-build/speculum', // URL under host webroot → /my-build/speculum/app.js
    'dir' => ROOT . DS . 'webroot' . DS . 'my-build' . DS . 'speculum', // optional disk override
],
```

The layout links `styles.css`, `app.css`, and `app.js` from that folder.

Alternatively, you can load the plugins in your `Application.php`:

```php
// In src/Application.php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/Mcp');
    $this->addPlugin('Crustum/Speculum');
}
```

After installing via the manifest (or copying config/migrations manually), run migrations to create the tables needed to store Speculum's data:

```bash
bin/cake migrations migrate
```

Finally, you may access the Speculum dashboard via the `/speculum` route.

<a name="local-only-installation"></a>
### Local Only Installation

If you plan to only use Speculum to assist your local development, install it as a development dependency:

```bash
composer require crustum/speculum --dev

bin/cake plugin load Crustum/Mcp
bin/cake plugin load Crustum/Speculum
bin/cake manifest install --plugin Crustum/Speculum --with-dependencies
bin/cake migrations migrate
```

Then register the plugins only in non-production environments, for example in `config/plugins.php` or `Application::bootstrap()`:

```php
if (Configure::read('debug')) {
    $this->addPlugin('Crustum/Mcp');
    $this->addPlugin('Crustum/Speculum');
}
```

<a name="configuration"></a>
### Configuration

After installing via the manifest, Speculum's primary configuration file is located at `config/speculum.php`. This configuration file allows you to configure your [watcher options](#available-watchers). Each configuration option includes a description of its purpose, so be sure to thoroughly explore this file.

If desired, you may enable Speculum's data collection using the `enabled` configuration option (defaults to **off** — set `SPECULUM_ENABLED=true` for local/dev):

```php
'enabled' => filter_var(env('SPECULUM_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
```

All of your application's Speculum configuration is stored under the `Speculum` Configure key:

```php
return [
    'Speculum' => [
        'enabled' => filter_var(env('SPECULUM_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
        'path' => env('SPECULUM_PATH', 'speculum'),
        'driver' => env('SPECULUM_DRIVER', 'database'),
        'storage' => [
            'database' => [
                'connection' => env('SPECULUM_DB_CONNECTION', 'default'),
                'chunk' => (int)env('SPECULUM_CHUNK', 1000),
            ],
        ],
        'ignore_paths' => [
            '.well-known*',
            'debug-kit*',
            'debug_kit*',
            'monitor*',
            'rhythm*',
        ],
        'ignore_commands' => [
            'migrations',
            'queue',
            'queue worker',
            'queue run',
            'rhythm',
            'rhythm check',
            // ...
        ],
        'watchers' => [
            // ...
        ],
    ],
];
```

Third-party noise (DebugKit, Rhythm, Monitor, BlazeCast cache keys, and similar) belongs in these config lists / watcher options — not hardcoded in PHP classes. Speculum’s own UI/API paths, `speculum_*` tables, and Speculum pause-cache keys stay ignored in code.

<a name="data-pruning"></a>
### Data Pruning

Without pruning, the `speculum_entries` table can accumulate records very quickly. To mitigate this, you should schedule the `speculum prune` console command to run daily (for example with [Crustum Scheduling](https://github.com/Crustum/cakephp-scheduling)):

```php
use Crustum\Scheduling\Schedule;

$schedule->command('speculum prune')->daily();
```

By default, all entries older than 24 hours will be pruned. You may use the `hours` option when calling the command to determine how long to retain Speculum data. For example, the following command will delete all records created over 48 hours ago:

```bash
bin/cake speculum prune --hours=48
```

You may keep exception entries while pruning other data:

```bash
bin/cake speculum prune --hours=48 --keep-exceptions
```

<a name="dashboard-authorization"></a>
### Dashboard Authorization

**Not part of this plugin.** Who may open `/telescope` is decided by the host application (Authentication / Authorization middleware, admin roles, IP allowlists, or loading the plugin only when `debug` is true).

Speculum does **not** ship a dedicated dashboard authorization gate middleware. Soft host Authentication/Authorization middleware applies normally when the host enables it.


> [!WARNING]
> Ensure Speculum is not publicly reachable in production. Prefer loading the plugin only in local/debug environments, or protect `/telescope` (and `/speculum/api`) with your app's own middleware.

`Speculum::auth($user)` is unrelated: it attaches the current identity to **recorded entries** (tags like `Auth:{id}` and the Authenticated User card), not dashboard login.

<a name="filtering"></a>
## Filtering

<a name="filtering-entries"></a>
### Entries

You may filter the data that is recorded by Speculum via the `filter` closure. Register it early in your application bootstrap (for example in `Application::bootstrap()` after the plugin is loaded). By default, without a filter, Speculum records all data when enabled. A typical production filter keeps exceptions, failed jobs, scheduled tasks, slow queries, slow jobs, and entries with monitored tags:

```php
use Cake\Core\Configure;
use Crustum\Speculum\Entry\IncomingEntry;
use Crustum\Speculum\Speculum;

Speculum::filter(function (IncomingEntry $entry) {
    if (Configure::read('debug')) {
        return true;
    }

    return $entry->isException() ||
        $entry->isFailedJob() ||
        $entry->isScheduledTask() ||
        $entry->isSlowQuery() ||
        $entry->isSlowJob() ||
        $entry->isSlowRequest() ||
        $entry->isSlowCommand() ||
        $entry->hasMonitoredTag(Speculum::getRepository());
});
```

> [!NOTE]
> `IncomingEntry::hasMonitoredTag()` requires the entries repository. Pass `Speculum::getRepository()`. The Monitoring UI alone does not change recording — monitored tags only matter when a filter uses `hasMonitoredTag()`.


<a name="filtering-batches"></a>
### Batches

While the `filter` closure filters data for individual entries, you may use the `filterBatch` method to register a closure that filters all data for a given request or console command. If the closure returns `true`, all of the entries are recorded by Speculum. The callback receives the queued entries as a PHP array:

```php
use Cake\Core\Configure;
use Crustum\Speculum\Entry\IncomingEntry;
use Crustum\Speculum\Speculum;

Speculum::filterBatch(function (array $entries) {
    if (Configure::read('debug')) {
        return true;
    }

    foreach ($entries as $entry) {
        if (
            $entry->isException() ||
            $entry->isFailedJob() ||
            $entry->isScheduledTask() ||
            $entry->isSlowQuery() ||
            $entry->isSlowJob() ||
            $entry->isSlowRequest() ||
            $entry->isSlowCommand() ||
            $entry->hasMonitoredTag(Speculum::getRepository())
        ) {
            return true;
        }
    }

    return false;
});
```

<a name="filtering-paths-and-commands"></a>
### Paths and Commands

Before a request or console command starts recording, Speculum consults top-level config (not per-watcher options):

| Key | Purpose |
|-----|---------|
| `ignore_paths` | fnmatch patterns against the HTTP path (leading `/` stripped). Defaults include DebugKit, Monitor, and Rhythm. Speculum’s own `path` / API routes are always ignored in code. |
| `only_paths` | When non-empty, **only** matching paths are recorded (everything else is ignored). |
| `ignore_commands` | Exact Cake command names or first-token prefixes (`queue`, `rhythm`, `migrations`, …). Also used so long-lived workers do not open a recording window for the worker process itself. |

```php
'ignore_paths' => [
    'debug-kit*',
    'debug_kit*',
    'monitor*',
    'rhythm*',
],
'ignore_commands' => [
    'queue',
    'queue worker',
    'queue run',
    'rhythm',
    'rhythm check',
],
```

Prefer one broad mask (`rhythm*`) over several overlapping ones (`rhythm-*`, `rhythm/*`).

<a name="tagging"></a>
## Tagging

Speculum allows you to search entries by "tag". Often, tags are model class names or authenticated user IDs which Speculum automatically adds to entries. Occasionally, you may want to attach your own custom tags to entries. To accomplish this, you may use the `Speculum::tag` method. The `tag` method accepts a closure which should return an array of tags. The tags returned by the closure will be merged with any tags Speculum would automatically attach to the entry:

```php
use Crustum\Speculum\Enum\EntryType;
use Crustum\Speculum\Entry\IncomingEntry;
use Crustum\Speculum\Speculum;

Speculum::tag(function (IncomingEntry $entry) {
    return $entry->type === EntryType::Request->value
        ? ['status:' . ($entry->content['response_status'] ?? '')]
        : [];
});
```

<a name="available-watchers"></a>
## Available Watchers

Speculum "watchers" gather application data when a request or console command is executed. You may customize the list of watchers that you would like to enable within your `config/speculum.php` configuration file:

```php
'watchers' => [
    Crustum\Speculum\Watcher\CacheWatcher::class => true,
    Crustum\Speculum\Watcher\CommandWatcher::class => true,
    // ...
],
```

Some watchers also allow you to provide additional customization options:

```php
'watchers' => [
    Crustum\Speculum\Watcher\QueryWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_QUERY_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'slow' => (float)env('SPECULUM_QUERY_SLOW', 100), // milliseconds
        'ignore_connections' => ['debug_kit'],
    ],
    // ...
],
```

A watcher that is missing from `watchers`, set to `false`, or has `enabled => false` does not register and is **omitted from the dashboard sidebar**. Soft features (Mongo, BlazeCast, …) also require their host dependency; for nav, Speculum checks `WatcherRegistry::isSoftAvailable($feature, WatcherClass::class)` so an unset soft watcher stays hidden even when the extension/plugin is loaded.

<a name="batch-watcher"></a>
### Batch Watcher

The batch watcher records information about queued [batches](https://github.com/Crustum/batch-queue) when `BatchQueue.BatchStarted` / `BatchQueue.BatchFinished` fire. Requires `crustum/batch-queue`.

<a name="blazecast-watcher"></a>
### BlazeCast Watcher

The BlazeCast watcher records WebSocket fan-out deliveries (`bc_delivery`) and inbound client messages (`bc_message`) when BlazeCast events fire. Requires `crustum/blazecast`. You may disable either stream independently:

```php
'watchers' => [
    Crustum\Speculum\Watcher\BlazeCastWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_BLAZECAST_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'deliveries' => filter_var(env('SPECULUM_BLAZECAST_DELIVERIES', true), FILTER_VALIDATE_BOOLEAN),
        'messages' => filter_var(env('SPECULUM_BLAZECAST_MESSAGES', true), FILTER_VALIDATE_BOOLEAN),
    ],
    // ...
],
```

Long-running BlazeCast servers should flush Speculum on an interval (see BlazeCast `speculum_ingest_interval` / `BLAZECAST_SPECULUM_INGEST_INTERVAL`) so queued entries are stored.

<a name="broadcast-watcher"></a>
### Broadcast Watcher

The broadcast watcher records broadcast activity when `Broadcasting.sent` fires. Requires `crustum/broadcasting`.

<a name="cache-watcher"></a>
### Cache Watcher

The cache watcher records data when a cache key is hit, missed, updated, or forgotten. With `ignore_framework` enabled (default), Cake core/model/routes/translations keys and session cache keys (`session_*`) are skipped so Auth session blobs are not stored. Speculum’s own pause-recording keys are always skipped in code. Third-party keys (Rhythm, BlazeCast, and similar) belong in the watcher’s `ignore` option (fnmatch); one `rhythm*` mask covers `rhythm-…` and `rhythm-widget-…` keys. Use `hidden` for exact keys whose values should be stored as `(REDACTED)` while the hit/miss/set is still recorded.

```php
'watchers' => [
    Crustum\Speculum\Watcher\CacheWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_CACHE_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'hidden' => [],
        'ignore_framework' => true,
        'ignore' => [
            'cake_blazecast:*',
            'rhythm*',
        ],
    ],
    // ...
],
```

<a name="command-watcher"></a>
### Command Watcher

The command watcher records the arguments, options, exit code, and duration whenever a CakePHP console command is executed. Commands slower than 1000 milliseconds are tagged `slow`. Customize with the watcher's `slow` option (milliseconds). Exclude individual commands from this watcher with `ignore` (fnmatch). To prevent Speculum from opening a recording window for an entire CLI process (for example `queue worker`), use top-level [`ignore_commands`](#filtering-paths-and-commands) instead.

```php
'watchers' => [
    Crustum\Speculum\Watcher\CommandWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_COMMAND_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'ignore' => ['cache clear'],
        'slow' => (float)env('SPECULUM_COMMAND_SLOW', 1000),
    ],
    // ...
],
```

<a name="event-watcher"></a>
### Event Watcher

The event watcher records the payload and broadcast flag for application events. Configure exact event names and/or fnmatch masks in `events` (for example `App.Order.*`, `Model.*`, or `*`). Empty `events` records nothing. Framework noise is filtered by default; use `Speculum::recordFrameworkEvents()` and/or the `ignore` option to adjust.

```php
'watchers' => [
    Crustum\Speculum\Watcher\EventWatcher::class => [
        'enabled' => true,
        'events' => [
            'App.Order.*',
            '*',
        ],
        'ignore' => ['App.Noisy.*'],
    ],
],
```

> [!NOTE]
> Masks such as `Model.*` or `*` require Speculum's recording EventManager (installed automatically). With `*` and default framework filtering, only non-framework application events are kept unless you call `Speculum::recordFrameworkEvents()`.


<a name="exception-watcher"></a>
### Exception Watcher

The exception watcher records the data and stack trace for exceptions that are thrown by your application.

<a name="http-client-watcher"></a>
### HTTP Client Watcher

The HTTP client watcher (`HttpClientWatcher`) records outgoing HTTP client requests made by your application via CakePHP's `HttpClient` events (`HttpClient.beforeSend` / `HttpClient.afterSend`). You may ignore hosts via `ignore_hosts` (fnmatch). Response body storage is capped with `size_limit` (kilobytes, default `64`):

```php
'watchers' => [
    Crustum\Speculum\Watcher\HttpClientWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_HTTP_CLIENT_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'ignore_hosts' => ['example.com'],
        'size_limit' => 64,
    ],
    // ...
],
```

<a name="job-watcher"></a>
### Job Watcher

The job watcher records the data and status of any [queued jobs](https://github.com/cakephp/queue) dispatched by your application using the CakePHP Queue plugin, including how long each job took to run. Jobs slower than 1000 milliseconds are tagged `slow` (and `content.slow`). Customize with the watcher's `slow` option (milliseconds):

```php
'watchers' => [
    Crustum\Speculum\Watcher\Queue\JobWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_JOB_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'slow' => (float)env('SPECULUM_JOB_SLOW', 1000),
    ],
    // ...
],
```

While a queue worker is processing jobs, Speculum buffers related entries in memory and persists them when `Speculum.queue.worker_flush_interval` seconds have elapsed since the flush window started (default `1`, or env `SPECULUM_WORKER_FLUSH_INTERVAL`) or when pending entries plus updates reach `Speculum.queue.worker_flush_limit` (default `2000`, or env `SPECULUM_WORKER_FLUSH_LIMIT`), whichever comes first. Set the interval to `0` to store after every job. Process exit, `Command.afterExecute`, and HTTP terminate still force an immediate store.

When [crustum/cakephp-queue](https://github.com/Crustum/cakephp-queue) is installed and loaded (`Crustum/Queue`), Speculum also records jobs on produce via `Crustum/Queue.Job.pushed` (same Jobs UI / request-command buffer; no mid-request flush). Consume still uses `Processor.message.*` and links by `_uniqueId` when present.

`cakephp/queue` is a **suggested** dependency (not required). Install it for JobWatcher consume recording and/or Speculum’s own pending-update transport.

### Speculum pending-update transport

When `Speculum::store()` cannot apply some entry updates, Speculum queues a retry job (delay default `10` seconds, max 3 attempts). Transport is selected via `Speculum.queue.transport` / `SPECULUM_QUEUE_TRANSPORT`:

| Value | Backend |
|-------|---------|
| `auto` (default) | cakephp/queue → Dereuromark → Queuesadilla |
| `cakephp` | `Cake\Queue\QueueManager` |
| `dereuromark` | `Queue.QueuedJobs::createJob` (`Crustum/Speculum.ProcessPendingUpdates`) |
| `queuesadilla` | `Josegonzalez\CakeQueuesadilla\Queue\Queue::push` |

Own jobs live under `src/Queue/Job/` (cakephp + Queuesadilla) and `src/Queue/Task/` (Dereuromark).

<a name="queuesadilla-job-watcher"></a>
### Queuesadilla Job Watcher

When [josegonzalez/cakephp-queuesadilla](https://github.com/cakedc/cakephp-queuesadilla) is installed and loaded, Speculum also records Queuesadilla jobs in the same **Jobs** UI, including duration when available. Uses the same `slow` threshold (milliseconds) via `SPECULUM_JOB_SLOW` (default `1000`):

```php
'watchers' => [
    Crustum\Speculum\Watcher\Queue\QueuesadillaJobWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_QUEUESADILLA_JOB_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'slow' => (float)env('SPECULUM_JOB_SLOW', 1000),
    ],
    // ...
],
```

<a name="dereuromark-job-watcher"></a>
### Dereuromark Job Watcher

When [dereuromark/cakephp-queue](https://github.com/dereuromark/cakephp-queue) is installed, Speculum records its jobs in the same **Jobs** UI via `Queue.Job.created|started|completed|failed`. Uses the same `slow` threshold (milliseconds) via `SPECULUM_JOB_SLOW` (default `1000`):

```php
'watchers' => [
    Crustum\Speculum\Watcher\Queue\DereuromarkJobWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_DEREUROMARK_JOB_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'slow' => (float)env('SPECULUM_JOB_SLOW', 1000),
    ],
    // ...
],
```

Produce (`Queue.Job.created`) stays in the request/command Speculum buffer until that scope stores. Consume uses `WorkerFlushPolicy` around started → completed/failed.

<a name="log-watcher"></a>
### Log Watcher

The log watcher records log data written by your application (Cake `Log::write` / PSR-3 context).

By default, Speculum records logs at the `error` level and above, and includes messages from every CakePHP log scope as well as unscoped messages. You may change the minimum level and optionally limit which scopes are recorded in `config/speculum.php`:

```php
'watchers' => [
    Crustum\Speculum\Watcher\LogWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_LOG_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'level' => env('SPECULUM_LOG_LEVEL', 'error'), // minimum: debug|info|notice|warning|error|…
        'scopes' => null, // null = all Cake scopes; [] = unscoped only; ['payment', 'socket.server'] = list
        'include_unscoped' => true, // when scopes is a list: also keep messages with empty scope
    ],
    // ...
],
```

Cake’s own log engines often use `scopes => null` (unscoped only). Speculum’s engine always listens with Cake `scopes => []` (all), then applies the watcher `scopes` / `include_unscoped` filter above so you can keep unscoped **and** named scopes together.

<a name="mail-watcher"></a>
### Mail Watcher

The mail watcher allows you to view an in-browser preview of emails sent by your application along with their associated data. You may also download the email as an `.eml` file.

CakePHP Mailer does not dispatch send events by default, so Speculum wraps configured transports with `SpeculumTransport` when the mail watcher is enabled.

<a name="model-watcher"></a>
### Model Watcher

The model watcher records model changes whenever CakePHP model events are dispatched. You may specify which model events should be recorded via the watcher's `events` option:

```php
'watchers' => [
    Crustum\Speculum\Watcher\ModelWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_MODEL_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'events' => ['Model.afterSave', 'Model.afterDelete'],
    ],
    // ...
],
```

If you would like to record the number of models hydrated during a given request, enable the `hydrations` option:

```php
'watchers' => [
    Crustum\Speculum\Watcher\ModelWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_MODEL_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'events' => ['Model.afterSave', 'Model.afterDelete'],
        'hydrations' => true,
    ],
    // ...
],
```

Skip third-party ORM traffic with `ignore_connections` (Cake connection names) and `ignore_namespaces` (entity class prefixes). Speculum’s own `speculum_*` tables are always skipped in code:

```php
'watchers' => [
    Crustum\Speculum\Watcher\ModelWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_MODEL_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'events' => ['Model.afterSave', 'Model.afterDelete'],
        'hydrations' => true,
        'ignore_connections' => [
            'debug_kit',
        ],
        'ignore_namespaces' => [
            'DebugKit\\',
        ],
    ],
    // ...
],
```

When recording created/updated models, Speculum stores dirty attribute changes. By default, keys matching `*password*`, `*token*`, `*secret*`, `*api_key*`, `*apikey*` are replaced with `(REDACTED)`. Entity `$_hidden` is **not** used (it controls JSON serialization, not security). Hide additional secrets explicitly:

```php
use Crustum\Speculum\Speculum;

Speculum::hideModelAttributes([
    'remember_token',
]);
```

<a name="mongo-watcher"></a>
### Mongo Watcher

When PHP `ext-mongodb` is loaded, Speculum records MongoDB commands via the driver’s public `CommandSubscriber` APM (same idea as the SQL query watcher). Soft-enabled with `extension_loaded('mongodb')` — no CakeDC Mongo dependency. The optional `crustum/speculum-mongo` package remains a demo of Speculum extension panels; prefer this first-party soft watcher for production.

```php
'watchers' => [
    Crustum\Speculum\Watcher\MongoWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_MONGO_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'slow' => (float)env('SPECULUM_MONGO_SLOW', 100), // milliseconds
        'ignore_commands' => [
            'hello',
            'ismaster',
            'isMaster',
            'ping',
            'endSessions',
            'buildInfo',
            'saslStart',
            'saslContinue',
            'getMore',
        ],
    ],
    // ...
],
```

<a name="notification-watcher"></a>
### Notification Watcher

The notification watcher records notifications sent by your application when `Model.Notification.sent` fires. Requires `crustum/notification`. If the notification triggers an email and you have the mail watcher enabled, the email will also be available for preview on the mail watcher screen.

<a name="query-watcher"></a>
### Query Watcher

The query watcher records the raw SQL, bindings, and execution time for all queries that are executed by your application. The watcher also tags any queries slower than 100 milliseconds as `slow`. You may customize the slow query threshold using the watcher's `slow` option (milliseconds).

SQL that targets Speculum storage tables (`speculum_*`) is always skipped in code. Skip other connections via `ignore_connections` (for example DebugKit’s `debug_kit` connection):

```php
'watchers' => [
    Crustum\Speculum\Watcher\QueryWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_QUERY_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'ignore_connections' => [
            'debug_kit',
        ],
        'slow' => (float)env('SPECULUM_QUERY_SLOW', 100),
    ],
    // ...
],
```

<a name="request-watcher"></a>
### Request Watcher

The request watcher records the request, headers, session, response data, and duration associated with any requests handled by the application. Requests slower than 1000 milliseconds are tagged `slow`. You may limit recorded response data via `size_limit` (kilobytes), skip methods with `ignore_http_methods`, skip status codes with `ignore_status_codes`, and customize the slow threshold (milliseconds):

```php
'watchers' => [
    Crustum\Speculum\Watcher\RequestWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_REQUEST_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'size_limit' => (int)env('SPECULUM_RESPONSE_SIZE_LIMIT', 64),
        'ignore_http_methods' => [],
        'ignore_status_codes' => [],
        'slow' => (float)env('SPECULUM_REQUEST_SLOW', 1000),
    ],
    // ...
],
```

HTTP paths that should never open a recording window (DebugKit, Rhythm, Monitor, …) are configured under top-level [`ignore_paths`](#filtering-paths-and-commands), not on this watcher.

<a name="schedule-watcher"></a>
### Schedule Watcher

The schedule watcher records the command and output of scheduled tasks when `Scheduling.ScheduledTaskFinished` (and related events) fire. Requires `crustum/cakephp-scheduling`.

<a name="vardump-watcher"></a>
### VarDump Watcher

The VarDump watcher records Symfony `dump()` / `Speculum::varDump()` values into Speculum **without printing them** to the HTTP or CLI response. When the watcher is disabled, `dump()` behaves normally and the Var Dumps panel is hidden from the dashboard.

```php
dump($order);
Speculum::varDump($user, $payload); // one entry for the call (both values) + file:line
```

Each `Speculum::varDump(...$values)` call stores one entry with a `summary`, caller `file` / `line` (absolute path, same style as Views), and HTML for each value. Plain `dump($x)` stores one value per call with the same location metadata.

API responses keep absolute `file` / `path` and add `editor_url` via CakePHP `Debugger::editorUrl()` (honors `Debugger.editor` / `editorBasePath`). The SPA receives `window.Speculum.root` (Cake `ROOT`) and `window.Speculum.editor`, shows **relative** paths in the UI, and can override the project root via **Setup** (localStorage) so IDE links open your local checkout when Speculum is served remotely.

Sensitive keys are redacted before HTML is stored (same defaults as model sanitization: `*password*`, `*token*`, `*secret*`, `*api_key*`, `redmine_api_key`, …). Add patterns under `Speculum.sanitize.vardump` in `config/speculum.php`.

```php
'watchers' => [
    Crustum\Speculum\Watcher\VarDumpWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_VARDUMP_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'max_items' => 250,
        'max_string' => 5000,
        'max_bytes' => 65536,
    ],
    // ...
],
```

<a name="view-watcher"></a>
### View Watcher

The view watcher records the view name, path, and data keys used when rendering views. Speculum’s own templates are always skipped in code. Skip third-party view paths with fnmatch patterns in `ignore_paths`:

```php
'watchers' => [
    Crustum\Speculum\Watcher\ViewWatcher::class => [
        'enabled' => filter_var(env('SPECULUM_VIEW_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
        'ignore_paths' => [
            '*/DebugKit/*',
            '*/cakephp/debug_kit/*',
        ],
    ],
    // ...
],
```

<a name="mcp-server"></a>
## MCP Server

Speculum registers a dedicated local MCP server (`cake-speculum`) for AI agents:

| Tool | Purpose |
|------|---------|
| `speculum_search` | Filter entries; returns summaries plus recording meta. Pass a summary `id` to `speculum_entry`. |
| `speculum_entry` | Fetch one entry by `id`. Optional `expand` adds related summaries. |
| `speculum_control` | Monitoring tags (`monitor` / `unmonitor`) and recording pause/resume; `status` lists both. |

### `speculum_control`

| Action | Behavior |
|--------|----------|
| `status` | Return `enabled`, `paused`, `recording`, `monitored_tags`, `available_watchers`. Default when `action` is omitted. |
| `monitor` | Start monitoring a tag (requires `tag`). Same as Monitoring UI. |
| `unmonitor` | Stop monitoring a tag (requires `tag`). |
| `pause` | Stop recording new entries (dashboard pause / `bin/cake speculum pause`). |
| `resume` | Clear the pause flag and record again. |

Monitored tags only change what is kept when the host app uses `Speculum::filter` with `hasMonitoredTag()`. Without that filter, Speculum still records everything while enabled.

### expand on `speculum_entry`

| Value | Behavior |
|-------|----------|
| `none` | Entry only. Default when omitted. |
| `related` | Other entries from the same request story (same `batch_id`). Response key `related` with per-type `counts` and summary `entries`. |
| `family` | Other occurrences of the same exception throw site (same `family_hash`). Same shape as `related`. Empty if the entry has no `family_hash`. |

Expanded rows are summaries only, not full payloads. Content on the primary entry is truncated.

Start the server (requires `Crustum/Mcp` loaded — see [Installation](#installation)):

```bash
bin/cake speculum mcp
```

This delegates to `bin/cake mcp start cake-speculum`. Use Ignis MCP for schema, routes, config, and tinker — not Speculum.

<a name="custom-plugins-and-panels"></a>
## Custom Plugins and Panels

Speculum’s first-party screens and API live in this package. You can add your own entry types from a separate CakePHP plugin (or from the host application) without editing Speculum’s Vue sources for each panel. A complete extension shares one stable key (below we use `widgets`): a watcher that records entries, registration on Speculum bootstrap so the dashboard knows the panel and Speculum exposes `/speculum/api/widgets`, and Vue screens under a folder that contains `register.js`. For list/show only, register a `type` and Speculum’s shared `EntryResourcesController` serves the JSON. When you need custom actions (preview, download, resolve — the same class of need as Speculum mail or exceptions), register your own controller instead.

### Plugin skeleton

Create a normal CakePHP plugin, for example `Acme/Widgets`, and load it **after** `Crustum/Speculum`. Disable the plugin’s own HTTP routes for Speculum’s API: Speculum owns `/speculum/api/*` and connects your registration.

```php
namespace Acme\Widgets;

use Cake\Core\BasePlugin;
use Cake\Core\Configure;
use Cake\Core\PluginApplicationInterface;
use Crustum\Speculum\Registry\WatcherRegistry;
use Acme\Widgets\EntryTypes;
use Acme\Widgets\Watcher\WidgetWatcher;

class WidgetsPlugin extends BasePlugin
{
    protected bool $routesEnabled = false;

    public function bootstrap(PluginApplicationInterface $app): void
    {
        parent::bootstrap($app);

        $watchers = Configure::read('Speculum.watchers', []);
        if (!is_array($watchers)) {
            $watchers = [];
        }

        if (!array_key_exists(WidgetWatcher::class, $watchers)) {
            $watchers[WidgetWatcher::class] = [
                'enabled' => filter_var(env('SPECULUM_WIDGET_WATCHER', true), FILTER_VALIDATE_BOOLEAN),
            ];
            Configure::write('Speculum.watchers', $watchers);
        }

        if (class_exists(WatcherRegistry::class)) {
            WatcherRegistry::registerExtensionPanel('widgets', WidgetWatcher::class, [
                'type' => EntryTypes::Widget,
            ]);
        }
    }
}
```

`WatcherRegistry::registerExtensionPanel()` stores the SPA nav key and ensures the watcher is registered when Speculum is enabled. With `type`, Speculum registers an entry resource so routes add `POST /speculum/api/widgets` and `GET /speculum/api/widgets/{id}` on Speculum’s `EntryResourcesController`. Use a short string entry type owned by your package (do not add cases to Speculum’s `EntryType` enum):

```php
namespace Acme\Widgets;

final class EntryTypes
{
    public const Widget = 'widget';
}
```

### Watcher

Extend `Crustum\Speculum\Watcher\Watcher`, listen to your domain events in `register()`, and queue payloads with `Speculum::recordEntry()`:

```php
namespace Acme\Widgets\Watcher;

use Acme\Widgets\EntryTypes;
use Cake\Event\EventManager;
use Crustum\Speculum\Entry\IncomingEntry;
use Crustum\Speculum\Speculum;
use Crustum\Speculum\Watcher\Watcher;

class WidgetWatcher extends Watcher
{
    public function register(): void
    {
        EventManager::instance()->on('Widget.afterRender', function ($event, array $payload): void {
            Speculum::recordEntry(EntryTypes::Widget, IncomingEntry::make([
                'name' => $payload['name'] ?? 'widget',
                'summary' => $payload['name'] ?? 'widget',
                'payload' => $payload,
            ]));
        });
    }
}
```

### Custom API controller (optional)

List/show alone does not need a controller in your plugin. If the panel needs extra endpoints (HTML preview, file download, mark resolved, multi-type index, and similar), keep an `EntryController` subclass and register `plugin` + `controller` instead of `type`. Speculum connects index/view on the sibling `/speculum/api` scope (Cake cannot nest another plugin inside Speculum’s `plugin()` block). Allow your plugin in host RBAC when the app gates by plugin name.

```php
WatcherRegistry::registerExtensionPanel('widgets', WidgetWatcher::class, [
    'plugin' => 'Acme/Widgets',
    'controller' => 'Widgets',
]);
```

```php
namespace Acme\Widgets\Controller;

use Acme\Widgets\EntryTypes;
use Acme\Widgets\Watcher\WidgetWatcher;
use Crustum\Speculum\Controller\EntryController;

class WidgetsController extends EntryController
{
    protected function entryType(): string
    {
        return EntryTypes::Widget;
    }

    protected function watcher(): string
    {
        return WidgetWatcher::class;
    }
}
```

Do not pass both `type` and `plugin`/`controller`: when a controller is registered, Speculum uses that controller for list/show.

### Vue panel

Ship screens under something like `resources/speculum/` inside your package. The folder must contain `register.js` that imports Speculum’s `registerPanel` helper (Vite alias `speculum-extensions`) and registers routes plus optional related-tab metadata. Use sidebar **group** `2` so the item sits with Speculum’s second nav group (sorted by label with the other group-2 items).
```js
import { registerPanel } from 'speculum-extensions';
import index from './widgets/index.vue';
import preview from './widgets/preview.vue';
import RelatedTable from './widgets/RelatedTable.vue';

registerPanel({
    key: 'widgets',
    label: 'Widgets',
    watcher: 'widgets',
    group: 2,
    routes: [
        { path: '/widgets', name: 'widgets', component: index },
        { path: '/widgets/:id', name: 'widgets-preview', component: preview },
    ],
    related: {
        type: 'widget',
        title: 'Widgets',
        component: RelatedTable,
        match: (item) => item.type === 'widget',
    },
});
```

Index and preview screens follow Speculum’s existing patterns: wrap `index-screen` / `preview-screen` with `resource="widgets"` (the API path segment), and link rows to the named preview route. Related tables receive `items` from Speculum’s related-entries UI the same way first-party related tables do. Do not patch files under Speculum’s `resources/frontend` for each new panel.

### Host SPA build

When panels live in Composer packages, the **host application** rebuilds the Speculum SPA so Vite can import each package’s `register.js`. Copy Speculum’s `resources/host-spa` template to `{APP}/resources/speculum`, list panel roots in `panels.json` (paths relative to the app root or absolute), run `npm install` once inside `vendor/crustum/speculum/resources/frontend`, then from the host folder run `npm run build`. The script writes `{APP}/webroot/speculum` by default; keep `Speculum.assets.path` as `speculum` so the dashboard loads `/speculum/app.js`. Add another panel package by appending its `resources/speculum` path to `panels.json` and rebuilding. Env overrides and a short setup guide are in `resources/host-spa/README.md`.

<a name="displaying-user-avatars"></a>
## Displaying User Avatars

The Speculum dashboard can display a user avatar for the user associated with a given entry. By default, Speculum will retrieve avatars using the Gravatar web service when an email is present on the entry user payload. However, you may customize the avatar URL by registering a callback. The callback receives the user payload array and should return the avatar image URL:

```php
use Crustum\Speculum\Speculum;

Speculum::avatar(function (array $user) {
    return !empty($user['id'])
        ? '/avatars/' . $user['id'] . '.jpg'
        : '/generic-avatar.jpg';
});
```
