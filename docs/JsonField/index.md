# CakePHP JsonField Plugin

<a name="introduction"></a>
## Introduction

Relational databases let you store structured data inside JSON columns, but querying and hydrating that data with the ORM is cumbersome: values live at arbitrary paths inside the column, types are lost once encoded, and updating a single nested key usually means rewriting the whole column.

The **JsonField** plugin treats a JSON column as a *nested-entity store* inside your CakePHP application. A path is a first-class address into a JSON column — `data->profile->name`, `attributes->items[*].sku` — and the plugin supports paths everywhere you need them:

- **Reads** — filter, order, and compare against path values in SQL; hydrate nested entities into real entities.
- **Writes** — marshal and cast per-path types, then persist changes as atomic, engine-native path updates instead of whole-column re-encodes.
- **Associations** — embed entities inside a column, or store foreign keys inside JSON and join related tables.

Schema and types are declared declaratively with PHP attributes on your entity classes, so your entities stay metadata-free and configuration is derived once, not parsed per query.

<a name="supported-engines"></a>
#### Supported Engines

By default, the plugin includes three server-side engine adapters: PostgreSQL, MySQL, and SQLite. The active engine is resolved automatically from the connection's driver — there is no connection cloning or driver swapping. All other layers (paths, schema, hydration, casting, associations) are engine-neutral.

<a name="quickstart"></a>
## Quickstart

### Installing the Plugin

Install via Composer:

```bash
composer require crustum/cakephp-json-field
```

> [!NOTE]
> This plugin should be registered in your `config/plugins.php` file.

```bash
bin/cake plugin load Crustum/JsonField
```

Alternatively, you can load the plugin in your `Application.php`:

```php
// In src/Application.php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/JsonField');
}
```

<a name="next-steps"></a>
#### Next Steps

