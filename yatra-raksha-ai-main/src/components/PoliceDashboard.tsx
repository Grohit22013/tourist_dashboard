import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PoliceSidebar } from '@/components/PoliceSidebar';
import { PoliceMonitoring } from '@/components/police/PoliceMonitoring';
import { FIRGeneration } from '@/components/police/FIRGeneration';
import { SOSTracking } from '@/components/police/SOSTracking';
import { PoliceAnalytics } from '@/components/police/PoliceAnalytics';
import { DashboardHeader } from '@/components/DashboardHeader';

interface PoliceDashboardProps {
  onLogout: () => void;
  username: string;
}

const PoliceDashboard = ({ onLogout, username }: PoliceDashboardProps) => {
  const [activeTab, setActiveTab] = useState('monitoring');

  const renderContent = () => {
    switch (activeTab) {
      case 'monitoring':
        return <PoliceMonitoring />;
      case 'fir':
        return <FIRGeneration />;
      case 'sos':
        return <SOSTracking />;
      case 'analytics':
        return <PoliceAnalytics />;
      default:
        return <PoliceMonitoring />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PoliceSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 flex flex-col">
          <DashboardHeader 
            title="Garuda Police Dashboard"
            subtitle="Emergency Response & Law Enforcement Portal"
            userType="Police Force"
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

export default PoliceDashboard;