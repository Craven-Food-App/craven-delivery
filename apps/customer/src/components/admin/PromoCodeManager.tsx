import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Calendar as CalendarIcon, 
  Users, 
  TrendingUp, 
  DollarSign,
  Percent,
  Truck,
  Gift
} from 'lucide-react';
import { format } from 'date-fns';

interface PromoCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_delivery' | 'bogo' | 'total_free';
  discount_percentage?: number;
  discount_amount_cents?: number;
  minimum_order_cents: number;
  maximum_discount_cents?: number;
  usage_limit?: number;
  usage_count: number;
  per_user_limit: number;
  valid_from: string;
  valid_until?: string;
  customer_eligibility: 'all' | 'new_users' | 'existing_users';
  applicable_to: 'all' | 'delivery_fee' | 'subtotal';
  is_active: boolean;
  created_at: string;
}

interface PromoCodeFormData {
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_delivery' | 'bogo' | 'total_free';
  discount_percentage: string;
  discount_amount_cents: string;
  minimum_order_cents: string;
  maximum_discount_cents: string;
  usage_limit: string;
  per_user_limit: string;
  valid_from: Date;
  valid_until?: Date;
  customer_eligibility: 'all' | 'new_users' | 'existing_users';
  applicable_to: 'all' | 'delivery_fee' | 'subtotal';
  is_active: boolean;
}

const initialFormData: PromoCodeFormData = {
  code: '',
  name: '',
  description: '',
  type: 'percentage',
  discount_percentage: '10',
  discount_amount_cents: '500',
  minimum_order_cents: '0',
  maximum_discount_cents: '',
  usage_limit: '',
  per_user_limit: '1',
  valid_from: new Date(),
  valid_until: undefined,
  customer_eligibility: 'all',
  applicable_to: 'all',
  is_active: true,
};

