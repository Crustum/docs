# RocketChat Notification Channel

<a name="introduction"></a>
## Introduction

The RocketChat Notification Channel allows you to send notifications to RocketChat via incoming webhooks using the CakePHP Notification plugin. RocketChat is a free, open-source team collaboration platform that provides features like instant messaging, file sharing, and video conferencing.

This channel plugin provides:
- Simple webhook-based integration with RocketChat
- Rich message formatting with attachments, fields, and images
- Support for multiple RocketChat instances
- Fluent API for building complex messages
- Full integration with CakePHP's Notification system

<a name="installation"></a>
## Installation

### Requirements

- PHP 8.1 or higher
- CakePHP 5.0 or higher
- CakePHP Notification Plugin

### Installation via Composer

Install the plugin using composer:

```bash
composer require crustum/notification-rocketchat
```

### Load the Plugin

Add the plugin to your CakePHP application in `src/Application.php`:

```php
<?php
namespace App;

use Cake\Http\BaseApplication;

class Application extends BaseApplication
{
    public function bootstrap(): void
    {
        parent::bootstrap();

        $this->addPlugin('Crustum/Notification');
        $this->addPlugin('Crustum/RocketChatNotification');
    }
}
```

### Verify Installation

After installation, verify that the RocketChat channel is registered:

```bash
bin/cake console
```

```php
use Crustum\Notification\NotificationManager;

$registry = NotificationManager::getRegistry();
$registry->dispatchDiscoveryEvent();

$channel = NotificationManager::channel('rocketchat');
```

<a name="configuration"></a>
## Configuration

<a name="rocketchat-setup"></a>
### RocketChat Setup

#### 1. Create Incoming Webhook

In your RocketChat instance:

1. Go to **Administration** → **Integrations**
2. Click **New Integration**
3. Select **Incoming WebHook**
4. Configure the webhook:
   - **Name**: Your application name
   - **Post to Channel**: Select default channel (can be overridden)
   - **Post as**: Bot username
   - **Script Enabled**: Yes (optional, for advanced processing)
5. Save and copy the **Webhook URL**

The webhook URL will look like:
```
https://your-rocketchat.com/hooks/YOUR_HOOK_ID/YOUR_TOKEN
```

<a name="basic-configuration"></a>
### Basic Configuration

Add the webhook URL to your CakePHP configuration:

**config/app_local.php** (for local development):

```php
<?php
return [
    'Notification' => [
        'channels' => [
            'rocketchat' => [
                'webhook' => 'https://your-rocketchat.com/hooks/YOUR_HOOK_ID/YOUR_TOKEN',
            ],
        ],
    ],
];
```

**Using Environment Variables** (recommended for production):

**.env**:
```env
ROCKETCHAT_WEBHOOK_URL=https://your-rocketchat.com/hooks/YOUR_HOOK_ID/YOUR_TOKEN
```

**config/app.php**:
```php
<?php
return [
    'Notification' => [
        'channels' => [
            'rocketchat' => [
                'webhook' => env('ROCKETCHAT_WEBHOOK_URL'),
                'timeout' => 30,
                'verify' => true,
            ],
        ],
    ],
];
```

<a name="multiple-rocketchat-instances"></a>
### Multiple RocketChat Instances

Configure multiple RocketChat workspaces or channels:

```php
<?php
return [
    'Notification' => [
        'channels' => [
            'rocketchat' => [
                'webhook' => env('ROCKETCHAT_MAIN_WEBHOOK'),
            ],
            'rocketchat-alerts' => [
                'webhook' => env('ROCKETCHAT_ALERTS_WEBHOOK'),
            ],
            'rocketchat-support' => [
                'webhook' => env('ROCKETCHAT_SUPPORT_WEBHOOK'),
            ],
            'rocketchat-internal' => [
                'webhook' => env('ROCKETCHAT_INTERNAL_WEBHOOK'),
            ],
        ],
    ],
];
```

**.env**:
```env
ROCKETCHAT_MAIN_WEBHOOK=https://main.rocketchat.com/hooks/XXX/YYY
ROCKETCHAT_ALERTS_WEBHOOK=https://main.rocketchat.com/hooks/AAA/BBB
ROCKETCHAT_SUPPORT_WEBHOOK=https://support.rocketchat.com/hooks/CCC/DDD
ROCKETCHAT_INTERNAL_WEBHOOK=https://main.rocketchat.com/hooks/EEE/FFF
```

<a name="advanced-configuration"></a>
### Advanced Configuration

#### HTTP Client Options

Configure HTTP client options:

