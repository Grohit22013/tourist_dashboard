// src/components/PoliceSidebar.tsx
'use client';

import React from 'react';
import { 
  Radar, 
  FileText, 
  ScanLine, 
  BarChart3,
  MapPin
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

interface PoliceSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems: { id: string; title: string; icon: React.ComponentType<any> }[] = [
  { id: 'monitoring', title: 'Real-time Monitoring', icon: Radar },
  { id: 'realtime', title: 'Real-time Analytics', icon: BarChart3 }, // new tab (matches PoliceDashboard)
  { id: 'fir', title: 'Ranger Management', icon: FileText },
  { id: 'sos', title: 'Risk Zones', icon: ScanLine },
  { id: 'analytics', title: 'Analytics', icon: MapPin },
];

export function PoliceSidebar({ activeTab, onTabChange }: PoliceSidebarProps) {
  return (
    <aside className="h-screen sticky top-0">
      <Sidebar className="w-64 h-full bg-white border-r">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 py-3 text-sm font-semibold text-slate-700">
              Garuda Police Portal
            </SidebarGroupLabel>

            <SidebarGroupContent className="px-2 pb-4">
              <SidebarMenu>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onTabChange(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-3 w-full text-sm px-3 py-2 rounded-md transition-colors
                          ${active ? 'bg-slate-900 text-white font-medium' : 'text-slate-700 hover:bg-slate-100'}
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </aside>
  );
}

export default PoliceSidebar;
