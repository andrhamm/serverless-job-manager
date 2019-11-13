import AWSRaw from 'aws-sdk';
import awsXRay from 'aws-xray-sdk';

const AWS = awsXRay.captureAWS(AWSRaw);

const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const cloudwatchevents = new AWS.CloudWatchEvents({ apiVersion: '2015-10-07' });
const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
const stepfunctions = new AWS.StepFunctions({ apiVersion: '2016-11-23' });

const dynamodbUnmarshall = AWS.DynamoDB.Converter.unmarshall;
const dynamodbMarshall = AWS.DynamoDB.Converter.marshall;

module.exports = {
  dynamodb,
  cloudwatchevents,
  lambda,
  s3,
  sns,
  sqs,
  stepfunctions,
  dynamodbUnmarshall,
  dynamodbMarshall,
};
