# Query Builder

The query builder is the standard CakePHP `Cake\ORM\Query` — `find()`, `where()`,
`select()`, `orderBy()`, `limit()`, `groupBy()`, `having()`, `func()`, expression
objects, `formatResults()`, `contain()`, and so on all work exactly as documented in the
CakePHP [Query Builder](https://book.cakephp.org/5/en/orm/query-builder.html) cookbook.

This plugin adds **no new query object** and changes **no existing method**. The only
additions are a set of JSON-path helper methods exposed by `JsonFieldAwareTrait` (apply it
to a Table that owns path-addressable JSON columns) and one join helper for JSON foreign
keys. Every helper emits the engine-native extract expression on the normal connection —
there is no connection clone and no driver swap.

## What Is Added

Apply the trait to your Table:

```php
class ArticlesTable extends Table
{
    use JsonFieldAwareTrait;
}
```

Then use the helpers (full reference in
[Database Basics](database-basics.md#querying-json-paths)):

```php
// Filter / order / aggregate by a JSON path
$articles->whereJsonPath('data->author_id', 2);
$articles->whereJsonPath('data->score', 9.0, '>=');
$articles->whereJsonPathIn('data->tag_ids', [1, 2, 3]);
$articles->whereJsonPathElemMatch('data->chapters', ['name' => 'Intro']);
$articles->orderByJsonPath('data->score', 'DESC');
$articles->aggregateJsonPath('COUNT', 'data->chapters');

// Raw extract expression composing with the full QueryExpression API
$articles->find()->where(fn ($exp) => $exp->eq(
    $articles->extractJsonPath('data->author_id'), 2, 'integer'
));

// Rewrite raw JSON-path string conditions already on the query
$query = $articles->find()->where(['data->author_id' => 2]);
$articles->findJsonField($query);

// Join on a JSON foreign key to filter/order by the related table
$query = $articles->find();
$articles->joinJsonReference($query, 'author');
$query->where(['jf_author.username' => 'bob']);
```

## What Is Unchanged

Everything else is core CakePHP:

- `contain()` eager-loads *classic* table associations as normal; it is simply not needed
   for embedded sub-entities (those hydrate from the column automatically) and does not
  apply to JSON-FK references (use `eagerLoadJsonReferences()` /
  `loadJsonReferences()` instead — see [Retrieving Data](retrieving-data-and-resultsets.md)).
- `insertQuery()` / `updateQuery()` / `deleteQuery()` are unchanged; for atomic JSON path
  writes prefer `Table::save()` (the behavior routes nested changes), or build the
  expression with `jsonFieldEngine()->set()` for bulk updates.
- Result sets, `formatResults()`, caching, and pagination behave exactly as in core.
