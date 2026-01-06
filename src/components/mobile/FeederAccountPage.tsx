import React, { useState, useEffect } from "react";
import {
  IconUser,
  IconCar,
  IconFileText,
  IconCreditCard,
  IconSettings,
  IconShield,
  IconPhone,
  IconMessageCircle,
  IconLogout,
  IconChevronRight,
  IconStar,
  IconAward,
  IconMenu,
  IconArrowLeft,
  IconEye,
  IconEyeOff,
  IconLock,
  IconLockOpen,
  IconKey,
  IconPlus,
  IconMinus,
} from "@tabler/icons-react";
import feederCardBackground from "@/assets/feeder-card-background.png";
import feederCardImage from "@/assets/feeder-card-image.png";
import { notifications } from "@mantine/notifications";
import { supabase } from "@/integrations/supabase/client";
import ProfileDetailsPage from "./ProfileDetailsPage";
import VehicleDocumentsPage from "./VehicleDocumentsPage";
import AppSettingsPage from "./AppSettingsPage";
import SecuritySafetyPage from "./SecuritySafetyPage";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Text,
  Button,
  Group,
  Card,
  Title,
  Loader,
  ActionIcon,
  Modal,
  TextInput,
  Paper,
  Badge,
  Progress,
  Switch,
  Divider,
  ThemeIcon,
} from "@mantine/core";

type FeederAccountPageProps = {
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
};