```php
'rocketchat' => [
    'webhook' => env('ROCKETCHAT_WEBHOOK_URL'),
    'timeout' => 30,
    'connect_timeout' => 10,
    'verify' => true,
    'http_errors' => true,
],
```

#### Proxy Configuration

If you're behind a proxy:

```php
'rocketchat' => [
    'webhook' => env('ROCKETCHAT_WEBHOOK_URL'),
    'proxy' => 'http://proxy.example.com:8080',
],
```

#### Custom Headers

Add custom headers to all requests:

```php
'rocketchat' => [
    'webhook' => env('ROCKETCHAT_WEBHOOK_URL'),
    'headers' => [
        'X-Custom-Header' => 'value',
    ],
],
```

<a name="routing-configuration"></a>
### Routing Configuration

#### Entity-Level Routing

Configure routing on your entity:

```php
<?php
namespace App\Model\Entity;

use Cake\ORM\Entity;

class User extends Entity
{
    public function routeNotificationForRocketchat(): ?string
    {
        return '#' . $this->team_channel;
    }
}
```

#### Table-Level Routing

Add behavior to your table:

```php
<?php
namespace App\Model\Table;

use Cake\ORM\Table;

class UsersTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);
        $this->addBehavior('Crustum/Notification.Notifiable');
    }
}
```

### Testing Configuration

For testing, you can use a mock webhook URL:

**config/app_local.php** (development):
```php
'rocketchat' => [
    'webhook' => 'https://webhook.site/your-unique-url',
],
```

Visit https://webhook.site to get a temporary webhook URL for testing.

### Troubleshooting

#### Verify Configuration

```php
use Cake\Core\Configure;

$config = Configure::read('Notification.channels.rocketchat');
debug($config);
```

#### Test Webhook Manually

```bash
curl -X POST https://your-rocketchat.com/hooks/YOUR_HOOK_ID/YOUR_TOKEN \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message"}'
```

<a name="usage"></a>
## Usage

<a name="creating-notifications"></a>
### Creating Notifications

#### Basic Notification

Create a notification class:

```php
<?php
namespace App\Notification;

use Cake\Datasource\EntityInterface;
use Crustum\Notification\AnonymousNotifiable;
use Crustum\Notification\Notification;
use Crustum\RocketChatNotification\Message\RocketChatMessage;

class WelcomeNotification extends Notification
{
    public function via(EntityInterface|AnonymousNotifiable $notifiable): array
    {
        return ['database', 'rocketchat'];
    }

    public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): RocketChatMessage
    {
        return RocketChatMessage::create()
            ->text('Welcome to our platform!')
            ->emoji(':wave:');
    }
}
```

<a name="sending-notifications"></a>
### Sending Notifications

#### To a User Entity

```php
$user = $this->Users->get($userId);
$user->notify(new WelcomeNotification());
```

#### To Multiple Users

```php
$users = $this->Users->find('active');
foreach ($users as $user) {
    $user->notify(new WelcomeNotification());
}

use Crustum\Notification\NotificationManager;

NotificationManager::send($users, new WelcomeNotification());
```

#### On-Demand Notifications

Send to a specific channel without a user entity:

```php
use Crustum\Notification\NotificationManager;

NotificationManager::route('rocketchat', '#general')
    ->notify(new SystemAlertNotification());

NotificationManager::route('rocketchat', '@john.doe')
    ->notify(new DirectMessageNotification());
```

<a name="notification-examples"></a>
### Notification Examples

#### Simple Text Message

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): RocketChatMessage
{
    return RocketChatMessage::create()
        ->text('Your order has been shipped!');
}
```

#### Message with Custom Username and Avatar

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): RocketChatMessage
{
    return RocketChatMessage::create()
        ->text('Deployment successful!')
        ->username('Deploy Bot')
        ->avatar('https://example.com/bot-avatar.png')
        ->emoji(':rocket:');
}
```

#### Message with Attachments

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): RocketChatMessage
{
    return RocketChatMessage::create()
        ->text('New deployment to production')
        ->attachment(function ($attachment) {
            $attachment->title('Version 2.1.0 Released')
                ->text('This release includes bug fixes and new features')
                ->color('good')
                ->field('Environment', 'Production', true)
                ->field('Version', 'v2.1.0', true)
                ->field('Deploy Time', '2 minutes', true)
                ->timestamp(time());
        });
}
```

#### Multiple Attachments

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): RocketChatMessage
{
    return RocketChatMessage::create()
        ->text('Daily Status Report')
        ->attachment(function ($attachment) {
            $attachment->title('✅ Successful')
                ->text('All systems operational')
                ->color('good');
        })
        ->attachment(function ($attachment) {
            $attachment->title('⚠️ Warning')
                ->text('High CPU usage detected')
                ->color('warning');
        });
}
```

