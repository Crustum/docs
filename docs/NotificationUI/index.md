# NotificationUI Plugin

<a name="introduction"></a>
## Introduction

The NotificationUI plugin provides UI components for the CakePHP Notification system with real-time broadcasting support. It includes a modern notification bell widget with dropdown or side panel display modes.

The plugin provides a modern notification bell widget with dropdown or side panel display modes, automatic polling for new notifications, real-time broadcasting support, and a complete JavaScript API for managing notifications.

<a name="installation"></a>
## Installation

### Requirements

- PHP 8.1+
- CakePHP 5.0+
- CakePHP Notification Plugin

### Load the Plugin

In `config/plugins.php`:

```php
'Crustum/Notification' => [
    'bootstrap' => true,
    'routes' => true,
],
'Crustum/NotificationUI' => [],
```

### Run Migrations

```bash
bin/cake migrations migrate -p Crustum/Notification
```

### Add to Layout

Add CSRF token to your layout's `<head>`:

```php
<meta name="csrfToken" content="<?= $this->request->getAttribute('csrfToken') ?>">
```

Add notification bell to your navigation:

```php
<li class="nav-item">
    <?= $this->element('Crustum/NotificationUI.notifications/bell_icon', [
        'mode' => 'panel',
    ]) ?>
</li>
```

<a name="bell-widget"></a>
## Bell Widget

The bell element automatically loads required CSS/JS and initializes the widget.

Basic usage:

```php
<?= $this->element('Crustum/NotificationUI.notifications/bell_icon') ?>
```

With options:

```php
<?= $this->element('Crustum/NotificationUI.notifications/bell_icon', [
    'mode' => 'panel',
    'position' => 'left',
    'theme' => 'dark',
    'pollInterval' => 60000,
]) ?>
```

<a name="display-modes"></a>
## Display Modes

### Dropdown Mode (Default)

Traditional dropdown menu attached to the bell icon:

```php
<?= $this->element('Crustum/NotificationUI.notifications/bell_icon', [
    'mode' => 'dropdown',
    'position' => 'right',
]) ?>
```

### Panel Mode

Sticky side panel (like Filament Notifications):

```php
<?= $this->element('Crustum/NotificationUI.notifications/bell_icon', [
    'mode' => 'panel',
]) ?>
```

<a name="configuration-options"></a>
## Configuration Options

```php
<?= $this->element('Crustum/NotificationUI.notifications/bell_icon', [
    'mode' => 'panel',
    'position' => 'right',
    'theme' => 'dark',
    'pollInterval' => 60000,
    'enablePolling' => true,
    'perPage' => 20,
]) ?>
```

Options:
- `mode` - 'dropdown' or 'panel' (default: 'dropdown')
- `position` - 'left' or 'right' (default: 'right', dropdown only)
- `theme` - 'light' or 'dark' (default: 'light')
- `pollInterval` - Poll every N milliseconds (default: 30000)
- `enablePolling` - Enable/disable database polling (default: true)
- `perPage` - Notifications per page (default: 10)

<a name="real-time-broadcasting"></a>
## Real-Time Broadcasting

Enable WebSocket broadcasting for instant notification delivery:

### Hybrid Mode (Database + Broadcasting) - Recommended

```php
<?php $authUser = $this->request->getAttribute('identity'); ?>

<?= $this->element('Crustum/NotificationUI.notifications/bell_icon', [
    'mode' => 'panel',
    'enablePolling' => true,
    'broadcasting' => [
        'userId' => $authUser->getIdentifier(),
        'userName' => $authUser->username ?? 'User',
        'pusherKey' => 'app-key',
        'pusherHost' => '127.0.0.1',
        'pusherPort' => 8080,
        'pusherCluster' => 'mt1',
    ],
]) ?>
```

This mode combines database persistence with real-time WebSocket delivery for the best user experience.

### Broadcasting Only (No Database)

