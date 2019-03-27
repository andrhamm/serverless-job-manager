import AWS from 'aws-sdk';

export const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
export const cloudwatchevents = new AWS.CloudWatchEvents({ apiVersion: '2015-10-07' });
export const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
export const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
export const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
export const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
export const stepfunctions = new AWS.StepFunctions({apiVersion: '2016-11-23'});

export const dynamodbUnmarshall = AWS.DynamoDB.Converter.unmarshall;
export const dynamodbMarshall = AWS.DynamoDB.Converter.marshall;
