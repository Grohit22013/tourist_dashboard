import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Eye, 
  CheckCircle, 
  Search,
  Filter,
  Zap
} from 'lucide-react';

const mockAlerts = [
  {
    id: 'ALT-001',
    type: 'SOS Alert',
    severity: 'critical',
    tourist: 'Raj Patel',
    touristId: 'YR-T003',
    location: 'Manali Hills, HP',
    timestamp: '2024-01-15 14:30:25',
    status: 'pending',
    description: 'Emergency SOS button pressed by tourist'
  },
  {
    id: 'ALT-002', 
    type: 'Geo-fence Violation',
    severity: 'high',
    tourist: 'Emma Wilson',
    touristId: 'YR-T002',
    location: 'Restricted Area, Goa',
    timestamp: '2024-01-15 14:25:10',
    status: 'investigating',
    description: 'Tourist entered high-risk restricted zone'
  },
  {
    id: 'ALT-003',
    type: 'Device Offline',
    severity: 'medium',
    tourist: 'Mike Brown',
    touristId: 'YR-T005',
    location: 'Kashmir Valley, J&K',
    timestamp: '2024-01-15 13:45:30',
    status: 'pending',
    description: 'Tourist device lost connection for 45+ minutes'
  },
  {
    id: 'ALT-004',
    type: 'High Risk Zone Entry',
    severity: 'high',
    tourist: 'David Singh',
    touristId: 'YR-T007',
    location: 'Border Area, Punjab',
    timestamp: '2024-01-15 13:20:15',
    status: 'resolved',
    description: 'Tourist entered high-risk zone near border'
  },
  {
    id: 'ALT-005',
    type: 'Medical Emergency',
    severity: 'critical',
    tourist: 'Anna Johnson',
    touristId: 'YR-T008',
    location: 'Remote Trekking Route, Uttarakhand',
    timestamp: '2024-01-15 12:30:45',
    status: 'investigating',
    description: 'Medical emergency reported via app'
  }
];

export const AlertManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-danger text-danger-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-primary/80 text-primary-foreground';
      case 'low': return 'bg-safe text-safe-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'investigating': return 'bg-primary text-primary-foreground';
      case 'resolved': return 'bg-safe text-safe-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredAlerts = mockAlerts.filter(alert => {
    const matchesSearch = alert.tourist.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const handleViewAlert = (alertId: string) => {
    console.log('Viewing alert:', alertId);
  };

  const handleResolveAlert = (alertId: string) => {
    console.log('Resolving alert:', alertId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Alert Management</h2>
          <p className="text-muted-foreground">Monitor and respond to tourist safety alerts</p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Zap className="h-4 w-4 mr-2" />
          Emergency Protocol
        </Button>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">15</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <div className="w-3 h-3 bg-danger rounded-full animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">3</div>
            <p className="text-xs text-muted-foreground">SOS & Medical emergencies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Investigation</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">8</div>
            <p className="text-xs text-muted-foreground">Currently being handled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-safe" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">42</div>
            <p className="text-xs text-muted-foreground">Successfully handled</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts by tourist, type, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                All Status
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending')}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={filterSeverity === 'critical' ? 'default' : 'outline'}
                onClick={() => setFilterSeverity('critical')}
                size="sm"
              >
                <Filter className="h-4 w-4 mr-1" />
                Critical
              </Button>
            </div>
          </div>

          {/* Alerts Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Tourist</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow key={alert.id} className={alert.severity === 'critical' ? 'bg-danger-light/50' : ''}>
                    <TableCell className="font-medium">{alert.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        {alert.type}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(alert.severity)} variant="secondary">
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{alert.tourist}</p>
                        <p className="text-xs text-muted-foreground">{alert.touristId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{alert.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(alert.status)} variant="secondary">
                        {alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewAlert(alert.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {alert.status === 'pending' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};