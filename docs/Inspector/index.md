# CakePHP Inspector Plugin

<a name="introduction"></a>
## Introduction

Inspector is a detection package for CakePHP projects. It reads your project's lockfiles and configuration markers and can optionally inspect source code to determine what the project uses.

`ProjectManager` and `ProjectScan` report package dependencies, the application's stack and frontend, browser test frameworks, configured AI agents and editors, the JS package manager indicated by the committed lockfile, and conventions adopted by the codebase.

<a name="installation"></a>
## Installation

Install via Composer (typically as a development dependency):

```bash
composer require crustum/inspector --dev
```

> [!NOTE]
> This plugin should be registered in your `config/plugins.php` file.

```bash
bin/cake plugin load Crustum/Inspector
```

Alternatively, you can load the plugin in your `Application.php`:

```php
// In src/Application.php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/Inspector');
}
```

When the plugin boots, it registers a `inspector` Cake Cache config (file engine under `tmp/cache/inspector/`) when one is not already defined, and binds `ProjectManager` as a shared container service.

<a name="basic-usage"></a>
## Basic Usage

Resolve `ProjectManager` from the container, or instantiate it directly. The first `scan()` call for the default path is memoized for the remainder of the process:

```php
use Crustum\Inspector\Enums\Stack;
use Crustum\Inspector\ProjectManager;

$projects = $this->getContainer()->get(ProjectManager::class);
// or: $projects = new ProjectManager();

$project = $projects->scan();
$project = $projects->scan('/path/to/project');

$project->php()->uses('pestphp/pest');
$project->stacks()->uses(Stack::Bake);
```

Outside a CakePHP application, or when you want an uncached scan, call `fresh()`:

```php
use Crustum\Inspector\ProjectManager;

$projects = new ProjectManager();

$project = $projects->fresh();
$project = $projects->fresh($basePath);
```

You may also scan without the manager:

```php
use Crustum\Inspector\ProjectScan;

$project = ProjectScan::scan('/path/to/project');
```

The following examples use `$project` for clarity; the same methods are available on `ProjectManager` for the default memoized scan (`php()`, `js()`, `stacks()`, and so on).

<a name="detecting-packages"></a>
## Detecting Packages

Packages are exposed through two ecosystems: `php()` for Composer packages and `js()` for JavaScript packages managed by npm, pnpm, Yarn, or Bun. Both ecosystems provide the same methods:

```php
$ecosystem->uses(string|array $packages, ?string $constraint = null): bool
$ecosystem->usesAll(array $packages): bool
```

The `uses` method returns `true` when **any** of the given packages is present, while the `usesAll` method returns `true` only when **every** package is present. Use the package names that appear in `composer.json` or `package.json`:

```php
$project->php()->uses('cakephp/cakephp');
$project->js()->uses('vue');
```

<a name="version-constraints"></a>
### Version Constraints

You may pass a version constraint as the second argument to the `uses` method. It accepts any Composer Semver constraint, such as `^1.2.3`, `~1.2`, `>=5 <6`, or `1.0 || ^2.0`. A bare version such as `1.2.3` requires an exact match. When the constraint is omitted, only the package's presence is checked:

```php
$project->php()->uses('cakephp/cakephp', '^5.0');
$project->php()->uses('cakephp/cakephp', '>=5.0 <6');
```

<a name="checking-multiple-packages"></a>
### Checking Multiple Packages

To check whether **any** of several packages are present, you may pass an indexed array of names to the `uses` method. Pass an associative array to specify constraints for individual packages:

```php
$project->php()->uses(['pestphp/pest', 'phpunit/phpunit']);

$project->php()->uses([
    'pestphp/pest' => '^3.0',
    'phpunit/phpunit' => '^10.0',
]);
```

To require that **all** of several packages are present, you may use the `usesAll` method:

```php
$project->php()->usesAll(['pestphp/pest', 'cakephp/cakephp']);

$project->php()->usesAll([
    'pestphp/pest' => '^3.0',
    'cakephp/cakephp' => '^5.0',
]);
```

