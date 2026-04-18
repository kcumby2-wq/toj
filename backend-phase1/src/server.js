const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`Subject Media backend scaffold running on http://localhost:${port}`);
});
