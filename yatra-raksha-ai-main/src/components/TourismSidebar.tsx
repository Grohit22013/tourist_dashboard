import { 
  Monitor, 
  Users, 
  AlertCircle, 
  MapPin, 
  BarChart3, 
  Shield 
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

interface TourismSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'monitoring', title: 'Live Monitoring', icon: Monitor },
  { id: 'tourists', title: 'Tourist Management', icon: Users },
  { id: 'alerts', title: 'Alert Management', icon: AlertCircle },
  { id: 'zones', title: 'Zone Management', icon: MapPin },
  { id: 'analytics', title: 'Analytics', icon: BarChart3 },
  { id: 'blockchain', title: 'Blockchain Verify', icon: Shield },
];

export function TourismSidebar({ activeTab, onTabChange }: TourismSidebarProps) {
  const { state } = useSidebar();

  return (
    <Sidebar className="w-64" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">
            Tourism Board Portal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => onTabChange(item.id)}
                    className={`
                      ${activeTab === item.id 
                        ? 'bg-primary text-primary-foreground font-medium' 
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