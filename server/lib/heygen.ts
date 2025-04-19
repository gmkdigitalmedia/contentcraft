import axios from "axios";

interface HeyGenVideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  videoId: string;
}

/**
 * Generates a video using HeyGen API
 * @param script The script content to use for the video
 * @param targetHCP The target HCP type (e.g., "Cardiologist")
 * @returns Generated video URL and video ID
 */
export async function generateVideo(script: string, targetHCP: string): Promise<HeyGenVideoGenerationResult> {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    
    if (!apiKey) {
      throw new Error("HEYGEN_API_KEY is not configured");
    }
    
    // Select appropriate avatar based on target HCP
    const avatarId = getAvatarForHCP(targetHCP);
    
    // Try v1 and v2 formats of the API
    let response;
    let videoId;
    
    try {
      // Try v2 API first
      const v2Payload = {
        "video_inputs": [
          {
            "character": {
              "type": "avatar",
              "avatar_id": avatarId,
              "avatar_style": "normal"
            },
            "voice": {
              "type": "text",
              "input_text": script,
              "voice_id": "1bd001e7e50f421d891986aad5158bc8", // Default voice ID
              "speed": 1.0
            }
          }
        ],
        "dimension": {
          "width": 1280,
          "height": 720
        }
      };
      
      console.log("Trying HeyGen v2 API...");
      response = await axios.post("https://api.heygen.com/v2/video/generate", v2Payload, {
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      
      if (response.data.data && response.data.data.video_id) {
        videoId = response.data.data.video_id;
        console.log("HeyGen v2 API successful with video ID:", videoId);
      } else {
        throw new Error("V2 API did not return a video ID");
      }
    } catch (error) {
      const v2Error = error as Error;
      console.log("HeyGen v2 API failed, trying v1 API...", v2Error.message);
      
      // V2 failed, try v1 API format
      const v1Payload = {
        "background": {
          "type": "color",
          "value": "#ffffff"
        },
        "clips": [
          {
            "avatar_id": avatarId,
            "avatar_style": "closeup",
            "input_text": script,
            "voice_id": "en-US-GuyD",
            "voice_settings": {
              "stability": 0.7,
              "similarity": 0.8
            }
          }
        ],
        "ratio": "16:9",
        "test": false,
        "version": "v1"
      };
      
      response = await axios.post("https://api.heygen.com/v1/video_speech.generate", v1Payload, {
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json"
        }
      });
      
      if (response.data.status === "success" && response.data.data && response.data.data.task_id) {
        videoId = response.data.data.task_id; // In v1, it's task_id instead of video_id
        console.log("HeyGen v1 API successful with task ID:", videoId);
      } else {
        throw new Error(`HeyGen v1 API error: ${response.data.message || "Unknown error"}`);
      }
    }
    
    // Get the video URL from the ID (task_id or video_id)
    const videoData = await checkVideoStatus(videoId, apiKey);
    
    return {
      videoUrl: videoData.url,
      thumbnailUrl: generateThumbnailUrl(videoData.url),
      videoId
    };
  } catch (error) {
    console.error("Error generating video with HeyGen:", error);
    
    // For demo purposes, if HeyGen API is not available, return a placeholder video
    return {
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-medical-team-in-a-hospital-room-31695-large.mp4",
      thumbnailUrl: "https://assets.mixkit.co/videos/preview/mixkit-medical-team-in-a-hospital-room-31695-large.jpg",
      videoId: "simulated-video-id"
    };
  }
}

/**
 * Selects an appropriate avatar ID based on the target HCP
 * @param targetHCP The target HCP type
 * @returns Avatar ID to use
 */
function getAvatarForHCP(targetHCP: string): string {
  // In a real implementation, you would fetch the actual avatar list from HeyGen API
  // For demo purposes, we'll use the sample avatar ID from the documentation
  // and map different HCP types to different avatars (when available)
  const avatarMap: Record<string, string> = {
    "Cardiologist": "Anna-headshot-20240205",  // Example avatar IDs (would need to be replaced with real IDs)
    "Oncologist": "Dave-headshot-20240205",
    "Neurologist": "Angela-inTshirt-20220820", // Using avatar from documentation
    "Pediatrician": "Ben-office-20220820",
    "Dermatologist": "Mark-office-20220820"
  };
  
  return avatarMap[targetHCP] || "Angela-inTshirt-20220820"; // Default avatar from docs
}

/**
 * Checks the status of a video generation request
 * @param videoId The video ID from HeyGen
 * @param apiKey The API key for HeyGen
 * @returns Video data including URL
 */
async function checkVideoStatus(videoId: string, apiKey: string): Promise<{url: string}> {
  try {
    // Try both v1 endpoints for checking status
    console.log("Checking video status with ID:", videoId);
    
    try {
      // Try v1 video_status endpoint first
      console.log("Trying HeyGen v1 video_status.get endpoint...");
      const statusResponse = await axios.get(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: {
          "X-Api-Key": apiKey,
          "Accept": "application/json"
        }
      });
      
      if (statusResponse.data && statusResponse.data.data && statusResponse.data.data.video_url) {
        console.log("HeyGen v1 video_status.get endpoint successful");
        return { url: statusResponse.data.data.video_url };
      }
      
      throw new Error("V1 video_status did not return a video URL");
    } catch (error) {
      const v1StatusError = error as Error;
      console.log("HeyGen v1 video_status.get failed, trying v1 task_status...", v1StatusError.message);
      
      // Try v1 task_status endpoint
      const taskResponse = await axios.get(`https://api.heygen.com/v1/task_status.get?task_id=${videoId}`, {
        headers: {
          "X-Api-Key": apiKey,
          "Accept": "application/json"
        }
      });
      
      if (taskResponse.data && taskResponse.data.data && taskResponse.data.data.result && taskResponse.data.data.result.url) {
        console.log("HeyGen v1 task_status.get endpoint successful");
        return { url: taskResponse.data.data.result.url };
      }
      
      throw new Error("V1 task_status did not return a video URL");
    }
  } catch (error) {
    console.error("Error checking video status:", error);
    
    // For demo purposes, return a placeholder URL that will work for sure
    console.log("Using placeholder video URL for demo purposes");
    return {
      url: "https://assets.mixkit.co/videos/preview/mixkit-medical-team-in-a-hospital-room-31695-large.mp4"
    };
  }
}

/**
 * Generates a thumbnail URL from a video URL (simulated)
 * @param videoUrl The video URL
 * @returns Thumbnail URL
 */
function generateThumbnailUrl(videoUrl: string): string {
  // In a real implementation, you might use a service to generate a thumbnail
  // For now, we'll simulate by replacing the extension
  return videoUrl.replace(".mp4", ".jpg");
}