#### Rich Formatted Message

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): RocketChatMessage
{
    return RocketChatMessage::create()
        ->text('New Order Received')
        ->username('Order Bot')
        ->emoji(':shopping_cart:')
        ->attachment(function ($attachment) {
            $attachment
                ->title("Order #{$this->orderId}", "https://app.example.com/orders/{$this->orderId}")
                ->text($this->orderSummary)
                ->color('#36a64f')
                ->field('Customer', $this->customerName, true)
                ->field('Total', '$' . number_format($this->total, 2), true)
                ->field('Items', $this->itemCount, true)
                ->field('Status', 'Pending', true)
                ->author(
                    $notifiable->name,
                    "https://app.example.com/users/{$notifiable->id}",
                    $notifiable->avatar_url
                )
                ->image('https://example.com/order-chart.png')
                ->timestamp(time());
        });
}
```

<a name="using-different-channels"></a>
### Using Different Channels

#### Single Channel

```php
public function via(EntityInterface|AnonymousNotifiable $notifiable): array
{
    return ['rocketchat'];
}
```

#### Multiple Channels

```php
public function via(EntityInterface|AnonymousNotifiable $notifiable): array
{
    return ['database', 'rocketchat', 'mail'];
}
```

#### Conditional Channels

```php
public function via(EntityInterface|AnonymousNotifiable $notifiable): array
{
    $channels = ['database'];

    if ($notifiable->rocketchat_enabled) {
        $channels[] = 'rocketchat';
    }

    if ($this->priority === 'high') {
        $channels[] = 'rocketchat-alerts';
    }

    return $channels;
}
```

#### Named Channel Instances

```php
public function via(EntityInterface|AnonymousNotifiable $notifiable): array
{
    return ['rocketchat-alerts', 'rocketchat-internal'];
}
```

<a name="data-passing-to-notifications"></a>
### Data Passing to Notifications

#### Constructor Parameters

```php
class OrderShippedNotification extends Notification
{
    public function __construct(
        protected string $orderId,
        protected string $trackingNumber,
        protected string $carrier
    ) {}

    public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): RocketChatMessage
    {
        return RocketChatMessage::create()
            ->text("Order #{$this->orderId} shipped via {$this->carrier}")
            ->attachment(function ($attachment) {
                $attachment->field('Tracking', $this->trackingNumber);
            });
    }
}

$user->notify(new OrderShippedNotification('12345', 'TRACK123', 'UPS'));
```

#### Using Notifiable Data

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): RocketChatMessage
{
    return RocketChatMessage::create()
        ->text("Hello {$notifiable->first_name}!")
        ->attachment(function ($attachment) use ($notifiable) {
            $attachment->field('Account Type', $notifiable->account_type)
                ->field('Member Since', $notifiable->created->format('Y-m-d'));
        });
}
```

### Returning Different Message Types

#### RocketChatMessage (Recommended)

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): RocketChatMessage
{
    return RocketChatMessage::create()->text('Hello');
}
```

#### Array

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): array
{
    return [
        'text' => 'Hello',
        'emoji' => ':wave:',
    ];
}
```

#### String

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): string
{
    return 'Simple text message';
}
```

#### Null (Skip Sending)

```php
public function toRocketChat(EntityInterface|AnonymousNotifiable $notifiable): mixed
{
    if (!$this->shouldNotify) {
        return null;
    }

    return RocketChatMessage::create()->text('Notification');
}
```

<a name="message-builder-api"></a>
## Message Builder API

<a name="rocketchatmessage"></a>
### RocketChatMessage

The `RocketChatMessage` class provides a fluent API for building rich RocketChat messages.

#### Creating a Message

```php
use Crustum\RocketChatNotification\Message\RocketChatMessage;

$message = RocketChatMessage::create();
```

<a name="basic-properties"></a>
### Basic Properties

#### Text

Set the main message text:

```php
$message->text('Hello, World!');
```

#### Username

Override the webhook's default username:

```php
$message->username('Deploy Bot');
```

#### Avatar

Set a custom avatar URL:

```php
$message->avatar('https://example.com/avatar.png');
```

#### Emoji

Set an emoji icon:

```php
$message->emoji(':rocket:');
```

#### Complete Example

```php
$message = RocketChatMessage::create()
    ->text('Deployment complete!')
    ->username('CI/CD Bot')
    ->avatar('https://example.com/bot.png')
    ->emoji(':white_check_mark:');
