# Associations - Linking Entities Together

Defining relations between different objects in your application should be a
natural process. For example, an article may have many embedded chapters, and
belong to an author stored in another table. The JsonField plugin models two
families of association over a JSON column, mirroring the four classic CakePHP
association types:

| Relationship                 | Association Type | Example                                                          |
|------------------------------|------------------|------------------------------------------------------------------|
| one to one (embedded)        | `JsonFieldHasOne`    | An article has one profile inside its `data` JSON column.        |
| one to many (embedded)       | `JsonFieldHasMany`   | An article has many chapters inside its `data` JSON column.      |
| many to one (reference)      | `JsonFieldBelongsTo` | An article references one user via a key in its `data` column.   |
| many to many (reference)     | `JsonFieldBelongsToMany` | An article references many tags via a key list in `data`.    |

The two **embedded** associations (`JsonFieldHasOne` / `JsonFieldHasMany`) store
their data *inside the parent entity's JSON column* — the classic denormalization
pattern. The two **reference** associations (`JsonFieldBelongsTo` /
`JsonFieldBelongsToMany`) store a *foreign key* (a scalar id, or an array of ids)
inside the JSON column that is resolved against another Table.

Because JSON columns are addressable by path rather than by foreign-key column,
associations in this plugin are **declared with PHP attributes on the entity
class**, not with method calls inside `Table::initialize()`. The
`JsonFieldAssociationBuilder` reflects the entity and turns each `#[JsonEmbed]`
into a `JsonFieldHasOne`/`JsonFieldHasMany` and each `#[JsonReference]` into a
`JsonFieldBelongsTo`/`JsonFieldBelongsToMany`. The behavior and the `JsonFieldAwareTrait`
then consume those declarations automatically — you rarely construct the
association objects yourself.

```php
namespace App\Model\Entity;

use Cake\ORM\Entity;
use Crustum\JsonField\Database\Schema\Attribute\JsonColumn;
use Crustum\JsonField\Database\Schema\Attribute\JsonEmbed;
use Crustum\JsonField\Database\Schema\Attribute\JsonReference;
use Crustum\JsonField\Model\Entity\JsonFieldTrait;
use App\Model\Table\UsersTable;
use App\Model\Table\TagsTable;

#[JsonColumn('data')]
#[JsonEmbed(property: 'profile', documentClass: ArticleProfile::class, path: 'data->profile')]
#[JsonEmbed(property: 'chapters', documentClass: ArticleChapter::class, path: 'data->chapters', type: 'many', idField: 'uid')]
#[JsonReference(property: 'author', target: UsersTable::class, path: 'data->author_id')]
#[JsonReference(property: 'tags', target: TagsTable::class, path: 'data->tag_ids', type: 'many')]
class Article extends Entity
{
    use JsonFieldTrait;
}
```

Each attribute takes the association alias (its `property` name) as the key that
will hold the hydrated target on the parent entity. The `#[JsonEmbed]` links a
JSON path to an embedded entity class; the `#[JsonReference]` links a JSON path to
a target Table class. The `JsonFieldAssociationBuilder` reads the same attributes
the schema reader uses, so the type map and the associations stay consistent.

> [!NOTE]
> Embeds and references are declared per root entity, not per Table. A root entity
> is any `Entity` carrying a `#[JsonColumn]` plus one or more `#[JsonEmbed]` /
> `#[JsonReference]` attributes. The owning Table only needs the `JsonFieldAwareTrait`
> and the `Crustum/JsonField.JsonField` behavior (see [Database Basics](database-basics.md)).

You can introspect the built reference associations from a Table at any time:

```php
$references = $articles->jsonFieldReferences();
// ['author' => JsonFieldBelongsTo, 'tags' => JsonFieldBelongsToMany]
```

Embed associations are rebuilt internally by the behavior on each save; you obtain
a single embed association object through the builder when you need to configure it
programmatically (for example to attach an embedded validator):

```php
use Crustum\JsonField\ORM\Association\JsonFieldAssociationBuilder;

$embeds = (new JsonFieldAssociationBuilder())->buildEmbeds(Article::class, $articles);
$embeds['chapters']->setEmbeddedValidator(function (ArticleChapter|array $child): void {
    if (is_array($child) || $child->get('name') === 'bad') {
        throw new InvalidArgumentException('invalid chapter');
    }
});
```

