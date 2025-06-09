const Peer = window.Peer;

(async () => {
  const peer = new Peer({ key: '326bee5e-43dc-42e0-bf04-2e9d8be322e2', debug: 3 });
  let room = null;

  const joinBtn = document.getElementById('joinBtn');
  const leaveBtn = document.getElementById('leaveBtn');
  const roomName = document.getElementById('roomName');
  const localVideo = document.getElementById('localVideo');
  const remoteVideos = document.getElementById('remoteVideos');

  let localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  joinBtn.onclick = () => {
    if (peer.open && !roomName.value) return alert('Enter a room name');
    room = peer.joinRoom(roomName.value, {
      mode: 'sfu',
      stream: localStream
    });

    room.once('open', () => {
      console.log('✅ Joined SFU room:', roomName.value);
      joinBtn.disabled = true;
      leaveBtn.disabled = false;
    });

    room.on('stream', stream => {
      const vid = document.createElement('video');
      vid.srcObject = stream;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.style = 'width:240px; margin:4px;';
      vid.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.appendChild(vid);
    });

    room.on('peerLeave', peerId => {
      const vid = remoteVideos.querySelector(`[data-peer-id="${peerId}"]`);
      if (vid) {
        vid.srcObject.getTracks().forEach(t => t.stop());
        vid.remove();
      }
    });
  };

  leaveBtn.onclick = () => {
    room.close(true);
    joinBtn.disabled = false;
    leaveBtn.disabled = true;
    remoteVideos.innerHTML = '';
    console.log('🛑 Left SFU room');
  };

  peer.on('error', console.error);
})();