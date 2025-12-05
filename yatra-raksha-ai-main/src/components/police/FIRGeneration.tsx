import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Plus, 
  Eye, 
  Download, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Search
} from 'lucide-react';

const mockFIRs = [
  {
    id: 'FIR-2024-001',
    incidentType: 'Tourist Harassment',
    touristName: 'Emma Wilson',
    touristId: 'YR-T002',
    location: 'Goa Beach Resort',
    reportedBy: 'SI Sharma',
    status: 'registered',
    priority: 'medium',
    dateRegistered: '2024-01-15',
    description: 'Tourist reported harassment by local vendors'
  },
  {
    id: 'FIR-2024-002',
    incidentType: 'Emergency SOS',
    touristName: 'Raj Patel',
    touristId: 'YR-T003',
    location: 'Manali Hills, HP',
    reportedBy: 'Auto-Generated',
    status: 'under_investigation',
    priority: 'critical',
    dateRegistered: '2024-01-15',
    description: 'Emergency SOS triggered, tourist found injured during trekking'
  },
  {
    id: 'FIR-2024-003',
    incidentType: 'Theft',
    touristName: 'John Smith',
    touristId: 'YR-T001',
    location: 'Red Fort, Delhi',
    reportedBy: 'Tourist Self-Report',
    status: 'closed',
    priority: 'low',
    dateRegistered: '2024-01-14',
    description: 'Mobile phone and wallet stolen at tourist location'
  }
];

const incidentTypes = [
  'Tourist Harassment',
  'Emergency SOS', 
  'Theft',
  'Medical Emergency',
  'Lost Tourist',
  'Accident',
  'Fraud',
  'Other'
];

export const FIRGeneration = () => {
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    incidentType: '',
    touristName: '',
    touristId: '',
    location: '',
    reportedBy: '',
    priority: '',
    description: ''
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registered': return 'bg-primary text-primary-foreground';
      case 'under_investigation': return 'bg-warning text-warning-foreground';
      case 'closed': return 'bg-safe text-safe-foreground';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-critical text-critical-foreground';
      case 'high': return 'bg-danger text-danger-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-safe text-safe-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredFIRs = mockFIRs.filter(fir => {
    const matchesSearch = fir.touristName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fir.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fir.incidentType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleCreateFIR = () => {
    console.log('Creating FIR with data:', formData);
    // Reset form and close create mode
    setFormData({
      incidentType: '',
      touristName: '',
      touristId: '',
      location: '',
      reportedBy: '',
      priority: '',
      description: ''
    });
    setIsCreateMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Automated FIR Generation</h2>
          <p className="text-muted-foreground">AI-powered First Information Report system for tourist incidents</p>
        </div>
        <Button 
          onClick={() => setIsCreateMode(!isCreateMode)}
          className="bg-critical hover:bg-critical/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          {isCreateMode ? 'Cancel' : 'Create New FIR'}
        </Button>
      </div>

      {/* FIR Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total FIRs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">2,847</div>
            <p className="text-xs text-muted-foreground">+23 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Generated</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">1,892</div>
            <p className="text-xs text-muted-foreground">66.4% automation rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Investigation</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">234</div>
            <p className="text-xs text-muted-foreground">Active cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-safe" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">87.3%</div>
            <p className="text-xs text-muted-foreground">Cases resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Create FIR Form */}
      {isCreateMode && (
        <Card>
          <CardHeader>
            <CardTitle>Create New FIR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="incident-type">Incident Type</Label>
                  <Select value={formData.incidentType} onValueChange={(value) => setFormData({...formData, incidentType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select incident type" />
                    </SelectTrigger>
                    <SelectContent>
                      {incidentTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tourist-name">Tourist Name</Label>
                  <Input
                    id="tourist-name"
                    value={formData.touristName}
                    onChange={(e) => setFormData({...formData, touristName: e.target.value})}
                    placeholder="Enter tourist name"
                  />
                </div>

                <div>
                  <Label htmlFor="tourist-id">Tourist ID</Label>
                  <Input
                    id="tourist-id"
                    value={formData.touristId}
                    onChange={(e) => setFormData({...formData, touristId: e.target.value})}
                    placeholder="YR-T000"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Incident Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Enter location details"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="reported-by">Reported By</Label>
                  <Input
                    id="reported-by"
                    value={formData.reportedBy}
                    onChange={(e) => setFormData({...formData, reportedBy: e.target.value})}
                    placeholder="Officer name or 'Auto-Generated'"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detailed description of the incident..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleCreateFIR}
                  className="w-full bg-critical hover:bg-critical/90"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate FIR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FIR Records */}
      <Card>
        <CardHeader>
          <CardTitle>FIR Records</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FIRs by tourist name, ID, or incident type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Records
            </Button>
          </div>

          {/* FIR Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FIR Number</TableHead>
                  <TableHead>Incident Type</TableHead>
                  <TableHead>Tourist</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFIRs.map((fir) => (
                  <TableRow key={fir.id}>
                    <TableCell className="font-medium">{fir.id}</TableCell>
                    <TableCell>{fir.incidentType}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{fir.touristName}</p>
                        <p className="text-xs text-muted-foreground">{fir.touristId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{fir.location}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(fir.priority)} variant="secondary">
                        {fir.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(fir.status)} variant="secondary">
                        {fir.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{fir.dateRegistered}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
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