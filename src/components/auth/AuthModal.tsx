import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Car, Store, ShoppingBag } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [activeTab, setActiveTab] = useState('customer');
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (isSignUp && password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              user_type: activeTab
            }
          }
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account."
        });

        // Send welcome email (non-blocking)
        if (data.user) {
          if (activeTab === 'customer') {
            supabase.functions.invoke('send-customer-welcome-email', {
              body: {
                customerName: fullName || email.split('@')[0],
                customerEmail: email
              }
            }).catch(err => console.error('Failed to send welcome email:', err));
          } else if (activeTab === 'driver') {
            supabase.functions.invoke('send-driver-welcome-email', {
              body: {
                driverName: fullName || email.split('@')[0],
                driverEmail: email
              }
            }).catch(err => console.error('Failed to send driver welcome email:', err));
          }
        }

        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully."
        });
        
        // Redirect based on user type
        setTimeout(() => {
          if (activeTab === 'restaurant') {
            window.location.href = '/restaurant/dashboard';
          } else if (activeTab === 'driver') {
            window.location.href = '/mobile';
          } else {
            window.location.href = '/restaurants';
          }
        }, 1000);
        
        onClose();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during authentication",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRedirectPath = () => {
    switch (activeTab) {
      case 'restaurant':
        return '/restaurant/dashboard';
      case 'driver':
        return '/mobile';
      default:
        return '/restaurants';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="customer" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Customer
          </TabsTrigger>
          <TabsTrigger value="driver" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Driver
          </TabsTrigger>
          <TabsTrigger value="restaurant" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Restaurant
          </TabsTrigger>
        </TabsList>

        {['customer', 'driver', 'restaurant'].map((type) => (
          <TabsContent key={type} value={type}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {type === 'customer' && <ShoppingBag className="h-5 w-5" />}
                  {type === 'driver' && <Car className="h-5 w-5" />}
                  {type === 'restaurant' && <Store className="h-5 w-5" />}
                  {type.charAt(0).toUpperCase() + type.slice(1)} {isSignUp ? 'Sign Up' : 'Sign In'}
                </CardTitle>
                <CardDescription>
                  {isSignUp ? 'Create your account' : 'Welcome back! Please sign in to continue.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-sm"
                    >
                      {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AuthModal;