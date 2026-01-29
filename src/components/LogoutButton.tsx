// components/LogoutButton.tsx
'use client';

import * as React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const LogoutButton: React.FC = () => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Use the server-side signout route to properly clear session and cookies
    window.location.href = '/auth/signout';
  };

  return (
    <Button 
      onClick={handleLogout} 
      variant="outline" 
      size="sm"
      className="flex items-center gap-2"
      disabled={isLoggingOut}
    >
      <LogOut className="h-4 w-4" />
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </Button>
  );
};