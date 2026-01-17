import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ChatInterface from './ChatInterface';
interface ChatButtonProps {
  type: 'customer_support' | 'driver_support' | 'customer_driver';
  userType: 'customer' | 'driver' | 'admin';
  conversationId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  children?: React.ReactNode;
}
const ChatButton: React.FC<ChatButtonProps> = ({
  type,
  userType,
  conversationId,
  variant = 'default',
  size = 'default',
  className,
  children
}) => {
  const [open, setOpen] = useState(false);
  const getButtonText = () => {
    if (children) return children;
    switch (type) {
      case 'customer_support':
        return 'Contact Support';
      case 'driver_support':
        return 'Driver Support';
      case 'customer_driver':
        return 'Chat';
      default:
        return 'Chat';
    }
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getButtonText()}</DialogTitle>
        </DialogHeader>
        <ChatInterface conversationId={conversationId} conversationType={type} currentUserType={userType} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>;
};
export default ChatButton;