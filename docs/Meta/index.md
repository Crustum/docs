# CakePHP Meta Plugin

<a name="introduction"></a>
## Introduction

[Meta](https://github.com/Crustum/Meta) provides a fluent API for managing your application's document `<head>`, with support for title and meta tags, Open Graph, canonical URLs, robots directives, performance hints, and structured data. It works in your CakePHP view templates through the `Head` helper and resolves metadata from page defaults, route options, runtime calls, and error pages.

The same fluent builder powers every layer: default page metadata, metadata declared on routes, request-time metadata set from controllers, and status-code-specific error metadata. The resolved head is rendered as HTML in your layout's `<head>` element and can also be exposed as an array or individual element strings.

<a name="installation"></a>
## Installation

<a name="installing-the-plugin"></a>
### Installing the Plugin

Install via Composer:

```bash
composer require crustum/meta
```

Load the plugin:

```bash
bin/cake plugin load Crustum/Meta
```

> [!NOTE]
> Register the plugin in `config/plugins.php` (or `Application::bootstrap()`).

You can also load the plugin in your `Application.php`:

```php
// In src/Application.php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/Meta');
}
```

<a name="loading-the-helper"></a>
### Loading the Helper

Load `Crustum/Meta.Head` alongside your other view helpers, then render the resolved head in your layout's `<head>` element:

```php
// In src/View/AppView.php
public function initialize(): void
{
    parent::initialize();

    $this->loadHelper('Crustum/Meta.Head');
}
```

```php
// In templates/layout/default.php
<head>
    <meta charset="utf-8">
    <?= $this->Head->render() ?>
</head>
```

`$this->Head->render()` resolves the page layers for the current request and returns the accumulated tags. You may also call `toArray()` for the resolved head as structured data or `toElements()` for individual HTML element strings.

<a name="resolution-precedence"></a>
## Resolution Precedence

Page head data resolves from four layers, listed here from lowest to highest priority:

1. Page defaults
2. Route metadata
3. Runtime metadata
4. Error metadata

Higher layers replace lower layers field by field. For example, a runtime title replaces the route title without replacing the route description. The sections that follow describe how to set metadata at each layer. See [Rendering](#rendering) for how the resolved result is emitted.

<a name="defaults"></a>
## Defaults

Register page defaults once during application bootstrap. Resolve the shared `HeadManager` from the container (registered by `MetaPlugin::services()`) and call `defaults()`:

```php
use Crustum\Meta\Enums\OgType;
use Crustum\Meta\HeadBuilder;
use Crustum\Meta\HeadManager;

// In src/Application.php, inside bootstrap()
$head = $this->getContainer()->get(HeadManager::class);

$head->defaults(function (HeadBuilder $head) {
    $head
        ->title('Acme', suffix: ' - Acme')
        ->description('Build something great.')
        ->canonical()
        ->og(siteName: 'Acme', type: OgType::Website)
        ->searchableByRobots()
        ->preconnect('https://fonts.example.com');
});
```

The defaults layer is the lowest-priority page layer. If no route, runtime, or error metadata sets a title, `Acme` renders as-is. When a higher layer sets a page title, the inherited suffix is applied, so `$head->title('About')` renders `About - Acme`. Pass `exact: true` for titles that should ignore the inherited prefix or suffix.

Canonical URLs are rendered when you call `$head->canonical()`, by using the current request URL. To set an explicit URL you may pass a string, such as `$head->canonical('/about')`. Canonical URLs are normalized to `https` by default; pass `forceHttps: false` to preserve the request scheme.

Robots directives may be passed as a raw string, as `RobotsRule` enum cases, or as a list mixing both forms. Lists are rendered as comma-separated directives, so `$head->robots([RobotsRule::NoIndex, RobotsRule::NoFollow])` renders `noindex, nofollow`.

For the two common intents, `$head->searchableByRobots()` renders `all`, and `$head->hiddenFromRobots()` renders `none`.

<a name="route-metadata"></a>
## Route Metadata

Many pages can define their metadata directly on the route, especially semi-static pages whose metadata is known ahead of time.

### Routes

Attach head metadata as a route option using `RouteAttributeParser::metadata()`. The helper wraps the attributes in a cache-friendly `head` option on the route:

```php
use Crustum\Meta\Routing\RouteAttributeParser;

// In config/routes.php
$routes->connect('/contact', ['controller' => 'Pages', 'action' => 'contact'], [
    'head' => RouteAttributeParser::metadata([
        'title' => 'Contact Us',
        'description' => 'Get in touch.',
    ]),
]);
```

Resource routes accept the same option through `connectOptions`, applying the metadata to every generated route:

```php
$routes->resources('Posts', [
    'connectOptions' => [
        'head' => RouteAttributeParser::metadata([
            'robots' => 'index, follow',
        ]),
    ],
]);
```

Routes inside a scope carry their own head option, so you can apply metadata per route within a prefix:

```php
$routes->scope('/admin', ['prefix' => 'Admin'], function (RouteBuilder $routes) {
    $routes->connect('/dashboard', ['controller' => 'Dashboard', 'action' => 'index'], [
        'head' => RouteAttributeParser::metadata([
            'robots' => 'noindex, nofollow',
            'title' => 'Dashboard',
        ]),
    ]);
});
```

Multiple `head` attribute layers may be merged on the same route using `layer-N` keys. Lower layers resolve first and higher layers replace them field by field:

```php
$routes->connect('/admin/dashboard', ['controller' => 'Dashboard', 'action' => 'index'], [
    'head' => [
        'layer-0' => ['description' => 'Admin overview.', 'robots' => 'noindex, nofollow'],
        'layer-1' => ['title' => 'Dashboard'],
    ],
]);
```

Attributes registered by custom tag builders may be passed through the same route metadata mechanism. See [Custom Tags](#custom-tags) and [Extending](#extending).

<a name="supported-properties"></a>
### Supported Properties

The supported route properties map to the same names as the fluent builder methods:

| Category | Properties |
| --- | --- |
| Document | `title`, `description`, `canonical`, `robots` |
| App metadata | `themeColor`, `applicationName`, `colorScheme`, `referrer`, `viewport`, `appleWebAppTitle`, `webAppCapable`, `appleWebAppStatusBarStyle` |
| Social | `og`, `ogImage`, `ogVideo`, `ogAudio`, `twitter`, `twitterImage` |
| Performance | `preload`, `prefetch`, `preconnect`, `dnsPrefetch` |
| Discovery | `alternates`, `feed`, `link`, `icon`, `favicon`, `appleTouchIcon`, `appleTouchStartupImage`, `maskIcon`, `manifest` |
| Structured data | `schema` |
| Custom tags | `meta`, `link` |

Nested option names use the same camel-case names as the fluent API, such as `forceHttps`, `siteName`, and `secureUrl`. Route attribute values accept the shapes shown in the relevant sections below.

Repeatable properties, such as `ogImage`, `preload`, `feed`, `schema`, `icon`, and `appleTouchStartupImage`, accept either a single value or a list.

> [!WARNING]
> Route head attribute keys and nested option names are camel-case. Snake-case aliases such as `force_https` or `site_name` are not accepted and are ignored.

<a name="request-metadata"></a>
### Request Metadata

When a value isn't known until a request arrives, such as the title of the post being viewed, set it at runtime instead. Type-hint the `HeadManager` on the controller action and CakePHP's dependency injection container will inject it:

```php
use Crustum\Meta\HeadManager;

// In a controller action
public function view(int $id, HeadManager $head): void
{
    $post = $this->Posts->get($id);

    $head->title($post->title);

    // ...
}
```

<a name="runtime-metadata"></a>
## Runtime Metadata

Runtime calls on the `Head` manager override route metadata for request dependent data. Controllers and actions are the most common place to set this data. Type-hint the `HeadManager` on the controller action and CakePHP's dependency injection container will inject it:

```php
use Crustum\Meta\HeadManager;

// In a controller action
public function view(int $id, HeadManager $head): void
{
    $post = $this->Posts->get($id);

    $head->title($post->title)
        ->description($post->description);

    // Render the view...
}
```

You may also build runtime metadata directly from a view template through the helper, which delegates to the same shared manager:

```php
<?= $this->Head->title($post->title)->render() ?>
```

Multiple runtime calls are merged in the order they run. For single-value fields like title, description, canonical URL, and robots directives, the later call wins. Repeatable fields keep multiple entries, but adding the same key again updates the earlier entry. For `ogImage()`, the URL is the key:

```php
$this->Head
    ->ogImage('/images/cover.jpg', alt: 'Draft cover')
    ->ogImage('/images/gallery.jpg', alt: 'Gallery image')
    ->ogImage('/images/cover.jpg', alt: 'Final cover', width: 1200, height: 630);
```

```html
<meta property="og:image" content="/images/cover.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Final cover">
<meta property="og:image" content="/images/gallery.jpg">
<meta property="og:image:alt" content="Gallery image">
```

Open Graph media inherited from your defaults acts as a fallback. When route, runtime, or error metadata defines its own media of the same type, the default media is replaced instead of merged, so a page's `og:image` always wins over a site-wide default image.

Conditional metadata may be defined fluently with `when()` and `unless()`:

```php
$this->Head
    ->title($post->title)
    ->when($post->isDraft(), fn ($head) => $head->hiddenFromRobots());
```

<a name="error-pages"></a>
## Error Pages

Error metadata can be registered for status-code-specific pages. Both `defaults()` and `status()` accept named route-attribute values or a single head builder callback. Register them alongside your page defaults during application bootstrap:

```php
use Crustum\Meta\ErrorPages;
use Crustum\Meta\HeadManager;

// In src/Application.php, inside bootstrap()
$head = $this->getContainer()->get(HeadManager::class);

$head->errors(function (ErrorPages $errors) {
    $errors->defaults(robots: 'noindex, follow');

    $errors->status(404,
        title: 'Page Not Found',
        description: 'The page you are looking for could not be found.',
    );
});
```

The same methods accept a fluent builder callback:

```php
use Crustum\Meta\ErrorPages;
use Crustum\Meta\HeadBuilder;

$head->errors(function (ErrorPages $errors) {
    $errors->status(404, fn (HeadBuilder $head) => $head
        ->title('Page Not Found')
        ->description('The page you are looking for could not be found.'));
});
```

When a response is rendered for a registered error status, that metadata beats every other layer.

To apply error metadata before rendering an error response, call `$head->status(404)` so the resolved status is picked up:

```php
$head->status(404);

// Render the error response...
```

<a name="open-graph"></a>
## Open Graph

Open Graph properties are set with `og()`. Repeatable media is added through top-level methods that take named arguments directly:

```php
use Crustum\Meta\Enums\ImageType;
use Crustum\Meta\Enums\OgType;

$this->Head
    ->og(type: OgType::Article, title: $post->title)
    ->ogImage($post->hero_image_url)
    ->ogImage(
        $post->gallery_image_url,
        alt: $post->gallery_image_alt,
        width: 1200,
        height: 630,
        type: ImageType::Jpeg,
    );
```

`ogImage()`, `ogVideo()`, and `ogAudio()` all accept the same shape: a URL as the first argument plus optional named args for `alt`, `width`, `height`, `type`, and `secureUrl` where the spec defines them.

Image MIME types can be passed as `ImageType` enum cases anywhere the API accepts an image `type`, such as `ImageType::Svg`, `ImageType::Png`, `ImageType::Jpeg`, and `ImageType::Webp`.

> [!NOTE]
> Document `title` and `description` automatically fill missing `og:title` and `og:description` values.

For a single OG image with no other attributes, pass the `image:` shorthand to `og()`:

```php
$this->Head->og(
    type: OgType::Website,
    title: $page->title,
    description: $page->description,
    image: $page->og_image_url,
);
```

`og(image: ...)` and `ogImage(...)` write to the same underlying image list, so pick whichever reads better at the call site. Use [`meta()`](#custom-tags) for custom Open Graph extensions such as product or article properties.

Route metadata accepts the same properties. `ogImage` values may be given as a list of attribute maps:

```php
$routes->connect('/product', ['controller' => 'Products', 'action' => 'view'], [
    'head' => RouteAttributeParser::metadata([
        'og' => ['type' => OgType::Website, 'title' => 'Product'],
        'ogImage' => [
            ['url' => '/images/cover.jpg', 'alt' => 'Cover', 'width' => 1200, 'type' => ImageType::Jpeg],
        ],
    ]),
]);
```

<a name="twitter-cards"></a>
### Twitter Cards

To render X/Twitter cards from the same title, description, and image used by Open Graph, register `twitter()` in your defaults:

```php
use Crustum\Meta\Enums\TwitterCard;
use Crustum\Meta\HeadBuilder;

$head->defaults(fn (HeadBuilder $head) => $head->twitter(
    card: TwitterCard::SummaryWithLargeImage,
));
```

Then page level metadata like this:

```php
$this->Head
    ->title('Introducing Meta')
    ->description('A fluent API for CakePHP document head metadata.')
    ->ogImage('https://example.com/social.jpg', alt: 'Introducing Meta');
```

Will render matching Twitter tags:

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Introducing Meta">
<meta name="twitter:description" content="A fluent API for CakePHP document head metadata.">
<meta name="twitter:image" content="https://example.com/social.jpg">
<meta name="twitter:image:alt" content="Introducing Meta">
```

You may customize individual pages with explicit Twitter values:

```php
$this->Head
    ->twitter(title: $post->social_title)
    ->twitterImage($post->social_image_url, alt: $post->title);
```

Route metadata accepts `twitter` and `twitterImage`.

<a name="theme-colors"></a>
## Theme Colors

Theme colors can be set globally, per route, or at runtime:

```php
$this->Head->themeColor('#0f172a');
```

This renders a `<meta name="theme-color">` tag. Media-specific theme colors can use the `Media` enum:

```php
use Crustum\Meta\Enums\Media;

$this->Head
    ->themeColor('#ffffff', media: Media::Light)
    ->themeColor('#111827', media: Media::Dark);
```

`Media` also includes `Portrait` and `Landscape`. Any media parameter continues to accept a custom media query string.

Route metadata supports simple theme colors through the same camel-case key:

```php
$routes->connect('/dashboard', ['controller' => 'Dashboard', 'action' => 'index'], [
    'head' => RouteAttributeParser::metadata([
        'themeColor' => '#0f172a',
    ]),
]);
```

<a name="app-metadata-and-icons"></a>
## App Metadata & Icons

Meta includes helpers for common browser and application metadata:

```php
use Crustum\Meta\Enums\ImageType;
use Crustum\Meta\Enums\Media;

$this->Head
    ->applicationName('Acme')
    ->colorScheme('light dark')
    ->referrer('strict-origin-when-cross-origin')
    ->viewport('width=device-width, initial-scale=1')
    ->appleWebAppTitle('Acme')
    ->webAppCapable()
    ->appleWebAppStatusBarStyle('black')
    ->favicon('/favicon.svg', type: ImageType::Svg)
    ->icon('/favicon-32x32.png', type: ImageType::Png, sizes: '32x32')
    ->appleTouchIcon('/apple-touch-icon.png', sizes: '180x180')
    ->appleTouchStartupImage('/launch.png', media: Media::Portrait)
    ->maskIcon('/safari-pinned-tab.svg', color: '#111827')
    ->manifest('/site.webmanifest');
```

`favicon()` is an alias of `icon()` and accepts the same `type`, `sizes`, and `media` arguments.

Route metadata uses the same names:

```php
use Crustum\Meta\Enums\ImageType;
use Crustum\Meta\Enums\Media;

$routes->connect('/dashboard', ['controller' => 'Dashboard', 'action' => 'index'], [
    'head' => RouteAttributeParser::metadata([
        'applicationName' => 'Acme',
        'colorScheme' => 'light dark',
        'appleWebAppTitle' => 'Acme',
        'webAppCapable' => true,
        'appleWebAppStatusBarStyle' => 'black',
        'favicon' => [
            ['href' => '/favicon.svg', 'type' => ImageType::Svg],
            ['href' => '/favicon-32x32.png', 'type' => ImageType::Png, 'sizes' => '32x32'],
        ],
        'appleTouchIcon' => ['href' => '/apple-touch-icon.png', 'sizes' => '180x180'],
        'appleTouchStartupImage' => ['href' => '/launch.png', 'media' => Media::Portrait],
        'manifest' => '/site.webmanifest',
    ]),
]);
```

<a name="progressive-web-apps"></a>
## Progressive Web Apps

The `pwa()` helper configures the common document `<head>` tags needed for an installable web app:

```php
$this->Head->pwa(
    name: 'Acme',
    manifest: '/site.webmanifest',
    themeColor: '#0f172a',
    appleTouchIcon: '/apple-touch-icon.png',
    appleWebAppStatusBarStyle: 'black',
);
```

This renders the application name, web app manifest link, optional theme color, iOS standalone metadata, optional Apple status bar style, and optional Apple touch icon. The manifest JSON itself and service worker registration still belong to your application.

Use `pwa()` in defaults or runtime metadata. Route metadata supports the individual properties shown above.

<a name="performance-and-discovery"></a>
## Performance & Discovery

Meta renders performance hints, pagination links, locale alternates, and feed discovery:

```php
$this->Head
    ->preload($this->Url->assetUrl('fonts/inter.woff2', ['pathPrefix' => 'webroot/']), as: 'font', crossorigin: true)
    ->prefetch($this->Url->assetUrl('images/next.webp'))
    ->preconnect('https://cdn.example.com')
    ->dnsPrefetch('https://analytics.example.com')
    ->paginate($this->Paginator)
    ->alternates([
        'en' => 'https://example.com/en/about',
        'fr' => 'https://example.com/fr/about',
        'x-default' => 'https://example.com/about',
    ])
    ->feed('/feed', title: 'Acme RSS')
    ->feed('/feed.atom', type: 'atom', title: 'Acme Atom');
```

For local assets, `preloadAsset()` and `prefetchAsset()` resolve the URL through the CakePHP URL helper and detect the `as` attribute from the file extension. Font preloads automatically include `crossorigin`, which the preload specification requires even for same-origin fonts:

```php
$this->Head
    ->preloadAsset('fonts/inter.woff2')
    ->prefetchAsset('images/next.webp');
```

```html
<link rel="preload" href="https://example.com/fonts/inter.woff2" as="font" crossorigin>
<link rel="prefetch" href="https://example.com/images/next.webp" as="image">
```

Pass `as` explicitly to override detection. `preloadAsset()` throws when the `as` attribute cannot be detected from the extension, since browsers ignore preloads without one; `prefetchAsset()` simply omits it.

### Pagination

`paginate()` accepts the view's `PaginatorHelper` or a `PaginatedInterface` result set from the controller. Result-set links are resolved at render time through the view's loaded `PaginatorHelper`, producing Cake-consistent URLs:

```php
// In a template, using the loaded Paginator helper
$this->Head->paginate($this->Paginator);
```

```php
// In a controller, with the paginated result set
$this->Head->paginate($paginated);
```

When the `Paginator` helper is loaded in the view, `HeadHelper` resolves controller-provided pagination automatically at render time; a deferred result set is only rendered when an explicit `paginate()` call was made. The rendered output includes `rel="prev"` and `rel="next"` link tags.

<a name="custom-tags"></a>
## Custom Tags

For tags without a dedicated method, use `meta()` and `link()`:

```php
$this->Head
    ->meta('format-detection', 'telephone=no')
    ->meta('article:author', $post->author->name)
    ->link('search', '/opensearch.xml', [
        'type' => 'application/opensearchdescription+xml',
        'title' => 'Acme Search',
    ])
    ->link('me', 'https://social.example.com/@acme');
```

Meta tags may include a media query when the browser should only apply the tag under matching conditions:

```php
use Crustum\Meta\Enums\Media;

$this->Head
    ->meta('theme-color', '#ffffff', media: Media::Light)
    ->meta('theme-color', '#111827', media: Media::Dark);
```

`meta()` uses `name=` for regular meta tags. For keys that normally use `property=`, such as Open Graph (`og:`) or article metadata (`article:`), it switches automatically:

```php
$this->Head
    ->meta('description', 'About Acme')
    ->meta('og:title', 'About Acme');
```

```html
<meta name="description" content="About Acme">
<meta property="og:title" content="About Acme">
```

Pass `property: true` or `property: false` if you need to force one or the other.

<a name="extending"></a>
### Extending

Custom tag builders may be registered so they render on every head and accept their own route attribute keys. Extend the `TagBuilder` base class and register the class with `HeadManager::extend()` during bootstrap:

```php
use Crustum\Meta\HeadManager;
use Crustum\Meta\Tags\TagBuilder;
use Crustum\Meta\Rendering\ResolvedHead;
use Crustum\Meta\Rendering\TagRenderer;

class ReadingTime extends TagBuilder
{
    public static function key(): string
    {
        return 'readingTime';
    }

    public static function routeAttributeKeys(): array
    {
        return ['readingTime'];
    }

    public static function fromRouteAttribute(string $key, mixed $value): ?self
    {
        return is_int($value) ? (new self($value)) : null;
    }

    // overlayOn(), isEmpty(), toTags(), toHeadArray()...
}

// During bootstrap
$head = $this->getContainer()->get(HeadManager::class);
$head->extend(ReadingTime::class);
```

Registered route attribute keys may then be used in route metadata:

```php
$routes->connect('/article', ['controller' => 'Articles', 'action' => 'view'], [
    'head' => RouteAttributeParser::metadata([
        'title' => 'Article',
        'readingTime' => 4,
    ]),
]);
```

<a name="schemas"></a>
## Schemas

Built-in schema builders cover the common JSON-LD types:

```php
use Crustum\Meta\Enums\OfferAvailability;
use Crustum\Meta\Schema\SchemaFactory;

$schema = new SchemaFactory();

$this->Head->schema(
    $schema->product()
        ->name($product->name)
        ->offers(
            $schema->offer()
                ->price($product->price)
                ->currency('USD')
                ->availability(OfferAvailability::InStock)
        )
);
```

The built-in factory methods are `article`, `blogPosting`, `product`, `offer`, `brand`, `breadcrumbs`, `faq`, `organization`, `person`, `webPage`, and `webSite`. Unknown factory methods fall back to a generic schema object so custom schema.org types can still be expressed.

Invalid JSON-LD schema data throws outside production and is logged as a warning in production.

<a name="breadcrumbs"></a>
### Breadcrumbs

Breadcrumb items may be added one at a time or in bulk. Positions are assigned automatically in the order the items are added:

```php
$this->Head->schema(
    $schema->breadcrumbs()->items([
        'Home' => '/',
        'Shop' => '/shop',
        'Shoes' => '/shop/shoes',
    ])
);
```

Use `item()` to append a single crumb:

```php
$schema->breadcrumbs()
    ->item('Home', '/')
    ->item('Shop', '/shop');
```

<a name="faqs"></a>
### FAQs

FAQ questions follow the same pattern. Add them one at a time with `question()` or in bulk with `questions()`:

```php
$this->Head->schema(
    $schema->faq()->questions([
        'What is Meta?' => 'A fluent API for managing the document head.',
        'Is it free?' => 'Yes, it is open source.',
    ])
);
```

<a name="custom-schemas"></a>
### Custom Schemas

Custom schema types can be registered explicitly:

```php
use Crustum\Meta\Schema\SchemaObject;
use Crustum\Meta\Schema\SchemaType;

#[SchemaType('JobPosting')]
class JobPosting extends SchemaObject
{
    public function title(string $title): static
    {
        return $this->set('title', $title);
    }

    public function datePosted(DateTimeInterface|string $date): static
    {
        return $this->date('datePosted', $date);
    }
}
```

Register the class with the schema factory, then use it as a first-class factory method:

```php
use Crustum\Meta\Schema\SchemaFactory;

$schema = new SchemaFactory();
$schema->register(JobPosting::class);

$this->Head->schema(
    $schema->jobPosting()
        ->title('Senior CakePHP Developer')
        ->datePosted(now())
);
```

Unregistered custom types can still be created directly from their class name with `make()`:

```php
$this->Head->schema(
    $schema->make(JobPosting::class)
        ->title('Senior CakePHP Developer')
        ->datePosted(now())
);
```

<a name="rendering"></a>
## Rendering

Meta resolves the page layers into tags for the current response. Load the `Head` helper and render the accumulated tags inside your layout's `<head>`:

```php
// In templates/layout/default.php
<head>
    <meta charset="utf-8">
    <?= $this->Head->render() ?>
</head>
```

`render()` renders synchronously, so define page metadata before the layout is rendered. For applications that want the resolved head as structured data, call `toArray()`:

```php
$data = $this->Head->toArray();
```

`toElements()` returns the resolved head as individual HTML element strings:

```php
$elements = $this->Head->toElements();
```

The manager-level equivalents (`HeadManager::render()`, `toArray()`, `toElements()`, and `toHtml()`) expose the same output for controllers and console tooling.
