import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

import { Server } from 'socket.io';
import { createServer } from 'http';


dotenv.config();
const port = process.env.PORT ?? 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
})

const db = createClient({
  url: 'libsql://loyal-golden-guardian-fur1782.aws-eu-west-1.turso.io',
  authToken: process.env.DB_TOKEN,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    username TEXT, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

io.on('connection', async (socket) => {
  console.log('Un usuari s\'ha connectat!');

  socket.on('disconnect', () => {
    console.log('Un usuari s\'ha desconnectat!');
  });

  socket.on('chat message', async (msg) => {
    let result
    const user = socket.handshake.auth.username ??  'anonymous';
    try {
      result = await db.execute({
        sql: 'INSERT INTO messages (content, username, created_at) VALUES (:messages, :user, :created_at)', 
        args: {messages: msg, user: user, created_at: new Date().toISOString()}});
    } catch (error) {
      console.error('Error al guardar el missatge a la base de dades:', error);
      return;
    }

    console.log('Missatge: ' + msg);
    io.emit('chat message', msg, result.lastInsertRowid.toString(), user);
  });

  if (!socket.recovered){
    try {
      const result = await db.execute({
        sql:'SELECT id, username, content FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0]
      });

      result.rows.forEach((row) => {
        socket.emit('chat message', row.content, row.id.toString(), row.username, row.created_at);
      });
    }catch (error) {
      console.error('Error al recuperar els missatges:', error);
      return;
    }
  }
});

app.use(logger('dev'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html');
});

server.listen(port, () => {
  console.log(`Servidor escoltant al port ${port}`);
});