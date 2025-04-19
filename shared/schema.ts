import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ContentCraft AI related schemas
export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  hcp_text: text("hcp_text").notNull(),
  document_path: text("document_path"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertUploadSchema = createInsertSchema(uploads).pick({
  user_id: true,
  hcp_text: true,
  document_path: true,
});

export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = typeof uploads.$inferSelect;

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  upload_id: integer("upload_id").notNull(),
  prompt: text("prompt").notNull(),
  target_hcp: text("target_hcp").notNull(),
  video_url: text("video_url").notNull(),
  thumbnail_url: text("thumbnail_url"),
  duration: integer("duration").notNull(),
  compliance_status: text("compliance_status").notNull(),
  meditag_segment: text("meditag_segment"),
  generated_script: text("generated_script"),
  compliance_details: jsonb("compliance_details"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertVideoSchema = createInsertSchema(videos).pick({
  title: true,
  upload_id: true,
  prompt: true,
  target_hcp: true,
  video_url: true,
  thumbnail_url: true,
  duration: true,
  compliance_status: true,
  meditag_segment: true,
  generated_script: true,
  compliance_details: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Form validation schemas
export const uploadFormSchema = z.object({
  hcp_text: z.string().min(1, "HCP information is required"),
  document: z.any().optional(), // For file upload (handled differently in frontend)
  document_path: z.string().optional(), // For storing the file path
});

export const promptFormSchema = z.object({
  upload_id: z.number().optional(), // Made optional to support prompt-only generation
  prompt: z.string().min(1, "Prompt is required").max(500, "Prompt should be less than 500 characters"),
  hcp_text: z.string().optional(), // Added for direct prompt generation
});

export type UploadFormData = z.infer<typeof uploadFormSchema>;
export type PromptFormData = z.infer<typeof promptFormSchema>;
