import { Card, CardContent } from "@/components/ui/card";
import { ComplianceStats as ComplianceStatsType } from "@/lib/types";

interface ComplianceStatsProps {
  stats?: ComplianceStatsType;
}

export default function ComplianceStats({ stats }: ComplianceStatsProps) {
  // Default values if no stats are provided
  const defaultStats: ComplianceStatsType = {
    compliance_rate: 95,
    hcp_response_rate: 20,
    turnaround_time: "7-15 days",
    videos_generated: 127,
    videos_passed: 121,
    avg_duration: 8.5,
    adoption_gains: "$380K",
  };

  const currentStats = stats || defaultStats;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-medium mb-4">Compliance Stats</h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm font-medium text-muted-foreground">PMDA Compliance Rate</div>
              <div className="text-sm font-medium">{currentStats.compliance_rate}%</div>
            </div>
            <div className="w-full bg-secondary/50 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${currentStats.compliance_rate}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm font-medium text-muted-foreground">HCP Response Rate</div>
              <div className="text-sm font-medium">{currentStats.hcp_response_rate}%</div>
            </div>
            <div className="w-full bg-secondary/50 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${currentStats.hcp_response_rate}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Industry average: 10%</div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm font-medium text-muted-foreground">Turnaround Time</div>
              <div className="text-sm font-medium">{currentStats.turnaround_time}</div>
            </div>
            <div className="w-full bg-secondary/50 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: "70%" }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Industry average: 15-30 days</div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-muted">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Compliance Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/30 p-3 rounded-md">
              <div className="text-xs text-muted-foreground mb-1">Videos Generated</div>
              <div className="text-lg font-semibold">{currentStats.videos_generated}</div>
            </div>
            <div className="bg-secondary/30 p-3 rounded-md">
              <div className="text-xs text-muted-foreground mb-1">Passed Compliance</div>
              <div className="text-lg font-semibold text-green-400">{currentStats.videos_passed}</div>
            </div>
            <div className="bg-secondary/30 p-3 rounded-md">
              <div className="text-xs text-muted-foreground mb-1">Avg. Duration</div>
              <div className="text-lg font-semibold">{currentStats.avg_duration}s</div>
            </div>
            <div className="bg-secondary/30 p-3 rounded-md">
              <div className="text-xs text-muted-foreground mb-1">Adoption Gains</div>
              <div className="text-lg font-semibold">{currentStats.adoption_gains}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
