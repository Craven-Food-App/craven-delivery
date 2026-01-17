import React, { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  exec_id: string;
  name: string;
  role: string;
  email?: string;
}

interface CreateGroupConversationProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string, groupName: string) => void;
  role?: 'ceo' | 'cfo' | 'coo' | 'cto' | 'board';
  deviceId?: string;
  currentUserId: string | null;
}

export const CreateGroupConversation: React.FC<CreateGroupConversationProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
  role = 'ceo',
  deviceId,
  currentUserId,
}) => {
  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen, currentUserId]);

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: execUsersData, error: execError } = await supabase
        .from('exec_users')
        .select('id, user_id, role, title, department')
        .order('role');

      if (execError) throw execError;

      const userIds = execUsersData.map((eu: any) => eu.user_id).filter(Boolean);
      let userProfilesMap: Record<string, any> = {};
      let employeesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (userProfiles) {
          userProfiles.forEach((up: any) => {
            userProfilesMap[up.id] = up;
          });
        }

        const { data: employees } = await supabase
          .from('employees')
          .select('id, user_id, first_name, last_name, email')
          .in('user_id', userIds);

        if (employees) {
          employees.forEach((emp: any) => {
            employeesMap[emp.user_id] = emp;
          });
        }
      }

      const formattedContacts = execUsersData
        .filter((execUser: any) => execUser.user_id !== user.id)
        .map((execUser: any) => {
          const userProfile = execUser.user_id ? userProfilesMap[execUser.user_id] : null;
          const employee = execUser.user_id ? employeesMap[execUser.user_id] : null;

          const fullName = userProfile?.full_name ||
            (employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : '') ||
            execUser.title ||
            'Unknown Executive';

          return {
            id: execUser.id,
            exec_id: execUser.id,
            name: fullName,
            role: (execUser.role || 'EXECUTIVE').toUpperCase(),
            email: userProfile?.email || employee?.email,
          };
        });

      setContacts(formattedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    }
  };

  const toggleContact = (execId: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      if (next.has(execId)) {
        next.delete(execId);
      } else {
        next.add(execId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for the group conversation",
        variant: "destructive",
      });
      return;
    }

    if (selectedContacts.size === 0) {
      toast({
        title: "Participants required",
        description: "Please select at least one participant",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: currentExec } = await supabase
        .from('exec_users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentExec) throw new Error('No exec user record found');

      const participantIds = Array.from(selectedContacts);

      const { data: groupId, error } = await supabase.rpc('create_group_conversation' as any, {
        p_name: groupName.trim(),
        p_created_by_exec_id: currentExec.id,
        p_portal_context: role || 'ceo',
        p_participant_exec_ids: participantIds,
        p_device_id: deviceId || null,
      });

      if (error) throw error;

      toast({
        title: "Group created",
        description: `Group conversation "${groupName}" created successfully`,
      });

      onGroupCreated(String(groupId), groupName.trim());
      setGroupName('');
      setSelectedContacts(new Set());
      onClose();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create group conversation",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-800">Create Group Conversation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Group Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Executive Team, Board Meeting, etc."
              className="w-full"
            />
          </div>

          {/* Participants Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Participants ({selectedContacts.size} selected)
            </label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {contacts.map((contact) => {
                const isSelected = selectedContacts.has(contact.exec_id);
                return (
                  <div
                    key={contact.exec_id}
                    onClick={() => toggleContact(contact.exec_id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-50 border-2 border-orange-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{contact.name}</p>
                      <p className="text-sm text-gray-500">{contact.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !groupName.trim() || selectedContacts.size === 0}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </div>
    </div>
  );
};

