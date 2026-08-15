import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Loader, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { supabase } from "@root/integrations/supabase/client";
import cxLogo from "@root/assets/cx-logo.png";
import { resolveCourierRestaurant } from "@tablet/resolveCourierRestaurant";

function clearSupabaseStorage() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) localStorage.removeItem(key);
    });
  } catch {
    /* ignore */
  }
}

async function enterOpsOrFail(
  userId: string,
  navigate: ReturnType<typeof useNavigate>,
  opts?: { signOutOnFail?: boolean }
) {
  const resolved = await resolveCourierRestaurant(userId);
  if (!resolved.ok) {
    if (opts?.signOutOnFail !== false) {
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch {
        /* ignore */
      }
    }
    throw new Error(resolved.error);
  }
  navigate("/cx-ops", { replace: true });
}

export default function CXAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          await enterOpsOrFail(user.id, navigate, { signOutOnFail: true });
        } catch (err: unknown) {
          notifications.show({
            title: "Not a CX account",
            message: err instanceof Error ? err.message : "Courier account required.",
            color: "red",
          });
        }
      }
      setChecking(false);
    })();
  }, [navigate]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      notifications.show({
        title: "Missing fields",
        message: "Enter your CX courier email and password.",
        color: "red",
      });
      return;
    }
    setLoading(true);
    try {
      clearSupabaseStorage();
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch {
        /* ignore */
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) throw error || new Error("Sign in failed");
      await enterOpsOrFail(data.user.id, navigate, { signOutOnFail: true });
      notifications.show({
        title: "Signed in",
        message: "Opening CX ops.",
        color: "green",
      });
    } catch (err: unknown) {
      notifications.show({
        title: "Sign in failed",
        message: err instanceof Error ? err.message : "Could not sign in.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
        }}
      >
        <Loader color="orange" />
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        background: "linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #111827 100%)",
      }}
    >
      <Box style={{ width: "100%", maxWidth: 400 }}>
        <Stack gap="lg">
          <img
            src={cxLogo}
            alt="Crave'n Express"
            style={{ width: 72, height: 72, margin: "0 auto", display: "block", objectFit: "contain" }}
          />
          <Stack gap={4}>
            <Text fw={800} ta="center" size="xl" c="white">
              Crave'n CX
            </Text>
            <Text ta="center" size="sm" c="dimmed">
              Courier tablet — post jobs and run the board
            </Text>
          </Stack>
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
              <Button type="submit" color="orange" loading={loading} fullWidth size="md">
                Open CX Ops
              </Button>
            </Stack>
          </form>
        </Stack>
      </Box>
    </Box>
  );
}
