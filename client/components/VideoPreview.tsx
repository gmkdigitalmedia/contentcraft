import { useState, useEffect, useRef, forwardRef, ForwardedRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoData } from "@/lib/types";
import { Play, Download, Share, Maximize, Check, X, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

interface VideoPreviewProps {
  video: VideoData | null;
  onManualSelect?: () => void;
}

const VideoPreview = forwardRef(function VideoPreview(
  { video, onManualSelect }: VideoPreviewProps, 
  ref: ForwardedRef<any>
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullScript, setShowFullScript] = useState(false);
  const [complianceState, setComplianceState] = useState<'Passed' | 'Review' | 'Failed' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Track when a video is manually selected
  const [manuallySelected, setManuallySelected] = useState(false);
  
  // Expose the setManuallySelected function through the onManualSelect callback
  useEffect(() => {
    if (onManualSelect) {
      // Define a function that will be called by the parent component
      const handleManualSelect = () => {
        setManuallySelected(true);
      };
      
      // Store this function in a ref so we can access it from the parent
      (onManualSelect as any).__setManuallySelected = handleManualSelect;
    }
  }, [onManualSelect]);
  
  // Expose setManuallySelected function to parent component via ref
  useEffect(() => {
    if (ref) {
      (ref as any).current = {
        __setManuallySelected: () => setManuallySelected(true)
      };
    }
  }, [ref]);
  
  // Handle video change - reset player and scroll into view
  useEffect(() => {
    setIsPlaying(false);
    setShowFullScript(false);
    
    // Reset video element
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    
    // Set compliance state based on video
    if (video) {
      setComplianceState(video.compliance_status as 'Passed' | 'Review' | 'Failed');
    } else {
      setComplianceState(null);
    }
    
    // Auto-scroll to the video preview when a new video is selected
    if (video && cardRef.current) {
      cardRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Only auto-play if video was manually selected (not on page refresh)
      if (manuallySelected) {
        const playTimer = setTimeout(() => {
          if (videoRef.current) {
            handlePlayPause();
          }
        }, 500);
        
        // Reset the manually selected flag
        setManuallySelected(false);
        
        return () => clearTimeout(playTimer);
      }
    }
  }, [video?.id, manuallySelected]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (!videoRef.current.src) {
        console.error("Cannot play video: No source available");
        return;
      }

      try {
        if (videoRef.current.paused) {
          videoRef.current.play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(error => {
              console.error("Error playing video:", error);
              setIsPlaying(false);
            });
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      } catch (error) {
        console.error("Error controlling video playback:", error);
        setIsPlaying(false);
      }
    }
  };
  
  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today
    if (date.toDateString() === now.toDateString()) {
      return `Today, ${format(date, "h:mm a")}`;
    }
    
    // If yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${format(date, "h:mm a")}`;
    }
    
    // Otherwise, return formatted date
    return format(date, "MMM d, h:mm a");
  };

  const handleDownload = () => {
    if (video?.video_url) {
      const link = document.createElement('a');
      link.href = video.video_url;
      link.download = `${video.title}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = () => {
    if (video?.video_url && navigator.share) {
      navigator.share({
        title: video.title,
        text: `Check out this PMDA-compliant HCP video: ${video.title}`,
        url: video.video_url,
      })
      .catch((error) => console.log('Error sharing:', error));
    }
  };

  // Handle compliance approval - in a real app this would send an API request
  const handleApproveCompliance = () => {
    if (video && (video.compliance_status === 'Review' || video.compliance_status === 'Failed')) {
      setComplianceState('Passed');
      // In a real application, you would call an API to update the status:
      // fetch(`/api/videos/${video.id}/approve-compliance`, { method: 'POST' })
      //   .then(response => response.json())
      //   .then(data => console.log('Compliance approved:', data))
      //   .catch(error => console.error('Error approving compliance:', error));
    }
  };

  return (
    <Card className="mb-6" ref={cardRef}>
      <CardContent className="p-6">
        <h2 className="text-lg font-medium mb-4">Video Preview</h2>
        
        <div className="mb-4 bg-gray-100 rounded-lg overflow-hidden relative">
          {video ? (
            <div className="relative">
              {/* Video container with 16:9 aspect ratio and larger size */}
              <div className="aspect-w-16 aspect-h-9" style={{ maxHeight: "450px" }}>
                <video
                  id="preview-video"
                  ref={videoRef}
                  className="w-full h-full object-cover rounded-lg"
                  controls={isPlaying}
                  poster={video.thumbnail_url || undefined}
                  src={video.video_url || undefined}
                  onEnded={handleVideoEnded}
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    // Set to first frame for thumbnail if no poster
                    if (!video.thumbnail_url) {
                      const videoElement = e.target as HTMLVideoElement;
                      videoElement.currentTime = 0.1;
                    }
                  }}
                  onError={(e) => {
                    console.error("Video error:", e);
                    setIsPlaying(false);
                  }}
                />
              </div>
              
              {/* Overlay controls when not playing */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg"></div>
                  <div className="flex flex-col items-center space-y-4 z-10">
                    {/* Large play button */}
                    <button
                      type="button"
                      className="bg-white bg-opacity-80 rounded-full p-6 shadow-lg hover:bg-opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transform transition-transform hover:scale-110"
                      onClick={handlePlayPause}
                      aria-label="Play video"
                    >
                      <Play className="h-12 w-12 text-primary-600" />
                    </button>
                    
                    {/* Video title overlay */}
                    <div className="bg-black bg-opacity-70 px-4 py-2 rounded-full">
                      <h3 className="text-white font-medium">{video.title}</h3>
                    </div>
                  </div>
                  
                  {/* Fullscreen button */}
                  <button
                    type="button"
                    className="absolute bottom-4 right-4 bg-black bg-opacity-60 rounded-full p-2 hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 z-10"
                    onClick={toggleFullscreen}
                    aria-label="Toggle fullscreen"
                  >
                    <Maximize className="h-5 w-5 text-white" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-lg">
              <p className="text-gray-500">No video selected</p>
            </div>
          )}
        </div>
        
        {video && (
          <>
            {/* Script dialog */}
            <Dialog open={showFullScript} onOpenChange={setShowFullScript}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Full Video Script - {video.title}</DialogTitle>
                  <DialogDescription>
                    The complete script used to generate this video
                  </DialogDescription>
                </DialogHeader>
                
                <div className="mt-4 bg-secondary/20 p-4 rounded-md text-sm whitespace-pre-wrap">
                  {video.generated_script || "No script available for this video."}
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowFullScript(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Show compliance status based on state instead of directly from video prop */}
            {(complianceState === 'Passed' || (video.compliance_status === 'Passed' && complianceState === null)) && (
              <div className="p-4 bg-green-900/10 rounded-md mb-4 border-l-4 border-green-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-400">PMDA Compliance Check: Passed</h3>
                    <div className="mt-2 text-sm text-green-300">
                      <p>This video meets all required PMDA compliance standards. Evidence-based claims are properly supported.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {(complianceState === 'Review' || (video.compliance_status === 'Review' && complianceState === null)) && (
              <div className="p-4 bg-yellow-900/10 rounded-md mb-4 border-l-4 border-yellow-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-400">PMDA Compliance Check: Needs Review</h3>
                    <div className="mt-2 text-sm text-yellow-300">
                      <p>This video may require additional review to ensure PMDA compliance.</p>
                      
                      <div className="mt-3">
                        <div className="font-medium text-yellow-400 mb-1">Compliance Score: {video.compliance_details?.score || 60}/100</div>
                        
                        {video.compliance_details?.issues && video.compliance_details.issues.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium text-yellow-400 mb-1">Flagged Issues:</div>
                            <ul className="list-disc pl-5 space-y-1">
                              {video.compliance_details.issues.map((issue, index) => (
                                <li key={index}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {video.compliance_details?.recommendations && video.compliance_details.recommendations.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium text-yellow-400 mb-1">Recommendations:</div>
                            <ul className="list-disc pl-5 space-y-1">
                              {video.compliance_details.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-green-900/20 text-green-400 border-green-800 hover:bg-green-900/30"
                    onClick={handleApproveCompliance}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Compliance
                  </Button>
                  
                  <button 
                    className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                    onClick={() => setShowFullScript(true)}
                  >
                    Show Full Script
                  </button>
                </div>
              </div>
            )}
            
            {(complianceState === 'Failed' || (video.compliance_status === 'Failed' && complianceState === null)) && (
              <div className="p-4 bg-red-900/10 rounded-md mb-4 border-l-4 border-red-500">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-400">PMDA Compliance Check: Failed</h3>
                    <div className="mt-2 text-sm text-red-300">
                      <p>This video does not meet PMDA compliance standards.</p>
                      
                      <div className="mt-3">
                        <div className="font-medium text-red-400 mb-1">Compliance Score: {video.compliance_details?.score || 40}/100</div>
                        
                        {video.compliance_details?.issues && video.compliance_details.issues.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium text-red-400 mb-1">Flagged Issues:</div>
                            <ul className="list-disc pl-5 space-y-1">
                              {video.compliance_details.issues.map((issue, index) => (
                                <li key={index}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {video.compliance_details?.recommendations && video.compliance_details.recommendations.length > 0 && (
                          <div className="mt-2">
                            <div className="font-medium text-red-400 mb-1">Recommendations:</div>
                            <ul className="list-disc pl-5 space-y-1">
                              {video.compliance_details.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-green-900/20 text-green-400 border-green-800 hover:bg-green-900/30"
                    onClick={handleApproveCompliance}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Compliance
                  </Button>
                  
                  <button 
                    className="text-xs text-red-400 hover:text-red-300 underline"
                    onClick={() => setShowFullScript(true)}
                  >
                    Show Full Script
                  </button>
                </div>
              </div>
            )}
            
            {/* Video actions */}
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleShare}
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default VideoPreview;