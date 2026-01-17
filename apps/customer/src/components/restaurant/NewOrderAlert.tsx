import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NewOrderAlertProps {
  restaurantId: string;
}

export const NewOrderAlert = ({ restaurantId }: NewOrderAlertProps) => {
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const { toast } = useToast();

  const playDingSound = () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // 800 Hz frequency
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  useEffect(() => {
    console.log('Setting up real-time subscription for restaurant:', restaurantId);
    
    // Set up real-time subscription for new orders for this restaurant
    const channel = supabase
      .channel(`new-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          console.log('New order received:', payload);
          setHasNewOrders(true);
          setNewOrderCount(prev => prev + 1);
          playDingSound();
          toast({
            title: "🔔 New Order!",
            description: "You have received a new order. Check the Orders tab for details.",
            duration: 5000,
          });
        }
      )
      .subscribe((status) => {
        console.log('New order subscription status:', status);
      });

    return () => {
      console.log('Cleaning up new order subscription');
      supabase.removeChannel(channel);
    };
  }, [restaurantId, toast]);

  const handleClick = () => {
    setHasNewOrders(false);
    setNewOrderCount(0);
  };

  return (
    <div 
      className="flex items-center gap-2 cursor-pointer" 
      onClick={handleClick}
      title={hasNewOrders ? `${newOrderCount} new order(s)` : 'No new orders'}
    >
      {hasNewOrders ? (
        <>
          <BellRing className="h-6 w-6 text-primary animate-bounce" />
          <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">
            {newOrderCount} New Order{newOrderCount !== 1 ? 's' : ''}!
          </Badge>
        </>
      ) : (
        <div className="flex items-center gap-2 opacity-60">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No new orders</span>
        </div>
      )}
    </div>
  );
};