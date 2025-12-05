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
  MapPin, 
  AlertTriangle, 
  Shield, 
  Search,
  Plus,
  Edit,
  Eye,
  Users
} from 'lucide-react';

const mockZones = [
  {
    id: 'ZONE-001',
    name: 'Red Fort Complex',
    state: 'Delhi',
    riskLevel: 'low',
    category: 'Heritage Site',
    activeTourists: 145,
    geofenceRadius: 500,
    status: 'active',
    lastUpdated: '2024-01-15',
    description: 'UNESCO World Heritage site with high security'
  },
  {
    id: 'ZONE-002',
    name: 'Kashmir Valley Border',
    state: 'Jammu & Kashmir',
    riskLevel: 'critical',
    category: 'Border Area',
    activeTourists: 12,
    geofenceRadius: 2000,
    status: 'restricted',
    lastUpdated: '2024-01-15',
    description: 'High-risk border area requiring special permissions'
  },
  {
    id: 'ZONE-003',
    name: 'Goa Beach Resorts',
    state: 'Goa',
    riskLevel: 'medium',
    category: 'Tourist Hub',
    activeTourists: 892,
    geofenceRadius: 1000,
    status: 'active',
    lastUpdated: '2024-01-14',
    description: 'Popular beach destination with moderate safety concerns'
  },
  {
    id: 'ZONE-004',
    name: 'Manali Adventure Trails',
    state: 'Himachal Pradesh',
    riskLevel: 'high',
    category: 'Adventure Zone',
    activeTourists: 234,
    geofenceRadius: 1500,
    status: 'monitoring',
    lastUpdated: '2024-01-14',
    description: 'Mountain trekking routes with weather-related risks'
  },
  {
    id: 'ZONE-005',
    name: 'Jaipur City Palace',
    state: 'Rajasthan',
    riskLevel: 'low',
    category: 'Heritage Site',
    activeTourists: 567,
    geofenceRadius: 300,
    status: 'active',
    lastUpdated: '2024-01-13',
    description: 'Well-secured heritage site with good infrastructure'
  }
];

export const ZoneManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-safe text-safe-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'high': return 'bg-danger text-danger-foreground';
      case 'critical': return 'bg-critical text-critical-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-safe text-safe-foreground';
      case 'monitoring': return 'bg-warning text-warning-foreground';
      case 'restricted': return 'bg-danger text-danger-foreground';
      case 'inactive': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredZones = mockZones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         zone.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         zone.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRisk === 'all' || zone.riskLevel === filterRisk;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Zone Management</h2>
          <p className="text-muted-foreground">Monitor and manage tourist safety zones across India</p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-2" />
          Add New Zone
        </Button>
      </div>

      {/* Zone Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">2,847</div>
            <p className="text-xs text-muted-foreground">Across all states</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safe Zones</CardTitle>
            <div className="w-3 h-3 bg-safe rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">2,234</div>
            <p className="text-xs text-muted-foreground">78.5% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <div className="w-3 h-3 bg-warning rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">456</div>
            <p className="text-xs text-muted-foreground">16.0% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <div className="w-3 h-3 bg-danger rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">134</div>
            <p className="text-xs text-muted-foreground">4.7% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Zones</CardTitle>
            <AlertTriangle className="h-4 w-4 text-critical" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-critical">23</div>
            <p className="text-xs text-muted-foreground">0.8% - Border areas</p>
          </CardContent>
        </Card>
      </div>

      {/* Zone Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Database</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search zones by name, state, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterRisk === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterRisk('all')}
                size="sm"
              >
                All Risk Levels
              </Button>
              <Button
                variant={filterRisk === 'low' ? 'default' : 'outline'}
                onClick={() => setFilterRisk('low')}
                size="sm"
              >
                Safe
              </Button>
              <Button
                variant={filterRisk === 'medium' ? 'default' : 'outline'}
                onClick={() => setFilterRisk('medium')}
                size="sm"
              >
                Medium
              </Button>
              <Button
                variant={filterRisk === 'high' ? 'default' : 'outline'}
                onClick={() => setFilterRisk('high')}
                size="sm"
              >
                High Risk
              </Button>
              <Button
                variant={filterRisk === 'critical' ? 'default' : 'outline'}
                onClick={() => setFilterRisk('critical')}
                size="sm"
              >
                Critical
              </Button>
            </div>
          </div>

          {/* Zones Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone ID</TableHead>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Active Tourists</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredZones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{zone.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Radius: {zone.geofenceRadius}m
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{zone.state}</TableCell>
                    <TableCell>
                      <Badge className={getRiskColor(zone.riskLevel)} variant="secondary">
                        {zone.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {zone.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{zone.activeTourists}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(zone.status)} variant="secondary">
                        {zone.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
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