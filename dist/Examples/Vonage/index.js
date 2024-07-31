console.log("vonageExample.js");
import config from "./config.js";

const azureSpeechKey = config.azureSpeechKey;
const azureRegion = config.azureRegion;
var appId = config.appId;
var sessionId = config.sessionId;
var token = config.token;
let messages = [];
let recognizerUser;
let recognizerPeer;

import {
  AudioConfig,
  SpeechConfig,
  SpeechRecognizer,
  ResultReason,
  CancellationReason,
} from "microsoft-cognitiveservices-speech-sdk";
import { AudioCapture } from "../../AudioCapture.js";
import { isDoctorClient, updateChat } from "./utils";

function handleError(error) {
  if (error) {
    console.error(error);
  }
}

function initializeSession() {
  const session = OT.initSession(appId, sessionId);

  // Capture audio from the user
  function captureAudioFromUser() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        startContinuousRecognition(stream, "doctor");
      })
      .catch(handleError);
  }

  // Subscribe to a newly created stream
  session.on("streamCreated", (event) => {
    const subscriberOptions = {
      insertMode: "append",
      width: "100%",
      height: "100%",
    };
    const subscriber = session.subscribe(
      event.stream,
      "subscriber",
      subscriberOptions,
      (error) => {
        console.log({
          subscriber,
          element: subscriber.element,
          src: subscriber.element.src,
        });
        if (error) {
          console.error("Error subscribing:", error);
        } else {
          if (isDoctorClient()) captureAudio(subscriber);
        }
      }
    );
  });

  session.on("sessionDisconnected", (event) => {
    console.log("You were disconnected from the session.", event.reason);
  });

  function captureAudio(subscriber) {
    const audioCapture = new AudioCapture();
    const peerElement = subscriber.element;
    const peerVideoElement = peerElement.querySelector('video');
    const peerStream = audioCapture.captureAudio(peerVideoElement).stream;
    startContinuousRecognition(peerStream, "paciente");
  }

  function startContinuousRecognition(stream, speaker) {
    const audioConfig = AudioConfig.fromStreamInput(stream);
    const speechConfig = SpeechConfig.fromSubscription(
      azureSpeechKey,
      azureRegion
    );

    speechConfig.speechRecognitionLanguage = "pt-BR";

    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (s, e) => {
      console.log(`RECOGNIZING: Text=${e.result.text}`);
    };

    recognizer.recognized = (s, e) => {
      if (e.result.reason === ResultReason.RecognizedSpeech) {
        console.log(`RECOGNIZED: Text=${e.result.text}`);
        messages.push({ speaker, phrase: e.result.text });
        updateChat(messages);
        console.log({ messages });
        // alert(`RECOGNIZED: Text=${e.result.text}`);
      } else if (e.result.reason === ResultReason.NoMatch) {
        console.log({ e, s });
        console.log("NOMATCH: Speech could not be recognized.");
      }
    };

    recognizer.canceled = (s, e) => {
      console.error(`CANCELED: Reason=${e.reason}`);
      if (e.reason === CancellationReason.Error) {
        console.error(`CANCELED: ErrorCode=${e.errorCode}`);
        console.error(`CANCELED: ErrorDetails=${e.errorDetails}`);
      }
      recognizer.stopContinuousRecognitionAsync();
    };

    recognizer.sessionStopped = (s, e) => {
      console.log("Session stopped.");
      recognizer.stopContinuousRecognitionAsync();
    };

    recognizer.startContinuousRecognitionAsync();

    if (speaker === "doctor") {
      recognizerUser = recognizer;
    } else if (speaker === "paciente") {
      recognizerPeer = recognizer;
    }
  }

  function stopContinuousRecognition() {
    console.log("STOPPED");
    if (recognizerPeer) recognizerPeer.stopContinuousRecognitionAsync();
    if (recognizerUser) recognizerUser.stopContinuousRecognitionAsync();
  }

  // initialize the publisher
  const publisherOptions = {
    insertMode: "append",
    width: "100%",
    height: "100%",
  };
  const publisher = OT.initPublisher(
    "publisher",
    publisherOptions,
    handleError
  );

  // Connect to the session
  session.connect(token, (error) => {
    if (error) {
      handleError(error);
    } else {
      // If the connection is successful, publish the publisher to the session
      session.publish(publisher, handleError);
      if(isDoctorClient()) captureAudioFromUser();
    }
  });
}

initializeSession();
