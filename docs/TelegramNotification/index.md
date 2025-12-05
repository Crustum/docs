# Telegram Notification Channel

<a name="introduction"></a>
## Introduction

The Telegram Notification Channel allows you to send notifications to Telegram using the Telegram Bot API and the CakePHP Notification plugin. Telegram is a cloud-based instant messaging service with over 700 million active users.

This channel plugin provides:
- Simple integration with Telegram Bot API
- Rich message formatting (Markdown and HTML)
- Inline keyboard buttons for interactive messages
- Support for sending photos, documents, and locations
- Multiple bot instances support
- Full integration with CakePHP's Notification system

<a name="installation"></a>
## Installation

<a name="requirements"></a>
### Requirements

- PHP 8.1+
- CakePHP 5.0+
- CakePHP Notification Plugin
- Telegram Bot Token

<a name="get-bot-token"></a>
### Get Bot Token

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` command
3. Follow prompts to create your bot
4. Copy the **Bot Token** (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

<a name="installation-via-composer"></a>
### Installation via Composer

```bash
composer require crustum/notification-telegram
```

<a name="load-plugin"></a>
### Load Plugin

In `src/Application.php`:

```php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/Notification');
    $this->addPlugin('Crustum/TelegramNotification');
}
```

<a name="get-chat-id"></a>
### Get Chat ID

Users need to:
1. Start a conversation with your bot
2. Send any message
3. Visit: `https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates`
4. Find `chat.id` in the response
5. Store this in user's `telegram_chat_id` field

<a name="configuration"></a>
## Configuration

<a name="basic-setup"></a>
### Basic Setup

**config/app_local.php:**
```php
return [
    'Notification' => [
        'channels' => [
            'telegram' => [
                'token' => 'YOUR_BOT_TOKEN_HERE',
            ],
        ],
    ],
];
```

**Or use .env:**
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

**config/app.php:**
```php
'telegram' => [
    'token' => env('TELEGRAM_BOT_TOKEN'),
],
```

### Configuration with Options

```php
'telegram' => [
    'token' => env('TELEGRAM_BOT_TOKEN'),
    'timeout' => 30,
],
```

<a name="multiple-bots"></a>
### Multiple Bots

Configure multiple Telegram bot instances:

```php
'Notification' => [
    'channels' => [
        'telegram' => [
            'token' => env('TELEGRAM_BOT_TOKEN'),
        ],
        'telegram-alerts' => [
            'token' => env('TELEGRAM_ALERTS_BOT_TOKEN'),
        ],
        'telegram-support' => [
            'token' => env('TELEGRAM_SUPPORT_BOT_TOKEN'),
        ],
    ],
],
```

<a name="environment-variables"></a>
### Environment Variables

**.env:**
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_ALERTS_BOT_TOKEN=789012:XYZ-GHI5678jklm-abc89X3w2x456yz22
TELEGRAM_SUPPORT_BOT_TOKEN=345678:PQR-STU9012nopq-def23Y4x3y789ab33
```

<a name="usage"></a>
## Usage

<a name="creating-notifications"></a>
### Creating Notifications

#### Basic Notification

```php
<?php
namespace App\Notification;

use Cake\Datasource\EntityInterface;
use Crustum\Notification\AnonymousNotifiable;
use Crustum\Notification\Notification;
use Crustum\TelegramNotification\Message\TelegramMessage;

class OrderShippedNotification extends Notification
{
    public function __construct(
        protected string $orderId,
        protected string $trackingNumber
    ) {}

    public function via(EntityInterface|AnonymousNotifiable $notifiable): array
    {
        return ['database', 'telegram'];
    }

    public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): TelegramMessage
    {
        return TelegramMessage::create()
            ->content("📦 *Order #{$this->orderId}* shipped!")
            ->line("")
            ->line("Tracking: `{$this->trackingNumber}`")
            ->button('Track', "https://track.example.com/{$this->trackingNumber}");
    }
}
```

<a name="sending-notifications"></a>
### Sending Notifications

#### To User Entity

```php
$user = $this->Users->get($userId);
$user->notify(new OrderShippedNotification('12345', 'TRACK123'));
```

#### To Multiple Users

```php
$users = $this->Users->find('active');
foreach ($users as $user) {
    $user->notify(new OrderShippedNotification('12345', 'TRACK123'));
}
```

#### On-Demand to Chat ID

```php
use Crustum\Notification\NotificationManager;

NotificationManager::route('telegram', '123456789')
    ->notify(new SystemAlert());
```

#### Using Multiple Bot Instances

```php
public function via(EntityInterface|AnonymousNotifiable $notifiable): array
{
    return ['telegram-alerts', 'telegram-support'];
}
```

