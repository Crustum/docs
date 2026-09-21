# Validating Data

Validation and application rules work exactly as in core CakePHP — see the
[CakePHP Validating Data](https://book.cakephp.org/5/en/orm/validation.html) cookbook.
The plugin adds one extension: **per-embed validators** that run on nested embed data
during save.

## Embedded Validators

A `JsonFieldEmbed` association can carry an `embeddedValidator` callable. It is invoked
for each child — with the hydrated `JsonEntity` or the plain array for a patch — before
the embed is persisted, and should throw on invalid data.

Configure it on the association object built by `JsonFieldAssociationBuilder`:

```php
use Crustum\JsonField\ORM\Association\JsonFieldAssociationBuilder;

$embeds = (new JsonFieldAssociationBuilder())->buildEmbeds(Article::class, $articles);
$embeds['chapters']->setEmbeddedValidator(function (ArticleChapter|array $child): void {
    if (is_array($child) || $child->get('name') === 'bad') {
        throw new InvalidArgumentException('invalid chapter');
    }
});
```

Because the validator runs inside the behavior's `beforeSave` (both for whole-column
and atomic writes), an invalid nested embed aborts the whole save — the same fail-fast
guarantee you get from a top-level `Validator`. The root entity's standard validation
(Table validators, the `RulesChecker`) is unchanged and runs alongside it.

> [!NOTE]
> Embedded validators validate *nested JSON data only*. Cross-field and foreign-key
> rules still live on the Table's `Validator` / `RulesChecker` as usual.
