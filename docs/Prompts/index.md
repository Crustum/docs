# CakePHP Prompts Plugin

<a name="introduction"></a>
## Introduction

[CakePHP Prompts](https://github.com/crustum/prompts) wraps [Laravel Prompts](https://github.com/laravel/prompts) for CakePHP Console applications. It adds beautiful, user-friendly forms to the command line, with browser-like features including placeholder text and validation.

CakePHP Prompts is perfect for accepting user input in Cake Console commands. The plugin ships **Cake Console helpers** under the `Crustum/Prompts.*` namespace. Each helper maps to an upstream Laravel Prompts entry point and calls into `laravel/prompts` at runtime.

> [!NOTE]
> CakePHP Prompts supports macOS, Linux, and Windows with WSL. On native Windows PHP, interactive TTY prompts fall back to CakePHP `ConsoleIo`. See [unsupported environments & fallbacks](#fallbacks).

This package does **not** ship Laravel's global `helpers.php` function API (`text()`, `select()`, …). Use Console helpers instead:

```php
$name = $this->io->helper('Crustum/Prompts.Text')->run([
    'label' => 'What is your name?',
    'required' => true,
]);
```

Prefer `run(array $args): mixed` when you need the return value. Cake's `output(array $args): void` contract also runs the same prompt and discards the result. Helpers bind `ConsoleIoFallbacks` automatically. Option lists may be plain arrays or `Cake\Collection\Collection`.

<a name="console-helpers"></a>
### Console Helpers

| Helper name | Purpose |
|-------------|---------|
| `Crustum/Prompts.Text` | Single-line text input |
| `Crustum/Prompts.Textarea` | Multi-line text input |
| `Crustum/Prompts.Number` | Numeric input |
| `Crustum/Prompts.Password` | Masked password input |
| `Crustum/Prompts.Confirm` | Yes/no confirmation |
| `Crustum/Prompts.Select` | Single option from a list |
| `Crustum/Prompts.MultiSelect` | Multiple options from a list |
| `Crustum/Prompts.Suggest` | Text with filtered suggestions |
| `Crustum/Prompts.Search` | Searchable single select (`options` Closure required) |
| `Crustum/Prompts.MultiSearch` | Searchable multi select (`options` Closure required) |
| `Crustum/Prompts.AutoComplete` | Text with ghost-text completion |
| `Crustum/Prompts.Pause` | Wait for Enter |
| `Crustum/Prompts.DataTable` | Interactive searchable table |
| `Crustum/Prompts.Form` | Returns a `Laravel\Prompts\FormBuilder` instance |
| `Crustum/Prompts.Note` | Styled note (`message`, optional `type`) |
| `Crustum/Prompts.Error` / `Warning` / `Alert` / `Info` / `Intro` / `Outro` | Typed note shortcuts |
| `Crustum/Prompts.Callout` | Structured callout box |
| `Crustum/Prompts.Table` / `Crustum/Prompts.Grid` | Static table or grid layout |
| `Crustum/Prompts.Progress` | Progress bar (returns `Progress` or mapped results) |
| `Crustum/Prompts.Spin` | Spinner around a callback |
| `Crustum/Prompts.Task` | Task with live log output |
| `Crustum/Prompts.Stream` | Returns a `Laravel\Prompts\Stream` instance |
| `Crustum/Prompts.Title` | Set terminal window title |
| `Crustum/Prompts.Clear` | Clear the terminal |
| `Crustum/Prompts.Notify` | Desktop notification (macOS/Linux) |

You may also construct `Laravel\Prompts\*` classes directly when you need lower-level control. Helpers remain the recommended Cake Console API.

<a name="installation"></a>
## Installation

Install via Composer:

```bash
composer require crustum/prompts
```

> [!NOTE]
> Register the plugin in `config/plugins.php`, or load it from `Application::bootstrap()`.

```bash
bin/cake plugin load Crustum/Prompts
```

```php
// In src/Application.php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/Prompts');
}
```

Plugin bootstrap registers default ConsoleIo fallbacks for interactive and display prompts. Progress, Spinner, and Task use ConsoleIo when `shouldFallback()` is active and IO is bound. Console helpers call `ConsoleIoFallbacks::setIo()` for you. If you invoke Laravel Prompts classes directly from a command, bind IO first when fallbacks may run:

```php
use Crustum\Prompts\Cake\ConsoleIoFallbacks;

ConsoleIoFallbacks::setIo($this->io);
```

<a name="available-prompts"></a>
## Available Prompts

<a name="text"></a>
### Text

The `Crustum/Prompts.Text` helper prompts the user with the given question, accepts their input, and returns it:

```php
$name = $this->io->helper('Crustum/Prompts.Text')->run([
    'label' => 'What is your name?',
]);
```

You may also include placeholder text, a default value, and an informational hint:

```php
$name = $this->io->helper('Crustum/Prompts.Text')->run([
    'label' => 'What is your name?',
    'placeholder' => 'E.g. Taylor Otwell',
    'default' => $user->name ?? '',
    'hint' => 'This will be displayed on your profile.',
]);
```

<a name="text-required"></a>
#### Required Values

If you require a value to be entered, pass the `required` argument:

```php
$name = $this->io->helper('Crustum/Prompts.Text')->run([
    'label' => 'What is your name?',
    'required' => true,
]);
```

To customize the validation message, pass a string:

```php
$name = $this->io->helper('Crustum/Prompts.Text')->run([
    'label' => 'What is your name?',
    'required' => 'Your name is required.',
]);
```

<a name="text-validation"></a>
#### Additional Validation

For additional validation logic, pass a closure to `validate`:

```php
$name = $this->io->helper('Crustum/Prompts.Text')->run([
    'label' => 'What is your name?',
    'validate' => fn (string $value) => match (true) {
        strlen($value) < 3 => 'The name must be at least 3 characters.',
        strlen($value) > 255 => 'The name must not exceed 255 characters.',
        default => null,
    },
]);
```

The closure receives the entered value and may return an error message, or `null` if validation passes.

Upstream also accepts Laravel Validator rule arrays when Laravel's validator is available. In a typical CakePHP app, prefer closures.

<a name="textarea"></a>
### Textarea

The `Crustum/Prompts.Textarea` helper prompts for multi-line input and returns it:

```php
$story = $this->io->helper('Crustum/Prompts.Textarea')->run([
    'label' => 'Tell me a story.',
]);
```

You may also include placeholder text, a default value, and an informational hint:

```php
$story = $this->io->helper('Crustum/Prompts.Textarea')->run([
    'label' => 'Tell me a story.',
    'placeholder' => 'This is a story about...',
    'hint' => 'This will be displayed on your profile.',
]);
```

Submit the textarea with **Ctrl+D**.

<a name="textarea-required"></a>
#### Required Values

```php
$story = $this->io->helper('Crustum/Prompts.Textarea')->run([
    'label' => 'Tell me a story.',
    'required' => true,
]);
```

```php
$story = $this->io->helper('Crustum/Prompts.Textarea')->run([
    'label' => 'Tell me a story.',
    'required' => 'A story is required.',
]);
```

<a name="textarea-validation"></a>
#### Additional Validation

```php
$story = $this->io->helper('Crustum/Prompts.Textarea')->run([
    'label' => 'Tell me a story.',
    'validate' => fn (string $value) => match (true) {
        strlen($value) < 250 => 'The story must be at least 250 characters.',
        strlen($value) > 10000 => 'The story must not exceed 10,000 characters.',
        default => null,
    },
]);
```

<a name="number"></a>
### Number

The `Crustum/Prompts.Number` helper prompts for numeric input. The user may use the up and down arrow keys to change the number:

```php
$number = $this->io->helper('Crustum/Prompts.Number')->run([
    'label' => 'How many copies would you like?',
]);
```

You may also include placeholder text, a default value, and an informational hint:

```php
$copies = $this->io->helper('Crustum/Prompts.Number')->run([
    'label' => 'How many copies would you like?',
    'placeholder' => '5',
    'default' => '1',
    'hint' => 'This will determine how many copies to create.',
]);
```

Optional `min`, `max`, and `step` arguments constrain and increment the value when supported by upstream.

<a name="number-required"></a>
#### Required Values

```php
$copies = $this->io->helper('Crustum/Prompts.Number')->run([
    'label' => 'How many copies would you like?',
    'required' => true,
]);
```

```php
$copies = $this->io->helper('Crustum/Prompts.Number')->run([
    'label' => 'How many copies would you like?',
    'required' => 'A number of copies is required.',
]);
```

<a name="number-validation"></a>
#### Additional Validation

```php
$copies = $this->io->helper('Crustum/Prompts.Number')->run([
    'label' => 'How many copies would you like?',
    'validate' => fn (int|string $value) => match (true) {
        is_numeric($value) && (int)$value < 1 => 'At least one copy is required.',
        is_numeric($value) && (int)$value > 100 => 'You may not create more than 100 copies.',
        default => null,
    },
]);
```

When the typed value is numeric, upstream returns an `int`.

<a name="password"></a>
### Password

The `Crustum/Prompts.Password` helper is similar to Text, but input is masked as the user types:

```php
$password = $this->io->helper('Crustum/Prompts.Password')->run([
    'label' => 'What is your password?',
]);
```

You may also include placeholder text and an informational hint:

```php
$password = $this->io->helper('Crustum/Prompts.Password')->run([
    'label' => 'What is your password?',
    'placeholder' => 'password',
    'hint' => 'Minimum 8 characters.',
]);
```

<a name="password-required"></a>
#### Required Values

```php
$password = $this->io->helper('Crustum/Prompts.Password')->run([
    'label' => 'What is your password?',
    'required' => true,
]);
```

```php
$password = $this->io->helper('Crustum/Prompts.Password')->run([
    'label' => 'What is your password?',
    'required' => 'The password is required.',
]);
```

<a name="password-validation"></a>
#### Additional Validation

```php
$password = $this->io->helper('Crustum/Prompts.Password')->run([
    'label' => 'What is your password?',
    'validate' => fn (string $value) => match (true) {
        strlen($value) < 8 => 'The password must be at least 8 characters.',
        default => null,
    },
]);
```

<a name="confirm"></a>
### Confirm

Use `Crustum/Prompts.Confirm` for a yes/no confirmation. Users may use the arrow keys or press `y` / `n`. The helper returns `true` or `false`.

```php
$confirmed = $this->io->helper('Crustum/Prompts.Confirm')->run([
    'label' => 'Do you accept the terms?',
]);
```

You may include a default value, custom Yes/No labels, and a hint:

```php
$confirmed = $this->io->helper('Crustum/Prompts.Confirm')->run([
    'label' => 'Do you accept the terms?',
    'default' => false,
    'yes' => 'I accept',
    'no' => 'I decline',
    'hint' => 'The terms must be accepted to continue.',
]);
```

<a name="confirm-required"></a>
#### Requiring "Yes"

```php
$confirmed = $this->io->helper('Crustum/Prompts.Confirm')->run([
    'label' => 'Do you accept the terms?',
    'required' => true,
]);
```

```php
$confirmed = $this->io->helper('Crustum/Prompts.Confirm')->run([
    'label' => 'Do you accept the terms?',
    'required' => 'You must accept the terms to continue.',
]);
```

<a name="select"></a>
### Select

Use `Crustum/Prompts.Select` when the user must choose from a predefined set of options:

```php
$role = $this->io->helper('Crustum/Prompts.Select')->run([
    'label' => 'What role should the user have?',
    'options' => ['Member', 'Contributor', 'Owner'],
]);
```

You may specify the default choice and a hint:

```php
$role = $this->io->helper('Crustum/Prompts.Select')->run([
    'label' => 'What role should the user have?',
    'options' => ['Member', 'Contributor', 'Owner'],
    'default' => 'Owner',
    'hint' => 'The role may be changed at any time.',
]);
```

Pass an associative array to return the selected key instead of its value:

```php
$role = $this->io->helper('Crustum/Prompts.Select')->run([
    'label' => 'What role should the user have?',
    'options' => [
        'member' => 'Member',
        'contributor' => 'Contributor',
        'owner' => 'Owner',
    ],
    'default' => 'owner',
]);
```

Up to five options are shown before scrolling. Customize with `scroll`. Helpers accept `Cake\Collection\Collection` and convert to arrays:

```php
use Cake\Collection\Collection;

$role = $this->io->helper('Crustum/Prompts.Select')->run([
    'label' => 'Which category would you like to assign?',
    'options' => new Collection($categoryNamesById),
    'scroll' => 10,
]);
```

<a name="select-info"></a>
#### Secondary Information

The `info` argument displays additional information about the highlighted option. A closure receives the highlighted value and should return a string or `null`:

```php
$role = $this->io->helper('Crustum/Prompts.Select')->run([
    'label' => 'What role should the user have?',
    'options' => [
        'member' => 'Member',
        'contributor' => 'Contributor',
        'owner' => 'Owner',
    ],
    'info' => fn (string $value) => match ($value) {
        'member' => 'Can view and comment.',
        'contributor' => 'Can view, comment, and edit.',
        'owner' => 'Full access to all resources.',
        default => null,
    },
]);
```

You may also pass a static string:

```php
$role = $this->io->helper('Crustum/Prompts.Select')->run([
    'label' => 'What role should the user have?',
    'options' => ['Member', 'Contributor', 'Owner'],
    'info' => 'The role may be changed at any time.',
]);
```

<a name="select-validation"></a>
#### Additional Validation

By default Select requires a choice (`required` defaults to `true`). Pass a `validate` closure to present an option but prevent it from being selected:

```php
$role = $this->io->helper('Crustum/Prompts.Select')->run([
    'label' => 'What role should the user have?',
    'options' => [
        'member' => 'Member',
        'contributor' => 'Contributor',
        'owner' => 'Owner',
    ],
    'validate' => fn (string $value) =>
        $value === 'owner' && $ownerAlreadyExists
            ? 'An owner already exists.'
            : null,
]);
```

If `options` is associative, the closure receives the selected key; otherwise it receives the selected value. Return an error message, or `null` if validation passes.

<!-- docs iteration 1 of 3 ends here (~Select). Next: Multi-select → Forms. -->

<a name="multiselect"></a>
### Multi-select

Use `Crustum/Prompts.MultiSelect` when the user may select multiple options:

```php
$permissions = $this->io->helper('Crustum/Prompts.MultiSelect')->run([
    'label' => 'What permissions should be assigned?',
    'options' => ['Read', 'Create', 'Update', 'Delete'],
]);
```

You may specify default choices and a hint:

```php
$permissions = $this->io->helper('Crustum/Prompts.MultiSelect')->run([
    'label' => 'What permissions should be assigned?',
    'options' => ['Read', 'Create', 'Update', 'Delete'],
    'default' => ['Read', 'Create'],
    'hint' => 'Permissions may be updated at any time.',
]);
```

Pass an associative array to return selected keys instead of values:

```php
$permissions = $this->io->helper('Crustum/Prompts.MultiSelect')->run([
    'label' => 'What permissions should be assigned?',
    'options' => [
        'read' => 'Read',
        'create' => 'Create',
        'update' => 'Update',
        'delete' => 'Delete',
    ],
    'default' => ['read', 'create'],
]);
```

Customize scroll height and pass a Collection:

```php
use Cake\Collection\Collection;

$categories = $this->io->helper('Crustum/Prompts.MultiSelect')->run([
    'label' => 'What categories should be assigned?',
    'options' => new Collection($categoryNamesById),
    'scroll' => 10,
]);
```

<a name="multiselect-info"></a>
#### Secondary Information

```php
$permissions = $this->io->helper('Crustum/Prompts.MultiSelect')->run([
    'label' => 'What permissions should be assigned?',
    'options' => [
        'read' => 'Read',
        'create' => 'Create',
        'update' => 'Update',
        'delete' => 'Delete',
    ],
    'info' => fn (string $value) => match ($value) {
        'read' => 'View resources and their properties.',
        'create' => 'Create new resources.',
        'update' => 'Modify existing resources.',
        'delete' => 'Permanently remove resources.',
        default => null,
    },
]);
```

<a name="multiselect-required"></a>
#### Requiring a Value

By default the user may select zero or more options. Pass `required` to enforce one or more:

```php
$categories = $this->io->helper('Crustum/Prompts.MultiSelect')->run([
    'label' => 'What categories should be assigned?',
    'options' => $categoryNamesById,
    'required' => true,
]);
```

```php
$categories = $this->io->helper('Crustum/Prompts.MultiSelect')->run([
    'label' => 'What categories should be assigned?',
    'options' => $categoryNamesById,
    'required' => 'You must select at least one category',
]);
```

<a name="multiselect-validation"></a>
#### Additional Validation

```php
$permissions = $this->io->helper('Crustum/Prompts.MultiSelect')->run([
    'label' => 'What permissions should the user have?',
    'options' => [
        'read' => 'Read',
        'create' => 'Create',
        'update' => 'Update',
        'delete' => 'Delete',
    ],
    'validate' => fn (array $values) => !in_array('read', $values, true)
        ? 'All users require the read permission.'
        : null,
]);
```

If `options` is associative, the closure receives selected keys; otherwise selected values.

<a name="suggest"></a>
### Suggest

`Crustum/Prompts.Suggest` provides auto-completion for possible choices. The user may still enter any answer:

```php
$name = $this->io->helper('Crustum/Prompts.Suggest')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle'],
]);
```

Pass a Closure as `options` to refresh suggestions as the user types:

```php
use Cake\Collection\Collection;

$name = $this->io->helper('Crustum/Prompts.Suggest')->run([
    'label' => 'What is your name?',
    'options' => fn ($value) => (new Collection(['Taylor', 'Dayle']))
        ->filter(fn ($name) => stripos((string)$name, (string)$value) !== false)
        ->toList(),
]);
```

You may also include placeholder text, a default value, and a hint:

```php
$name = $this->io->helper('Crustum/Prompts.Suggest')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle'],
    'placeholder' => 'E.g. Taylor',
    'default' => $user->name ?? '',
    'hint' => 'This will be displayed on your profile.',
]);
```

<a name="suggest-info"></a>
#### Secondary Information

```php
$name = $this->io->helper('Crustum/Prompts.Suggest')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle'],
    'info' => fn (string $value) => match ($value) {
        'Taylor' => 'Administrator',
        'Dayle' => 'Contributor',
        default => null,
    },
]);
```

<a name="suggest-required"></a>
#### Required Values

```php
$name = $this->io->helper('Crustum/Prompts.Suggest')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle'],
    'required' => true,
]);
```

```php
$name = $this->io->helper('Crustum/Prompts.Suggest')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle'],
    'required' => 'Your name is required.',
]);
```

<a name="suggest-validation"></a>
#### Additional Validation

```php
$name = $this->io->helper('Crustum/Prompts.Suggest')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle'],
    'validate' => fn (string $value) => match (true) {
        strlen($value) < 3 => 'The name must be at least 3 characters.',
        strlen($value) > 255 => 'The name must not exceed 255 characters.',
        default => null,
    },
]);
```

<a name="search"></a>
### Search

When there are many options, `Crustum/Prompts.Search` lets the user type a query to filter results before selecting with the arrow keys. The `options` argument **must** be a Closure:

```php
$id = $this->io->helper('Crustum/Prompts.Search')->run([
    'label' => 'Search for the user that should receive the mail',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
]);
```

The closure receives the text typed so far and must return an array of options. An associative array returns the selected key; a list returns the selected value.

When filtering a list where you intend to return values, re-index with `array_values` or Collection `toList()` so the array does not become associative:

```php
use Cake\Collection\Collection;

$names = new Collection(['Taylor', 'Abigail']);

$selected = $this->io->helper('Crustum/Prompts.Search')->run([
    'label' => 'Search for the user that should receive the mail',
    'options' => fn (string $value) => $names
        ->filter(fn ($name) => stripos((string)$name, $value) !== false)
        ->toList(),
]);
```

You may also include placeholder text and a hint:

```php
$id = $this->io->helper('Crustum/Prompts.Search')->run([
    'label' => 'Search for the user that should receive the mail',
    'placeholder' => 'E.g. Taylor Otwell',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
    'hint' => 'The user will receive an email immediately.',
]);
```

Customize scroll with `scroll`:

```php
$id = $this->io->helper('Crustum/Prompts.Search')->run([
    'label' => 'Search for the user that should receive the mail',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
    'scroll' => 10,
]);
```

<a name="search-info"></a>
#### Secondary Information

```php
$id = $this->io->helper('Crustum/Prompts.Search')->run([
    'label' => 'Search for the user that should receive the mail',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
    'info' => fn (int $userId) => $this->users->get($userId)->email,
]);
```

<a name="search-validation"></a>
#### Additional Validation

```php
$id = $this->io->helper('Crustum/Prompts.Search')->run([
    'label' => 'Search for the user that should receive the mail',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
    'validate' => function (int|string $value) {
        $user = $this->users->get($value);

        if ($user->opted_out) {
            return 'This user has opted-out of receiving mail.';
        }

        return null;
    },
]);
```

<a name="multisearch"></a>
### Multi-search

`Crustum/Prompts.MultiSearch` combines search filtering with multi-select (arrow keys + space):

```php
$ids = $this->io->helper('Crustum/Prompts.MultiSearch')->run([
    'label' => 'Search for users who should receive the mail',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
]);
```

Re-index list results when returning values:

```php
use Cake\Collection\Collection;

$names = new Collection(['Taylor', 'Abigail']);

$selected = $this->io->helper('Crustum/Prompts.MultiSearch')->run([
    'label' => 'Search for users who should receive the mail',
    'options' => fn (string $value) => $names
        ->filter(fn ($name) => stripos((string)$name, $value) !== false)
        ->toList(),
]);
```

Placeholder, hint, and scroll:

```php
$ids = $this->io->helper('Crustum/Prompts.MultiSearch')->run([
    'label' => 'Search for users who should receive the mail',
    'placeholder' => 'E.g. Taylor Otwell',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
    'hint' => 'The user will receive an email immediately.',
    'scroll' => 10,
]);
```

<a name="multisearch-info"></a>
#### Secondary Information

```php
$ids = $this->io->helper('Crustum/Prompts.MultiSearch')->run([
    'label' => 'Search for the users that should receive the mail',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
    'info' => fn (int $userId) => $this->users->get($userId)->email,
]);
```

<a name="multisearch-required"></a>
#### Requiring a Value

```php
$ids = $this->io->helper('Crustum/Prompts.MultiSearch')->run([
    'label' => 'Search for the users that should receive the mail',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
    'required' => true,
]);
```

```php
$ids = $this->io->helper('Crustum/Prompts.MultiSearch')->run([
    'label' => 'Search for the users that should receive the mail',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
    'required' => 'You must select at least one user.',
]);
```

<a name="multisearch-validation"></a>
#### Additional Validation

```php
$ids = $this->io->helper('Crustum/Prompts.MultiSearch')->run([
    'label' => 'Search for the users that should receive the mail',
    'options' => fn (string $value) => strlen($value) > 0
        ? $this->users->find('list', keyField: 'id', valueField: 'name')
            ->where(['Users.name LIKE' => "%{$value}%"])
            ->toArray()
        : [],
    'validate' => function (array $values) {
        $optedOut = $this->users->find()
            ->where(['Users.id IN' => $values, 'Users.opted_out' => true])
            ->all();

        if (!$optedOut->isEmpty()) {
            return implode(', ', $optedOut->extract('name')->toList()) . ' have opted out.';
        }

        return null;
    },
]);
```

<a name="pause"></a>
### Pause

`Crustum/Prompts.Pause` displays text and waits for Enter / Return:

```php
$this->io->helper('Crustum/Prompts.Pause')->run([
    'message' => 'Press ENTER to continue.',
]);
```

<a name="autocomplete"></a>
### Autocomplete

`Crustum/Prompts.AutoComplete` provides inline ghost-text completion. Matching suggestions can be accepted with **Tab** or the right arrow key:

```php
$name = $this->io->helper('Crustum/Prompts.AutoComplete')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle', 'Jess', 'Nuno', 'Tim'],
]);
```

Placeholder, default, and hint:

```php
$name = $this->io->helper('Crustum/Prompts.AutoComplete')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle', 'Jess', 'Nuno', 'Tim'],
    'placeholder' => 'E.g. Taylor',
    'default' => $user->name ?? '',
    'hint' => 'Use tab to accept, up/down to cycle.',
]);
```

<a name="autocomplete-closure"></a>
#### Dynamic Options

Pass a Closure to generate options from the current input:

```php
use Cake\Collection\Collection;

$file = $this->io->helper('Crustum/Prompts.AutoComplete')->run([
    'label' => 'Which file?',
    'options' => fn (string $value) => (new Collection($files))
        ->filter(fn ($file) => str_starts_with(strtolower((string)$file), strtolower($value)))
        ->toList(),
]);
```

<a name="autocomplete-required"></a>
#### Required Values

```php
$name = $this->io->helper('Crustum/Prompts.AutoComplete')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle', 'Jess', 'Nuno', 'Tim'],
    'required' => true,
]);
```

```php
$name = $this->io->helper('Crustum/Prompts.AutoComplete')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle', 'Jess', 'Nuno', 'Tim'],
    'required' => 'Your name is required.',
]);
```

<a name="autocomplete-validation"></a>
#### Additional Validation

```php
$name = $this->io->helper('Crustum/Prompts.AutoComplete')->run([
    'label' => 'What is your name?',
    'options' => ['Taylor', 'Dayle', 'Jess', 'Nuno', 'Tim'],
    'validate' => fn (string $value) => match (true) {
        strlen($value) < 3 => 'The name must be at least 3 characters.',
        strlen($value) > 255 => 'The name must not exceed 255 characters.',
        default => null,
    },
]);
```

<a name="transforming-input-before-validation"></a>
## Transforming Input Before Validation

Many helpers accept a `transform` Closure that runs before validation — for example to trim whitespace:

```php
$name = $this->io->helper('Crustum/Prompts.Text')->run([
    'label' => 'What is your name?',
    'transform' => fn (string $value) => trim($value),
    'validate' => fn (string $value) => match (true) {
        strlen($value) < 3 => 'The name must be at least 3 characters.',
        strlen($value) > 255 => 'The name must not exceed 255 characters.',
        default => null,
    },
]);
```

<a name="forms"></a>
## Forms

`Crustum/Prompts.Form` returns a `Laravel\Prompts\FormBuilder` so you can group prompts. The user can return to previous steps with **Ctrl+U**:

```php
$responses = $this->io->helper('Crustum/Prompts.Form')->run([])
    ->text('What is your name?', required: true)
    ->password('What is your password?', validate: fn (string $value) =>
        strlen($value) < 8 ? 'Minimum 8 characters.' : null
    )
    ->confirm('Do you accept the terms?')
    ->submit();
```

`submit()` returns a numerically indexed array of responses. Pass `name` to access responses by key:

```php
$responses = $this->io->helper('Crustum/Prompts.Form')->run([])
    ->text('What is your name?', required: true, name: 'name')
    ->password(
        label: 'What is your password?',
        validate: fn (string $value) =>
            strlen($value) < 8 ? 'Minimum 8 characters.' : null,
        name: 'password',
    )
    ->confirm('Do you accept the terms?')
    ->submit();

$user = $this->users->newEntity([
    'name' => $responses['name'],
    'password' => $responses['password'],
]);
$this->users->saveOrFail($user);
```

For granular control, use `add`. The callback receives previous responses:

```php
$responses = $this->io->helper('Crustum/Prompts.Form')->run([])
    ->text('What is your name?', required: true, name: 'name')
    ->add(function ($responses) {
        return $this->io->helper('Crustum/Prompts.Text')->run([
            'label' => "How old are you, {$responses['name']}?",
        ]);
    }, name: 'age')
    ->submit();

$this->io->helper('Crustum/Prompts.Outro')->run([
    'message' => "Your name is {$responses['name']} and you are {$responses['age']} years old.",
]);
```

You may also call FormBuilder prompt methods that construct upstream prompts directly (`->text()`, `->select()`, …); those still run through `laravel/prompts`.

<!-- docs iteration 2 of 3 ends here (~Forms). Next: display / progress / terminal / fallbacks / testing. -->

<a name="informational-messages"></a>
## Informational Messages

Use note helpers to display informational messages:

```php
$this->io->helper('Crustum/Prompts.Info')->run([
    'message' => 'Package installed successfully.',
]);
```

Also available: `Crustum/Prompts.Note` (with optional `type`), `Warning`, `Error`, `Alert`, `Intro`, and `Outro`.

```php
$this->io->helper('Crustum/Prompts.Note')->run([
    'message' => 'Heads up.',
    'type' => 'warning',
]);
```

<a name="callouts"></a>
## Callouts

`Crustum/Prompts.Callout` displays a boxed message with a label and content:

```php
$this->io->helper('Crustum/Prompts.Callout')->run([
    'label' => 'Environment Configured',
    'content' => 'Your application is running in production mode with 4 workers.',
]);
```

Pass `warning` or `error` as `type` to change the visual style:

```php
$this->io->helper('Crustum/Prompts.Callout')->run([
    'label' => 'Deprecation Notice',
    'content' => 'The `--prefer-stable` flag will be removed in v4.0. Use `--stability=stable` instead.',
    'type' => 'warning',
]);

$this->io->helper('Crustum/Prompts.Callout')->run([
    'label' => 'Database Connection Failed',
    'content' => 'Could not connect to MySQL on 127.0.0.1:3306.',
    'type' => 'error',
]);
```

The `info` argument adds a footer line:

```php
$this->io->helper('Crustum/Prompts.Callout')->run([
    'label' => 'Deployment Summary',
    'content' => 'Your application was deployed to production.',
    'info' => 'deploy-id: d4f8a2c',
]);
```

<a name="callout-rich-content"></a>
#### Rich Content

Instead of a string, pass an array of strings and elements. Use `Laravel\Prompts\Elements\Element` factory methods for headings, lists, key/value pairs, and links:

```php
use Laravel\Prompts\Elements\Element;

$this->io->helper('Crustum/Prompts.Callout')->run([
    'label' => 'Deployment Summary',
    'content' => [
        'Your application was deployed to production at 2024-03-15 14:32 UTC.',
        Element::heading('What Changed'),
        Element::bulletedList([
            'Migrated 3 pending database migrations',
            'Cleared and rebuilt route cache',
            'Restarted 4 queue workers',
        ]),
        Element::heading('Next Steps'),
        Element::numberedList([
            'Verify the health check endpoint at /up',
            'Monitor error rates for the next 15 minutes',
            'Confirm background jobs are processing',
        ]),
    ],
]);
```

```php
$this->io->helper('Crustum/Prompts.Callout')->run([
    'label' => 'Database Connection Failed',
    'content' => [
        'Could not connect to the database server.',
        Element::keyValueList([
            'Host' => '127.0.0.1',
            'Port' => '3306',
            'Database' => 'forge',
            'Status' => 'Connection refused',
        ]),
    ],
    'type' => 'error',
]);
```

`Element::link` creates a clickable hyperlink in terminals that support [OSC 8](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda):

```php
$this->io->helper('Crustum/Prompts.Callout')->run([
    'label' => 'Server Health Check',
    'content' => [
        'Multiple services are reporting degraded performance.',
        Element::heading('Affected Services'),
        'Look here: ' . Element::link('https://example.com/health', 'Health Dashboard'),
        Element::link('https://example.com/health'),
    ],
]);
```

If no label is provided, the URL itself is shown as the link text.

<a name="tables"></a>
## Tables

`Crustum/Prompts.Table` displays rows and columns:

```php
$this->io->helper('Crustum/Prompts.Table')->run([
    'headers' => ['Name', 'Email'],
    'rows' => [
        ['Taylor Otwell', 'taylor@example.com'],
        ['Jason Beggs', 'jason@example.com'],
    ],
]);
```

`Crustum/Prompts.Grid` lays out a list of items:

```php
$this->io->helper('Crustum/Prompts.Grid')->run([
    'items' => ['Alpha', 'Bravo', 'Charlie', 'Delta'],
    'maxWidth' => 80,
]);
```

`Crustum/Prompts.DataTable` is an interactive searchable table that returns the selected row:

```php
$row = $this->io->helper('Crustum/Prompts.DataTable')->run([
    'label' => 'Choose a user',
    'headers' => ['Name', 'Email'],
    'rows' => [
        ['Taylor Otwell', 'taylor@example.com'],
        ['Jason Beggs', 'jason@example.com'],
    ],
    'scroll' => 10,
]);
```

<a name="spin"></a>
## Spin

`Crustum/Prompts.Spin` shows a spinner while a callback runs, then returns the callback result:

```php
$response = $this->io->helper('Crustum/Prompts.Spin')->run([
    'callback' => fn () => file_get_contents('https://example.com'),
    'message' => 'Fetching response...',
]);
```

> [!WARNING]
> Upstream spinner animation requires the [PCNTL](https://www.php.net/manual/en/book.pcntl.php) extension. Without it, a static spinner is shown. On Windows / fallback mode, the Cake helper runs the callback with ConsoleIo messaging instead.

<a name="progress"></a>
## Progress Bars

`Crustum/Prompts.Progress` shows progress for long-running work. With a `callback`, it maps over steps and returns an array of callback results:

```php
$users = $this->io->helper('Crustum/Prompts.Progress')->run([
    'label' => 'Updating users',
    'steps' => $userList,
    'callback' => fn ($user) => $this->performTask($user),
]);
```

The callback may also accept the `Laravel\Prompts\Progress` instance to update label and hint per iteration:

```php
$users = $this->io->helper('Crustum/Prompts.Progress')->run([
    'label' => 'Updating users',
    'steps' => $userList,
    'callback' => function ($user, $progress) {
        $progress
            ->label("Updating {$user->name}")
            ->hint("Created on {$user->created_at}");

        return $this->performTask($user);
    },
    'hint' => 'This may take some time.',
]);
```

Without a callback, the helper returns a `Progress` instance for manual control:

```php
$progress = $this->io->helper('Crustum/Prompts.Progress')->run([
    'label' => 'Updating users',
    'steps' => 10,
]);

$progress->start();

foreach ($userList as $user) {
    $this->performTask($user);
    $progress->advance();
}

$progress->finish();
```

<a name="task"></a>
## Task

`Crustum/Prompts.Task` shows a labeled task with a spinner and scrolling live output while a callback runs:

```php
$this->io->helper('Crustum/Prompts.Task')->run([
    'label' => 'Installing dependencies',
    'callback' => function ($logger) {
        // Long-running process...
    },
]);
```

The callback receives a `Laravel\Prompts\Support\Logger` for log lines, status messages, and streamed text.

> [!WARNING]
> Animation requires PCNTL. Without it, a static task UI is shown. Cake fallbacks run when `shouldFallback()` is active.

<a name="task-logging"></a>
#### Logging Lines

```php
$this->io->helper('Crustum/Prompts.Task')->run([
    'label' => 'Installing dependencies',
    'callback' => function ($logger) {
        $logger->line('Resolving packages...');
        $logger->line('Downloading laravel/framework');
    },
]);
```

<a name="task-status-messages"></a>
#### Status Messages

Use `success`, `warning`, and `error` for stable status lines above the scrolling log:

```php
$this->io->helper('Crustum/Prompts.Task')->run([
    'label' => 'Deploying application',
    'callback' => function ($logger) {
        $logger->line('Pulling latest changes...');
        $logger->success('Changes pulled!');

        $logger->line('Running migrations...');
        $logger->warning('No new migrations to run.');

        $logger->line('Clearing cache...');
        $logger->success('Cache cleared!');
    },
]);
```

<a name="task-label"></a>
#### Updating the Label

```php
$this->io->helper('Crustum/Prompts.Task')->run([
    'label' => 'Starting deployment...',
    'callback' => function ($logger) {
        $logger->label('Pulling latest changes...');
        $logger->label('Running migrations...');
        $logger->label('Clearing cache...');
    },
]);
```

<a name="task-sub-label"></a>
#### Displaying a Sub-Label

`subLabel` shows a dim line under the main label. Pass an empty string to clear it. You may also set an initial value via the helper argument:

```php
$this->io->helper('Crustum/Prompts.Task')->run([
    'label' => 'Deploying',
    'subLabel' => 'Preparing...',
    'callback' => function ($logger) {
        $logger->subLabel('Building assets...');
        $logger->subLabel('Running migrations...');
        $logger->subLabel('');
    },
]);
```

<a name="task-streaming"></a>
#### Streaming Text

For incremental output, use `partial` then `commitPartial`:

```php
$this->io->helper('Crustum/Prompts.Task')->run([
    'label' => 'Generating response...',
    'callback' => function ($logger) use ($words) {
        foreach ($words as $word) {
            $logger->partial($word . ' ');
        }

        $logger->commitPartial();
    },
]);
```

<a name="task-limit"></a>
#### Customizing the Output Limit

Default visible log lines is 10. Override with `limit`:

```php
$this->io->helper('Crustum/Prompts.Task')->run([
    'label' => 'Installing dependencies',
    'callback' => function ($logger) {
        // ...
    },
    'limit' => 20,
]);
```

<a name="task-keep-summary"></a>
#### Keeping the Summary

By default task output is erased when finished. Pass `keepSummary` to retain status messages:

```php
$this->io->helper('Crustum/Prompts.Task')->run([
    'label' => 'Deploying',
    'callback' => function ($logger) {
        $logger->success('Assets built');
        $logger->success('Migrations complete');
    },
    'keepSummary' => true,
]);
```

<a name="stream"></a>
## Stream

`Crustum/Prompts.Stream` returns a `Laravel\Prompts\Stream` for incremental terminal text (for example AI output):

```php
$stream = $this->io->helper('Crustum/Prompts.Stream')->run([]);

foreach ($words as $word) {
    $stream->append($word . ' ');
    usleep(25_000);
}

$stream->close();
```

`append` adds text with a gradual fade-in. Call `close` when finished to finalize output and restore the cursor.

<a name="terminal-title"></a>
## Terminal Title

`Crustum/Prompts.Title` updates the terminal window or tab title:

```php
$this->io->helper('Crustum/Prompts.Title')->run([
    'title' => 'Installing Dependencies',
]);
```

Reset with an empty string:

```php
$this->io->helper('Crustum/Prompts.Title')->run([
    'title' => '',
]);
```

<a name="clear"></a>
## Clearing the Terminal

```php
$this->io->helper('Crustum/Prompts.Clear')->run([]);
```

<a name="terminal-considerations"></a>
## Terminal Considerations

<a name="terminal-width"></a>
#### Terminal Width

If a label, option, or validation message exceeds the terminal column count, it is truncated. Prefer shorter strings on narrow terminals. A typically safe maximum is 74 characters for an 80-column terminal.

<a name="terminal-height"></a>
#### Terminal Height

For prompts that accept `scroll`, the configured value is reduced automatically to fit the terminal height, including space for a validation message.

<a name="fallbacks"></a>
## Unsupported Environments and Fallbacks

Laravel Prompts supports macOS, Linux, and Windows with WSL. Native Windows PHP cannot drive the interactive TTY UI.

This plugin registers CakePHP `ConsoleIo` fallbacks via `Crustum\Prompts\Cake\ConsoleIoFallbacks`. Plugin bootstrap calls `registerDefaults()`. Helpers call `setIo()` so fallbacks have a bound IO.

`ConsoleIoFallbacks::enableEnvironmentFallbacks()` enables upstream `Prompt::fallbackWhen()` on Windows and when ConsoleIo is non-interactive.

<a name="fallback-conditions"></a>
#### Fallback Conditions

To customize when fallbacks run (for example in tests), use Laravel's sticky API:

```php
use Laravel\Prompts\Prompt;

Prompt::fallbackWhen(true);
```

Clear and re-apply environment defaults between tests with `Crustum\Prompts\Testing\PromptState::reset()`.

<a name="fallback-behavior"></a>
#### Fallback Behavior

Defaults are registered for interactive prompts (Text through DataTable), display prompts (Note through Notify, Table, Grid, Clear, Title), and progress-style helpers. Progress, Spinner, and Task honor Cake fallbacks from the helper when `shouldFallback()` is true, because upstream `map()` / `spin()` / `run()` do not always delegate to registered fallbacks automatically.

You may still override a single prompt class with `fallbackUsing` if you need custom behavior:

```php
use Laravel\Prompts\TextPrompt;

TextPrompt::fallbackUsing(function (TextPrompt $prompt) {
    // Custom fallback; return an appropriate value for the prompt.
});
```

Prefer the packaged ConsoleIo fallbacks for Cake commands.