The JS ecosystem behaves the same way:

```php
$project->js()->uses(['vue' => '^3.0', 'react' => '^18.0']);
$project->js()->usesAll(['vue', 'react']);
```

> [!WARNING]
> The array passed to the `uses` and `usesAll` methods must be either entirely indexed (just names) or entirely associative (name to constraint). Mixing the two shapes throws an `InvalidArgumentException`.

<a name="retrieving-packages"></a>
### Retrieving Packages

You may also retrieve the underlying `Package` instance or collection. The `usesDirect` method checks whether a package is a *direct* dependency (declared in your manifest rather than pulled in transitively). When passed an array, it returns `true` if any listed package is direct. The collection provides `dev`, `production`, and `direct` filters:

```php
$project->php()->package('cakephp/cakephp')?->version();
$project->js()->package('vue')?->major();
$project->php()->usesDirect('cakephp/bake');
$project->php()->usesDirect(['cakephp/bake', 'cakephp/queue']);
$project->php()->packages()->dev();
$project->php()->packages()->direct();
```

> [!NOTE]
> The development classification of *transitive* packages is available only for Composer and npm lockfiles. Yarn, pnpm, and Bun lockfiles report transitive packages as production dependencies. Direct dependencies are classified using authoritative lockfile metadata when available and manifest data otherwise.

<a name="detecting-stacks-and-frontends"></a>
## Detecting Stacks and Frontends

The `stacks`, `frontends`, and `browserTestFrameworks` methods on `ProjectScan` return an `EnumSet` containing every detected case. You may invoke the `uses` method to check for membership, the `usesAll` method to require every given case, and the `all` method to retrieve every detected case:

```php
use Crustum\Inspector\Enums\BrowserTestFramework;
use Crustum\Inspector\Enums\Frontend;
use Crustum\Inspector\Enums\Stack;

$project->stacks()->uses(Stack::Bake);
$project->stacks()->all();

$project->browserTestFrameworks()->uses(BrowserTestFramework::Playwright);
$project->browserTestFrameworks()->uses([
    BrowserTestFramework::Playwright,
    BrowserTestFramework::Cypress,
]);
$project->browserTestFrameworks()->usesAll([
    BrowserTestFramework::Playwright,
    BrowserTestFramework::Cypress,
]);

$project->frontends()->uses(Frontend::React);
```

The `uses` method accepts either a single case or an array of cases and returns `true` when **any** case is present, while the `usesAll` method returns `true` only when **every** case is present.

Detected stacks for CakePHP projects:

| Case | Detection |
|------|-----------|
| `Stack::Api` | Direct dependency on `friendsofcake/crud` or `cakedc/cakephp-api` |
| `Stack::Bake` | Presence of `cakephp/bake` |
| `Stack::Queue` | Direct dependency on `cakephp/queue` |
| `Stack::DefaultView` | `cakephp/cakephp` present and no other stack matched |

Browser test frameworks: Playwright, Cypress, and Codeception. Frontends: Vue, React, and Svelte (from JS dependencies).

<a name="detecting-agents-and-editors"></a>
## Detecting Agents and Editors

Agents (AI coding tools such as Claude Code, Cursor, and Codex) and editors (IDEs such as PhpStorm and VS Code) are exposed through separate enums. Inspector detects them through filesystem markers such as `.claude`, `.cursor`, `.idea`, and `AGENTS.md`:

```php
use Crustum\Inspector\Enums\Agent;
use Crustum\Inspector\Enums\Editor;

$project->agents()->uses(Agent::ClaudeCode);
$project->agents()->uses([Agent::ClaudeCode, Agent::Cursor]);
$project->editors()->uses(Editor::PhpStorm);
```

<a name="detecting-js-package-managers"></a>
## Detecting JS Package Managers

The `$project->js()->packageManager()` method reports the package manager indicated by the project's lockfile as a nullable enum (`package-lock.json` indicates npm, `pnpm-lock.yaml` indicates pnpm, and so on):

```php
use Crustum\Inspector\Enums\JsPackageManager;

$project->js()->packageManager() === JsPackageManager::Pnpm;
```

