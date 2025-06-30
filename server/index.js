import express from 'express';
import logger from 'morgan';

import { Server } from 'socket.io';
import { createServer } from 'http';

const port = process.env.PORT ?? 3000;

const app = express();
const server = createServer(app);
const io = new Server(server)

io.on('connection', (socket) => {
  console.log('Un usuari s\'ha connectat!');

  socket.on('disconnect', () => {
    console.log('Un usuari s\'ha desconnectat!');
  });

  socket.on('chat message', (msg) => {
    console.log('Missatge: ' + msg);
    io.emit('chat message', msg);
  });
});

app.use(logger('dev'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html');
});

server.listen(port, () => {
  console.log(`Servidor escoltant al port ${port}`);
});