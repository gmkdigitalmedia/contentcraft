import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execPromise = promisify(exec);

interface HCPData {
  specialty?: string;
  prescription_rate?: number;
  practice_size?: string;
  years_experience?: number;
}

interface MediTagResult {
  segment: string;
  confidence: number;
  characteristics: Record<string, any>;
}

/**
 * Analyzes HCP data to determine the MediTag segment
 * @param hcpText The HCP information text
 * @returns MediTag segment information
 */
export async function analyzeHCP(hcpText: string): Promise<MediTagResult> {
  try {
    // Parse the HCP data from text
    const hcpData = parseHCPData(hcpText);
    
    // Use rule-based segmentation (simulating MediTag Engine)
    return segmentHCP(hcpData);
  } catch (error) {
    console.error("Error in MediTag Engine:", error);
    throw new Error("Failed to analyze HCP data. Please try again later.");
  }
}

/**
 * Parses HCP data from text input
 * @param hcpText The HCP information text
 * @returns Structured HCP data
 */
function parseHCPData(hcpText: string): HCPData {
  const hcpData: HCPData = {};
  
  // Extract specialty
  const specialtyMatch = hcpText.match(/specialty:\s*([^,\n]+)/i);
  if (specialtyMatch) {
    hcpData.specialty = specialtyMatch[1].trim();
  } else if (hcpText.includes("Cardiologist")) {
    hcpData.specialty = "Cardiology";
  } else if (hcpText.includes("Oncologist")) {
    hcpData.specialty = "Oncology";
  } else if (hcpText.includes("Neurologist")) {
    hcpData.specialty = "Neurology";
  }
  
  // Extract prescription rate
  const prescriptionRateMatch = hcpText.match(/prescription_rate:\s*([\d.]+)/i);
  if (prescriptionRateMatch) {
    hcpData.prescription_rate = parseFloat(prescriptionRateMatch[1]);
  }
  
  // Extract practice size
  const practiceSizeMatch = hcpText.match(/practice_size:\s*([^,\n]+)/i);
  if (practiceSizeMatch) {
    hcpData.practice_size = practiceSizeMatch[1].trim();
  }
  
  // Extract years of experience
  const yearsExperienceMatch = hcpText.match(/years_experience:\s*(\d+)/i);
  if (yearsExperienceMatch) {
    hcpData.years_experience = parseInt(yearsExperienceMatch[1]);
  }
  
  return hcpData;
}

/**
 * Segments HCP based on parsed data
 * @param hcpData Structured HCP data
 * @returns MediTag segment information
 */
function segmentHCP(hcpData: HCPData): MediTagResult {
  // Determine segment based on HCP characteristics
  let segment = "General";
  let confidence = 0.7;
  
  if (hcpData.prescription_rate !== undefined) {
    if (hcpData.prescription_rate > 0.7) {
      // High prescription rate indicates an Early Adopter
      segment = "Early Adopter";
      confidence = 0.85;
    } else if (hcpData.prescription_rate > 0.4) {
      // Medium prescription rate and presence of years_experience indicates Evidence Driven
      if (hcpData.years_experience !== undefined && hcpData.years_experience > 10) {
        segment = "Evidence Driven";
        confidence = 0.9;
      } else {
        segment = "Mainstream";
        confidence = 0.75;
      }
    } else {
      // Low prescription rate indicates Conservative
      segment = "Conservative";
      confidence = 0.8;
    }
  } else if (hcpData.years_experience !== undefined) {
    // If we only have years of experience data
    if (hcpData.years_experience > 15) {
      segment = "Evidence Driven";
      confidence = 0.7;
    } else if (hcpData.years_experience < 5) {
      segment = "Early Adopter";
      confidence = 0.6;
    }
  }
  
  // Add specialty-specific adjustments
  if (hcpData.specialty === "Oncology") {
    // Oncologists tend to be more evidence-driven
    if (segment !== "Evidence Driven") {
      confidence -= 0.1;
    } else {
      confidence += 0.05;
    }
  } else if (hcpData.specialty === "Cardiology") {
    // Cardiologists with large practices tend to be mainstream
    if (hcpData.practice_size === "large" && segment !== "Mainstream") {
      confidence -= 0.1;
    }
  }
  
  return {
    segment,
    confidence,
    characteristics: {
      ...hcpData,
      segmentReason: getSegmentReason(segment, hcpData)
    }
  };
}

/**
 * Gets the reason for the segment assignment
 * @param segment The assigned segment
 * @param hcpData The HCP data
 * @returns Reason text
 */
function getSegmentReason(segment: string, hcpData: HCPData): string {
  switch (segment) {
    case "Early Adopter":
      return "High prescription rate and/or recent entry to practice";
    case "Evidence Driven":
      return "Significant experience and moderate prescription patterns";
    case "Mainstream":
      return "Average prescription rate with balanced approach";
    case "Conservative":
      return "Lower prescription rate, likely preferring established treatments";
    default:
      return "Insufficient data for detailed segmentation";
  }
}
