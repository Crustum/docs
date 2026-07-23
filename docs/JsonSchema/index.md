# Crustum JsonSchema

<a name="introduction"></a>
## Introduction

[Crustum JsonSchema](https://github.com/Crustum/json-schema) (`crustum/json-schema`) is a fluent JSON Schema builder for PHP applications. It helps you describe structured inputs and outputs—especially tool and agent schemas—using a small, expressive API under the `Crustum\JsonSchema` namespace.

The package builds and serializes the supported JSON Schema subset. It is not a full draft validator product surface. CakePHP is **not** required to use the library; CakePHP plugins such as MCP and Ignis consume it for tool schemas and related tooling.

Package: `crustum/json-schema` (`Crustum\JsonSchema`).

<a name="building-schemas"></a>
## Building Schemas

Use the static `JsonSchema` entry point (or inject `Crustum\JsonSchema\Contracts\JsonSchema`) to create typed builders. Chain fluent methods, then call `toArray()` when you need a plain JSON Schema document fragment.

```php
use Crustum\JsonSchema\JsonSchema;

$schema = JsonSchema::object([
    'location' => JsonSchema::string()
        ->description('The location to get the weather for.')
        ->required(),
    'units' => JsonSchema::string()
        ->enum(['celsius', 'fahrenheit'])
        ->description('The temperature units to use.')
        ->default('celsius'),
])->withoutAdditionalProperties();

$document = $schema->toArray();
```

<a name="objects-and-properties"></a>
### Objects and Properties

`JsonSchema::object()` accepts either a property map or a closure that receives the schema factory and returns a property map:

```php
use Crustum\JsonSchema\Contracts\JsonSchema;
use Crustum\JsonSchema\JsonSchema as JsonSchemaFactory;

$schema = JsonSchemaFactory::object(function (JsonSchema $schema): array {
    return [
        'name' => $schema->string()->required(),
        'age' => $schema->integer()->nullable(),
    ];
});
```

Call `withoutAdditionalProperties()` when the object must not accept undeclared keys.

<a name="scalar-types"></a>
### Scalar Types

| Factory | Type class |
|---------|------------|
| `JsonSchema::string()` | `Types\StringType` |
| `JsonSchema::integer()` | `Types\IntegerType` |
| `JsonSchema::number()` | `Types\NumberType` |
| `JsonSchema::boolean()` | `Types\BooleanType` |

String builders support `min()` / `max()` length helpers. Integer and number builders support the numeric constraints exposed on those type classes.

<a name="arrays"></a>
### Arrays

```php
use Crustum\JsonSchema\JsonSchema;

$tags = JsonSchema::array()
    ->items(JsonSchema::string())
    ->description('List of tags');
```

<a name="unions-and-anyof"></a>
### Unions and anyOf

Use `union()` for a multi-type scalar union, and `anyOf()` for alternate object/schema branches:

```php
use Crustum\JsonSchema\Contracts\JsonSchema;
use Crustum\JsonSchema\JsonSchema as JsonSchemaFactory;

$id = JsonSchemaFactory::union(['string', 'integer']);

$payload = JsonSchemaFactory::anyOf(function (JsonSchema $schema): array {
    return [
        $schema->object(['email' => $schema->string()->required()]),
        $schema->object(['phone' => $schema->string()->required()]),
    ];
});
```

<a name="common-constraints"></a>
## Common Constraints

Most types share fluent helpers from `Types\Type`:

| Method | Purpose |
|--------|---------|
| `description(string $value)` | Human-readable field description |
| `required(bool $required = true)` | Mark the property required in a parent object |
| `nullable(bool $nullable = true)` | Allow `null` |
| `default(mixed $value)` | Default value (typed per builder) |
| `enum(array\|string $values)` | Restrict to enumerated values |
| `toArray()` | Emit a JSON Schema array fragment |

<a name="serializing-to-arrays"></a>
## Serializing to Arrays

Call `toArray()` on any type to get a PHP array suitable for `json_encode()` or for nested composition. Nested object properties are serialized recursively.

<a name="hydrating-from-arrays"></a>
## Hydrating From Arrays

When you already have a supported JSON Schema fragment, rebuild a fluent type with `JsonSchema::fromArray()`:

```php
use Crustum\JsonSchema\JsonSchema;

$type = JsonSchema::fromArray([
    'type' => 'object',
    'properties' => [
        'title' => [
            'type' => 'string',
            'description' => 'Title',
        ],
    ],
    'required' => ['title'],
]);
```

Unsupported keywords for this subset are rejected or normalized according to the deserializer rules. Prefer building with the fluent API when you control the schema source.
