// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Check, X, Smartphone, Apple, Users } from 'lucide-react';

interface TesterEnrollment {
  id: string;
  email: string;
  full_name: string;
  platform: 'android' | 'ios';
  is_selected_tester: boolean;
  selected_at: string | null;
  selected_by: string | null;
  enrolled_at: string;
  tester_reward_status: 'enrolled' | 'testing' | 'issued';
}

const TesterEnrollmentManagement: React.FC = () => {
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<TesterEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [bulkSelectCount, setBulkSelectCount] = useState(10);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  useEffect(() => {
    const count = enrollments.filter(e => e.is_selected_tester).length;
    setSelectedCount(count);
  }, [enrollments]);

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('android_tester_enrollments')
        .select('*')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load enrollments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTesterSelection = async (enrollmentId: string, isSelected: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('android_tester_enrollments')
        .update({
          is_selected_tester: !isSelected,
          selected_at: !isSelected ? new Date().toISOString() : null,
          selected_by: !isSelected ? user?.id : null,
        })
        .eq('id', enrollmentId);

      if (error) throw error;

      await fetchEnrollments();

      toast({
        title: 'Success',
        description: isSelected ? 'Tester deselected' : 'Tester selected',
      });
    } catch (error: any) {
      console.error('Error toggling selection:', error);
      toast({
        title: 'Error',
        description: 'Failed to update selection',
        variant: 'destructive',
      });
    }
  };

  const bulkSelectTesters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const unselected = enrollments
        .filter(e => !e.is_selected_tester && selectedCount < 100)
        .slice(0, Math.min(bulkSelectCount, 100 - selectedCount));

      if (unselected.length === 0) {
        toast({
          title: 'No testers to select',
          description: 'All available slots are filled or no unselected enrollments',
        });
        return;
      }

      for (const enrollment of unselected) {
        const { error } = await supabase
          .from('android_tester_enrollments')
          .update({
            is_selected_tester: true,
            selected_at: new Date().toISOString(),
            selected_by: user?.id,
          })
          .eq('id', enrollment.id);

        if (error) throw error;
      }

      await fetchEnrollments();
      setSelectModalOpen(false);

      toast({
        title: 'Success',
        description: `Selected ${unselected.length} testers`,
      });
    } catch (error: any) {
      console.error('Error bulk selecting:', error);
      toast({
        title: 'Error',
        description: 'Failed to select testers',
        variant: 'destructive',
      });
    }
  };

  const filteredEnrollments = enrollments.filter(e => {
    const matchesSearch = 
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || e.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'selected' && e.is_selected_tester) ||
      (statusFilter === 'unselected' && !e.is_selected_tester);
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading enrollments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tester Enrollment Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage Android and iOS tester enrollments and selections
          </p>
        </div>
      </div>

      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          <strong>Selected Testers:</strong> {selectedCount} / 100
          <br />
          Selected testers receive an additional $50 credit ($75 total) when they create an account.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="selected">Selected</SelectItem>
                <SelectItem value="unselected">Unselected</SelectItem>
              </SelectContent>
            </Select>
            {selectedCount < 100 && (
              <Button
                onClick={() => setSelectModalOpen(true)}
                disabled={selectedCount >= 100}
              >
                Bulk Select
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrollments</CardTitle>
          <CardDescription>
            {filteredEnrollments.length} enrollment{filteredEnrollments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reward Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnrollments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No enrollments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEnrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">{enrollment.email}</TableCell>
                    <TableCell>{enrollment.full_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {enrollment.platform === 'android' ? (
                          <Smartphone className="h-4 w-4" />
                        ) : (
                          <Apple className="h-4 w-4" />
                        )}
                        <span className="capitalize">{enrollment.platform}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {enrollment.is_selected_tester ? (
                        <Badge variant="default" className="bg-green-500">Selected</Badge>
                      ) : (
                        <Badge variant="secondary">Not Selected</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {enrollment.tester_reward_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTesterSelection(enrollment.id, enrollment.is_selected_tester)}
                        disabled={!enrollment.is_selected_tester && selectedCount >= 100}
                      >
                        {enrollment.is_selected_tester ? (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Deselect
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Select
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={selectModalOpen} onOpenChange={setSelectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Select Testers</DialogTitle>
            <DialogDescription>
              Select the next {Math.min(bulkSelectCount, 100 - selectedCount)} unselected testers?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Number to select</label>
              <Input
                type="number"
                value={bulkSelectCount}
                onChange={(e) => setBulkSelectCount(Math.min(parseInt(e.target.value) || 1, 100 - selectedCount))}
                min={1}
                max={100 - selectedCount}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={bulkSelectTesters}>
                Select Testers
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TesterEnrollmentManagement;
