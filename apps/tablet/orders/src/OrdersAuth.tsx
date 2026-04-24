import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Loader, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { supabase } from "@root/integrations/supabase/client";
import cravenLogo from "@root/assets/craven-logo.png";

function clearSupabaseStorage() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) localStorage.removeItem(key);
    });
  } catch {}
}

async function redirectAfterAuth(userId: string, navigate: ReturnType<typeof useNavigate>) {
  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  navigate(data?.length ? "/live-orders" : "/restaurant/register", { replace: true });
}

export default function OrdersAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        await redirectAfterAuth(user.id, navigate);
      }
      setChecking(false);
    })();
  }, [navigate]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      notifications.show({
        title: "Missing fields",
        message: "Enter your merchant email and password.",
        color: "red"
      });
      return;
    }
    setLoading(true);
    try {
      clearSupabaseStorage();
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch {}
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error || !data.user) throw error || new Error("Sign in failed");
      notifications.show({ title: "Signed in", message: "Opening Live Orders.", color: "green" });
      await redirectAfterAuth(data.user.id, navigate);
    } catch (err: unknown) {
      notifications.show({
        title: "Sign in failed",
        message: err instanceof Error ? err.message : "Could not sign in.",
        color: "red"
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Box style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader color="orange" />
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Box style={{ width: "100%", maxWidth: 360 }}>
        <Stack gap="lg">
          <img src={cravenLogo} alt="Crave'n" style={{ width: 220, margin: "0 auto", display: "block" }} />
          <Text fw={700} ta="center" size="lg">
            Live Orders Sign In
          </Text>
          <form onSubmit={onSignIn}>
            <Stack gap="md">
              <TextInput
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                autoComplete="email"
                required
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                autoComplete="current-password"
                required
              />
              <Button type="submit" color="orange" loading={loading} fullWidth>
                Open Live Orders
              </Button>
            </Stack>
          </form>
        </Stack>
      </Box>
    </Box>
  );
}
