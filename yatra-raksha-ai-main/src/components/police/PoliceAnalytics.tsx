import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  AlertTriangle, 
  Users,
  Clock,
  MapPin,
  Activity,
  ScanLine
} from 'lucide-react';

const responseTimeData = [
  { month: 'Jan', avgTime: 4.2, incidents: 234, resolved: 218 },
  { month: 'Feb', avgTime: 3.8, incidents: 189, resolved: 175 },
  { month: 'Mar', avgTime: 4.1, incidents: 298, resolved: 276 },
  { month: 'Apr', avgTime: 3.6, incidents: 267, resolved: 251 },
  { month: 'May', avgTime: 3.9, incidents: 312, resolved: 289 },
  { month: 'Jun', avgTime: 3.4, incidents: 256, resolved: 241 },
];

const crimeHotspots = [
  { location: 'Kashmir Border Areas', incidents: 45, severity: 'critical', trend: '+12%' },
  { location: 'Delhi Tourist Areas', incidents: 123, severity: 'high', trend: '-8%' },
  { location: 'Goa Beach Zones', incidents: 89, severity: 'medium', trend: '+5%' },
  { location: 'Manali Adventure Routes', incidents: 67, severity: 'high', trend: '+15%' },
  { location: 'Rajasthan Desert Tours', incidents: 34, severity: 'low', trend: '-3%' },
];

const incidentTypes = [
  { type: 'Emergency SOS', count: 156, percentage: 32, trend: '+8%', color: 'text-critical' },
  { type: 'Medical Emergency', count: 89, percentage: 18, trend: '+12%', color: 'text-danger' },
  { type: 'Tourist Harassment', count: 134, percentage: 28, trend: '-5%', color: 'text-warning' },
  { type: 'Theft/Fraud', count: 67, percentage: 14, trend: '-12%', color: 'text-safe' },
  { type: 'Lost Tourist', count: 39, percentage: 8, trend: '+3%', color: 'text-primary' },
];

const unitPerformance = [
  { unit: 'Unit-DL-15', responseTime: '2.8min', incidents: 45, efficiency: 94 },
  { unit: 'Unit-MH-23', responseTime: '3.2min', incidents: 38, efficiency: 91 },
  { unit: 'Unit-RJ-09', responseTime: '3.8min', incidents: 52, efficiency: 89 },
  { unit: 'Unit-HP-07', responseTime: '4.1min', incidents: 29, efficiency: 87 },
  { unit: 'Unit-JK-03', responseTime: '3.5min', incidents: 41, efficiency: 92 },
];

export const PoliceAnalytics = () => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-critical';
      case 'high': return 'text-danger';
      case 'medium': return 'text-warning';
      case 'low': return 'text-safe';
      default: return 'text-muted-foreground';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-safe';
    if (efficiency >= 80) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Police Analytics Dashboard</h2>
          <p className="text-muted-foreground">Performance metrics and insights for law enforcement operations</p>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">2,847</div>
            <div className="flex items-center text-xs text-safe">
              <TrendingDown className="h-3 w-3 mr-1" />
              -7.2% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">94.2%</div>
            <div className="flex items-center text-xs text-safe">
              <TrendingUp className="h-3 w-3 mr-1" />
              +2.8% improvement
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">3.4min</div>
            <div className="flex items-center text-xs text-safe">
              <TrendingDown className="h-3 w-3 mr-1" />
              -18s faster
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Units</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">127</div>
            <div className="flex items-center text-xs text-primary">
              <Activity className="h-3 w-3 mr-1" />
              89 on patrol
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Response Time Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simulated Chart */}
              <div className="h-64 bg-gradient-to-br from-primary/5 to-safe/5 rounded-lg flex items-center justify-center border">
                <div className="text-center space-y-4">
                  <BarChart3 className="h-16 w-16 text-primary mx-auto" />
                  <div>
                    <h3 className="font-semibold">Monthly Response Trends</h3>
                    <p className="text-sm text-muted-foreground">
                      Average response time and incident resolution rates
                    </p>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="text-center">
                      <div className="w-4 h-4 bg-primary rounded-full mx-auto mb-1"></div>
                      <span className="text-xs">Response Time</span>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-4 bg-safe rounded-full mx-auto mb-1"></div>
                      <span className="text-xs">Resolution Rate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crime Hotspots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Crime Hotspots Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {crimeHotspots.map((hotspot, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-danger/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-danger">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{hotspot.location}</p>
                      <p className="text-sm text-muted-foreground">{hotspot.incidents} incidents</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${getSeverityColor(hotspot.severity)} border-current`}
                    >
                      {hotspot.severity}
                    </Badge>
                    <span className={`text-sm font-medium ${
                      hotspot.trend.startsWith('+') ? 'text-danger' : 'text-safe'
                    }`}>
                      {hotspot.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Incident Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Type Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incidentTypes.map((incident) => (
                <div key={incident.type} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ScanLine className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{incident.type}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-20 h-2 bg-muted rounded-full">
                          <div 
                            className="h-2 bg-primary rounded-full" 
                            style={{ width: `${incident.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">{incident.percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{incident.count}</div>
                    <div className={`text-xs ${incident.color}`}>
                      {incident.trend}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Unit Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Police Unit Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unitPerformance.map((unit) => (
                <div key={unit.unit} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{unit.unit}</p>
                      <p className="text-sm text-muted-foreground">
                        {unit.incidents} incidents handled
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{unit.responseTime}</p>
                        <p className="text-xs text-muted-foreground">avg response</p>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${getEfficiencyColor(unit.efficiency)}`}>
                          {unit.efficiency}%
                        </p>
                        <p className="text-xs text-muted-foreground">efficiency</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-safe">Strengths</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-safe rounded-full"></div>
                  High resolution rate (94.2%)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-safe rounded-full"></div>
                  Improved response times
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-safe rounded-full"></div>
                  Reduced theft incidents
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-warning">Areas for Improvement</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  Kashmir border security
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  Adventure route monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  Unit deployment efficiency
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-primary">Recommendations</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Increase border patrol units
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Deploy more resources to hotspots
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Enhance training programs
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};