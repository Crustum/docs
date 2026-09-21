# Deleting Data

The standard `Table::delete()` / `deleteOrFail()` / `deleteAll()` flow applies
unchanged. Only the JSON-specific consequences are described here; for the full
behavior see the CakePHP
[Deleting Data](https://book.cakephp.org/5/en/orm/deleting-data.html) cookbook.

Embedded entities live *inside* the parent's JSON column, so deleting and references
behave differently from classic associations.

## Deleting a Root Entity

Deleting the root entity removes its whole row, including the JSON storage column. Any
embedded sub-entities go with it — there is no separate cascade step, because the embed
data is part of the column.

```php
$articles->delete($articles->get(1));   // drops data, profile, chapters, …
```

## Removing an Embedded Child

To remove a single nested entity without deleting the parent, call `delete()` on the
embedded entity. It uses the `embeddedParent` back-pointer to drop the element from the
parent's list (or null the `JsonFieldHasOne` property) and marks the embed property
dirty, so saving the parent issues the rewrite:

```php
$article = $articles->get(1);
$article->chapters[0]->delete();   // removes the first chapter in memory
$articles->save($article);          // atomic rewrite of data->chapters
```

You can also drop a whole embed with the path API:

```php
$article->unset('data->profile');
$articles->save($article);
```

## Removing a JSON-FK Reference

A reference is only a foreign key stored in JSON. "Unlinking" means clearing that key and
saving the parent — there is no `unlink()` method:

```php
$article->set('data->author_id', null);      // or $article->author = null;
$articles->save($article);

$article->set('data->tag_ids', []);
$articles->save($article);
```

## Bulk Deletes

`deleteAll()` executes a single `DELETE` and bypasses the behavior. It removes root rows
only; JSON foreign keys stored in *other* rows are unaffected, exactly as with classic
foreign keys. If you need to also clear JSON foreign keys pointing at the removed rows,
do it with an explicit update first (see [Saving Data](saving-data.md#bulk-updates)):

```php
$articles->deleteAll(['id' => $ids]);
```
