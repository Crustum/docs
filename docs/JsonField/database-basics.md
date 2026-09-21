# Database Basics

The `Crustum/JsonField` plugin's database access layer builds on CakePHP's
standard `Cake\Database` and `Cake\ORM` and layers JSON-column awareness on top.
It abstracts and provides help with the aspects of dealing with JSON columns:
keeping connections to the server, building queries against path-addressable JSON,
preventing injection through typed value casting, inspecting and altering schemas,
and debugging and profiling queries sent to the database.

This plugin runs on a relational engine (PostgreSQL,
MySQL, or SQLite). There is no separate Connection class and no new query grammar —
you keep using `Cake\Database\Connection`, `Table`, and the query builder you
already know. The JSON specifics are introduced by three pieces:

- **A driver subclass** (`JsonFieldPostgresDriver` / `JsonFieldMysqlDriver` /
  `JsonFieldSqliteDriver`) that carries a dialect trait. The dialect intercepts
  query compilation and rewrites JSON-path strings (`column->path`) into
  engine-native SQL.
- **An engine adapter** (`JsonFieldEngineInterface`) resolved from the active
  driver. It emits the native SQL for atomic writes (`jsonb_set` / `JSON_SET` /
  `json_set`) and value casting on the save path.
- **The schema/type/association layer** (`JsonSchemaReader`, `JsonTypeMap`,
  `JsonFieldAssociationBuilder`) that turns declarative entity attributes into a
  per-path type map and association objects used by hydration and persistence.

It mirrors the structure of `Cake\Database` but **routes JSON paths to native
engine expressions** instead of treating them as opaque decoded arrays.

## Quick Tour

The functions described in this chapter illustrate what is possible with the
lower-level database access API. If instead you want to learn more about the
complete plugin, you can read the [Entities](entities.md) and
[Associations](associations.md) sections.

The easiest way to enable JSON-field support is to point your connection's driver
at the matching `JsonField` driver subclass:

```php
use Cake\Datasource\ConnectionManager;

ConnectionManager::setConfig('default', [
    'className' => \Cake\Database\Connection::class,
    'driver' => \Crustum\JsonField\Database\Driver\JsonFieldPostgresDriver::class,
    'host' => 'localhost',
    'username' => 'my_app',
    'password' => 'secret',
    'database' => 'my_app',
]);
```

Once created, you use the connection exactly as you would in core CakePHP. JSON-path
strings are rewritten at compile time, so a normal `where()` already understands
them:

```php
$connection = ConnectionManager::get('default');

$results = $connection
    ->selectQuery()
    ->from('articles')
    ->where(['data->created >' => new DateTime('1 day ago')])
    ->orderBy(['data->title' => 'DESC'])
    ->execute();

foreach ($results as $row) {
    // $row is an associative array; data->created is a native JSON path.
}
```

You can use complex values as arguments. Values in `where()` are compared as scalars
across every driver, and numeric comparisons are wrapped in an engine-native numeric
cast automatically.

