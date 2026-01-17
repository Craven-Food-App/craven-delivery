// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Play,
  Settings,
  X,
  ChevronDown,
  Power,
  TrendingUp,
  Target,
  Zap,
} from 'lucide-react';

// ===== MODERN UI COMPONENTS =====

const Card = ({ children, className = '' }) => (
  <div className={`rounded-lg bg-white shadow border border-slate-200 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-slate-100 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`font-semibold text-base text-slate-900 ${className}`}>{children}</h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`px-6 py-5 ${className}`}>{children}</div>
);

const Button = ({ children, variant = 'default', size = 'default', className = '', onClick, disabled = false, type = 'button', fullWidth = false }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    default: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500 shadow-sm',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-400',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-slate-400',
    ghost: 'hover:bg-slate-100 text-slate-600',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  };

  const sizes = {
    default: 'h-10 px-4 text-sm',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-12 px-6 text-base',
    icon: 'h-10 w-10',
  };

  return (
    <button 
      type={type as "button" | "submit" | "reset"} 
      className={`${baseClasses} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${fullWidth ? 'w-full' : ''} ${className}`} 
      onClick={onClick} 
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-orange-50 text-orange-700 border-orange-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
};

const Switch = ({ checked, onCheckedChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-orange-600' : 'bg-slate-300'}`}
  >
    <span
      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

const Input = ({ type = 'text', value, onChange, placeholder = '', className = '', name }) => (
  <input 
    type={type} 
    name={name}
    value={value} 
    onChange={onChange} 
    placeholder={placeholder} 
    className={`flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  />
);

const Select = ({ value, onChange, options, className = '', name }) => (
  <select 
    name={name}
    value={value} 
    onChange={onChange} 
    className={`flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    {options.map(option => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
);

const Label = ({ children, className = '' }) => (
  <label className={`text-sm font-medium text-gray-700 ${className}`}>{children}</label>
);

// ===== TOAST SYSTEM =====
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  
  const toast = ({ title, description, variant = 'default' }) => {
    const id = Date.now();
    const newToast = { id, title, description, variant };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 3000);
  };
  
  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className={`p-4 rounded-xl shadow-2xl text-white backdrop-blur-sm transition-all duration-300 ${
            t.variant === 'destructive' ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          <div className="font-semibold mb-1">{t.title}</div>
          <div className="text-sm opacity-90">{t.description}</div>
        </div>
      ))}
    </div>
  );
  
  return { toast, ToastContainer };
};

// ===== INTERFACES =====
interface ScheduleBlock {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  is_recurring: boolean;
  created_at: string;
}

interface AvailabilitySettings {
  auto_online: boolean;
  break_reminders: boolean;
  max_hours_per_day: number;
  preferred_zones: string[];
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ===== SCHEDULE FORM MODAL =====
interface ScheduleBlockFormProps {
  block: ScheduleBlock | null;
  onClose: () => void;
  onSave: (block: ScheduleBlock) => void;
}

const ScheduleBlockForm: React.FC<ScheduleBlockFormProps> = ({ block, onClose, onSave }) => {
  const isEditing = !!block;
  const initialBlock: ScheduleBlock = block || {
    id: Date.now().toString(),
    day_of_week: new Date().getDay(),
    start_time: '09:00',
    end_time: '17:00',
    is_active: true,
    is_recurring: true,
    created_at: new Date().toISOString(),
  };

  const [formData, setFormData] = useState(initialBlock);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_recurring: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.start_time >= formData.end_time) {
      alert("End time must be after start time.");
      return;
    }
    onSave(formData);
    onClose();
  };

  const dayOptions = DAYS_OF_WEEK.map((day, index) => ({ value: index.toString(), label: day }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300 sm:animate-in sm:zoom-in-95">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
          <CardTitle className="text-lg">{isEditing ? 'Edit Schedule' : 'Add Schedule'}</CardTitle>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 pt-5">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select 
                name="day_of_week"
                value={formData.day_of_week.toString()}
                onChange={handleChange}
                options={dayOptions}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input 
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input 
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <Label className="font-semibold">Repeat Weekly</Label>
                <p className="text-xs text-gray-500 mt-1">Schedule repeats every week</p>
              </div>
              <Switch 
                checked={formData.is_recurring}
                onCheckedChange={handleCheckboxChange}
              />
            </div>
          </CardContent>
          
          <div className="flex gap-3 p-5 pt-0">
            <Button type="button" variant="outline" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="default" fullWidth>
              {isEditing ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// ===== MAIN COMPONENT =====
export default function ScheduleSection() {
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [availabilitySettings, setAvailabilitySettings] = useState<AvailabilitySettings>({
    auto_online: true,
    break_reminders: true,
    max_hours_per_day: 12,
    preferred_zones: ['Downtown', 'University District']
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'offline' | 'scheduled' | 'online'>('offline');
  const [todayHours, setTodayHours] = useState({ scheduled: 8, worked: 3.5 });
  const [loading, setLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const { toast, ToastContainer } = useToast();

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getCurrentTimeString = () => new Date().toTimeString().slice(0, 5);

  const calculateTotalTime = useCallback((start_time: string, end_time: string) => {
    const [startH, startM] = start_time.split(':').map(Number);
    const [endH, endM] = end_time.split(':').map(Number);
    const startTimeInMinutes = startH * 60 + startM;
    const endTimeInMinutes = endH * 60 + endM;
    let duration = endTimeInMinutes - startTimeInMinutes;
    if (duration < 0) duration += 24 * 60;
    return duration / 60;
  }, []);

  const calculateWeeklyHours = useCallback((blocks: ScheduleBlock[]) => {
    return blocks
      .filter(block => block.is_active)
      .reduce((total, block) => total + calculateTotalTime(block.start_time, block.end_time), 0);
  }, [calculateTotalTime]);

  const handleSaveBlock = async (block: ScheduleBlock) => {
    try {
      if (scheduleBlocks.find(b => b.id === block.id)) {
        setScheduleBlocks(prev => prev.map(b => (b.id === block.id ? block : b)));
        toast({ title: "Schedule Updated", description: "Your shift has been updated." });
      } else {
        setScheduleBlocks(prev => [...prev, block]);
        toast({ title: "Schedule Added", description: "New shift has been added." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save schedule.", variant: "destructive" });
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!window.confirm("Remove this shift?")) return;
    setScheduleBlocks(prev => prev.filter(b => b.id !== id));
    toast({ title: "Schedule Removed", description: "Shift has been deleted." });
  };

  const handleQuickSchedule = (hours: number) => {
    const now = new Date();
    const startTime = getCurrentTimeString();
    const endDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const endTime = endDate.toTimeString().slice(0, 5);
    
    const newBlock: ScheduleBlock = {
      id: Date.now().toString(),
      day_of_week: now.getDay(),
      start_time: startTime,
      end_time: endTime,
      is_active: true,
      is_recurring: false,
      created_at: new Date().toISOString()
    };
    
    handleSaveBlock(newBlock);
    setCurrentStatus('online');
    toast({
      title: "You're Online!",
      description: `Active for the next ${hours} hours.`,
    });
  };

  const handleManualToggle = async () => {
    const newStatus = currentStatus === 'online' ? 'offline' : 'online';
    setCurrentStatus(newStatus);
    
    // Update driver profile status in database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('driver_profiles').update({
          status: newStatus,
          is_available: newStatus === 'online',
          last_location_update: new Date().toISOString()
        }).eq('user_id', user.id);
        
        // Update driver session
        await supabase.from('driver_sessions').upsert({
          driver_id: user.id,
          is_online: newStatus === 'online',
          last_activity: new Date().toISOString(),
          session_data: newStatus === 'online' ? { online_since: new Date().toISOString() } : {}
        }, { onConflict: 'driver_id' });
      }
    } catch (error) {
      console.error('Error updating driver status:', error);
    }
    
    if (newStatus === 'online') {
      toast({ title: "You're Online", description: "Ready to receive delivery requests" });
    } else {
      toast({ title: "You're Offline", description: "No longer receiving requests", variant: "destructive" });
    }
  };

  // Listen for driver status changes from main dashboard
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      const { status } = event.detail;
      setCurrentStatus(status);
    };
    
    window.addEventListener('driverStatusChange', handleStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('driverStatusChange', handleStatusChange as EventListener);
    };
  }, []);

  const weeklyHours = calculateWeeklyHours(scheduleBlocks);
  const progressPercentage = todayHours.scheduled > 0 ? (todayHours.worked / todayHours.scheduled) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <ToastContainer />
      
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        
        {/* Header - Clean Style */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-6 text-right">Schedule</h1>
          
          {/* Go Online Button - Prominent */}
          <Button 
            variant={currentStatus === 'online' ? 'destructive' : 'default'}
            size="lg"
            onClick={handleManualToggle}
            fullWidth
            className="shadow-lg mb-4"
          >
            {currentStatus === 'online' ? (
              <>
                <Power className="h-5 w-5 mr-2" />
                Stop Driving
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Go Online
              </>
            )}
          </Button>
        </div>

        {/* Current Status - Simple */}
        {currentStatus === 'online' && (
          <Card className="border-l-4 border-green-500 bg-green-50/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-sm font-medium text-green-900">You're online and accepting orders</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Schedule */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Quick Schedule</h2>
          <div className="grid grid-cols-3 gap-3">
            {[2, 4, 8].map(hours => (
              <button
                key={hours}
                onClick={() => handleQuickSchedule(hours)}
                className="p-4 rounded-lg border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-all text-center bg-white"
              >
                <div className="text-2xl font-bold text-slate-900 mb-0.5">{hours}h</div>
                <div className="text-xs text-slate-600 font-medium">Start now</div>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Progress - Minimal */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Today</span>
              <span className="text-sm font-semibold text-slate-900">
                {todayHours.worked.toFixed(1)}h / {todayHours.scheduled.toFixed(1)}h
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${Math.min(100, progressPercentage)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Schedule */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Your Schedule</h2>
            <Button 
              variant="default"
              size="sm"
              onClick={() => { setEditingBlock(null); setIsModalOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Hours</span>
              <span className="text-xl font-bold text-orange-600">{weeklyHours.toFixed(1)}h</span>
            </div>

            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day, index) => {
                const dayBlocks = scheduleBlocks
                  .filter(block => block.day_of_week === index)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));
                const isToday = new Date().getDay() === index;
                
                return (
                  <div 
                    key={day}
                    className={`rounded-xl border-2 transition-all ${
                      isToday ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                          isToday ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {DAYS_SHORT[index]}
                        </div>
                        <div>
                          <p className={`font-semibold ${isToday ? 'text-orange-900' : 'text-gray-900'}`}>
                            {day}
                          </p>
                          <p className="text-xs text-gray-500">
                            {dayBlocks.length > 0 
                              ? `${dayBlocks.length} shift${dayBlocks.length > 1 ? 's' : ''}`
                              : 'No shifts'}
                          </p>
                        </div>
                      </div>
                      {dayBlocks.length > 0 && (
                        <button
                          onClick={() => setExpandedDay(expandedDay === index ? null : index)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${expandedDay === index ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                    
                    {expandedDay === index && dayBlocks.length > 0 && (
                      <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                        {dayBlocks.map((block) => (
                          <div 
                            key={block.id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {formatTime(block.start_time)} - {formatTime(block.end_time)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {block.is_recurring ? 'Recurring' : 'One-time'}
                                </p>
                              </div>
                            </div>
                            {isEditing && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { setEditingBlock(block); setIsModalOpen(true); }}
                                  className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBlock(block.id)}
                                  className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-sm text-gray-900">Auto Go Online</p>
                <p className="text-xs text-gray-500 mt-0.5">Start automatically at scheduled times</p>
              </div>
              <Switch 
                checked={availabilitySettings.auto_online}
                onCheckedChange={(checked) => 
                  setAvailabilitySettings(prev => ({ ...prev, auto_online: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-sm text-gray-900">Break Reminders</p>
                <p className="text-xs text-gray-500 mt-0.5">Get notified to take breaks</p>
              </div>
              <Switch 
                checked={availabilitySettings.break_reminders}
                onCheckedChange={(checked) => 
                  setAvailabilitySettings(prev => ({ ...prev, break_reminders: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

      </div>

      {isModalOpen && (
        <ScheduleBlockForm 
          block={editingBlock}
          onClose={() => { setIsModalOpen(false); setEditingBlock(null); }}
          onSave={handleSaveBlock}
        />
      )}
    </div>
  );
}