```

<a name="attachments"></a>
### Attachments

Attachments allow you to add rich formatted content to messages.

#### Adding an Attachment

```php
$message->attachment(function ($attachment) {
    $attachment->title('Deployment Details')
        ->text('Version 2.1.0 deployed successfully')
        ->color('good');
});
```

#### Multiple Attachments

```php
$message
    ->text('Status Report')
    ->attachment(function ($attachment) {
        $attachment->title('Backend')->color('good');
    })
    ->attachment(function ($attachment) {
        $attachment->title('Frontend')->color('warning');
    });
```

#### Attachment from Array

```php
$message->attachment([
    'title' => 'My Title',
    'text' => 'My Text',
    'color' => 'danger',
]);
```

<a name="rocketchatattachment"></a>
### RocketChatAttachment

#### Title

Set attachment title with optional link:

```php
$attachment->title('Click Here', 'https://example.com');
```

#### Text

Set attachment body text:

```php
$attachment->text('Detailed description here');
```

#### Color

Set the attachment color bar:

```php
$attachment->color('good');
$attachment->color('warning');
$attachment->color('danger');
$attachment->color('#FF5733');
```

#### Fields

Add fields (displayed in a table):

```php
$attachment->field('Environment', 'Production', true);
$attachment->field('Description', 'Long description text...', false);
```

Multiple fields example:

```php
$attachment
    ->field('Status', 'Active', true)
    ->field('CPU', '45%', true)
    ->field('Memory', '2.5GB', true)
    ->field('Uptime', '15 days', true);
```

#### Images

##### Thumbnail

Small image on the right side:

```php
$attachment->thumb('https://example.com/thumb.jpg');
```

##### Full Image

Large image at the bottom:

```php
$attachment->image('https://example.com/chart.png');
```

#### Author Information

```php
$attachment->author(
    'John Doe',
    'https://example.com/john',
    'https://example.com/avatar.jpg'
);
```

#### Timestamp

Unix timestamp for the attachment:

```php
$attachment->timestamp(time());
```

<a name="complete-examples"></a>
### Complete Examples

#### Server Status Report

```php
RocketChatMessage::create()
    ->text('🖥️ Server Status Report')
    ->username('Monitoring Bot')
    ->emoji(':computer:')
    ->attachment(function ($attachment) {
        $attachment
            ->title('Production Server')
            ->text('All systems operational')
            ->color('good')
            ->field('CPU Usage', '23%', true)
            ->field('Memory', '4.2GB / 16GB', true)
            ->field('Disk Space', '45GB / 500GB', true)
            ->field('Uptime', '45 days', true)
            ->timestamp(time());
    })
    ->attachment(function ($attachment) {
        $attachment
            ->title('Database Server')
            ->text('Performance degraded')
            ->color('warning')
            ->field('Connections', '450 / 500', true)
            ->field('Query Time', '250ms avg', true)
            ->field('Replication Lag', '2.5s', true)
            ->timestamp(time());
    });
```

#### Deployment Notification

```php
RocketChatMessage::create()
    ->text('🚀 New Deployment')
    ->username('Deploy Bot')
    ->emoji(':rocket:')
    ->attachment(function ($attachment) {
        $attachment
            ->title('Version 2.1.0 - Production', 'https://github.com/org/repo/releases/tag/v2.1.0')
            ->text('Successfully deployed with zero downtime')
            ->color('#36a64f')
            ->field('Environment', 'Production', true)
            ->field('Version', 'v2.1.0', true)
            ->field('Deploy Time', '2m 34s', true)
            ->field('Tests Passed', '1,247 / 1,247', true)
            ->author(
                'John Doe',
                'https://github.com/johndoe',
                'https://github.com/johndoe.png'
            )
            ->image('https://example.com/build-graph.png')
            ->timestamp(time());
    });
```

#### Error Alert

```php
RocketChatMessage::create()
    ->text('🚨 Critical Error Detected')
    ->username('Alert Bot')
    ->emoji(':rotating_light:')
    ->attachment(function ($attachment) {
        $attachment
            ->title('Database Connection Failed')
            ->text('Unable to connect to primary database server')
            ->color('danger')
            ->field('Error Code', 'CONN_TIMEOUT', true)
            ->field('Server', 'db-prod-01', true)
            ->field('Time', date('Y-m-d H:i:s'), true)
            ->field('Impact', 'High - Service Degraded', false)
            ->timestamp(time());
    });
