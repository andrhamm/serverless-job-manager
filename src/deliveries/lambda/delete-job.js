import configureContainer from '../../container';

function makeDeliveryLambdaDeleteJob({ softDeleteJob, getLogger }) {
  return async function delivery(input) {
    const {
      serviceName,
      jobName,
    } = input.pathParameters;

    const jobKey = {
      serviceName,
      jobName,
    };

    const logger = getLogger();
    logger.addContext('jobKey', jobKey);
    logger.debug(`event: ${JSON.stringify(input)}`);

    await softDeleteJob(jobKey);

    return {
      statusCode: 204,
      body: '',
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaDeleteJob);
