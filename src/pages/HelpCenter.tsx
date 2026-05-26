import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, MessageCircle, Phone, Mail, Clock, Star, Truck, CreditCard, MapPin } from 'lucide-react';
import ChatButton from '@/components/chat/ChatButton';
import Footer from '@/components/Footer';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HelpCenter = () => {
  const [userType, setUserType] = useState<'customer' | 'driver' | 'admin'>('customer');

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

  const faqs = [
    {
      question: "How do I place an order?",
      answer: "To place an order, browse restaurants in your area, select menu items, add them to your cart, and proceed to checkout. You'll need to provide a delivery address and payment method.",
      category: "ordering"
    },
    {
      question: "What are the delivery fees?",
      answer: "Delivery fees vary by restaurant and distance. You'll see the exact fee before confirming your order. Many restaurants offer free delivery on orders above a certain amount.",
      category: "pricing"
    },
    {
      question: "How can I track my order?",
      answer: "Once your order is confirmed, you'll receive real-time updates via the app. You can track your driver's location and estimated arrival time.",
      category: "tracking"
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept major credit cards, debit cards, PayPal, Apple Pay, Google Pay, and Cash App. You can manage your payment methods in your account settings.",
      category: "payment"
    },
    {
      question: "How do I become a driver?",
      answer: "To become a Crave'n Feeder, complete our online application, upload required documents (license, insurance, vehicle registration), and pass our background check.",
      category: "driver"
    },
    {
      question: "What are the driver requirements?",
      answer: "Drivers must be 18+, have a valid driver's license, auto insurance, reliable vehicle, and pass a background check. Delivery experience is preferred but not required.",
      category: "driver"
    },
    {
      question: "How do I cancel my order?",
      answer: "You can cancel your order within a few minutes of placing it. Go to 'Your Orders' and select 'Cancel Order'. Refunds are processed automatically for eligible cancellations.",
      category: "ordering"
    },
    {
      question: "What if my order is wrong or missing items?",
      answer: "If there's an issue with your order, contact us immediately through the app or website. We'll work with you to resolve the issue, including refunds or redelivery when appropriate.",
      category: "support"
    }
  ];

  const categories = [
    { id: 'all', name: 'All Topics', icon: Star },
    { id: 'ordering', name: 'Ordering', icon: MapPin },
    { id: 'payment', name: 'Payment', icon: CreditCard },
    { id: 'tracking', name: 'Tracking', icon: Truck },
    { id: 'driver', name: 'Driver Info', icon: Truck },
    { id: 'support', name: 'Support', icon: MessageCircle }
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-xl opacity-90 mb-8">Find answers to your questions or get in touch with our support team</p>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4">
            <ChatButton
              type="customer_support"
              userType={userType}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Live Chat Support
            </ChatButton>
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              <Phone className="h-4 w-4 mr-2" />
              Call 216-435-0821
            </Button>
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              <Mail className="h-4 w-4 mr-2" />
              Email Support
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search for help..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Average Response Time</h3>
              <p className="text-2xl font-bold text-primary">&lt; 2 minutes</p>
              <p className="text-sm text-muted-foreground">Live chat support</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Customer Satisfaction</h3>
              <p className="text-2xl font-bold text-primary">4.8/5</p>
              <p className="text-sm text-muted-foreground">Based on 10k+ reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">24/7 Support</h3>
              <p className="text-2xl font-bold text-primary">Available</p>
              <p className="text-sm text-muted-foreground">Always here to help</p>
            </CardContent>
          </Card>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {category.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">
            Frequently Asked Questions
            {selectedCategory !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {categories.find(c => c.id === selectedCategory)?.name}
              </Badge>
            )}
          </h2>
          
          {filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No results found for your search.</p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left hover:no-underline hover:bg-muted/50 px-4 rounded-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* Contact Support */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-center">Still Need Help?</CardTitle>
            <p className="text-center text-muted-foreground">
              Our support team is available 24/7 to assist you
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex flex-wrap justify-center gap-4">
              <ChatButton
                type="customer_support"
                userType={userType}
                size="lg"
              />
              <Button variant="outline" size="lg">
                <Phone className="h-4 w-4 mr-2" />
                216-435-0821
              </Button>
              <Button variant="outline" size="lg">
                <Mail className="h-4 w-4 mr-2" />
                help@cravenusa.com
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default HelpCenter;