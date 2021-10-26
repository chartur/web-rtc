const http = require('http');
const server = new http.Server();
const io = require('socket.io')(server);
const port = process.env.PORT || 3001;

const events = {
  INIT: 'init',
  CREATED: 'create',
  JOINED: 'joined',
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATES: 'ice-candidates',
  JOINED_NEW: 'joined-new-user'
};

server.listen(port,() => {
  console.log('Server is listening on port ' + port)
});

io.on('connection', socket => {
  socket.on(events.INIT, (room) => {
    socket.roomId = room;
    const conversation = io.sockets.adapter.rooms.get(room);
    socket.join(room);
    if(!conversation) {
      console.log('created');
      return socket.emit(events.CREATED);
    }
    console.log('joined');
    socket.emit(events.JOINED);
    socket.to(room).emit(events.JOINED_NEW)
  });

  socket.on(events.OFFER, (offer) => {
    socket.to(socket.roomId).emit(events.OFFER, offer);
  });

  socket.on(events.ANSWER, (offer) => {
    socket.to(socket.roomId).emit(events.ANSWER, offer);
  });

  socket.on(events.ICE_CANDIDATES, (iceCandidate) => {
    console.log(iceCandidate);
    socket.to(socket.roomId).emit(events.ICE_CANDIDATES, iceCandidate);
  });
});
