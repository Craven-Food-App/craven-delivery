import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@root/integrations/supabase/client";
import cravenLogo from "@root/assets/craven-logo.png";
import {
  Box,
  Stack,
  Group,
  Loader,
  Text,
  TextInput,
  Button,
  PasswordInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

const APP_VERSION = __APP_VERSION__;
const APP_BUILD = __APP_BUILD__;

function clearSupabaseStorage() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) localStorage.removeItem(key);
    });
    Object.keys(sessionStorage ?? {}).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) sessionStorage.removeItem(key);
    });
  } catch {}
}

async function redirectAfterAuth(
  userId: string,
  navigate: ReturnType<typeof useNavigate>
) {
  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  navigate(data?.length ? "/merchant-portal" : "/restaurant/register");
}

export default function MerchantAuth() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [merchantIdPrefix, setMerchantIdPrefix] = useState<string>("");
  const [merchantIdLast4, setMerchantIdLast4] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<unknown>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        await redirectAfterAuth(user.id, navigate);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setCurrentUser(session.user);
        notifications.show({
          title: "Welcome back!",
          message: "Signed in successfully.",
          color: "green",
        });
        setTimeout(() => redirectAfterAuth(session.user.id, navigate), 800);
      }
    });
    return () => data?.subscription?.unsubscribe();
  }, [navigate]);

  const handleContinue = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      notifications.show({ title: "Error", message: "Enter your email.", color: "red" });
      return;
    }
    setContinueLoading(true);
    try {
      const { data: prefix, error } = await supabase.rpc("get_merchant_id_prefix_by_email", {
        p_email: trimmed,
      });
      if (!error && prefix != null && typeof prefix === "string") {
        setMerchantIdPrefix(prefix);
      } else {
        setMerchantIdPrefix("••••••••");
      }
    } catch {
      setMerchantIdPrefix("••••••••");
    } finally {
      setContinueLoading(false);
      setStep(2);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const last4 = merchantIdLast4.trim();
    if (!email?.trim()) {
      notifications.show({ title: "Error", message: "Enter your email.", color: "red" });
      return;
    }
    if (last4.length !== 4) {
      notifications.show({
        title: "Error",
        message: "Enter the last 4 characters of your Merchant ID.",
        color: "red",
      });
      return;
    }
    if (!password) {
      notifications.show({ title: "Error", message: "Enter your password.", color: "red" });
      return;
    }
    setLoading(true);
    try {
      clearSupabaseStorage();
      try { await supabase.auth.signOut({ scope: "global" }); } catch {}
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        throw error.message.includes("Invalid login credentials")
          ? new Error("Invalid email or password.")
          : error;
      }
      // Verify last 4 against merchant account ID (one per merchant, same for all stores)
      let merchantId: string | null = null;
      const { data: row } = await supabase
        .from("merchant_accounts")
        .select("merchant_id")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (row?.merchant_id) merchantId = row.merchant_id;
      if (!merchantId) {
        const { data: ensured } = await supabase.rpc("ensure_merchant_account", {
          p_user_id: authData.user.id,
        });
        merchantId = typeof ensured === "string" ? ensured : null;
      }
      const expectedLast4 = merchantId?.slice(-4).toLowerCase();
      if (!expectedLast4 || expectedLast4 !== last4.toLowerCase()) {
        await supabase.auth.signOut();
        throw new Error("Merchant ID verification failed. Check the last 4 characters.");
      }
      notifications.show({ title: "Success!", message: "Signing you in...", color: "green" });
      await redirectAfterAuth(authData.user.id, navigate);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed.";
      notifications.show({ title: "Sign In Failed", message, color: "red" });
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <Stack align="center" gap="md">
          <Loader size="lg" color="orange" />
          <Text c="dark.2">Redirecting to your merchant dashboard…</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        paddingBottom: 48,
      }}
    >
      {/* Logo at top */}
      <Box style={{ marginTop: 48, marginBottom: 32 }}>
        <img
          src={cravenLogo}
          alt="Crave'n"
          style={{ maxWidth: 240, width: "100%", height: "auto", display: "block" }}
        />
      </Box>

      {/* Form — no card/box */}
      <Box style={{ width: "100%", maxWidth: 360 }}>
        {step === 1 ? (
          <Stack gap="md">
            <TextInput
              label="Email"
              type="email"
              placeholder="merchant@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={continueLoading}
              required
              size="md"
              autoComplete="email"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleContinue())}
            />
            <Button
              type="button"
              fullWidth
              size="md"
              color="orange"
              disabled={continueLoading}
              onClick={handleContinue}
              leftSection={continueLoading ? <Loader size="sm" color="white" /> : null}
            >
              {continueLoading ? "Loading…" : "Continue"}
            </Button>
          </Stack>
        ) : (
          <Box component="form" onSubmit={handleSignIn}>
            <Stack gap="md">
              <Box>
                <Text size="sm" fw={500} mb={4} component="label">
                  Merchant ID
                </Text>
                <Group gap="xs" align="flex-end" wrap="nowrap">
                  <Text
                    size="md"
                    style={{
                      fontFamily: "monospace",
                      letterSpacing: 1,
                      minHeight: 36,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {merchantIdPrefix}
                  </Text>
                  <TextInput
                    placeholder="last 4"
                    value={merchantIdLast4}
                    onChange={(e) => setMerchantIdLast4(e.target.value.slice(0, 4))}
                    disabled={loading}
                    size="md"
                    maxLength={4}
                    autoComplete="off"
                    style={{ width: 88 }}
                  />
                </Group>
              </Box>
              <PasswordInput
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                size="md"
                autoComplete="current-password"
              />
              <Button
                type="submit"
                fullWidth
                size="md"
                color="orange"
                disabled={loading}
                leftSection={loading ? <Loader size="sm" color="white" /> : null}
              >
                {loading ? "Signing in…" : "Login"}
              </Button>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                color="gray"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back to change email
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Version and build — bottom right */}
      <Box
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          fontSize: 12,
          color: "#868e96",
        }}
      >
        Build {APP_BUILD} · v{APP_VERSION}
      </Box>
    </Box>
  );
}
