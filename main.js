const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory, uuidV4 } = skyway_room;
const APP_ID = "326bee5e-43dc-42e0-bf04-2e9d8be322e2";
const SECRET_KEY = "7vU4AcgjILced6SK3ATwKzekeWLiSYpJwmb6AvNPVxw=";

console.log(uuidV4());

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
      }
    }],
    turn: {
      enabled: true
    }
  }
}).encode(SECRET_KEY);

(async () => {
  const localVideo = document.getElementById("local-video");
  const buttonArea = document.getElementById("button-area");
  const remoteMediaArea = document.getElementById("remote-media-area");
  const roomNameInput = document.getElementById("room-name");

  const myId = document.getElementById("my-id");
  const joinButton = document.getElementById("join");
  const leaveButton = document.getElementById("leave");

  let room,me;

  joinButton.onclick = async () => {
    if (roomNameInput.value === "") return;

    const context = await SkyWayContext.Create(token);

    room = await SkyWayRoom.FindOrCreate(context, {
      type: "sfu",
      name: roomNameInput.value,
    });

    me = await room.join();

    myId.textContent = me.id;

    const isViewer = room.members.length > 2; // If more than 2 members, the joiner is a viewer

    if (!isViewer) {
      const { audio, video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
      await me.publish(audio);
      await me.publish(video);
      video.attach(localVideo);
      await localVideo.play();

      // End the call for everyone when the publisher leaves
      me.onLeft.add(async () => {
        await room.dispose();
        myId.textContent = "";
        buttonArea.replaceChildren();
        remoteMediaArea.replaceChildren();
        alert("The lesson has ended.");
      });
    } else {
      console.log("You are a viewer.");
    }

    const subscribeAndAttach = async (publication) => {
      if (publication.publisher.id === me.id) return;

      const { stream } = await me.subscribe(publication.id);

      let newMedia;
      switch (stream.track.kind) {
        case "video":
          newMedia = document.createElement("video");
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

      // Mute viewer's audio to ensure they can't be heard
      if (isViewer && stream.track.kind === "audio") {
        newMedia.muted = true;
      }
    };

    // Display all existing publications in the room
    for (const publication of room.publications) {
      await subscribeAndAttach(publication);
    }

    // Automatically display new streams when published
    room.onStreamPublished.add(async (e) => {
      await subscribeAndAttach(e.publication);
    });

    // Automatically hide streams when unpublished
    room.onStreamUnpublished.add((e) => {
      document.getElementById(`media-${e.publication.id}`)?.remove();
    });
  };

  leaveButton.onclick = async () => {
    await me.leave();
    await room.dispose();

    myId.textContent = "";
    buttonArea.replaceChildren();
    remoteMediaArea.replaceChildren();

    console.log(room);

    // Remove event listeners for stream unpublishing
    room.onStreamUnpublished.add((e) => {
      document.getElementById(`subscribe-button-${e.publication.id}`)?.remove();
      document.getElementById(`media-${e.publication.id}`)?.remove();
    });

    // Notify viewers that the lesson has ended
    alert("The lesson has ended.");
  };
})();