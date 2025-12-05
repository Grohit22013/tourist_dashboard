'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ScanLine, 
  MapPin, 
  Clock, 
  User, 
  Phone,
  AlertTriangle,
  CheckCircle,
  Search,
  Zap,
  Activity,
  Navigation
} from 'lucide-react';

type SOSStatus = 'active' | 'responding' | 'resolved' | 'false_alarm';
type Priority = 'critical' | 'high' | 'medium' | 'low';

type SOSAlert = {
  id: string;
  touristName: string;
  touristId: string;
  phoneNumber: string;
  location: string;
  coordinates: string;
  alertTime: string;
  responseTime: string | null;
  status: SOSStatus;
  priority: Priority;
  assignedUnit: string;
  alertType: string;
  lastKnownStatus: string;
};

const mockSOSAlerts: SOSAlert[] = [
  {
    id: 'SOS-001',
    touristName: 'ROHIT',
    touristId: 'YR-T001',
    phoneNumber: '+91 98848 50367',
    location: 'Hyderabad, Telangana (Geofenced Zone)',
    coordinates: '17.3616° N, 78.4747° E',
    alertTime: '2024-01-15 14:30:25',
    responseTime: null,
    status: 'active',
    priority: 'critical',
    assignedUnit: 'Unit-TS-01',
    alertType: 'Mobile App SOS',
    lastKnownStatus: 'Stationary - Geofenced'
  },
  {
    id: 'SOS-002',
    touristName: 'Raj Patel',
    touristId: 'YR-T003',
    phoneNumber: '+91-9876543210',
    location: 'Manali Hills, Himachal Pradesh',
    coordinates: '32.2432° N, 77.1892° E',
    alertTime: '2024-01-15 14:30:25',
    responseTime: null,
    status: 'active',
    priority: 'critical',
    assignedUnit: 'Unit-HP-07',
    alertType: 'Emergency Button',
    lastKnownStatus: 'Moving'
  },
  {
    id: 'SOS-003',
    touristName: 'Anna Johnson',
    touristId: 'YR-T008',
    phoneNumber: '+1-555-0123',
    location: 'Trekking Route, Uttarakhand',
    coordinates: '30.0668° N, 79.0193° E',
    alertTime: '2024-01-15 14:25:10',
    responseTime: '3.2 min',
    status: 'responding',
    priority: 'critical',
    assignedUnit: 'Unit-UK-12',
    alertType: 'Medical Emergency',
    lastKnownStatus: 'Stationary'
  },
  {
    id: 'SOS-004',
    touristName: 'Mike Brown',
    touristId: 'YR-T005',
    phoneNumber: '+44-7700-900123',
    location: 'Kashmir Valley, J&K',
    coordinates: '34.0837° N, 74.7973° E',
    alertTime: '2024-01-15 13:45:30',
    responseTime: '2.8 min',
    status: 'resolved',
    priority: 'high',
    assignedUnit: 'Unit-JK-03',
    alertType: 'Panic Button',
    lastKnownStatus: 'Safe'
  },
  {
    id: 'SOS-005',
    touristName: 'Lisa Chen',
    touristId: 'YR-T006',
    phoneNumber: '+86-138-0013-8000',
    location: 'Delhi Airport Area',
    coordinates: '28.5562° N, 77.1000° E',
    alertTime: '2024-01-15 13:20:15',
    responseTime: '4.1 min',
    status: 'false_alarm',
    priority: 'medium',
    assignedUnit: 'Unit-DL-15',
    alertType: 'Accidental Press',
    lastKnownStatus: 'Moving'
  }
];

