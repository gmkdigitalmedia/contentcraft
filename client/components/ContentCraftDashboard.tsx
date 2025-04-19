import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import UploadForm from "./UploadForm";
import VideoPreview from "./VideoPreview";
import RecentVideosTable from "./RecentVideosTable";
import ComplianceStats from "./ComplianceStats";
import ApiCreditStatus from "./ApiCreditStatus";
import { VideoData } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ContentCraftDashboard() {
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [promptOnly, setPromptOnly] = useState<string>("");
  const [hcpTextOnly, setHcpTextOnly] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Track the last selected video ID
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);

  const { data: recentVideos = [] } = useQuery({
    queryKey: ['/api/videos'],
  });

  const { data: complianceStats } = useQuery({
    queryKey: ['/api/videos/stats'],
  });

  // Mutation for direct prompt generation
  const promptOnlyMutation = useMutation({
    mutationFn: async (data: { prompt: string; hcp_text?: string }) => {
      const res = await apiRequest('POST', '/api/generate-video', data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos/stats'] });
      
      // Check if we received an API error with a placeholder video
      if (data.api_error) {
        setApiError(data.message);
        toast({
          title: "Video generated with placeholder",
          description: "Due to API limitations, a placeholder video was created.",
        });
      } else {
        // Normal success case
        if (data.id) {
          handleVideoGenerated(data.id);
        }
        toast({
          title: "Video generated successfully",
          description: "Your PMDA-compliant video has been created.",
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || "There was an error generating your video.";
      setApiError(errorMessage);
      
      toast({
        title: "Video generation failed",
        description: "Video was created with placeholder content due to API issues.",
        variant: "destructive",
      });
    }
  });

  const handleVideoGenerated = async (videoId: number) => {
    try {
      const res = await apiRequest('GET', `/api/videos/${videoId}`, undefined);
      const videoData = await res.json();
      setSelectedVideo(videoData);
    } catch (error) {
      console.error("Failed to fetch generated video:", error);
    }
  };

  // Mutation for video deletion
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      await apiRequest('DELETE', `/api/videos/${videoId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos/stats'] });
      
      // If the deleted video was selected, clear the selection
      if (selectedVideo && recentVideos.length > 0) {
        // Find another video to show or clear selection
        const remainingVideos = recentVideos.filter(v => v.id !== selectedVideo.id);
        if (remainingVideos.length > 0) {
          setSelectedVideo(remainingVideos[0]);
        } else {
          setSelectedVideo(null);
        }
      }

      toast({
        title: "Video deleted",
        description: "The video has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete the video. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Effect to update selectedVideo when recentVideos changes
  useEffect(() => {
    if (recentVideos && recentVideos.length > 0) {
      // If we have a last selected ID, try to find that video again
      if (lastSelectedId) {
        const video = recentVideos.find((v: any) => v.id === lastSelectedId);
        if (video) {
          setSelectedVideo(video);
          return;
        }
      }
      
      // If we have a current selection, update it with fresh data
      if (selectedVideo) {
        const refreshedVideo = recentVideos.find((v: any) => v.id === selectedVideo.id);
        if (refreshedVideo) {
          setSelectedVideo(refreshedVideo);
          return;
        }
      }
      
      // If no selection, select the first video
      if (!selectedVideo && recentVideos.length > 0) {
        setSelectedVideo(recentVideos[0]);
      }
    } else if (recentVideos && recentVideos.length === 0) {
      // If there are no videos, clear the selection
      setSelectedVideo(null);
    }
  }, [recentVideos, lastSelectedId]);

  // Reference to the VideoPreview component's manual select function
  const videoPreviewRef = useRef<{ __setManuallySelected?: () => void }>(null);
  
  const handleSelectVideo = (video: VideoData) => {
    setSelectedVideo(video);
    setLastSelectedId(video.id);
    
    // Trigger the manual selection in VideoPreview to enable autoplay
    if (videoPreviewRef.current && videoPreviewRef.current.__setManuallySelected) {
      videoPreviewRef.current.__setManuallySelected();
    }
  };

  const handleDeleteVideo = (videoId: number) => {
    deleteVideoMutation.mutate(videoId);
  };

  const handlePromptOnlySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptOnly.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt for the video generation.",
        variant: "destructive",
      });
      return;
    }

    promptOnlyMutation.mutate({
      prompt: promptOnly,
      hcp_text: hcpTextOnly.trim() || undefined
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-primary">ContentCraft AI</h1>
          <p className="text-muted-foreground mt-1">Generate PMDA-compliant, personalized HCP videos</p>
        </div>
        
        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <ApiCreditStatus apiError={apiError} />
            
            <Tabs defaultValue="upload" className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload & Generate</TabsTrigger>
                <TabsTrigger value="prompt-only">Quick Generate (Prompt Only)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload">
                <UploadForm 
                  onVideoGenerated={handleVideoGenerated}
                  onApiError={setApiError}
                />
              </TabsContent>
              
              <TabsContent value="prompt-only">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-medium mb-4">Quick Video Generation</h2>
                    <form onSubmit={handlePromptOnlySubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Video Prompt (Required)
                        </label>
                        <Textarea
                          placeholder="Enter prompt for video generation (e.g., Create a video about new hypertension guidelines)"
                          value={promptOnly}
                          onChange={(e) => setPromptOnly(e.target.value)}
                          rows={3}
                          className="w-full"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          HCP Information (Optional)
                        </label>
                        <Textarea
                          placeholder="Optional: Enter HCP information (e.g., Cardiologist, prescription_rate: 0.7)"
                          value={hcpTextOnly}
                          onChange={(e) => setHcpTextOnly(e.target.value)}
                          rows={3}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          If left empty, default HCP information will be used.
                        </p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={promptOnlyMutation.isPending}
                      >
                        {promptOnlyMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Video...
                          </>
                        ) : (
                          'Generate Video'
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <RecentVideosTable 
              videos={recentVideos} 
              onSelectVideo={handleSelectVideo} 
              onDeleteVideo={handleDeleteVideo}
              selectedVideoId={selectedVideo?.id || null}
            />
          </div>
          
          {/* Right Column */}
          <div className="lg:col-span-1">
            <VideoPreview 
              video={selectedVideo} 
              onManualSelect={() => {}} 
              ref={videoPreviewRef} 
            />
            <ComplianceStats stats={complianceStats} />
          </div>
        </div>
      </main>
    </div>
  );
}