<a name="routing"></a>
### Routing

Configure routing on your entity:

```php
<?php
namespace App\Model\Entity;

use Cake\ORM\Entity;

class User extends Entity
{
    public function routeNotificationForTelegram(): ?string
    {
        return $this->telegram_chat_id;
    }
}
```

Add Notifiable behavior to your table:

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

<a name="message-builder"></a>
## Message Builder

<a name="basic-message"></a>
### Basic Message

```php
TelegramMessage::create()
    ->content('Hello from CakePHP!');
```

<a name="formatted-text"></a>
### Formatted Text

#### Markdown (default)

```php
TelegramMessage::create()
    ->content('*Bold* _italic_ `code` [Link](https://example.com)')
    ->markdown();
```

Markdown formatting:
- `*Bold*` - Bold text
- `_Italic_` - Italic text
- `` `Code` `` - Inline code
- `[Link](URL)` - Hyperlink

#### HTML

```php
TelegramMessage::create()
    ->content('<b>Bold</b> <i>italic</i> <code>code</code> <a href="URL">Link</a>')
    ->html();
```

HTML formatting:
- `<b>Bold</b>` - Bold text
- `<i>Italic</i>` - Italic text
- `<code>Code</code>` - Inline code
- `<a href="URL">Link</a>` - Hyperlink

<a name="multiple-lines"></a>
### Multiple Lines

```php
TelegramMessage::create()
    ->content('Order Confirmation')
    ->line('Order ID: #12345')
    ->line('Total: $99.99')
    ->line('Status: Processing');
```

<a name="buttons"></a>
### Buttons

#### Inline Keyboard Buttons

```php
TelegramMessage::create()
    ->content('Choose an action:')
    ->button('Confirm', 'https://example.com/confirm')
    ->button('Cancel', 'https://example.com/cancel');
```

Multiple rows of buttons:

```php
TelegramMessage::create()
    ->content('Order Actions')
    ->button('View Order', 'https://example.com/orders/123')
    ->button('Track Shipment', 'https://example.com/track/TRACK123')
    ->button('Contact Support', 'https://example.com/support')
    ->button('Cancel Order', 'https://example.com/orders/123/cancel');
```

<a name="message-options"></a>
### Message Options

#### Disable Link Preview

```php
TelegramMessage::create()
    ->content('Check this link: https://example.com')
    ->disablePreview();
```

#### Silent Notification

```php
TelegramMessage::create()
    ->content('Low priority update')
    ->disableNotification();
```

#### Protect Content

```php
TelegramMessage::create()
    ->content('Confidential information')
    ->protectContent();
```

#### Combining Options

```php
TelegramMessage::create()
    ->content('Important but not urgent')
    ->disablePreview()
    ->disableNotification()
    ->protectContent();
```

<a name="files-and-media"></a>
### Files and Media

#### Send Photo

```php
TelegramMessage::create()
    ->content('Product Image')
    ->photo('https://example.com/product.jpg');
```

#### Send Document

```php
TelegramMessage::create()
    ->content('Invoice for order #12345')
    ->document('https://example.com/invoice.pdf');
```

#### Send Location

```php
TelegramMessage::create()
    ->content('Store Location')
    ->location(40.7128, -74.0060);
```

<a name="complete-examples"></a>
## Complete Examples

### Order Confirmation

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): TelegramMessage
{
    return TelegramMessage::create()
        ->content("🎉 *Order Confirmed!*")
        ->line("")
        ->line("Order ID: #{$this->order->id}")
        ->line("Total: \${$this->order->total}")
        ->line("Items: {$this->order->item_count}")
        ->line("")
        ->line("_Thank you for your purchase!_")
        ->button('View Order', "https://shop.example.com/orders/{$this->order->id}")
        ->button('Track Shipment', "https://shop.example.com/track/{$this->order->tracking}")
        ->markdown();
}
```

### Deployment Notification

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): TelegramMessage
{
    return TelegramMessage::create()
        ->content("🚀 *Deployment Complete*")
        ->line("")
        ->line("Environment: Production")
        ->line("Version: v2.1.0")
        ->line("Time: 2m 34s")
        ->line("Status: ✅ Success")
        ->line("")
        ->line("All tests passed successfully!")
        ->button('View Release', 'https://github.com/org/repo/releases/tag/v2.1.0')
        ->button('View Logs', 'https://ci.example.com/builds/1234')
        ->markdown()
        ->disablePreview();
}
```

