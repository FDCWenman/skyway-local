const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory, uuidV4 } = skyway_room;
// const APP_ID = "63bdb901-7428-43fb-99b1-d181b0c64310";
// const SECRET_KEY = "CTxzwgXj/i+1REyCNliqH0GJ83n0Z4IHCjqvEpD1rg0=";
const APP_ID = "326bee5e-43dc-42e0-bf04-2e9d8be322e2";
const SECRET_KEY = "7vU4AcgjILced6SK3ATwKzekeWLiSYpJwmb6AvNPVxw=";

const token = new SkyWayAuthToken({
  jti: uuidV4(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 60 * 24,
  version: 3,
  scope: {
    appId: APP_ID,
    rooms: [
    {
      name: "*",
      methods: ["create", "close", "updateMetadata"],
      member: {
        name: "*",
        methods: ["publish", "subscribe", "updateMetadata"]
      },
      sfu: {
        enabled: true
      }
    }],
    turn: {
      enabled: true
    }
  }
}).encode(SECRET_KEY);

const localVideo = document.getElementById("local-video");
const buttonArea = document.getElementById("button-area");
const remoteMediaArea = document.getElementById("remote-media-area");
const roomNameInput = document.getElementById("room-name");
const myId = document.getElementById("my-id");
const joinButton = document.getElementById("join");
const leaveButton = document.getElementById("leave");
const shareButton = document.getElementById("share");
let ifAlreadyIn = false;
let ifAlreadyShare = false;

(async () => {
  let room,me,context,subscribeAndAttach = null;

  const { audio,video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
  video.attach(localVideo);
  await localVideo.play();
  
  joinButton.onclick = async () => {
    context = await SkyWayContext.Create(token);
    context.onFatalError.add((e) => {
    console.error("Fatal error in context:", e);
      alert("Network error: Please refresh and rejoin the room.");
    });

    room = await SkyWayRoom.FindOrCreate(context, {
      type: "sfu",
      name: roomNameInput.value,
    });

    me = await room.join();
    myId.textContent = me.id;

    await me.publish(audio);
    await me.publish(video);

    subscribeAndAttach = async (publication) => {
      if (publication.publisher.id === me.id) return;
        ifAlreadyIn = true;

        try {
          const { stream, subscription } = await me.subscribe(publication.id);

          subscription.onConnectionStateChanged.add((state) => {
            if (state === "disconnected") {
              console.warn(`Stream ${publication.id} disconnected.`);
            } else if (state === "failed") {
              console.error(`Stream ${publication.id} failed.`);
            }else if (state === "connected") {
              console.warn(`Stream ${publication.id} connected.`);
            }
          });

          let newMedia;
          switch (stream.track.kind) {
            case "video":
              newMedia = document.createElement("video");
              newMedia.style.height = "200px";
              newMedia.style.width = "200px";
              newMedia.playsInline = true;
              newMedia.autoplay = true;
            break;
            case "audio":
              newMedia = document.createElement("audio");
              newMedia.controls = true;
              newMedia.autoplay = true;
            break;
            default:
            return;
          }
          newMedia.id = `media-${publication.id}`;
          stream.attach(newMedia);
          remoteMediaArea.appendChild(newMedia);
        } catch (err) {
          console.error("Error subscribing to stream:", err);
        }
    };

    room.publications.forEach(subscribeAndAttach);
    room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));
  };

  shareButton.onclick = async () => {

    const { video } = await SkyWayStreamFactory.createDisplayStreams({
      audio: true,
      video: {
        displaySurface: 'monitor',
      }
    });

    video.attach(localVideo);
    await localVideo.play();

    context = await SkyWayContext.Create(token);
      
    room = await SkyWayRoom.FindOrCreate(context, {
      type: "sfu",
      name: roomNameInput.value,
    });

    me = await room.join();
    myId.textContent = me.id;
    await me.publish(video);

  };

  leaveButton.onclick = async () => {

    room.onStreamUnpublished.add((e) => {
      document.getElementById(`subscribe-button-${e.publication.id}`)?.remove();
      document.getElementById(`media-${e.publication.id}`)?.remove();
    });

    await me.leave();
    await room.dispose();
    await context.dispose();

    myId.textContent = "";
    buttonArea.replaceChildren();
    remoteMediaArea.replaceChildren();

  };

  screenTrack.addEventListener('ended', () => {
    console.log('User has stopped screen sharing.');
  });

})();