You may also check for a specific package manager via the `usesPackageManager` method, which accepts an enum case or its string value:

```php
$project->js()->usesPackageManager(JsPackageManager::Pnpm);
$project->js()->usesPackageManager('pnpm');
```

Projects should commit only one supported JavaScript lockfile. If multiple lockfiles are present, Inspector selects the first match in this order: npm, pnpm, Yarn, then Bun.

<a name="detecting-approaches"></a>
## Detecting Approaches

The `approaches` method inspects the project's **own source code**, not its manifests, and reports which stylistic conventions the application has adopted:

- entity `_accessible` whitelist vs `'*'` default (`Model/Entity`)
- enum case capitalization (`SCREAMING_SNAKE_CASE`, `PascalCase`, or `camelCase`)

You may check for one or more approaches or retrieve all detected results:

```php
use Crustum\Inspector\Enums\Approach;

$project->approaches()->uses(Approach::EntityAccessibleWhitelist);
$project->approaches()->uses([
    Approach::EnumCasePascal,
    Approach::EnumCaseCamel,
]);
$project->approaches()->all();
```

Detection is best-effort: Inspector uses lightweight pattern matching rather than a full parser, so an unusual file may abstain or be classified based on a comment or string literal. Approaches are therefore reported with a confidence ratio rather than as exact answers.

A stylistic approach is reported only when it receives at least three votes and at least 80% of the votes cast. Each file casts at most one vote, except that enum capitalization receives one vote per enum case. Consequently, a 2/3 majority is rejected, a 4/5 majority passes, and an evenly split codebase produces no result. A file that mixes styles votes for its majority style and abstains when tied.

Each `ApproachResult` exposes the winning `approach`, its raw `confidence` ratio, the `matched` and `total` vote counts, and the `paths` of the files that voted. You may retrieve a result via the `result` method:

```php
$result = $project->approaches()->result(Approach::EntityAccessibleWhitelist);

$result->confidence;
$result->matched;
$result->total;
$result->paths;
```

Inspector discovers source files by combining the PSR-4 autoload roots in `composer.json` with `src/` and `plugins/*/src/`. It matches subdirectories such as `Model/Entity/` anywhere beneath those roots, so it also scans modular layouts such as `src/Domain/Orders/Model/Entity/`. The `vendor/` and `node_modules/` directories, as well as hidden directories, are always excluded.

Because source files can change without affecting a lockfile, approaches are never persisted with a cached scan. They are computed lazily once per scan instance and only when requested. The `toArray()` and `json()` methods omit them, while the `inspector scan` command accepts an `--approaches` flag to include them in its output.

Whole confidence values are encoded as JSON floats (for example `1.0`, not `1`) so consumers keep a single field type.

<a name="caching"></a>
## Caching

The first call through `ProjectManager::scan()` for the default path scans the project and memoizes the result for the remainder of the process. Across processes, Inspector uses the Cake Cache `inspector` config registered by the plugin. The cache key includes a hash of supported manifests and lockfiles, along with the presence of detector marker paths, so changes such as an edit to `composer.lock` or the addition of a `.claude` directory invalidate the persisted cache. Inspector falls back to a direct scan when the cache driver fails.

In long-running processes such as queue workers, the memoized instance is kept until the worker restarts. You may call `ProjectManager::fresh()` to bypass both the memoized result and the persisted cache and force a new scan at any time.

<a name="the-inspector-scan-command"></a>
## The `inspector scan` Command

The `inspector scan` console command scans a directory and emits the project surface as a JSON document. When the directory is omitted, the current working directory is scanned:

```bash
bin/cake inspector scan
bin/cake inspector scan /path/to/project
```

You may pass `--approaches` to include approach detection for PHP files under the project's PSR-4 autoload roots, `src/`, and `plugins/*/src/`:

```bash
bin/cake inspector scan /path/to/project --approaches
```

Pass `--cached` to read and write scan results through the `inspector` cache store:

```bash
bin/cake inspector scan /path/to/project --cached
```