```

#### Order Notification

```php
RocketChatMessage::create()
    ->text('🛒 New Order Received')
    ->emoji(':shopping_cart:')
    ->attachment(function ($attachment) use ($order) {
        $attachment
            ->title("Order #{$order->id}", "https://admin.example.com/orders/{$order->id}")
            ->text("{$order->item_count} items ordered")
            ->color('good')
            ->field('Customer', $order->customer_name, true)
            ->field('Total', '$' . number_format($order->total, 2), true)
            ->field('Payment', $order->payment_method, true)
            ->field('Shipping', $order->shipping_method, true)
            ->thumb($order->first_item_image_url)
            ->timestamp($order->created->timestamp);
    });
```

#### Build Status

```php
RocketChatMessage::create()
    ->text('Build Status Update')
    ->username('CI Bot')
    ->attachment(function ($attachment) {
        $attachment
            ->title('Build #1234 - master', 'https://ci.example.com/builds/1234')
            ->text('Build completed with warnings')
            ->color('warning')
            ->field('Branch', 'master', true)
            ->field('Commit', 'abc1234', true)
            ->field('Duration', '5m 23s', true)
            ->field('Tests', '95 / 100 passed', true)
            ->field('Warnings', '3 code style issues', false)
            ->author(
                'Jane Smith',
                'https://github.com/janesmith',
                'https://github.com/janesmith.png'
            );
    });
```

### Method Chaining

All methods return `$this` for fluent chaining:

```php
$message = RocketChatMessage::create()
    ->text('Message')
    ->username('Bot')
    ->avatar('https://example.com/avatar.png')
    ->emoji(':robot:')
    ->attachment(function ($attachment) {
        $attachment
            ->title('Title')
            ->text('Text')
            ->color('good')
            ->field('Key', 'Value', true);
    });
```

### Getters

Access message properties:

```php
$message->getText();
$message->getUsername();
$message->getAvatar();
$message->getEmoji();
$message->getAttachments();
```

### Array Conversion

Convert message to array for webhook:

```php
$array = $message->toArray();
```

Output:
```php
[
    'text' => 'Hello',
    'username' => 'Bot',
    'avatar' => 'https://example.com/avatar.png',
    'emoji' => ':wave:',
    'attachments' => [
        [
            'title' => 'Title',
            'text' => 'Text',
            'color' => 'good',
            'fields' => [
                ['title' => 'Field', 'value' => 'Value', 'short' => true],
            ],
        ],
    ],
]
```

<a name="error-handling"></a>
## Error Handling

```php
use Crustum\Notification\Exception\CouldNotSendNotification;

try {
    $user->notify(new WelcomeNotification());
} catch (CouldNotSendNotification $e) {
    $this->log("RocketChat notification failed: " . $e->getMessage());
    $channel = $e->getChannel();
    $response = $e->getResponse();
}
```

<a name="testing"></a>
## Testing

You may use the `\Crustum\Notification\TestSuite\NotificationTrait` to prevent notifications from being sent during testing. Typically, sending notifications is unrelated to the code you are actually testing. Most likely, it is sufficient to simply assert that your application was instructed to send a given notification.

After adding the `NotificationTrait` to your test case, you may then assert that notifications were instructed to be sent and even inspect the message content:

```php
<?php
namespace App\Test\TestCase;

use App\Notification\OrderShippedNotification;
use Crustum\Notification\TestSuite\NotificationTrait;
use Cake\TestSuite\TestCase;

class OrderTest extends TestCase
{
    use NotificationTrait;

    protected array $fixtures = ['app.Users', 'app.Orders'];

    public function testOrderShippedNotification(): void
    {
        $usersTable = $this->getTableLocator()->get('Users');
        $user = $usersTable->get(1);

        $usersTable->notify($user, new OrderShippedNotification('12345', 'TRACK123'));

        $this->assertNotificationSentTo($user, OrderShippedNotification::class);
        $this->assertNotificationSentToChannel('rocketchat', OrderShippedNotification::class);
    }
}
```

### Testing Message Format

You can test the message format by calling the channel method directly:

```php
public function testRocketChatMessageFormat(): void
{
    $user = $this->getTableLocator()->get('Users')->get(1);
    $notification = new OrderShippedNotification('12345', 'TRACK123');

    $message = $notification->toRocketChat($user);

    $this->assertInstanceOf(RocketChatMessage::class, $message);
    $this->assertStringContainsString('Order #12345', $message->getText());
    $this->assertEquals(':package:', $message->getEmoji());
}
```
