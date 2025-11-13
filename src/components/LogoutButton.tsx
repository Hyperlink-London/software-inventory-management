// components/LogoutButton.tsx
'use client';

import * as React from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; // Ensure this path is correct
import { Button } from '@/components/ui/button'; // Assuming shadcn Button

export const LogoutButton: React.FC = () => {
  const handleLogout = async () => {
    try {
      // Calls the Supabase signOut method
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error logging out:', error);
        alert('Failed to log out. Please try again.');
      } else {
        // Optional: Redirect the user or show a success message
        console.log('User logged out successfully.');
      }
    } catch (e) {
      console.error('Logout Exception:', e);
    }
  };

  return (
    <Button 
      onClick={handleLogout} 
      variant="outline" 
      size="sm"
      className="flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  );
};