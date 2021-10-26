const events = {
  INIT: 'init',
  CREATED: 'create',
  JOINED: 'joined',
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATES: 'ice-candidates',
  JOINED_NEW: 'joined-new-user'
};
const ICE_config = {
  'iceServer': [
    {'urls': 'stun:stun.services.mozilla.com'},
    {'urls': 'stun:stun.l.google.com:19302'}
  ]
};
const videoCandidates = {
  video: true,
  audio: true //should be true
};

let socket;
let localStream;

const conversation = document.getElementById('conversation');

window.onload = async () => {
  const url = new URL(window.location.href);
  const id = url.searchParams.get('id');

  if(!id) {
    window.location.href = '/';
  }

  await initMyVideo();

  socket = io('http://localhost:3001', {
    data: {id},
    transports: [
      'websocket'
    ]
  });

  socket.on(events.JOINED, createReceiverPeerConnection);
  socket.on(events.CREATED, createCallerPeerConnection);
  socket.emit(events.INIT, id);
};

async function initMyVideo() {
  const myVideoTag = document.getElementById('my-video');
  localStream = await navigator.mediaDevices.getUserMedia(videoCandidates);
  myVideoTag.srcObject = localStream;
}

async function createCallerPeerConnection() {
  const peerConnection = new RTCPeerConnection(ICE_config);
  peerConnection.onicecandidate = addIceCandidatesCallback;
  peerConnection.ontrack = addNewStream;

  for (let track of localStream.getTracks()) {
    peerConnection.addTrack(track, localStream);
  }

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.on(events.ANSWER, (answer) => {
    console.log('on_answer');
    const remoteDesc = new RTCSessionDescription(answer);
    peerConnection.setRemoteDescription(remoteDesc);
  });
  socket.on(events.ICE_CANDIDATES, (data) => {
    console.log('on_ice_candidate');
    peerConnection.addIceCandidate(data)
  });

  socket.on(events.JOINED_NEW, async () => {
    const offer = await peerConnection.createOffer();
    socket.emit(events.OFFER, offer)
  })
}

async function createReceiverPeerConnection() {
  socket.on(events.OFFER, async (offer) => {
    const peerConnection = new RTCPeerConnection(ICE_config);
    peerConnection.onicecandidate = addIceCandidatesCallback;
    peerConnection.ontrack = addNewStream;

    for (let track of localStream.getTracks()) {
      peerConnection.addTrack(track, localStream);
    }


    console.log(offer);
    const remoteDesc = new RTCSessionDescription(offer);
    await peerConnection.setRemoteDescription(remoteDesc);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit(events.ANSWER, answer);

    socket.on(events.ICE_CANDIDATES, (data) => {
      console.log('on_ice_candidate');
      peerConnection.addIceCandidate(data)
    })
  });
}

function addIceCandidatesCallback(event) {
  if(!event.candidate) {
    return;
  }
  socket.emit(events.ICE_CANDIDATES, event.candidate)
}

function addNewStream(trackEvent) {
  const [stream] = trackEvent.streams;
  let video = document.getElementById(stream.id);
  if(!video) {
    const div = document.createElement('div');
    video = document.createElement('video');
    video.id = stream.id;
    video.autoplay = true;
    video.srcObject = stream;
    div.className = 'grid-item';
    div.append(video);
    conversation.append(div);
    return;
  }

}

