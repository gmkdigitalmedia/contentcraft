# ContentCraft Integration: Step-by-Step Guide

This guide provides specific, copy-pastable instructions for integrating the ContentCraft feature into the main Xupra Replit project.

## Step 1: Add Database Schema (shared/schema.ts)

Add these models to your existing schema file:

```typescript
// Add these imports if not already present
import { pgTable, text, timestamp, integer, boolean, serial, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Add these new models for ContentCraft
export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  file_path: text("file_path"),
  file_type: text("file_type"),
  file_name: text("file_name"),
  upload_date: timestamp("upload_date").defaultNow(),
  user_id: text("user_id"),
  status: text("status").default("pending"),
  hcp_text: text("hcp_text"),
});

export const insertUploadSchema = createInsertSchema(uploads).pick({
  file_path: true,
  file_type: true,
  file_name: true,
  user_id: true,
  status: true,
  hcp_text: true,
});

export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = typeof uploads.$inferSelect;

// Compliance Status Enum
export const complianceStatusEnum = pgEnum('compliance_status', ['Passed', 'Review', 'Failed']);

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  upload_id: integer("upload_id").references(() => uploads.id),
  video_url: text("video_url").notNull(),
  thumbnail_url: text("thumbnail_url"),
  creation_date: timestamp("creation_date").defaultNow(),
  duration: integer("duration").default(0),
  size: integer("size").default(0),
  user_id: text("user_id"),
  script: text("script"),
  target_hcp: text("target_hcp"),
  compliance_status: complianceStatusEnum("compliance_status").default('Review'),
  compliance_score: integer("compliance_score").default(0),
  compliance_details: text("compliance_details"),
  video_api_id: text("video_api_id"),
});

export const insertVideoSchema = createInsertSchema(videos).pick({
  title: true,
  description: true,
  upload_id: true,
  video_url: true,
  thumbnail_url: true,
  duration: true,
  size: true,
  user_id: true,
  script: true,
  target_hcp: true,
  compliance_status: true,
  compliance_score: true,
  compliance_details: true,
  video_api_id: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Add form schemas
export const uploadFormSchema = z.object({
  hcp_text: z.string().min(1, "HCP information is required"),
  document: z.instanceof(File).optional(),
  prompt: z.string().min(1, "Prompt is required"),
});

export const promptFormSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  hcp_text: z.string().optional(),
});

export type UploadFormData = z.infer<typeof uploadFormSchema>;
export type PromptFormData = z.infer<typeof promptFormSchema>;
```

## Step 2: Add Types (client/src/lib/types.ts)

Create or update this file with these types:

```typescript
// Video Data Types
export interface VideoData {
  id: number;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  creation_date: string;
  duration: number;
  script?: string;
  target_hcp?: string;
  compliance_status: 'Passed' | 'Review' | 'Failed';
  compliance_score: number;
  compliance_details?: string;
}

// Compliance Stats Types
export interface ComplianceStatsType {
  compliance_rate: number;
  hcp_response_rate: number;
  total_videos: number;
  passed_videos: number;
  review_videos: number;
  failed_videos: number;
}
```

## Step 3: Update Storage Interface (server/storage.ts)

Add these methods to your storage interface:

```typescript
// Add to IStorage interface
interface IStorage {
  // ... existing methods
  
  // Upload methods
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUpload(id: number): Promise<Upload | undefined>;
  listUploads(userId?: string): Promise<Upload[]>;
  
  // Video methods
  createVideo(video: InsertVideo): Promise<Video>;
  getVideo(id: number): Promise<Video | undefined>;
  getVideoByUploadId(uploadId: number): Promise<Video | undefined>;
  listVideos(limit?: number): Promise<Video[]>;
  updateVideo(id: number, data: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<boolean>;
}
```

## Step 4: Add API Routes (server/routes.ts)

Add these routes to your Express application:

```typescript
// ContentCraft API routes
import { videoController } from "./controllers/videoController";
import multer from "multer";
import path from "path";

// Set up file upload middleware
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './server/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: function (req, file, cb) {
    const allowedFileTypes = /pdf|doc|docx|txt/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOC, DOCX and TXT files are allowed."));
    }
  }
});

// Add these routes to your Express app
app.post('/api/upload', upload.single('document'), videoController.uploadContent);
app.post('/api/generate-video', videoController.generateVideo);
app.get('/api/videos', videoController.listVideos);
app.get('/api/videos/:id', videoController.getVideo);
app.get('/api/videos/stats', videoController.getStats);
app.delete('/api/videos/:id', videoController.deleteVideoById);
```

## Step 5: Add Services and Controllers

Copy these directories from the XupraDash package:
- server/controllers/
- server/services/
- server/lib/

## Step 6: Add React Components

Copy these components from the XupraDash package:
- client/src/components/ContentCraftDashboard.tsx
- client/src/components/ComplianceStats.tsx
- client/src/components/RecentVideosTable.tsx
- client/src/components/UploadForm.tsx
- client/src/components/VideoPreview.tsx
- client/src/components/ApiCreditStatus.tsx

## Step 7: Add Dark Mode Theme

Update theme.json to include:

```json
{
  "primary": "#3b82f6",
  "variant": "professional",
  "appearance": "dark",
  "radius": 0.5
}
```

## Step 8: Add ContentCraft to Your App

Add the ContentCraft Dashboard to your main application:

```tsx
import ContentCraftDashboard from '@/components/ContentCraftDashboard';

// In your routes or pages
<Route path="/contentcraft">
  <ContentCraftDashboard />
</Route>
```

## Step 9: Set Environment Variables

Ensure these environment variables are set:
- OPENAI_API_KEY
- HEYGEN_API_KEY or VEO_API_KEY

## Need Help?

If you run into any issues during integration, feel free to ask for specific guidance.