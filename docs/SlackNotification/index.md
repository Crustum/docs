# Slack Notifications

<a name="introduction"></a>
## Introduction

The Slack Notification plugin provides a powerful way to send notifications to Slack channels using Slack's modern Block Kit API. Block Kit allows you to create rich, interactive messages with buttons, images, sections, and more.

This plugin integrates seamlessly with CakePHP's notification system, allowing you to send Slack notifications alongside other channels like email, SMS, and database storage.

<a name="prerequisites"></a>
## Prerequisites

<a name="installation"></a>
### Installation

The Slack notification channel is included as part of the notification ecosystem. Ensure you have the main Notification plugin installed and configured.

<a name="installation-via-composer"></a>
### Installation via Composer

```bash
composer require crustum/notification-slack
```

<a name="load-plugin"></a>
### Load Plugin

In `src/Application.php`:

```php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/Notification');
    $this->addPlugin('Crustum/SlackNotification');
}
```


<a name="slack-app-setup"></a>
### Slack App Setup

Before sending Slack notifications, you must create a Slack App:

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Navigate to "OAuth & Permissions"
3. Add the following Bot Token Scopes:
   - `chat:write` - Send messages as the app
   - `chat:write.public` - Send messages to channels without joining
   - `chat:write.customize` - Customize message username and icon
4. Install the app to your workspace
5. Copy the "Bot User OAuth Token"

<a name="configuration"></a>
### Configuration

Configure your Slack credentials in `config/app.php` or use environment variables:

```php
return [
    // ...
    'Slack' => [
        'bot_token' => env('SLACK_BOT_TOKEN', 'xoxb-your-token'),
        'default_channel' => env('SLACK_DEFAULT_CHANNEL', '#general'),
    ],
];
```

Or in your `.env` file:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_DEFAULT_CHANNEL=#notifications
```

<a name="formatting-slack-notifications"></a>
## Formatting Slack Notifications

<a name="block-kit-messages"></a>
### Block Kit Messages

To send Slack notifications, define a `toSlack()` method on your notification class that returns a `BlockKitMessage` instance:

```php
<?php
namespace App\Notification;

use Cake\Datasource\EntityInterface;
use Crustum\Notification\AnonymousNotifiable;
use Crustum\Notification\Notification;
use Crustum\SlackNotification\BlockKit\BlockKitMessage;
use Crustum\SlackNotification\BlockKit\Block\SectionBlock;

class InvoicePaid extends Notification
{
    protected int $invoiceId;
    protected float $amount;

    public function __construct(int $invoiceId, float $amount)
    {
        $this->invoiceId = $invoiceId;
        $this->amount = $amount;
    }

    public function via(EntityInterface|AnonymousNotifiable $notifiable): array
    {
        return ['slack', 'database'];
    }

    public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
    {
        return (new BlockKitMessage())
            ->text('Invoice Paid')
            ->headerBlock('Invoice Paid')
            ->sectionBlock(function (SectionBlock $block) {
                $block->text('An invoice has been paid.');
                $block->field("*Invoice ID:*\n{$this->invoiceId}")->markdown();
                $block->field("*Amount:*\n\${$this->amount}")->markdown();
            })
            ->dividerBlock()
            ->sectionBlock(function (SectionBlock $block) {
                $block->text('Thank you for your business!');
            });
    }
}
```

<a name="available-blocks"></a>
### Available Blocks

The Block Kit API provides several block types that you can use to build your messages:

- **Header Block** - Large text header
- **Section Block** - Text with optional fields and accessories
- **Context Block** - Contextual information with small text and images
- **Divider Block** - Visual separator
- **Image Block** - Standalone image
- **Actions Block** - Interactive elements like buttons

<a name="building-rich-messages"></a>
## Building Rich Messages

<a name="header-blocks"></a>
### Header Blocks

Header blocks display large, prominent text at the top of your message:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('New Order')
        ->headerBlock('New Order Received')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text("Order #{$this->orderId} has been placed.");
        });
}
```

<a name="section-blocks"></a>
### Section Blocks

Section blocks are the most versatile and commonly used block type:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Order Details')
        ->sectionBlock(function (SectionBlock $block) {
            // Main text
            $block->text('Your order has been confirmed!');

            // Add fields (displayed in columns)
            $block->field("*Order ID:*\n{$this->orderId}")->markdown();
            $block->field("*Total:*\n\${$this->total}")->markdown();
            $block->field("*Items:*\n{$this->itemCount}")->markdown();
            $block->field("*Status:*\nProcessing")->markdown();
        });
}
```

<a name="context-blocks"></a>
### Context Blocks

Context blocks display small, supplementary information:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Server Alert')
        ->headerBlock('Server Alert')
        ->contextBlock(function (ContextBlock $block) {
            $block->text('Server: web-01');
            $block->text('Time: ' . date('Y-m-d H:i:s'));
            $block->text('Severity: High');
        });
}
```

<a name="divider-blocks"></a>
### Divider Blocks

