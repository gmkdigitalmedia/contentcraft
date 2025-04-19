import { Card, CardContent } from "@/components/ui/card";
import { VideoData } from "@/lib/types";
import { format } from "date-fns";
import { Eye, Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecentVideosTableProps {
  videos: VideoData[];
  onSelectVideo: (video: VideoData) => void;
  onDeleteVideo?: (videoId: number) => void;
  selectedVideoId?: number | null;
}

export default function RecentVideosTable({ videos, onSelectVideo, onDeleteVideo, selectedVideoId }: RecentVideosTableProps) {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Passed':
        return <Badge className="bg-green-900/20 text-green-400 hover:bg-green-900/30">Passed</Badge>;
      case 'Review':
        return <Badge className="bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30">Review</Badge>;
      case 'Failed':
        return <Badge className="bg-red-900/20 text-red-400 hover:bg-red-900/30">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleDownload = (video: VideoData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (video.video_url) {
      const link = document.createElement('a');
      link.href = video.video_url;
      link.download = `${video.title}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-medium mb-4">Recent Videos</h2>
        
        <div className="overflow-x-auto">
          {videos.length > 0 ? (
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Video</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Target HCP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {videos.map((video) => (
                  <tr 
                    key={video.id} 
                    className={cn(
                      "cursor-pointer hover:bg-secondary/40",
                      selectedVideoId === video.id && "bg-primary/10 hover:bg-primary/20"
                    )}
                    onClick={() => onSelectVideo(video)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-18 w-32 bg-secondary/40 rounded-md shadow-sm flex items-center justify-center overflow-hidden">
                          {video.video_url ? (
                            <div className="h-full w-full relative">
                              <video 
                                src={video.video_url}
                                className="h-full w-full object-cover"
                                preload="metadata"
                                muted
                                onLoadedMetadata={(e) => {
                                  // Set video to first frame for thumbnail
                                  const videoElement = e.target as HTMLVideoElement;
                                  videoElement.currentTime = 0.1;
                                }}
                                onError={(e) => {
                                  // If video fails, try the thumbnail or show fallback
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.parentElement) {
                                    if (video.thumbnail_url) {
                                      const img = document.createElement('img');
                                      img.src = video.thumbnail_url;
                                      img.alt = video.title;
                                      img.className = 'h-full w-full object-cover';
                                      e.currentTarget.parentElement.appendChild(img);
                                    } else {
                                      e.currentTarget.parentElement.classList.add('flex', 'items-center', 'justify-center');
                                      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                                      icon.setAttribute('class', 'h-6 w-6 text-gray-400');
                                      icon.setAttribute('fill', 'none');
                                      icon.setAttribute('viewBox', '0 0 24 24');
                                      icon.setAttribute('stroke', 'currentColor');
                                      
                                      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                      path1.setAttribute('stroke-linecap', 'round');
                                      path1.setAttribute('stroke-linejoin', 'round');
                                      path1.setAttribute('stroke-width', '2');
                                      path1.setAttribute('d', 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z');
                                      
                                      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                      path2.setAttribute('stroke-linecap', 'round');
                                      path2.setAttribute('stroke-linejoin', 'round');
                                      path2.setAttribute('stroke-width', '2');
                                      path2.setAttribute('d', 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
                                      
                                      icon.appendChild(path1);
                                      icon.appendChild(path2);
                                      e.currentTarget.parentElement.appendChild(icon);
                                    }
                                  }
                                }}
                              />
                              {/* Enhanced play icon overlay with hover effect */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="bg-black bg-opacity-50 rounded-full p-2 transform transition-transform duration-300 hover:scale-110 z-10">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                {/* Duration badge */}
                                <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                                  {video.duration}s
                                </div>
                              </div>
                            </div>
                          ) : video.thumbnail_url ? (
                            <div className="h-full w-full bg-secondary/50 relative">
                              <img 
                                src={video.thumbnail_url} 
                                alt={video.title} 
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                }}
                              />
                              {/* Enhanced play icon overlay with hover effect */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="bg-black bg-opacity-50 rounded-full p-2 transform transition-transform duration-300 hover:scale-110 z-10">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                {/* Duration badge */}
                                <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                                  {video.duration}s
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full w-full bg-secondary/30">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium">{video.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">Click to view</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">{video.target_hcp}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm">{video.duration}s</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(video.compliance_status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(video.created_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button 
                          className="text-primary hover:text-primary/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVideo(video);
                          }}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button 
                          className="text-primary hover:text-primary/80"
                          onClick={(e) => handleDownload(video, e)}
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        {onDeleteVideo && (
                          <button 
                            className="text-destructive hover:text-destructive/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
                                onDeleteVideo(video.id);
                              }
                            }}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No videos generated yet. Create your first video using the form above.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
