const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);


const events = {
  CREATE_OR_JOIN_ROOM: 'create or emit room',
  CREATED: 'created',
  JOINED: 'joined',
  ROOM_FULLED: 'full',
  READY_TO_CONNECT: 'ready',
  ON_CANDIDATE: 'candidate',
  ON_OFFER: 'offer',
  ON_ANSWERED:  'answer'
};


app.use(express.static('public'));
const port = process.env.PORT || 3000;

io.on('connection', (socket) => {
  socket.on(events.CREATE_OR_JOIN_ROOM, room => {
    const myRoom = io.sockets.adapter.rooms.get(room) || new Map();
    const numOfClients = myRoom.size;
    console.log(myRoom);
    if(numOfClients === 0) {
      socket.join(room);
      socket.emit(events.CREATED);
    } else if (numOfClients === 1) {
      socket.join(room);
      socket.emit(events.JOINED, room);
    } else {
      socket.emit(events.ROOM_FULLED, room);
    }
  });

  socket.on(events.READY_TO_CONNECT, room => {
    socket.broadcast.to(room).emit(events.READY_TO_CONNECT)
  });

  socket.on(events.ON_CANDIDATE, event => {
    socket.broadcast.to(event.room).emit(events.ON_CANDIDATE, event)
  });

  socket.on(events.ON_ANSWERED, event => {
    socket.broadcast.to(event.room).emit(events.ON_ANSWERED, event)
  });

  socket.on(events.ON_OFFER, event => {
    socket.broadcast.to(event.room).emit(events.ON_OFFER, event)
  })
});
server.listen(port, () => {
  console.log('server is listening on port ' + port)
});