Divider blocks create visual separation between sections:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Report')
        ->headerBlock('Daily Report')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text('Morning statistics');
        })
        ->dividerBlock()
        ->sectionBlock(function (SectionBlock $block) {
            $block->text('Afternoon statistics');
        });
}
```

<a name="image-blocks"></a>
### Image Blocks

Image blocks display images in your messages:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('New Product')
        ->headerBlock('New Product Launch')
        ->imageBlock('https://example.com/product.jpg', 'Product Image')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text('Check out our new product!');
        });
}
```

You can also add images as accessories to section blocks:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Profile Update')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text("*{$this->userName}* updated their profile");
            $block->image($this->avatarUrl, 'Avatar');
        });
}
```

<a name="actions-blocks"></a>
### Actions Blocks

Actions blocks contain interactive elements like buttons:

```php
use Crustum\SlackNotification\BlockKit\Block\ActionsBlock;

public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Approval Required')
        ->headerBlock('Approval Required')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text("Request #{$this->requestId} needs your approval");
        })
        ->actionsBlock(function (ActionsBlock $block) {
            $block->button('Approve')->primary()->value($this->requestId);
            $block->button('Deny')->danger()->value($this->requestId);
        });
}
```

<a name="interactive-elements"></a>
## Interactive Elements

<a name="buttons"></a>
### Buttons

Buttons allow users to take actions directly from Slack:

```php
use Crustum\SlackNotification\BlockKit\Block\ActionsBlock;

public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Order Confirmation')
        ->headerBlock('Confirm Your Order')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text("Please confirm order #{$this->orderId}");
        })
        ->actionsBlock(function (ActionsBlock $block) {
            // Primary button (green)
            $block->button('Confirm Order')
                ->primary()
                ->value($this->orderId)
                ->id('confirm_order');

            // Danger button (red)
            $block->button('Cancel Order')
                ->danger()
                ->value($this->orderId)
                ->id('cancel_order');

            // Default button (grey)
            $block->button('View Details')
                ->value($this->orderId)
                ->url("https://example.com/orders/{$this->orderId}");
        });
}
```

Button styles:
- `primary()` - Green button for primary actions
- `danger()` - Red button for destructive actions
- Default (no style) - Grey button for secondary actions

<a name="confirmation-dialogs"></a>
### Confirmation Dialogs

Add confirmation dialogs to buttons to prevent accidental actions:

```php
use Crustum\SlackNotification\BlockKit\Block\ActionsBlock;
use Crustum\SlackNotification\BlockKit\Composite\ConfirmObject;

public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Delete Account')
        ->actionsBlock(function (ActionsBlock $block) {
            $block->button('Delete Account')
                ->danger()
                ->value($this->userId)
                ->confirm(
                    'Are you sure you want to delete this account?',
                    function (ConfirmObject $dialog) {
                        $dialog->title('Delete Account');
                        $dialog->text('This action cannot be undone.');
                        $dialog->confirm('Yes, Delete');
                        $dialog->deny('Cancel');
                    }
                );
        });
}
```

<a name="select-menus"></a>
### Select Menus

Select menus allow users to choose from a list of options:

```php
use Crustum\SlackNotification\BlockKit\Block\ActionsBlock;
use Crustum\SlackNotification\BlockKit\Element\Select\SelectOption;

public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Choose Priority')
        ->actionsBlock(function (ActionsBlock $block) {
            $block->staticSelect('priority', 'Select Priority')
                ->option('Low', 'low')
                ->option('Medium', 'medium')
                ->option('High', 'high')
                ->option('Critical', 'critical');
        });
}
```

<a name="message-formatting"></a>
## Message Formatting

<a name="text-formatting"></a>
### Text Formatting

Slack supports rich text formatting in text blocks:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Formatted Text')
        ->sectionBlock(function (SectionBlock $block) {
            $text = "*Bold Text*\n";
            $text .= "_Italic Text_\n";
            $text .= "~Strikethrough~\n";
            $text .= "`Code`\n";
            $text .= "```Code Block```\n";
            $text .= ">Quoted Text\n";
            $text .= "<https://example.com|Link Text>";

            $block->text($text)->markdown();
        });
}
```

<a name="markdown-support"></a>
### Markdown Support

To enable markdown formatting, call `markdown()` on text objects:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Invoice Details')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text('*Invoice #' . $this->invoiceId . '* has been paid.')
                ->markdown();

            $block->field("*Amount:*\n\${$this->amount}")->markdown();
            $block->field("*Date:*\n" . date('Y-m-d'))->markdown();
        });
}
```

<a name="emojis"></a>
### Emojis

Slack supports emoji codes in messages:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->text('Celebration!')
        ->headerBlock(':tada: Congratulations!')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text(':white_check_mark: Task completed successfully!');
        })
        ->icon(':rocket:'); // Set custom emoji icon for the message
}
```

<a name="routing-slack-notifications"></a>
## Routing Slack Notifications

