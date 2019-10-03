# serverless-job-manager

Scheduled cronjob notifications backed by AWS Serverless technologies including Step Functions, Lambda, CloudWatch and more.

Note: AWS places a limit of 100 CloudWatch Event Rules per account per region. You may be able to request an increase to this number.

## Overview

Manages the scheduling, notifications, alerting (WIP), and logging of cronjobs in a microservice platform. If a service can receive an HTTP webhook, it can offload these responsibilities to `serverless-job-manager`.

The service consists of several components:

* An HTTP API (backed by API Gateway)
  * Endpoints for creating/updating job configurations
  * Endpoints for listing/filtering jobs and past executions of those jobs
  * Endpoints for service callbacks following an execution webhook
* A NoSQL document data store (DynamoDB)
  * A table for Jobs - the configuration of scheduled recurring jobs
  * A table for Job Executions - the record of each "run" of a job and the result
* Lambdas, Step Functions, etc

---

## Usage

*NOTE:* Custom domain for this API is a WIP, for now use the API Gateway default as shown here for staging.

### Authorizing API calls

Making requests to the jobs management API currently requires IAM authentication. You can use Postman to sign your requests using the `AWS Signature` authorization "type". This will allow you to specify your AWS IAM Access Key and Secret Key. Specify `us-east-1` for the Region and `execute-api` as the Service Name.

### Create or Update a Job

Idempotent endpoint for creating a new job or updating an existing one.

#### Example request

```text
Content-Type: application/json
Accept: application/json
Authorization: <SEE ABOVE>
PUT https://mdrt4x3afh.execute-api.us-east-1.amazonaws.com/stage/services/<SERVICE_NAME>/jobs/<JOB_NAME>

{
  "async": true,
  "enabled": true,
  "exclusive": false,
  "invocation_target": <WEBHOOK_TARGET_URL>,
  "invocation_type": "http",
  "payload": "{\\"foo\\":\\"bar2\\"}",
  "schedule": "cron(*/5 * * * ? *)"
  "ttl_seconds": 119,
}
```

#### Parameters

In path:

* `SERVICE_NAME`: The name of the service that owns the job. Services can have many jobs.
* `JOB_NAME`: The name of the specific job. Must be unique to the service.

In body:

* `async`: Currently only asynchronous jobs are supported, so this must be `true`. For `async` jobs, an HTTP request ("webhook") is made to the URL defined in `invocation_target`. The service then has `ttl_seconds` to call the given `callback_url` before it is marked as a failed due to timeout.
* `enabled`: Executions will be paused when this is set to `false`. No new execution history will be saved while the job is disabled.
* `exclusive`: When this is set to `true`, an execution will immediately fail if the previous execution is still in progress, meaning no webhook is fired. When `false`, multiple executions for the same job can be in progress at once. Services should consider their concurrency and resource availability when choosing the rate/schedule expression for their jobs. Webhooks for exclusive jobs will contain the output from the last successful run. This is useful because the service doens't have to store the results or state from the last run.
* `invocation_target`: For `http` invocations (webhooks), this should be an absolute URL to the services HTTP(S) endpoint. The endpoint will receive webhooks via the POST method, with the Content-Type of `application/json`. The service should respond with an HTTP status in the 200 range for the execution to be considered successfully started.
* `invocation_type`: Currently only `http` is supported. In the future, we may add support for `sqs`, `rabbitmq`, etc.
* `payload`: A static payload that will be sent with every execution invocation webhook. Must be a string (i.e. a JSON encoded value).
* `schedule`: A valid [CloudWatch Events Schedule Expression](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html). Examples: `rate(6 hours)` and `cron(*/5 * * * ? *)`. Executions can be scheduled to run _at most_ once per minute. Precise invocation times are not supported. There will always be a short delay between the exact scheduled time and when the service receives the execution invocation webhook. If the use case does not demand a specific time of day, prefer using a `rate` over a `cron` expression. A `rate` expression should work for most cases. The main exception is when a service has many different jobs that need to be balanced to run at different times. Using common `rate` expressions (i.e. `rate(5 minutes)`, `rate(1 hour)`, `rate(6 hours)`) will allow the job manager to optimize scheduling for all jobs. Expressions use UTC time zone.
* `ttl_seconds`: The duration, in seconds, before an execution is to be considered a failure. If an execution is expected to surpass this duration, the service must perform a heartbeat callback request to extend the timeout.

### Handling a job execution invocation webhook

Services will receive job execution invocation webhoooks via an HTTP POST request to the URL specified in the job config's `invocation_target` property. The webhook will be received aproximately at the scheduled time, not precisely, perhaps within 30 seconds.

#### Example webhook request body (this is what the service receives)

