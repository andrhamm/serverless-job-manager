const express = require('express');

const app = express();
const port = 3030;

app.use(express.json()); // for parsing application/json

app.post('/', (req, res) => {
  console.log('received job webhook!');
  console.log(req.body);
  res.json({ status: 'ok' });
});

app.listen(port, () => console.log(`Mock service listening for job webhooks on port ${port}!`));
