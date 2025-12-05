import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Activity,
  Eye,
  RefreshCw
} from 'lucide-react';

const mockTourists = [
  { id: 'T001', name: 'John Smith', location: 'Red Fort, Delhi', status: 'safe', lastUpdate: '2 min ago' },
  { id: 'T002', name: 'Emma Wilson', location: 'Goa Beach', status: 'warning', lastUpdate: '5 min ago' },
  { id: 'T003', name: 'Raj Patel', location: 'Manali Hills', status: 'danger', lastUpdate: '1 min ago' },
  { id: 'T004', name: 'Sarah Johnson', location: 'Jaipur Palace', status: 'safe', lastUpdate: '3 min ago' },
];

const mockAlerts = [
  { id: 'A001', type: 'High Risk Zone Entry', tourist: 'Emma Wilson', location: 'Goa Beach', time: '5 min ago' },
  { id: 'A002', type: 'SOS Alert', tourist: 'Raj Patel', location: 'Manali Hills', time: '1 min ago' },
  { id: 'A003', type: 'Geo-fence Violation', tourist: 'Mike Brown', location: 'Kashmir Valley', time: '8 min ago' },
];

export const LiveMonitoring = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-safe text-safe-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      case 'danger': return 'bg-danger text-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAlertColor = (type: string) => {
    if (type.includes('SOS')) return 'border-l-danger bg-danger-light';
    if (type.includes('High Risk')) return 'border-l-warning bg-warning-light';
    return 'border-l-primary bg-primary/5';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tourists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">1,247</div>
            <p className="text-xs text-muted-foreground">
              +180 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Risk Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">23</div>
            <p className="text-xs text-muted-foreground">
              -5 from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Zones</CardTitle>
            <MapPin className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">7</div>
            <p className="text-xs text-muted-foreground">
              2 new zones added
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-safe" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">4.2m</div>
            <p className="text-xs text-muted-foreground">
              -30s improvement
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* India Map Placeholder */}
        <Card className="lg:row-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              India Safety Map
            </CardTitle>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="aspect-square bg-gradient-to-br from-safe-light to-primary/10 rounded-lg flex items-center justify-center border">
              <div className="text-center space-y-4">
                <MapPin className="h-16 w-16 text-primary mx-auto" />
                <div>
                  <h3 className="font-semibold">Interactive India Map</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time tourist locations, safe zones, and risk areas
                  </p>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-safe rounded-full"></div>
                    <span className="text-xs">Safe Zones</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-warning rounded-full"></div>
                    <span className="text-xs">Caution Areas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-danger rounded-full"></div>
                    <span className="text-xs">High-Risk Zones</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent High-Risk Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border-l-4 ${getAlertColor(alert.type)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{alert.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.tourist} - {alert.location}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Tourists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Tourists Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTourists.map((tourist) => (
                <div key={tourist.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tourist.name}</p>
                      <p className="text-xs text-muted-foreground">{tourist.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(tourist.status)} variant="secondary">
                      {tourist.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};