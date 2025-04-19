import { Request, Response } from "express";
import * as videoService from "../services/videoService";
import { promptFormSchema } from "@shared/schema";
import path from "path";

/**
 * Handles HCP information uploads
 */
export const uploadContent = async (req: Request, res: Response) => {
  try {
    const { hcp_text, document_path } = req.body;
    
    if (!hcp_text) {
      return res.status(400).json({ message: "HCP information is required" });
    }
    
    // Create record in storage
    const upload = await videoService.createUpload({
      user_id: req.body.user_id || "anonymous", // In a real app, you'd get this from authentication
      hcp_text,
      document_path: document_path || null
    });
    
    res.status(201).json({
      id: upload.id,
      message: "HCP information processed successfully"
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process HCP information";
    res.status(500).json({ message: errorMessage });
  }
};

/**
 * Handles video generation based on upload and prompt
 */
export const generateVideo = async (req: Request, res: Response) => {
  try {
    // For prompt-only generation, we'll accept a different schema
    // The upload_id can be optional, but we need a prompt and optionally hcp_text
    const { upload_id, prompt, hcp_text } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        message: "Prompt is required for video generation"
      });
    }
    
    // Generate video with or without upload_id
    const video = await videoService.createVideo(
      upload_id ? parseInt(upload_id) : null, 
      prompt,
      hcp_text
    );
    
    res.status(201).json({
      id: video.id,
      title: video.title,
      status: video.compliance_status,
      message: "Video generated successfully"
    });
  } catch (error: unknown) {
    console.error("Video generation error:", error);
    
    // Check if this is an API error (VEO API)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isApiError = errorMessage && (
      errorMessage.includes("VEO API error") || 
      errorMessage.includes("Insufficient credits")
    );
    
    // Send appropriate status code and message
    if (isApiError) {
      // API error but we should let the client know we're still creating a video with placeholder
      res.status(201).json({
        message: errorMessage,
        api_error: true,
        id: null
      });
    } else {
      // Other server error
      res.status(500).json({ 
        message: errorMessage || "Failed to generate video"
      });
    }
  }
};

/**
 * Gets a specific video by ID
 */
export const getVideo = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }
    
    const video = await videoService.getVideo(id);
    res.json(video);
  } catch (error: unknown) {
    console.error("Get video error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("not found")) {
      return res.status(404).json({ message: errorMessage });
    }
    
    res.status(500).json({ message: errorMessage || "Failed to retrieve video" });
  }
};

/**
 * Lists all videos
 */
export const listVideos = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const videos = await videoService.listVideos(limit);
    res.json(videos);
  } catch (error: unknown) {
    console.error("List videos error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: errorMessage || "Failed to list videos" });
  }
};

/**
 * Gets compliance statistics
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await videoService.getComplianceStats();
    res.json(stats);
  } catch (error: unknown) {
    console.error("Get stats error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: errorMessage || "Failed to retrieve statistics" });
  }
};

/**
 * Deletes a video by ID
 */
export const deleteVideoById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }
    
    const success = await videoService.deleteVideo(id);
    
    if (success) {
      res.status(200).json({ message: "Video deleted successfully" });
    } else {
      res.status(404).json({ message: "Video not found" });
    }
  } catch (error: unknown) {
    console.error("Delete video error:", error);
    res.status(500).json({ message: "Failed to delete video" });
  }
};

export const videoController = {
  uploadContent,
  generateVideo,
  getVideo,
  listVideos,
  getStats,
  deleteVideoById
};
