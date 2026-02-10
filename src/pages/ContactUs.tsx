import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, MessageCircle, MapPin, Clock, Send } from 'lucide-react';
import ChatButton from '@/components/chat/ChatButton';
import Footer from '@/components/Footer';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ContactUs = () => {
  const [userType, setUserType] = useState<'customer' | 'driver' | 'admin'>('customer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.role === 'driver') {
          setUserType('driver');
        }
      }
    };
    
    checkUserRole();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create a support conversation
      const { data: { user } } = await supabase.auth.getUser();
      
      const conversationData = {
        type: 'customer_support' as const,
        status: 'active' as const,
        priority: 'normal' as const,
        subject: formData.subject || `${formData.category} - Contact Form`,
        ...(user && { customer_id: user.id }),
        metadata: {
          source: 'contact_form',
          category: formData.category,
          email: formData.email,
          name: formData.name,
        }
      };

      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert(conversationData)
        .select()
        .single();

      if (convError) throw convError;

      // Add the initial message
      const messageData = {
        conversation_id: conversation.id,
        sender_type: user ? 'customer' as const : 'customer' as const,
        content: `Name: ${formData.name}\nEmail: ${formData.email}\nCategory: ${formData.category}\n\nMessage:\n${formData.message}`,
        message_type: 'text' as const,
        ...(user && { sender_id: user.id }),
      };

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert(messageData);

      if (msgError) throw msgError;

      toast({
        title: "Message Sent!",
        description: "We've received your message and will get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: '',
        message: '',
      });

    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again or use live chat.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-16 text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Have questions, feedback, or need support? We're here to help. 
            Choose the best way to reach us and we'll get back to you quickly.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="p-6">
              <MessageCircle className="h-8 w-8 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get instant help from our support team
              </p>
              <ChatButton
                type="customer_support"
                userType={userType}
                variant="default"
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Phone className="h-8 w-8 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Call Us</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Speak with our customer service team
              </p>
              <Button variant="outline" className="w-full">
                216-435-0821
              </Button>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <Mail className="h-8 w-8 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send us a detailed message
              </p>
              <Button variant="outline" className="w-full">
                support@cravenusa.com
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <p className="text-muted-foreground">
                Fill out the form below and we'll get back to you within 24 hours
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Category *</label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order-issue">Order Issue</SelectItem>
                      <SelectItem value="payment">Payment & Billing</SelectItem>
                      <SelectItem value="driver-support">Driver Support</SelectItem>
                      <SelectItem value="restaurant-partnership">Restaurant Partnership</SelectItem>
                      <SelectItem value="technical-issue">Technical Issue</SelectItem>
                      <SelectItem value="feedback">Feedback & Suggestions</SelectItem>
                      <SelectItem value="safety-concern">Safety Concern</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Brief description of your inquiry"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Message *</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Please provide details about your inquiry..."
                    rows={6}
                    required
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </div>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information & Hours */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Office Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-muted-foreground">
                  Crave'N Headquarters<br />
                  Coming Soon<br />
                  United States
                </address>
                <p className="text-sm text-muted-foreground mt-4">
                  We're a digital-first company currently establishing our physical presence. 
                  For all inquiries, please use our digital channels above.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Support Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Live Chat:</span>
                    <span className="text-green-600 font-medium">24/7</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone Support:</span>
                    <span>Coming Soon</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email Response:</span>
                    <span>Within 24 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Form Submissions:</span>
                    <span>Within 24 hours</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    For urgent delivery issues, please use the in-app live chat feature for fastest response.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Other Ways to Reach Us</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">General Inquiries</p>
                      <p className="text-sm text-muted-foreground">support@cravenusa.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Partnership Inquiries</p>
                      <p className="text-sm text-muted-foreground">support@cravenusa.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Press & Media</p>
                      <p className="text-sm text-muted-foreground">support@cravenusa.com</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactUs;