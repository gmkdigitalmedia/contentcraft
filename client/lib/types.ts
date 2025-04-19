export interface HCPData {
  specialty?: string;
  prescription_rate?: number;
  practice_size?: string;
  years_experience?: number;
}

export interface UploadData {
  id: number;
  user_id: string;
  hcp_text: string;
  created_at: string;
}

export interface VideoData {
  id: number;
  title: string;
  upload_id: number;
  prompt: string;
  target_hcp: string;
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  compliance_status: 'Passed' | 'Review' | 'Failed';
  meditag_segment?: string;
  generated_script?: string;
  compliance_details?: {
    passed: boolean;
    score: number;
    issues?: string[];
    recommendations?: string[];
  };
  created_at: string;
}

export interface ComplianceStats {
  compliance_rate: number;
  hcp_response_rate: number;
  turnaround_time: string;
  videos_generated: number;
  videos_passed: number;
  avg_duration: number;
  adoption_gains: string;
}

export interface FormData {
  hcp_text: string;
  prompt: string;
}

export type UploadStep = 1 | 2 | 3;

export interface ProcessingStatus {
  stage: 'analysis' | 'script' | 'generating' | 'compliance';
  percentage: number;
  message: string;
}
