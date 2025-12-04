// server.js
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 2000;

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
