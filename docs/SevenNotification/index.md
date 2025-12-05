# Seven.io SMS Notification Channel

<a name="introduction"></a>
## Introduction

The Seven.io SMS Notification Channel allows you to send SMS notifications via [Seven.io](https://www.seven.io) (formerly SMS77) using the CakePHP Notification plugin.

<a name="installation"></a>
## Installation

### Requirements

- PHP 8.1+
- CakePHP 5.0+
- CakePHP Notification Plugin
- Seven.io Account & API Key

### Get API Key

1. Sign up at [Seven.io](https://www.seven.io)
2. Go to API Settings
3. Copy your API Key

### Installation via Composer

```bash
composer require crustum/notification-seven
```

### Load Plugin

In `src/Application.php`:

```php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/Notification');
    $this->addPlugin('Crustum/SevenNotification');
}
```

<a name="configuration"></a>
## Configuration

**config/app_local.php:**
```php
return [
    'Notification' => [
        'channels' => [
            'seven' => [
                'api_key' => env('SEVEN_API_KEY'),
            ],
        ],
    ],
];
```

**.env:**
```
SEVEN_API_KEY=your-api-key-here
```

### Multiple Accounts

```php
'seven' => [
    'api_key' => env('SEVEN_API_KEY'),
],
'seven-alerts' => [
    'api_key' => env('SEVEN_ALERTS_API_KEY'),
],
```

<a name="usage"></a>
## Usage

### Creating a Notification

```php
<?php
namespace App\Notification;

use Cake\Datasource\EntityInterface;
use Crustum\Notification\AnonymousNotifiable;
use Crustum\Notification\Notification;
use Crustum\SevenNotification\Message\SevenMessage;

class OrderConfirmationNotification extends Notification
{
    public function __construct(
        protected string $orderId,
        protected float $total
    ) {}

    public function via(EntityInterface|AnonymousNotifiable $notifiable): array
    {
        return ['database', 'seven'];
    }

    public function toSeven(EntityInterface|AnonymousNotifiable $notifiable): SevenMessage
    {
        return SevenMessage::create()
            ->content("Order #{$this->orderId} confirmed! Total: €{$this->total}")
            ->from('YourShop');
    }
}
```

### Sending Notifications

```php
$user = $this->Users->get($userId);
$user->notify(new OrderConfirmationNotification('12345', 99.99));

use Crustum\Notification\NotificationManager;

NotificationManager::route('seven', '+491234567890')
    ->notify(new OrderConfirmationNotification('12345', 99.99));
```

### Routing

```php
<?php
namespace App\Model\Entity;

use Cake\ORM\Entity;

class User extends Entity
{
    public function routeNotificationForSeven(): ?string
    {
        return $this->phone;
    }
}
```

<a name="message-builder"></a>
## Message Builder

### Basic SMS

```php
SevenMessage::create('Hello from CakePHP!');
```

### Custom Sender

```php
SevenMessage::create()
    ->content('Your verification code is 123456')
    ->from('MyApp');
```

### Flash SMS

Flash SMS appears directly on screen without saving to inbox:

```php
SevenMessage::create()
    ->content('Emergency alert!')
    ->flash();
```

### Delayed Sending

```php
SevenMessage::create()
    ->content('Reminder: Meeting at 3pm')
    ->delay(strtotime('+1 hour'));
```

### Tracking & Analytics

```php
SevenMessage::create()
    ->content('Promotional SMS')
    ->label('summer-campaign')
    ->foreignId('campaign-2024-01')
    ->performanceTracking();
```

### Examples

```php
public function toSeven(EntityInterface|AnonymousNotifiable $notifiable): SevenMessage
{
    return SevenMessage::create()
        ->content("Hi {$notifiable->name}! Your order #{$this->orderId} is confirmed. Total: €{$this->total}")
        ->from('MyShop')
        ->label('order-confirmations')
        ->performanceTracking();
}
```

Verification code:

```php
SevenMessage::create()
    ->content("Your verification code is: {$this->code}. Valid for 10 minutes.")
    ->from('MyApp')
    ->flash();
```

Appointment reminder:

```php
$reminderTime = $this->appointment->start_time->modify('-1 hour')->getTimestamp();

SevenMessage::create()
    ->content("Reminder: Your appointment at {$this->appointment->start_time->format('H:i')}")
    ->from('Clinic')
    ->delay($reminderTime);
```

### Returning Different Message Types

```php
public function toSeven(EntityInterface|AnonymousNotifiable $notifiable): SevenMessage|string|null
{
    return SevenMessage::create()->content('Hello');

    return 'Simple SMS message';

    if (!$notifiable->sms_enabled) {
        return null;
    }
}
```

<a name="phone-number-format"></a>
## Phone Number Format

Seven.io accepts various formats, but E.164 is recommended:

```
+491234567890  (E.164 - recommended)
491234567890
01234567890
```

<a name="error-handling"></a>
## Error Handling

```php
use Crustum\Notification\Exception\CouldNotSendNotification;

try {
    $user->notify(new OrderConfirmationNotification('12345', 99.99));
} catch (CouldNotSendNotification $e) {
    $this->log("SMS notification failed: " . $e->getMessage());
}
```

