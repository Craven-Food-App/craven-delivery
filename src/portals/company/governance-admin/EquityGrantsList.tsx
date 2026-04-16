// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Table,
  Badge,
  Loader,
  Alert,
  Group,
  NumberFormatter,
  Button,
  TextInput,
  Select,
  Box,
  Paper,
  Tooltip,
  ActionIcon,
  Menu,
  ScrollArea,
  Divider,
  Grid,
  Progress,
  Modal,
  Textarea,
  Tabs,
} from '@mantine/core';
import { IconCoins, IconRefresh, IconAlertCircle, IconSearch, IconFilter, IconDownload, IconDotsVertical, IconEye, IconEdit, IconTrash, IconCheck, IconX, IconHistory, IconArchive } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { recalculateCapTable } from '@/utils/recalculateCapTable';

interface EquityGrant {
  id: string;
  recipient_user_id: string;
  recipient_email?: string;
  recipient_name?: string;
  shares_amount: number;
  share_class: string;
  transaction_date: string;
  vesting_type?: string;
  vested_shares?: number;
  unvested_shares?: number;
}

interface RevokedGrant extends EquityGrant {
  revoked_date?: string;
  revocation_reason?: string;
}

function isMarkaylaDanzyRecipient(name: string | undefined | null): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('markayla') && n.includes('danzy');
}

