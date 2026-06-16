/**
 * Video Conferencing Integration Service
 * Uses Jitsi Meet (open-source, self-hosted friendly)
 */

export interface VideoConferenceSession {
  roomName: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  jwtToken?: string;
}

/**
 * Generate Jitsi Meet conference URL
 */
export const generateJitsiConferenceURL = (
  roomName: string,
  options?: {
    displayName?: string;
    email?: string;
    avatarUrl?: string;
    width?: number;
    height?: number;
  }
): string => {
  // Using public Jitsi instance - can be replaced with self-hosted
  const JITSI_SERVER = "https://meet.jit.si";
  const sanitizedRoom = roomName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");

  const url = new URL(`${JITSI_SERVER}/${sanitizedRoom}`);

  if (options?.displayName) {
    url.searchParams.set("displayName", options.displayName);
  }
  if (options?.email) {
    url.searchParams.set("email", options.email);
  }
  if (options?.avatarUrl) {
    url.searchParams.set("avatarUrl", options.avatarUrl);
  }

  // Add config parameters
  url.searchParams.set("config.startWithAudioMuted", "false");
  url.searchParams.set("config.startWithVideoMuted", "false");
  url.searchParams.set("config.disableAudioLevels", "false");
  url.searchParams.set("config.defaultLanguage", "en");

  return url.toString();
};

/**
 * Launch video conference in modal
 */
export const launchVideoConference = (session: VideoConferenceSession) => {
  const url = generateJitsiConferenceURL(session.roomName, {
    displayName: session.displayName,
    email: session.email,
    avatarUrl: session.avatarUrl,
  });

  // Open in new window
  window.open(url, "jitsi-conference", "width=1280,height=720");
};

/**
 * Generate room name from deal room ID and timestamp
 */
export const generateConferenceRoomName = (dealRoomId: string): string => {
  const timestamp = Date.now().toString(36);
  return `deal-room-${dealRoomId}-${timestamp}`;
};

/**
 * Get Jitsi embed code for iframe integration
 */
export const getJitsiEmbedCode = (roomName: string): string => {
  const JITSI_SERVER = "https://meet.jit.si";
  const sanitizedRoom = roomName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");

  return `
<iframe
  allow="camera; microphone; display-capture"
  src="${JITSI_SERVER}/${sanitizedRoom}?config.startWithAudioMuted=false&config.startWithVideoMuted=false"
  frameBorder="0"
  title="Jitsi Meet"
  style="width: 100%; height: 600px; border: 1px solid #e5e7eb; border-radius: 8px;"
/>
  `.trim();
};

/**
 * Configuration for self-hosted Jitsi
 */
export const JITSI_CONFIG = {
  // Replace with your self-hosted Jitsi URL if using custom instance
  // PUBLIC_URL: process.env.VITE_JITSI_URL || "https://meet.jit.si",
  PUBLIC_URL: "https://meet.jit.si",

  // JWT token for authentication (if using JWT auth)
  // PRIVATE_KEY: process.env.JITSI_PRIVATE_KEY,
  // APP_ID: process.env.JITSI_APP_ID,

  // Default configuration
  DEFAULT_CONFIG: {
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    disableAudioLevels: false,
    disableRemoteControl: false,
    enableInsecureRoomNameWarning: false,
    enableWelcomePage: true,
    prejoinPageEnabled: false,
    toolbarButtons: [
      "microphone",
      "camera",
      "desktop",
      "fullscreen",
      "fodeviceselection",
      "hangup",
      "profile",
      "settings",
      "raisehand",
      "videoquality",
      "filmstrip",
      "invite",
      "feedback",
      "stats",
      "shortcuts",
      "tileview",
      "download",
      "help",
      "mute-everyone",
    ],
  },
};

/**
 * Start recording configuration (for premium/self-hosted)
 */
export const startVideoRecording = async (
  roomName: string,
  recordingToken?: string
): Promise<{ status: string; recordingId?: string }> => {
  try {
    // This would require a backend endpoint with Jitsi recording API integration
    // For now, return a placeholder
    return {
      status: "recording_not_available",
    };
  } catch (error) {
    console.error("Error starting recording:", error);
    return { status: "error" };
  }
};

/**
 * Analytics tracking for video conference
 */
export interface VideoConferenceAnalytics {
  dealRoomId: string;
  roomName: string;
  startTime: string;
  endTime?: string;
  participants: string[];
  duration?: number;
}

export const trackVideoConference = async (
  analytics: VideoConferenceAnalytics
) => {
  try {
    // This would be implemented in your backend
    console.log("Video conference tracked:", analytics);
  } catch (error) {
    console.error("Error tracking video conference:", error);
  }
};
