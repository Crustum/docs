# NotificationUI Plugin

<a name="introduction"></a>
## Introduction

The NotificationUI plugin provides UI components for the CakePHP Notification system with real-time broadcasting support. It includes a modern notification bell widget with dropdown or side panel display modes.

The plugin uses Alpine.js for reactive state management and provides a modern notification bell widget with dropdown or side panel display modes, automatic polling for new notifications, real-time broadcasting support, and a complete JavaScript API for managing notifications.

<a name="installation"></a>
## Installation

### Requirements

- PHP 8.1+
- CakePHP 5.0+
- CakePHP Notification Plugin
- Alpine.js (automatically loaded by the plugin)

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

Add notification bell to your navigation using the Cell:

```php
<li class="nav-item">
    <?= $this->cell('Crustum/NotificationUI.NotificationBell', [
        'mode' => 'panel',
    ]) ?>
</li>
```

<a name="bell-widget"></a>
## Bell Widget

The `NotificationBellCell` automatically loads required CSS/JS (including Alpine.js) and initializes the reactive notification store. The widget uses Alpine.js for reactive state management and server-side PHP templates for rendering.

**Basic usage:**

```php
<?= $this->cell('Crustum/NotificationUI.NotificationBell') ?>
```

The Cell automatically calculates unread count from the database if not provided, making it ideal for server-side rendering scenarios.

**With options:**

```php
<?= $this->cell('Crustum/NotificationUI.NotificationBell', [
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
<?= $this->cell('Crustum/NotificationUI.NotificationBell', [
    'mode' => 'dropdown',
    'position' => 'right',
]) ?>
```

### Panel Mode

Sticky side panel (like Filament Notifications):

```php
<?= $this->cell('Crustum/NotificationUI.NotificationBell', [
    'mode' => 'panel',
]) ?>
```

<a name="configuration-options"></a>
## Configuration Options

```php
<?= $this->cell('Crustum/NotificationUI.NotificationBell', [
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
- `theme` - 'light', 'dark', or `null` for auto-detect (default: auto-detect)
- `pollInterval` - Poll every N milliseconds (default: 30000)
- `enablePolling` - Enable/disable database polling (default: true)
- `perPage` - Notifications per page (default: 10)
- `unreadCount` - Initial unread count (default: `null` - automatically calculated by Cell from database)
- `markReadOnClick` - Mark notification as read when clicked (default: true)
- `userId` - User ID for broadcasting (default: `null` - extracted from authenticated identity)
- `userName` - User name for broadcasting (default: `null`)
- `broadcasting` - Broadcasting configuration array or `false` to disable (default: `false`)

<a name="real-time-broadcasting"></a>
## Real-Time Broadcasting

Enable WebSocket broadcasting for instant notification delivery. Supports both Pusher and Mercure broadcasters.

### Pusher Broadcasting

> [!NOTE]
> Pusher Broadcasting requires the `crustum/notification-broadcasting` and `crustum/broadcasting` plugins. The `broadcaster` option defaults to `'pusher'`.


```php
<?php $authUser = $this->request->getAttribute('identity'); ?>

<?= $this->cell('Crustum/NotificationUI.NotificationBell', [
    'mode' => 'panel',
    'enablePolling' => true,
    'broadcasting' => [
        'broadcaster' => 'pusher',
        'userId' => $authUser->getIdentifier(),
        'userName' => $authUser->username ?? 'User',
        'pusherKey' => 'app-key',
        'pusherHost' => '127.0.0.1',
        'pusherPort' => 8080,
        'pusherCluster' => 'mt1',
    ],
]) ?>
```

### Mercure Broadcasting


> [!NOTE]
> Mercure Broadcasting requires the `crustum/notification-broadcasting` and `crustum/mercure-broadcasting` plugins.


```php
<?php $authUser = $this->request->getAttribute('identity'); ?>

