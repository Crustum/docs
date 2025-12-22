# CakePHP Temporal Plugin

<a name="introduction"></a>
## Introduction

The **CakePHP Temporal Plugin** provides workflow orchestration for CakePHP applications using [Temporal](https://temporal.io/). Temporal is a distributed, scalable, durable, and highly available orchestration engine for asynchronous long-running business logic in a microservice architecture.

The plugin integrates seamlessly with CakePHP's dependency injection system, provides command line tools for generating workflows and activities, and supports auto-discovery of your workflow and activity classes. It also includes support for cross-language activities, allowing you to call Go, Java, or other language activities from PHP workflows.

<a name="installation"></a>
## Installation

You can install the plugin via Composer:

```bash
composer require crustum/temporal
```

### Requirements

- PHP 8.2+
- CakePHP 5.1+
- Temporal Server (running locally or remotely)
- RoadRunner (for worker execution)

### Installing Temporal Server

You can run Temporal Server locally using Docker:

```bash
docker run -p 7233:7233 temporalio/auto-setup:latest
```

Or install the Temporal CLI and run the development server:

```bash
# Install Temporal CLI
# See: https://docs.temporal.io/cli

# Start development server
temporal server start-dev
```

### Installing Plugin Assets

After installing the plugin via Composer, you need to install plugin assets (configuration files, worker scripts, etc.):

**Step 1: Using PluginManifest (Recommended)**

```bash
bin/cake manifest install --plugin Temporal
```

This will:
- Copy `config/temporal.php` to your application
- Copy `bin/roadrunner-worker.php` to your application
- Copy file watcher scripts to `bin/watch/`
- Add configuration loading to `config/bootstrap.php`

**Step 2: Using Temporal Install Command**

```bash
bin/cake temporal install
```

This will:
- Download RoadRunner binary to `bin/rr` (or `bin/rr.exe` on Windows)
- Install file watcher dependencies (`npm install` in `bin/watch/`)
- Update `.gitignore` to exclude RoadRunner binaries

### Installing RoadRunner

RoadRunner is required for running Temporal workers. The `temporal install` command will automatically download the RoadRunner binary, or you can install it manually:

```bash
composer require spiral/roadrunner-cli --dev
./vendor/bin/rr get-binary
```

<a name="quickstart"></a>
## Quickstart

### 1. Load the Plugin

First, load the Temporal plugin in your `Application.php`:

```php
// In src/Application.php
public function bootstrap(): void
{
    parent::bootstrap();

    $this->addPlugin('Crustum/Temporal');
}
```

### 2. Install Plugin Assets

Install plugin assets using PluginManifest:

```bash
bin/cake manifest install --plugin Temporal
```

This automatically:
- Copies the configuration file to `config/temporal.php`
- Adds configuration loading to `config/bootstrap.php`
- Copies worker scripts and file watcher files

Alternatively, the configuration loading is automatically added to `config/bootstrap.php` when you run `manifest install`.

### 3. Generate a Workflow

Generate your first workflow using the bake command:

```bash
bin/cake bake temporal workflow OrderProcessing
```

This will create:
- `src/Workflows/OrderProcessingWorkflowInterface.php`
- `src/Workflows/OrderProcessingWorkflow.php`

### 4. Generate an Activity

Generate an activity to handle order creation:

```bash
bin/cake bake temporal activity OrderCreation
```

This will create:
- `src/Activities/OrderCreationActivityInterface.php`
- `src/Activities/OrderCreationActivity.php`

### 5. Implement Your Workflow

```php
// src/Workflows/OrderProcessingWorkflow.php
namespace App\Workflows;

use App\Activities\OrderCreationActivityInterface;
use Crustum\Temporal\Temporal;
use Temporal\Workflow;

class OrderProcessingWorkflow implements OrderProcessingWorkflowInterface
{
    public function execute(array $data)
    {
        $activity = Temporal::newActivity()
            ->build(OrderCreationActivityInterface::class);

        $order = yield $activity->create($data);

        return ['order_id' => $order['id'], 'status' => 'completed'];
    }
}
```

### 6. Implement Your Activity

```php
// src/Activities/OrderCreationActivity.php
namespace App\Activities;

use App\Model\Table\OrdersTable;

class OrderCreationActivity implements OrderCreationActivityInterface
{
    public function __construct(
        private OrdersTable $ordersTable
    ) {
    }

    public function create(array $data): array
    {
        $order = $this->ordersTable->newEntity($data);
        $this->ordersTable->save($order);

        return $order->toArray();
    }
}
```

### 7. Register Activity in Container

Register your activity in `Application::services()`:

```php
// src/Application.php
public function services(ContainerInterface $container): void
{
    $container->add(OrderCreationActivity::class)
        ->addArgument(OrdersTable::class);
}
```

### 8. Start a Workflow

Start a workflow from your controller:

```php
// src/Controller/OrdersController.php
use Crustum\Temporal\Temporal;
use App\Workflows\OrderProcessingWorkflowInterface;

public function create()
{
    $workflow = Temporal::newWorkflow()
        ->withWorkflowId('order-' . uniqid())
        ->build(OrderProcessingWorkflowInterface::class);

    $result = $workflow->execute([
        'user_id' => 1,
        'total' => 99.99,
    ]);

    $this->Flash->success('Order processing started');
    return $this->redirect(['action' => 'index']);
}
```

### 9. Start the Worker

Start the Temporal worker to execute workflows and activities:

```bash
bin/cake temporal work
```

Your workflow will now execute automatically!

<a name="configuration"></a>
## Configuration

All of your application's Temporal configuration is stored in the `config/temporal.php` configuration file:

```php
<?php
declare(strict_types=1);

return [
    'Temporal' => [
        'address' => env('TEMPORAL_ADDRESS', 'localhost:7233'),
        'namespace' => env('TEMPORAL_NAMESPACE', 'default'),
        'queue' => env('TEMPORAL_QUEUE', 'php-queue'),
        'tls' => [
            'client_key' => env('TEMPORAL_TLS_CLIENT_KEY'),
            'client_cert' => env('TEMPORAL_TLS_CLIENT_CERT'),
            'root_ca' => env('TEMPORAL_TLS_ROOT_CA'),
            'server_name' => env('TEMPORAL_TLS_SERVER_NAME'),
        ],
        'retry' => [
            'workflow' => [
                'initial_interval' => 1,
                'backoff_coefficient' => 2.0,
                'maximum_interval' => 100,
                'maximum_attempts' => 0,
            ],
            'activity' => [
                'initial_interval' => 1,
                'backoff_coefficient' => 2.0,
                'maximum_interval' => 100,
                'maximum_attempts' => 3,
            ],
        ],
        'interceptors' => [],
        'discovery' => [
            'workflows' => [
                'src/Workflows',
            ],
            'activities' => [
                'src/Activities',
            ],
        ],
        'watch' => [
            'src',
        ],
        'testing' => [
            'server' => env('TEMPORAL_TESTING_SERVER', true),
            'time_skipping' => env('TEMPORAL_TESTING_TIME_SKIPPING', false),
            'debug' => env('TEMPORAL_TESTING_DEBUG', false),
            'address' => env('TEMPORAL_TESTING_ADDRESS', 'localhost:7233'),
            'namespace' => env('TEMPORAL_TESTING_NAMESPACE', 'default'),
        ],
    ],
];
```

### Configuration Options

- **address**: The Temporal server address (default: `localhost:7233`)
- **namespace**: The Temporal namespace (default: `default`)
- **queue**: The default task queue name (default: `php-queue`)
- **tls**: TLS configuration for secure connections
  - **client_key**: Path to client key file
  - **client_cert**: Path to client certificate file
  - **root_ca**: Path to root CA certificate file
  - **server_name**: Override server name for certificate verification
- **retry**: Default retry policies for workflows and activities
- **interceptors**: Array of interceptor class names
- **discovery**: Paths to discover workflows and activities automatically
- **watch**: Directories to watch for file changes (used with `--watch` flag)
- **testing**: Testing environment configuration
  - **server**: Whether to start Temporal server in tests (default: `true`)
  - **time_skipping**: Enable time skipping for tests (default: `false`)
  - **debug**: Enable debug output in tests (default: `false`)
  - **address**: Temporal server address for testing
  - **namespace**: Temporal namespace for testing

### Environment Variables

You can override configuration values using environment variables:

```ini
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=production
TEMPORAL_QUEUE=my-queue
```

<a name="workflows"></a>
## Workflows

Workflows are the core abstraction in Temporal. They define the orchestration logic for your business processes. Workflows are deterministic, meaning they must produce the same result when replayed.

<a name="generating-workflows"></a>
### Generating Workflows

You can generate a new workflow using the bake command:

```bash
bin/cake bake temporal workflow OrderApproval
```

This command will create:
- `src/Workflows/OrderApprovalWorkflowInterface.php` - The workflow interface
- `src/Workflows/OrderApprovalWorkflow.php` - The workflow implementation

The generated workflow includes:
- A `WorkflowInterface` attribute
- A `WorkflowMethod` attribute on the `execute()` method
- Commented-out examples for `QueryMethod` and `SignalMethod`

<a name="defining-workflows"></a>
### Defining Workflows

A workflow consists of an interface and an implementation. The interface defines the workflow's contract:

```php
<?php
declare(strict_types=1);

namespace App\Workflows;

use Temporal\Workflow\QueryMethod;
use Temporal\Workflow\SignalMethod;
use Temporal\Workflow\WorkflowInterface;
use Temporal\Workflow\WorkflowMethod;

#[WorkflowInterface]
interface OrderApprovalWorkflowInterface
{
    #[WorkflowMethod(name: "order-approval")]
    public function execute(array $data);

    #[QueryMethod(name: "getStatus")]
    public function getStatus(): array;

    #[SignalMethod]
    public function approve(array $data): void;

    #[SignalMethod]
    public function reject(array $data): void;
}
```

The implementation contains the workflow logic:

```php
<?php
declare(strict_types=1);

namespace App\Workflows;

use App\Activities\OrderActivityInterface;
use Crustum\Temporal\Temporal;
use Temporal\Workflow;

class OrderApprovalWorkflow implements OrderApprovalWorkflowInterface
{
    private bool $approved = false;
    private ?array $rejectionData = null;
    private string $status = 'pending';

    public function execute(array $data)
    {
        $activity = Temporal::newActivity()
            ->build(OrderActivityInterface::class);

        $order = yield $activity->createOrder($data);

        yield Workflow::await(
            fn() => $this->approved || $this->rejectionData !== null
        );

        if ($this->rejectionData !== null) {
            $this->status = 'rejected';
            return ['status' => 'rejected', 'reason' => $this->rejectionData['reason']];
        }

        $this->status = 'approved';
        return ['status' => 'approved', 'order_id' => $order['id']];
    }

    public function getStatus(): array
    {
        return [
            'status' => $this->status,
            'approved' => $this->approved,
            'rejected' => $this->rejectionData !== null,
        ];
    }

    public function approve(array $data): void
    {
        $this->approved = true;
    }

    public function reject(array $data): void
    {
        $this->rejectionData = $data;
    }
}
```

<a name="workflow-methods"></a>
### Workflow Methods

Workflows can have three types of methods:

#### Workflow Methods

The main entry point for a workflow. Marked with `#[WorkflowMethod]`:

```php
#[WorkflowMethod(name: "order-approval")]
public function execute(array $data);
```

#### Query Methods

Allow reading workflow state without affecting execution. Marked with `#[QueryMethod]`:

```php
#[QueryMethod(name: "getStatus")]
public function getStatus(): array;
```

#### Signal Methods

Allow sending data to a running workflow. Marked with `#[SignalMethod]`:

```php
#[SignalMethod]
public function approve(array $data): void;
```

<a name="starting-workflows"></a>
### Starting Workflows

You can start workflows from controllers, commands, or anywhere in your application:

```php
use Crustum\Temporal\Temporal;
use App\Workflows\OrderApprovalWorkflowInterface;

// Simple - use defaults
$workflow = Temporal::newWorkflow()
    ->build(OrderApprovalWorkflowInterface::class);

$result = $workflow->execute([
    'user_id' => 1,
    'total' => 99.99,
]);

// With custom options
$workflow = Temporal::newWorkflow()
    ->withWorkflowId('order-' . $orderId)
    ->withTaskQueue('high-priority-queue')
    ->withWorkflowExecutionTimeout(new \DateInterval('PT1H'))
    ->withMemo(['order_id' => $orderId])
    ->build(OrderApprovalWorkflowInterface::class);

$result = $workflow->execute($orderData);
```

<a name="workflow-builders"></a>
### Workflow Builders

The `WorkflowBuilder` provides a fluent interface for configuring workflow options:

```php
$workflow = Temporal::newWorkflow()
    ->withWorkflowId('unique-workflow-id')
    ->withTaskQueue('custom-queue')
    ->withWorkflowExecutionTimeout(new \DateInterval('PT1H'))
    ->withWorkflowRunTimeout(new \DateInterval('PT30M'))
    ->withWorkflowTaskTimeout(new \DateInterval('PT10S'))
    ->withMemo(['key' => 'value'])
    ->withSearchAttributes(['CustomKeyword' => 'value'])
    ->withRetryOptions(RetryOptions::new()->withMaximumAttempts(5))
    ->build(OrderApprovalWorkflowInterface::class);
```

Available methods:
- `withWorkflowId(string $id)` - Set a custom workflow ID
- `withTaskQueue(string $queue)` - Set the task queue
- `withWorkflowExecutionTimeout(DateInterval $timeout)` - Maximum execution time
- `withWorkflowRunTimeout(DateInterval $timeout)` - Maximum run time
- `withWorkflowTaskTimeout(DateInterval $timeout)` - Task processing timeout
- `withMemo(array $memo)` - Add metadata
- `withSearchAttributes(array $attributes)` - Add searchable attributes
- `withRetryOptions(RetryOptions $options)` - Configure retry policy

<a name="activities"></a>
## Activities

Activities are the building blocks of workflows. They represent units of work that can fail and be retried. Activities are executed by workers and can perform any operation: database queries, API calls, file processing, etc.

<a name="generating-activities"></a>
### Generating Activities

Generate a new activity using the bake command:

```bash
bin/cake bake temporal activity PaymentProcessing
```

This creates:
- `src/Activities/PaymentProcessingActivityInterface.php`
- `src/Activities/PaymentProcessingActivity.php`

<a name="defining-activities"></a>
### Defining Activities

An activity consists of an interface and an implementation:

```php
<?php
declare(strict_types=1);

namespace App\Activities;

use Temporal\Activity\ActivityInterface;
use Temporal\Activity\ActivityMethod;

#[ActivityInterface(prefix: "payment.")]
interface PaymentProcessingActivityInterface
{
    #[ActivityMethod(name: "process")]
    public function process(string $orderId, float $amount): array;
}
```

The implementation contains the activity logic:

```php
<?php
declare(strict_types=1);

namespace App\Activities;

class PaymentProcessingActivity implements PaymentProcessingActivityInterface
{
    public function process(string $orderId, float $amount): array
    {
        // Process payment logic here
        $paymentId = 'pay_' . uniqid();

        return [
            'success' => true,
            'payment_id' => $paymentId,
            'amount' => $amount,
        ];
    }
}
```

<a name="activity-methods"></a>
### Activity Methods

Activities can have multiple methods, each marked with `#[ActivityMethod]`:

```php
#[ActivityInterface(prefix: "order.")]
interface OrderActivityInterface
{
    #[ActivityMethod(name: "create")]
    public function createOrder(array $data): array;

    #[ActivityMethod(name: "update")]
    public function updateOrder(string $orderId, array $data): array;

    #[ActivityMethod(name: "cancel")]
    public function cancelOrder(string $orderId): bool;
}
```

<a name="calling-activities"></a>
### Calling Activities

Call activities from within workflows using the builder:

```php
use Crustum\Temporal\Temporal;
use App\Activities\OrderActivityInterface;
use Temporal\Workflow;

class OrderWorkflow implements OrderWorkflowInterface
{
    public function execute(array $data)
    {
        // Simple - use defaults
        $activity = Temporal::newActivity()
            ->build(OrderActivityInterface::class);

        $order = yield $activity->createOrder($data);

        // With custom timeout and retry
        $paymentActivity = Temporal::newActivity()
            ->withTaskQueue('payment-queue')
            ->withStartToCloseTimeout(new \DateInterval('PT30S'))
            ->withRetryOptions(RetryOptions::new()->withMaximumAttempts(5))
            ->build(PaymentActivityInterface::class);

        $payment = yield $paymentActivity->processPayment($order['id'], $data['total']);

        return $order;
    }
}
```

<a name="activity-builders"></a>
### Activity Builders

The `ActivityBuilder` provides a fluent interface for configuring activity options:

```php
$activity = Temporal::newActivity()
    ->withTaskQueue('custom-queue')
    ->withStartToCloseTimeout(new \DateInterval('PT30S'))
    ->withScheduleToCloseTimeout(new \DateInterval('PT1M'))
    ->withScheduleToStartTimeout(new \DateInterval('PT10S'))
    ->withHeartbeatTimeout(new \DateInterval('PT5S'))
    ->withRetryOptions(RetryOptions::new()->withMaximumAttempts(3))
    ->withActivityId('unique-activity-id')
    ->build(OrderActivityInterface::class);
```

Available methods:
- `withTaskQueue(string $queue)` - Set the task queue
- `withStartToCloseTimeout(DateInterval $timeout)` - Maximum execution time
- `withScheduleToCloseTimeout(DateInterval $timeout)` - Maximum time from schedule to completion
- `withScheduleToStartTimeout(DateInterval $timeout)` - Maximum time from schedule to start
- `withHeartbeatTimeout(DateInterval $timeout)` - Heartbeat timeout
- `withRetryOptions(RetryOptions $options)` - Configure retry policy
- `withActivityId(string $id)` - Set a custom activity ID

<a name="activity-dependency-injection"></a>
### Dependency Injection

Activities can receive dependencies via constructor injection. Register activities in your `Application::services()` method:

```php
// src/Application.php
public function services(ContainerInterface $container): void
{
    // Register table classes
    $container->add(OrdersTable::class, function () use ($container) {
        return FactoryLocator::get('Table')->get('Orders');
    });

    // Register activities with dependencies
    $container->add(OrderActivity::class)
        ->addArgument(OrdersTable::class);

    $container->add(PaymentActivity::class);

    $container->add(NotificationActivity::class)
        ->addArgument(Mailer::class);
}
```

The worker will automatically use the container to instantiate activities:

```php
// src/Activities/OrderActivity.php
class OrderActivity implements OrderActivityInterface
{
    public function __construct(
        private OrdersTable $ordersTable  // ← Injected via container!
    ) {
    }

    public function createOrder(array $orderData): array
    {
        // Use $this->ordersTable directly
        $order = $this->ordersTable->newEntity($orderData);
        $this->ordersTable->save($order);
        return $order->toArray();
    }
}
```

<a name="signals-and-queries"></a>
## Signals and Queries

Signals and queries allow you to interact with running workflows. Signals send data to workflows, while queries read workflow state.

<a name="defining-signals"></a>
### Defining Signals

Define signal methods in your workflow interface:

```php
#[WorkflowInterface]
interface OrderApprovalWorkflowInterface
{
    #[WorkflowMethod(name: "order-approval")]
    public function execute(array $data);

    #[SignalMethod]
    public function approve(array $data): void;

    #[SignalMethod]
    public function reject(array $data): void;
}
```

Implement signals in your workflow:

```php
class OrderApprovalWorkflow implements OrderApprovalWorkflowInterface
{
    private bool $approved = false;
    private ?array $rejectionData = null;

    public function execute(array $data)
    {
        // Wait for approval or rejection signal
        yield Workflow::await(
            fn() => $this->approved || $this->rejectionData !== null
        );

        // Process based on signal
        if ($this->rejectionData !== null) {
            return ['status' => 'rejected'];
        }

        return ['status' => 'approved'];
    }

    public function approve(array $data): void
    {
        $this->approved = true;
    }

    public function reject(array $data): void
    {
        $this->rejectionData = $data;
    }
}
```

<a name="sending-signals"></a>
### Sending Signals

Send signals to running workflows using the workflow client:

```php
use Crustum\Temporal\Temporal;
use App\Workflows\OrderApprovalWorkflowInterface;

$client = Temporal::getClient();

// Get stub for running workflow
$workflow = $client->newRunningWorkflowStub(
    OrderApprovalWorkflowInterface::class,
    $workflowId  // The workflow ID you started earlier
);

// Send a signal
$workflow->approve([
    'user_id' => $userId,
    'approved_at' => time(),
    'notes' => 'Approved by manager',
]);
```

Example from a controller:

```php
// src/Controller/ApprovalController.php
public function approve(string $token)
{
    $order = $this->Orders->find()
        ->where(['approval_token' => $token])
        ->first();

    $client = Temporal::getClient();
    $workflow = $client->newRunningWorkflowStub(
        OrderApprovalWorkflowInterface::class,
        $order->workflow_id
    );

    $workflow->approve([
        'user_id' => $this->request->getData('user_id'),
        'approved_at' => time(),
    ]);

    $this->Flash->success('Order approved');
    return $this->redirect(['action' => 'index']);
}
```

<a name="defining-queries"></a>
### Defining Queries

Define query methods to read workflow state:

```php
#[WorkflowInterface]
interface OrderApprovalWorkflowInterface
{
    #[QueryMethod(name: "getStatus")]
    public function getStatus(): array;

    #[QueryMethod(name: "getOrderDetails")]
    public function getOrderDetails(): array;
}
```

Implement queries in your workflow:

```php
class OrderApprovalWorkflow implements OrderApprovalWorkflowInterface
{
    private string $status = 'pending';
    private ?array $orderData = null;

    public function getStatus(): array
    {
        return [
            'status' => $this->status,
            'order_id' => $this->orderData['id'] ?? null,
        ];
    }

    public function getOrderDetails(): array
    {
        return $this->orderData ?? [];
    }
}
```

<a name="querying-workflows"></a>
### Querying Workflows

Query running workflows to get their current state:

```php
use Crustum\Temporal\Temporal;
use App\Workflows\OrderApprovalWorkflowInterface;

$client = Temporal::getClient();

$workflow = $client->newRunningWorkflowStub(
    OrderApprovalWorkflowInterface::class,
    $workflowId
);

// Query workflow state
$status = $workflow->getStatus();
$orderDetails = $workflow->getOrderDetails();
```

Example from a controller:

```php
// src/Controller/OrdersController.php
public function status(string $workflowId)
{
    $client = Temporal::getClient();
    $workflow = $client->newRunningWorkflowStub(
        OrderApprovalWorkflowInterface::class,
        $workflowId
    );

    $status = $workflow->getStatus();

    $this->set(compact('status'));
}
```

<a name="child-workflows"></a>
## Child Workflows

Child workflows allow you to compose complex workflows from simpler ones. Use `ChildWorkflowBuilder` to start child workflows:

```php
use Crustum\Temporal\Temporal;
use App\Workflows\PaymentProcessingWorkflowInterface;
use Temporal\Workflow;

class OrderWorkflow implements OrderWorkflowInterface
{
    public function execute(array $data)
    {
        // Start a child workflow
        $childWorkflow = Temporal::newChildWorkflow()
            ->withWorkflowId('payment-' . $data['order_id'])
            ->withTaskQueue('payment-queue')
            ->build(PaymentProcessingWorkflowInterface::class);

        $result = yield $childWorkflow->execute($data);

        return $result;
    }
}
```

Child workflows support the same configuration options as regular workflows:

```php
$childWorkflow = Temporal::newChildWorkflow()
    ->withWorkflowId('child-' . uniqid())
    ->withTaskQueue('child-queue')
    ->withWorkflowExecutionTimeout(new \DateInterval('PT30M'))
    ->withRetryOptions(RetryOptions::new()->withMaximumAttempts(3))
    ->build(ChildWorkflowInterface::class);
```

<a name="local-activities"></a>
## Local Activities

Local activities execute in the same worker process as the workflow, providing lower latency but less isolation. Use `LocalActivityBuilder` for local activities:

```php
use Crustum\Temporal\Temporal;
use App\Activities\ValidationActivityInterface;
use Temporal\Workflow;

class OrderWorkflow implements OrderWorkflowInterface
{
    public function execute(array $data)
    {
        // Local activity - runs in same worker process
        $validationActivity = Temporal::newLocalActivity()
            ->withStartToCloseTimeout(new \DateInterval('PT5S'))
            ->build(ValidationActivityInterface::class);

        $isValid = yield $validationActivity->validate($data);

        if (!$isValid) {
            throw new \Exception('Invalid order data');
        }

        // Continue with regular activities...
    }
}
```

Local activities are useful for fast, local operations that don't need isolation.

<a name="interceptors"></a>
## Interceptors

Interceptors allow you to add cross-cutting concerns to workflows and activities, such as logging, metrics, or error handling.

<a name="generating-interceptors"></a>
### Generating Interceptors

Generate an interceptor using the bake command:

```bash
# Interactive mode - select types from menu
bin/cake bake temporal interceptor Logging

# Or specify types directly
bin/cake bake temporal interceptor Logging --type=workflow_inbound_calls,activity_inbound

# Multiple types
bin/cake bake temporal interceptor Metrics --type=workflow_client_calls,activity_inbound,grpc_client
```

Available interceptor types:
- `workflow_client_calls` - Intercept workflow client calls (start, signal, query, etc.)
- `workflow_inbound_calls` - Intercept workflow inbound calls (execute, handleSignal, handleQuery, etc.)
- `workflow_outbound_calls` - Intercept workflow outbound calls (executeActivity, executeChildWorkflow, etc.)
- `activity_inbound` - Intercept activity inbound calls (handleActivityInbound)
- `grpc_client` - Intercept gRPC client calls
- `workflow_outbound_request` - Intercept workflow outbound requests to RoadRunner

<a name="defining-interceptors"></a>
### Defining Interceptors

The generated interceptor will implement the appropriate interfaces:

```php
<?php
declare(strict_types=1);

namespace App\Interceptors;

use Temporal\Interceptor\Trait\ActivityInboundInterceptorTrait;
use Temporal\Interceptor\Trait\WorkflowInboundCallsInterceptorTrait;
use Temporal\Interceptor\ActivityInboundInterceptor;
use Temporal\Interceptor\WorkflowInboundCallsInterceptor;

class LoggingInterceptor implements
    WorkflowInboundCallsInterceptor,
    ActivityInboundInterceptor
{
    use WorkflowInboundCallsInterceptorTrait;
    use ActivityInboundInterceptorTrait;

    public function executeActivity(
        \Temporal\Interceptor\ActivityInbound\ExecuteActivityInput $input,
        callable $next
    ) {
        \Cake\Log\Log::info('Executing activity', [
            'activity' => $input->activityType,
        ]);

        try {
            $result = $next($input);
            \Cake\Log\Log::info('Activity completed', [
                'activity' => $input->activityType,
            ]);
            return $result;
        } catch (\Throwable $e) {
            \Cake\Log\Log::error('Activity failed', [
                'activity' => $input->activityType,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
```

<a name="registering-interceptors"></a>
### Registering Interceptors

Register interceptors in your `config/temporal.php`:

```php
return [
    'Temporal' => [
        // ...
        'interceptors' => [
            \App\Interceptors\LoggingInterceptor::class,
            \App\Interceptors\MetricsInterceptor::class,
        ],
    ],
];
```

<a name="discovery"></a>
## Discovery

The plugin can automatically discover and register workflows and activities from configured paths.

<a name="auto-discovery"></a>
### Auto-Discovery

Configure discovery paths in `config/temporal.php`:

```php
return [
    'Temporal' => [
        'discovery' => [
            'workflows' => [
                'src/Workflows',
                'plugins/MyPlugin/src/Workflows',  // Plugin workflows
            ],
            'activities' => [
                'src/Activities',
                'plugins/MyPlugin/src/Activities',  // Plugin activities
            ],
        ],
    ],
];
```

The plugin will automatically discover and register:
- Workflow classes implementing `WorkflowInterface`
- Activity classes implementing `ActivityInterface`

Paths can be:
- Relative to `ROOT` (e.g., `src/Workflows`)
- Absolute paths (e.g., `/var/www/workflows`)

<a name="manual-registration"></a>
### Manual Registration

You can also manually register workflows and activities:

```php
use Crustum\Temporal\Temporal;

$registry = Temporal::getRegistry();

$registry->registerWorkflows(
    \App\Workflows\OrderWorkflow::class,
    \App\Workflows\PaymentWorkflow::class
);

$registry->registerActivities(
    \App\Activities\OrderActivity::class,
    \App\Activities\PaymentActivity::class
);
```

<a name="worker-management"></a>
## Worker Management

Workers execute workflows and activities. The plugin provides a command to start and manage workers.

<a name="starting-workers"></a>
### Starting Workers

Start a worker using the `temporal work` command:

```bash
bin/cake temporal work
```

This will:
1. Discover all registered workflows and activities
2. Start a RoadRunner worker
3. Connect to the Temporal server
4. Begin processing tasks from the configured queue

### Custom Queue

Start a worker for a specific queue:

```bash
bin/cake temporal work custom-queue
```

### Watch Mode

Enable auto-reload on file changes:

```bash
bin/cake temporal work --watch
```

### Advanced Worker Options

The `temporal work` command supports several advanced options:

```bash
# Custom RoadRunner config
bin/cake temporal work --rr-config=/path/to/.rr.yaml

# Custom RPC host and port
bin/cake temporal work --rpc-host=127.0.0.1 --rpc-port=6001

# Set number of workers
bin/cake temporal work --workers=4

# Set max jobs before reload
bin/cake temporal work --max-jobs=500

# Watch mode with auto-reload
bin/cake temporal work --watch
```

**Available Options:**
- `--rr-config`: Path to custom RoadRunner configuration file
- `--rpc-host`: RPC host for server communication (default: `127.0.0.1`)
- `--rpc-port`: RPC port for server communication (default: `6001`)
- `--workers`: Number of workers to start (default: `auto`)
- `--max-jobs`: Maximum jobs to process before reloading (default: `500`)
- `--watch`: Enable auto-reload on file changes

<a name="worker-configuration"></a>
### Worker Configuration

The worker uses RoadRunner for execution. Create a `.rr.yaml` file in your project root:

```yaml
version: "3"

server:
  command: "php plugins/Temporal/bin/roadrunner-worker.php"

temporal:
  address: localhost:7233
  namespace: default

logs:
  mode: production
  level: info
  output: stdout
  encoding: json
```

The `temporal work` command will automatically override configuration values from `config/temporal.php`.

<a name="roadrunner-integration"></a>
### RoadRunner Integration

The plugin automatically:
- Configures RoadRunner with Temporal settings
- Registers workflows and activities
- Handles dependency injection for activities
- Manages server state and process reloading

The worker script (`bin/roadrunner-worker.php`) handles:
- Application bootstrapping
- Container setup
- Workflow and activity registration
- Discovery fallback
- Interceptor registration

**Note:** The RoadRunner binary should be installed using `bin/cake temporal install` before running workers.

<a name="cross-language-activities"></a>
## Cross-Language Activities

Temporal supports calling activities written in different languages. You can call Go, Java, Python, or other language activities from PHP workflows.

<a name="go-activities"></a>
### Go Activities

To call a Go activity, use `buildUntyped()` instead of `build()`:

```php
use Crustum\Temporal\Temporal;
use Temporal\Workflow;

class OrderWorkflow implements OrderWorkflowInterface
{
    public function execute(array $data)
    {
        // Call Go activity using untyped stub
        $goPaymentActivity = Temporal::newActivity()
            ->withTaskQueue('go-payment-queue')  // Go worker's queue
            ->withStartToCloseTimeout(new \DateInterval('PT30S'))
            ->buildUntyped();  // ← Use buildUntyped() for Go activities

        // Execute Go activity by name
        $paymentResult = yield $goPaymentActivity->execute(
            'payment.ProcessPayment',  // Go activity name (string)
            [(string)$orderId, (float)$data['total_amount']]  // Arguments
        );

        // Convert result (Go returns stdClass, convert to array)
        if (is_object($paymentResult)) {
            $paymentResult = json_decode(json_encode($paymentResult), true);
        }

        return $paymentResult;
    }
}
```

<a name="activity-name-matching"></a>
### Activity Name Matching

The activity name in PHP must match the registered name in Go:

**PHP:**
```php
$goActivity->execute('payment.ProcessPayment', $args);
```

**Go:**
```go
w.RegisterActivityWithOptions(ProcessPaymentActivity, activity.RegisterOptions{
    Name: "payment.ProcessPayment",  // ← Must match PHP call
})
```

<a name="data-serialization"></a>
### Data Serialization

Temporal automatically serializes data between languages using JSON. Ensure your data types are compatible:

- PHP arrays → Go `map[string]interface{}`
- PHP strings → Go `string`
- PHP floats → Go `float64`
- PHP integers → Go `int64`

Go activities should return `map[string]interface{}`:

```go
func ProcessPaymentActivity(ctx context.Context, orderID string, amount float64) (map[string]interface{}, error) {
    return map[string]interface{}{
        "success": true,
        "payment_id": "pay_123",
    }, nil
}
```

<a name="data-converters"></a>
## Data Converters

Temporal uses data converters to serialize and deserialize data. The plugin includes a custom converter for CakePHP entities.

<a name="cakephp-entity-serialization"></a>
### CakePHP Entity Serialization

The `CakePayloadConverter` automatically handles CakePHP entities:

```php
use App\Model\Entity\Order;
use Crustum\Temporal\Temporal;

// In a workflow
$order = new Order(['id' => 1, 'total' => 99.99]);

// Entity is automatically serialized
$activity = Temporal::newActivity()->build(OrderActivityInterface::class);
yield $activity->processOrder($order);  // Entity passed directly

// Entity is automatically deserialized in activity
class OrderActivity implements OrderActivityInterface
{
    public function processOrder(Order $order): array
    {
        // $order is a fully reconstructed Entity instance
        return $order->toArray();
    }
}
```

The converter handles:
- Simple entities
- Nested entities (hasOne, belongsTo)
- Entity collections (hasMany, belongsToMany)
- Entity properties and relations

<a name="custom-converters"></a>
### Custom Converters

You can register a custom data converter:

```php
// In Application::services() or bootstrap
use Crustum\Temporal\Temporal;
use Temporal\DataConverter\DataConverter;
use App\DataConverter\CustomConverter;

$converter = new DataConverter(
    new NullConverter(),
    new BinaryConverter(),
    new ProtoJsonConverter(),
    new ProtoConverter(),
    new CustomConverter()  // Your custom converter
);

Temporal::setConfig('data_converter', $converter);
```

<a name="testing"></a>
## Testing

The plugin provides comprehensive testing infrastructure for workflows and activities, including both mocking capabilities and full integration testing with a real Temporal server.

### Testing Infrastructure

The plugin includes:
- **PHPUnit Extension** - Automatically starts/stops Temporal server and worker for integration tests
- **WithTemporalTrait** - Trait-based setup for per-test-case server management
- **TemporalMocker** - Mocking system for workflows and activities
- **LocalTemporalServer** - Local Temporal server for testing
- **TimeSkippingTemporalServer** - Server with time manipulation for testing timeouts and delays

<a name="testing-activities"></a>
### Testing Activities

Test activities independently:

```php
<?php
namespace App\Test\TestCase\Activity;

use App\Activities\OrderActivity;
use App\Model\Table\OrdersTable;
use Cake\TestSuite\TestCase;

class OrderActivityTest extends TestCase
{
    public function testCreateOrder(): void
    {
        $ordersTable = $this->getTableLocator()->get('Orders');
        $activity = new OrderActivity($ordersTable);

        $result = $activity->createOrder([
            'user_id' => 1,
            'total' => 99.99,
        ]);

        $this->assertArrayHasKey('id', $result);
        $this->assertEquals('pending', $result['status']);
    }
}
```

<a name="testing-workflows"></a>
### Testing Workflows

Test workflows using the mocking system:

```php
<?php
namespace App\Test\TestCase\Workflow;

use App\Workflows\OrderWorkflowInterface;
use App\Activities\OrderActivityInterface;
use Crustum\Temporal\Temporal;
use Crustum\Temporal\TestSuite\WithTemporalTrait;
use Cake\TestSuite\TestCase;

class OrderWorkflowTest extends TestCase
{
    use WithTemporalTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWithTemporal();
    }

    public function testOrderProcessing(): void
    {
        Temporal::fake();

        // Mock activity
        Temporal::mockActivity([OrderActivityInterface::class, 'createOrder'])
            ->andReturn(['id' => 1, 'status' => 'created']);

        // Start workflow
        $workflow = Temporal::newWorkflow()
            ->build(OrderWorkflowInterface::class);

        $result = $workflow->execute(['user_id' => 1, 'total' => 99.99]);

        // Assertions
        $this->assertEquals('completed', $result['status']);
        Temporal::assertActivityDispatched([OrderActivityInterface::class, 'createOrder']);
        Temporal::assertActivityDispatchedTimes([OrderActivityInterface::class, 'createOrder'], 1);
    }
}
```

<a name="mock-builders"></a>
### Mock Builders

The plugin provides fluent mock builders:

```php
use Crustum\Temporal\Temporal;
use Crustum\Temporal\TestSuite\WithTemporalTrait;
use App\Workflows\OrderWorkflowInterface;
use App\Activities\OrderActivityInterface;

class OrderWorkflowTest extends TestCase
{
    use WithTemporalTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpWithTemporal();
    }

    public function testWorkflowWithMockedActivity(): void
    {
        Temporal::fake();

        // Mock workflow
        Temporal::mockWorkflow(OrderWorkflowInterface::class)
            ->andReturn(['status' => 'completed']);

        // Or mock activity
        Temporal::mockActivity([OrderActivityInterface::class, 'createOrder'])
            ->andReturn(['id' => 1, 'status' => 'created']);

        // Test code that uses workflows/activities...

        // Assertions
        Temporal::assertWorkflowDispatched(OrderWorkflowInterface::class);
        Temporal::assertWorkflowDispatchedTimes(OrderWorkflowInterface::class, 1);

        Temporal::assertActivityDispatched([OrderActivityInterface::class, 'createOrder'], function ($orderData) {
            return $orderData['user_id'] === 1;
        });
    }
}
```

### PHPUnit Extension

For integration tests, use the PHPUnit extension to automatically start/stop the Temporal server:

**1. Configure PHPUnit** (`phpunit.xml`):

```xml
<extensions>
    <bootstrap class="Crustum\Temporal\TestSuite\Extension\TemporalExtension">
        <parameter name="time_skipping" value="false"/>
        <parameter name="debug" value="false"/>
        <parameter name="start_server" value="true"/>
    </bootstrap>
</extensions>

<php>
    <env name="TEMPORAL_CONFIG" value="config/temporal.php"/>
</php>
```

**2. Write Integration Tests:**

```php
use Crustum\Temporal\TestSuite\WithTemporalTrait;

class OrderWorkflowIntegrationTest extends TestCase
{
    use WithTemporalTrait;

    protected function setUp(): void
    {
        parent::setUp();
        // Extension automatically starts server, just set up worker
        $this->setUpWithTemporal();
    }

    public function testRealWorkflowExecution(): void
    {
        // Test with real Temporal server and worker
        $workflow = Temporal::newWorkflow()
            ->build(OrderWorkflowInterface::class);

        $result = $workflow->execute(['user_id' => 1, 'total' => 99.99]);
        $this->assertArrayHasKey('status', $result);
    }
}
```

### Testing Configuration

Configure testing behavior in `config/temporal.php`:

```php
'testing' => [
    'server' => true,              // Start Temporal server in tests
    'time_skipping' => false,      // Enable time skipping
    'debug' => false,              // Enable debug output
    'address' => 'localhost:7233', // Server address
    'namespace' => 'default',      // Namespace
],
```

Or via environment variables:

```ini
TEMPORAL_TESTING_SERVER=true
TEMPORAL_TESTING_TIME_SKIPPING=false
TEMPORAL_TESTING_DEBUG=false
```

<a name="advanced-topics"></a>
## Advanced Topics

<a name="retry-policies"></a>
### Retry Policies

Configure retry policies in `config/temporal.php`:

```php
'retry' => [
    'workflow' => [
        'initial_interval' => 1,        // Initial retry interval in seconds
        'backoff_coefficient' => 2.0,   // Exponential backoff multiplier
        'maximum_interval' => 100,       // Maximum retry interval
        'maximum_attempts' => 0,        // 0 = unlimited retries
    ],
    'activity' => [
        'initial_interval' => 1,
        'backoff_coefficient' => 2.0,
        'maximum_interval' => 100,
        'maximum_attempts' => 3,        // Retry up to 3 times
    ],
],
```

Override retry policies per workflow or activity:

```php
use Temporal\Common\RetryOptions;

$workflow = Temporal::newWorkflow()
    ->withRetryOptions(
        RetryOptions::new()
            ->withInitialInterval(new \DateInterval('PT5S'))
            ->withBackoffCoefficient(1.5)
            ->withMaximumAttempts(5)
    )
    ->build(WorkflowInterface::class);
```

<a name="workflow-timeouts"></a>
### Workflow Timeouts

Configure workflow timeouts:

```php
$workflow = Temporal::newWorkflow()
    ->withWorkflowExecutionTimeout(new \DateInterval('PT1H'))  // 1 hour max execution
    ->withWorkflowRunTimeout(new \DateInterval('PT30M'))      // 30 minutes max run
    ->withWorkflowTaskTimeout(new \DateInterval('PT10S'))     // 10 seconds task timeout
    ->build(WorkflowInterface::class);
```

<a name="activity-timeouts"></a>
### Activity Timeouts

Configure activity timeouts:

```php
$activity = Temporal::newActivity()
    ->withStartToCloseTimeout(new \DateInterval('PT30S'))      // 30 seconds execution
    ->withScheduleToCloseTimeout(new \DateInterval('PT1M'))   // 1 minute total
    ->withScheduleToStartTimeout(new \DateInterval('PT10S'))  // 10 seconds to start
    ->withHeartbeatTimeout(new \DateInterval('PT5S'))         // 5 seconds heartbeat
    ->build(ActivityInterface::class);
```

<a name="task-queues"></a>
### Task Queues

Task queues route work to specific workers. Use different queues for different workloads:

```php
// High-priority queue
$workflow = Temporal::newWorkflow()
    ->withTaskQueue('high-priority-queue')
    ->build(WorkflowInterface::class);

// Background processing queue
$activity = Temporal::newActivity()
    ->withTaskQueue('background-queue')
    ->build(ActivityInterface::class);
```

Start workers for specific queues:

```bash
bin/cake temporal work high-priority-queue
bin/cake temporal work background-queue
```

<a name="workflow-ids"></a>
### Workflow IDs

Workflow IDs must be unique within a namespace. Use meaningful IDs:

```php
$workflow = Temporal::newWorkflow()
    ->withWorkflowId('order-' . $orderId)
    ->build(OrderWorkflowInterface::class);
```

For idempotency, use deterministic IDs:

```php
$workflowId = 'order-processing-' . md5(json_encode($orderData));
$workflow = Temporal::newWorkflow()
    ->withWorkflowId($workflowId)
    ->build(OrderWorkflowInterface::class);
```

<a name="commands"></a>
## Commands

The plugin provides several console commands for managing Temporal workflows, activities, and workers.

<a name="install-command"></a>
### Install Command

The `temporal install` command sets up Temporal worker dependencies:

```bash
bin/cake temporal install
```

This command:
- Downloads RoadRunner binary to `bin/rr` (or `bin/rr.exe` on Windows)
- Installs file watcher dependencies (`npm install` in `bin/watch/`)
- Updates `.gitignore` to exclude RoadRunner binaries and configuration files

**What it does:**
- Checks for RoadRunner binary in `bin/`, project root, environment variables, and system PATH
- Downloads binary if not found using `vendor/bin/rr get-binary`
- Installs `chokidar` package for file watching (if `package.json` exists in `bin/watch/`)
- Adds `bin/rr`, `bin/rr.exe`, and `.rr.yaml` to `.gitignore`

<a name="work-command"></a>
### Work Command

The `temporal work` command starts a Temporal worker:

```bash
# Basic usage
bin/cake temporal work

# Custom queue
bin/cake temporal work custom-queue

# With options
bin/cake temporal work --watch --workers=4 --max-jobs=500
```

**Available Options:**
- `--rpc-host`: RPC host for server communication (default: `127.0.0.1`)
- `--rpc-port`: RPC port for server communication (default: `6001`)
- `--workers`: Number of workers to start (default: `auto`)
- `--max-jobs`: Maximum jobs to process before reloading (default: `500`)
- `--rr-config`: Path to custom RoadRunner configuration file
- `--watch`: Enable auto-reload on file changes

<a name="bake-commands"></a>
### Bake Commands

The plugin provides bake commands for generating Temporal classes:

**Generate Workflow:**
```bash
bin/cake bake temporal workflow OrderProcessing
```

**Generate Activity:**
```bash
bin/cake bake temporal activity OrderCreation
```

**Generate Interceptor:**
```bash
# Interactive mode
bin/cake bake temporal interceptor Logging

# With types specified
bin/cake bake temporal interceptor Logging --type=workflow_inbound_calls,activity_inbound
```

All bake commands support the `--force` flag to overwrite existing files.

<a name="phpstan-integration"></a>
## PHPStan Integration

The plugin includes PHPStan extensions for better static analysis of Temporal code. These extensions provide proper type inference for workflow proxies, activity proxies, and client interfaces.

### PHPStan Extensions

The plugin provides the following PHPStan extensions:

1. **TemporalActivityProxyExtension** - Type inference for activity proxy methods
2. **TemporalWorkflowProxyExtension** - Type inference for workflow proxy methods
3. **TemporalChildWorkflowProxyExtension** - Type inference for child workflow proxy methods
4. **TemporalWorkflowClientInterfaceExtension** - Type inference for `WorkflowClientInterface` methods
5. **TemporalWorkflowContextInterfaceExtension** - Type inference for `WorkflowContextInterface` methods

### Configuration

The extensions are automatically registered when you include the plugin's PHPStan configuration:

```neon
# phpstan.neon
includes:
    - vendor/crustum/temporal/extension.neon
```

Or if using the plugin's `composer.json` extra configuration:

```json
{
    "extra": {
        "phpstan": {
            "includes": [
                "extension.neon"
            ]
        }
    }
}
```

### Benefits

With PHPStan extensions enabled, you get:

- **Proper type inference** for workflow and activity method calls
- **Type safety** for workflow client operations
- **Better IDE support** with accurate autocomplete
- **Static analysis** catches type errors before runtime

Example:

```php
use App\Workflows\OrderWorkflowInterface;

$workflow = Temporal::newWorkflow()
    ->build(OrderWorkflowInterface::class);

// PHPStan knows the exact return type from the interface
$result = $workflow->execute(['user_id' => 1]);
// PHPStan infers the correct return type
```