export const PromoCodeManager: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState<PromoCodeFormData>(initialFormData);
  const { toast } = useToast();

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes((data as PromoCode[]) || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch promo codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const promoData = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        discount_percentage: formData.type === 'percentage' ? parseFloat(formData.discount_percentage) : null,
        discount_amount_cents: ['fixed_amount', 'bogo'].includes(formData.type) ? parseInt(formData.discount_amount_cents) : null,
        minimum_order_cents: parseInt(formData.minimum_order_cents) || 0,
        maximum_discount_cents: formData.maximum_discount_cents ? parseInt(formData.maximum_discount_cents) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        per_user_limit: parseInt(formData.per_user_limit) || 1,
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until?.toISOString() || null,
        customer_eligibility: formData.customer_eligibility,
        applicable_to: formData.applicable_to,
        is_active: formData.is_active,
        created_by: user.id,
      };

      let result;
      if (editingCode) {
        result = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingCode.id);
      } else {
        result = await supabase
          .from('promo_codes')
          .insert([promoData]);
      }

      if (result.error) throw result.error;

      toast({
        title: 'Success',
        description: `Promo code ${editingCode ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      setEditingCode(null);
      setFormData(initialFormData);
      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save promo code',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setEditingCode(promoCode);
    setFormData({
      code: promoCode.code,
      name: promoCode.name,
      description: promoCode.description || '',
      type: promoCode.type,
      discount_percentage: promoCode.discount_percentage?.toString() || '10',
      discount_amount_cents: promoCode.discount_amount_cents?.toString() || '500',
      minimum_order_cents: promoCode.minimum_order_cents?.toString() || '0',
      maximum_discount_cents: promoCode.maximum_discount_cents?.toString() || '',
      usage_limit: promoCode.usage_limit?.toString() || '',
      per_user_limit: promoCode.per_user_limit?.toString() || '1',
      valid_from: new Date(promoCode.valid_from),
      valid_until: promoCode.valid_until ? new Date(promoCode.valid_until) : undefined,
      customer_eligibility: promoCode.customer_eligibility,
      applicable_to: promoCode.applicable_to,
      is_active: promoCode.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Promo code deleted successfully',
      });

      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error deleting promo code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete promo code',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Promo code ${!isActive ? 'activated' : 'deactivated'}`,
      });

      fetchPromoCodes();
    } catch (error: any) {
      console.error('Error toggling promo code status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update promo code status',
        variant: 'destructive',
      });
    }
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied',
      description: `Promo code "${code}" copied to clipboard`,
    });
  };

  const getPromoTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-3 w-3" />;
      case 'fixed_amount':
        return <DollarSign className="h-3 w-3" />;
      case 'free_delivery':
        return <Truck className="h-3 w-3" />;
      case 'bogo':
        return <Gift className="h-3 w-3" />;
      default:
        return <TrendingUp className="h-3 w-3" />;
    }
  };

  const getPromoTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'Percentage Off';
      case 'fixed_amount':
        return 'Fixed Amount Off';
      case 'free_delivery':
        return 'Free Delivery';
      case 'total_free':
        return 'Everything Free';
      case 'bogo':
        return 'Buy One Get One';
      default:
        return type;
    }
  };

  const getDiscountDisplay = (promoCode: PromoCode) => {
    switch (promoCode.type) {
      case 'percentage':
        return `${promoCode.discount_percentage}% off`;
      case 'fixed_amount':
        return `$${((promoCode.discount_amount_cents || 0) / 100).toFixed(2)} off`;
      case 'free_delivery':
        return 'Free delivery';
      case 'total_free':
        return 'Everything FREE!';
      case 'bogo':
        return 'Buy 1 Get 1 Free';
      default:
        return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Promo Code Management</h2>
          <p className="text-xs text-muted-foreground">Create and manage promotional codes and discounts</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setEditingCode(null);
                setFormData(initialFormData);
              }}
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Create Promo Code
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg">
                {editingCode ? 'Edit Promo Code' : 'Create New Promo Code'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingCode ? 'Update the promo code details below' : 'Fill in the details to create a new promotional code'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs">Promo Code*</Label>
                  <Input
                    id="code"
                    className="h-8 text-sm"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Display Name*</Label>
                  <Input
                    id="name"
                    className="h-8 text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="20% Off Everything"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  className="text-sm min-h-[60px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Save 20% on your entire order"
                  rows={2}
                />
              </div>

              {/* Discount Configuration */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-xs">Discount Type*</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                      <SelectItem value="free_delivery">Free Delivery</SelectItem>
                      <SelectItem value="total_free">Everything Free</SelectItem>
                      <SelectItem value="bogo">Buy One Get One Free</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'percentage' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="discount_percentage" className="text-xs">Discount Percentage*</Label>
                      <div className="relative">
                        <Input
                          id="discount_percentage"
                          className="h-8 text-sm"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.discount_percentage}
                          onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                          required
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="maximum_discount_cents" className="text-xs">Maximum Discount ($)</Label>
                      <Input
                        id="maximum_discount_cents"
                        className="h-8 text-sm"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.maximum_discount_cents}
                        onChange={(e) => setFormData({ ...formData, maximum_discount_cents: e.target.value })}
                        placeholder="25.00"
                      />
                    </div>
                  </div>
                )}

                {['fixed_amount', 'bogo'].includes(formData.type) && (
                  <div className="space-y-1.5">
                    <Label htmlFor="discount_amount_cents" className="text-xs">Discount Amount ($)*</Label>
                    <Input
                      id="discount_amount_cents"
                      className="h-8 text-sm"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_amount_cents}
                      onChange={(e) => setFormData({ ...formData, discount_amount_cents: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Usage Restrictions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Usage Restrictions</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="minimum_order_cents" className="text-xs">Minimum Order ($)</Label>
                    <Input
                      id="minimum_order_cents"
                      className="h-8 text-sm"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minimum_order_cents}
                      onChange={(e) => setFormData({ ...formData, minimum_order_cents: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="per_user_limit" className="text-xs">Uses Per User</Label>
                    <Input
                      id="per_user_limit"
                      className="h-8 text-sm"
                      type="number"
                      min="1"
                      value={formData.per_user_limit}
                      onChange={(e) => setFormData({ ...formData, per_user_limit: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="usage_limit" className="text-xs">Total Usage Limit</Label>
                    <Input
                      id="usage_limit"
                      className="h-8 text-sm"
                      type="number"
                      min="1"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer_eligibility" className="text-xs">Customer Eligibility</Label>
                    <Select value={formData.customer_eligibility} onValueChange={(value: any) => setFormData({ ...formData, customer_eligibility: value })}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="new_users">New Users Only</SelectItem>
                        <SelectItem value="existing_users">Existing Users Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="applicable_to" className="text-xs">Apply Discount To</Label>
                  <Select value={formData.applicable_to} onValueChange={(value: any) => setFormData({ ...formData, applicable_to: value })}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Entire Order</SelectItem>
                      <SelectItem value="subtotal">Subtotal Only</SelectItem>
                      <SelectItem value="delivery_fee">Delivery Fee Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Validity Period */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Validity Period</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valid From*</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-8 justify-start text-left font-normal text-sm">
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {format(formData.valid_from, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.valid_from}
                          onSelect={(date) => date && setFormData({ ...formData, valid_from: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valid Until (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-8 justify-start text-left font-normal text-sm">
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {formData.valid_until ? format(formData.valid_until, 'PPP') : 'No expiry'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.valid_until}
                          onSelect={(date) => setFormData({ ...formData, valid_until: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="text-xs">Active</Label>
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm" className="flex-1 h-8 text-xs">
                  {editingCode ? 'Update Promo Code' : 'Create Promo Code'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Promo Codes Table */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-base">Active Promo Codes</CardTitle>
          <CardDescription className="text-xs">
            Manage all promotional codes and track their usage
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3">
          {promoCodes.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No promo codes created yet. Click "Create Promo Code" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 py-2 px-3 text-xs">Code</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Name</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Type</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Discount</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Usage</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Valid Until</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-xs">Status</TableHead>
                  <TableHead className="h-8 py-2 px-3 text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promoCode) => (
                  <TableRow key={promoCode.id}>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                          {promoCode.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyPromoCode(promoCode.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs font-medium">{promoCode.name}</TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3">{getPromoTypeIcon(promoCode.type)}</div>
                        <span className="text-xs">{getPromoTypeLabel(promoCode.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs">{getDiscountDisplay(promoCode)}</TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="text-xs">
                        {promoCode.usage_count}
                        {promoCode.usage_limit && ` / ${promoCode.usage_limit}`}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs">
                      {promoCode.valid_until 
                        ? format(new Date(promoCode.valid_until), 'MMM dd, yyyy')
                        : 'No expiry'
                      }
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant={promoCode.is_active ? 'default' : 'secondary'} className="text-xs">
                        {promoCode.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(promoCode)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Switch 
                          checked={promoCode.is_active}
                          onCheckedChange={() => handleToggleActive(promoCode.id, promoCode.is_active)}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(promoCode.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};