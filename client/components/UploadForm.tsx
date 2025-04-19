import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { uploadFormSchema, promptFormSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UploadStep, ProcessingStatus } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface UploadFormProps {
  onVideoGenerated: (videoId: number) => void;
  onApiError?: (error: string) => void;
}

export default function UploadForm({ onVideoGenerated, onApiError }: UploadFormProps) {
  const [step, setStep] = useState<UploadStep>(1);
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [processing, setProcessing] = useState<ProcessingStatus | null>(null);
  
  const { toast } = useToast();
  
  // HCP Profile templates
  const hcpTemplates = {
    "oncologist": "Oncologist, prescription_rate: 0.8, patient-oriented, HR+/HER2- breast cancer focus.",
    "cardiologist": "Cardiologist, prescription_rate: 0.7, evidence-based medicine advocate, specialized in heart failure treatment.",
    "neurologist": "Neurologist, prescription_rate: 0.6, research-oriented, focused on multiple sclerosis and Parkinson's disease.",
    "pediatrician": "Pediatrician, prescription_rate: 0.5, patient-centered care, specializes in childhood asthma and allergies.",
    "dermatologist": "Dermatologist, prescription_rate: 0.65, procedural specialist, focus on psoriasis and eczema treatments."
  };
  
  // Prompt templates for each HCP type
  const promptTemplates = {
    "oncologist": "Create a 10-second video for an oncologist focusing on Kisqali (ribociclib) for HR+/HER2- advanced breast cancer. Emphasize the 45.3 months median PFS in MONALEESA-2 trial and manageable side effects (60% neutropenia vs competitors).",
    "cardiologist": "Create a 10-second video for a cardiologist about a new heart failure medication. Highlight the evidence-based 25% reduction in cardiovascular death and 30% reduction in hospitalizations in clinical trials.",
    "neurologist": "Create a 10-second video for a neurologist focusing on multiple sclerosis treatment options. Emphasize improved outcomes with manageable side effects compared to standard therapies.",
    "pediatrician": "Create a 10-second video for a pediatrician about a new childhood asthma medication. Highlight the once-daily dosing, reduced exacerbation rates, and improved quality of life measures in clinical trials.",
    "dermatologist": "Create a 10-second video for a dermatologist about a novel psoriasis treatment. Emphasize the PASI-90 response rate of 70% at week 16 and the favorable safety profile compared to existing biologics."
  };

  // Form for HCP information
  const uploadForm = useForm<z.infer<typeof uploadFormSchema>>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      hcp_text: "",
      document_path: "",
    },
  });
  
  // State for document upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form for prompt information
  const promptForm = useForm<z.infer<typeof promptFormSchema>>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      upload_id: 0,
      prompt: "",
    },
  });

  // Mutation for uploading HCP info
  const uploadMutation = useMutation({
    mutationFn: async (data: { hcp_text: string, document?: File }) => {
      try {
        // If there's a document file, upload it first
        let documentPath = null;
        
        if (data.document) {
          const formData = new FormData();
          formData.append('file', data.document);
          
          const uploadRes = await fetch('/api/upload-document', {
            method: 'POST',
            body: formData,
          });
          
          if (!uploadRes.ok) {
            throw new Error('Document upload failed');
          }
          
          const uploadResult = await uploadRes.json();
          documentPath = uploadResult.path;
        }
        
        // Then create the HCP upload with optional document path
        const res = await apiRequest("POST", "/api/upload", {
          user_id: "anonymous",
          hcp_text: data.hcp_text,
          document_path: documentPath
        });
        
        return await res.json();
      } catch (err: any) {
        console.error("Upload error:", err);
        throw new Error(err.message || "Upload failed");
      }
    },
    onSuccess: (data) => {
      setUploadId(data.id);
      promptForm.setValue("upload_id", data.id);
      setStep(2);
      toast({
        title: "HCP information processed",
        description: "Your HCP information has been successfully processed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Processing failed",
        description: error.message || "There was an error processing your HCP information.",
        variant: "destructive",
      });
    },
  });

  // Mutation for generating video
  const generateMutation = useMutation({
    mutationFn: async (data: { upload_id?: number; prompt: string; hcp_text?: string }) => {
      const res = await apiRequest("POST", "/api/generate-video", data);
      setProcessing({
        stage: "analysis",
        percentage: 25,
        message: "Running MediTag Engine analysis",
      });
      
      // Simulate progress (in a real app, this would use websockets or SSE for real-time updates)
      setTimeout(() => {
        setProcessing({
          stage: "script",
          percentage: 50,
          message: "Generating script with GPT-4o",
        });
      }, 2000);
      
      setTimeout(() => {
        setProcessing({
          stage: "generating",
          percentage: 75,
          message: "Creating AI avatar video",
        });
      }, 4000);
      
      setTimeout(() => {
        setProcessing({
          stage: "compliance",
          percentage: 90,
          message: "Performing PMDA compliance check",
        });
      }, 6000);
      
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos/stats'] });
      
      setTimeout(() => {
        setStep(1);
        setProcessing(null);
        uploadForm.reset();
        promptForm.reset();
        
        // Check if we received an API error with a placeholder video
        if (data.api_error) {
          if (onApiError) {
            onApiError(data.message);
          }
          toast({
            title: "Video generated with placeholder",
            description: "Due to API limitations, a placeholder video was created.",
          });
        } else {
          // Normal success case
          if (data.id) {
            onVideoGenerated(data.id);
            toast({
              title: "Video generated successfully",
              description: "Your PMDA-compliant video has been created.",
              action: (
                <button 
                  onClick={() => onVideoGenerated(data.id)}
                  className="bg-primary-500 px-3 py-1 rounded text-white text-xs hover:bg-primary-600"
                >
                  View Video
                </button>
              ),
            });
          } else {
            toast({
              title: "Video generated successfully",
              description: "Your PMDA-compliant video has been created.",
            });
          }
        }
      }, 8000); // Give time for the final "compliance" stage to be visible
    },
    onError: (error: any) => {
      setStep(1); // Go back to HCP step on error
      setProcessing(null);
      
      const errorMessage = error.message || "There was an error generating your video.";
      
      // Pass the error to the parent component if it's an API error
      if (onApiError && (errorMessage.includes('API error') || errorMessage.includes('Insufficient credits'))) {
        onApiError(errorMessage);
      }
      
      toast({
        title: "Video generation failed",
        description: "Failed to create video. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle HCP form submission
  const handleUploadSubmit = uploadForm.handleSubmit((data) => {
    // Get HCP information and generate a video directly
    const hcpText = data.hcp_text;
    const hasDocument = !!selectedFile;
    let defaultPrompt = "";
    
    // If it's one of our templates, use the corresponding prompt
    if (selectedTemplate && selectedTemplate !== "custom" && selectedTemplate in promptTemplates) {
      defaultPrompt = promptTemplates[selectedTemplate as keyof typeof promptTemplates];
    } else {
      // Generate a generic prompt
      defaultPrompt = `Create a 10-second video for a healthcare professional about a new treatment option. Highlight the evidence-based outcomes and safety profile.`;
    }
    
    // If we have a document, we need to upload it first, then create the upload, then generate the video
    if (hasDocument) {
      setProcessing({
        stage: "analysis",
        percentage: 15,
        message: "Uploading document..."
      });
      
      // Start by uploading the document
      uploadMutation.mutate({
        hcp_text: hcpText,
        document: selectedFile
      }, {
        onSuccess: (uploadData) => {
          // After upload succeeds, continue to the next step
          promptForm.setValue("upload_id", uploadData.id);
          
          // Move to processing step and generate the video
          setStep(3);
          setProcessing({
            stage: "analysis",
            percentage: 25,
            message: "Running MediTag Engine analysis"
          });
          
          // Generate video with the upload ID
          generateMutation.mutate({
            prompt: defaultPrompt,
            upload_id: uploadData.id
          });
        },
        onError: (error) => {
          setProcessing(null);
          toast({
            title: "Upload failed",
            description: error.message || "Failed to upload document. Please try again.",
            variant: "destructive",
          });
        }
      });
    } else {
      // No document, so just do direct generation
      setStep(3);
      
      // Start the generation process with just the HCP text and default prompt
      generateMutation.mutate({
        prompt: defaultPrompt,
        hcp_text: hcpText
      });
    }
  });

  // Handle prompt form submission
  const handlePromptSubmit = promptForm.handleSubmit((data) => {
    setStep(3); // Move to processing step
    generateMutation.mutate(data);
  });
  
  // Store the selected template
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");

  // Handle HCP template selection
  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
    
    if (template && template !== "custom" && template in hcpTemplates) {
      uploadForm.setValue("hcp_text", hcpTemplates[template as keyof typeof hcpTemplates]);
    } else if (template === "custom") {
      uploadForm.setValue("hcp_text", "");
    }
  };
  
  // Update prompt when moving to step 2
  useEffect(() => {
    if (step === 2 && selectedTemplate !== "custom" && selectedTemplate in promptTemplates) {
      promptForm.setValue("prompt", promptTemplates[selectedTemplate as keyof typeof promptTemplates]);
    }
  }, [step, selectedTemplate]);

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h2 className="text-lg font-medium mb-4">Create AI Video</h2>
        
        {/* Step Indicator */}
        <div className="flex items-center mb-6">
          <div className="flex-1">
            <div className="relative">
              <div className="h-1 bg-gray-200 rounded-full">
                <div 
                  className="h-1 bg-primary-500 rounded-full transition-all duration-300" 
                  style={{ width: `${step === 1 ? 33 : step === 2 ? 66 : 100}%` }}
                ></div>
              </div>
              <div className="absolute -top-2 left-0">
                <div className={`flex items-center justify-center w-5 h-5 ${step >= 1 ? "bg-primary-500" : "bg-gray-300"} text-white rounded-full text-xs`}>1</div>
              </div>
              <div className="absolute -top-2 left-1/3 transform -translate-x-1/2">
                <div className={`flex items-center justify-center w-5 h-5 ${step >= 2 ? "bg-primary-500" : "bg-gray-300"} text-white rounded-full text-xs`}>2</div>
              </div>
              <div className="absolute -top-2 left-2/3 transform -translate-x-1/2">
                <div className={`flex items-center justify-center w-5 h-5 ${step >= 3 ? "bg-primary-500" : "bg-gray-300"} text-white rounded-full text-xs`}>3</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Step 1: HCP Text Input Form */}
        {step === 1 && (
          <Form {...uploadForm}>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="mb-2">
                  <FormLabel className="mb-2">HCP Template</FormLabel>
                  <Select onValueChange={handleTemplateSelect} defaultValue="custom">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an HCP template or enter custom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom HCP Information</SelectItem>
                      <SelectItem value="oncologist">Oncologist</SelectItem>
                      <SelectItem value="cardiologist">Cardiologist</SelectItem>
                      <SelectItem value="neurologist">Neurologist</SelectItem>
                      <SelectItem value="pediatrician">Pediatrician</SelectItem>
                      <SelectItem value="dermatologist">Dermatologist</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Select a template or enter custom information below</p>
                </div>
                
                <FormField
                  control={uploadForm.control}
                  name="hcp_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HCP Information</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter HCP data (e.g., Cardiologist, prescription_rate: 0.7)"
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={uploadForm.control}
                  name="document"
                  render={({ field: { onChange, ...rest } }) => (
                    <FormItem>
                      <FormLabel>
                        Upload Document (Optional)
                        <span className="ml-2 text-xs text-gray-500">For RAG-based generation</span>
                      </FormLabel>
                      <FormControl>
                        <div className="border border-gray-200 rounded-md p-4 space-y-2">
                          <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {selectedFile ? (
                                  <>
                                    <svg className="w-8 h-8 mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <p className="mb-2 text-sm text-gray-700">{selectedFile.name}</p>
                                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                    </svg>
                                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500">PDF, DOCX, TXT (MAX. 10MB)</p>
                                  </>
                                )}
                              </div>
                              <input
                                id="dropzone-file"
                                type="file"
                                className="hidden"
                                accept=".pdf,.docx,.txt"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file && file.size <= 10 * 1024 * 1024) { // 10MB limit
                                    setSelectedFile(file);
                                    onChange(file);
                                  } else if (file) {
                                    toast({
                                      title: "File too large",
                                      description: "Please upload a file smaller than 10MB.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                {...rest}
                              />
                            </label>
                          </div>
                          {selectedFile && (
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedFile(null);
                                  onChange(null);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <p className="text-xs text-gray-500">Upload a document to enhance video generation with specific content</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  className="px-4 py-2"
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Processing...
                    </>
                  ) : "Generate Video"}
                </Button>
              </div>
            </form>
          </Form>
        )}
        
        {/* Step 2: Prompt Input Form */}
        {step === 2 && (
          <Form {...promptForm}>
            <form onSubmit={handlePromptSubmit} className="space-y-4">
              <FormField
                control={promptForm.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Generation Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the video you want to generate (e.g., Create a 10-second video for a cardiologist about a new drug)"
                        className="resize-none"
                        rows={4}
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500">Be specific about content, duration, and target audience</p>
                      <span className="text-xs text-gray-500">{field.value.length}/500</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline"
                  className="px-4 py-2"
                  onClick={() => setStep(1)}
                  disabled={generateMutation.isPending}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="px-4 py-2"
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? "Generating..." : "Generate Video"}
                </Button>
              </div>
            </form>
          </Form>
        )}
        
        {/* Step 3: Processing/Loading View */}
        {step === 3 && processing && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-4 border-t-primary-500 mb-6"></div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">Generating Your Video</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-2">
              Using AI to create a PMDA-compliant video based on your inputs. This process may take up to 30 seconds.
            </p>
            <p className="text-xs text-gray-500 max-w-md mx-auto italic">
              Please wait while we work on your video...
            </p>
            
            <div className="mt-8 max-w-md mx-auto">
              <div className="mb-3 flex justify-between text-sm font-medium">
                <span className="text-primary-600">{processing.message}</span>
                <span className="text-primary-600">{processing.percentage}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-3 bg-primary-500 rounded-full transition-all duration-500 pulse-animation" 
                  style={{ width: `${processing.percentage}%` }}
                ></div>
              </div>
              <div className="mt-6 text-xs text-gray-500 grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full ${processing.stage === 'analysis' ? 'bg-primary-500 animate-pulse' : processing.stage === 'script' || processing.stage === 'generating' || processing.stage === 'compliance' ? 'bg-primary-100' : 'bg-gray-200'} flex items-center justify-center mb-1`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${processing.stage === 'analysis' ? 'text-white' : processing.stage === 'script' || processing.stage === 'generating' || processing.stage === 'compliance' ? 'text-primary-600' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                      {processing.stage === 'analysis' ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      ) : processing.stage === 'script' || processing.stage === 'generating' || processing.stage === 'compliance' ? (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      )}
                    </svg>
                  </div>
                  <span>Analysis</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full ${processing.stage === 'script' ? 'bg-primary-500 animate-pulse' : processing.stage === 'generating' || processing.stage === 'compliance' ? 'bg-primary-100' : processing.stage === 'analysis' ? 'bg-gray-200' : 'bg-gray-200'} flex items-center justify-center mb-1`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${processing.stage === 'script' ? 'text-white' : processing.stage === 'generating' || processing.stage === 'compliance' ? 'text-primary-600' : processing.stage === 'analysis' ? 'text-gray-400' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                      {processing.stage === 'script' ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      ) : processing.stage === 'generating' || processing.stage === 'compliance' ? (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      )}
                    </svg>
                  </div>
                  <span>Script</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full ${processing.stage === 'generating' ? 'bg-primary-500 animate-pulse' : processing.stage === 'compliance' ? 'bg-primary-100' : processing.stage === 'analysis' || processing.stage === 'script' ? 'bg-gray-200' : 'bg-gray-200'} flex items-center justify-center mb-1`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${processing.stage === 'generating' ? 'text-white' : processing.stage === 'compliance' ? 'text-primary-600' : processing.stage === 'analysis' || processing.stage === 'script' ? 'text-gray-400' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                      {processing.stage === 'generating' ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      ) : processing.stage === 'compliance' ? (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      )}
                    </svg>
                  </div>
                  <span>Generating</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full ${processing.stage === 'compliance' ? 'bg-primary-500 animate-pulse' : 'bg-gray-200'} flex items-center justify-center mb-1`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${processing.stage === 'compliance' ? 'text-white' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                      {processing.stage === 'compliance' ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      )}
                    </svg>
                  </div>
                  <span>Compliance</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
