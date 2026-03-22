import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Center,
  Image,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { supabase } from "@/integrations/supabase/client";

/** White “C” mark from `public/craven-c-logo-white.png` */
const baseUrl = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const cravenMarkSrc = `${baseUrl}craven-c-logo-white.png`;

const RED_BG =
  "linear-gradient(160deg, #b91c1c 0%, #991b1b 45%, #7f1d1d 100%)";

const fieldStyles = {
  label: { color: "rgba(255,255,255,0.95)" },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.15)",
    color: "#111827",
    "&::placeholder": { color: "rgba(0, 0, 0, 0.45)" },
  },
  section: { color: "#374151" },
} as const;

const AdminAuth: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const isRecovery = hashParams.get("type") === "recovery";
        if (user.user_metadata?.temp_password === true || isRecovery) {
          window.location.href = "https://cravenusa.com/executive/profile?reset=true";
          return;
        }
        navigate("/", { replace: true });
        return;
      }
      setChecking(false);
    };
    void run();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      notifications.show({
        title: "Missing fields",
        message: "Enter email and password.",
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user?.user_metadata?.temp_password === true) {
        window.location.href = "https://cravenusa.com/executive/profile?reset=true";
        return;
      }

      notifications.show({
        title: "Signed in",
        message: "Welcome back.",
        color: "green",
      });
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign in failed. Try again.";
      notifications.show({
        title: "Sign in failed",
        message,
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
          background: RED_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text c="white" size="sm">
          Loading…
        </Text>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        width: "100%",
        background: RED_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(16px, 4vw, 32px)",
        boxSizing: "border-box",
      }}
    >
      <Center style={{ width: "100%", maxWidth: 420 }}>
        <Stack align="center" gap="sm" w="100%">
          <Stack align="center" gap={4}>
            <Image
              src={cravenMarkSrc}
              alt="Craven"
              w={140}
              h="auto"
              fit="contain"
              style={{
                filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.35))",
              }}
            />
            <Title
              order={1}
              ta="center"
              c="white"
              fw={800}
              mt={4}
              style={{
                fontSize: "clamp(1.75rem, 5vw, 2.25rem)",
                letterSpacing: "0.06em",
                textShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              CRAVEN
            </Title>
          </Stack>

          <Text
            ta="center"
            c="white"
            size="lg"
            fw={600}
            opacity={0.95}
            style={{ letterSpacing: "0.04em" }}
          >
            Admin Access
          </Text>

          <Box
            component="form"
            onSubmit={handleSubmit}
            w="100%"
            pt="xs"
          >
            <Stack gap="md">
              <TextInput
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                size="md"
                styles={fieldStyles}
              />
              <PasswordInput
                label="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                size="md"
                styles={fieldStyles}
              />
              <Button
                type="submit"
                fullWidth
                size="md"
                loading={loading}
                color="orange"
                variant="filled"
              >
                Sign in
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Center>
    </Box>
  );
};

export default AdminAuth;