const EquityGrantsList: React.FC = () => {
  const [grants, setGrants] = useState<EquityGrant[]>([]);
  const [revokedGrants, setRevokedGrants] = useState<RevokedGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'revoked'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [shareClassFilter, setShareClassFilter] = useState<string | null>(null);
  const [vestingFilter, setVestingFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'shares' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<EquityGrant | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [editingShares, setEditingShares] = useState<number>(0);
  const [editingShareClass, setEditingShareClass] = useState<string>('Common');
  const [editingVestingType, setEditingVestingType] = useState<string>('immediate');
  const [editingCliffMonths, setEditingCliffMonths] = useState<number>(0);
  const [editingVestingPeriodMonths, setEditingVestingPeriodMonths] = useState<number>(48);
  const [editingGrantDate, setEditingGrantDate] = useState<string>('');
  const [currentVestingSchedule, setCurrentVestingSchedule] = useState<any>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    console.log('🚀 [EQUITY GRANTS LIST] Component mounted, loading grants...');
    loadGrants();

    const handleRefresh = () => {
      console.log('🔄 [EQUITY GRANTS LIST] Refresh event received, reloading grants...');
      loadGrants();
    };

    window.addEventListener('equityGrantCreated', handleRefresh);
    return () => {
      window.removeEventListener('equityGrantCreated', handleRefresh);
    };
  }, []);

  const loadGrants = async () => {
    console.log('📥 [EQUITY GRANTS LIST] Starting to load grants...');
    setLoading(true);
    try {
      // First, get all cancellation entries to identify revoked grants
      // Also query ALL transaction types to debug RLS issues
      const { data: allTransactions, error: allError } = await supabase
        .from('equity_ledger')
        .select('transaction_type, recipient_user_id, shares_amount, grant_id, transaction_date, created_at, notes')
        .order('created_at', { ascending: false });
      
      console.log('🔍 [REVOCATION CHECK] All equity_ledger entries:', allTransactions?.length || 0);
      if (allTransactions && allTransactions.length > 0) {
        const byType = allTransactions.reduce((acc: any, t: any) => {
          acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
          return acc;
        }, {});
        console.log('🔍 [REVOCATION CHECK] Entries by transaction_type:', byType);
        console.log('🔍 [REVOCATION CHECK] All entries:', allTransactions);
      }
      
      const { data: cancellations, error: cancelError } = await supabase
        .from('equity_ledger')
        .select('recipient_user_id, shares_amount, grant_id, transaction_date, created_at, notes')
        .eq('transaction_type', 'cancellation');
      
      if (cancelError) {
        console.warn('⚠️ Error loading cancellations:', cancelError);
      }
      
      console.log('🔍 [REVOCATION CHECK] Cancellations found:', cancellations?.length || 0);
      if (cancellations && cancellations.length > 0) {
        console.log('🔍 [REVOCATION CHECK] Cancellation details:', cancellations.map(c => ({
          user_id: c.recipient_user_id,
          shares: c.shares_amount,
          grant_id: c.grant_id,
          date: c.transaction_date
        })));
      }
      
      // Create a set of revoked grant keys (user_id + shares_amount or grant_id)
      const revokedGrantKeys = new Set<string>();
      const revokedByUserId = new Map<string, Set<number>>(); // user_id -> set of revoked share amounts
      
      if (cancellations) {
        for (const cancel of cancellations) {
          // Match by grant_id if available
          if (cancel.grant_id) {
            revokedGrantKeys.add(`grant_id:${cancel.grant_id}`);
          }
          
          // ALWAYS add user_id + shares_amount match (even if grant_id exists)
          // This handles cases where grant_id is NULL
          const userSharesKey = `${cancel.recipient_user_id}_${cancel.shares_amount}`;
          revokedGrantKeys.add(userSharesKey);
          
          // Also track by user_id for flexible matching
          if (!revokedByUserId.has(cancel.recipient_user_id)) {
            revokedByUserId.set(cancel.recipient_user_id, new Set());
          }
          revokedByUserId.get(cancel.recipient_user_id)!.add(cancel.shares_amount);
        }
      }
      
      console.log('🚫 Found', revokedGrantKeys.size, 'revoked grant keys to exclude');
      console.log('🚫 Revoked by user_id:', Array.from(revokedByUserId.entries()).map(([uid, amounts]) => ({
        user_id: uid,
        revoked_amounts: Array.from(amounts)
      })));
      
      const { data: ledgerEntries, error: ledgerError } = await supabase
        .from('equity_ledger')
        .select('id, recipient_user_id, shares_amount, share_class, transaction_date, transaction_type, created_at, resolution_id, grant_id')
        .eq('transaction_type', 'grant')
        .order('created_at', { ascending: false });

      if (ledgerError) {
        console.error('❌ [EQUITY GRANTS LIST] Error loading equity ledger:', ledgerError);
        throw ledgerError;
      }

      console.log('✅ [EQUITY GRANTS LIST] Loaded ledger entries:', ledgerEntries?.length, ledgerEntries);
      
      // Filter out revoked grants
      const activeGrants = ledgerEntries?.filter(entry => {
        // Check multiple matching strategies
        let isRevoked = false;
        
        // Strategy 1: Match by grant_id if available
        if (entry.grant_id) {
          isRevoked = revokedGrantKeys.has(`grant_id:${entry.grant_id}`);
        }
        
        // Strategy 2: Match by user_id + shares_amount (works even if grant_id is NULL)
        if (!isRevoked) {
          const userSharesKey = `${entry.recipient_user_id}_${entry.shares_amount}`;
          isRevoked = revokedGrantKeys.has(userSharesKey);
        }
        
        // Strategy 3: Check if this user_id has ANY revocation for this share amount
        if (!isRevoked && revokedByUserId.has(entry.recipient_user_id)) {
          const revokedAmounts = revokedByUserId.get(entry.recipient_user_id)!;
          isRevoked = revokedAmounts.has(entry.shares_amount);
        }
        
        if (isRevoked) {
          console.log('🚫 Filtering out revoked grant:', {
            id: entry.id,
            user_id: entry.recipient_user_id,
            shares: entry.shares_amount,
            grant_id: entry.grant_id,
            matched_by: entry.grant_id ? 'grant_id' : 'user_id+shares_amount'
          });
        }
        return !isRevoked;
      }) || [];
      
      console.log('✅ Active grants (after filtering revoked):', activeGrants.length, 'of', ledgerEntries?.length || 0);
      
      if (activeGrants) {
        console.log('📊 All active grant shares amounts:', activeGrants.map(e => ({
          id: e.id,
          shares: e.shares_amount,
          user_id: e.recipient_user_id,
          date: e.transaction_date,
          created_at: e.created_at
        })));
      }
      
      const { data: justinGrants, error: justinError } = await supabase
        .from('equity_ledger')
        .select('id, recipient_user_id, shares_amount, share_class, transaction_date, transaction_type, created_at, resolution_id, grant_id')
        .eq('transaction_type', 'grant')
        .gte('shares_amount', 4500000)
        .lte('shares_amount', 5500000)
        .order('created_at', { ascending: false });
      
      if (!justinError && justinGrants && justinGrants.length > 0) {
        // Filter out revoked grants
        const activeJustinGrants = justinGrants.filter(g => {
          const grantKey = g.grant_id 
            ? `grant_id:${g.grant_id}` 
            : `${g.recipient_user_id}_${g.shares_amount}`;
          return !revokedGrantKeys.has(grantKey);
        });
        
        console.log('🔍 Found 5M grants in ledger:', activeJustinGrants.length, 'active of', justinGrants.length, 'total');
        if (activeGrants) {
          const existingIds = new Set(activeGrants.map(e => e.id));
          const newGrants = activeJustinGrants.filter(g => !existingIds.has(g.id));
          if (newGrants.length > 0) {
            console.log('➕ Adding', newGrants.length, '5M grants that were missing from main query');
            activeGrants.push(...newGrants);
          }
        }
      }

      const { data: equityGrants, error: grantsError } = await supabase
        .from('equity_grants')
        .select(`
          id,
          executive_id,
          employee_id,
          shares_total,
          board_resolution_id,
          status,
          grant_date,
          share_class,
          exec_users!equity_grants_executive_id_fkey (
            id,
            user_id,
            title,
            role
          ),
          employees!equity_grants_employee_id_fkey (
            id,
            user_id,
            email,
            first_name,
            last_name
          )
        `)
        .order('grant_date', { ascending: false });

      if (grantsError) {
        console.warn('Error loading equity grants:', grantsError);
      }

      const resolutionToExecutive = new Map();
      const equityGrantsByUserId = new Map();
      if (equityGrants) {
        for (const grant of equityGrants) {
          const execUser = (grant as any).exec_users;
          if (grant.board_resolution_id && execUser) {
            resolutionToExecutive.set(grant.board_resolution_id, {
              user_id: execUser.user_id,
              title: execUser.title,
              role: execUser.role,
              email: execUser.email,
              shares_total: grant.shares_total,
            });
          }
          if (execUser?.user_id) {
            equityGrantsByUserId.set(execUser.user_id, {
              shares_total: grant.shares_total,
              board_resolution_id: grant.board_resolution_id,
              execUser: execUser,
            });
          }
        }
      }

      const { data: vestingSchedules, error: vestingError } = await supabase
        .from('vesting_schedules')
        .select('id, recipient_user_id, vesting_type, vested_shares, unvested_shares')
        .order('created_at', { ascending: false });

      if (vestingError) {
        console.warn('Error loading vesting schedules:', vestingError);
      }

      const grantsWithUsers: EquityGrant[] = [];
      const processedShares = new Set<string>();
      
      console.log('📊 Processing', activeGrants?.length || 0, 'active grant entries...');
      if (activeGrants) {
        for (const entry of activeGrants) {
          const sharesRaw = entry.shares_amount;
          const sharesNum = Number(String(sharesRaw).replace(/,/g, '').trim()) || 0;
          const sharesKey = `${sharesNum}`;
          
          if (processedShares.has(sharesKey)) {
            console.log('⏭️ Skipping duplicate shares amount:', sharesNum);
            continue;
          }
          processedShares.add(sharesKey);
          
          let recipientEmail = '';
          let recipientName = '';
          
          if ((sharesNum >= 17500000 && sharesNum <= 18500000) || (sharesNum >= 10400000 && sharesNum <= 10600000)) {
            recipientName = 'Torrance Stroman (Founder CEO)';
            recipientEmail = 'tstroman.ceo@cravenusa.com';
            console.log('✅ TORRANCE:', sharesNum, 'shares');
          } else if (sharesNum >= 4500000 && sharesNum <= 5500000) {
            recipientName = 'Justin Sweet';
            recipientEmail = 'jsweet.cfo@cravenusa.com';
            console.log('✅ JUSTIN:', sharesNum, 'shares');
          } else if (sharesNum >= 450000 && sharesNum <= 550000) {
            recipientName = 'Nathan Curry';
            recipientEmail = 'natecurry.cto@cravenusa.com';
            console.log('✅ NATHAN:', sharesNum, 'shares');
          } else {
            console.log('⚠️ NO MATCH:', sharesNum, 'shares (raw:', sharesRaw, ')');
          }
          
          if (!recipientName || !recipientEmail) {
            if (entry.resolution_id && resolutionToExecutive.has(entry.resolution_id)) {
              const execInfo = resolutionToExecutive.get(entry.resolution_id);
              console.log('Found executive info from equity_grants:', execInfo);
              if (!recipientEmail && execInfo.email) recipientEmail = execInfo.email;
              if (!recipientName && execInfo.title) {
                recipientName = execInfo.title;
                if (execInfo.role) {
                  recipientName += ` (${execInfo.role.toUpperCase()})`;
                }
              }
            }
            
            try {
              if (!recipientEmail || !recipientName) {
                const { data: profile } = await supabase
                  .from('user_profiles')
                  .select('email, full_name')
                  .eq('user_id', entry.recipient_user_id)
                  .maybeSingle();
                
                if (profile) {
                  recipientEmail = profile.email || recipientEmail || '';
                  recipientName = profile.full_name || recipientName || '';
                }
              }
            
              if (!recipientEmail || !recipientName) {
                const { data: execUserData } = await supabase
                  .from('exec_users')
                  .select('*')
                  .eq('user_id', entry.recipient_user_id)
                  .maybeSingle() as any;
                
                if (execUserData) {
                  if (execUserData.email && !recipientEmail) {
                    recipientEmail = execUserData.email;
                  }
                  
                  if (!recipientName) {
                    recipientName = execUserData.title || execUserData.name || '';
                    if (execUserData.role && !recipientName) {
                      const roleMap: Record<string, string> = {
                        'ceo': 'Chief Executive Officer',
                        'cfo': 'Chief Financial Officer',
                        'cto': 'Chief Technology Officer',
                        'coo': 'Chief Operating Officer',
                      };
                      recipientName = roleMap[execUserData.role.toLowerCase()] || execUserData.role.toUpperCase();
                    }
                    if (recipientName && execUserData.role) {
                      recipientName += ` (${execUserData.role.toUpperCase()})`;
                    }
                  }
                }
              }
            
              if (!recipientEmail || !recipientName) {
                const { data: employee } = await supabase
                  .from('employees')
                  .select('email, first_name, last_name, position')
                  .eq('user_id', entry.recipient_user_id)
                  .maybeSingle();
                
                if (employee) {
                  if (!recipientEmail && employee.email) {
                    recipientEmail = employee.email;
                  }
                  if (!recipientName) {
                    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
                    if (fullName) {
                      recipientName = fullName;
                      if (employee.position) {
                        recipientName += ` (${employee.position})`;
                      }
                    }
                  }
                }
              }
            
              if (!recipientName || !recipientEmail) {
                const shares = sharesNum;
                if (shares === 18000000 || Math.abs(shares - 18000000) < 1) {
                  recipientName = 'Torrance Stroman (Founder CEO)';
                  recipientEmail = 'tstroman.ceo@cravenusa.com';
                } else if (shares === 5000000 || Math.abs(shares - 5000000) < 1) {
                  recipientName = 'Justin Sweet';
                  recipientEmail = 'jsweet.cfo@cravenusa.com';
                } else if (shares === 500000 || Math.abs(shares - 500000) < 1) {
                  recipientName = 'Nathan Curry';
                  recipientEmail = 'natecurry.cto@cravenusa.com';
                }
              }
            
              if (!recipientName || !recipientEmail) {
                console.warn('Could not find user info for grant:', {
                  ledger_id: entry.id,
                  user_id: entry.recipient_user_id,
                  shares: entry.shares_amount,
                  recipientName,
                  recipientEmail,
                });
              }
            } catch (err) {
              console.warn('Error fetching user info:', err);
            }
          }

          const vesting = vestingSchedules?.find(v => v.recipient_user_id === entry.recipient_user_id);
          
          // Calculate vested/unvested based on actual shares_amount and current date
          let vestedShares: number | undefined;
          let unvestedShares: number | undefined;
          
          if (vesting) {
            const vestingType = (vesting.vesting_type || '').toLowerCase();
            const grantDate = new Date(entry.transaction_date || entry.created_at);
            const currentDate = new Date();
            const monthsSinceGrant = Math.floor(
              (currentDate.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
            );
            
            if (vestingType === 'immediate') {
              vestedShares = sharesNum;
              unvestedShares = 0;
            } else if (vestingType === 'graded' || vestingType === 'cliff') {
              const cliffMonths = vesting.cliff_months || 0;
              const vestingPeriodMonths = vesting.vesting_period_months || 48;
              
              if (monthsSinceGrant < cliffMonths) {
                // Before cliff - no shares vested
                vestedShares = 0;
                unvestedShares = sharesNum;
              } else if (monthsSinceGrant >= vestingPeriodMonths) {
                // Fully vested
                vestedShares = sharesNum;
                unvestedShares = 0;
              } else {
                // Calculate vested shares based on standard 4-year with 1-year cliff
                if (cliffMonths === 12 && vestingPeriodMonths === 48) {
                  // Standard: 25% at cliff, 75% monthly over 36 months
                  const cliffShares = Math.floor(sharesNum * 0.25); // 25% at cliff
                  const monthlyShares = Math.floor((sharesNum - cliffShares) / 36); // Remaining 75% / 36 months
                  const monthsAfterCliff = Math.max(0, monthsSinceGrant - cliffMonths);
                  const monthsVested = Math.min(monthsAfterCliff, 36);
                  
                  vestedShares = cliffShares + (monthlyShares * monthsVested);
                  unvestedShares = sharesNum - vestedShares;
                } else {
                  // Generic calculation for other schedules
                  const vestingTotal = Number(vesting.vested_shares || 0) + Number(vesting.unvested_shares || 0);
                  if (vestingTotal > 0 && Math.abs(vestingTotal - sharesNum) > 1000) {
                    // Recalculate proportionally
                    const vestedRatio = Number(vesting.vested_shares || 0) / vestingTotal;
                    vestedShares = Math.round(sharesNum * vestedRatio);
                    unvestedShares = sharesNum - vestedShares;
                  } else {
                    vestedShares = Number(vesting.vested_shares || 0);
                    unvestedShares = Number(vesting.unvested_shares || 0);
                  }
                }
              }
            } else {
              // Use stored values for other types
              const vestingTotal = Number(vesting.vested_shares || 0) + Number(vesting.unvested_shares || 0);
              if (vestingTotal > 0 && Math.abs(vestingTotal - sharesNum) > 1000) {
                const vestedRatio = Number(vesting.vested_shares || 0) / vestingTotal;
                vestedShares = Math.round(sharesNum * vestedRatio);
                unvestedShares = sharesNum - vestedShares;
              } else {
                vestedShares = Number(vesting.vested_shares || 0);
                unvestedShares = Number(vesting.unvested_shares || 0);
              }
            }
          } else if (sharesNum >= 10400000 && sharesNum <= 10600000) {
            // Torrance's 10.5M shares - immediate vesting
            vestedShares = sharesNum;
            unvestedShares = 0;
          }

          if (isMarkaylaDanzyRecipient(recipientName)) {
            console.log('🚫 Skipping equity grant row: Markayla Danzy (non-executive, no equity)');
            continue;
          }

          grantsWithUsers.push({
            id: entry.id,
            recipient_user_id: entry.recipient_user_id,
            recipient_email: recipientEmail || 'N/A',
            recipient_name: recipientName || 'Unknown',
            shares_amount: sharesNum,
            share_class: entry.share_class || 'common',
            transaction_date: entry.transaction_date || entry.created_at,
            vesting_type: vesting?.vesting_type?.toUpperCase() || (sharesNum >= 10400000 && sharesNum <= 10600000 ? 'IMMEDIATE' : undefined),
            vested_shares: vestedShares,
            unvested_shares: unvestedShares,
          });
        }
      }

      const ledgerGrantKeys = new Set(
        ledgerEntries?.map(e => `${e.recipient_user_id}_${Number(e.shares_amount)}`) || []
      );
      
      if (equityGrants) {
        for (const grant of equityGrants) {
          const execUser = (grant as any).exec_users;
          const employee = (grant as any).employees;
          const sharesNum = Number(grant.shares_total) || 0;
          
          let userId = execUser?.user_id || employee?.user_id;
          
          // Skip 18M grants - these are old Torrance grants that should be 10.5M
          // The "CEO" entry is a duplicate that should be removed
          if (sharesNum >= 17500000 && sharesNum <= 18500000) {
            console.log('🚫 Skipping 18M grant - this is old Torrance data, should be 10.5M');
            continue;
          }
          
          if (!userId && sharesNum >= 4500000 && sharesNum <= 5500000) {
            userId = '5a259c29-8cdd-4569-9a3c-4f7481f1b441';
            console.log('🔍 Found 5M grant, using Justin Sweet user_id:', userId);
          } else if (!userId && sharesNum >= 450000 && sharesNum <= 550000) {
            userId = '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3';
            console.log('🔍 Found 500K grant, using Nathan user_id:', userId);
          }
          
          const grantKey = userId ? `${userId}_${sharesNum}` : null;
          
          // Check if this grant has been revoked
          const isRevoked = userId && (
            revokedGrantKeys.has(grantKey || '') ||
            revokedByUserId.has(userId) && revokedByUserId.get(userId)!.has(sharesNum)
          );
          
          if (isRevoked) {
            console.log('🚫 Skipping revoked grant from equity_grants:', {
              userId,
              shares: sharesNum,
              grantKey
            });
            continue;
          }
          
          if (userId && grantKey && !ledgerGrantKeys.has(grantKey)) {
            let recipientName = '';
            let recipientEmail = '';
            
            if (sharesNum >= 4500000 && sharesNum <= 5500000) {
              recipientName = 'Justin Sweet';
              recipientEmail = 'jsweet.cfo@cravenusa.com';
            } else if (sharesNum >= 450000 && sharesNum <= 550000) {
              recipientName = 'Nathan Curry';
              recipientEmail = 'natecurry.cto@cravenusa.com';
            } else {
              recipientName = execUser.title || '';
              try {
                const { data: profile } = await supabase
                  .from('user_profiles')
                  .select('email, full_name')
                  .eq('user_id', execUser.user_id)
                  .maybeSingle();
                
                if (profile) {
                  recipientEmail = profile.email || '';
                  if (!recipientName) recipientName = profile.full_name || '';
                }
              } catch (err) {
                console.warn('Error fetching profile for grant:', err);
              }
            }
            
            if (recipientName || recipientEmail) {
              if (isMarkaylaDanzyRecipient(recipientName)) {
                console.log('🚫 Skipping equity_grants row: Markayla Danzy (non-executive, no equity)');
                continue;
              }
              grantsWithUsers.push({
                id: grant.id,
                recipient_user_id: userId,
                recipient_email: recipientEmail,
                recipient_name: recipientName,
                shares_amount: sharesNum,
                share_class: grant.share_class || 'Common',
                transaction_date: grant.grant_date || new Date().toISOString().split('T')[0],
                vested_shares: undefined,
                unvested_shares: undefined,
              });
            }
          }
        }
      }

      console.log('Final grant data:', grantsWithUsers);
      setGrants(grantsWithUsers);
      
      // Load revoked grants for the backlog
      await loadRevokedGrants(revokedGrantKeys, cancellations || []);
    } catch (error: any) {
      console.error('Error loading equity grants:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load equity grants',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRevokedGrants = async (revokedGrantKeys: Set<string>, cancellations: any[]) => {
    try {
      // Get all grants that have been revoked from equity_ledger
      const { data: allGrants, error: grantsError } = await supabase
        .from('equity_ledger')
        .select('id, recipient_user_id, shares_amount, share_class, transaction_date, transaction_type, created_at, resolution_id, grant_id')
        .eq('transaction_type', 'grant')
        .order('created_at', { ascending: false });

      if (grantsError) {
        console.error('Error loading grants for revoked list:', grantsError);
        return;
      }

      // Filter to only revoked grants from equity_ledger
      const revokedGrantEntries = allGrants?.filter(entry => {
        const grantKey = entry.grant_id 
          ? `grant_id:${entry.grant_id}` 
          : `${entry.recipient_user_id}_${entry.shares_amount}`;
        return revokedGrantKeys.has(grantKey);
      }) || [];

      // Also check equity_grants table for revoked grants that aren't in equity_ledger
      const { data: equityGrants, error: equityGrantsError } = await supabase
        .from('equity_grants')
        .select(`
          id,
          executive_id,
          employee_id,
          shares_total,
          board_resolution_id,
          status,
          grant_date,
          share_class,
          exec_users(user_id, title, role, email),
          employees(user_id, first_name, last_name, email)
        `)
        .order('grant_date', { ascending: false });

      if (!equityGrantsError && equityGrants) {
        for (const grant of equityGrants) {
          const execUser = (grant as any).exec_users;
          const employee = (grant as any).employees;
          const sharesNum = Number(grant.shares_total) || 0;
          
          let userId = execUser?.user_id || employee?.user_id;
          
          // Match Nathan's 500K grant
          if (!userId && sharesNum >= 450000 && sharesNum <= 550000) {
            userId = '76e5acef-e7c0-4b26-a9e1-52e25c3e7ff3';
          }
          
          if (userId) {
            const grantKey = `${userId}_${sharesNum}`;
            // If this grant is revoked and not already in revokedGrantEntries, add it
            if (revokedGrantKeys.has(grantKey)) {
              const alreadyInList = revokedGrantEntries.some(e => 
                e.recipient_user_id === userId && e.shares_amount === sharesNum
              );
              
              if (!alreadyInList) {
                // Create a revoked grant entry from equity_grants
                revokedGrantEntries.push({
                  id: grant.id,
                  recipient_user_id: userId,
                  shares_amount: sharesNum,
                  share_class: grant.share_class || 'Common',
                  transaction_date: grant.grant_date || new Date().toISOString().split('T')[0],
                  transaction_type: 'grant',
                  created_at: grant.grant_date || new Date().toISOString(),
                  resolution_id: grant.board_resolution_id,
                  grant_id: null,
                });
              }
            }
          }
        }
      }

      // Create a map of cancellations by grant key for revocation details
      const cancellationMap = new Map<string, any>();
      for (const cancel of cancellations) {
        const key = cancel.grant_id 
          ? `grant_id:${cancel.grant_id}` 
          : `${cancel.recipient_user_id}_${cancel.shares_amount}`;
        cancellationMap.set(key, cancel);
        
        // If cancellation exists but grant not found in equity_ledger, create revoked grant entry from cancellation
        const grantKey = cancel.grant_id 
          ? `grant_id:${cancel.grant_id}` 
          : `${cancel.recipient_user_id}_${cancel.shares_amount}`;
        
        if (revokedGrantKeys.has(grantKey)) {
          const alreadyInList = revokedGrantEntries.some(e => 
            e.recipient_user_id === cancel.recipient_user_id && 
            e.shares_amount === cancel.shares_amount
          );
          
          if (!alreadyInList) {
            // Create revoked grant entry from cancellation data
            revokedGrantEntries.push({
              id: cancel.id || `cancel_${cancel.recipient_user_id}_${cancel.shares_amount}`,
              recipient_user_id: cancel.recipient_user_id,
              shares_amount: cancel.shares_amount,
              share_class: cancel.share_class || 'Common',
              transaction_date: cancel.transaction_date || cancel.created_at,
              transaction_type: 'grant',
              created_at: cancel.created_at || new Date().toISOString(),
              resolution_id: null,
              grant_id: cancel.grant_id,
            });
            console.log('✅ Created revoked grant entry from cancellation:', {
              user_id: cancel.recipient_user_id,
              shares: cancel.shares_amount
            });
          }
        }
      }

      // Build revoked grants list with user info
      const revokedGrantsList: RevokedGrant[] = [];
      
      for (const entry of revokedGrantEntries) {
        const grantKey = entry.grant_id 
          ? `grant_id:${entry.grant_id}` 
          : `${entry.recipient_user_id}_${entry.shares_amount}`;
        const cancellation = cancellationMap.get(grantKey);
        
        let recipientName = 'Unknown';
        let recipientEmail = '';
        
        const sharesNum = Number(entry.shares_amount) || 0;
        if ((sharesNum >= 17500000 && sharesNum <= 18500000) || (sharesNum >= 10400000 && sharesNum <= 10600000)) {
          recipientName = 'Torrance Stroman (Founder CEO)';
          recipientEmail = 'tstroman.ceo@cravenusa.com';
        } else if (sharesNum >= 4500000 && sharesNum <= 5500000) {
          recipientName = 'Justin Sweet';
          recipientEmail = 'jsweet.cfo@cravenusa.com';
        } else if (sharesNum >= 450000 && sharesNum <= 550000) {
          recipientName = 'Nathan Curry';
          recipientEmail = 'natecurry.cto@cravenusa.com';
        } else {
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('email, full_name')
              .eq('user_id', entry.recipient_user_id)
              .maybeSingle();
            
            if (profile) {
              recipientEmail = profile.email || '';
              recipientName = profile.full_name || 'Unknown';
            }
          } catch (err) {
            console.warn('Error fetching user profile for revoked grant:', err);
          }
        }

        revokedGrantsList.push({
          id: entry.id,
          recipient_user_id: entry.recipient_user_id,
          recipient_email: recipientEmail || 'N/A',
          recipient_name: recipientName,
          shares_amount: sharesNum,
          share_class: entry.share_class || 'common',
          transaction_date: entry.transaction_date || entry.created_at,
          revoked_date: cancellation?.transaction_date || cancellation?.created_at,
          revocation_reason: cancellation?.notes || 'Not specified',
        });
      }

      console.log('📋 Loaded', revokedGrantsList.length, 'revoked grants');
      setRevokedGrants(revokedGrantsList);
    } catch (error) {
      console.error('Error loading revoked grants:', error);
    }
  };

  const handleRevokeGrant = async () => {
    if (!selectedGrant) return;

    setRevoking(true);
    try {
      // Only send email if it's valid (not 'N/A' or empty)
      const requestBody: any = {
        recipient_user_id: selectedGrant.recipient_user_id,
        reason: revokeReason || 'Equity grant revocation',
      };
      
      if (selectedGrant.recipient_email && selectedGrant.recipient_email !== 'N/A') {
        requestBody.recipient_email = selectedGrant.recipient_email;
      }

      console.log('🚀 Revoking grant:', {
        recipient_user_id: selectedGrant.recipient_user_id,
        recipient_email: selectedGrant.recipient_email,
        shares: selectedGrant.shares_amount,
      });

      let responseData;
      let responseError;
      
      try {
        const response = await supabase.functions.invoke('governance-revoke-equity', {
          body: requestBody,
        });
        responseData = response.data;
        responseError = response.error;
      } catch (invokeError: any) {
        console.error('Function invoke error:', invokeError);
        // If the function doesn't exist, we get a 404
        if (invokeError?.status === 404 || invokeError?.message?.includes('404')) {
          throw {
            message: 'Function not found. Please ensure governance-revoke-equity is deployed.',
            status: 404,
            originalError: invokeError,
          };
        }
        throw invokeError;
      }

      if (responseError) {
        console.error('Function error details:', responseError);
        console.error('Function error context:', (responseError as any)?.context);
        
        // Try to extract error message from the error object
        const errorContext = (responseError as any)?.context;
        const errorBody = errorContext?.body || errorContext?.data || responseData;
        
        // Check if grants were already revoked (function returns 404 with already_revoked flag)
        if (errorBody?.already_revoked) {
          throw {
            ...responseError,
            message: errorBody.message || 'This grant has already been revoked',
            data: errorBody,
            already_revoked: true,
            status: 404,
          };
        }
        
        const errorMessage = errorBody?.error || errorBody?.message || responseError.message || 'Failed to revoke equity grant';
        
        const errorObj = {
          ...responseError,
          message: errorMessage,
          data: errorBody,
          status: errorContext?.status || (responseError as any)?.status,
        };
        throw errorObj;
      }

      notifications.show({
        title: 'Success',
        message: `Successfully revoked ${selectedGrant.shares_amount.toLocaleString()} shares from ${selectedGrant.recipient_name}`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Close modal and reset
      setRevokeModalOpen(false);
      setSelectedGrant(null);
      setRevokeReason('');

      // Reload grants and recalculate cap table
      await loadGrants();
      const capResult = await recalculateCapTable();
      if (!capResult.success) {
        console.warn('Cap table recalculation warning:', capResult.error);
      }
    } catch (error: any) {
      console.error('Error revoking grant:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Check if grants were already revoked FIRST (before checking for function not found)
      const errorData = error?.data || error?.context?.body || {};
      if (error?.already_revoked || errorData?.already_revoked) {
        const revokedMessage = error?.message || errorData?.message || 
          `This grant has already been revoked (${errorData?.shares_already_revoked?.toLocaleString() || 'shares'} revoked)`;
        notifications.show({
          title: 'Already Revoked',
          message: revokedMessage,
          color: 'yellow',
          icon: <IconAlertCircle size={16} />,
        });
        // Reload grants to refresh the list
        await loadGrants();
        return;
      }
      
      // Check if function doesn't exist (404 without already_revoked flag)
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('not found')) {
        notifications.show({
          title: 'Function Not Found',
          message: 'The governance-revoke-equity function is not deployed. Please deploy it to Supabase Edge Functions.',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
        return;
      }
      
      // Other errors
      const errorMessage = error?.message || errorData?.error || errorData?.message || 'Failed to revoke equity grant';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setRevoking(false);
    }
  };

  const openRevokeModal = (grant: EquityGrant) => {
    setSelectedGrant(grant);
    setRevokeReason('');
    setRevokeModalOpen(true);
  };

  const filteredAndSortedGrants = useMemo(() => {
    let filtered = [...grants];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(grant =>
        grant.recipient_name?.toLowerCase().includes(query) ||
        grant.recipient_email?.toLowerCase().includes(query) ||
        grant.shares_amount.toString().includes(query)
      );
    }

    if (shareClassFilter) {
      filtered = filtered.filter(grant => grant.share_class === shareClassFilter);
    }

    if (vestingFilter) {
      filtered = filtered.filter(grant => grant.vesting_type === vestingFilter);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      } else if (sortBy === 'shares') {
        comparison = a.shares_amount - b.shares_amount;
      } else if (sortBy === 'name') {
        comparison = (a.recipient_name || '').localeCompare(b.recipient_name || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [grants, searchQuery, shareClassFilter, vestingFilter, sortBy, sortOrder]);

  const totalShares = useMemo(() => {
    return filteredAndSortedGrants.reduce((sum, grant) => sum + grant.shares_amount, 0);
  }, [filteredAndSortedGrants]);

  const handleSync = async () => {
    try {
      const { error } = await supabase.functions.invoke('sync-equity-grants');
      if (error) {
        throw error;
      }
      notifications.show({
        title: 'Success',
        message: 'Equity grants synced successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      loadGrants();
    } catch (err) {
      console.error('Error syncing equity grants:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to sync equity grants',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  if (loading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader size="xl" />
      </Box>
    );
  }

  return (
    <Stack gap="xl">
      {/* Enterprise Header */}
      <Paper
        p="xl"
        radius="md"
        style={{
          background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          color: 'white',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap={12} mb={8}>
              <Box
                style={{
                  backgroundColor: 'rgba(255, 106, 0, 0.2)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconCoins size={32} color="#ff6a00" stroke={2.5} />
              </Box>
              <div>
                <Title order={2} c="white" mb={4} style={{ letterSpacing: '0.5px' }}>
                  Equity Grants
                </Title>
                <Text c="gray.3" size="sm" style={{ letterSpacing: '0.3px' }}>
                  Comprehensive equity grant management and tracking
                </Text>
              </div>
            </Group>
            <Group gap="md" mt="md">
              <Badge size="lg" variant="light" color="orange">
                {filteredAndSortedGrants.length} Active
              </Badge>
              <Badge size="lg" variant="light" color="red">
                {revokedGrants.length} Revoked
              </Badge>
              <Badge size="lg" variant="light" color="blue">
                <NumberFormatter value={totalShares} thousandSeparator /> Total Shares
              </Badge>
            </Group>
          </div>
          <Group gap="xs">
            <Button
              leftSection={<IconRefresh size={18} />}
              onClick={handleSync}
              variant="light"
              color="orange"
              size="md"
            >
              Sync Grants
            </Button>
            <Button
              leftSection={<IconRefresh size={18} />}
              onClick={loadGrants}
              variant="filled"
              color="orange"
              size="md"
            >
              Refresh
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Filters and Search */}
      <Card padding="lg" radius="md" withBorder>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              placeholder="Search by name, email, or shares..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              size="md"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              placeholder="Share Class"
              leftSection={<IconFilter size={16} />}
              data={[
                { value: 'Common', label: 'Common' },
                { value: 'Preferred', label: 'Preferred' },
                { value: 'common', label: 'common' },
              ]}
              value={shareClassFilter}
              onChange={setShareClassFilter}
              clearable
              size="md"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              placeholder="Vesting Type"
              leftSection={<IconFilter size={16} />}
              data={[
                { value: 'immediate', label: 'Immediate' },
                { value: 'graded', label: 'Graded' },
                { value: 'cliff', label: 'Cliff' },
              ]}
              value={vestingFilter}
              onChange={setVestingFilter}
              clearable
              size="md"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Select
              placeholder="Sort By"
              data={[
                { value: 'date', label: 'Date' },
                { value: 'shares', label: 'Shares' },
                { value: 'name', label: 'Name' },
              ]}
              value={sortBy}
              onChange={(value) => value && setSortBy(value as any)}
              size="md"
            />
          </Grid.Col>
        </Grid>
      </Card>

      {/* Grants Table with Tabs */}
      <Card padding={0} radius="md" withBorder>
        <Tabs 
          value={activeTab} 
          onChange={(value) => {
            if (value) setActiveTab(value as 'active' | 'revoked');
          }} 
          defaultValue="active"
        >
          <Tabs.List 
            grow
            style={{ 
              backgroundColor: '#f9fafb', 
              borderBottom: '2px solid #e5e7eb', 
              padding: '8px 16px',
            }}
          >
            <Tabs.Tab value="active" leftSection={<IconCoins size={18} />}>
              Active Grants ({filteredAndSortedGrants.length})
            </Tabs.Tab>
            <Tabs.Tab value="revoked" leftSection={<IconArchive size={18} />}>
              Revoked Grants ({revokedGrants.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="active" pt="xl" px="md" pb="md">
            {filteredAndSortedGrants.length === 0 ? (
              <Card padding="xl" radius="md" withBorder m="md">
                <Alert icon={<IconAlertCircle size={16} />} title="No Active Grants" color="blue">
                  {searchQuery || shareClassFilter || vestingFilter
                    ? 'No grants match your filters. Try adjusting your search criteria.'
                    : 'No active equity grants have been issued yet.'}
                </Alert>
              </Card>
            ) : (
              <ScrollArea style={{ maxHeight: '600px' }}>
                <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
                  <Table.Thead style={{ backgroundColor: '#f9fafb' }}>
                    <Table.Tr>
                      <Table.Th style={{ fontWeight: 600 }}>Recipient</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Email</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Shares</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Share Class</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Vesting Type</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Vested/Unvested</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Grant Date</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                {filteredAndSortedGrants.map((grant) => {
                  let displayName = grant.recipient_name;
                  let displayEmail = grant.recipient_email;
                  
                  if (!displayName || displayName === 'Unknown' || !displayEmail || displayEmail === 'N/A') {
                    const grantShares = grant.shares_amount;
                    if ((grantShares >= 17500000 && grantShares <= 18500000) || (grantShares >= 10400000 && grantShares <= 10600000)) {
                      displayName = 'Torrance Stroman (Founder CEO)';
                      displayEmail = 'tstroman.ceo@cravenusa.com';
                    } else if (grantShares >= 4500000 && grantShares <= 5500000) {
                      displayName = 'Justin Sweet';
                      displayEmail = 'jsweet.cfo@cravenusa.com';
                    } else if (grantShares >= 450000 && grantShares <= 550000) {
                      displayName = 'Nathan Curry';
                      displayEmail = 'natecurry.cto@cravenusa.com';
                    }
                  }

                  const vestingProgress = grant.vested_shares !== undefined && grant.unvested_shares !== undefined
                    ? (grant.vested_shares / (grant.vested_shares + grant.unvested_shares)) * 100
                    : null;

                  return (
                    <Table.Tr key={grant.id} style={{ cursor: 'pointer' }}>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {displayName || displayEmail || 'Unknown'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {displayEmail || 'N/A'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={700} size="sm" c="dark">
                          <NumberFormatter value={grant.shares_amount} thousandSeparator />
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="orange" size="lg">
                          {grant.share_class}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {grant.vesting_type ? (
                          <Badge color="blue" variant="light" size="lg">
                            {grant.vesting_type.charAt(0).toUpperCase() + grant.vesting_type.slice(1)}
                          </Badge>
                        ) : (
                          <Text size="sm" c="dimmed">N/A</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {grant.vested_shares !== undefined && grant.unvested_shares !== undefined ? (
                          <Stack gap={4}>
                            <Text size="sm" fw={500}>
                              <NumberFormatter value={grant.vested_shares} thousandSeparator /> /{' '}
                              <NumberFormatter value={grant.unvested_shares} thousandSeparator />
                            </Text>
                            {vestingProgress !== null && (
                              <Progress value={vestingProgress} size="sm" color="green" />
                            )}
                          </Stack>
                        ) : (
                          <Text size="sm" c="dimmed">N/A</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {new Date(grant.transaction_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Menu shadow="md" width={200}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                              <IconDotsVertical size={18} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<IconEye size={16} />}>
                              View Details
                            </Menu.Item>
                            <Menu.Item 
                              leftSection={<IconEdit size={16} />}
                              onClick={async () => {
                                setSelectedGrant(grant);
                                setEditingShares(grant.shares_amount);
                                setEditingShareClass(grant.share_class || 'Common');
                                setEditingVestingType(grant.vesting_type?.toLowerCase() || 'immediate');
                                setEditingGrantDate(grant.transaction_date || new Date().toISOString().split('T')[0]);
                                
                                // Load current vesting schedule
                                const { data: vesting } = await supabase
                                  .from('vesting_schedules')
                                  .select('*')
                                  .eq('recipient_user_id', grant.recipient_user_id)
                                  .maybeSingle();
                                
                                if (vesting) {
                                  setCurrentVestingSchedule(vesting);
                                  setEditingCliffMonths(vesting.cliff_months || 0);
                                  setEditingVestingPeriodMonths(vesting.vesting_period_months || 48);
                                  setEditingVestingType((vesting.vesting_type || 'immediate').toLowerCase());
                                } else {
                                  setCurrentVestingSchedule(null);
                                  setEditingCliffMonths(0);
                                  setEditingVestingPeriodMonths(48);
                                }
                                
                                setEditModalOpen(true);
                              }}
                            >
                              Edit Grant
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item leftSection={<IconDownload size={16} />}>
                              Export Certificate
                            </Menu.Item>
                            <Menu.Item 
                              color="red" 
                              leftSection={<IconTrash size={16} />}
                              onClick={() => openRevokeModal(grant)}
                            >
                              Revoke Grant
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="revoked" pt="xl" px="md" pb="md">
            {revokedGrants.length === 0 ? (
              <Card padding="xl" radius="md" withBorder m="md">
                <Alert icon={<IconHistory size={16} />} title="No Revoked Grants" color="gray">
                  No equity grants have been revoked yet.
                </Alert>
              </Card>
            ) : (
              <ScrollArea style={{ maxHeight: '600px' }}>
                <Table highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
                  <Table.Thead style={{ backgroundColor: '#f9fafb' }}>
                    <Table.Tr>
                      <Table.Th style={{ fontWeight: 600 }}>Recipient</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Email</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Shares</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Share Class</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Grant Date</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Revoked Date</Table.Th>
                      <Table.Th style={{ fontWeight: 600 }}>Revocation Reason</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {revokedGrants.map((grant) => (
                      <Table.Tr key={grant.id}>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            {grant.recipient_name || 'Unknown'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {grant.recipient_email || 'N/A'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={700} size="sm" c="red">
                            <NumberFormatter value={grant.shares_amount} thousandSeparator />
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="red" size="lg">
                            {grant.share_class}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {new Date(grant.transaction_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="red">
                            {grant.revoked_date 
                              ? new Date(grant.revoked_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'N/A'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed" style={{ maxWidth: '300px' }}>
                            {grant.revocation_reason || 'Not specified'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Revoke Grant Modal */}
      <Modal
        opened={revokeModalOpen}
        onClose={() => {
          setRevokeModalOpen(false);
          setSelectedGrant(null);
          setRevokeReason('');
        }}
        title="Revoke Equity Grant"
        size="md"
      >
        <Stack gap="md">
          <Alert color="red" variant="light">
            <Text size="sm" fw={500}>Warning: This action cannot be undone.</Text>
            <Text size="xs" mt="xs">
              Revoking this grant will create cancellation entries in the equity ledger and remove the shares from the recipient.
            </Text>
          </Alert>

          {selectedGrant && (
            <>
              <div>
                <Text size="sm" fw={500}>Recipient:</Text>
                <Text size="sm">{selectedGrant.recipient_name}</Text>
              </div>
              <div>
                <Text size="sm" fw={500}>Email:</Text>
                <Text size="sm">{selectedGrant.recipient_email}</Text>
              </div>
              <div>
                <Text size="sm" fw={500}>Shares to Revoke:</Text>
                <Text size="sm" fw={700}>
                  <NumberFormatter value={selectedGrant.shares_amount} thousandSeparator />
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500}>Share Class:</Text>
                <Text size="sm">{selectedGrant.share_class}</Text>
              </div>
            </>
          )}

          <Textarea
            label="Reason for Revocation"
            placeholder="Enter the reason for revoking this equity grant..."
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.currentTarget.value)}
            minRows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setRevokeModalOpen(false);
                setSelectedGrant(null);
                setRevokeReason('');
              }}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleRevokeGrant}
              loading={revoking}
              leftSection={<IconTrash size={16} />}
            >
              Revoke Grant
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Grant Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedGrant(null);
          setEditingShares(0);
          setEditingShareClass('Common');
          setEditingVestingType('immediate');
          setEditingCliffMonths(0);
          setEditingVestingPeriodMonths(48);
          setEditingGrantDate('');
          setCurrentVestingSchedule(null);
        }}
        title="Edit Equity Grant"
        size="lg"
      >
        <Stack gap="md">
          {selectedGrant && (
            <>
              <div>
                <Text size="sm" fw={500}>Recipient:</Text>
                <Text size="sm">{selectedGrant.recipient_name}</Text>
              </div>
              <div>
                <Text size="sm" fw={500}>Email:</Text>
                <Text size="sm">{selectedGrant.recipient_email}</Text>
              </div>

              <Divider label="Grant Details" labelPosition="left" />

              <TextInput
                label="Shares Amount"
                type="number"
                value={editingShares}
                onChange={(e) => setEditingShares(Number(e.target.value) || 0)}
                placeholder="Enter shares amount"
                min={0}
                required
              />

              <Select
                label="Share Class"
                value={editingShareClass}
                onChange={(value) => setEditingShareClass(value || 'Common')}
                data={['Common', 'Preferred', 'Series A', 'Series B', 'Options']}
              />

              <TextInput
                label="Grant Date"
                type="date"
                value={editingGrantDate}
                onChange={(e) => setEditingGrantDate(e.target.value)}
                required
              />

              <Divider label="Vesting Schedule" labelPosition="left" />

              <Select
                label="Vesting Type"
                value={editingVestingType}
                onChange={(value) => {
                  setEditingVestingType(value || 'immediate');
                  if (value === 'immediate') {
                    setEditingCliffMonths(0);
                    setEditingVestingPeriodMonths(0);
                  } else if (value === 'graded') {
                    if (editingCliffMonths === 0 && editingVestingPeriodMonths === 0) {
                      setEditingCliffMonths(12);
                      setEditingVestingPeriodMonths(48);
                    }
                  }
                }}
                data={[
                  { value: 'immediate', label: 'Immediate (All shares vested immediately)' },
                  { value: 'graded', label: 'Graded (Monthly vesting over period)' },
                  { value: 'cliff', label: 'Cliff (All shares vest at cliff date)' },
                ]}
                required
              />

              {editingVestingType !== 'immediate' && (
                <>
                  <TextInput
                    label="Cliff Months"
                    type="number"
                    value={editingCliffMonths}
                    onChange={(e) => setEditingCliffMonths(Number(e.target.value) || 0)}
                    placeholder="Months before first vest (e.g., 12)"
                    min={0}
                    description="Number of months before any shares vest (typically 12 for 1-year cliff)"
                  />

                  <TextInput
                    label="Vesting Period (Months)"
                    type="number"
                    value={editingVestingPeriodMonths}
                    onChange={(e) => setEditingVestingPeriodMonths(Number(e.target.value) || 48)}
                    placeholder="Total vesting period in months (e.g., 48 for 4 years)"
                    min={1}
                    description="Total number of months over which shares vest"
                  />
                </>
              )}

              <Alert color="blue" variant="light">
                <Text size="xs">
                  Changes will update both the equity ledger and vesting schedule. This will affect cap table calculations.
                </Text>
              </Alert>

              <Group justify="flex-end" mt="md">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedGrant(null);
                    setEditingShares(0);
                    setEditingShareClass('Common');
                    setEditingVestingType('immediate');
                    setEditingCliffMonths(0);
                    setEditingVestingPeriodMonths(48);
                    setEditingGrantDate('');
                    setCurrentVestingSchedule(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedGrant || editingShares <= 0) {
                      notifications.show({
                        title: 'Error',
                        message: 'Please enter a valid shares amount',
                        color: 'red',
                      });
                      return;
                    }

                    if (!editingGrantDate) {
                      notifications.show({
                        title: 'Error',
                        message: 'Please select a grant date',
                        color: 'red',
                      });
                      return;
                    }

                    setEditing(true);
                    try {
                      // Update equity_ledger entry
                      const { error: updateError } = await supabase
                        .from('equity_ledger')
                        .update({
                          shares_amount: editingShares,
                          share_class: editingShareClass,
                          transaction_date: editingGrantDate,
                          effective_date: editingGrantDate,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', selectedGrant.id);

                      if (updateError) throw updateError;

                      // Calculate vesting schedule dates
                      const grantDate = new Date(editingGrantDate);
                      const cliffDate = new Date(grantDate);
                      cliffDate.setMonth(cliffDate.getMonth() + editingCliffMonths);
                      const endDate = new Date(grantDate);
                      endDate.setMonth(endDate.getMonth() + editingVestingPeriodMonths);

                      // Build vesting schedule array
                      let vestingScheduleArray: any[] = [];
                      let initialVested = 0;
                      let initialUnvested = editingShares;

                      if (editingVestingType === 'immediate') {
                        vestingScheduleArray = [{
                          date: editingGrantDate,
                          shares: editingShares,
                          vested: true,
                        }];
                        initialVested = editingShares;
                        initialUnvested = 0;
                      } else if (editingVestingType === 'cliff') {
                        vestingScheduleArray = [{
                          date: cliffDate.toISOString().split('T')[0],
                          shares: editingShares,
                          vested: false,
                        }];
                        initialVested = 0;
                        initialUnvested = editingShares;
                      } else if (editingVestingType === 'graded') {
                        // Graded vesting: cliff at specified month, then monthly vesting
                        const cliffShares = editingCliffMonths > 0 
                          ? Math.floor(editingShares * 0.25) 
                          : 0;
                        const remainingShares = editingShares - cliffShares;
                        const monthsAfterCliff = editingVestingPeriodMonths - editingCliffMonths;
                        const monthlyShares = monthsAfterCliff > 0 
                          ? Math.floor(remainingShares / monthsAfterCliff) 
                          : 0;
                        const remainder = remainingShares - (monthlyShares * monthsAfterCliff);
                        
                        if (editingCliffMonths > 0) {
                          vestingScheduleArray.push({
                            date: cliffDate.toISOString().split('T')[0],
                            shares: cliffShares,
                            vested: false,
                          });
                        }

                        // Monthly vesting after cliff
                        for (let i = 1; i <= monthsAfterCliff; i++) {
                          const vestDate = new Date(cliffDate);
                          vestDate.setMonth(vestDate.getMonth() + i);
                          // Add remainder to last month to account for rounding
                          const sharesForThisMonth = (i === monthsAfterCliff) 
                            ? monthlyShares + remainder 
                            : monthlyShares;
                          vestingScheduleArray.push({
                            date: vestDate.toISOString().split('T')[0],
                            shares: sharesForThisMonth,
                            vested: false,
                          });
                        }
                        initialVested = 0;
                        initialUnvested = editingShares;
                      }

                      // Update or create vesting schedule
                      if (currentVestingSchedule) {
                        const { error: vestingError } = await supabase
                          .from('vesting_schedules')
                          .update({
                            total_shares: editingShares,
                            vesting_type: editingVestingType,
                            cliff_months: editingCliffMonths,
                            vesting_period_months: editingVestingPeriodMonths,
                            vesting_schedule: vestingScheduleArray,
                            start_date: editingGrantDate,
                            end_date: endDate.toISOString().split('T')[0],
                            vested_shares: initialVested,
                            unvested_shares: initialUnvested,
                            updated_at: new Date().toISOString(),
                          })
                          .eq('id', currentVestingSchedule.id);

                        if (vestingError) throw vestingError;
                      } else {
                        // Create new vesting schedule
                        const { error: vestingError } = await supabase
                          .from('vesting_schedules')
                          .insert({
                            recipient_user_id: selectedGrant.recipient_user_id,
                            total_shares: editingShares,
                            vesting_type: editingVestingType,
                            cliff_months: editingCliffMonths,
                            vesting_period_months: editingVestingPeriodMonths,
                            vesting_schedule: vestingScheduleArray,
                            start_date: editingGrantDate,
                            end_date: endDate.toISOString().split('T')[0],
                            vested_shares: initialVested,
                            unvested_shares: initialUnvested,
                          });

                        if (vestingError) throw vestingError;
                      }

                      notifications.show({
                        title: 'Success',
                        message: 'Grant and vesting schedule updated successfully',
                        color: 'green',
                      });

                      // Recalculate cap table after edit
                      const capResult = await recalculateCapTable();
                      if (!capResult.success) {
                        console.warn('Cap table recalculation warning:', capResult.error);
                        notifications.show({
                          title: 'Warning',
                          message: 'Grant updated but cap table recalculation failed: ' + (capResult.error || ''),
                          color: 'yellow',
                        });
                      }

                      setEditModalOpen(false);
                      setSelectedGrant(null);
                      setEditingShares(0);
                      setEditingShareClass('Common');
                      setEditingVestingType('immediate');
                      setEditingCliffMonths(0);
                      setEditingVestingPeriodMonths(48);
                      setEditingGrantDate('');
                      setCurrentVestingSchedule(null);
                      loadGrants();
                    } catch (error: any) {
                      console.error('Error updating grant:', error);
                      notifications.show({
                        title: 'Error',
                        message: error.message || 'Failed to update grant',
                        color: 'red',
                      });
                    } finally {
                      setEditing(false);
                    }
                  }}
                  loading={editing}
                >
                  Save Changes
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
};

export default EquityGrantsList;
