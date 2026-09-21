# Table Objects

A Table in this plugin is a normal CakePHP `Table` — see the
[CakePHP Table Objects](https://book.cakephp.org/5/en/orm/table-objects.html) cookbook
for lifecycle callbacks, `initialize()`, behaviors, connections, and the `TableLocator`.
Two additions make a Table JSON-path aware:

## Attaching the Behavior

Any Table whose entities use `#[JsonColumn]` must attach the `JsonField` behavior so
embeds hydrate and saves route correctly:

```php
public function initialize(array $config): void
{
    parent::initialize($config);
    $this->addBehavior('Crustum/JsonField.JsonField');
}
```

## The JsonFieldAwareTrait

Compose `Crustum\JsonField.ORM.JsonFieldAwareTrait` into the Table to expose the
JSON-path API. It adds no new query object — every method emits engine-native extract
expressions on the normal connection. The key members:

- **Path query helpers** — `whereJsonPath()`, `whereJsonPathIn/NotIn/Like/Null/NotNull/
  Between`, `whereJsonPathElemMatch`, `whereJsonPathContains`, `whereJsonPathJson`,
  `orderByJsonPath`, `selectJsonPath`, `groupByJsonPath`, `havingJsonPath`,
  `aggregateJsonPath`, and the raw `extractJsonPath()`. See
  [Database Basics](database-basics.md#querying-json-paths).
- **Reference resolution** — `loadJsonReferences()`, `eagerLoadJsonReferences()`,
  `joinJsonReference()`, and `jsonFieldReferences()` (introspect built references). See
  [Associations](associations.md) and
  [Retrieving Data](retrieving-data-and-resultsets.md).
- **Engine access** — `jsonFieldEngine()` returns the resolved `JsonFieldEngineInterface`
  for atomic bulk writes. See [Saving Data](saving-data.md#bulk-updates).

The trait composes into an existing `Table` hierarchy with no base-class change:

```php
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

## Building Associations Programmatically

When you need to configure an association — for example attach an `embeddedValidator` —
use `Crustum\JsonField.ORM.JsonFieldAssociationBuilder`. `buildEmbeds($class, $table)`
and `buildReferences($class, $table)` reflect a root entity class and return the
association objects keyed by property name. The behavior and trait consume these
declarations automatically; you only reach for the builder to customize one. See
[Associations](associations.md).
