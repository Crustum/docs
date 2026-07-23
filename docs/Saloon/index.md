# CakePHP Saloon Plugin

<a name="introduction"></a>
## Introduction

The **Saloon** plugin integrates [Saloon v4](https://docs.saloon.dev) — a powerful, modern PHP library for building API integrations and SDKs — with CakePHP 5. Saloon provides an elegant, object-oriented approach to HTTP client interactions with support for authentication, request/response handling, testing, pagination, caching, and rate limiting.

This plugin brings all of Saloon's features to CakePHP while adding framework-specific conveniences. The plugin includes automatic CakePHP event dispatching for every HTTP request and response, CLI generators via Bake commands for quickly scaffolding connectors and requests, and comprehensive testing helpers that integrate with CakePHP's test suite. Configuration follows standard CakePHP patterns, and the plugin provides bridges to CakePHP's cache system for response caching and rate limiting.

<a name="supported-features"></a>
#### Supported Features

This plugin supports all core Saloon v4 features including object-oriented connector and request architecture, multiple authentication methods (Token, Basic, OAuth2, and custom authenticators), comprehensive request body support (JSON, Multipart, XML, Form, String, Stream), and flexible response handling (JSON, XML, DTOs, streaming, file downloads).

The plugin provides complete testing capabilities with mock client support, fixtures, and assertions. It includes pagination strategies for paged, offset, cursor, and custom implementations. Response caching with TTL support is available, along with flexible rate limiting strategies using multiple backends. The plugin supports async requests and connection pools for concurrency, request/response pipeline customization via middleware, and built-in debugging tools. Full PSR-7, PSR-17, and PSR-18 compatibility is maintained throughout.

<a name="quickstart"></a>
## Quickstart

### Installing the Plugin

Install via Composer:

```bash
composer require crustum/saloon
```

Load the plugin:

```bash
bin/cake plugin load Crustum/Saloon
```

### Create Your First Integration

Generate a connector and request:

```bash
bin/cake bake saloon_connector GitHub GitHub
bin/cake bake saloon_request GitHub GetUser
```

This creates:

```php
// src/Http/Integrations/GitHub/GitHubConnector.php
<?php
declare(strict_types=1);

namespace App\Http\Integrations\GitHub;

use Saloon\Http\Connector;

class GitHubConnector extends Connector
{
    public function resolveBaseUrl(): string
    {
        return 'https://api.github.com';
    }

    protected function defaultHeaders(): array
    {
        return [
            'Content-Type' => 'application/json',
            'Accept' => 'application/vnd.github+json',
        ];
    }
}
```

```php
// src/Http/Integrations/GitHub/Requests/GetUserRequest.php
<?php
declare(strict_types=1);

namespace App\Http\Integrations\GitHub\Requests;

use Saloon\Enums\Method;
use Saloon\Http\Request;

class GetUserRequest extends Request
{
    protected Method $method = Method::GET;

    public function __construct(protected string $username)
    {
    }

    public function resolveEndpoint(): string
    {
        return '/users/' . $this->username;
    }
}
```

### Make Your First Request

```php
use App\Http\Integrations\GitHub\GitHubConnector;
use App\Http\Integrations\GitHub\Requests\GetUserRequest;

$connector = new GitHubConnector();
$response = $connector->send(new GetUserRequest('sammyjo20'));

$data = $response->json();
echo $data['name']; // "Sam Carré"
```

<a name="quickstart-next-steps"></a>
#### Next Steps

Once you've made your first request, you're ready to explore:

<a name="installation"></a>
## Installation

<a name="requirements"></a>
### Requirements

- **PHP** 8.2+
- **CakePHP** 5.x
- **Guzzle** (installed automatically via Saloon)

<a name="composer-installation"></a>
### Composer Installation

```bash
composer require crustum/saloon
```

<a name="plugin-loading"></a>
### Plugin Loading

Add to `config/plugins.php`:

```php
return [
    'Crustum/Saloon' => [],
];
```

Or load via CLI:

```bash
bin/cake plugin load Crustum/Saloon
```

Alternatively, load in your `Application.php`:

```php
// In src/Application.php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/Saloon');
}
```

<a name="configuration"></a>
### Configuration

Publish the default configuration:

```bash
cp vendor/crustum/saloon/config/saloon.php config/saloon.php
```

When developing from a monorepo:

```bash
cp plugins/Saloon/config/saloon.php config/saloon.php
```

Load the configuration in `config/bootstrap.php` (after plugins are loaded):

```php
use Cake\Core\Configure;

if (file_exists(CONFIG . 'saloon.php')) {
    Configure::load('saloon', 'default');
}
```

The default configuration:

```php
return [
    'Saloon' => [
        'default_sender' => \Saloon\Http\Senders\GuzzleSender::class,
        'integrations_path' => ROOT . DS . 'src' . DS . 'Http' . DS . 'Integrations',
        'integrations_namespace' => 'App\Http\Integrations',
        'middleware' => [
            'mock' => true,
            'events' => true,
            'record_response' => false,
        ],
        'ecosystem' => [
            'cache' => ['config' => 'default'],
            'rate_limit' => ['config' => 'default'],
        ],
    ],
];
```

See [Configuration Reference](#configuration-reference) for all available options.

<a name="optional-packages"></a>
### Optional Ecosystem Packages

Install additional Saloon plugins as needed:

```bash
composer require saloonphp/cache-plugin        # Response caching
composer require saloonphp/rate-limit-plugin   # Rate limiting
composer require saloonphp/pagination-plugin   # Pagination support
composer require saloonphp/xml-wrangler        # Advanced XML handling
```

<a name="the-basics"></a>
## The Basics

<a name="connectors"></a>
### Connectors

Connectors are the foundation of Saloon. They encapsulate the configuration for an API integration, including the base URL, default headers, authentication, and HTTP client configuration.

#### Creating a Connector

Generate a connector using Bake:

```bash
bin/cake bake saloon_connector GitHub GitHub
```

Or create manually:

```php
<?php
declare(strict_types=1);

namespace App\Http\Integrations\GitHub;

use Saloon\Http\Connector;

class GitHubConnector extends Connector
{
    public function resolveBaseUrl(): string
    {
        return 'https://api.github.com';
    }

    protected function defaultHeaders(): array
    {
        return [
            'Content-Type' => 'application/json',
            'Accept' => 'application/vnd.github+json',
        ];
    }
}
```

#### Constructor Arguments

Pass runtime configuration to connectors:

```php
class GitHubConnector extends Connector
{
    public function __construct(
        protected string $apiToken,
    ) {
    }

    public function resolveBaseUrl(): string
    {
        return 'https://api.github.com';
    }

    protected function defaultHeaders(): array
    {
        return [
            'Content-Type' => 'application/json',
            'Accept' => 'application/vnd.github+json',
            'Authorization' => 'Bearer ' . $this->apiToken,
        ];
    }
}

// Usage
$connector = new GitHubConnector($apiToken);
```

#### Timeouts

Configure connection and request timeouts:

```php
use Saloon\Traits\Plugins\HasTimeout;

class GitHubConnector extends Connector
{
    use HasTimeout;

    protected int $connectTimeout = 10;
    protected int $requestTimeout = 30;
}
```

#### HTTP Client Configuration

Customize the underlying Guzzle client:

```php
protected function defaultConfig(): array
{
    return [
        'verify' => false,
        'proxy' => 'http://proxy.example.com:8080',
    ];
}
```

<a name="requests"></a>
### Requests

Requests define individual API endpoints. Each request specifies the HTTP method, endpoint path, headers, query parameters, and body.

#### Creating a Request

Generate a request using Bake:

```bash
bin/cake bake saloon_request GitHub GetRepository
```

Or create manually:

```php
<?php
declare(strict_types=1);

namespace App\Http\Integrations\GitHub\Requests;

use Saloon\Enums\Method;
use Saloon\Http\Request;

class GetRepositoryRequest extends Request
{
    protected Method $method = Method::GET;

    public function __construct(
        protected string $owner,
        protected string $repo,
    ) {
    }

    public function resolveEndpoint(): string
    {
        return '/repos/' . $this->owner . '/' . $this->repo;
    }
}
```

#### Query Parameters

Add query parameters to requests:

```php
class GetUserReposRequest extends Request
{
    protected Method $method = Method::GET;

    public function __construct(
        protected string $username,
        protected ?string $type = null,
    ) {
    }

    public function resolveEndpoint(): string
    {
        return '/users/' . $this->username . '/repos';
    }

    protected function defaultQuery(): array
    {
        return array_filter([
            'type' => $this->type,
        ]);
    }
}
```

Runtime query parameters:

```php
$request = new GetUserReposRequest('octocat');
$request->query()->add('type', 'owner');
$request->query()->merge(['sort' => 'full_name', 'direction' => 'asc']);
```

#### Custom Headers

Override or add headers at the request level:

```php
class GetRepositoryRequest extends Request
{
    protected function defaultHeaders(): array
    {
        return [
            'X-GitHub-Api-Version' => '2022-11-28',
        ];
    }
}
```

Runtime headers:

```php
$request->headers()->add('X-Request-ID', uniqid());
```

<a name="sending-requests"></a>
### Sending Requests

#### Synchronous Requests

```php
$connector = new GitHubConnector($apiToken);
$request = new GetRepositoryRequest('octocat', 'Hello-World');
$response = $connector->send($request);
```

Or use the static factory:

```php
$response = GitHubConnector::make($apiToken)->send(new GetRepositoryRequest('octocat', 'Hello-World'));
```

#### Asynchronous Requests

```php
$promise = $connector->sendAsync($request);

$promise
    ->then(function (Response $response) {
        // Handle success
    })
    ->otherwise(function (RequestException $exception) {
        // Handle error
    });

$promise->wait(); // Block until complete
```

<a name="responses"></a>
### Responses

Saloon provides a rich `Response` object with methods for accessing status, headers, and body data.

#### Status Checks

```php
$response->status();           // 200
$response->ok();               // true if 2xx
$response->successful();       // true if 2xx
$response->failed();           // true if 4xx or 5xx
$response->clientError();      // true if 4xx
$response->serverError();      // true if 5xx
$response->redirect();         // true if 3xx
```

#### Body Access

```php
$response->body();             // Raw string
$response->json();             // Decoded JSON array
$response->array();            // Alias for json()
$response->object();           // JSON as stdClass
$response->collect();          // Laravel Collection (requires illuminate/collections)
$response->stream();           // PSR-7 StreamInterface
```

#### Header Access

```php
$response->headers();          // All headers
$response->header('Content-Type');
```

<a name="solo-requests"></a>
### Solo Requests

For one-off API calls that don't need a connector, use `SoloRequest`:

```php
<?php
declare(strict_types=1);

namespace App\Http\Integrations\Utilities;

use Saloon\Enums\Method;
use Saloon\Http\SoloRequest;

class IpAddressRequest extends SoloRequest
{
    protected Method $method = Method::GET;

    public function resolveEndpoint(): string
    {
        return 'https://api.ipify.org?format=json';
    }
}

// Usage
$response = (new IpAddressRequest())->send();
$ip = $response->json()['ip'];
```

> [!WARNING]
> **Security Warning**: Never accept user-generated URLs in solo requests. This can lead to Server-Side Request Forgery (SSRF) vulnerabilities.

<a name="authentication"></a>
## Authentication

Saloon provides built-in authenticators for common authentication patterns.

<a name="token-authentication"></a>
### Token Authentication

Bearer token authentication:

```php
use Saloon\Http\Auth\TokenAuthenticator;

class GitHubConnector extends Connector
{
    public function __construct(
        protected string $token,
    ) {
    }

    protected function defaultAuth(): ?Authenticator
    {
        return new TokenAuthenticator($this->token);
    }
}
```

Runtime authentication:

```php
$connector->authenticate(new TokenAuthenticator($token));
```

<a name="basic-authentication"></a>
### Basic Authentication

HTTP Basic authentication:

```php
use Saloon\Http\Auth\BasicAuthenticator;

protected function defaultAuth(): ?Authenticator
{
    return new BasicAuthenticator($username, $password);
}
```

<a name="query-parameter-authentication"></a>
### Query Parameter Authentication

API key in query string:

```php
use Saloon\Http\Auth\QueryAuthenticator;

protected function defaultAuth(): ?Authenticator
{
    return new QueryAuthenticator('api_key', $this->apiKey);
}
```

<a name="custom-authenticators"></a>
### Custom Authenticators

Create custom authentication logic:

```php
<?php
declare(strict_types=1);

namespace App\Http\Integrations\GitHub\Auth;

use Saloon\Contracts\Authenticator;
use Saloon\Http\PendingRequest;

class CustomAuthenticator implements Authenticator
{
    public function __construct(
        protected string $customToken,
    ) {
    }

    public function set(PendingRequest $pendingRequest): void
    {
        $pendingRequest->headers()->add('X-Custom-Auth', $this->customToken);
    }
}
```

Generate authenticator scaffolding:

```bash
bin/cake bake saloon_authenticator GitHub Custom
```

<a name="oauth2-authentication"></a>
### OAuth2 Authentication

Saloon supports OAuth2 Authorization Code Grant:

```php
use Saloon\Helpers\OAuth2\OAuthConfig;
use Saloon\Traits\OAuth2\AuthorizationCodeGrant;

class SpotifyConnector extends Connector
{
    use AuthorizationCodeGrant;

    public function __construct(
        protected string $clientId,
        protected string $clientSecret,
        protected string $redirectUri,
    ) {
    }

    protected function defaultOauthConfig(): OAuthConfig
    {
        return OAuthConfig::make()
            ->setClientId($this->clientId)
            ->setClientSecret($this->clientSecret)
            ->setRedirectUri($this->redirectUri)
            ->setDefaultScopes(['user-read-email'])
            ->setAuthorizeEndpoint('https://accounts.spotify.com/authorize')
            ->setTokenEndpoint('https://accounts.spotify.com/api/token')
            ->setUserEndpoint('https://api.spotify.com/v1/me');
    }
}
```

OAuth2 flow:

```php
$connector = new SpotifyConnector($clientId, $clientSecret, $redirectUri);

// Step 1: Redirect user to authorization URL
$authUrl = $connector->getAuthorizationUrl(['user-read-email'], $state);
header('Location: ' . $authUrl);

// Step 2: Handle callback and exchange code for token
$authenticator = $connector->getAccessToken($_GET['code'], $_GET['state']);

// Step 3: Store the authenticator (contains access + refresh tokens)
// $authenticator->getAccessToken()
// $authenticator->getRefreshToken()
// $authenticator->getExpiresAt()

// Step 4: Use authenticated connector
$connector->authenticate($authenticator);
$response = $connector->send(new GetUserRequest());

// Step 5: Refresh when expired
if ($authenticator->hasExpired()) {
    $newAuthenticator = $connector->refreshAccessToken($authenticator);
    $connector->authenticate($newAuthenticator);
}
```

<a name="request-bodies"></a>
## Request Bodies

<a name="json-body"></a>
### JSON Body

Send JSON data:

```php
use Saloon\Contracts\Body\HasBody;
use Saloon\Enums\Method;
use Saloon\Http\Request;
use Saloon\Traits\Body\HasJsonBody;

class CreateRepositoryRequest extends Request implements HasBody
{
    use HasJsonBody;

    protected Method $method = Method::POST;

    public function __construct(
        protected string $name,
        protected string $description = '',
    ) {
    }

    public function resolveEndpoint(): string
    {
        return '/user/repos';
    }

    protected function defaultBody(): array
    {
        return [
            'name' => $this->name,
            'description' => $this->description,
            'private' => false,
        ];
    }
}
```

Runtime body manipulation:

```php
$request = new CreateRepositoryRequest('Hello-World', 'My first repository');
$request->body()->add('private', true);
$request->body()->merge(['has_issues' => true]);
$request->body()->remove('description');
$request->body()->all(); // Get all body data
```

<a name="multipart-form-body"></a>
### Multipart Form Body

Send multipart form data with file uploads:

```php
use Saloon\Contracts\Body\HasBody;
use Saloon\Data\MultipartValue;
use Saloon\Traits\Body\HasMultipartBody;

class UploadAvatarRequest extends Request implements HasBody
{
    use HasMultipartBody;

    protected Method $method = Method::POST;

    public function __construct(
        protected string $filePath,
        protected string $username,
    ) {
    }

    protected function defaultBody(): array
    {
        return [
            new MultipartValue(
                name: 'avatar',
                value: fopen($this->filePath, 'r'),
                filename: basename($this->filePath),
            ),
            new MultipartValue('username', $this->username),
        ];
    }
}
```

Attach files at runtime:

```php
$request->body()->attach('avatar', $fileResource, 'avatar.jpg', ['Content-Type' => 'image/jpeg']);
$request->body()->add('field', 'value');
```

<a name="xml-body"></a>
### XML Body

Send XML data:

```php
use Saloon\Traits\Body\HasXmlBody;

class SendXmlRequest extends Request implements HasBody
{
    use HasXmlBody;

    protected Method $method = Method::POST;

    protected function defaultBody(): string
    {
        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<request>
    <name>John Doe</name>
    <email>john@example.com</email>
</request>
XML;
    }
}
```

> [!TIP]
> For advanced XML handling, consider using the [XML Wrangler](https://github.com/saloonphp/xml-wrangler) plugin.

<a name="url-encoded-form-body"></a>
### URL Encoded Form Body

Send form-urlencoded data:

```php
use Saloon\Traits\Body\HasFormBody;

class LoginRequest extends Request implements HasBody
{
    use HasFormBody;

    protected Method $method = Method::POST;

    public function __construct(
        protected string $username,
        protected string $password,
    ) {
    }

    protected function defaultBody(): array
    {
        return [
            'username' => $this->username,
            'password' => $this->password,
        ];
    }
}
```

<a name="string-plain-text-body"></a>
### String/Plain Text Body

Send plain text:

```php
use Saloon\Traits\Body\HasStringBody;

class SendTextRequest extends Request implements HasBody
{
    use HasStringBody;

    protected Method $method = Method::POST;

    public function __construct(
        protected string $content,
    ) {
    }

    protected function defaultHeaders(): array
    {
        return [
            'Content-Type' => 'text/plain',
        ];
    }

    protected function defaultBody(): string
    {
        return $this->content;
    }
}
```

<a name="stream-body"></a>
### Stream Body

Send stream resources:

```php
use Saloon\Traits\Body\HasStreamBody;

class UploadFileRequest extends Request implements HasBody
{
    use HasStreamBody;

    protected Method $method = Method::POST;

    public function __construct(
        protected $fileResource,
    ) {
    }

    protected function defaultHeaders(): array
    {
        return [
            'Content-Type' => 'application/octet-stream',
        ];
    }

    protected function defaultBody()
    {
        return $this->fileResource;
    }
}
```

<a name="handling-responses"></a>
## Handling Responses

<a name="response-data"></a>
### Response Data

Access response data in various formats:

```php
// JSON
$data = $response->json();
$name = $response->json('user.name'); // Dot notation

// Object
$object = $response->object();
echo $object->user->name;

// XML
$xml = $response->xmlReader(); // Requires saloonphp/xml-wrangler
$values = $xml->values();

// HTML/DOM
$crawler = $response->dom(); // Requires symfony/dom-crawler
$title = $crawler->filter('title')->text();

// Collection
$collection = $response->collect(); // Requires illuminate/collections
$filtered = $collection->filter(fn($item) => $item['active']);
```

<a name="response-status"></a>
### Response Status

```php
$response->status();           // 200
$response->ok();               // true
$response->successful();       // true
$response->redirect();         // false
$response->failed();           // false
$response->clientError();      // false
$response->serverError();      // false
```

<a name="response-headers"></a>
### Response Headers

```php
$headers = $response->headers();
$contentType = $response->header('Content-Type');
```

<a name="saving-response-to-file"></a>
### Saving Response to File

```php
$response->saveBodyToFile('/path/to/file.pdf');
```

<a name="error-handling"></a>
## Error Handling

<a name="exception-hierarchy"></a>
### Exception Hierarchy

Saloon uses a well-structured exception hierarchy:

```
SaloonException
├── FatalRequestException (connection errors, timeouts)
└── RequestException (HTTP errors)
    ├── ServerException (5xx errors)
    │   ├── InternalServerErrorException (500)
    │   ├── ServiceUnavailableException (503)
    │   └── GatewayTimeoutException (504)
    └── ClientException (4xx errors)
        ├── UnauthorizedException (401)
        ├── ForbiddenException (403)
        ├── NotFoundException (404)
        ├── MethodNotAllowedException (405)
        └── TooManyRequestsException (429)
```

<a name="throwing-exceptions"></a>
### Throwing Exceptions

**Per-response throwing**:

```php
try {
    $response = $connector->send($request);
    $response->throw(); // Throw if 4xx or 5xx

    $data = $response->json();
} catch (RequestException $exception) {
    // Handle error
    $errorResponse = $exception->getResponse();
    $errorBody = $errorResponse->json();
}
```

**Always throw on errors**:

```php
use Saloon\Traits\Plugins\AlwaysThrowOnErrors;

class GitHubConnector extends Connector
{
    use AlwaysThrowOnErrors;
}
```

Now all requests automatically throw on 4xx/5xx responses.

<a name="custom-error-detection"></a>
### Custom Error Detection

Some APIs return 200 with error information in the body:

```php
public function hasRequestFailed(Response $response): bool
{
    $data = $response->json();

    return isset($data['error']) && $data['error'] === true;
}
```

Custom exceptions:

```php
protected function getRequestException(
    Response $response,
    ?\Exception $senderException
): ?RequestException {
    $data = $response->json();

    if (isset($data['error_code']) && $data['error_code'] === 'RATE_LIMITED') {
        return new CustomRateLimitException($response, $senderException);
    }

    return parent::getRequestException($response, $senderException);
}
```

<a name="advanced-features"></a>
## Advanced Features

<a name="data-transfer-objects"></a>
### Data Transfer Objects

Convert responses to strongly-typed DTOs:

```php
<?php
declare(strict_types=1);

namespace App\Http\Integrations\GitHub\Dto;

class User
{
    public function __construct(
        public int $id,
        public string $login,
        public string $name,
        public ?string $email = null,
    ) {
    }
}
```

Implement DTO creation in your request:

```php
use App\Http\Integrations\GitHub\Dto\User;

class GetUserRequest extends Request
{
    // ...

    public function createDtoFromResponse(Response $response): mixed
    {
        $data = $response->json();

        return new User(
            id: $data['id'],
            login: $data['login'],
            name: $data['name'],
            email: $data['email'] ?? null,
        );
    }
}
```

Retrieve the DTO:

```php
$response = $connector->send(new GetUserRequest('sammyjo20'));
$user = $response->dto(); // Returns User instance

// Or throw on failure
$user = $response->dtoOrFail();
```

Access original response from DTO:

```php
use Saloon\Contracts\DataObjects\WithResponse;
use Saloon\Traits\Responses\HasResponse;

class User implements WithResponse
{
    use HasResponse;

    // ...
}

$user = $response->dto();
$originalResponse = $user->getResponse();
```

<a name="retrying-requests"></a>
### Retrying Requests

Configure automatic retries:

```php
class GitHubConnector extends Connector
{
    public int $tries = 3;
    public int $retryInterval = 500; // milliseconds
    public bool $useExponentialBackoff = true;
    public bool $throwOnMaxTries = true;
}
```

Custom retry logic:

```php
protected function handleRetry(
    FatalRequestException|RequestException $exception,
    Request $request
): bool {
    // Refresh auth token on 401
    if ($exception->getResponse()?->status() === 401) {
        $this->authenticate($this->refreshToken());
        return true; // Retry the request
    }

    // Don't retry on 404
    if ($exception->getResponse()?->status() === 404) {
        return false;
    }

    return true; // Use default retry behavior
}
```

> [!NOTE]
> Retry logic only works with synchronous requests, not async or pools.

<a name="request-delays"></a>
### Request Delays

Add delays between requests:

```php
// Connector-level default
protected function defaultDelay(): int
{
    return 500; // milliseconds
}

// Runtime delay
$connector->delay()->set(1000);
```

Request-level delays override connector delays.

<a name="concurrency-pools"></a>
### Concurrency & Pools

Send multiple requests concurrently:

```php
$requests = [
    new GetUserRequest('octocat'),
    new GetUserRequest('skie'),
];

$pool = $connector->pool(
    requests: $requests,
    concurrency: 5,
    responseHandler: function (Response $response, $key) {
        // Handle each successful response
        echo "User {$key}: " . $response->json('login') . "\n";
    },
    exceptionHandler: function (\Exception $exception, $key) {
        // Handle each failed request
        echo "User {$key} failed: " . $exception->getMessage() . "\n";
    }
);

$promise = $pool->send();
$promise->wait();
```

Named requests:

```php
$pool = $connector->pool([
    'octocat' => new GetUserRequest('octocat'),
    'skie' => new GetUserRequest('skie'),
]);
```

Generators for memory efficiency:

```php
$pool = $connector->pool(function () {
    foreach (['octocat', 'skie'] as $username) {
        yield new GetUserRequest($username);
    }
});
```

<a name="middleware"></a>
### Middleware

**Boot method** (executes before every request):

```php
public function boot(PendingRequest $pendingRequest): void
{
    $pendingRequest->headers()->add('X-App-Version', '1.0.0');
}
```

**Request middleware**:

```php
$connector->middleware()->onRequest(function (PendingRequest $pendingRequest) {
    ray('Sending request:', $pendingRequest->getUri());

    // Optionally modify and return
    return $pendingRequest;

    // Or return early response
    // return new FakeResponse(['mocked' => true]);
});
```

**Response middleware**:

```php
$connector->middleware()->onResponse(function (Response $response) {
    ray('Received response:', $response->status());
});
```

Custom middleware classes:

```php
use Saloon\Contracts\RequestMiddleware;

class LoggingMiddleware implements RequestMiddleware
{
    public function __invoke(PendingRequest $pendingRequest): void
    {
        Log::write('debug', 'Saloon request: ' . $pendingRequest->getUri());
    }
}

$connector->middleware()->onRequest(new LoggingMiddleware(), 'logging');
```

<a name="debugging"></a>
### Debugging

Requires `symfony/var-dumper` (included in CakePHP by default).

```php
// Debug request + response
$connector->debug()->send($request);

// Debug request only
$connector->debugRequest()->send($request);

// Debug response only
$connector->debugResponse()->send($request);

// Die after debugging
$connector->debug(die: true)->send($request);

// Custom debugging logic
$connector->debug(function ($pendingRequest, $psrRequest) {
    ray($psrRequest);
})->send($request);
```

<a name="building-sdks"></a>
## Building SDKs

<a name="connector-as-sdk-root"></a>
### Connector as SDK Root

The connector serves as the SDK entry point:

```php
class SpotifyConnector extends Connector
{
    public function __construct(
        protected string $apiToken,
    ) {
    }

    public function resolveBaseUrl(): string
    {
        return 'https://api.spotify.com/v1';
    }

    protected function defaultAuth(): ?Authenticator
    {
        return new TokenAuthenticator($this->apiToken);
    }
}

// Usage
$sdk = new SpotifyConnector($apiToken);
$response = $sdk->send(new GetPlaylistRequest($id));
```

<a name="resource-pattern"></a>
### Resource Pattern

Organize endpoints into resource classes:

```php
class SpotifyConnector extends Connector
{
    // ...

    public function playlists(): PlaylistResource
    {
        return new PlaylistResource($this);
    }

    public function tracks(): TrackResource
    {
        return new TrackResource($this);
    }

    public function users(): UserResource
    {
        return new UserResource($this);
    }
}
```

Base resource class:

```php
<?php
declare(strict_types=1);

namespace App\Http\Integrations\Spotify\Resources;

use Saloon\Http\Connector;
use Saloon\Http\Response;

abstract class Resource
{
    public function __construct(
        protected Connector $connector,
    ) {
    }

    protected function send($request): Response
    {
        return $this->connector->send($request);
    }
}
```

Playlist resource:

```php
class PlaylistResource extends Resource
{
    public function get(string $id): Response
    {
        return $this->send(new GetPlaylistRequest($id));
    }

    public function create(array $data): Response
    {
        return $this->send(new CreatePlaylistRequest($data));
    }

    public function update(string $id, array $data): Response
    {
        return $this->send(new UpdatePlaylistRequest($id, $data));
    }

    public function delete(string $id): Response
    {
        return $this->send(new DeletePlaylistRequest($id));
    }
}
```

Usage:

```php
$sdk = new SpotifyConnector($apiToken);

// Clean, expressive API
$playlist = $sdk->playlists()->get('37i9dQZF1DXcBWIGoYBM5M');
$tracks = $sdk->tracks()->search('Never Gonna Give You Up');
$user = $sdk->users()->me();
```

<a name="method-based-approach"></a>
### Method-Based Approach

Simple method wrappers on the connector:

```php
class SpotifyConnector extends Connector
{
    // ...

    public function getPlaylist(string $id): Response
    {
        return $this->send(new GetPlaylistRequest($id));
    }

    public function createPlaylist(array $data): Response
    {
        return $this->send(new CreatePlaylistRequest($data));
    }
}

// Usage
$sdk = new SpotifyConnector($apiToken);
$playlist = $sdk->getPlaylist($id);
```

<a name="pagination"></a>
## Pagination

Install the pagination plugin:

```bash
composer require saloonphp/pagination-plugin
```

<a name="paged-pagination"></a>
### Paged Pagination

For APIs using page numbers:

```php
use Saloon\Http\Request;
use Saloon\Http\Response;
use Saloon\PaginationPlugin\Contracts\HasPagination;
use Saloon\PaginationPlugin\PagedPaginator;

class GitHubConnector extends Connector implements HasPagination
{
    public function paginate(Request $request): PagedPaginator
    {
        return new class($this, $request) extends PagedPaginator
        {
            protected ?int $perPageLimit = 100;

            protected function isLastPage(Response $response): bool
            {
                // GitHub returns a JSON array of items for list endpoints
                return empty($response->json());
            }

            protected function getPageItems(Response $response, Request $request): array
            {
                return $response->json();
            }

            protected function applyPagination(Request $request): Request
            {
                $request->query()->set('page', $this->currentPage);
                $request->query()->set('per_page', $this->perPageLimit);

                return $request;
            }
        };
    }
}
```

Usage:

```php
$connector = new GitHubConnector($apiToken);

// Iterate over pages
foreach ($connector->paginate(new GetUserReposRequest('octocat')) as $response) {
    $repos = $response->json();
    // Process repositories...
}

// Iterate over items
foreach ($connector->paginate(new GetUserReposRequest('octocat'))->items() as $repo) {
    // Process individual repository...
}

// Collect all items (LazyCollection)
$allRepos = $connector->paginate(new GetUserReposRequest('octocat'))->collect();
```

<a name="offset-pagination"></a>
### Offset Pagination

For APIs using limit/offset:

```php
use Saloon\PaginationPlugin\OffsetPaginator;

return new class($this, $request) extends OffsetPaginator
{
    protected ?int $perPageLimit = 100;

    protected function isLastPage(Response $response): bool
    {
        return empty($response->json('data'));
    }

    protected function getPageItems(Response $response, Request $request): array
    {
        return $response->json('data');
    }
};
```

<a name="cursor-pagination"></a>
### Cursor Pagination

For APIs using cursor tokens:

```php
use Saloon\PaginationPlugin\CursorPaginator;

return new class($this, $request) extends CursorPaginator
{
    protected ?int $perPageLimit = 100;

    protected function getNextCursor(Response $response): int|string
    {
        return $response->json('next_cursor');
    }

    protected function isLastPage(Response $response): bool
    {
        return $response->json('next_cursor') === null;
    }

    protected function getPageItems(Response $response, Request $request): array
    {
        return $response->json('data');
    }

    protected function applyPagination(Request $request): Request
    {
        if (isset($this->currentCursor)) {
            $request->query()->set('cursor', $this->currentCursor);
        }

        return $request;
    }
};
```

<a name="custom-pagination"></a>
### Custom Pagination

For unique pagination schemes:

```php
use Saloon\PaginationPlugin\Paginator;

return new class($this, $request) extends Paginator
{
    protected function isLastPage(Response $response): bool
    {
        // Your logic
    }

    protected function getPageItems(Response $response, Request $request): array
    {
        // Your logic
    }

    protected function applyPagination(Request $request): Request
    {
        // Your logic
        return $request;
    }
};
```

<a name="caching"></a>
## Caching

Install the cache plugin:

```bash
composer require saloonphp/cache-plugin
```

<a name="setup-caching"></a>
### Setup Caching

```php
use Saloon\CachePlugin\Contracts\Cacheable;
use Saloon\CachePlugin\Contracts\Driver;
use Saloon\CachePlugin\Traits\HasCaching;

class GitHubConnector extends Connector implements Cacheable
{
    use HasCaching;

    protected function resolveCacheDriver(): Driver
    {
        // Return cache driver (see below)
    }

    protected function cacheExpiryInSeconds(): int
    {
        return 3600; // 1 hour
    }
}
```

<a name="cakephp-cache-driver"></a>
### CakePHP Cache Driver

Use the provided CakePHP cache bridge:

```php
use Crustum\Saloon\Config\SaloonConfig;

class GitHubConnector extends Connector implements Cacheable
{
    use HasCaching;

    protected function resolveCacheDriver(): Driver
    {
        return SaloonConfig::cacheDriver();
    }
}
```

<a name="cache-configuration"></a>
### Cache Configuration

Configure the CakePHP cache config in `config/saloon.php`:

```php
return [
    'Saloon' => [
        'ecosystem' => [
            'cache' => ['config' => 'default'],
        ],
    ],
];
```

The driver uses `Cache::pool()` (PSR-6) for TTL-aware storage.

<a name="invalidating-cache"></a>
### Invalidating Cache

```php
// Check if response was cached
if ($response->isCached()) {
    // ...
}

// Invalidate cache for a specific request
$connector->invalidateCache(new GetRepositoryRequest('octocat', 'Hello-World'));

// Disable caching per-request
$request->disableCaching();
```

Custom cache keys:

```php
protected function cacheKey(Request $request): ?string
{
    return 'custom-key-' . $request->resolveEndpoint();
}
```

Customize cacheable methods (default: GET, OPTIONS):

```php
protected function getCacheableMethods(): array
{
    return [Method::GET, Method::HEAD];
}
```

<a name="rate-limiting"></a>
## Rate Limiting

Install the rate limit plugin:

```bash
composer require saloonphp/rate-limit-plugin
```

<a name="setup-rate-limiting"></a>
### Setup Rate Limiting

```php
use Saloon\RateLimitPlugin\Contracts\RateLimitStore;
use Saloon\RateLimitPlugin\Limit;
use Saloon\RateLimitPlugin\Traits\HasRateLimits;

class GitHubConnector extends Connector
{
    use HasRateLimits;

    protected function resolveLimits(): array
    {
        return [
            Limit::allow(60)->everyMinute(),
            Limit::allow(1000)->everyDay(),
        ];
    }

    protected function resolveRateLimitStore(): RateLimitStore
    {
        // Return rate limit store (see below)
    }
}
```

<a name="cakephp-rate-limit-store"></a>
### CakePHP Rate Limit Store

Use the provided CakePHP cache bridge:

```php
use Crustum\Saloon\Config\SaloonConfig;

protected function resolveRateLimitStore(): RateLimitStore
{
    return SaloonConfig::rateLimitStore();
}
```

Configure the CakePHP cache config in `config/saloon.php`:

```php
return [
    'Saloon' => [
        'ecosystem' => [
            'rate_limit' => ['config' => 'default'],
        ],
    ],
];
```

<a name="rate-limit-configuration"></a>
### Rate Limit Configuration

Available limit durations:

```php
Limit::allow(100)->everySeconds(5)
Limit::allow(60)->everyMinute()
Limit::allow(60)->everyFiveMinutes()
Limit::allow(1000)->everyHour()
Limit::allow(5000)->everyDay()
Limit::allow(100000)->everyMonth()

// Until specific time
Limit::allow(60)->untilEndOfMinute()
Limit::allow(1000)->untilEndOfHour()
Limit::allow(10000)->untilMidnightTonight()
Limit::allow(1000)->everyDayUntil('8pm')
```

Leaky bucket algorithm:

```php
use Saloon\RateLimitPlugin\Bucket;

protected function resolveLimits(): array
{
    return [
        Bucket::capacity(60)->leak(1)->everySeconds(1)->sleep(),
    ];
}
```

<a name="handling-rate-limits"></a>
### Handling Rate Limits

**Throw exception** (default):

```php
use Saloon\RateLimitPlugin\Exceptions\RateLimitReachedException;

try {
    $response = $connector->send($request);
} catch (RateLimitReachedException $exception) {
    // Limit reached
    $exception->getLimit();
    $exception->getRetryAfter();
}
```

**Sleep until available**:

```php
protected function resolveLimits(): array
{
    return [
        Limit::allow(60)->everyMinute()->sleep(),
    ];
}
```

**Per-user limits**:

```php
protected function resolveLimits(): array
{
    return [
        Limit::allow(60)
            ->everyMinute()
            ->name('user-' . $this->userId),
    ];
}
```

**Threshold warnings**:

```php
Limit::allow(60, threshold: 0.8)->everyMinute()
```

**Auto-detect 429 responses**:

The plugin automatically detects `429 Too Many Requests` responses and parses the `Retry-After` header.

<a name="cakephp-integration"></a>
## CakePHP Integration

<a name="events"></a>
### Events

When `middleware.events` is enabled (default), every `$connector->send()` dispatches CakePHP events.

#### Event Classes

| Event | When | Properties |
|-------|------|------------|
| `SendingSaloonRequest` | Before HTTP request is sent | `$pendingRequest` |
| `SentSaloonRequest` | After response is received | `$pendingRequest`, `$response` |

#### Listening to Events

```php
use Cake\Event\EventInterface;
use Cake\Event\EventListenerInterface;
use Crustum\Saloon\Event\SendingSaloonRequest;
use Crustum\Saloon\Event\SentSaloonRequest;

class SaloonRequestLogger implements EventListenerInterface
{
    public function implementedEvents(): array
    {
        return [
            SendingSaloonRequest::class => 'onSending',
            SentSaloonRequest::class => 'onSent',
        ];
    }

    public function onSending(SendingSaloonRequest $event): void
    {
        $pendingRequest = $event->getPendingRequest();
        Log::write('debug', 'Sending request to: ' . $pendingRequest->getUri());
    }

    public function onSent(SentSaloonRequest $event): void
    {
        $response = $event->getResponse();
        Log::write('debug', 'Received response: ' . $response->status());
    }
}
```

Register the listener in `config/bootstrap.php`:

```php
use Cake\Event\EventManager;

EventManager::instance()->on(new SaloonRequestLogger());
```

<a name="cli-generators"></a>
### CLI Generators

Generate Saloon integration classes using CakePHP Bake:

#### Available Commands

| Command | Arguments | Output |
|---------|-----------|--------|
| `bake saloon_connector` | `{integration} {name}` | `{Integration}Connector.php` |
| `bake saloon_request` | `{integration} {name}` | `Requests/{Name}Request.php` |
| `bake saloon_response` | `{integration} {name}` | `Responses/{Name}Response.php` |
| `bake saloon_plugin` | `{integration} {name}` | `Plugins/{Name}Plugin.php` |
| `bake saloon_authenticator` | `{integration} {name}` | `Auth/{Name}Authenticator.php` |
| `saloon list` | — | Lists integrations and class counts |

#### Examples

```bash
# Create a connector
bin/cake bake saloon_connector JsonPlaceholder JsonPlaceholder

# Create a request
bin/cake bake saloon_request JsonPlaceholder GetPost --method GET

# Create a custom response
bin/cake bake saloon_response JsonPlaceholder Post

# Create a plugin/trait
bin/cake bake saloon_plugin JsonPlaceholder Logging

# Create an authenticator
bin/cake bake saloon_authenticator JsonPlaceholder Custom

# List all integrations
bin/cake saloon list
```

#### Custom Templates

Override bake templates by copying them to your application:

```bash
cp -r plugins/Saloon/templates/bake/Saloon/ templates/bake/Saloon/
```

Or use a custom theme:

```bash
bin/cake bake saloon_connector GitHub GitHub --theme MyTheme
```

<a name="configuration-reference"></a>
### Configuration Reference

All configuration is nested under the `Saloon` key in `config/saloon.php`:

| Key | Default | Description |
|-----|---------|-------------|
| `default_sender` | `GuzzleSender::class` | Global Saloon HTTP sender class |
| `integrations_path` | `src/Http/Integrations` | Directory for generated integrations |
| `integrations_namespace` | `App\Http\Integrations` | PHP namespace for generated classes |
| `middleware.mock` | `true` | Attach global mock client when faking |
| `middleware.events` | `true` | Dispatch CakePHP events on every send |
| `middleware.record_response` | `false` | Deprecated response recording helper |
| `ecosystem.cache.config` | `default` | CakePHP cache config for cache plugin |
| `ecosystem.rate_limit.config` | `default` | CakePHP cache config for rate limit store |

Example configuration:

```php
return [
    'Saloon' => [
        'default_sender' => \Saloon\Http\Senders\GuzzleSender::class,
        'integrations_path' => ROOT . DS . 'src' . DS . 'Http' . DS . 'Integrations',
        'integrations_namespace' => 'App\Http\Integrations',
        'middleware' => [
            'mock' => true,
            'events' => true,
            'record_response' => false,
        ],
        'ecosystem' => [
            'cache' => ['config' => 'default'],
            'rate_limit' => ['config' => 'default'],
        ],
    ],
];
```

<a name="testing"></a>
## Testing

<a name="mocking-responses"></a>
### Mocking Responses

Use the global `Saloon` facade to mock HTTP responses:

```php
use Crustum\Saloon\Saloon;
use Saloon\Http\Faking\MockResponse;

class UserTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Saloon::resetMockState();
    }

    public function testGetUser(): void
    {
        Saloon::fake([
            GetUserRequest::class => MockResponse::make([
                'id' => 583231,
                'login' => 'octocat',
                'name' => 'The Octocat',
            ], 200),
        ]);

        $connector = new GitHubConnector($apiToken);
        $response = $connector->send(new GetUserRequest('octocat'));

        $this->assertTrue($response->ok());
        $this->assertEquals('The Octocat', $response->json('name'));
    }
}
```

**Always reset mock state** in `setUp()` to avoid test pollution:

```php
protected function setUp(): void
{
    parent::setUp();
    Saloon::resetMockState();
}
```

<a name="fixtures"></a>
### Fixtures

Record real API responses as fixtures for testing:

```php
// First run: Makes real request and saves response
Saloon::fake([
    GetUserRequest::class => MockResponse::fixture('github/get-user'),
]);

// Subsequent runs: Uses saved fixture
```

Fixtures are stored in `tests/Fixtures/Saloon/` by default.

**Customize fixture path**:

```php
use Saloon\Http\Faking\MockConfig;

MockConfig::setFixturePath('/custom/path');
```

**Sensitive data redaction**:

Create custom fixture classes:

```php
<?php
declare(strict_types=1);

namespace Tests\Fixtures\Saloon;

use Saloon\Http\Faking\Fixture;

class GitHubFixture extends Fixture
{
    protected function defineSensitiveHeaders(): array
    {
        return ['Authorization', 'X-API-Key'];
    }

    protected function defineSensitiveJsonParameters(): array
    {
        return ['api_token', 'password'];
    }

    protected function defineSensitiveRegexPatterns(): array
    {
        return [
            '/Bearer\s+\w+/i' => 'Bearer [REDACTED]',
        ];
    }
}
```

Use the custom fixture:

```php
MockResponse::fixture('github/user', GitHubFixture::class);
```

<a name="assertions"></a>
### Assertions

Assert that specific requests were sent:

```php
use Crustum\Saloon\Saloon;

Saloon::fake([
    GetUserRequest::class => MockResponse::make([
        'id' => 583231,
        'login' => 'octocat',
    ], 200),
    GetRepositoryRequest::class => MockResponse::make([
        'id' => 1296269,
        'full_name' => 'octocat/Hello-World',
    ], 200),
]);

$connector = new GitHubConnector($apiToken);
$connector->send(new GetUserRequest('octocat'));
$connector->send(new GetRepositoryRequest('octocat', 'Hello-World'));

// Assert specific request was sent
Saloon::assertSent(GetUserRequest::class);

// Assert with callback for custom matching
Saloon::assertSent(function (GetUserRequest $request) {
    return $request->username === 'octocat';
});

// Assert request was sent N times
Saloon::assertSent(GetUserRequest::class, 1);

// Assert total requests sent
Saloon::assertSentCount(2);

// Assert request was NOT sent
Saloon::assertNotSent(CreateRepositoryRequest::class);

// Assert no requests sent
Saloon::assertNothingSent();
```

**URL pattern matching**:

```php
Saloon::fake([
    'api.github.com/users/*' => MockResponse::make(['login' => 'octocat'], 200),
    'api.github.com/repos/*' => MockResponse::make(['full_name' => 'octocat/Hello-World'], 200),
    '*' => MockResponse::make(['message' => 'Not Found'], 404),
]);
```

<a name="event-testing"></a>
### Event Testing

Test that CakePHP events are dispatched:

```php
use Crustum\Saloon\Event\SendingSaloonRequest;
use Crustum\Saloon\Event\SentSaloonRequest;
use Crustum\Saloon\Test\SaloonEventFake;

class EventTest extends TestCase
{
    public function testEventsDispatched(): void
    {
        SaloonEventFake::fake();
        Saloon::fake([
            GetUserRequest::class => MockResponse::make(['id' => 1], 200),
        ]);

        $connector = new TestConnector();
        $connector->send(new GetUserRequest());

        SaloonEventFake::assertDispatched(SendingSaloonRequest::class);
        SaloonEventFake::assertDispatched(SentSaloonRequest::class);

        SaloonEventFake::assertDispatched(
            SendingSaloonRequest::class,
            function (SendingSaloonRequest $event) {
                return str_contains($event->getPendingRequest()->getUri(), '/users');
            }
        );
    }
}
```

<a name="preventing-stray-requests"></a>
### Preventing Stray Requests

Prevent accidental real HTTP requests in tests:

```php
use Saloon\Config\Config;

class TestCase extends \Cake\TestSuite\TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Throw exception if real requests are attempted
        Config::preventStrayRequests();

        Saloon::resetMockState();
    }
}
```

Prevent fixture recording in CI:

```php
use Saloon\Http\Faking\MockConfig;

MockConfig::throwOnMissingFixtures();
```

---

## Official Saloon Documentation

For comprehensive Saloon documentation, visit [https://docs.saloon.dev/](https://docs.saloon.dev/)

Topics covered in the official docs:

- **The Basics**: Installation, Connectors, Requests, Authentication, Request Bodies, Sending Requests, Responses, Error Handling, Debugging, Testing
- **Digging Deeper**: DTOs, Building SDKs, Solo Requests, Retrying, Delays, Concurrency, OAuth2, Middleware, PSR Support
- **Installable Plugins**: Pagination, Laravel Plugin, Caching, Rate Limiting, XML Wrangler, Auto SDK Generator
- **Resources**: Official Book, How-to Guides, Tutorials, Showcase, Known Issues

