import { LogOut, Settings } from 'lucide-react';
import { logout } from '../services/authService';

interface NavButtonsProps {
  onSettingsClick: () => void;
}

export const NavButtons = ({ onSettingsClick }: NavButtonsProps) => {
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className='absolute top-4 right-4 flex gap-2'>
      <button
        onClick={onSettingsClick}
        className='text-gray-400 hover:text-blue-400 transition-colors'
        title="Settings"
      >
        <Settings size={20} />
      </button>
      <button
        onClick={handleLogout}
        className='text-gray-400 hover:text-red-400 transition-colors'
        title="Logout"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}; 
