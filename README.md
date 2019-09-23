# serverless-job-manager

Scheduled cronjob notifications backed by AWS Serverless technologies including Step Functions, Lambda, CloudWatch and more.

Note: AWS places a limit of 100 CloudWatch Event Rules per account per region. You may be able to request an increase to this number.

# TODO

* Per-function IAM roles
  - seems to conflict with step functions plugin
* stage-specific statemachine names
* ~updateJobSchedule as a step function!~
* Workarounds for CloudWatch Event Rule limit (100)
  - Never duplicate a schedule expression (so the limit is instead 100 _unique_ schedule expressions)
    - Would require a layer of abstraction between event rules and their jobs
    - Would have to proxy the trigger event to SF/SNS/DynamoDB? Will add to job latency, need service to guarantee fast delivery (not sure about DynamoDB in this case)
    - UI would allow user to pick from a list of already defined schedules so as not to "consume" a rule (scheduling many jobs at the same time in the platform could be troublesome)
    - Step function receives trigger event and queries/scans dynamodb for all jobs matching the trigger's schedule expression, then use SF iterator to start executions for each job
      - Example of step function iterator: https://justinmchase.com/2017/03/08/iterating-with-aws-step-functions/
      - Ideally start executions in parallel
* Callback test event
  - when a service configures a job with an HTTP invocation target, make a test request to validate it can be accessed.
* ~Add support for overlapping jobs~
  - ~don't lock on the job~
* Log job execution metrics as CloudWatch metrics
  - execution latency (time elapsed from scheduled event time to service invocation)
  - enable/implement tracing for all function states, help inform future optimizations
    - include lambda stats (memory, etc) in metrics, so we can observe the effect on latency
* Callback heartbeat/keep-alive endpoint to extend the execution's lock_expires_at
  - extend the execution's timeout by a duration less than or equal to the job's configured ttl_seconds
  - wait step on the execution needs to retry if the value has been extended
* Internal job to stop pending state machine executions if ttl expired (cleanup job)
* Abstract into discrete AWS Event Fork Pipelines components
* Update to node10
  * ```
    const { logger, appenders, layouts } = require('lambda-logging')
    logger().appender = new appenders.ConsoleAppender(
     new layouts.Node4LegacyLayout()
    )
    ```
* Structured logging with log4js
* Use Awilix for IoC/Dependency Injection
* Use TypeScript... maybe