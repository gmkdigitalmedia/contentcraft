import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

interface ScriptGenerationResult {
  script: string;
  duration: number;
  targetAudience: string;
}

import fs from 'fs';
import path from 'path';

/**
 * Generates a video script based on HCP data and user prompt
 * @param hcpText The HCP information text
 * @param prompt The user prompt for video generation
 * @param documentPath Optional path to an uploaded document for RAG-based generation
 * @returns Generated script, estimated duration, and target audience
 */
export async function generateScript(hcpText: string, prompt: string, documentPath?: string | null): Promise<ScriptGenerationResult> {
  try {
    let documentContent = "";
    
    // If document path is provided, read the document content
    if (documentPath) {
      try {
        // Convert relative path to absolute path
        const absolutePath = path.join(process.cwd(), documentPath.replace(/^\/uploads\//, 'server/uploads/'));
        
        // Check if file exists
        if (fs.existsSync(absolutePath)) {
          // Read the file content based on file type
          const fileExtension = path.extname(absolutePath).toLowerCase();
          
          if (fileExtension === '.txt') {
            documentContent = fs.readFileSync(absolutePath, 'utf8');
          } else if (fileExtension === '.pdf' || fileExtension === '.docx') {
            // For PDF and DOCX, we'd use a parser library in a production app
            // Here we'll just note that we received the document
            documentContent = `[Document received: ${path.basename(absolutePath)}]`;
          }
          
          console.log(`Document loaded: ${absolutePath}`);
        } else {
          console.log(`Document not found: ${absolutePath}`);
        }
      } catch (err) {
        console.error('Error reading document:', err);
      }
    }
    
    const messages = [
      {
        role: "system" as const,
        content: 
          `You are an AI specialized in creating PMDA-compliant video scripts for healthcare professionals (HCPs). 
          Create concise, evidence-based scripts that are 5-10 seconds in length when read aloud at a normal pace.
          Always include evidence-based language and ensure PMDA compliance. 
          Analyze the HCP information to personalize the content.
          ${documentContent ? "Use the provided document content as reference to enhance the script with specific details." : ""}
          Format your response as JSON with the following structure:
          {
            "script": "The complete script text",
            "duration": number (estimate in seconds),
            "targetAudience": "The specific HCP type (e.g., Cardiologist, Oncologist)"
          }`
      }
    ];
    
    // Add user messages
    messages.push({
      role: "user" as const,
      content: `HCP Information: ${hcpText}\n\nPrompt: ${prompt}${documentContent ? `\n\nDocument Content: ${documentContent}` : ""}`
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      script: result.script,
      duration: result.duration,
      targetAudience: result.targetAudience
    };
  } catch (error) {
    console.error("Error generating script with OpenAI:", error);
    throw new Error("Failed to generate script. Please try again later.");
  }
}

/**
 * Checks if a script is PMDA compliant
 * @param script The script to check
 * @returns Compliance details
 */
export async function checkCompliance(script: string): Promise<{ 
  passed: boolean; 
  score: number;
  issues?: string[];
  recommendations?: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are a compliance expert for pharmaceutical marketing content in Japan.
            Evaluate the given script for PMDA (Pharmaceuticals and Medical Devices Agency) compliance.
            A script is compliant if it:
            1. Contains evidence-based claims
            2. Avoids exaggerated efficacy claims
            3. Mentions safety information appropriately
            4. Uses proper medical terminology
            5. Avoids misleading comparisons
            
            Format your response as JSON with the following structure:
            {
              "passed": boolean,
              "score": number (0-100),
              "issues": [list of compliance issues],
              "recommendations": [list of recommendations for improvement]
            }`
        },
        {
          role: "user",
          content: `Evaluate this script for PMDA compliance:\n\n${script}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      passed: result.passed,
      score: result.score,
      issues: result.issues,
      recommendations: result.recommendations
    };
  } catch (error) {
    console.error("Error checking compliance with OpenAI:", error);
    throw new Error("Failed to check compliance. Please try again later.");
  }
}
