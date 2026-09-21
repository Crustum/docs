# Saving Data

The standard `Table::save()` / `saveMany()` / `saveOrFail()` flow applies unchanged.
What differs is that the `JsonField.JsonField` behavior (attached to your Table) hooks
`Model.beforeSave` and routes JSON-embed changes down to the storage column. Two
strategies apply, chosen per entity state:

- **Whole column write** — a new entity, or one whose JSON storage column is itself
  dirty, is written as a whole column. Each embed is exported, per-path `toDatabase`
  casters are applied, and unrelated JSON keys are preserved.
- **Atomic path update** — an existing entity with only dirty nested-embed fields is
  persisted with engine-native `set()` expressions scoped to the changed path, leaving
  the rest of the column untouched.

Everything below describes only these JSON-specific behaviors; for marshalling,
validation, `associated` options, `beforeMarshal`/`afterMarshal`, mass assignment, and
`saveOrFail`/`saveMany`/`findOrCreate`, see the standard CakePHP
[Saving Data](https://book.cakephp.org/5/en/orm/saving-data.html) cookbook.

## Saving Embedded Entities

Embedded entities are part of the parent's JSON column, so you never save them
directly — you modify the embed property (or a JSON path) on the root entity and save
the root:

```php
$article = $articles->get(1);
$article->profile->title = 'Updated';
$articles->save($article);   // atomic set on data->profile->title
```

Path-string access gives the same result:

```php
$article->set('data->profile->title', 'Updated');
$articles->save($article);
```

A new entity (or one whose `data` column is dirty) writes the whole column instead.

## Adding and Removing Embedded Children

For a `JsonFieldHasMany` embed, append to the list property and save:

```php
$article->chapters[] = new ArticleChapter(['name' => 'Intro']);
$articles->save($article);
```

Remove a child through its `delete()` method — it uses the `embeddedParent` back-pointer
to drop the element from the parent's list and mark the embed property dirty:

```php
$article->chapters[0]->delete();
$articles->save($article);
```

You can also drop a whole embed with the path API:

```php
$article->unset('data->profile');
$articles->save($article);
```

### Embedded validators

A `JsonFieldEmbed` association can carry an `embeddedValidator` callable, invoked for
each child before persistence. Configure it on the association object built by
`JsonFieldAssociationBuilder` (see [Associations](associations.md)).

### List save strategy

`JsonFieldHasMany` (and `#[JsonEmbed]` with `type: 'many'`) honors a `saveStrategy`:
`replace` (default) rewrites the whole list; `append` keeps persisted rows and merges
the in-memory entities in by `idField`.

## Saving JSON-FK References

A `JsonFieldBelongsTo` / `JsonFieldBelongsToMany` reference stores a foreign key inside
JSON. Assign the target entity (or entities) — or a raw key / key list — to the
reference property and save the root; the behavior writes the key(s) into the declared
JSON path:

```php
$article->author = $users->get(3);          // or $article->set('data->author_id', 3);
$articles->save($article);                  // writes data->author_id = 3

$article->tags = [$tags->get(1), $tags->get(3)];
$articles->save($article);                  // writes data->tag_ids = [1, 3]
```

To unlink, clear the foreign key and save:

```php
$article->set('data->author_id', null);
$articles->save($article);
```

There is no `link()` / `unlink()` for JSON references — the foreign key *is* the link.

## Bulk Updates

`updateAll()` and the lower-level `updateQuery()` bypass the behavior, so they do **not**
apply per-path casting or atomic JSON writes. To issue an atomic path update in bulk,
build the expression with the resolved engine adapter:

```php
use Crustum\JsonField\Path\JsonPathParser;

$path = JsonPathParser::parse('data->profile->title');
$expr = $articles->jsonFieldEngine()->set($path, 'Updated');

$articles->updateQuery()
    ->set(['data' => $expr])
    ->where(['id' => 1])
    ->execute();
```

For most cases, load the entities and use `save()` so the behavior handles casting and
atomic writes.