```json
{
  "callback_url": "https://mdrt4x3afh.execute-api.us-east-1.amazonaws.com/stage/callback/58c4be02-9b8e-5921-8a73-0694a51e4487/MTsyMDE5MDkyNy5wMDt0aGUtc2Vydjpub25leGNsdXNpdmUtam9iLTg4OjE1Njk1OTE5MDAwMDA6NTUwMzI1MGUtNTNjYy0yN2Y0LWE2MzctY2RlZTFkMWIyMDQ4",
  "invocation_latency_ms": 34310,
  "invocation_latency_pct": 28.8,
  "job_name": "my-job-1",
  "last_successful_execution": {
    "name": "a346244a-21db-bbad-7535-bc37f9b9c837_0807ea34-e1e0-41d3-b570-1c889a90aff1",
    "scheduled_time_ms": 1569604200000,
    "scheduled_time": "2019-10-03T18:12:00Z",
    "service_invoked_at_ms": 1569604200000,
    "state": "{\"duration\":2392}",
    "status": "success",
    "summary": "Success summary text"
  },
  "payload": "This is my payload, could have been JSON",
  "schedule": "rate(5 minutes)",
  "scheduled_time_ms": 1569604200000,
  "scheduled_time": "2019-09-27T17:10:00Z"
}
```

### Example callback request (this is what the service sends)

If the job execution has completed, or if the service needs more time to process the execution, a callback request is required. Failing to properly perform the callback request will result in the job execution being flagged as a failure.

#### Job execution has completed (success)

Note: The URL is the value of `callback_url` from the job execution invocation webhook payload.

```text
Content-Type: application/json
POST https://mdrt4x3afh.execute-api.us-east-1.amazonaws.com/stage/callback/<JOB_GUID>/<CALLBACK_TOKEN>

{
  "correlation_id": "foobar",
  "state": "{\"duration\":1234, \"processed\":666}",
  "status": "success",
  "summary": "Processed 666 rows"
}
```

#### Job execution still in progress (heartbeat)

If the job is running longer than expected as defined by the job's `ttl_seconds` configuration, the service must perform a heartbeat callback to extend the execution's TTL. This will extend the execution by `ttl_seconds` seconds.

Note: The URL is the value of `callback_url` from the job execution invocation webhook payload.

```text
Content-Type: application/json
POST https://mdrt4x3afh.execute-api.us-east-1.amazonaws.com/stage/callback/<JOB_GUID>/<CALLBACK_TOKEN>

{
  "status": "heartbeat"
}
```

---
---
---

## TODO

* Test suite
* Slack app for job failure notifications and job management
* Per-function IAM roles
  * seems to conflict with step functions plugin
* stage-specific statemachine names
* add jsonschema errors to APIG _response_ when using request validation
  * possible w/ cloudformation but not clear if there is Serverless Framework support
* ~updateJobSchedule as a step function!~
* mock delayed callback as a step function
  * should flex the heartbeat feature
* Workarounds for CloudWatch Event Rule limit (100)
  * Never duplicate a schedule expression (so the limit is instead 100 _unique_ schedule expressions)
    * Would require a layer of abstraction between event rules and their jobs
    * Would have to proxy the trigger event to SF/SNS/DynamoDB? Will add to job latency, need service to guarantee fast delivery (not sure about DynamoDB in this case)
    * UI would allow user to pick from a list of already defined schedules so as not to "consume" a rule (scheduling many jobs at the same time in the platform could be troublesome)
    * Step function receives trigger event and queries/scans dynamodb for all jobs matching the trigger's schedule expression, then use SF iterator to start executions for each job
      * [Example of step function iterator](https://justinmchase.com/2017/03/08/iterating-with-aws-step-functions/)
      * Ideally start executions in parallel
* Callback test event
  * when a service configures a job with an HTTP invocation target, make a test request to validate it can be accessed.
* Add support for a queued workflow where a service gets an iterator token to retreive jobs at its own pace, while keeping queued jobs "alive" automatically (where they would normally need a heartbeat request). Idea would be to allow for easier concurrency control, remove the need for servs to manage complex queues and heartbeats.
  * Example flow: job manager sends webhook to service that there is work in the queue. Service does a callback request, indicating the level of concurrency available (n), gets _n_ jobs in the response or as individual async webhooks (each job specifies a worker/thread ID for the service to route the work by). Each webhook indicates if there is remaining work in the queue and a callback url+token for retreiving the next job for that worker/thread.
* ~Add support for overlapping jobs~
  * ~don't lock on the job~
* Log job execution metrics as CloudWatch metrics
  * execution latency (time elapsed from scheduled event time to service invocation)
  * enable/implement tracing for all function states, help inform future optimizations
    * include lambda stats (memory, etc) in metrics, so we can observe the effect on latency
* Callback heartbeat/keep-alive endpoint to extend the execution's lock_expires_at
  * extend the execution's timeout by a duration less than or equal to the job's configured ttl_seconds
  * wait step on the execution needs to retry if the value has been extended
* Internal job to stop pending state machine executions if ttl expired (cleanup job)
* Abstract into discrete AWS Event Fork Pipelines components
* ~Update to node10~
* (better/fix) Structured logging with log4js
* ~Use Awilix for IoC/Dependency Injection~
  * Deliveries per service (APIG vs Step Functions)
* Use TypeScript... maybe
* Utilities for cleaning up execution history, logs, dynamodb, etc
