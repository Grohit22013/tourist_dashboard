import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Shield, AlertTriangle } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  userType: string;
  username: string;
  onLogout: () => void;
}

export const DashboardHeader = ({ title, subtitle, userType, username, onLogout }: DashboardHeaderProps) => {
  const isPolice = userType === 'Police Force';
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8" />
          <div className="flex items-center gap-3">
            {isPolice ? (
              <AlertTriangle className="h-8 w-8 text-critical" />
            ) : (
              <Shield className="h-8 w-8 text-primary" />
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <Badge variant="outline" className="bg-safe-light text-safe border-safe/20">
            <div className="w-2 h-2 bg-safe rounded-full mr-2 animate-pulse" />
            System Online
          </Badge>

          {/* User Info */}
          <div className="flex items-center gap-3 px-4 py-2 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">{username}</p>
                <p className="text-xs text-muted-foreground">{userType}</p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};