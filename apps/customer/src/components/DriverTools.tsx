import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  HelpCircle, 
  Shield, 
  Camera, 
  MessageCircle, 
  Fuel, 
  Clock, 
  ChevronRight,
  Phone,
  MapPin,
  AlertTriangle,
  Car,
  User,
  DollarSign,
  History,
  Target,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DriverToolsProps {
  user: any;
  onlineStatus: boolean;
  onToggleOnlineStatus: (status: boolean) => void;
}

const DriverTools: React.FC<DriverToolsProps> = ({ user, onlineStatus, onToggleOnlineStatus }) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const { toast } = useToast();

  const tools = [
    {
      id: 'performance',
      title: 'Performance',
      icon: Target,
      color: 'bg-blue-500',
      description: 'View detailed analytics and ratings'
    },
    {
      id: 'communication',
      title: 'Customer Chat',
      icon: MessageCircle,
      color: 'bg-green-500',
      description: 'Message customers and support'
    },
    {
      id: 'proof-delivery',
      title: 'Photo Proof',
      icon: Camera,
      color: 'bg-purple-500',
      description: 'Take delivery confirmation photos'
    },
    {
      id: 'expenses',
      title: 'Expense Tracker',
      icon: Fuel,
      color: 'bg-orange-500',
      description: 'Track fuel and vehicle expenses'
    },
    {
      id: 'safety',
      title: 'Safety Center',
      icon: Shield,
      color: 'bg-red-500',
      description: 'Emergency contacts and incident reporting'
    },
    {
      id: 'profile',
      title: 'Driver Profile',
      icon: User,
      color: 'bg-indigo-500',
      description: 'Update vehicle info and preferences'
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: HelpCircle,
      color: 'bg-gray-500',
      description: 'Get help and contact support'
    },
    {
      id: 'shift',
      title: 'Shift Management',
      icon: Clock,
      color: 'bg-teal-500',
      description: 'Manage work hours and breaks'
    }
  ];

  const PerformancePanel = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="font-medium">This Week</span>
            </div>
            <div className="text-2xl font-bold">4.8★</div>
            <p className="text-xs text-muted-foreground">Customer Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="font-medium">Delivery Time</span>
            </div>
            <div className="text-2xl font-bold">18m</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <p className="font-medium">⭐⭐⭐⭐⭐ "Fast and friendly!"</p>
            <p className="text-xs text-muted-foreground">2 hours ago</p>
          </div>
          <Separator />
          <div className="text-sm">
            <p className="font-medium">⭐⭐⭐⭐⭐ "Perfect delivery"</p>
            <p className="text-xs text-muted-foreground">Yesterday</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const CommunicationPanel = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Quick Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => toast({ title: "Message Sent", description: "On my way to pick up your order" })}
          >
            "I'm on my way to pick up your order"
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => toast({ title: "Message Sent", description: "Order picked up, heading to you now" })}
          >
            "Order picked up, heading to you now"
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => toast({ title: "Message Sent", description: "I'm at your door" })}
          >
            "I'm at your door"
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => toast({ title: "Message Sent", description: "Order delivered safely" })}
          >
            "Order delivered safely"
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Custom Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea placeholder="Type your message..." className="min-h-[80px]" />
          <Button 
            size="sm" 
            className="w-full"
            onClick={() => toast({ title: "Custom Message Sent", description: "Your message has been delivered" })}
          >
            Send Message
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const ProofDeliveryPanel = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Delivery Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Take a photo of the delivery</p>
            <Button 
              size="sm"
              onClick={() => toast({ title: "Camera Opened", description: "Photo capture functionality activated" })}
            >
              Open Camera
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery-notes">Delivery Notes (Optional)</Label>
            <Textarea 
              id="delivery-notes" 
              placeholder="Left at front door, handed to customer, etc."
              className="min-h-[60px]"
            />
          </div>
          <Button 
            className="w-full"
            onClick={() => toast({ title: "Delivery Complete", description: "Photo proof and delivery confirmation submitted" })}
          >
            Complete Delivery
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const ExpenseTrackerPanel = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Add Expense
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="expense-type">Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" placeholder="Gas station, repair shop, etc." />
          </div>
          <Button 
            className="w-full"
            onClick={() => toast({ title: "Expense Added", description: "Your expense has been recorded for tax purposes" })}
          >
            Add Expense
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Today's Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">$23.45</div>
          <p className="text-xs text-muted-foreground">Fuel: $18.00, Parking: $5.45</p>
        </CardContent>
      </Card>
    </div>
  );

  const SafetyCenterPanel = () => (
    <div className="space-y-4">
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="destructive" size="sm" className="w-full">
            <Phone className="h-4 w-4 mr-2" />
            Emergency Services (911)
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <Phone className="h-4 w-4 mr-2" />
            Company Safety Line
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <MessageCircle className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Safety Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="share-location">Share Location</Label>
            <Switch id="share-location" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="emergency-alerts">Emergency Alerts</Label>
            <Switch id="emergency-alerts" defaultChecked />
          </div>
          <Button variant="outline" size="sm" className="w-full">
            <Shield className="h-4 w-4 mr-2" />
            Safety Check-in
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const ProfilePanel = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Driver Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" defaultValue="John" />
            </div>
            <div>
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" defaultValue="Doe" />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" defaultValue="+1 (555) 123-4567" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Make/Model</Label>
              <Input placeholder="Honda Civic" />
            </div>
            <div>
              <Label>Year</Label>
              <Input placeholder="2020" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Color</Label>
              <Input placeholder="Blue" />
            </div>
            <div>
              <Label>License Plate</Label>
              <Input placeholder="ABC123" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const HelpPanel = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Quick Help
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <ChevronRight className="h-4 w-4 mr-2" />
            How to accept orders
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <ChevronRight className="h-4 w-4 mr-2" />
            Navigation troubleshooting
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <ChevronRight className="h-4 w-4 mr-2" />
            Delivery best practices
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <ChevronRight className="h-4 w-4 mr-2" />
            Payment & earnings FAQ
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Contact Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" className="w-full">
            <Phone className="h-4 w-4 mr-2" />
            Call Support
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat with Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const ShiftPanel = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Current Shift
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Shift Status</span>
            <Badge variant={isShiftActive ? "default" : "secondary"}>
              {isShiftActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {isShiftActive ? (
            <>
              <div className="text-center bg-muted/50 rounded-lg p-3">
                <div className="text-lg font-bold">2h 34m</div>
                <p className="text-xs text-muted-foreground">Time worked today</p>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => setIsShiftActive(false)}
                className="w-full"
              >
                End Shift
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setIsShiftActive(true)}
              className="w-full"
            >
              Start Shift
            </Button>
          )}
        </CardContent>
      </Card>
      {isShiftActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full">
              Take Break
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              Log Mileage
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderToolContent = () => {
    switch (selectedTool) {
      case 'performance': return <PerformancePanel />;
      case 'communication': return <CommunicationPanel />;
      case 'proof-delivery': return <ProofDeliveryPanel />;
      case 'expenses': return <ExpenseTrackerPanel />;
      case 'safety': return <SafetyCenterPanel />;
      case 'profile': return <ProfilePanel />;
      case 'help': return <HelpPanel />;
      case 'shift': return <ShiftPanel />;
      default: return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Driver Tools
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={onlineStatus ? "default" : "secondary"} className="flex items-center gap-1">
              {onlineStatus ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {onlineStatus ? "Online" : "Offline"}
            </Badge>
            <Switch 
              checked={onlineStatus} 
              onCheckedChange={onToggleOnlineStatus}
              aria-label="Toggle online status"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Dialog open={!!selectedTool} onOpenChange={() => setSelectedTool(null)}>
          <div className="grid grid-cols-2 gap-2">
            {tools.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <DialogTrigger key={tool.id} asChild>
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all transform hover:scale-[1.02]"
                    onClick={() => setSelectedTool(tool.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1.5 rounded-md ${tool.color}`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-sm">{tool.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </CardContent>
                  </Card>
                </DialogTrigger>
              );
            })}
          </div>
          
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTool && (() => {
                  const tool = tools.find(t => t.id === selectedTool);
                  if (!tool) return null;
                  const IconComponent = tool.icon;
                  return (
                    <>
                      <div className={`p-1.5 rounded-md ${tool.color}`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      {tool.title}
                    </>
                  );
                })()}
              </DialogTitle>
            </DialogHeader>
            {renderToolContent()}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DriverTools;