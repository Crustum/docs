# CakePHP Mercure Broadcasting Plugin

<a name="introduction"></a>
## Introduction

The Mercure Broadcasting plugin provides a Mercure broadcaster driver for the CakePHP Broadcasting plugin. Mercure is a protocol for real-time communication using Server-Sent Events (SSE), which provides a simpler alternative to WebSockets with built-in reconnection and fallback support.

This plugin integrates Mercure with CakePHP's broadcasting system, allowing you to broadcast events to clients using the Mercure protocol while maintaining compatibility with the Broadcasting plugin's API.

<a name="installation"></a>
## Installation

Install via Composer:

```bash
composer require crustum/mercure-broadcasting
```

> [!NOTE]
> You need a running Mercure server. Installation instructions are available [here](https://mercure.rocks/docs/installation).

<a name="configuration"></a>
## Configuration

Configure the Mercure broadcaster in your `config/broadcasting.php` file:

```php
use Crustum\Broadcasting\Broadcasting;

Broadcasting::setConfig('mercure', [
    'className' => 'Crustum/MercureBroadcasting.Mercure',
    'api_url' => env('MERCURE_API_URL', 'http://localhost:3000/.well-known/mercure'),
    'public_url' => env('MERCURE_PUBLIC_URL', 'http://localhost:3000/.well-known/mercure'),
    'publisher_secret' => env('MERCURE_PUBLISHER_SECRET'),
    'subscriber_secret' => env('MERCURE_SUBSCRIBER_SECRET'),
    'algorithm' => 'hmac.sha256',
    'token_expires_in' => 7200,
]);
```

To use Mercure as your default broadcaster, configure the `default` connection:

```php
Broadcasting::setConfig('default', [
    'className' => 'Crustum/MercureBroadcasting.Mercure',
    'api_url' => env('MERCURE_API_URL', 'http://localhost:3000/.well-known/mercure'),
    'public_url' => env('MERCURE_PUBLIC_URL', 'http://localhost:3000/.well-known/mercure'),
    'publisher_secret' => env('MERCURE_PUBLISHER_SECRET'),
    'subscriber_secret' => env('MERCURE_SUBSCRIBER_SECRET'),
    'algorithm' => 'hmac.sha256',
    'token_expires_in' => 7200,
]);
```

<a name="client-side-integration"></a>
## Client Side Integration

The Mercure Echo Connector provides Laravel Echo compatibility for Mercure. Install it via NPM:

```shell
npm install @crustum/laravel-echo-mercure
```

Then configure Echo to use the Mercure connector:

```js
import Echo from 'laravel-echo';
import { MercureConnector } from '@crustum/laravel-echo-mercure';

window.Echo = new Echo({
    broadcaster: MercureConnector,
    mercureUrl: '/.well-known/mercure',
    authEndpoint: '/broadcasting/auth',
});
```

The Mercure connector will automatically obtain the subscriber token via the `authEndpoint` when subscribing to private channels. For public channels, no authentication is required.

Once configured, you can use Echo as you would with any other broadcaster to subscribe to channels and listen for events.
