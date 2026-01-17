import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AvailabilityDropdownProps {
  itemId: string;
  currentStatus: boolean;
  onUpdate: () => void;
}

export default function AvailabilityDropdown({
  itemId,
  currentStatus,
  onUpdate,
}: AvailabilityDropdownProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateAvailability = async (newStatus: boolean) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: newStatus })
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Item is now ${newStatus ? "available" : "unavailable"}.`,
      });

      onUpdate();
    } catch (error) {
      console.error("Error updating availability:", error);
      toast({
        title: "Error",
        description: "Failed to update item status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-2 hover:bg-muted"
          disabled={isUpdating}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              currentStatus ? "bg-green-600" : "bg-gray-400"
            }`}
          />
          <span className="text-sm">
            {currentStatus ? "Available" : "Unavailable"}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48 bg-background">
        <DropdownMenuItem
          onClick={() => updateAvailability(true)}
          className="cursor-pointer"
        >
          <span className="h-2 w-2 rounded-full bg-green-600 mr-2" />
          <span>Available</span>
          {currentStatus && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateAvailability(false)}
          className="cursor-pointer"
        >
          <span className="h-2 w-2 rounded-full bg-gray-400 mr-2" />
          <span>Unavailable</span>
          {!currentStatus && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
