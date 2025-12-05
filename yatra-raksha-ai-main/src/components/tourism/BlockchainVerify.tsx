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
  Shield, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock,
  Scan,
  Hash,
  Database
} from 'lucide-react';

const mockVerifications = [
  {
    id: 'BC-001',
    touristId: 'YR-T001',
    touristName: 'John Smith',
    blockchainHash: '0x3a7bd0e23c5c9b8d7f2e1a4c8b5d9e2f7a3c8b1d',
    verificationStatus: 'verified',
    timestamp: '2024-01-15 14:30:25',
    verifySource: 'Aadhaar Digital',
    trustScore: 98
  },
  {
    id: 'BC-002',
    touristId: 'YR-T002',
    touristName: 'Emma Wilson', 
    blockchainHash: '0x7c2e9b5d8a1f4e3b9c7d2a5e8b4f1c6d9a2e5b8c',
    verificationStatus: 'pending',
    timestamp: '2024-01-15 14:25:10',
    verifySource: 'Passport Digital',
    trustScore: 85
  },
  {
    id: 'BC-003',
    touristId: 'YR-T003',
    touristName: 'Raj Patel',
    blockchainHash: '0x9b4c7e2a5d8f1b6c9a3e7d2b5f8c1a4e7b9c2d5f',
    verificationStatus: 'failed',
    timestamp: '2024-01-15 14:20:45',
    verifySource: 'Digital ID Card',
    trustScore: 32
  },
  {
    id: 'BC-004',
    touristId: 'YR-T004',
    touristName: 'Sarah Johnson',
    blockchainHash: '0x5f8c2a7e4b9d1c6f3a8e5b2d7c9a1f4e8b3c6d9a',
    verificationStatus: 'verified',
    timestamp: '2024-01-15 13:45:30',
    verifySource: 'Biometric Scan',
    trustScore: 96
  }
];

export const BlockchainVerify = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [manualHash, setManualHash] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-safe text-safe-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'failed': return 'bg-danger text-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-safe';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
  };

  const filteredVerifications = mockVerifications.filter(verification => {
    const matchesSearch = verification.touristName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         verification.touristId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         verification.blockchainHash.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleManualVerify = () => {
    if (manualHash) {
      console.log('Manual verification requested for hash:', manualHash);
      // Simulated verification logic would go here
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Blockchain Identity Verification</h2>
          <p className="text-muted-foreground">Secure digital identity verification using blockchain technology</p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Shield className="h-4 w-4 mr-2" />
          Verify New Identity
        </Button>
      </div>

      {/* Verification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">12,847</div>
            <p className="text-xs text-muted-foreground">Identity records on blockchain</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Identities</CardTitle>
            <CheckCircle className="h-4 w-4 text-safe" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">11,923</div>
            <p className="text-xs text-muted-foreground">92.8% verification rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">234</div>
            <p className="text-xs text-muted-foreground">Awaiting manual review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Verifications</CardTitle>
            <XCircle className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">690</div>
            <p className="text-xs text-muted-foreground">Requires re-verification</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Manual Hash Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Blockchain Hash</label>
              <Input
                placeholder="Enter blockchain hash to verify..."
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <Button 
              onClick={handleManualVerify}
              className="w-full bg-primary hover:bg-primary-hover"
              disabled={!manualHash}
            >
              <Hash className="h-4 w-4 mr-2" />
              Verify Hash
            </Button>
            
            {/* Verification Result Display */}
            <div className="mt-4 p-4 bg-safe-light rounded-lg border-l-4 border-l-safe">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-safe" />
                <span className="font-medium text-safe">Verification Result</span>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Status:</span> Ready to verify</p>
                <p><span className="font-medium">Chain:</span> YatraRaksha Blockchain</p>
                <p><span className="font-medium">Network:</span> Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blockchain Network Status */}
        <Card>
          <CardHeader>
            <CardTitle>Blockchain Network Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Network Health</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-safe rounded-full animate-pulse"></div>
                <span className="text-sm text-safe">Healthy</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Block Height</span>
              <span className="text-sm font-mono">2,847,392</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Gas Fee</span>
              <span className="text-sm font-mono">0.0023 ETH</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Confirmation Time</span>
              <span className="text-sm">~15 seconds</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Active Nodes</span>
              <span className="text-sm text-safe">847 nodes</span>
            </div>
          </CardContent>
        </Card>

        {/* Security Features */}
        <Card>
          <CardHeader>
            <CardTitle>Security Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-safe-light rounded-lg">
                <Shield className="h-5 w-5 text-safe" />
                <div>
                  <p className="font-medium text-safe">256-bit Encryption</p>
                  <p className="text-xs text-muted-foreground">Military-grade security</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-primary">Immutable Records</p>
                  <p className="text-xs text-muted-foreground">Tamper-proof storage</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-warning-light rounded-lg">
                <Hash className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-warning">Smart Contracts</p>
                  <p className="text-xs text-muted-foreground">Automated verification</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Verification Records</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or blockchain hash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Verification Records Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tourist ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Blockchain Hash</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Verification Source</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVerifications.map((verification) => (
                  <TableRow key={verification.id}>
                    <TableCell className="font-medium">{verification.touristId}</TableCell>
                    <TableCell>{verification.touristName}</TableCell>
                    <TableCell>
                      <div className="font-mono text-xs bg-muted/50 p-1 rounded">
                        {verification.blockchainHash.substring(0, 20)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(verification.verificationStatus)} variant="secondary">
                        {verification.verificationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${getTrustScoreColor(verification.trustScore)}`}>
                          {verification.trustScore}%
                        </span>
                        <div className="w-16 h-2 bg-muted rounded-full">
                          <div 
                            className={`h-2 rounded-full ${
                              verification.trustScore >= 90 ? 'bg-safe' :
                              verification.trustScore >= 70 ? 'bg-warning' : 'bg-danger'
                            }`}
                            style={{ width: `${verification.trustScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {verification.verifySource}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(verification.timestamp).toLocaleDateString()}
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