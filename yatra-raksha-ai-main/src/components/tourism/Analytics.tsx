import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MapPin, 
  AlertTriangle,
  Clock,
  Activity
} from 'lucide-react';

const mockChartData = [
  { month: 'Jan', tourists: 12450, alerts: 234, incidents: 12 },
  { month: 'Feb', tourists: 15670, alerts: 189, incidents: 8 },
  { month: 'Mar', tourists: 18920, alerts: 345, incidents: 15 },
  { month: 'Apr', tourists: 22340, alerts: 298, incidents: 11 },
  { month: 'May', tourists: 19850, alerts: 412, incidents: 18 },
  { month: 'Jun', tourists: 16780, alerts: 367, incidents: 14 },
];

const topStates = [
  { name: 'Rajasthan', tourists: 45680, risk: 'low', growth: '+12%' },
  { name: 'Goa', tourists: 38950, risk: 'medium', growth: '+8%' },
  { name: 'Kerala', tourists: 34720, risk: 'low', growth: '+15%' },
  { name: 'Himachal Pradesh', tourists: 28340, risk: 'high', growth: '+5%' },
  { name: 'Maharashtra', tourists: 25670, risk: 'medium', growth: '+10%' },
];

const riskTrends = [
  { category: 'Geo-fence Violations', count: 145, trend: '-8%', color: 'text-safe' },
  { category: 'Device Offline Alerts', count: 89, trend: '+12%', color: 'text-warning' },
  { category: 'SOS Emergencies', count: 23, trend: '-15%', color: 'text-safe' },
  { category: 'High-Risk Zone Entries', count: 67, trend: '+5%', color: 'text-warning' },
];

export const Analytics = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive insights into tourist safety and system performance</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tourists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">147,890</div>
            <div className="flex items-center text-xs text-safe">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert Resolution Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">94.2%</div>
            <div className="flex items-center text-xs text-safe">
              <TrendingUp className="h-3 w-3 mr-1" />
              +2.1% improvement
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">4.2min</div>
            <div className="flex items-center text-xs text-safe">
              <TrendingDown className="h-3 w-3 mr-1" />
              -30s faster
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">99.8%</div>
            <div className="flex items-center text-xs text-safe">
              <TrendingUp className="h-3 w-3 mr-1" />
              Excellent performance
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tourist Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tourist Activity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simulated Chart */}
              <div className="h-64 bg-gradient-to-br from-primary/5 to-safe/5 rounded-lg flex items-center justify-center border">
                <div className="text-center space-y-4">
                  <BarChart3 className="h-16 w-16 text-primary mx-auto" />
                  <div>
                    <h3 className="font-semibold">Monthly Tourist Activity</h3>
                    <p className="text-sm text-muted-foreground">
                      Interactive chart showing tourist registrations, alerts, and incidents
                    </p>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="text-center">
                      <div className="w-4 h-4 bg-primary rounded-full mx-auto mb-1"></div>
                      <span className="text-xs">Tourists</span>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-4 bg-warning rounded-full mx-auto mb-1"></div>
                      <span className="text-xs">Alerts</span>
                    </div>
                    <div className="text-center">
                      <div className="w-4 h-4 bg-danger rounded-full mx-auto mb-1"></div>
                      <span className="text-xs">Incidents</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top States by Tourism */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Top States by Tourist Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStates.map((state, index) => (
                <div key={state.name} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{state.name}</p>
                      <p className="text-sm text-muted-foreground">{state.tourists.toLocaleString()} tourists</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={
                        state.risk === 'low' ? 'border-safe text-safe' :
                        state.risk === 'medium' ? 'border-warning text-warning' :
                        'border-danger text-danger'
                      }
                    >
                      {state.risk} risk
                    </Badge>
                    <span className="text-sm font-medium text-safe">{state.growth}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Category Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskTrends.map((risk) => (
                <div key={risk.category} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="font-medium">{risk.category}</p>
                    <p className="text-2xl font-bold">{risk.count}</p>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${risk.color}`}>
                      {risk.trend}
                    </div>
                    <p className="text-xs text-muted-foreground">vs last month</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>System Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">API Response Time</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-muted rounded-full">
                    <div className="w-16 h-2 bg-safe rounded-full"></div>
                  </div>
                  <span className="text-sm text-safe">245ms</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Database Load</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-muted rounded-full">
                    <div className="w-10 h-2 bg-primary rounded-full"></div>
                  </div>
                  <span className="text-sm text-primary">52%</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Alert Processing</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-muted rounded-full">
                    <div className="w-18 h-2 bg-safe rounded-full"></div>
                  </div>
                  <span className="text-sm text-safe">94%</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Geo-tracking Accuracy</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-muted rounded-full">
                    <div className="w-19 h-2 bg-safe rounded-full"></div>
                  </div>
                  <span className="text-sm text-safe">98.7%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};