<a name="using-behavior-methods"></a>
### Using Behavior Methods

Define a `routeNotificationForSlack()` method on your entity to specify which channel to send to:

```php
<?php
namespace App\Model\Entity;

use Crustum\Notification\Notification;
use Cake\ORM\Entity;

class User extends Entity
{
    /**
     * Route notifications for the Slack channel
     *
     * @param \Crustum\Notification\Notification $notification
     * @return string|null
     */
    public function routeNotificationForSlack(Notification $notification): ?string
    {
        // Send to user's preferred channel
        return $this->slack_channel ?? '#general';
    }
}
```

You can also specify the channel directly in the notification:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    return (new BlockKitMessage())
        ->to('#important-alerts')
        ->text('Critical Alert')
        ->headerBlock('Critical Alert')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text('System is down!');
        });
}
```

<a name="external-workspaces"></a>
### External Workspaces

To send notifications to external Slack workspaces, use `SlackRoute`:

```php
use Crustum\SlackNotification\BlockKit\SlackRoute;

public function routeNotificationForSlack(Notification $notification): SlackRoute|string
{
    return SlackRoute::make(
        $this->slack_channel,
        $this->slack_token
    );
}
```

This is useful when your users have their own Slack workspaces and you've obtained OAuth tokens for them.

<a name="testing-and-debugging"></a>
## Testing and Debugging

<a name="block-kit-builder"></a>
### Block Kit Builder

Use the `dd()` method during development to preview your message in Slack's Block Kit Builder:

```php
public function toSlack(EntityInterface|AnonymousNotifiable $notifiable): BlockKitMessage
{
    $message = (new BlockKitMessage())
        ->text('Test Message')
        ->headerBlock('Test')
        ->sectionBlock(function (SectionBlock $block) {
            $block->text('Testing the message');
        });

    // This will output a URL to the Block Kit Builder
    $message->dd();

    return $message;
}
```

To see the raw JSON payload instead:

```php
$message->dd(true); // Dump raw JSON
```

<a name="testing-notifications"></a>
### Testing Notifications

When testing Slack notifications, you can use the `NotificationTrait` to capture notifications instead of sending them. After adding the trait to your test case, you can assert that Slack notifications were sent and inspect their content:

```php
<?php
namespace App\Test\TestCase;

use App\Notification\InvoicePaid;
use Crustum\SlackNotification\BlockKit\BlockKitMessage;
use Crustum\Notification\TestSuite\NotificationTrait;
use Cake\TestSuite\TestCase;

class SlackNotificationTest extends TestCase
{
    use NotificationTrait;

    protected array $fixtures = ['app.Users', 'app.Invoices'];

    public function testSlackNotificationIsSent(): void
    {
        $usersTable = $this->getTableLocator()->get('Users');
        $user = $usersTable->get(1);

        $usersTable->notify($user, new InvoicePaid(123, 99.99));

        $this->assertNotificationSentTo($user, InvoicePaid::class);
        $this->assertNotificationSentToChannel('slack', InvoicePaid::class);
    }

    public function testSlackMessageFormat(): void
    {
        $usersTable = $this->getTableLocator()->get('Users');
        $user = $usersTable->get(1);

        $usersTable->notify($user, new InvoicePaid(123, 99.99));

        $notifications = $this->getNotificationsByClass(InvoicePaid::class);
        $notification = $notifications[0]['notification'];

        $slackMessage = $notification->toSlack($user);

        $this->assertInstanceOf(BlockKitMessage::class, $slackMessage);

        $payload = $slackMessage->toArray();
        $this->assertArrayHasKey('blocks', $payload);
        $this->assertArrayHasKey('text', $payload);
    }

    public function testSlackMessageContent(): void
    {
        $usersTable = $this->getTableLocator()->get('Users');
        $user = $usersTable->get(1);

        $usersTable->notify($user, new InvoicePaid(123, 99.99));

        $notifications = $this->getNotificationsByClass(InvoicePaid::class);
        $notification = $notifications[0]['notification'];

        $slackMessage = $notification->toSlack($user);
        $payload = $slackMessage->toArray();

        $this->assertNotEmpty($payload['blocks']);
        $this->assertStringContainsString('Invoice', $payload['text']);
        $this->assertStringContainsString('123', $payload['text']);
    }

    public function testSlackBlockStructure(): void
    {
        $usersTable = $this->getTableLocator()->get('Users');
        $user = $usersTable->get(1);

        $usersTable->notify($user, new InvoicePaid(123, 99.99));

        $notifications = $this->getNotificationsByClass(InvoicePaid::class);
        $notification = $notifications[0]['notification'];

        $slackMessage = $notification->toSlack($user);
        $payload = $slackMessage->toArray();

        $this->assertIsArray($payload['blocks']);
        $this->assertNotEmpty($payload['blocks']);

        $firstBlock = $payload['blocks'][0];
        $this->assertArrayHasKey('type', $firstBlock);
    }
}
```
