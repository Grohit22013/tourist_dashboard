import { useState } from 'react';
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
  Search, 
  Filter, 
  Eye, 
  MapPin, 
  Clock,
  Download,
  Users
} from 'lucide-react';

const mockTourists = [
  {
    id: 'YR-T001',
    name: 'John Smith',
    riskLevel: 'low',
    status: 'active',
    location: 'Red Fort, Delhi',
    lastUpdate: '2 min ago',
    joinDate: '2024-01-15'
  },
  {
    id: 'YR-T002', 
    name: 'Emma Wilson',
    riskLevel: 'medium',
    status: 'warning',
    location: 'Goa Beach Resort',
    lastUpdate: '5 min ago',
    joinDate: '2024-01-14'
  },
  {
    id: 'YR-T003',
    name: 'Raj Patel',
    riskLevel: 'high',
    status: 'danger',
    location: 'Manali Hills',
    lastUpdate: '1 min ago',
    joinDate: '2024-01-13'
  },
  {
    id: 'YR-T004',
    name: 'Sarah Johnson',
    riskLevel: 'low',
    status: 'active',
    location: 'Jaipur City Palace',
    lastUpdate: '3 min ago',
    joinDate: '2024-01-12'
  },
  {
    id: 'YR-T005',
    name: 'Mike Brown',
    riskLevel: 'medium',
    status: 'offline',
    location: 'Kashmir Valley',
    lastUpdate: '45 min ago',
    joinDate: '2024-01-11'
  },
  {
    id: 'YR-T006',
    name: 'Lisa Chen',
    riskLevel: 'low',
    status: 'active',
    location: 'Bangalore Tech Park',
    lastUpdate: '8 min ago',
    joinDate: '2024-01-10'
  }
];

export const TouristManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-safe text-safe-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'high': return 'bg-danger text-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-safe text-safe-foreground';
      case 'warning': return 'bg-warning text-warning-foreground'; 
      case 'danger': return 'bg-danger text-danger-foreground';
      case 'offline': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredTourists = mockTourists.filter(tourist => {
    const matchesSearch = tourist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tourist.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tourist.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRisk === 'all' || tourist.riskLevel === filterRisk;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tourist Management</h2>
          <p className="text-muted-foreground">Monitor and track all registered tourists</p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tourists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">1,247</div>
            <p className="text-xs text-muted-foreground">Active registrations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <div className="w-3 h-3 bg-safe rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">1,089</div>
            <p className="text-xs text-muted-foreground">87.3% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <div className="w-3 h-3 bg-warning rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">135</div>
            <p className="text-xs text-muted-foreground">10.8% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <div className="w-3 h-3 bg-danger rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">23</div>
            <p className="text-xs text-muted-foreground">1.9% of total</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Tourist Database</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or location..."
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
                <Filter className="h-4 w-4 mr-1" />
                Low Risk
              </Button>
              <Button
                variant={filterRisk === 'medium' ? 'default' : 'outline'}
                onClick={() => setFilterRisk('medium')}
                size="sm"
              >
                Medium Risk
              </Button>
              <Button
                variant={filterRisk === 'high' ? 'default' : 'outline'}
                onClick={() => setFilterRisk('high')}
                size="sm"
              >
                High Risk
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tourist ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Location</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTourists.map((tourist) => (
                  <TableRow key={tourist.id}>
                    <TableCell className="font-medium">{tourist.id}</TableCell>
                    <TableCell>{tourist.name}</TableCell>
                    <TableCell>
                      <Badge className={getRiskColor(tourist.riskLevel)} variant="secondary">
                        {tourist.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(tourist.status)} variant="secondary">
                        {tourist.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tourist.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tourist.lastUpdate}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
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