## Loading Strategies

CakePHP's ORM loads associations with SQL joins or `IN` subqueries. Because the
data for an embedded association already lives inside the parent row's JSON column,
and a reference association stores only a key, the plugin ships two strategies.
They are fixed per family and control how many queries a read produces:

| Strategy     | Family            | Loading mechanism                                                                 | Extra queries |
|--------------|-------------------|-----------------------------------------------------------------------------------|---------------|
| `embed`      | `JsonFieldHasOne` / `JsonFieldHasMany` | Data is already in the parent JSON column; hydrated in place during row hydration. | 0             |
| `reference`  | `JsonFieldBelongsTo` / `JsonFieldBelongsToMany` | Eager read: the foreign key is read from the decoded JSON column, the target Table is queried once per reference (see `loadJsonReferences()` / `eagerLoadJsonReferences()`). | 1 per reference |
| `reference`  | `JsonFieldBelongsTo` / `JsonFieldBelongsToMany` | Join: a real SQL `JOIN` compares the stored key (via the engine's extract expression) against the target Table's primary key (see `joinJsonReference()`). | 0 extra (join) |

The strategy is encoded as the `STRATEGY_EMBED` / `STRATEGY_REFERENCE` constants on
`JsonFieldAssociation`. Embedded associations reject any other strategy (passing
`STRATEGY_REFERENCE` throws `InvalidArgumentException`), and references reject
`STRATEGY_EMBED` for the same reason. You never choose the strategy explicitly —
it is determined by the family, and `getStrategy()` reflects it:

```php
$profile = (new JsonFieldAssociationBuilder())->buildEmbeds(Article::class)['profile'];
echo $profile->getStrategy();   // 'embed'

$author = $articles->jsonFieldReferences()['author'];
echo $author->getStrategy();    // 'reference'
```

Unlike the classic ORM, there is **no `contain()` for embedded associations** — the
embedded data is part of the parent row, so it is hydrated automatically on every
find. References, by contrast, only hold a key; you opt into resolving them with
`loadJsonReferences()`, `eagerLoadJsonReferences()`, or `joinJsonReference()` (see
[Loading Associations](#loading-associations) below).

<a id="has-one-associations"></a>

## HasOne Associations (embedded)

`class` `Crustum\JsonField\ORM\Association\JsonFieldHasOne` (extends
`JsonFieldEmbed`). A one-to-one embedded association hydrates a single nested
entity from the JSON column at the declared path.

Let's set up an `Article` entity with a `JsonFieldHasOne` relationship to an
`ArticleProfile` embedded entity.

First, the entities need their metadata. For a `JsonFieldHasOne` to work, the
`path` option points at the JSON location that holds the embedded entity. In this
case, the `data` column's `profile` key. The basic pattern is:

**JsonFieldHasOne:** the embedded entity lives *inside the parent's* JSON column.

| Relation                  | Path                  |
|---------------------------|-----------------------|
| Articles hasOne Profile   | `data->profile`       |
| Users hasOne Settings     | `meta->settings`      |

> [!NOTE]
> The association alias is fixed by the `property` argument of `#[JsonEmbed]` /
> `#[JsonReference]` — there is no `setName()`. To expose the same embedded or
> reference class under a second alias, declare a second attribute.

Once you create the `Article` and `ArticleProfile` classes, you can make the
association with the `#[JsonEmbed]` attribute shown above. If you need more
control, supply the extra arguments:

```php
#[JsonEmbed(
    property: 'profile',
    documentClass: ArticleProfile::class,
    path: 'data->profile',
)]
```

The embedded entity is a normal `JsonEntity` subclass. Reading a `JsonFieldHasOne`
is always available after a find because the data is already present in the row:

```php
// In a controller or table method.
$article = $articles->get(1);
echo $article->profile->title;   // ArticleProfile entity, parent-aware
```

No `contain()` call is required — the embedded entity is materialized during
hydration by `JsonFieldResultSet`. Writing routes automatically through the
`embeddedParent` back-pointer:

```php
$article = $articles->get(1);
$article->profile->title = 'Updated';
$articles->save($article);   // atomic engine `set()` on data->profile->title
```

A new entity (or one whose `data` column is itself dirty) is written as a whole
column; an existing entity with only the nested `profile->title` changed is written
with an atomic, engine-native `set()` expression that leaves the rest of `data`
untouched.

To break a profile out into multiple associations, declare more than one embed:

```php
#[JsonEmbed(property: 'homeProfile', documentClass: ArticleProfile::class, path: 'data->home_profile')]
#[JsonEmbed(property: 'workProfile', documentClass: ArticleProfile::class, path: 'data->work_profile')]
```

> [!NOTE]
> The association alias is fixed by the `property` argument of `#[JsonEmbed]`, so
> there is no `setName()`. To expose the same embedded class under a second alias,
> define a second `#[JsonEmbed]` (see above).

Possible keys for `JsonFieldHasOne` (the `#[JsonEmbed]` arguments) include:

- **property**: The root entity property that holds the hydrated embedded entity.
  Defaults to the attribute's `property` name.
- **documentClass**: The fully-qualified embedded entity class (must extend
  `JsonEntity`).
- **path**: The JSON path (in `column->node` notation) where the embed's data is
  stored.
- **type**: Cardinality within the embed family: `'one'` (default) builds a
  `JsonFieldHasOne`; `'many'` builds a `JsonFieldHasMany`.
- **idField**: Optional property used as a stable identity for list elements
  (`JsonFieldHasMany`). When set, list items are matched for update, append, and
  delete by this field instead of array position.
- **saveStrategy**: For list embeds (`JsonFieldHasMany`) only — `'replace'`
  (default) rewrites the whole list from the in-memory entities, `'append'` keeps
  the persisted rows and merges the in-memory entities into them by `idField`.
- **embeddedValidator**: A callable (or `Validator`) invoked for each embedded
  entity before it is persisted. Set programmatically with
  `setEmbeddedValidator()` on the association object; it receives the hydrated
  `JsonEntity` (or the plain array for a patch) and should throw on invalid data.
- **strategy**: Only `'embed'` is accepted. Passing any other value throws an
  `InvalidArgumentException`.

Removing an embedded `JsonFieldHasOne` is done through the path-string API on the
parent — the key is dropped from the column on save:

```php
$article->unset('data->profile');
$articles->save($article);
```

<a id="has-many-associations"></a>

## HasMany Associations (embedded)

`class` `Crustum\JsonField\ORM\Association\JsonFieldHasMany` (extends
`JsonFieldEmbed`). An example of a `JsonFieldHasMany` association is "Articles hasMany
Chapters". Defining this association will allow us to fetch an article's chapters
when the article is loaded.

When creating your entities for a `JsonFieldHasMany` relationship, set the `type`
argument to `'many'`:

**JsonFieldHasMany:** the list of embedded entities lives *inside the parent's* JSON column.

| Relation                    | Path                  |
|-----------------------------|-----------------------|
| Articles hasMany Chapters   | `data->chapters`      |
| Products hasMany Options    | `data->options`       |

We can declare the `JsonFieldHasMany` association in our `Article` entity as follows:

```php
#[JsonEmbed(property: 'chapters', documentClass: ArticleChapter::class, path: 'data->chapters', type: 'many')]
```

We can also define a more specific relationship using the `idField` and
`saveStrategy` arguments:

```php
#[JsonEmbed(
    property: 'chapters',
    documentClass: ArticleChapter::class,
    path: 'data->chapters',
    type: 'many',
    idField: 'uid',
    saveStrategy: 'replace',
)]
```

Sometimes you may want a stable identity on list elements so updates and deletes
are matched by value rather than array position. The `idField` argument names that
property; when omitted, the list is matched positionally:

```php
#[JsonEmbed(property: 'notes', documentClass: ArticleNote::class, path: 'data->notes', type: 'many', idField: 'uid', saveStrategy: 'append')]
```

Like `JsonFieldHasOne`, the data for a `JsonFieldHasMany` is in the parent row, so
reading is free after a find:

```php
// In a controller or table method.
$article = $articles->get(1);
echo $article->chapters[0]->name;   // ArticleChapter entity, parent-aware
```

Adding a child is done by appending to the property and saving the parent:

```php
$article = $articles->get(1);
$article->chapters[] = new ArticleChapter(['name' => 'Introduction']);
$articles->save($article);   // whole-list rewrite for a new child, or atomic push
```

When `idField` is configured, a new list element without that field is assigned a
generated `uuid` identity on insert. The `saveStrategy` controls how an
in-memory list reconciles with the persisted list:

- **replace** (default): the persisted list is overwritten by the in-memory list.
- **append**: persisted rows are kept; in-memory rows are merged in by `idField`
  (existing rows replaced in place, new rows appended), and rows only present in
  the persisted list are kept.

Removing a child is routed through the embedded entity's `delete()` method, which
uses the `embeddedParent` back-pointer to drop the element from the parent's list
and mark the embed property dirty:

```php
$article = $articles->get(1);
$article->chapters[0]->delete();   // removes the first chapter from the in-memory list
$articles->save($article);         // atomic rewrite of data->chapters
```

Filtering embedded list data uses the dotted path for the embedded field. A
`whereJsonPath('data->chapters.name', 'Intro')` matches whole embeds; to require
one of the array items to match all conditions, pass the array form which becomes a
JSON containment (`@>` / `JSON_CONTAINS`) check:

```php
// Dotted path match - any chapter in the list with name 'Intro'
$articles->whereJsonPath('data->chapters.name', 'Intro');

// Containment - one chapter item must match BOTH conditions
$articles->whereJsonPathElemMatch('data->chapters', ['name' => 'Intro', 'uid' => 'u1']);
```

Possible keys for `JsonFieldHasMany` (the `#[JsonEmbed]` arguments) include:

- **property**: The root entity property that holds the hydrated list of embedded
  entities. Defaults to the attribute's `property` name.
- **documentClass**: The fully-qualified embedded entity class (must extend
  `JsonEntity`).
- **path**: The JSON path (in `column->node` notation) where the embed's list is
  stored.
- **type**: Must be `'many'` to build a `JsonFieldHasMany`.
- **idField**: Optional property used as stable identity for list elements.
- **saveStrategy**: Either `append` or `replace`. Defaults to `replace`.
- **embeddedValidator**: A callable (or `Validator`) invoked for each embedded
  entity before persistence, set with `setEmbeddedValidator()` on the association
  object.
- **strategy**: Only `'embed'` is accepted.

> [!WARNING]
> A top-level column whose name collides with an embed `property` is shadowed by the
> embed during hydration. Rename either the embed property or the column to avoid the
> clash.

<a id="belongs-to-associations"></a>

## BelongsTo Associations (reference)

`class` `Crustum\JsonField\ORM\Association\JsonFieldBelongsTo` (extends
`JsonFieldReference`). Now that we have profile data inside the article, let's
define a `JsonFieldBelongsTo` association so an article can reference a `Users` row
through a foreign key stored in JSON. The `JsonFieldBelongsTo` is the complement to
the embedded associations — it lets us see related data from the other direction,
resolved through a real SQL query rather than stored inline.

When keying your entities for a `JsonFieldBelongsTo` relationship, follow this
convention:

**JsonFieldBelongsTo:** the *current* entity's JSON column holds the foreign key.

| Relation                  | JSON path             |
|---------------------------|-----------------------|
| Articles belongsTo Users  | `data->author_id`     |
| Mentors belongsTo Doctors | `data->doctor_id`     |

> [!TIP]
> If a JSON path holds a foreign key, the entity belongs to the other table.

We can define the `JsonFieldBelongsTo` association in our `Article` entity with the
`#[JsonReference]` attribute:

```php
#[JsonReference(property: 'author', target: UsersTable::class, path: 'data->author_id')]
```

We can also define a more specific relationship using the arguments:

```php
#[JsonReference(
    property: 'author',
    target: UsersTable::class,
    path: 'data->author_id',
    type: 'one',
)]
```

Possible keys for `JsonFieldBelongsTo` (the `#[JsonReference]` arguments) include:

- **property**: The root entity property that holds the hydrated target entity.
  Defaults to the attribute's `property` name.
- **target**: The fully-qualified target Table class (or registry alias).
- **path**: The JSON path (in `column->node` notation) where the foreign key is
  stored. This plays the role of `foreignKey` on a classic `belongsTo`.
- **type**: Cardinality within the reference family: `'one'` (default) builds a
  `JsonFieldBelongsTo`; `'many'` builds a `JsonFieldBelongsToMany`.
- **idField**: Optional property used as a stable identity for list elements
  (`JsonFieldBelongsToMany`).
- **strategy**: Only `'reference'` is accepted. Passing any other value throws an
  `InvalidArgumentException`.

Once this association has been declared, find operations on the `Articles` table
can resolve the `User` record through the foreign key:

```php
// In a controller or table method.
$articles = $articles->find()->all();
$articles->loadJsonReferences($articles);

foreach ($articles as $article) {
    echo $article->author?->username;
}
```

`loadJsonReferences()` reads each foreign key from the already-decoded JSON column,
queries the target Table once, and assigns the matched row onto the `author`
property. Missing foreign keys resolve gracefully to `null`.

To filter or order by columns of the related table, add a real SQL join whose
condition compares the stored key (via the engine's extract expression) against the
target Table's primary key:

```php
$query = $articles->find();
$articles->joinJsonReference($query, 'author');

$results = $query->where(['jf_author.username' => 'bob'])->all();
```

The join runs on the normal connection using the engine adapter's native
expression — `JSONB_PATH_QUERY` on PostgreSQL, `JSON_EXTRACT` on MySQL and SQLite —
and the related table is aliased `jf_author`.

Once resolved, you write the reference by assigning the target entity (or raw key)
to the property and saving the parent. The `JsonField` behavior routes the change
through the association's `saveAssociated()` internally, writing the target's
primary key into the JSON foreign-key path:

```php
$article = $articles->get(1);
$article->author = $users->get(3);   // or $article->set('data->author_id', 3);
$articles->save($article);           // writes data->author_id = 3
```

<a id="belongs-to-many-associations"></a>

## BelongsToMany Associations (reference)

`class` `Crustum\JsonField\ORM\Association\JsonFieldBelongsToMany` (extends
`JsonFieldReference`). An example of a `JsonFieldBelongsToMany` association is
"Article belongsToMany Tags", where the tags from one article are shared with other
articles. `JsonFieldBelongsToMany` is often referred to as "has and belongs to
many", and is a classic "many to many" association.

The key difference between `JsonFieldHasMany` (embedded) and `JsonFieldBelongsToMany`
(reference) is that the link in a `JsonFieldBelongsToMany` association is a *list of
foreign keys* stored in JSON — the related rows live in another table and are
shared. For example, tagging my article with `php` doesn't "use up" the tag; I can
also use it on the next article I write.

Because the foreign keys are stored inside the JSON column, no separate join table
is required — the `data->tag_ids` array *is* the junction. You only need the
`articles` table and the `tags` table:

**JsonFieldBelongsToMany** requires a JSON path that holds an array of foreign keys.

| Relationship             | JSON path            |
| ------------------------ | -------------------- |
| Articles belongsToMany Tags | `data->tag_ids`  |
| Patients belongsToMany Doctors | `data->doctor_ids` |

We can define the `JsonFieldBelongsToMany` association on our `Article` entity as follows:

```php
#[JsonReference(property: 'tags', target: TagsTable::class, path: 'data->tag_ids', type: 'many')]
```

We can also define a more specific relationship using the `idField` argument:

```php
#[JsonReference(
    property: 'tags',
    target: TagsTable::class,
    path: 'data->tag_ids',
    type: 'many',
    idField: 'uid',
)]
```

Possible keys for `JsonFieldBelongsToMany` (the `#[JsonReference]` arguments) include:

- **property**: The root entity property that holds the hydrated list of target
  entities. Defaults to the attribute's `property` name.
- **target**: The fully-qualified target Table class (or registry alias).
- **path**: The JSON path (in `column->node` notation) where the array of foreign
  keys is stored. This is the analog of `foreignKey` on a classic `belongsToMany`.
- **type**: Must be `'many'` to build a `JsonFieldBelongsToMany`.
- **idField**: Optional property used as stable identity for reconciling the
  in-memory key list (unused for persistence, which always writes the raw key list).
- **strategy**: Only `'reference'` is accepted.

Once this association has been declared, find operations on the `Articles` table can
resolve the `Tag` records through the foreign-key list:

```php
// In a controller or table method.
$articles = $articles->find()->all();
$articles->loadJsonReferences($articles);

foreach ($articles as $article) {
    echo $article->tags[0]?->name;
}
```

A missing or empty key list resolves gracefully to an empty array. To filter by the
related table's columns, join and match:

```php
$query = $articles->find();
$articles->joinJsonReference($query, 'tags');

$results = $query->where(['jf_tags.name' => 'php'])->all();
```

Writing a `JsonFieldBelongsToMany` stores the array of target primary keys into the
JSON column. Assigning the target entities (or a raw list of ids) to the property
and saving the parent persists the key list:

```php
$article = $articles->get(1);
$article->tags = [$tags->get(1), $tags->get(3)];   // or $article->set('data->tag_ids', [1, 3]);
$articles->save($article);                         // writes data->tag_ids = [1, 3]
```

To eager-load references as part of result hydration (the analog of a Cake
`contain()` for a JSON-stored foreign key), register a formatter per reference on
the query:

```php
$query = $articles->find();
$articles->eagerLoadJsonReferences($query, ['author', 'tags']);

foreach ($query->all() as $article) {
    echo $article->author?->username;
    echo $article->tags[0]?->name;
}
```

`eagerLoadJsonReferences()` resolves the foreign key(s) from each entity's
already-hydrated JSON column and assigns the matched target row(s) as results are
produced — no separate `loadJsonReferences()` call required.

<a id="association-conventions"></a>

## Association Conventions

By default, associations are configured and referenced using the property name
declared in the attribute. This enables property chains to related entities in the
following way:

```php
$article = $articles->get(1);
$profile = $article->profile;   // JsonFieldHasOne embed
$author = $article->author;     // JsonFieldBelongsTo reference
```

Association properties on entities follow CakePHP naming: for a one-to-one or
belongsTo relation like "Article belongsTo Users", you get an `author` (or `user`)
property holding a single entity (or `null` if not available):

```php
$author = $article->author;
```

Whereas for the list direction "Article belongsToMany Tags" / "Article hasMany
Chapters" it would be:

```php
$tags = $article->tags;       // list of Tag entities (or empty array)
$chapters = $article->chapters; // list of ArticleChapter entities
```

The embed target class for a `JsonFieldHasOne`/`JsonFieldHasMany` is the
`documentClass` you declared; the reference target for a `JsonFieldBelongsTo`/
`JsonFieldBelongsToMany` is the Table named by `target`. Because embeds live inside
the parent row, the nested entity is always present after a find, whereas a reference
is `null` / empty until you resolve it (see [Loading Associations](#loading-associations)).

<a id="loading-associations"></a>

## Loading Associations

Once you've declared your associations, hydration and resolution behave differently
per family:

- **Embedded associations (`JsonFieldHasOne` / `JsonFieldHasMany`)** are hydrated
  automatically on every find — the data lives inside the parent row's JSON column,
  so there is nothing to `contain()`. Reading a nested property always works after a
  `get()` or `find()`.
- **Reference associations (`JsonFieldBelongsTo` / `JsonFieldBelongsToMany`)** only
  store a foreign key, so you choose how to resolve them:
  - `loadJsonReferences($entities)` resolves every declared reference onto a result
    set after the fact (the `contain()` equivalent for JSON foreign keys).
  - `eagerLoadJsonReferences($query, $names)` registers a `formatResults` formatter
    so resolution happens during hydration, with no extra call.
  - `joinJsonReference($query, $name)` adds a real SQL `JOIN` so you can filter or
    order by the related table's columns via the `jf_<name>` alias.

Choose between the association kinds by data access pattern:

- **JsonFieldHasOne / JsonFieldHasMany**: data is always read together with the
  parent, needs atomic updates, and is bounded in size. Best for profiles, chapters,
  and other "owned" sub-entities.
- **JsonFieldBelongsTo / JsonFieldBelongsToMany**: data is shared, queried
  independently, and normalized. Use keys stored in JSON and resolve through
  `loadJsonReferences()` / `joinJsonReference()` rather than embedding the full
  related row.
