// src/components/PoliceDashboard.tsx
'use client';

import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import PoliceSidebar from '@/components/PoliceSidebar';
import { PoliceMonitoring } from '@/components/police/PoliceMonitoring';
import { FIRGeneration } from '@/components/police/FIRGeneration';
import { SOSTracking } from '@/components/police/SOSTracking';
import { PoliceAnalytics } from '@/components/police/PoliceAnalytics';
import RealTimeTourists from '@/components/police/RealTimeTourists';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useWebSocket } from '@/context/WebSocketContext';

interface PoliceDashboardProps {
  onLogout: () => void;
  username: string;
}

/**
 * Allowed tab keys. Keep these in sync with PoliceSidebar's menuItems.
 */
type TabKey = 'monitoring' | 'realtime' | 'fir' | 'sos' | 'analytics';

const PoliceDashboard: React.FC<PoliceDashboardProps> = ({ onLogout, username }) => {
  // default to monitoring
  const [activeTab, setActiveTab] = useState<TabKey>('monitoring');

  // optional: access WS to pass down or debug
  const ws = useWebSocket?.();

  const renderContent = () => {
    switch (activeTab) {
      case 'monitoring':
        return <PoliceMonitoring />;
      case 'realtime':
        // THIS RENDERS the RealTimeTourists page (live tourist map & updates)
        return <RealTimeTourists />;
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
        {/*
          PoliceSidebar expects props: activeTab (string) and onTabChange (fn).
          We pass a function that converts any incoming string to our TabKey (best-effort).
        */}
        <PoliceSidebar
          activeTab={activeTab}
          onTabChange={(t: string) => {
            // safety: only allow known tabs
            const allowed: TabKey[] = ['monitoring', 'realtime', 'fir', 'sos', 'analytics'];
            if (allowed.includes(t as TabKey)) setActiveTab(t as TabKey);
            else console.warn('Unknown tab requested:', t);
          }}
        />

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
