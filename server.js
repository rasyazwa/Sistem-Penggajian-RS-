const { server } = require('./backend/app');

server.listen(Number(process.env.PORT || 3000));