```php
<?= $this->element('Crustum/NotificationUI.notifications/bell_icon', [
    'enablePolling' => false,
    'broadcasting' => [
        'userId' => $authUser->getIdentifier(),
        'userName' => $authUser->username ?? 'User',
        'pusherKey' => env('PUSHER_APP_KEY'),
        'pusherHost' => env('PUSHER_HOST', '127.0.0.1'),
        'pusherPort' => env('PUSHER_PORT', 8080),
        'pusherCluster' => env('PUSHER_CLUSTER', 'mt1'),
    ],
]) ?>
```

> **Note:** Broadcasting requires the `cakephp/broadcasting-notification` plugin.

<a name="notification-data-fields"></a>
## Notification Data Fields

When creating notifications, use these fields in your `toDatabase()` method:

**Required:**
- `title` - Notification title
- `message` - Notification message

**Optional:**
- `action_url` - Makes notification clickable
- `icon` - Built-in SVG icon: `bell`, `post`, `user`, `message`, `alert`, `check`, `info`
- `icon_class` - CSS class: `fa fa-bell`, `bi bi-bell`, `ti ti-bell`

Example:

```php
public function toDatabase(): array
{
    return [
        'title' => 'Order Shipped',
        'message' => "Your order #{$this->order->id} has been shipped!",
        'action_url' => "/orders/{$this->order->id}",
        'icon' => 'post',
    ];
}
```

<a name="api-endpoints"></a>
## API Endpoints

All endpoints return JSON and require authentication:

- `GET /notification/notifications.json` - List all (paginated)
- `GET /notification/notifications/unread.json` - Get unread
- `GET /notification/notifications/{id}.json` - Get single
- `PATCH /notification/notifications/{id}/read.json` - Mark as read
- `PATCH /notification/notifications/mark-all-read.json` - Mark all as read
- `DELETE /notification/notifications/{id}.json` - Delete
- `DELETE /notification/notifications.json` - Delete all

### Query Parameters

- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `status` - Filter: `all`, `read`, `unread` (default: all)
- `type` - Filter by notification class name

<a name="javascript-events"></a>
## JavaScript Events

Listen for notification events:

```javascript
window.addEventListener('notification:marked-read', (e) => {
    console.log('Notification marked as read:', e.detail.notificationId);
});

window.addEventListener('notification:all-marked-read', () => {
    console.log('All notifications marked as read');
});

window.addEventListener('notification:received', (e) => {
    console.log('New notification:', e.detail);
});

window.addEventListener('notification:deleted', (e) => {
    console.log('Notification deleted:', e.detail.notificationId);
});
```

<a name="template-overloading"></a>
## Template Overloading

### PHP Element Templates

Override PHP templates by creating files in your app's `templates/element/` directory:

```
templates/element/Crustum/NotificationUI/notifications/
  ├── bell_icon.php         # Main bell icon and container
  ├── item.php              # Single notification item
  ├── list.php              # Notification list wrapper
  └── empty.php             # Empty state display
```

Example override:

```php
templates/element/Crustum/NotificationUI/notifications/item.php
```

### JavaScript Template Override

Override JavaScript templates for complete rendering control:

```javascript
window.CakeNotification.renderer.registerTemplate('notification', (notification, renderer) => {
    return `
        <div class="custom-notification">
            <h4>${notification.data.title}</h4>
            <p>${notification.data.message}</p>
        </div>
    `;
});
```

Available JavaScript templates:
- `notification` - Complete notification item wrapper
- `notificationContent` - Notification content area
- `notificationIcon` - Icon rendering
- `notificationActions` - Actions container
- `notificationAction` - Single action button
- `loadMoreButton` - Load more button
- `emptyState` - Empty state display
- `errorState` - Error state display
- `loadingState` - Loading state display

Register multiple templates:

```javascript
window.CakeNotification.renderer.registerTemplates({
    notification: (notification, renderer) => {
        return `<div class="my-notification">${notification.data.title}</div>`;
    },
    emptyState: () => {
        return `<div class="empty">No notifications yet!</div>`;
    }
});
```

