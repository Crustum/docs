# Entities

`class` `Crustum\JsonField\Model\Entity.JsonEntity`

While [Table Objects](database-basics.md) represent and provide access to a set of
rows, *entities* represent individual records. In this plugin an entity is a CakePHP
**Entity**: a **root entity** owns one or more JSON storage columns declared with
`#[JsonColumn]`, and the nested sub-entities inside those columns are **embedded entities**
that extend `JsonEntity`. Fields — including values at arbitrary JSON paths — are accessed
as properties or through `get`/`set`, exactly as in core CakePHP.

The standard entity topics are documented in the CakePHP
[Entities](https://book.cakephp.org/5/en/orm/entities.html) cookbook and behave identically
here: creating entities, `get`/`set`/`has`/`hasValue`/`patch`, accessors & mutators, virtual
fields, `isDirty`/`getOriginal`/`clean`, validation errors, mass assignment, `isNew`,
traits, and `toArray`/`json_encode`. This page covers only the **differences** the plugin
introduces on top of that baseline.

## Creating Entity Classes

By convention entity classes live in **src/Model/Entity/**. A root entity applies the
`#[JsonColumn]` attribute and uses `JsonFieldTrait` for path-string access:

```php
// src/Model/Entity/Article.php
namespace App\Model\Entity;

use Cake\ORM\Entity;
use Crustum\JsonField\Database\Schema\Attribute\JsonColumn;
use Crustum\JsonField\Model\Entity\JsonFieldTrait;

#[JsonColumn('data')]
class Article extends Entity
{
    use JsonFieldTrait;
}
```

> [!NOTE]
> If you don't define an entity class CakePHP uses the generic `Cake\ORM\Entity`. The
> class is derived from the table alias (`App\Model\Entity\<Alias>`). Embedded sub-entities
> produced by hydration default to `Crustum\JsonField\Model\Entity\JsonEntity` unless an
> embed entity class is declared on the `#[JsonEmbed]`.

### Embedded Entity Classes

A nested entity stored inside a JSON column is a `JsonEntity` subclass. It carries no schema
of its own and holds an `embeddedParent` back-pointer (`JsonFieldTrait::getEmbeddedParent()`,
`::isEmbedded()`), so save and delete calls route down to the owning JSON column:

```php
// src/Model/Entity/ArticleProfile.php
namespace App\Model\Entity;

use Crustum\JsonField\Database\Schema\Attribute\JsonPathType;
use Crustum\JsonField\Model\Entity\JsonEntity;

#[JsonPathType('created', type: 'datetime')]
#[JsonPathType('price', type: 'decimal')]
class ArticleProfile extends JsonEntity
{
}
```

Link the embed to the root entity with `#[JsonEmbed]`:

```php
#[JsonColumn('data')]
#[JsonEmbed(property: 'profile', documentClass: ArticleProfile::class, path: 'data->profile')]
class Article extends Entity
{
    use JsonFieldTrait;
}
```

### Creating Entities

Use `newEntity()` / `newEmptyEntity()` as usual (see the cookbook). The JSON storage column
is just another field, passed as a plain array; nested arrays under a `#[JsonColumn]` are
hydrated into `JsonEntity` subtrees when read back, and you can also attach `JsonEntity`
instances directly in memory:

```php
$article = $articles->newEntity([
    'title' => 'New Article',
    'data' => ['profile' => ['name' => 'Jane']],
]);
```

## Accessing Entity Data

Object notation, `get()`/`set()`/`has()`/`hasValue()`/`patch()` all work as documented in the
CakePHP cookbook. The plugin adds one extension — **path-string access** — via
`JsonFieldTrait`:

### Path-String Access

Add `JsonFieldTrait` to a root entity for `column->node` (or `node@column`) sugar over the
standard Entity API. Non-path calls pass through unchanged, so ordinary CakePHP usage is
untouched:

```php
$article->get('data->profile->name');
$article->set('data->profile->name', 'Patrick');
$article->isDirty('data->profile->name');
```

Path access resolves in pure PHP against the already-fetched JSON tree — no SQL is issued.
Writes initialize missing columns and build nested arrays as needed, even on a fresh entity.
`has()` and `hasValue()` accept a path string too:

```php
$article->has('data->profile->name');     // true when the path exists
$article->hasValue('data->profile->name'); // true when the nested value is non-empty
```

To remove a node, `unset()` accepts a path as well, marking the owning embed dirty so the
change routes to an atomic JSON-column write:

```php
$article->unset('data->profile->name');
```

## Accessors & Mutators

Accessors (`_get*`), mutators (`_set*`), and virtual fields follow the standard CakePHP
convention and are documented in the cookbook. The only difference: they apply **at every
nested layer**. An accessor declared on an embedded entity (`_getName()` on `ArticleProfile`)
intercepts `$article->profile->name` the same way one on the root entity intercepts
`$article->title` — accessors, mutators, and virtual fields all work per embed.

> [!WARNING]
> Accessors run when entities are persisted, so a mutator that formats data will persist the
> formatted value. Use virtual fields for derived values you do not want stored — this applies
> to embedded entities exactly as to root entities.

## Checking if an Entity Has Been Modified

`isDirty()`, `getOriginal()`, `clean()`, `setDirty()`, `getDirty()`, and the `markClean`
instantiation option behave as in core CakePHP (see the cookbook). Two plugin extensions:

- **Path-string dirty check** — `isDirty('data->profile->name')` walks down to the owning
  nested entity and reports whether the leaf is dirty.
- **Embedded dirty propagation** — because embedded entities carry an `embeddedParent`
  back-pointer, a change deep inside a nested entity marks the root entity's *embed property*
  dirty (e.g. `profile`, never the whole column). That makes `Table::save()` dispatch
  `Model.beforeSave`, where the change is routed down to an atomic JSON-column write:

```php
// Add a chapter and mark the embed property as changed.
$article->chapters[] = $newChapter;
$article->setDirty('chapters', true);
```

## Validation Errors

After you [save an entity](saving-data.md), validation errors are stored on the entity and
read with `getErrors()` / `getError()` / `hasErrors()` / `setErrors()` (see the cookbook).
The plugin-specific part: an embedded validator configured on a `JsonFieldEmbed` association
runs during save and throws on invalid nested data before it is written (see
[Associations](associations.md)).

## Mass Assignment

`_accessible`, `setAccess()`, the `guard` option on `set()`, and `isNew()` / `setNew()` follow
the core rules (see the cookbook). The plugin-specific note:

> [!NOTE]
> The `data` column itself is mass-assignable as a unit; if you need finer control over
> individual JSON paths, marshal them explicitly rather than trusting the request array. The
> standard `_accessible` map still governs the top-level keys.

## Lazy Loading References

Embedded associations (`JsonFieldHasOne` / `JsonFieldHasMany`) are hydrated automatically on
every find — the data lives inside the parent row's JSON column, so there is nothing to lazy
load. Reference associations (`JsonFieldBelongsTo` / `JsonFieldBelongsToMany`), by contrast,
only store a foreign key, so you resolve them on demand with `loadJsonReferences()` on the
table:

```php
$article = $articles->get(1);
$articles->loadJsonReferences([$article]);   // author and tags are resolved
echo $article->author->username;
```

You can also eager-load references during hydration with `eagerLoadJsonReferences($query)`, or
add a real SQL join with `joinJsonReference($query, $name)` (see
[Associations](associations.md)). Unlike embedded data, a reference is not present until you
resolve it.

## Creating Re-usable Code with Traits

PHP traits work as in core CakePHP (see the cookbook). The plugin ships two: `JsonFieldTrait`
(path-string access for root entities) and `JsonEntity` (the embedded base class, which
already uses `JsonFieldTrait`). Application traits belong in **src/Model/Entity** and are
conventionally suffixed with `Trait`.

## Converting to Arrays/JSON

`toArray()` and `json_encode()` follow the core rules for virtual/hidden fields (see the
cookbook). The plugin-specific behavior:

- **Embedded sub-entities are serialized recursively** — a hydrated `profile` or `chapters`
  embed appears in the output as nested arrays.
- **References are included only if you resolved them first** with `loadJsonReferences()` /
  `eagerLoadJsonReferences()`; otherwise `author` / `tags` are absent from the export.

## Storing Complex Types

Accessor & mutator methods are not intended to contain the logic for serializing and
unserializing complex data. Per-path type casting is handled by the `JsonTypeMap`, built from
`#[JsonPathType]` attributes on your embedded entities (or registered programmatically).
Declaring a type restores the correct PHP representation when the value is read and casts it
back on write:

```php
#[JsonPathType('created', type: 'datetime')]
#[JsonPathType('price', type: 'decimal')]
class ArticleProfile extends JsonEntity
{
}
```

Values at typed paths become real `Cake\I18n\DateTime` / `decimal` strings on read and are cast
back through `toDatabase` on save; core `JsonType` still handles the whole-column
encode/decode. Nested sub-entities themselves are the "complex types" — each `#[JsonEmbed]`
declaration hydrates its slice of the JSON column into a dedicated `JsonEntity` subclass, so an
entity can nest arbitrarily deep while keeping per-layer accessors, virtual fields, and dirty
tracking intact.