<?= $this->cell('Crustum/NotificationUI.NotificationBell', [
    'mode' => 'panel',
    'enablePolling' => true,
    'broadcasting' => [
        'broadcaster' => 'mercure',
        'userId' => $authUser->getIdentifier(),
        'userName' => $authUser->username ?? 'User',
        'mercureUrl' => '/.well-known/mercure',
        'authEndpoint' => '/broadcasting/auth',
    ],
]) ?>
```

This mode combines database persistence with real-time WebSocket delivery for the best user experience.

### Broadcasting Only (No Database)

**Pusher:**
```php
<?= $this->cell('Crustum/NotificationUI.NotificationBell', [
    'enablePolling' => false,
    'broadcasting' => [
        'broadcaster' => 'pusher',
        'userId' => $authUser->getIdentifier(),
        'userName' => $authUser->username ?? 'User',
        'pusherKey' => env('PUSHER_APP_KEY'),
        'pusherHost' => env('PUSHER_HOST', '127.0.0.1'),
        'pusherPort' => env('PUSHER_PORT', 8080),
        'pusherCluster' => env('PUSHER_CLUSTER', 'mt1'),
    ],
]) ?>
```

**Mercure:**
```php
<?= $this->cell('Crustum/NotificationUI.NotificationBell', [
    'enablePolling' => false,
    'broadcasting' => [
        'broadcaster' => 'mercure',
        'userId' => $authUser->getIdentifier(),
        'mercureUrl' => env('MERCURE_PUBLIC_URL', '/.well-known/mercure'),
        'authEndpoint' => '/broadcasting/auth',
    ],
]) ?>
```

<a name="notification-data-fields"></a>
## Notification Data Fields

When creating notifications, use these fields in your `toDatabase()` method:

**Required:**
- `title` - Notification title
- `message` - Notification message

**Optional:**
- `action_url` - Makes notification clickable (redirects on click)
- `icon` - Built-in SVG icon: `bell`, `post`, `user`, `message`, `alert`, `check`, `info`
- `icon_class` - CSS class: `fa fa-bell`, `bi bi-bell`, `ti ti-bell`
- `actions` - Array of action objects with `name`, `label`, `url`, `event`, `icon`, etc.

**Action Object Structure:**
- `name` - Action identifier
- `label` - Display text
- `url` - URL to navigate to (or use `event` for custom events)
- `event` - Custom event name to dispatch
- `icon` - Icon class (e.g., `fa fa-check`)
- `color` or `type` - Button style (`success`, `danger`, `warning`, `info`)
- `openInNewTab` - Open URL in new tab (default: false)
- `shouldClose` - Close dropdown/panel after action (default: false)
- `isDisabled` - Disable the action button

Example:

```php
public function toDatabase(): array
{
    return [
        'title' => 'Order Shipped',
        'message' => "Your order #{$this->order->id} has been shipped!",
        'action_url' => "/orders/{$this->order->id}",
        'icon' => 'post',
        'actions' => [
            [
                'name' => 'view',
                'label' => 'View Order',
                'url' => "/orders/{$this->order->id}",
                'icon' => 'fa fa-eye',
            ],
            [
                'name' => 'track',
                'label' => 'Track Package',
                'url' => "/orders/{$this->order->id}/track",
                'icon' => 'fa fa-truck',
                'openInNewTab' => true,
            ],
        ],
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

Listen for notification events. The system dispatches custom events for notification lifecycle:

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

### Alpine.js Store Events

The Alpine.js store also provides reactive updates. Access the store to observe changes:

```javascript
// Watch for store changes
Alpine.effect(() => {
    const store = Alpine.store('notifications');
    console.log('Unread count:', store.unreadCount);
    console.log('Items:', store.items);
});
```

<a name="template-overloading"></a>
## Template Overloading

The notification system uses server-side PHP templates with Alpine.js directives for reactive rendering. The `NotificationBellCell` renders elements internally, so customization is done by overriding element templates.

### PHP Element Templates

The notification system uses server-side PHP templates with Alpine.js directives for reactive rendering. Override templates by creating files in your app's `templates/element/` directory:

```
templates/element/Crustum/NotificationUI/notifications/
  ├── templates.php         # Alpine.js notification templates (loading, empty, items, load more)
  └── bell_icon.php         # Bell icon element (used by Cell)
```

**Override notification templates:**

Copy `plugins/NotificationUI/templates/element/notifications/templates.php` to:
```
templates/element/Crustum/NotificationUI/notifications/templates.php
```

This template contains Alpine.js directives for:
- Loading state (`x-if="isLoading"`)
- Empty state (`x-if="!isLoading && items.length === 0"`)
- Notification items (`x-for="notification in items"`)
- Load more button (`x-if="hasMore && !isLoading"`)

**Example override:**

```php
<?php
/**
 * Custom notification templates
 */
?>

<template x-if="isLoading">
    <div class="custom-loading">Loading notifications...</div>
</template>

<template x-for="notification in items" :key="notification.id">
    <div class="custom-notification-item"
         x-data="notificationItem(getNotificationData(notification))">
        <div class="custom-title" x-text="title"></div>
        <div class="custom-message" x-text="message"></div>
    </div>
</template>
```

### Alpine.js Store Access

Access the notification store programmatically:

```javascript
// Get the Alpine.js store
const store = Alpine.store('notifications');

// Add a notification
store.addNotification({
    id: 123,
    title: 'New Notification',
    message: 'This is a test',
    read_at: null,
    created_at: new Date().toISOString()
});

// Mark as read
await store.markAsRead(123);

// Mark all as read
await store.markAllAsRead();

// Load more notifications
await store.loadMore();

// Toggle dropdown/panel
store.toggle();
```

### Using CakeNotification Builder

The `CakeNotification` fluent API still works and integrates with the Alpine.js store:

```javascript
CakeNotification.make()
    .title('Order Shipped')
    .message('Your order has been shipped!')
    .actionUrl('/orders/123')
    .send();
```

<a name="alpinejs-architecture"></a>
## Alpine.js Architecture

The notification system is built on Alpine.js for reactive state management. The architecture consists of:

### Alpine.js Store

The `notifications` store (`Alpine.store('notifications')`) provides:
- `items` - Array of notification objects
- `unreadCount` - Reactive unread count
- `isLoading` - Loading state
- `hasMore` - Whether more notifications are available
- `isOpen` - Whether dropdown/panel is open
- `currentPage` - Current pagination page

### Alpine.js Components

- `notificationBell` - Bell icon component with theme detection
- `notificationList` - List container with pagination
- `notificationItem` - Individual notification item with actions

### Broadcasting Modules

Broadcasting modules (`PusherModule`, `MercureModule`) extend `BroadcastingBase` and automatically integrate with the Alpine.js store for real-time updates.

