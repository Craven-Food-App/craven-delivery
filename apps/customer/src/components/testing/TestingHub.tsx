import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TestCustomer } from './TestCustomer';
import { TestDriver } from './TestDriver';
import { TestRestaurant } from './TestRestaurant';
import { TestDataManager } from './TestDataManager';
import { LiveDriverTesting } from './LiveDriverTesting';
import { 
  Home, 
  Users, 
  Car, 
  Store, 
  Database, 
  TestTube,
  ArrowRight,
  Shield,
  Clock,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const TestingHub = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkCurrentUser();
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      // Check user role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setUserRole(profile.role);
      }
    }
  };

  const quickTestLogin = async (email: string, password: string, roleType: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // If user doesn't exist, create them
        if (error.message.includes('Invalid login credentials')) {
          const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`
            }
          });

          if (signupError) throw signupError;

          // Create profile for the test user
          if (signupData.user) {
            await supabase
              .from('user_profiles')
              .insert({
                user_id: signupData.user.id,
                full_name: `Test ${roleType}`,
                role: roleType === 'customer' ? 'customer' : roleType === 'driver' ? 'driver' : 'restaurant_owner'
              });

            toast({
              title: `Test ${roleType} account created`,
              description: `Created and logged in as test ${roleType}`,
            });
          }
        } else {
          throw error;
        }
      } else {
        toast({
          title: `Logged in as test ${roleType}`,
          description: `Successfully switched to ${roleType} testing account`,
        });
      }
      
      checkCurrentUser();
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const testAccounts = [
    {
      role: 'Customer',
      email: 'test.customer@craven.com',
      password: 'testpass123',
      description: 'Test ordering, favorites, addresses',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      role: 'Driver',
      email: 'test.driver@craven.com',
      password: 'testpass123',
      description: 'Test deliveries, earnings, vehicle management',
      icon: Car,
      color: 'bg-green-500'
    },
    {
      role: 'Restaurant',
      email: 'test.restaurant@craven.com',
      password: 'testpass123',
      description: 'Test menu management, orders, POS system',
      icon: Store,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TestTube className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Testing Environment</h1>
              </div>
              <Badge variant="secondary">Development Mode</Badge>
            </div>
            <div className="flex items-center gap-4">
              {currentUser && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Logged in as:</p>
                  <p className="font-medium">{currentUser.email}</p>
                  {userRole && (
                    <Badge variant="outline" className="mt-1">
                      {userRole}
                    </Badge>
                  )}
                </div>
              )}
              <Link to="/">
                <Button variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Back to App
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Test Accounts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Quick Test Accounts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {testAccounts.map((account) => (
              <Card key={account.role} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${account.color} text-white`}>
                      <account.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{account.role}</CardTitle>
                      <CardDescription>{account.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => quickTestLogin(account.email, account.password, account.role.toLowerCase())}
                    className="w-full"
                    variant="outline"
                  >
                    Login as Test {account.role}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Testing Tabs */}
        <Tabs defaultValue="customer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Testing
            </TabsTrigger>
            <TabsTrigger value="driver" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Driver Testing
            </TabsTrigger>
            <TabsTrigger value="restaurant" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Restaurant Testing
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Live Testing
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Test Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-6">
            <TestCustomer />
          </TabsContent>

          <TabsContent value="driver" className="space-y-6">
            <TestDriver />
          </TabsContent>

          <TabsContent value="restaurant" className="space-y-6">
            <TestRestaurant />
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <LiveDriverTesting />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <TestDataManager />
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Access
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/customer-dashboard">
              <Button variant="outline" className="w-full">
                Customer Dashboard
              </Button>
            </Link>
            <Link to="/mobile">
              <Button variant="outline" className="w-full">
                Driver Mobile
              </Button>
            </Link>
            <Link to="/restaurant/dashboard">
              <Button variant="outline" className="w-full">
                Restaurant Dashboard
              </Button>
            </Link>
            <Link to="/admin">
              <Button variant="outline" className="w-full">
                Admin Portal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};