import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Button, Tabs, Tab, TextField } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme } from '@/themes/financePortalTheme';
import { FinancePortalLayout } from '@/components/finance/FinancePortalLayout';
import { NeonMetricCard } from '@/components/finance/NeonMetricCard';
import { ZoomIn, Mail, Users, PieChart, Download, Send } from 'lucide-react';
import { useToast } from '@/hooks/useEmbeddedToast';
import { supabase } from '@/integrations/supabase/client';
import '../../styles/neon-finance.css';

interface Investor {
  id: string;
  investor_name: string;
  investor_type: string;
  investment_amount: number;
  investment_date: string;
  ownership_percent: number;
  contact_email: string | null;
}

export const EnhancedInvestorRelations: React.FC = () => {
  const [updateDraft, setUpdateDraft] = useState('');
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .order('investment_date', { ascending: false });

      if (error) throw error;
      if (data) setInvestors(data);
    } catch (error) {
      console.error('Error fetching investors:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendUpdate = async () => {
    try {
      await supabase.from('investor_updates').insert({
        update_title: `Monthly Update - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        update_content: updateDraft,
        sent_date: new Date().toISOString(),
        status: 'sent'
      });
      toast.success('Investor update sent successfully');
      setUpdateDraft('');
    } catch (error) {
      console.error('Error sending update:', error);
      toast.error('Failed to send update');
    }
  };

  const totalCapitalRaised = investors.reduce((sum, inv) => sum + inv.investment_amount, 0);
  const totalOwnership = investors.reduce((sum, inv) => sum + inv.ownership_percent, 0);

  return (
    <ThemeProvider theme={financePortalTheme}>
      <FinancePortalLayout
        title="Investor Relations"
        subtitle="Manage investor communications, updates, and fundraising activities"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Mail size={16} />} sx={{ borderColor: '#ff6a00', color: '#ff6a00' }}>
              Schedule Call
            </Button>
            <Button variant="contained" startIcon={<Download size={16} />} sx={{ bgcolor: '#ff6a00' }}>
              Data Room
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
          <NeonMetricCard title="Total Investors" value={investors.length} icon={<Users size={20} />} glow />
          <NeonMetricCard title="Total Capital Raised" value={`$${(totalCapitalRaised / 1000000).toFixed(1)}M`} icon={<ZoomIn size={20} />} />
          <NeonMetricCard title="Investor Ownership" value={`${totalOwnership.toFixed(1)}%`} icon={<PieChart size={20} />} />
          <NeonMetricCard title="Next Update Due" value={`${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getDate() - new Date().getDate()} days`} icon={<Mail size={20} />} />
        </Box>

        <Card sx={{ bgcolor: '#12121a', border: '1px solid rgba(255, 106, 0, 0.3)' }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ borderBottom: 1, borderColor: 'rgba(255, 106, 0, 0.2)' }}>
            <Tab label="Investor List" />
            <Tab label="Monthly Updates" />
            <Tab label="Cap Table" />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              {investors.length === 0 ? (
                <Typography sx={{ color: '#6b7280', textAlign: 'center', py: 4 }}>
                  No investors recorded yet. Add investor information to track relationships and ownership.
                </Typography>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 106, 0, 0.2)' }}>
                        <th style={{ textAlign: 'left', padding: '12px', color: '#a1a1aa' }}>Investor Name</th>
                        <th style={{ textAlign: 'left', padding: '12px', color: '#a1a1aa' }}>Type</th>
                        <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Ownership</th>
                        <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Investment</th>
                        <th style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investors.map((investor) => (
                        <tr key={investor.id} style={{ borderBottom: '1px solid rgba(255, 106, 0, 0.1)' }}>
                          <td style={{ padding: '12px', color: '#fff', fontWeight: 600 }}>{investor.investor_name}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'rgba(255, 106, 0, 0.1)', color: '#ff6a00' }}>
                              {investor.investor_type}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>{investor.ownership_percent.toFixed(1)}%</td>
                          <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>${(investor.investment_amount / 1000000).toFixed(1)}M</td>
                          <td style={{ textAlign: 'right', padding: '12px', color: '#a1a1aa' }}>{new Date(investor.investment_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 1, p: 2, mb: 3 }}>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#60a5fa', mb: 0.5 }}>
                  Next Monthly Update Due: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a1a1aa' }}>
                  Send consistent monthly updates to maintain investor confidence
                </Typography>
              </Box>

              <Card sx={{ bgcolor: '#1a1a24', border: '1px solid rgba(255, 106, 0, 0.2)', p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Draft Monthly Update</Typography>
                <TextField
                  multiline
                  rows={10}
                  fullWidth
                  placeholder="Key highlights:&#10;- Financial performance&#10;- Major milestones&#10;- Team updates&#10;- Key metrics&#10;- Asks from investors"
                  value={updateDraft}
                  onChange={(e) => setUpdateDraft(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<Send size={16} />}
                    onClick={sendUpdate}
                    disabled={!updateDraft.trim()}
                    sx={{ bgcolor: '#ff6a00' }}
                  >
                    Send Update
                  </Button>
                </Box>
              </Card>
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 1, p: 2, mb: 3 }}>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#60a5fa', mb: 0.5 }}>Cap Table Summary</Typography>
                <Typography variant="body2" sx={{ color: '#a1a1aa' }}>
                  Detailed cap table visualization available in Capital Structure tab
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, mb: 3 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#a1a1aa', mb: 1 }}>Total Investor Ownership</Typography>
                  <Typography variant="h4" className="neon-gradient">{totalOwnership.toFixed(1)}%</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: '#a1a1aa', mb: 1 }}>Number of Investors</Typography>
                  <Typography variant="h4" className="neon-gradient">{investors.length}</Typography>
                </Box>
              </Box>

              {investors.length > 0 && (
                <Box>
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>Top Investors:</Typography>
                  {investors.slice(0, 5).map(inv => (
                    <Box key={inv.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, p: 1, bgcolor: '#1a1a24', borderRadius: 1 }}>
                      <Typography variant="body2">{inv.investor_name}</Typography>
                      <Typography variant="body2" sx={{ color: '#ff6a00', fontWeight: 600 }}>{inv.ownership_percent.toFixed(1)}%</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Card>
      </FinancePortalLayout>
    </ThemeProvider>
  );
};