export const SOSTracking = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SOSStatus>('all');

  const getStatusColor = (status: SOSStatus) => {
    switch (status) {
      case 'active': return 'bg-critical text-critical-foreground animate-pulse';
      case 'responding': return 'bg-warning text-warning-foreground';
      case 'resolved': return 'bg-safe text-safe-foreground';
      case 'false_alarm': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return 'bg-critical text-critical-foreground';
      case 'high': return 'bg-danger text-danger-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-safe text-safe-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: SOSStatus) => {
    switch (status) {
      case 'active': return <ScanLine className="h-4 w-4 animate-pulse" />;
      case 'responding': return <Activity className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'false_alarm': return <AlertTriangle className="h-4 w-4" />;
      default: return <ScanLine className="h-4 w-4" />;
    }
  };

  const filteredAlerts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return mockSOSAlerts.filter(alert => {
      const matchesSearch =
        alert.touristName.toLowerCase().includes(term) ||
        alert.touristId.toLowerCase().includes(term) ||
        alert.location.toLowerCase().includes(term);
      const matchesFilter = filterStatus === 'all' || alert.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filterStatus]);

  const handleTrackLocation = (alertId: string) => {
    console.log('Tracking location for alert:', alertId);
  };

  const handleDispatchUnit = (alertId: string) => {
    console.log('Dispatching unit for alert:', alertId);
  };

  const handleMarkResolved = (alertId: string) => {
    console.log('Marking alert as resolved:', alertId);
  };

  // --- Map section data for ROHIT (SOS-001) ---
  const rohitLat = 17.3616;
  const rohitLng = 78.4747;

  // Create a small bounding box around Rohit's coordinates for the OSM embed
  const bboxPad = 0.04; // degrees ~ a few km
  const left = rohitLng - bboxPad;
  const right = rohitLng + bboxPad;
  const top = rohitLat + bboxPad;
  const bottom = rohitLat - bboxPad;

  // OSM embed URL with marker at Rohit’s location
  const osmEmbedUrl = useMemo(() => {
    const base = 'https://www.openstreetmap.org/export/embed.html';
    const params = new URLSearchParams({
      bbox: `${left},${bottom},${right},${top}`,
      layer: 'mapnik',
      marker: `${rohitLat},${rohitLng}`
    }).toString();
    return `${base}?${params}`;
  }, [left, right, top, bottom, rohitLat, rohitLng]);

  const osmViewUrl = `https://www.openstreetmap.org/?mlat=${rohitLat}&mlon=${rohitLng}#map=15/${rohitLat}/${rohitLng}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">SOS Alert Tracking</h2>
          <p className="text-muted-foreground">Real-time monitoring and response to tourist emergency alerts</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-critical hover:bg-critical/90">
            <Zap className="h-4 w-4 mr-2" />
            Emergency Broadcast
          </Button>
        </div>
      </div>

      {/* SOS Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SOS</CardTitle>
            <ScanLine className="h-4 w-4 text-critical animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-critical">7</div>
            <p className="text-xs text-muted-foreground">Requires immediate response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responding Units</CardTitle>
            <Activity className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">12</div>
            <p className="text-xs text-muted-foreground">En route to incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-safe" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">34</div>
            <p className="text-xs text-muted-foreground">Successfully handled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">3.4min</div>
            <p className="text-xs text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">False Alarms</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">8.2%</div>
            <p className="text-xs text-muted-foreground">Of total alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Active SOS Map View (ROHIT @ 17.3616, 78.4747) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Live SOS Location Tracking
          </CardTitle>
          <Badge className="bg-critical text-critical-foreground">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            REAL-TIME
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="relative w-full aspect-video">
              {/* Embedded OpenStreetMap centered on ROHIT with a marker */}
              <iframe
                title="ROHIT - Live SOS Location"
                src={osmEmbedUrl}
                className="absolute inset-0 h-full w-full"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/30">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-critical rounded-full animate-pulse" />
                  <span className="text-xs">Active SOS (ROHIT)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full" />
                  <span className="text-xs">Police Units</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-safe rounded-full" />
                  <span className="text-xs">Safe Zones</span>
                </div>
              </div>
              <a
                href={osmViewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline underline-offset-2 text-primary"
              >
                Open in OpenStreetMap
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOS Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>SOS Alert Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tourist name, ID, or location..."
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
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('active')}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={filterStatus === 'responding' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('responding')}
                size="sm"
              >
                Responding
              </Button>
            </div>
          </div>

          {/* SOS Alerts Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert ID</TableHead>
                  <TableHead>Tourist</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Alert Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow key={alert.id} className={alert.status === 'active' ? 'bg-critical/5' : ''}>
                    <TableCell className="font-medium">{alert.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{alert.touristName}</p>
                          <p className="text-xs text-muted-foreground">{alert.touristId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{alert.phoneNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{alert.location}</p>
                          <p className="text-xs text-muted-foreground">{alert.coordinates}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {alert.alertType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(alert.priority)} variant="secondary">
                        {alert.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(alert.status)}
                        <Badge className={getStatusColor(alert.status)} variant="secondary">
                          {alert.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {alert.responseTime || 'Pending'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleTrackLocation(alert.id)}
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                        {alert.status === 'active' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDispatchUnit(alert.id)}
                            className="text-critical border-critical hover:bg-critical hover:text-critical-foreground"
                          >
                            Dispatch
                          </Button>
                        )}
                        {alert.status === 'responding' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMarkResolved(alert.id)}
                            className="text-safe border-safe hover:bg-safe hover:text-safe-foreground"
                          >
                            Resolve
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
