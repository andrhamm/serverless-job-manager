export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  callback(null,  {
    statusCode: 202,
    headers: {
      'Content-Type': 'application/json'
    },
    body: input.body,
  });
}