### Alert Notification

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): TelegramMessage
{
    return TelegramMessage::create()
        ->content("🚨 *CRITICAL ALERT*")
        ->line("")
        ->line("Server: db-prod-01")
        ->line("Issue: High CPU Usage")
        ->line("CPU: 95%")
        ->line("Time: " . date('Y-m-d H:i:s'))
        ->line("")
        ->line("⚠️ Immediate action required!")
        ->button('View Dashboard', 'https://monitor.example.com/servers/db-prod-01')
        ->button('SSH Access', 'https://console.example.com/ssh/db-prod-01')
        ->markdown();
}
```

### User Welcome

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): TelegramMessage
{
    return TelegramMessage::create()
        ->content("👋 *Welcome to {$this->appName}!*")
        ->line("")
        ->line("Hi {$notifiable->first_name},")
        ->line("")
        ->line("Thank you for joining us! We're excited to have you.")
        ->line("")
        ->line("Get started with these resources:")
        ->button('📚 Documentation', 'https://example.com/docs')
        ->button('🎓 Tutorials', 'https://example.com/tutorials')
        ->button('💬 Community', 'https://example.com/community')
        ->markdown();
}
```

### Payment Receipt

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): TelegramMessage
{
    return TelegramMessage::create()
        ->content("💳 *Payment Received*")
        ->line("")
        ->line("Amount: \${$this->payment->amount}")
        ->line("Method: {$this->payment->method}")
        ->line("Date: {$this->payment->date->format('Y-m-d H:i')}")
        ->line("Receipt #: {$this->payment->receipt_number}")
        ->line("")
        ->line("Thank you for your payment!")
        ->button('Download Receipt', "https://example.com/receipts/{$this->payment->id}")
        ->button('View Account', 'https://example.com/account/billing')
        ->markdown()
        ->document("https://example.com/receipts/{$this->payment->id}.pdf");
}
```

### Server Status Report

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): TelegramMessage
{
    return TelegramMessage::create()
        ->content("📊 *Daily Server Report*")
        ->line("")
        ->line("🖥️ *Production Server*")
        ->line("CPU: 23%")
        ->line("Memory: 4.2GB / 16GB")
        ->line("Disk: 45GB / 500GB")
        ->line("Uptime: 45 days")
        ->line("")
        ->line("✅ All systems operational")
        ->button('View Dashboard', 'https://monitor.example.com')
        ->markdown()
        ->disableNotification();
}
```

### Meeting Reminder

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): TelegramMessage
{
    return TelegramMessage::create()
        ->content("📅 *Meeting Reminder*")
        ->line("")
        ->line("Meeting: {$this->meeting->title}")
        ->line("Time: {$this->meeting->start_time->format('H:i')}")
        ->line("Duration: {$this->meeting->duration} minutes")
        ->line("")
        ->line("Participants: {$this->meeting->participant_count}")
        ->button('Join Meeting', $this->meeting->join_url)
        ->button('View Agenda', $this->meeting->agenda_url)
        ->markdown()
        ->location($this->meeting->latitude, $this->meeting->longitude);
}
```

### Returning Different Message Types

#### TelegramMessage (Recommended)

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): TelegramMessage
{
    return TelegramMessage::create()->content('Hello');
}
```

#### String

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): string
{
    return 'Simple text message';
}
```

#### Array

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): array
{
    return [
        'text' => 'Hello',
        'parse_mode' => 'Markdown',
    ];
}
```

#### Null (Skip Sending)

```php
public function toTelegram(EntityInterface|AnonymousNotifiable $notifiable): mixed
{
    if (!$this->shouldNotify) {
        return null;
    }

    return TelegramMessage::create()->content('Notification');
}
```

<a name="error-handling"></a>
## Error Handling

```php
use Crustum\Notification\Exception\CouldNotSendNotification;

try {
    $user->notify(new OrderShippedNotification('12345', 'TRACK123'));
} catch (CouldNotSendNotification $e) {
    $this->log("Telegram notification failed: " . $e->getMessage());
    $channel = $e->getChannel();
    $response = $e->getResponse();
}
```

## Testing

You may use the `\Crustum\Notification\TestSuite\NotificationTrait` to prevent notifications from being sent during testing. After adding the `NotificationTrait` to your test case, you may then assert that notifications were instructed to be sent:

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
        $this->assertNotificationSentToChannel('telegram', OrderShippedNotification::class);
    }
}
```

### Testing Message Format

You can test the message format by calling the channel method directly:

```php
public function testTelegramMessageFormat(): void
{
    $user = $this->getTableLocator()->get('Users')->get(1);
    $notification = new OrderShippedNotification('12345', 'TRACK123');

    $message = $notification->toTelegram($user);

    $this->assertInstanceOf(TelegramMessage::class, $message);
    $this->assertStringContainsString('Order #12345', $message->getContent());
}
```

