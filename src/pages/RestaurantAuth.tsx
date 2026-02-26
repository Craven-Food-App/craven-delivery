import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import cravenCLogo from "@/assets/craven-c-new.png";

const bgImage = `${import.meta.env.BASE_URL || "/"}craven-merchant-app-bg.png`;

import {
  Box,
  Stack,
  Loader,
  Text,
  Title,
  Card,
  Tabs,
  TextInput,
  Button,
  Group,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Wipes any stale Supabase auth tokens from storage before a fresh sign-in. */
function clearSupabaseStorage() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage ?? {}).forEach((key) => {
    if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
      sessionStorage.removeItem(key);
    }
  });
}

/** Navigates to the correct post-auth route based on whether the user has a restaurant. */
async function redirectAfterAuth(userId: string, navigate: ReturnType<typeof useNavigate>) {
  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  navigate(data && data.length > 0 ? "/merchant-portal" : "/restaurant/register");
}

// ─── Component ───────────────────────────────────────────────────────────────

const RestaurantAuth: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // FIX: useNavigate() is now safe because HashRouter wraps this component
  // (moved to outermost position in App.tsx). Previously HashRouter was nested
  // inside QueryClientProvider/ErrorBoundary which could mount before the
  // router context was ready, causing the crash at this exact line.
  const navigate = useNavigate();

  useEffect(() => {
    // Check for an existing session on mount
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        await redirectAfterAuth(user.id, navigate);
      }
    })();

    // Listen for auth state changes (e.g. email confirmation redirect)
    // FIX: Optional chaining on subscription cleanup prevents crash if
    // onAuthStateChange returns an unexpected shape (changed in Supabase v2.x).
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setCurrentUser(session.user);
        notifications.show({
          title: "Welcome back!",
          message: "You've been signed in successfully.",
          color: "green",
        });
        // Small delay so the notification is visible before redirect
        setTimeout(async () => {
          await redirectAfterAuth(session.user.id, navigate);
        }, 1000);
      }
    });

    // FIX: Use optional chaining — if data or subscription is undefined this
    // no longer throws, which was the secondary crash source in useEffect cleanup.
    return () => {
      data?.subscription?.unsubscribe();
    };
  }, [navigate]);

  // ── Sign In ────────────────────────────────────────────────────────────────

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notifications.show({ title: "Error", message: "Please fill in all fields", color: "red" });
      return;
    }
    setLoading(true);
    try {
      clearSupabaseStorage();
      try { await supabase.auth.signOut({ scope: "global" }); } catch {}
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error.message.includes("Invalid login credentials")
          ? new Error("Invalid email or password. Please check your credentials.")
          : error;
      }
      if (data.user) {
        notifications.show({ title: "Success!", message: "Signing you in...", color: "green" });
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      notifications.show({
        title: "Sign In Failed",
        message: err?.message || "An error occurred during sign in",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ────────────────────────────────────────────────────────────────

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notifications.show({ title: "Error", message: "Please enter both email and password", color: "red" });
      return;
    }
    if (password.length < 6) {
      notifications.show({ title: "Error", message: "Password must be at least 6 characters long", color: "red" });
      return;
    }
    setLoading(true);
    try {
      clearSupabaseStorage();
      const emailRedirectTo = `${window.location.origin}/restaurant/register`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) {
        throw error.message.includes("User already registered")
          ? new Error("An account with this email already exists. Please sign in instead.")
          : error;
      }
      if (data.user) {
        notifications.show({
          title: "Account Created!",
          message: "Please check your email to confirm your account, then you can register your restaurant.",
          color: "green",
        });
      }
    } catch (err: any) {
      console.error("Sign up error:", err);
      notifications.show({
        title: "Sign Up Failed",
        message: err?.message || "An error occurred during sign up",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Redirect spinner while checking existing session ──────────────────────

  if (currentUser) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--mantine-color-dark-8)",
        }}
      >
        <Stack align="center" gap="md">
          <Loader size="lg" color="orange" />
          <Text c="gray.3">Redirecting to your merchant dashboard…</Text>
        </Stack>
      </Box>
    );
  }

  // ── Auth form ─────────────────────────────────────────────────────────────

  return (
    <Box
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlay */}
      <Box style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }} />

      {/* Centered card */}
      <Box
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Card size="sm">
          <Stack align="center" gap="xl">
            <Group gap="sm" style={{ marginBottom: 8 }}>
              <img src={cravenCLogo} alt="Crave'n" style={{ height: 40, width: "auto" }} />
              <Title order={1} c="white" style={{ letterSpacing: "-0.02em" }}>
                Merchant Portal
              </Title>
            </Group>

            <Text c="gray.4" size="lg" ta="center">
              Sign in to manage your store, orders, and catalog
            </Text>

            <Card
              p="xl"
              radius="md"
              withBorder
              style={{
                width: "100%",
                maxWidth: 420,
                backgroundColor: "rgba(255,255,255,0.97)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}
            >
              <Tabs defaultValue="signin">
                <Tabs.List grow mb="md">
                  <Tabs.Tab value="signin">Sign In</Tabs.Tab>
                  <Tabs.Tab value="signup">Get Started</Tabs.Tab>
                </Tabs.List>

                {/* Sign In panel */}
                <Tabs.Panel value="signin">
                  <form onSubmit={handleSignIn}>
                    <Stack gap="md">
                      <TextInput
                        label="Email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                        size="md"
                      />
                      <TextInput
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        size="md"
                      />
                      <Button
                        type="submit"
                        fullWidth
                        size="md"
                        color="orange"
                        disabled={loading}
                        leftSection={loading ? <Loader size="sm" color="white" /> : null}
                      >
                        {loading ? "Signing in…" : "Sign in"}
                      </Button>
                    </Stack>
                  </form>
                </Tabs.Panel>

                {/* Sign Up panel */}
                <Tabs.Panel value="signup">
                  <form onSubmit={handleSignUp}>
                    <Stack gap="md">
                      <TextInput
                        label="Email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                        size="md"
                      />
                      <TextInput
                        label="Password"
                        type="password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        minLength={6}
                        size="md"
                      />
                      <Button
                        type="submit"
                        fullWidth
                        size="md"
                        color="orange"
                        disabled={loading}
                        leftSection={loading ? <Loader size="sm" color="white" /> : null}
                      >
                        {loading ? "Creating account…" : "Create account"}
                      </Button>
                    </Stack>
                  </form>
                </Tabs.Panel>
              </Tabs>

              <Stack gap="xs" align="center" mt="lg">
                <Button variant="subtle" size="sm" color="gray" onClick={() => navigate("/auth")}>
                  Customer login
                </Button>
                <Button variant="subtle" size="sm" color="gray" onClick={() => navigate("/")}>
                  Back to home
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
};

export default RestaurantAuth;
