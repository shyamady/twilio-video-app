import React, { Component } from "react";
import twilio from "twilio";
import { connect, createLocalTracks } from "twilio-video";
import accessToken from "./config/twilio";
import uuid from "uuid";
import "./App.css";

class App extends Component {
  constructor(props, ...args) {
    super(props, ...args);

    if (props.forwardedRef) {
      props.forwardedRef.current = {
        onLeave: this.onLeave
      };
    }
    this.state = {
      activeRoom: null,
      previewTracks: null,
      screenTracks: null,
      turnMic: true,
      turnCam: true,
      turnLocalCam: true,
      turnScreen: false,
      zoomLocal: false,
      zoomRemote: false,
      user: null,
      left: null
    };
  }

  // Attach the Track to the DOM.
  attachTrack(track, container) {
    container.appendChild(track.attach());
  }

  // Attach array of Tracks to the DOM.
  attachTracks(tracks, container) {
    let self = this;
    tracks.forEach(function(track) {
      self.attachTrack(track, container);
    });
  }

  // Detach given track from the DOM
  detachTrack(track) {
    track.detach().forEach(function(element) {
      element.remove();
    });
  }

  // A new RemoteTrack was published to the Room.
  trackPublished(publication, container) {
    let self = this;
    if (publication.isSubscribed) {
      self.attachTrack(publication.track, container);
    }
    publication.on("subscribed", function(track) {
      console.log("Subscribed to " + publication.kind + " track");
      self.attachTrack(track, container);
    });
    publication.on("unsubscribed", this.detachTrack);
  }

  // A RemoteTrack was unpublished from the Room.
  trackUnpublished(publication) {
    console.log(publication.kind + " track was unpublished.");
  }

  // A new RemoteParticipant joined the Room
  participantConnected(participant, container) {
    let self = this;
    participant.tracks.forEach(function(publication) {
      self.trackPublished(publication, container);
    });
    participant.on("trackPublished", function(publication) {
      self.trackPublished(publication, container);
    });
    participant.on("trackUnpublished", this.trackUnpublished);
  }

  // Detach the Participant's Tracks from the DOM.
  detachParticipantTracks(participant) {
    const tracks = this.fetchTracks(participant);
    tracks.forEach(this.detachTrack);
  }

  fetchTracks(participant) {
    return Array.from(participant.tracks.values())
      .filter(function(publication) {
        return publication.track;
      })
      .map(function(publication) {
        return publication.track;
      });
  }

  componentDidMount() {
    const id = "6tnQ74hU58";
    let self = this;
    const { previewTracks } = this.state;

    // Preview LocalParticipant's Tracks.
    const localTracksPromise = previewTracks
      ? Promise.resolve(previewTracks)
      : createLocalTracks();
    localTracksPromise.then(
      function(tracks) {
        self.setState({ previewTracks: tracks });
        const previewContainer = document.getElementById("local-media");
        if (!previewContainer.querySelector("video")) {
          self.attachTracks(tracks, previewContainer);
        }
      },
      function(error) {
        console.error("Unable to access local media", error);
        console.log("Unable to access Camera and Microphone");
      }
    );
    this.onJoin(id);
  }

  onLeave = () => {
    const { activeRoom } = this.state;
    if (activeRoom) {
      activeRoom.disconnect();
    }
  };

  onJoin = id => {
    const { previewTracks } = this.state;

    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    // Grant access to Video
    const grant = new VideoGrant();
    grant.room = id;
    accessToken.addGrant(grant);

    // Set the Identity of this token
    accessToken.identity = uuid.v1();
    const twilioToken = accessToken.toJwt();
    const connectOptions = {
      name: id
    };
    if (previewTracks) {
      connectOptions.tracks = previewTracks;
    }

    connect(twilioToken, connectOptions).then(
      room => this.roomJoined(room),
      error => {
        console.error(`Unable to connect to Room: ${error.message}`);
      }
    );
  };

  // Successfully connected!
  roomJoined(room) {
    let self = this;
    this.setState({ activeRoom: room });

    // Attach LocalParticipant's Tracks, if not already attached.
    var previewContainer = document.getElementById("local-media");
    if (!previewContainer.querySelector("video")) {
      this.attachTracks(
        this.fetchTracks(room.localParticipant),
        previewContainer
      );
    }

    // Attach the Tracks of the Room's Participants.
    var remoteMediaContainer = document.getElementById("remote-media");
    room.participants.forEach(function(participant) {
      console.log("Already in Room: '" + participant.identity + "'");
      self.participantConnected(participant, remoteMediaContainer);
    });

    // When a Participant joins the Room, log the event.
    room.on("participantConnected", function(participant) {
      console.log("Joining: '" + participant.identity + "'");
      self.participantConnected(participant, remoteMediaContainer);
    });

    // When a Participant leaves the Room, detach its Tracks.
    room.on("participantDisconnected", function(participant) {
      console.log(
        "RemoteParticipant '" + participant.identity + "' left the room"
      );
      self.detachParticipantTracks(participant);
    });

    // Once the LocalParticipant leaves the room, detach the Tracks
    // of all Participants, including that of the LocalParticipant.
    room.on("disconnected", function() {
      const { previewTracks } = self.state;
      console.log("Left");
      if (previewTracks) {
        previewTracks.forEach(function(track) {
          track.stop();
        });
        self.setState({ previewTracks: null });
      }
      self.detachParticipantTracks(room.localParticipant);
      room.participants.forEach(self.detachParticipantTracks);
      self.setState({ activeRoom: null });
    });
  }

  render() {
    return (
      <div className="App">
        <div className="window">
          <div
            id="local-media"
            className="trackPreview"
            style={{ width: 500, height: 500 }}
          ></div>
        </div>
        <div className="window">
          <div
            id="remote-media"
            className="trackPreview"
            style={{ width: 500, height: 500 }}
          ></div>
        </div>
        <button className="callItem" onClick={this.onLeave}>
          <p>Leave</p>
        </button>
      </div>
    );
  }
}

export default App;