Once installed, define your entities with the [schema attributes](#defining-the-schema), attach the behavior to your Table ([Setting Up the Table](#setting-up-the-table)), and start [querying JSON paths](#querying-json-paths).

#### In-Depth Guides

The single-page overview above is complemented by dedicated references, structured like the CakePHP cookbook. The first three cover the full plugin surface; the last four are short delta docs focused only on what changes from core CakePHP for JSON:

<a name="concept-overview"></a>
## Concept Overview

CakePHP's ORM stores JSON columns as opaque decoded arrays. The JsonField plugin reshapes that model into a nested-entity one built entirely on CakePHP 5 primitives (`TYPE_JSON`, `JsonType`, `FunctionsBuilder::jsonValue()`).

<a name="json-columns-as-documents"></a>
### JSON Columns as Entities

- A **root entity** (e.g. `Article`) is a normal CakePHP entity. It owns one or more **JSON storage columns** (e.g. `data`, `meta`) declared via the `#[JsonColumn]` attribute. The column is just *where* the entity's data lives — not the center of the design.
- A **JSON column holds nested entities (embeds)**. An embed is a first-class entity carrying an `embeddedParent` back-pointer, so a change deep inside a nested entity routes down to an atomic column write.
- Schema and type declarations are **attributes on entities**: `#[JsonColumn]` marks storage columns, `#[JsonEmbed]` links a path to an embed class, `#[JsonPathType]` declares per-path field types, and `#[JsonReference]` declares foreign keys stored inside JSON.

<a name="path-notation"></a>
### Path Notation

Paths address values inside a JSON column. Two equivalent spellings are accepted everywhere:

| Notation | Example | Notes |
|----------|---------|-------|
| Arrow | `data->profile->name` | Canonical form |
| At | `name@data->profile` | Value-first variant |
| Array index | `data->items[0].sku` | Numeric index |
| Array joker | `data->items[*].sku` | Matches any element |

The `Model.` prefix may be included (`Articles.data->note`) and is stripped automatically.

<a name="using-example-application"></a>
### Using an Example Application

Before diving into each component, let's take a high-level overview using an article as an example. Our `articles` table has a JSON column `data` holding an embedded author profile:

```json
{
    "profile": {"name": "Jane", "created": "2024-01-01T00:00:00+00:00"},
    "note": "featured"
}
```

First we declare the entity shape on the entity:

```php
<?php
declare(strict_types=1);

namespace App\Model\Entity;

use Cake\ORM\Entity;
use Crustum\JsonField\Database\Schema\Attribute\JsonColumn;
use Crustum\JsonField\Database\Schema\Attribute\JsonEmbed;
use Crustum\JsonField\Model\Entity\JsonFieldTrait;

#[JsonColumn('data')]
#[JsonEmbed(property: 'profile', documentClass: ArticleProfile::class, path: 'data->profile')]
class Article extends Entity
{
    use JsonFieldTrait;
}
```

Then we can read and write deeply nested values directly, hydrate `profile` into an `ArticleProfile` entity automatically, filter queries by any path, and save changes to a single nested key without touching the rest of the column:

```php
$article = $articles->get(1);

$article->set('data->profile->name', 'Patrick');
$articles->save($article);
```

<a name="defining-the-schema"></a>
## Defining the Schema

Schema declarations are PHP attributes placed on entity classes. The `JsonSchemaReader` reflects a root entity class once, traverses embeds, and builds a cached, engine-neutral `JsonTypeMap` — no per-query string parsing.

<a name="the-jsoncolumn-attribute"></a>
### The `JsonColumn` Attribute

Place on a **root entity**, repeatable per JSON column. It names which columns hold path-addressable JSON:

```php
#[JsonColumn('data')]
#[JsonColumn('meta')]
class Article extends Entity
{
}
```

<a name="the-jsonembed-attribute"></a>
### The `JsonEmbed` Attribute

Place on a **root entity**, repeatable per embed. It links a JSON path to an embedded entity class whose own fields are declared relative to itself:

```php
#[JsonEmbed(property: 'profile', documentClass: ArticleProfile::class, path: 'data->profile')]
#[JsonEmbed(property: 'chapters', documentClass: ArticleChapter::class, path: 'data->chapters', type: 'many')]
class Article extends Entity
{
}
```

The `type` argument selects the cardinality: `one` (default) hydrates a single embedded entity, `many` hydrates a list of embedded entities.

<a name="the-jsonpathtype-attribute"></a>
### The `JsonPathType` Attribute

Place on an **embedded entity**, repeatable per field, with a path **relative to the embed**. Declared types drive marshalling and per-path casting at both ends of the persistence boundary:

```php
use Crustum\JsonField\Database\Schema\Attribute\JsonPathType;
use Crustum\JsonField\Model\Entity\JsonEntity;

#[JsonPathType('created', type: 'datetime')]
#[JsonPathType('price', type: 'decimal')]
class ArticleProfile extends JsonEntity
{
}
```

`JsonSchemaReader::read(Article::class)` prefixes each relative path with the embed's absolute path, yielding a type map keyed by full paths such as `data->profile->created`. Absolute `#[JsonPathType]` declarations placed directly on the root entity are honored as well.

Any TypeFactory type name may be used (`datetime`, `date`, `decimal`, `integer`, `boolean`, …).

<a name="programmatic-type-maps"></a>
### Programmatic Type Maps

When attributes are not enough, a `JsonTypeMap` can be populated programmatically. Each path accepts either a TypeFactory type name or a per-operation callable, supporting three operations: `marshal` (request data → PHP), `toPHP` (database → PHP result casting), and `toDatabase` (PHP → database writes):

```php
use Crustum\JsonField\Database\JsonTypeMap;

$typeMap = new JsonTypeMap();
$typeMap->addJsonType('data->profile->price', ['decimal']);
```

<a name="entities-and-embeds"></a>
## Entities and Embeds

<a name="the-jsonentity-class"></a>
### The `JsonEntity` Class

`Crustum\JsonField\Model\Entity\JsonEntity` is a generic, metadata-free nested entity. During hydration every `#[JsonEmbed]` decoded array becomes a `JsonEntity` subtree carrying an `embeddedParent` back-pointer to its owning association. Your own embed classes typically extend it:

```php
use Crustum\JsonField\Model\Entity\JsonEntity;

class ArticleProfile extends JsonEntity
{
}
```

Because children know their parents, dirty tracking propagates upward automatically: setting a value inside a nested entity marks the root entity dirty so `Table::save()` dispatches the persistence flow.

<a name="path-string-access"></a>
### Path String Access

Add the `Crustum\JsonField\Model\Entity\JsonFieldTrait` to a root entity to gain path-string sugar over the standard Entity API. Non-path calls pass through unchanged, so ordinary CakePHP usage is untouched:

```php
$article->get('data->profile->name');
$article->set('data->note', 'featured');
$article->isDirty('data->note');
```

Path access resolves in pure PHP against the already-fetched JSON tree — no SQL is issued. Writes initialize missing columns and build nested arrays as needed, even on a fresh entity.

<a name="setting-up-the-table"></a>
## Setting Up the Table

Tables gain JSON-path awareness by composing `Crustum\JsonField\ORM\JsonFieldAwareTrait` into any `Table`. Attach the `Crustum/JsonField.JsonField` behavior to enable hydration of embeds and the save routing:

```php
<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Crustum\JsonField\ORM\JsonFieldAwareTrait;

class ArticlesTable extends Table
{
    use JsonFieldAwareTrait;

    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->addBehavior('Crustum/JsonField.JsonField');
    }
}
```

The trait composes cleanly into an existing `Table` hierarchy — no base class required.

<a name="reading-data"></a>
## Reading Data

<a name="hydration-of-embeds"></a>
### Hydration of Embeds

On every find, the behavior installs a `JsonFieldResultSet` for that query. As each row hydrates, every `#[JsonEmbed]` decoded array is converted into its declared embed entity with the `embeddedParent` back-pointer set, and per-path `toPHP` casting is applied when a type is registered for the full path:

```php
$article = $articles->get(1);
$article->profile->name;      // ArticleProfile entity, parent-aware
$article->chapters[0]->title; // HasMany embed list
```

Entities without `#[JsonEmbed]` declarations pass through untouched, so the behavior is safe to attach broadly.

<a name="per-path-type-casting"></a>
### Per-Path Type Casting

Values living at typed paths are converted between PHP and database representations using the `JsonTypeMap`: `toPHP` casts results (e.g. `data->profile->created` becomes a `Cake\I18n\DateTime`), while `marshal` and `toDatabase` drive request marshalling and persistence. Core `JsonType` still handles the whole-column encode/decode; `JsonTypeMap` handles only the per-path transforms layered on top.

<a name="querying-json-paths"></a>
## Querying JSON Paths

All query helpers emit the engine-native extract expression on the normal connection — no connection clone, no driver swap. Conditions compare in scalar form across every driver, and numeric comparisons are wrapped in an engine-native numeric cast automatically.

<a name="filtering-by-path"></a>
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

Comparison operators supported by `whereJsonPath()` are `=`, `!=`, `>`, `>=`, `<`, and `<=`.

<a name="ordering-by-path"></a>
### Ordering by Path

```php
$articles->orderByJsonPath('data->score', 'DESC');
```

<a name="raw-extract-expressions"></a>
### Raw Extract Expressions

For conditions beyond the helpers, `extractJsonPath()` returns the engine-native expression so it composes with the full QueryExpression API:

```php
$articles->find()
    ->where(fn ($exp) => $exp
        ->eq($articles->extractJsonPath('data->author_id'), 2, 'integer')
        ->like($articles->extractJsonPath('data->note'), 'feat%'))
    ->orderByDesc($articles->extractJsonPath('data->score'));
```

<a name="the-jsonfield-finder"></a>
### The `jsonField` Finder

The opt-in `jsonField` finder rewrites raw JSON-path string conditions already present on a query's WHERE and ORDER BY clauses into extract expressions:

```php
$query = $articles->find()->where(['data->author_id' => 2]);
$articles->findJsonField($query);
```

> [!IMPORTANT]
> Conditions must be attached **before** the finder runs. For fluent `->where()` chaining after building a query, prefer [`extractJsonPath()`](#raw-extract-expressions) or the [`whereJsonPath*`](#filtering-by-path) builders.

<a name="writing-data"></a>
## Writing Data

The behavior routes changes made through nested entities or path strings to the database on `Model.beforeSave`. Two strategies apply, chosen per entity state:

<a name="whole-column-writes"></a>
### Whole Column Writes

A **new entity**, or one whose JSON storage column is itself dirty, is written as a whole column. Each embed is exported into the column array, every typed leaf passes through its per-path `toDatabase` caster, and unrelated keys in the column are preserved. Core `JsonType` encodes the result.

```php
$article = $articles->newEmptyEntity();
$article->set('data->profile->name', 'Jane');
$articles->save($article);
```

<a name="atomic-path-updates"></a>
### Atomic Path Updates

An **existing entity** with dirty nested-embed fields is persisted with atomic, engine-native `set()` expressions scoped to the single changed path. All other JSON keys in the column remain untouched:

```sql
-- PostgreSQL
UPDATE articles SET data = jsonb_set(data, '{profile,name}', to_jsonb('Patrick'), true) WHERE id = 1;
-- MySQL
UPDATE articles SET data = JSON_SET(data, '$.profile.name', CAST(? AS JSON)) WHERE id = 1;
-- SQLite
UPDATE articles SET data = json_set(data, '$.profile.name', json(?)) WHERE id = 1;
```

Dirty tracking bubbles up from the deepest changed leaf, so saving after a single nested change issues exactly one targeted update.

<a name="json-foreign-keys"></a>
## JSON Foreign Keys

Beyond embedding nested entities, a JSON path may hold a **foreign key** (a scalar id, or an array of ids) pointing at another table. The reference family resolves these keys against the target Table without storing anything outside the JSON column.

<a name="declaring-references"></a>
### Declaring References

Place `#[JsonReference]` on a **root entity**, repeatable per reference. The `target` argument accepts a fully-qualified target Table class or registry alias; `type: 'many'` expects an array of ids:

```php
use App\Model\Table\UsersTable;
use Crustum\JsonField\Database\Schema\Attribute\JsonReference;

#[JsonColumn('data')]
#[JsonReference(property: 'author', target: UsersTable::class, path: 'data->author_id')]
#[JsonReference(property: 'tags', target: TagsTable::class, path: 'data->tag_ids', type: 'many')]
class Article extends Entity
{
}
```

<a name="loading-references"></a>
### Loading References

After fetching entities, resolve all declared references onto them. Each target Table is queried once per reference and matched rows are assigned to the root entities' properties:

```php
$articles = $this->Articles->find()->all();
$this->Articles->loadJsonReferences($articles);

$articles->first()->author->name;
```

Missing foreign keys resolve gracefully to `null` (single) or an empty set (many). Use `jsonFieldReferences()` to introspect the built reference associations.

<a name="joining-on-a-json-foreign-key"></a>
### Joining on a JSON Foreign Key

To filter or order by columns of the related table, add a real SQL join whose condition compares the stored key (via the engine's extract expression) against the target table's primary key:

```php
$query = $this->Articles->find();
$this->Articles->joinJsonReference($query, 'author');

$results = $query->orderBy(['jf_author.name' => 'ASC'])->all();
```

The join runs on the normal connection using the engine adapter's native expression — `JSONB_PATH_QUERY` on PostgreSQL, `JSON_EXTRACT` on MySQL and SQLite.

<a name="engine-adapter-system"></a>
## Engine Adapter System

The plugin resolves a small engine adapter from the active connection driver and funnels every SQL concern through it. Everything else — paths, schema reading, hydration, casting, associations — is shared, engine-neutral code.

| Engine | `extract` | `set` | `cast` |
|--------|-----------|-------|--------|
| **PostgreSQL** | `JSON_VALUE` → core rewrites to `JSONB_PATH_QUERY(col::jsonb, '$.a.b')` | `jsonb_set(col, '{a,b}', to_jsonb(v), true)` | `to_jsonb(v)` |
| **MySQL** | `JSON_EXTRACT(col, '$.a.b')` | `JSON_SET(col, '$.a.b', CAST(v AS JSON))` | `CAST(v AS JSON)` |
| **SQLite** | `JSON_VALUE` → core rewrites to `json_extract(col, '$.a.b')` | `json_set(col, '$.a.b', json(v))` | `json(v)` |

To support another backend, implement `Crustum\JsonField\Database\JsonFieldEngineInterface` (`extractValue()`, `set()`, `cast()`) and register a resolver — engine differences live in three small classes today, and your adapter slots into the same seam.