Insert, update, and delete go through the standard `insertQuery()` / `updateQuery()` /
`deleteQuery()` (or `Table::save()` / `delete()`); for whole-column writes the standard
`JsonType` encodes the column, while the Table/entity API additionally applies *atomic path
updates* (see [Writing Data](#writing-data)).

## Configuration

By convention database connections are configured in **config/app.php** (or your
app's datasource config). The connection information defined in this file is fed
into `Cake\Datasource\ConnectionManager`, creating the connection configuration your
application will be using. For JSON fields you only change the `driver`:

```php
'Datasources' => [
    'default' => [
        'className' => \Cake\Database\Connection::class,
        'driver' => \Crustum\JsonField\Database\Driver\JsonFieldPostgresDriver::class,
        'host' => 'localhost',
        'username' => 'my_app',
        'password' => 'secret',
        'database' => 'my_app',
        'cacheMetadata' => true,
        'log' => false,
    ],
],
```

The above will create a `default` connection backed by PostgreSQL with the JSON-field
dialect enabled. You can define as many connections as you want, and use any of the
three driver subclasses:

- `Crustum\JsonField\Database\Driver\JsonFieldPostgresDriver`
- `Crustum\JsonField\Database\Driver\JsonFieldMysqlDriver`
- `Crustum\JsonField\Database\Driver\JsonFieldSqliteDriver`

You can also set the driver through a DSN connection string by appending
`&driver=Crustum\JsonField\Database\Driver\JsonFieldSqliteDriver` (as the test
suites do):

```php
ConnectionManager::setConfig('test', [
    'url' => 'sqlite:///:memory:?className=Cake\Database\Connection&driver=Crustum\JsonField\Database\Driver\JsonFieldSqliteDriver',
]);
```

There is no connection cloning or driver swapping at runtime — the engine adapter is
resolved from whichever `JsonField` driver subclass your connection already uses.

Configuration options are the standard CakePHP datasource keys (`host`, `port`,
`username`, `password`, `database`, `encoding`, `timezone`, `cacheMetadata`, `log`,
`quoteIdentifiers`, `persistent`, …). A full list is in the
[CakePHP Configuration](https://book.cakephp.org/5/en/orm/database-basics.html#configuration)
documentation. There is no `options` array of engine-client parameters — those concepts
do not apply to a relational backend.

## Engine Resolution

`class` `Crustum\JsonField\Database.JsonFieldEngineResolver`

The active engine adapter is resolved from the connection driver — every other layer
(paths, schema, hydration, casting, associations) is engine-neutral. The resolver
maps the driver subclass to a small adapter implementing `JsonFieldEngineInterface`:

```php
use Crustum\JsonField\Database\JsonFieldEngineResolver;

$engine = (new JsonFieldEngineResolver())->engine($connection->getDriver());
// Postgres -> PostgresEngine, Mysql -> MysqlEngine, Sqlite -> SqliteEngine
```

The `JsonFieldEngineInterface` covers only the save-path primitives — the two
operations the dialect trait does not handle:

- `set(JsonPath $path, mixed $value)`: builds an expression that atomically sets the
  value at a path inside a JSON column (`jsonb_set` / `JSON_SET` / `json_set`).
- `cast(mixed $value)`: builds an expression that casts a PHP value into a JSON literal
  for this engine (`to_jsonb(v)` / `CAST(v AS JSON)` / `json(v)`).

`JsonFieldAwareTrait::jsonFieldEngine()` returns the resolved engine for a Table's
connection so you rarely construct the resolver yourself.

To support another backend, implement `JsonFieldEngineInterface` (`set()`, `cast()`)
and add one branch to the resolver — engine differences live in three small classes,
and your adapter slots into the same seam.

## Data Types

`class` `Crustum\JsonField\Database.JsonTypeMap`

A JSON column stores every value as JSON, which means scalar types are lost once
decoded. The plugin restores them with a per-path type map. Each path in a JSON column
can be assigned a CakePHP type name; the map drives marshalling (request data → PHP)
and casting at both ends of the persistence boundary (`toPHP` on read, `toDatabase` on
write). Core `JsonType` still handles the whole-column encode/decode; `JsonTypeMap`
handles only the per-path transforms layered on top.

Types are declared with the `#[JsonPathType]` attribute on an embedded entity (the
path is relative to the embed) or directly on the root entity (absolute path). Any
`TypeFactory` type name may be used:

datetime, date
: Maps to `Cake\I18n\DateTime`. `toDatabase()` accepts a `DateTimeInterface` or the
  string formats `'Y-m-d H:i:s'` and `'Y-m-d'`; `toPHP()` returns a `Cake\I18n\DateTime`.

decimal
: Exact decimal arithmetic. Values are represented as strings (not PHP floats) to
  avoid precision loss.

integer, int
: A BSON-safe integer in CakePHP terms — a PHP `int`. Stored as a JSON number.

float
: A PHP `float`. Stored as a JSON number.

boolean, bool
: A PHP `bool`. Stored as a JSON `true`/`false`.

string
: A JSON string.

json
: A nested object/array, left structurally intact.

These types are used by the schema reflection (`JsonSchemaReader`) and by the
hydration/`saveAssociated` layers. Each type provides translation functions between
PHP and JSON representations, invoked based on the type map:

- `toPHP`: casts a value read from the database into its PHP representation.
- `toDatabase`: casts a PHP value into the representation stored in JSON.
- `marshal`: parses request-style values into PHP objects during marshalling.

### Date & Time Types

`class` `Crustum\JsonField\Database\Schema\Attribute.JsonPathType`

Because JSON has no native temporal type, a `datetime`/`date` path is the usual way
to keep timestamps correct:

```php
use Crustum\JsonField\Database\Schema\Attribute\JsonPathType;
use Crustum\JsonField\Model\Entity\JsonEntity;

#[JsonPathType('created', type: 'datetime')]
#[JsonPathType('price', type: 'decimal')]
class ArticleProfile extends JsonEntity
{
}
```

`JsonSchemaReader::read(Article::class)` prefixes each relative path with the embed's
absolute path, yielding a type map keyed by full paths such as
`data->profile->created`. Absolute `#[JsonPathType]` declarations placed directly on
the root entity are honored as well.

### Enum Type

CakePHP backed enums are first-class JSON values. Declare the path with the enum's
scalar type and use the enum directly in your entity:

```php
enum ArticleStatus: string
{
    case Published = 'Y';
    case Unpublished = 'N';
}
```

```php
#[JsonPathType('status', type: 'string')]
class ArticleProfile extends JsonEntity
{
}
```

Stored as a plain JSON `string` (or `integer` for int-backed enums), the value is
read back as the scalar; convert it to the enum in an accessor or virtual field on
the entity.

### Adding Custom Types

`class` `Crustum\JsonField.Database.JsonTypeMap`

A per-path type can be a `TypeFactory` type name *or* a per-operation callable.
`JsonTypeMap` exposes three operations — `marshal` (request data → PHP),
`toPHP` (database → PHP result casting), and `toDatabase` (PHP → database writes).
When you need behavior a named type does not cover, register a callable per path:

```php
use Crustum\JsonField\Database\JsonTypeMap;

$typeMap = new JsonTypeMap();
$typeMap->addJsonType('data->profile->price', ['decimal']);
$typeMap->addJsonType('data->profile->created', [
    'datetime',
    'toDatabase' => static fn ($v) => $v instanceof DateTimeInterface ? $v->format('Y-m-d H:i:s') : $v,
]);
```

The schema reader builds the same structure from attributes; a programmatic map is
useful when configuration must be derived at runtime.

## Querying JSON Paths

`class` `Crustum\JsonField.ORM.JsonFieldAwareTrait`

All query helpers emit the engine-native extract expression on the normal connection
— no connection clone, no driver swap. Conditions compare in scalar form across every
driver, and numeric comparisons are wrapped in an engine-native numeric cast
automatically. Apply the trait to any Table that owns path-addressable JSON columns.

### Filtering by Path

```php
$articles->whereJsonPath('data->author_id', 2);
$articles->whereJsonPath('data->score', 9.0, '>=');
$articles->whereJsonPathIn('data->tag_ids', [1, 2, 3]);
$articles->whereJsonPathNotIn('data->author_id', [3]);
$articles->whereJsonPathLike('data->note', 'feat%');
$articles->whereJsonPathLike('data->note', 'zzz%', true); // NOT LIKE
$articles->whereJsonPathNull('data->missing');
$articles->whereJsonPathNotNull('data->note');
$articles->whereJsonPathBetween('data->author_id', 1, 3);
```

Comparison operators supported by `whereJsonPath()` are `=`, `!=`, `>`, `>=`, `<`,
and `<=`.

### Ordering, Grouping, and Aggregating by Path

```php
$articles->orderByJsonPath('data->score', 'DESC');
$articles->groupByJsonPath('data->category');
$articles->havingJsonPath('data->score', 9.0, '>=');
$articles->aggregateJsonPath('COUNT', 'data->chapters'); // array length on supported engines
```

### Raw Extract Expressions

For conditions beyond the helpers, `extractJsonPath()` returns the engine-native
expression so it composes with the full `QueryExpression` API:

```php
$articles->find()
    ->where(fn ($exp) => $exp
        ->eq($articles->extractJsonPath('data->author_id'), 2, 'integer')
        ->like($articles->extractJsonPath('data->note'), 'feat%'))
    ->orderByDesc($articles->extractJsonPath('data->score'));
```

### The `jsonField` Finder

The opt-in `jsonField` finder rewrites raw JSON-path string conditions already
present on a query's WHERE and ORDER BY clauses into extract expressions:

```php
$query = $articles->find()->where(['data->author_id' => 2]);
$articles->findJsonField($query);
```

> [!IMPORTANT]
> Conditions must be attached **before** the finder runs. For fluent `->where()`
> chaining after building a query, prefer `extractJsonPath()` or the `whereJsonPath*`
> builders.

## Reading Data

`class` `Crustum\JsonField.Model.Behavior.JsonFieldBehavior`

On `Model.beforeFind` the behavior installs a `JsonFieldResultSet` for the query. As
each row hydrates, every `#[JsonEmbed]` decoded array is converted into its declared
embed entity with the `embeddedParent` back-pointer set, and per-path `toPHP` casting
is applied when a type is registered for the full path:

```php
$article = $articles->get(1);
$article->profile->name;      // ArticleProfile entity, parent-aware
$article->chapters[0]->title; // HasMany embed list
```

Entities without `#[JsonEmbed]` declarations pass through untouched, so the behavior
is safe to attach broadly. Per-path `toPHP` casting converts results (for example
`data->profile->created` becomes a `Cake\I18n\DateTime`) while core `JsonType` handles
the whole-column decode. References (`#[JsonReference]`) are not hydrated by the
result set — resolve them explicitly (see [Associations](associations.md)).

## Writing Data

The behavior routes changes made through nested entities or path strings to the
database on `Model.beforeSave`. Two strategies apply, chosen per entity state.

### Whole Column Writes

A **new entity**, or one whose JSON storage column is itself dirty, is written as a
whole column. Each embed is exported into the column array, every typed leaf passes
through its per-path `toDatabase` caster, and unrelated keys in the column are
preserved. Core `JsonType` encodes the result.

```php
$article = $articles->newEmptyEntity();
$article->set('data->profile->name', 'Jane');
$articles->save($article);
```

### Atomic Path Updates

An **existing entity** with dirty nested-embed fields is persisted with atomic,
engine-native `set()` expressions scoped to the single changed path. All other JSON
keys in the column remain untouched:

```sql
-- PostgreSQL
UPDATE articles SET data = jsonb_set(data, '{profile,name}', to_jsonb('Patrick'), true) WHERE id = 1;
-- MySQL
UPDATE articles SET data = JSON_SET(data, '$.profile.name', CAST(? AS JSON)) WHERE id = 1;
-- SQLite
UPDATE articles SET data = json_set(data, '$.profile.name', json(?)) WHERE id = 1;
```

Dirty tracking bubbles up from the deepest changed leaf, so saving after a single
nested change issues exactly one targeted update. References write the resolved
foreign key into the JSON path on save (see [Associations](associations.md)).

## Engine Adapter System

The plugin resolves a small engine adapter from the active connection driver and
funnels the save-path SQL through it. Everything else — paths, schema reading,
hydration, casting, associations — is shared, engine-neutral code.

| Engine | `extract` (read) | `set` (write) | `cast` (write) |
|--------|------------------|---------------|----------------|
| **PostgreSQL** | `JSONB_PATH_QUERY(col::jsonb, '$.a.b')` | `jsonb_set(col, '{a,b}', to_jsonb(v), true)` | `to_jsonb(v)` |
| **MySQL** | `JSON_UNQUOTE(JSON_EXTRACT(col, '$.a.b'))` | `JSON_SET(col, '$.a.b', CAST(v AS JSON))` | `CAST(v AS JSON)` |
| **SQLite** | `JSON_VALUE(col, '$.a.b')` (core rewrites to `json_extract(col, '$.a.b')`) | `json_set(col, '$.a.b', json(v))` | `json(v)` |

The read-path `extract` expressions are produced by the dialect trait on the driver;
the write-path `set`/`cast` expressions come from the resolved `JsonFieldEngineInterface`
adapter. Joins on a JSON foreign key (see `joinJsonReference()` in
[Associations](associations.md)) use the same `extract` expression, so a reference
resolves through a real SQL `JOIN` on every supported engine.

## Query Logging

Query logging is unchanged from core CakePHP — enable it on the connection with the
`log` config key (a boolean, a logger class name, or a `Psr\Log\LoggerInterface`
instance). JSON-path rewrites appear as ordinary SQL in the log, so you can profile
them with the same tooling you already use.

> [!NOTE]
> Query logging is only intended for debugging/development uses. You should never
> leave query logging on in production as it will negatively impact the performance
> of your application.

## Identifier Quoting

Identifier quoting works exactly as in core CakePHP. The `quoteIdentifiers` datasource
config and `enableAutoQuoting()` apply; the only thing the plugin adds is rewriting of
JSON *value* paths (the `column->path` strings), which are not identifiers and are
rendered as engine-native extract expressions.

## Transactions

Standard CakePHP connection transactions apply — `begin()`, `commit()`, `rollback()`,
and `transactional()` behave exactly as in core CakePHP, and there is no JSON-field
specific transaction layer. Atomic path updates are emitted as ordinary `UPDATE`
statements inside the surrounding transaction, so a rolled-back transaction discards
them like any other write.

## Creating and Altering Tables

Tables, columns, and indexes are managed with the standard CakePHP migration /
schema tools — there is no JSON-specific DDL. A JSON column is declared with the
normal `json`/`jsonb` column type in your migration; the plugin only needs the column
to exist and to be named in a `#[JsonColumn]` attribute on the entity. JSON paths
inside the column are discovered from the entity attributes, not from the database
schema.
