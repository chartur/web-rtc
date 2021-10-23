const roomNumberInput = document.querySelector('#room-number');
const enterButton = document.querySelector('#enter-room');
const myVideo = document.querySelector('#my-video');
const remoteVideo = document.querySelector('#remote-video');
const conversation = document.querySelector('#conversation');

let localStream,
  remoteStream,
  isCaller,
  roomNumber,
  rtcPeerConnection;

var io = io();
const iceServers = {
  'iceServer': [
    {'urls': 'stun:stun.services.mozilla.com'},
    {'urls': 'stun:stun.l.google.com:19302'}
  ]
};

const streamData = {
  audio: true,
  video: true
};

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

enterButton.onclick = () => {
  roomNumber = roomNumberInput.value;
  if (!roomNumber) {
    return alert('Room id is required!')
  }

  io.emit(events.CREATE_OR_JOIN_ROOM, roomNumber);
};

io.on(events.CREATED, room => {
  navigator.mediaDevices.getUserMedia(streamData)
    .then((stream) => {
      localStream = stream;
      myVideo.srcObject = stream;
      isCaller = true;
    })
    .catch((e) => {

    });
    conversation.style.display = 'block';
});

io.on(events.JOINED, room => {
  navigator.mediaDevices.getUserMedia(streamData)
    .then((stream) => {
      localStream = stream;
      myVideo.srcObject = stream;
      isCaller = false;
      io.emit(events.READY_TO_CONNECT, roomNumber)
    })
    .catch((e) => {

    });
  conversation.style.display = 'block';
});

io.on(events.READY_TO_CONNECT, () => {
  if(isCaller) {
    createWebRTCForCaller()
  }
});

io.on(events.ON_ANSWERED, (data) => {
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(data.description));
});

io.on(events.ON_OFFER, (data) => {
  if(!isCaller) {
    createWebRTCForReceiver(data)
  }
});


io.on(events.ON_CANDIDATE, (data) => {
  const candidate = new RTCIceCandidate({
    sdpMLineIndex: data.label,
    candidate: data.candidate
  });

  rtcPeerConnection.addIceCandidate(candidate);
});

function createRtcObject() {
  rtcPeerConnection = new RTCPeerConnection(iceServers);
  rtcPeerConnection.onicecandidate = onIceCandidate;
  rtcPeerConnection.ontrack = onAddStream;

  for (let track of localStream.getTracks()) {
    rtcPeerConnection.addTrack(track, localStream);
  }
}

function createWebRTCForCaller() {
  createRtcObject();
  rtcPeerConnection.createOffer()
    .then(description => {
      rtcPeerConnection.setLocalDescription(description);
      io.emit(events.ON_OFFER, {
        type: events.ON_OFFER,
        description,
        room: roomNumber
      })
    }).catch((e) => {
    console.log(e);
  })
}

function createWebRTCForReceiver(data) {
  createRtcObject();
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(data.description));
  rtcPeerConnection.createAnswer()
    .then(description => {
      rtcPeerConnection.setLocalDescription(description);
      io.emit(events.ON_ANSWERED, {
        type: events.ON_ANSWERED,
        description,
        room: roomNumber
      })
    }).catch((e) => {
    console.log(e);
  })
}

function onIceCandidate(data) {
  if(data.candidate) {
    console.log('sending candidate ', data.candidate);
    io.emit(events.ON_CANDIDATE, {
      type: events.ON_CANDIDATE,
      id: data.candidate.sdpMid,
      label: data.candidate.sdpMLineIndex,
      candidate: data.candidate.candidate,
      room: roomNumber
    })
  }
}

function onAddStream(data) {
  remoteStream = data.streams[0];
  remoteVideo.srcObject = remoteStream;
}
