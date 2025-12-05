import { useState } from 'react';
import Login from '@/components/Login';
import TourismDashboard from '@/components/TourismDashboard';
import PoliceDashboard from '@/components/PoliceDashboard';

interface User {
  type: 'tourism' | 'police';
  username: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (userType: 'tourism' | 'police', credentials: { username: string; password: string }) => {
    // Simulated authentication - in a real app, this would validate credentials
    setUser({ type: userType, username: credentials.username });
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.type === 'tourism') {
    return <TourismDashboard onLogout={handleLogout} username={user.username} />;
  }

  return <PoliceDashboard onLogout={handleLogout} username={user.username} />;
};

export default Index;
