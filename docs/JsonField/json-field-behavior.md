# JsonField Behavior

`Crustum/JsonField.JsonField`

Attach this behavior to a Table to enable JSON-column hydration and save routing. It
is the single integration point between your entities' `#[JsonColumn]` /
`#[JsonEmbed]` / `#[JsonReference]` declarations and the ORM lifecycle; everything
else (the `JsonFieldAwareTrait` query helpers, the association builder) is opt-in on
top.

Standard behavior usage — enabling, configuring, removing, and accessing behaviors —
is documented in the CakePHP
[Behaviors](https://book.cakephp.org/5/en/orm/behaviors.html) cookbook. This page
covers only what this behavior does.

## What It Does

- **On `Model.beforeFind`** the behavior installs `JsonFieldResultSet` as the query's
  result set class. As each row hydrates, every `#[JsonEmbed]` decoded array becomes a
  nested `JsonEntity` (or your declared embed class) with the `embeddedParent`
  back-pointer set, and per-path `toPHP` casting is applied. See
  [Reading Data](../database-basics.md#reading-data).
- **On `Model.beforeSave`** it persists JSON-embed and JSON-FK reference changes:
  - References (`#[JsonReference]`) store their resolved foreign key into the declared
    JSON path (`saveAssociated()`).
  - A **new entity** (or one whose JSON storage column is itself dirty) is written as a
    whole column: each embed is exported and per-path `toDatabase` casters run, then
    core `JsonType` encodes the result.
  - An **existing entity** with only dirty nested-embed fields is written with atomic,
    engine-native `set()` expressions (`jsonb_set` / `JSON_SET` / `json_set`) scoped to
    the changed path; the rest of the column is preserved. See
    [Writing Data](../database-basics.md#writing-data).
  - Root-level typed paths declared outside any `#[JsonEmbed]` (via
    `JsonSchemaReader::registerCaster()`) are cast through their `toDatabase` caster on
    a whole-column write.

## Configuration

The behavior takes a single option:

- `mergeJsonEmbeds` (bool, default `false`) — when `true`, a plain-array value assigned
  to an embed property is **deep-merged** into the already-hydrated embed entity instead
  of replacing it. This makes `patchEntity()` with partial embed data keep sibling
  fields. The default `false` replaces the embed wholesale.

```php
public function initialize(array $config): void
{
    parent::initialize($config);

    $this->addBehavior('Crustum/JsonField.JsonField', [
        'mergeJsonEmbeds' => true,
    ]);
}
```

Entities without any `#[JsonColumn]` declaration are ignored by the behavior, so it is
safe to attach broadly.
