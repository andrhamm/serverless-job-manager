import configureContainer from '../../container';

function makeDeliveryLambdaUpdateJobScheduleTargets({ updateJobScheduleTargets, getLogger }) {
  return async function delivery(input) {
    const {
      ruleName,
      ...jobStatic
    } = input;

    const logger = getLogger();
    logger.addContext('guid', jobStatic.guid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    await updateJobScheduleTargets(ruleName, jobStatic);

    return input;
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaUpdateJobScheduleTargets);
