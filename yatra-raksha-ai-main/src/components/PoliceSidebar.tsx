import { 
  Radar, 
  FileText, 
  ScanLine, 
  BarChart3 
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
  useSidebar,
} from '@/components/ui/sidebar';

interface PoliceSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'monitoring', title: 'Real-time Monitoring', icon: Radar },
  { id: 'fir', title: 'RangerManagement', icon: FileText },
  { id: 'sos', title: 'RiskZone', icon: ScanLine },
  { id: 'analytics', title: 'Analytics', icon: BarChart3 },
];

export function PoliceSidebar({ activeTab, onTabChange }: PoliceSidebarProps) {
  const { state } = useSidebar();

  return (
    <Sidebar className="w-64" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-critical font-semibold">
            Garuda Police Portal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => onTabChange(item.id)}
                    className={`
                      ${activeTab === item.id 
                        ? 'bg-critical text-critical-foreground font-medium' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}