# Declaring the Schema

In CakePHP the "schema" usually means the database `TableSchema` — columns, types,
indexes, and constraints — introspected or defined for a table (see the
[CakePHP Schema System](https://book.cakephp.org/5/en/orm/schema-system.html)
cookbook). This plugin adds a **second, entity-centric schema layer** that describes
the *shape of the JSON living inside* those columns: which paths exist, what PHP type
each holds, and how columns relate to nested entities and foreign keys. It is derived
from PHP attributes on your entity classes and has no effect on the database DDL.

## The Attributes

All four are read once by `JsonSchemaReader`:

- `#[JsonColumn]` — on a **root entity**, repeatable per JSON column. Names which
  columns hold path-addressable JSON (`data`, `meta`, …).
- `#[JsonEmbed]` — on a **root entity**, repeatable per embed. Links a JSON path to an
  embedded entity class; `type: 'one'` (default) or `'many'`. The embed class declares
  its own fields relative to itself.
- `#[JsonPathType]` — on an **embedded entity** (or the root), repeatable per field,
  with a path **relative to the embed**. Declares the PHP type for that path.
- `#[JsonReference]` — on a **root entity**, repeatable per reference. Links a JSON path
  to a target `Table` class and stores a foreign key (scalar or array) there.

```php
#[JsonColumn('data')]
#[JsonEmbed(property: 'profile', documentClass: ArticleProfile::class, path: 'data->profile')]
#[JsonEmbed(property: 'chapters', documentClass: ArticleChapter::class, path: 'data->chapters', type: 'many')]
#[JsonReference(property: 'author', target: UsersTable::class, path: 'data->author_id')]
class Article extends Entity
{
    use JsonFieldTrait;
}
```

The full attribute options (and how they map to each association family) are in
[Associations](associations.md).

## JsonSchemaReader

`Crustum\JsonField\Database.Schema.JsonSchemaReader` reflects a root entity class once,
walks its embeds, and builds a cached, engine-neutral `JsonTypeMap`:

- `read($class)` returns the `JsonTypeMap`, prefixing each relative `#[JsonPathType]`
  path on an embed with the embed's absolute path (e.g. `data->profile->created`). The
  result is cached per class.
- `columns($class)` returns the JSON column names declared via `#[JsonColumn]`.
- `registerCaster($class, $path, $toPHP, $toDatabase)` attaches a programmatic per-path
  caster (attributes cannot carry closures) that merges into the map on the next
  `read()`. Useful for custom scalar marshalling outside any embed.
- `clearCache()` resets the reflection cache and registered casters.

Per-path types and casters — the `datetime`/`decimal`/… names and custom
`toPHP`/`toDatabase` callables — are covered in
[Database Basics](database-basics.md#data-types).

## How It Differs From Core

Core `TableSchema` describes *columns on a table*; this layer describes *paths inside a
JSON column* and the entities/foreign keys they map to. The two are complementary: you
still declare the JSON column itself with the normal `json`/`jsonb` type in a migration,
while these attributes describe what lives inside it.
