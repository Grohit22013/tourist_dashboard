import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TourismSidebar } from '@/components/TourismSidebar';
import { LiveMonitoring } from '@/components/tourism/LiveMonitoring';
import { TouristManagement } from '@/components/tourism/TouristManagement';
import { AlertManagement } from '@/components/tourism/AlertManagement';
import { ZoneManagement } from '@/components/tourism/ZoneManagement';
import { Analytics } from '@/components/tourism/Analytics';
import { BlockchainVerify } from '@/components/tourism/BlockchainVerify';
import { DashboardHeader } from '@/components/DashboardHeader';

interface TourismDashboardProps {
  onLogout: () => void;
  username: string;
}

const TourismDashboard = ({ onLogout, username }: TourismDashboardProps) => {
  const [activeTab, setActiveTab] = useState('monitoring');

  const renderContent = () => {
    switch (activeTab) {
      case 'monitoring':
        return <LiveMonitoring />;
      case 'tourists':
        return <TouristManagement />;
      case 'alerts':
        return <AlertManagement />;
      case 'zones':
        return <ZoneManagement />;
      case 'analytics':
        return <Analytics />;
      case 'blockchain':
        return <BlockchainVerify />;
      default:
        return <LiveMonitoring />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <TourismSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 flex flex-col">
          <DashboardHeader 
            title="YatraRaksha Tourism Board Dashboard"
            subtitle="Real-time Tourist Safety Monitoring & Management"
            userType="Tourism Board"
            username={username}
            onLogout={onLogout}
          />
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default TourismDashboard;