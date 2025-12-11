import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, MapPin, AlertTriangle } from 'lucide-react';

interface LoginProps {
  onLogin: (userType: 'tourism' | 'police', credentials: { username: string; password: string }) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState('police');

  const handleSubmit = (e: React.FormEvent, userType: 'tourism' | 'police') => {
    e.preventDefault();
    onLogin(userType, credentials);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-safe/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-primary">YatraRaksha</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Tourist Safety System</p>
            </div>
          </div>
        </div>

        <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Secure Access Portal</CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              
              {/* --- CENTERED TAB LIST --- */}
              <TabsList className="flex w-full justify-center mb-6">
                <TabsTrigger value="police" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Police Force
                </TabsTrigger>
              </TabsList>

              <TabsContent value="police">
                <form onSubmit={(e) => handleSubmit(e, 'police')} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="police-username">Police ID / Badge Number</Label>
                    <Input
                      id="police-username"
                      type="text"
                      placeholder="Enter your police badge ID"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="police-password">Secure Password</Label>
                    <Input
                      id="police-password"
                      type="password"
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full bg-critical hover:bg-critical/90">
                    Access Garuda Dashboard
                  </Button>
                </form>
              </TabsContent>

            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Authorized personnel only. All access is monitored and logged.</p>
            </div>
          </CardContent>
        </Card>

        {/* Features Footer */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
          <div className="bg-safe-light p-3 rounded-lg">
            <MapPin className="h-6 w-6 text-safe mx-auto mb-2" />
            <p className="text-xs font-medium">Real-time Geo-tracking</p>
          </div>
          <div className="bg-warning-light p-3 rounded-lg">
            <Shield className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-xs font-medium">Blockchain Security</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
