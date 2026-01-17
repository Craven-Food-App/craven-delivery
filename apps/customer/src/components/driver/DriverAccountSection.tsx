// @ts-nocheck
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function OnlineDriversList() {
  const [drivers, setDrivers] = useState([]);

  // Load all drivers on mount
  useEffect(() => {
    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from("driver_profiles")
        .select("id, name, is_available");

      if (error) {
        console.error("Error fetching drivers:", error);
        return;
      }
      setDrivers(data);
    };

    fetchDrivers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("driver-availability")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_profiles" },
        (payload) => {
          console.log("Realtime update:", payload);

          setDrivers((prev) => {
            // If row already exists, update it
            const existingIndex = prev.findIndex((d) => d.id === payload.new.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = payload.new;
              return updated;
            }
            // Otherwise add new row
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drivers Online</CardTitle>
      </CardHeader>
      <CardContent>
        {drivers
          .filter((d) => d.is_available) // show only available
          .map((driver) => (
            <div key={driver.id} className="flex items-center justify-between mb-2">
              <span>{driver.name || "Unnamed Driver"}</span>
              <Badge variant="default">Online</Badge>
            </div>
          ))}
        {drivers.filter((d) => d.is_available).length === 0 && (
          <p className="text-sm text-muted-foreground">No drivers online</p>
        )}
      </CardContent>
    </Card>
  );
}
