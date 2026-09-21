# Retrieving Data

The standard `Table::find()` / `get()` / `first()` / `all()` flow applies unchanged.
What differs is how JSON-column data is hydrated and how you query it.

For marshalling, pagination, `formatResults`, and the standard query builder methods
(`where`, `select`, `orderBy`, `contain`, …) see the CakePHP
[Retrieving Data & Resultsets](https://book.cakephp.org/5/en/orm/retrieving-data-and-resultsets.html)
cookbook — only the JSON-specific items are described here.

## Embedded Entities Are Hydrated Automatically

The behavior installs a `JsonFieldResultSet` for every query. As each row hydrates,
every `#[JsonEmbed]` decoded array becomes a nested `JsonEntity` (or your declared
embed class) with the `embeddedParent` back-pointer set, and per-path `toPHP` casting
is applied. Because the data is part of the parent row, **there is no `contain()` for
embeds** — the nested entity is always present after a find:

```php
$article = $articles->get(1);
$article->profile->name;        // ArticleProfile entity
$article->chapters[0]->title;   // list of ArticleChapter entities
```

## References Are Not Hydrated Automatically

A `JsonFieldBelongsTo` / `JsonFieldBelongsToMany` reference only stores a foreign key
in JSON, so the related row is not loaded on find. Resolve it explicitly by one of:

- `loadJsonReferences($entities)` — resolves every declared reference after the fact
  (the `contain()` equivalent for JSON foreign keys).
- `eagerLoadJsonReferences($query, $names)` — registers a `formatResults` formatter so
  resolution happens during hydration.
- `joinJsonReference($query, $name)` — adds a real SQL `JOIN` so you can filter or
  order by the related table's columns.

```php
$articles = $articles->find()->all();
$articles->loadJsonReferences($articles);
$articles->first()->author->username;
```

## Querying JSON Paths

All query helpers emit engine-native extract expressions on the normal connection — no
driver swap. Conditions compare in scalar form across every driver; numeric comparisons
are wrapped in an engine-native numeric cast automatically. The full list lives in
[Database Basics](database-basics.md#querying-json-paths); the key ones:

```php
$articles->whereJsonPath('data->author_id', 2);
$articles->whereJsonPath('data->score', 9.0, '>=');
$articles->whereJsonPathIn('data->tag_ids', [1, 2, 3]);
$articles->whereJsonPathNull('data->missing');
$articles->orderByJsonPath('data->score', 'DESC');
$articles->whereJsonPathElemMatch('data->chapters', ['name' => 'Intro']);

// Raw extract expression composing with the full QueryExpression API:
$articles->find()->where(fn ($exp) => $exp->eq(
    $articles->extractJsonPath('data->author_id'), 2, 'integer'
));

// Opt-in rewrite of raw JSON-path string conditions already on the query:
$query = $articles->find()->where(['data->author_id' => 2]);
$articles->findJsonField($query);
```

## Filtering by Reference (Associated) Data

Unlike classic associations, there is no `matching()` for JSON foreign keys. To filter
by the related table's columns, use `joinJsonReference()` and qualify the related table
with its `jf_<name>` alias:

```php
$query = $articles->find();
$articles->joinJsonReference($query, 'author');
$results = $query->where(['jf_author.username' => 'bob'])->all();
```

Or resolve with `loadJsonReferences()` and filter in PHP:

```php
$articles = $articles->find()->whereJsonPathIn('data->author_id', [2])->all();
$articles->loadJsonReferences($articles);
```

## Eager Loading

Embedded data needs no eager loading (it is in the row). For references, prefer
`eagerLoadJsonReferences($query)` over `loadJsonReferences()` when you want resolution
folded into hydration:

```php
$query = $articles->find();
$articles->eagerLoadJsonReferences($query, ['author', 'tags']);
```