const FeederAccountPage: React.FC<FeederAccountPageProps> = ({ onOpenMenu, onOpenNotifications }) => {
  const [showCardPage, setShowCardPage] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState<'main' | 'profile' | 'vehicle' | 'settings' | 'security'>('main');

  // Check URL params and listen for navigation events to auto-open card page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'card') {
      setShowCardPage(true);
    }

    // Listen for switchTab events with section=card
    const handleSwitchTab = (event: CustomEvent<{ tab: string; section?: string }>) => {
      if (event.detail.section === 'card') {
        setShowCardPage(true);
      }
    };

    window.addEventListener('switchTab', handleSwitchTab as EventListener);
    return () => window.removeEventListener('switchTab', handleSwitchTab as EventListener);
  }, []);
  
  // Driver stats - will be fetched from database
  const [driverPoints, setDriverPoints] = useState(0);
  const [driverName, setDriverName] = useState('');
  const [driverRating, setDriverRating] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [memberSince, setMemberSince] = useState('');
  // Feeder Card data
  const [cardBalance, setCardBalance] = useState(0);
  const [cardNumber] = useState('5399283309390129'); // Store without spaces
  const [expiryDate] = useState('12/28');
  const [cvv] = useState('847');

  // Format card number to always be exactly 16 digits in 4 groups of 4
  const formatCardNumber = (number: string, showFull: boolean): string => {
    // Remove all non-digits
    const digitsOnly = number.replace(/\D/g, '');
    
    // Ensure exactly 16 digits (pad with 0s if needed, truncate if too long)
    const normalized = digitsOnly.slice(0, 16).padEnd(16, '0');
    
    if (showFull) {
      // Format as XXXX XXXX XXXX XXXX
      return `${normalized.slice(0, 4)} ${normalized.slice(4, 8)} ${normalized.slice(8, 12)} ${normalized.slice(12, 16)}`;
    } else {
      // Format as **** **** **** XXXX (last 4 digits visible)
      return `**** **** **** ${normalized.slice(12, 16)}`;
    }
  };
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDriverData();
  }, []);

  const fetchDriverData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch driver profile
      const { data: driverProfile } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get full name from craver_applications table first, then fallback to user metadata
      const { data: application } = await supabase
        .from('craver_applications')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let fullName = '';
      if (application?.first_name || application?.last_name) {
        fullName = [application.first_name, application.last_name].filter(Boolean).join(' ');
      } else if (user.user_metadata?.full_name) {
        fullName = user.user_metadata.full_name;
      } else if (user.user_metadata?.first_name || user.user_metadata?.last_name) {
        fullName = [user.user_metadata.first_name, user.user_metadata.last_name].filter(Boolean).join(' ');
      } else if (user.email) {
        const emailName = user.email.split('@')[0];
        fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      }
      
      if (fullName) {
        setDriverName(fullName);
      }

      // Set driver stats
      if (driverProfile) {
        setDriverRating(Number(driverProfile.rating) || 0);
        setTotalDeliveries(driverProfile.total_deliveries || 0);
        
        // Calculate points based on rating and deliveries
        const points = Math.round((Number(driverProfile.rating) || 0) * 17 + (driverProfile.total_deliveries || 0) * 0.1);
        setDriverPoints(points);
      }

      // Set member since date
      if (driverProfile?.created_at) {
        const date = new Date(driverProfile.created_at);
        setMemberSince(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      } else if (user.created_at) {
        const date = new Date(user.created_at);
        setMemberSince(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      }

      // Fetch earnings for transaction history and calculate wallet balance
      const { data: earnings } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', user.id)
        .order('earned_at', { ascending: false });

      // Calculate total earnings (sum of total_cents converted to dollars)
      const totalEarnings = earnings?.reduce((sum, earning) => {
        return sum + ((earning.total_cents || 0) / 100);
      }, 0) || 0;

      // Fetch completed payouts
      const { data: payouts } = await supabase
        .from('driver_payouts')
        .select('amount')
        .eq('driver_id', user.id)
        .in('status', ['completed', 'sent']);

      // Calculate total payouts (amount is already in dollars)
      const totalPayouts = payouts?.reduce((sum, payout) => {
        return sum + (payout.amount || 0);
      }, 0) || 0;

      // Wallet balance = Total Earnings - Total Payouts
      const walletBalance = totalEarnings - totalPayouts;
      setCardBalance(Math.max(0, walletBalance)); // Ensure balance is never negative

      if (earnings) {
        // Format transactions
        const formattedTransactions = earnings.slice(0, 10).map((earning: any) => ({
          date: new Date(earning.earned_at || earning.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          description: 'Delivery Earnings',
          amount: (earning.total_cents || 0) / 100,
          type: 'credit' as const,
        }));
        setTransactions(formattedTransactions);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine status based on points
  const getStatus = (points: number) => {
    if (points >= 85)
      return { 
        name: "Diamond Feeder", 
        color: "diamond", 
        gradient: "linear-gradient(to bottom right, var(--mantine-color-cyan-2), var(--mantine-color-blue-3), var(--mantine-color-purple-3))" 
      };
    if (points >= 76)
      return { 
        name: "Platinum Feeder", 
        color: "platinum", 
        gradient: "linear-gradient(to bottom right, var(--mantine-color-gray-3), var(--mantine-color-gray-1), var(--mantine-color-gray-3))" 
      };
    if (points >= 65)
      return { 
        name: "Gold Feeder", 
        color: "gold", 
        gradient: "linear-gradient(to bottom right, var(--mantine-color-yellow-3), var(--mantine-color-yellow-2), var(--mantine-color-yellow-4))" 
      };
    return { 
      name: "Silver Feeder", 
      color: "silver", 
      gradient: "linear-gradient(to bottom right, var(--mantine-color-gray-4), var(--mantine-color-gray-3), var(--mantine-color-gray-5))" 
    };
  };

  const status = getStatus(driverPoints);

  const getMenuItemColors = (color: string) => {
    const colors: Record<string, { bg: string; icon: string }> = {
      blue: { bg: "blue", icon: "blue" },
      green: { bg: "green", icon: "green" },
      purple: { bg: "purple", icon: "purple" },
      gray: { bg: "gray", icon: "gray" },
      red: { bg: "red", icon: "red" },
      orange: { bg: "orange", icon: "orange" },
    };
    return colors[color] || colors.gray;
  };

  const menuItems = [
    { 
      icon: IconUser, 
      label: "Profile Information", 
      desc: "Personal details & preferences", 
      color: "blue",
      action: () => setCurrentPage('profile')
    },
    { 
      icon: IconCar, 
      label: "Vehicle & Documents", 
      desc: "Registration, insurance, inspection", 
      color: "green",
      action: () => setCurrentPage('vehicle')
    },
    {
      icon: IconCreditCard,
      label: "Feeder Card",
      desc: "Digital debit card & transactions",
      color: "purple",
      badge: `$${cardBalance.toFixed(2)}`,
      action: () => setShowCardPage(true),
    },
    { 
      icon: IconSettings, 
      label: "App Settings", 
      desc: "Notifications, language, preferences", 
      color: "gray",
      action: () => setCurrentPage('settings')
    },
    { 
      icon: IconShield, 
      label: "Security & Safety", 
      desc: "Password, 2FA, emergency contacts", 
      color: "red",
      action: () => setCurrentPage('security')
    },
    { 
      icon: IconPhone, 
      label: "Call Support", 
      desc: "24/7 driver assistance hotline", 
      color: "orange",
      action: () => window.location.href = 'tel:+18005551234'
    },
    { 
      icon: IconMessageCircle, 
      label: "Message Support", 
      desc: "Live chat with support team", 
      color: "blue",
      action: () => {
        navigate('/mobile?tab=help');
        if (onOpenNotifications) onOpenNotifications();
      }
    },
  ];

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      notifications.show({
        title: "Signed out successfully",
        message: '',
        color: "green",
      });
      navigate('/mobile');
    } catch (error) {
      console.error("Error signing out:", error);
      notifications.show({
        title: "Failed to sign out",
        message: '',
        color: "red",
      });
      navigate('/mobile');
    }
  };

  // Show sub-pages
  if (currentPage === 'profile') {
    return <ProfileDetailsPage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'vehicle') {
    return <VehicleDocumentsPage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'settings') {
    return <AppSettingsPage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'security') {
    return <SecuritySafetyPage onBack={() => setCurrentPage('main')} />;
  }

  // If card page is open, show that instead
  if (showCardPage) {
    return (
      <Box h="100vh" w="100%" style={{ background: 'white', overflowY: 'auto', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Header - White Background */}
        <Paper
          pos="sticky"
          top={0}
          bg="white"
          style={{ 
            zIndex: 10,
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 43px)',
            borderBottom: '1px solid var(--mantine-color-gray-2)'
          }}
        >
          <Group px="xl" pb="md" justify="space-between" align="center">
            <ActionIcon onClick={() => setShowCardPage(false)} variant="subtle" color="dark">
              <IconArrowLeft size={24} />
            </ActionIcon>
            <Title order={2} fw={700} c="dark">Feeder Card</Title>
            <Box w={24} />
          </Group>
        </Paper>

        {/* Orange Carbon Fiber Background */}
        <Box 
          pos="relative" 
          style={{ 
            backgroundImage: `url(${feederCardBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            minHeight: '280px',
            padding: '2rem 1rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Depth of field blur effect */}
          <Box
            pos="absolute"
            inset={0}
            style={{
              background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.15) 100%)',
              filter: 'blur(1px)',
              pointerEvents: 'none'
            }}
          />
          
          {/* Card Display */}
          <Box style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <Box
              pos="relative"
              style={{ 
                backgroundImage: `url(${feederCardImage})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                aspectRatio: "1.586 / 1",
                width: "100%",
                maxWidth: "420px",
                overflow: 'hidden',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 10px 30px rgba(255, 107, 53, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                padding: '2rem',
                imageRendering: 'high-quality',
                WebkitImageRendering: 'high-quality'
              }}
            >
              <Stack justify="space-between" h="100%" gap="xs" style={{ position: 'relative', zIndex: 2 }}>
                {/* Top Section - Balance */}
                <Box>
                  <Text size="xs" c="white" style={{ opacity: 0.9 }} mb={4}>Available Balance</Text>
                  <Title order={2} c="white" fw={900} style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>${cardBalance.toFixed(2)}</Title>
                </Box>

                {/* Middle Section - Card Number */}
                <Box style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginTop: '-20px',
                  width: '100%',
                  overflow: 'hidden'
                }}>
                  <Text 
                    c="white" 
                    ff="monospace" 
                    fw={900}
                    style={{ 
                      fontSize: 'clamp(1rem, 4vw, 1.25rem)',
                      letterSpacing: '0.15em',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      fontFeatureSettings: '"tnum"',
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.3',
                      textShadow: `
                        -1px -1px 0 rgba(255, 255, 255, 0.4),
                        0 -1px 0 rgba(255, 255, 255, 0.5),
                        1px -1px 0 rgba(255, 255, 255, 0.3),
                        -1px 0 0 rgba(255, 255, 255, 0.3),
                        0 0 0 rgba(255, 255, 255, 0.4),
                        1px 0 0 rgba(255, 255, 255, 0.3),
                        -1px 1px 0 rgba(0, 0, 0, 0.2),
                        0 1px 0 rgba(0, 0, 0, 0.3),
                        1px 1px 0 rgba(0, 0, 0, 0.2),
                        0 2px 2px rgba(0, 0, 0, 0.3),
                        0 3px 3px rgba(0, 0, 0, 0.2),
                        0 4px 4px rgba(0, 0, 0, 0.1),
                        inset 0 -1px 1px rgba(0, 0, 0, 0.3),
                        inset 0 1px 1px rgba(255, 255, 255, 0.2)
                      `,
                      filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5))',
                      transform: 'perspective(1000px) translateZ(2px)',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      textRendering: 'optimizeLegibility'
                    }}
                  >
                    {formatCardNumber(cardNumber, showCardDetails)}
                  </Text>
                </Box>

                {/* Bottom Section - Expiry, CVV, Name, Brand */}
                <Group justify="space-between" align="flex-end" style={{ marginTop: '-30px' }}>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="md" mb={4}>
                      <Box>
                        <Text size="xs" c="white" style={{ opacity: 0.9 }} mb={2}>EXP</Text>
                        <Text size="xs" c="white" ff="monospace" fw={600} style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>{showCardDetails ? expiryDate : "**/**"}</Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="white" style={{ opacity: 0.9 }} mb={2}>CVV</Text>
                        <Text size="xs" c="white" ff="monospace" fw={600} style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>{showCardDetails ? cvv : "***"}</Text>
                      </Box>
                    </Group>
                    <Text size="xs" fw={700} c="white" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }} lineClamp={1}>
                      {driverName}
                    </Text>
                  </Box>
                </Group>
              </Stack>
            </Box>
          </Box>
        </Box>

        {/* White Background Section for Controls */}
        <Box 
          style={{ 
            backgroundColor: 'white',
            paddingTop: '1rem',
            paddingBottom: '1rem',
            marginTop: '-2rem',
            position: 'relative',
            zIndex: 2
          }}
        >
          {/* Card Controls - Full Page, No Cards, Stretch End to End */}
          <Stack gap="md" px={0} mb="xl">
            {/* Toggle Card Details */}
            <Box px="xl">
              <Group justify="space-between" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)', borderBottom: '1px solid var(--mantine-color-gray-2)', backgroundColor: 'white' }}>
                <Group gap="md">
                  <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                    {showCardDetails ? <IconEye size={20} /> : <IconEyeOff size={20} />}
                  </ThemeIcon>
                  <Box>
                    <Text fw={700} c="dark">Show Card Details</Text>
                    <Text size="xs" c="dimmed">View number, expiry, CVV</Text>
                  </Box>
                </Group>
                <Switch
                  checked={showCardDetails}
                  onChange={(e) => setShowCardDetails(e.currentTarget.checked)}
                  color="blue"
                  size="lg"
                />
              </Group>
            </Box>

            {/* Lock Card */}
            <Box px="xl">
              <Group justify="space-between" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)', borderBottom: '1px solid var(--mantine-color-gray-2)', backgroundColor: 'white' }}>
                <Group gap="md">
                  <ThemeIcon size="lg" radius="md" color={isCardLocked ? "red" : "green"} variant="light">
                    {isCardLocked ? <IconLock size={20} /> : <IconLockOpen size={20} />}
                  </ThemeIcon>
                  <Box>
                    <Text fw={700} c="dark">{isCardLocked ? "Card Locked" : "Lock Card"}</Text>
                    <Text size="xs" c="dimmed">
                      {isCardLocked ? "Transactions blocked" : "Block all transactions"}
                    </Text>
                  </Box>
                </Group>
                <Switch
                  checked={isCardLocked}
                  onChange={(e) => setIsCardLocked(e.currentTarget.checked)}
                  color={isCardLocked ? "red" : "gray"}
                  size="lg"
                />
              </Group>
            </Box>

            {/* Change PIN */}
            <Box px="xl">
              <Button
                variant="subtle"
                fullWidth
                justify="space-between"
                leftSection={
                  <ThemeIcon size="lg" radius="md" color="purple" variant="light">
                    <IconKey size={20} />
                  </ThemeIcon>
                }
                rightSection={<IconChevronRight size={20} color="var(--mantine-color-gray-4)" />}
                onClick={() => setShowPinDialog(true)}
                style={{ height: 'auto', padding: '12px', backgroundColor: 'white', borderTop: '1px solid var(--mantine-color-gray-2)', borderBottom: '1px solid var(--mantine-color-gray-2)' }}
              >
                <Box>
                  <Text fw={700} c="dark">Change Card PIN</Text>
                  <Text size="xs" c="dimmed">Set or update your PIN</Text>
                </Box>
              </Button>
            </Box>
          </Stack>
        </Box>

        {/* PIN Dialog */}
        <Modal
          opened={showPinDialog}
          onClose={() => setShowPinDialog(false)}
          title="Change Card PIN"
          centered
          radius="xl"
        >
          <Stack gap="md">
            <TextInput
              label="Current PIN"
              type="password"
              maxLength={4}
              placeholder="****"
              styles={{
                input: {
                  textAlign: 'center',
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  border: '2px solid var(--mantine-color-gray-2)',
                  borderRadius: '12px',
                },
              }}
            />
            <TextInput
              label="New PIN"
              type="password"
              maxLength={4}
              placeholder="****"
              styles={{
                input: {
                  textAlign: 'center',
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  border: '2px solid var(--mantine-color-gray-2)',
                  borderRadius: '12px',
                },
              }}
            />
            <TextInput
              label="Confirm New PIN"
              type="password"
              maxLength={4}
              placeholder="****"
              styles={{
                input: {
                  textAlign: 'center',
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.2em',
                  border: '2px solid var(--mantine-color-gray-2)',
                  borderRadius: '12px',
                },
              }}
            />
            <Group gap="md" mt="md">
              <Button
                variant="light"
                color="gray"
                flex={1}
                onClick={() => setShowPinDialog(false)}
                radius="xl"
              >
                Cancel
              </Button>
              <Button
                flex={1}
                color="orange"
                onClick={() => {
                  setShowPinDialog(false);
                  notifications.show({
                    title: "PIN updated successfully",
                    message: '',
                    color: "green",
                  });
                }}
                radius="xl"
                style={{ background: 'linear-gradient(to right, var(--mantine-color-orange-5), var(--mantine-color-red-6))' }}
              >
                Update PIN
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Transactions List - Compact, No Separation */}
        <Box px="xl" pb="xl" style={{ backgroundColor: 'white' }}>
          <Title order={3} fw={700} c="dark" mb="md">Transaction History</Title>
          {transactions.length === 0 ? (
            <Box p="xl" style={{ textAlign: 'center' }}>
              <Text c="dimmed">No transactions yet</Text>
              <Text size="sm" c="dimmed" mt="xs">Your earnings will appear here</Text>
            </Box>
          ) : (
            <Box style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: '8px', overflow: 'hidden' }}>
              {transactions.map((txn, idx) => (
                <Box 
                  key={idx} 
                  p="sm" 
                  style={{ 
                    backgroundColor: 'white',
                    borderBottom: idx < transactions.length - 1 ? '1px solid var(--mantine-color-gray-2)' : 'none',
                    minHeight: '60px'
                  }}
                >
                  <Group justify="space-between" gap="sm">
                    <Group gap="sm">
                      <ThemeIcon size="md" radius="md" color={txn.type === "credit" ? "green" : "red"} variant="light">
                        {txn.type === "credit" ? <IconPlus size={16} /> : <IconMinus size={16} />}
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} c="dark" size="sm">{txn.description}</Text>
                        <Text size="xs" c="dimmed">{txn.date}</Text>
                      </Box>
                    </Group>
                    <Text size="lg" fw={700} c={txn.type === "credit" ? "green.6" : "red.6"}>
                      {txn.type === "credit" ? "+" : "-"}${Math.abs(txn.amount).toFixed(2)}
                    </Text>
                  </Group>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* White Bottom Bar - Same height as orange/black bars */}
        <Box 
          style={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            height: '48px', 
            backgroundColor: 'white',
            zIndex: 1000 
          }} 
        />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box h="100vh" w="100%" style={{ background: 'linear-gradient(to bottom right, var(--mantine-color-orange-0), var(--mantine-color-red-0), var(--mantine-color-pink-0))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" color="orange" />
      </Box>
    );
  }

  return (
    <Box h="100vh" w="100%" style={{ background: 'linear-gradient(to bottom right, var(--mantine-color-orange-0), var(--mantine-color-red-0), var(--mantine-color-pink-0))', overflowY: 'auto', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Diamond Header */}
      <Paper
        px="xl"
        pb="xl"
        style={{ 
          background: status.gradient, 
          overflow: 'hidden',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 43px)'
        }}
      >
        {/* Diamond sparkle effect */}
        <Box pos="absolute" inset={0} style={{ opacity: 0.3 }}>
          <Box pos="absolute" top={16} left={32} w={12} h={12} bg="white" style={{ borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite' }} />
          <Box pos="absolute" top={48} right={48} w={8} h={8} bg="white" style={{ borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite', animationDelay: '0.3s' }} />
          <Box pos="absolute" bottom={32} left={64} w={8} h={8} bg="white" style={{ borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite', animationDelay: '0.6s' }} />
          <Box pos="absolute" top="50%" right={32} w={16} h={16} bg="white" style={{ borderRadius: '50%', animation: 'pulse 2s ease-in-out infinite', animationDelay: '0.9s' }} />
        </Box>

        {/* Geometric diamond pattern */}
        <Box pos="absolute" inset={0} style={{ opacity: 0.1 }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="50,10 90,50 50,90 10,50" fill="white" opacity="0.3" />
            <polygon points="50,20 80,50 50,80 20,50" fill="white" opacity="0.2" />
          </svg>
        </Box>

        <Group justify="space-between" mb="md" pos="relative">
          <ActionIcon
            variant="subtle"
            color="dark"
            onClick={() => {
              if (onOpenMenu) {
                onOpenMenu();
              } else {
                notifications.show({
                  title: "Menu coming soon.",
                  message: '',
                  color: "blue",
                });
              }
            }}
          >
            <IconMenu size={24} />
          </ActionIcon>
          <Title order={2} fw={700} c="dark">Account</Title>
          <ActionIcon
            variant="subtle"
            color="dark"
            onClick={() => {
              window.location.href = '/mobile?tab=messages';
            }}
          >
            <img src="/app-chat.png" alt="Messages" style={{ width: '28px', height: '28px' }} />
          </ActionIcon>
        </Group>

        {/* Profile Section */}
        <Box pos="relative" mb="md">
          <Stack align="center" gap="md">
            <Title order={1} fw={900} c="dark">{driverName}</Title>

            {/* Status Badge */}
            <Box pos="relative" style={{ display: 'inline-block' }}>
              <Badge
                size="xl"
                variant="light"
                style={{ backgroundColor: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(4px)', border: '2px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                radius="lg"
                p="md"
              >
                <Text size="xl" fw={900} c="dark">{status.name}</Text>
              </Badge>
            </Box>

            <Group gap="md" justify="center">
              <Group gap={4}>
                <IconStar size={16} fill="var(--mantine-color-yellow-6)" color="var(--mantine-color-yellow-6)" />
                <Text fw={700} c="dark">{driverRating}</Text>
              </Group>
              <Text fw={600} c="dark">{totalDeliveries} feeds</Text>
              <Text c="dark">Since {memberSince}</Text>
            </Group>
          </Stack>
        </Box>

        {/* Points Progress */}
        <Paper p="md" radius="lg" style={{ backgroundColor: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)', border: '1px solid white' }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700} c="dark" size="sm">Status Points</Text>
            <Text fw={900} c="dark" size="lg">{driverPoints} pts</Text>
          </Group>
          <Progress 
            value={100} 
            color="blue" 
            size="sm" 
            radius="xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
          />
          <Text c="dark" size="xs" mt="xs" fw={600}>
            🎉 You've reached Diamond status! Keep being amazing!
          </Text>
        </Paper>
      </Paper>

      {/* Menu Items */}
      <Stack gap="md" px="xl" py="xl">
        {menuItems.map((item, idx) => {
          const colors = getMenuItemColors(item.color);
          const IconComponent = item.icon;
          return (
            <Button
              key={idx}
              onClick={item.action || (() => {})}
              variant="light"
              fullWidth
              justify="space-between"
              leftSection={
                <ThemeIcon size="lg" radius="md" color={colors.bg} variant="light">
                  <IconComponent size={24} />
                </ThemeIcon>
              }
              rightSection={
                <Group gap="xs">
                  {item.badge && (
                    <Badge color="green" variant="light" size="lg" fw={700}>
                      {item.badge}
                    </Badge>
                  )}
                  <IconChevronRight size={20} color="var(--mantine-color-gray-4)" />
                </Group>
              }
              size="lg"
              radius="lg"
              style={{ height: 'auto', padding: '16px' }}
            >
              <Box style={{ flex: 1, textAlign: 'left' }}>
                <Text fw={700} c="dark" size="lg">{item.label}</Text>
                <Text size="sm" c="dimmed">{item.desc}</Text>
              </Box>
            </Button>
          );
        })}

        {/* Sign Out Button */}
        <Button
          variant="light"
          color="red"
          fullWidth
          justify="space-between"
          leftSection={
            <ThemeIcon size="lg" radius="md" color="red" variant="light">
              <IconLogout size={24} />
            </ThemeIcon>
          }
          rightSection={<IconChevronRight size={20} color="var(--mantine-color-red-4)" />}
          onClick={handleSignOut}
          size="lg"
          radius="lg"
          style={{ height: 'auto', padding: '16px', border: '2px solid var(--mantine-color-red-2)' }}
        >
          <Box style={{ flex: 1, textAlign: 'left' }}>
            <Text fw={700} c="red.6" size="lg">Sign Out</Text>
            <Text size="sm" c="red.5">Log out of your account</Text>
          </Box>
        </Button>
      </Stack>

      <Box h={96} />

      {/* Android Bottom Bar */}
      <Box 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: '48px', 
          backgroundColor: '#000',
          zIndex: 1000 
        }} 
      />
    </Box>
  );
};

export default FeederAccountPage;
