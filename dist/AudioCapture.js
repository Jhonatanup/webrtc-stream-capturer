export class AudioCapture {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.mediaStreamAudioDestinationNode = new MediaStreamAudioDestinationNode(this.audioContext);
  }

  /**
   * Captures the audio stream from a media element and returns a MediaStreamAudioDestinationNode.
   * @param {HTMLMediaElement} mediaElement - The media element (video or audio) to capture audio from.
   * @returns {MediaStreamAudioDestinationNode} - The MediaStreamAudioDestinationNode with the captured audio.
   */
  captureAudio(mediaElement) {
    if (!(mediaElement instanceof HTMLVideoElement || mediaElement instanceof HTMLAudioElement)) {
      throw new Error('The provided element is not a valid HTMLVideoElement or HTMLAudioElement');
    }
    const mediaStream = mediaElement.srcObject;
    if (!mediaStream) {
      throw new Error('No media stream found on the provided media element');
    }
    const mediaStreamAudioSourceNode = new MediaStreamAudioSourceNode(this.audioContext, {
      mediaStream
    });
    mediaStreamAudioSourceNode.connect(this.mediaStreamAudioDestinationNode);
    mediaElement.onloadedmetadata = () => {
      const newMediaStream = mediaElement.srcObject;
      const newMediaStreamAudioSourceNode = new MediaStreamAudioSourceNode(this.audioContext, {
        mediaStream: newMediaStream
      });
      newMediaStreamAudioSourceNode.connect(this.mediaStreamAudioDestinationNode);
    };
    return this.mediaStreamAudioDestinationNode;
  }
}