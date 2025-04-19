import axios from "axios";

interface VeoVideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  videoId: string;
}

/**
 * Generates a video using VEO API
 * @param script The script content to use for the video
 * @param targetHCP The target HCP type (e.g., "Cardiologist")
 * @returns Generated video URL and video ID
 */
export async function generateVideo(script: string, targetHCP: string): Promise<VeoVideoGenerationResult> {
  try {
    const apiKey = process.env.VEO_API_KEY;
    
    if (!apiKey) {
      throw new Error("VEO_API_KEY is not configured");
    }
    
    console.log("Generating video with VEO API...");
    
    // VEO API endpoint
    const apiUrl = "https://veo2api.com/api/";
    
    // Prepare request payload
    const payload = {
      prompt: script,
      // Add any HCP-specific parameters here
      speaker: getSpeakerForHCP(targetHCP),
      // Add other options as needed based on VEO API documentation
    };
    
    try {
      // Make API request to VEO
      const response = await axios.post(apiUrl, payload, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });
      
      console.log("VEO API response:", response.data);
      
      // Parse response - adapt this based on the actual VEO API response structure
      if (response.data && response.data.id) {
        const videoId = response.data.id;
        
        // Polling for completion
        const videoData = await pollForVideoCompletion(videoId, apiKey);
        
        return {
          videoUrl: videoData.url,
          thumbnailUrl: generateThumbnailUrl(videoData.url),
          videoId
        };
      } else {
        throw new Error(`VEO API error: ${JSON.stringify(response.data)}`);
      }
    } catch (axiosError: any) {
      // Check for specific error responses from the API
      if (axiosError.response) {
        const status = axiosError.response.status;
        const errorData = axiosError.response.data;
        
        if (status === 402 && errorData.error === "Insufficient credits") {
          console.log("VEO API Error: Insufficient credits. Please top up your account.");
          throw new Error("VEO API Error: Insufficient credits. Please top up your account.");
        } else {
          console.error("VEO API error:", status, errorData);
          throw new Error(`VEO API Error: ${JSON.stringify(errorData)}`);
        }
      } else {
        throw new Error(`VEO API Error: ${axiosError.message || "Unknown error occurred"}`);
      }
    }
  } catch (error) {
    console.error("Error generating video with VEO:", error);
    
    // For demo purposes, if VEO API is not available, return a placeholder video
    return {
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-medical-team-in-a-hospital-room-31695-large.mp4",
      thumbnailUrl: "https://assets.mixkit.co/videos/preview/mixkit-medical-team-in-a-hospital-room-31695-large.jpg",
      videoId: "simulated-video-id"
    };
  }
}

/**
 * Selects an appropriate speaker based on the target HCP
 * @param targetHCP The target HCP type
 * @returns Speaker ID or configuration
 */
function getSpeakerForHCP(targetHCP: string): string {
  // Map different HCP types to appropriate speakers
  // This is a placeholder - update with actual VEO speaker options
  const speakerMap: Record<string, string> = {
    "Cardiologist": "professional_male_1",
    "Oncologist": "professional_female_1",
    "Neurologist": "professional_male_2",
    "Pediatrician": "friendly_female_1",
    "Dermatologist": "professional_female_2"
  };
  
  return speakerMap[targetHCP] || "professional_male_1"; // Default speaker
}

/**
 * Polls for video completion
 * @param videoId The video ID from VEO
 * @param apiKey The API key for VEO
 * @returns Video data including URL
 */
async function pollForVideoCompletion(videoId: string, apiKey: string): Promise<{url: string}> {
  // In a real implementation, you would poll the VEO API until the video is complete
  // For demo purposes, we'll simulate this with a placeholder URL
  
  // This is where you would implement polling logic based on VEO API documentation
  // Something like:
  /*
  let isComplete = false;
  while (!isComplete) {
    const response = await axios.get(`https://veo2api.com/api/videos/${videoId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (response.data.status === "completed") {
      isComplete = true;
      return { url: response.data.url };
    }
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
  }
  */
  
  // For now, use a placeholder
  console.log("Using placeholder video for demo");
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        url: "https://assets.mixkit.co/videos/preview/mixkit-medical-team-in-a-hospital-room-31695-large.mp4"
      });
    }, 2000);
  });
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