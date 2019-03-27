# serverless-job-manager

Scheduled cronjob notifications backed by AWS Serverless technologies including Step Functions, Lambda, CloudWatch and more.

Note: AWS places a limit of 100 CloudWatch Event Rules per account per region. You may be able to request an increase to this number.

# TODO

* Per-function IAM roles
  - seems to conflict with step functions plugin
* updateJobSchedule as a step function!
* Callback test event
  - when a service configures a job with an HTTP invocation target, make a test request to validate it can be accessed.
* Add support for overlapping jobs
  - don't lock on the job
