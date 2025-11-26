import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, Tabs, Tab, Alert } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme } from '@/themes/financePortalTheme';
import { FinancePortalLayout } from '@/components/finance/FinancePortalLayout';
import { NeonCard } from '@/components/finance/NeonCard';
import { AlertTriangle, Shield, Download, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import '../../styles/neon-finance.css';

interface Risk {
  id: string;
  title: string;
  category: string;
  likelihood: string;
  impact: string;
  status: string;
  mitigation: string | null;
  owner: string | null;
}

export const EnhancedRiskManagement: React.FC = () => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    try {
      const { data, error } = await supabase
        .from('risk_register')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setRisks(data);
    } catch (error) {
      console.error('Error fetching risks:', error);
    } finally {
      setLoading(false);
    }
  };

  const highRisks = risks.filter(r => r.likelihood === 'High' && r.impact === 'High').length;
  const mediumRisks = risks.filter(r => (r.likelihood === 'Medium' && r.impact === 'High') || (r.likelihood === 'High' && r.impact === 'Medium')).length;
  const lowRisks = risks.length - highRisks - mediumRisks;

  const getRiskColor = (value: string) => {
    if (value === 'High') return 'error';
    if (value === 'Medium') return 'warning';
    return 'success';
  };

  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Risk', flex: 1 },
    { field: 'category', headerName: 'Category', width: 150 },
    {
      field: 'likelihood',
      headerName: 'Likelihood',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value} color={getRiskColor(params.value)} size="small" />
      ),
    },
    {
      field: 'impact',
      headerName: 'Impact',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.value} color={getRiskColor(params.value)} size="small" />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'mitigated' ? 'success' : params.value === 'monitoring' ? 'warning' : 'error'}
          size="small"
        />
      ),
    },
  ];

  return (
    <ThemeProvider theme={financePortalTheme}>
      <FinancePortalLayout
        title="Risk Management"
        subtitle="Identify, assess, and mitigate financial and operational risks"
        actions={
          <Button variant="outlined" startIcon={<Download size={16} />}>
            Export Risk Register
          </Button>
        }
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
          <NeonCard glow>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">High Priority Risks</Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>{highRisks}</Typography>
                </Box>
                <AlertTriangle size={32} color="#ef4444" />
              </Box>
            </CardContent>
          </NeonCard>

          <NeonCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Medium Priority Risks</Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>{mediumRisks}</Typography>
                </Box>
                <AlertTriangle size={32} color="#f59e0b" />
              </Box>
            </CardContent>
          </NeonCard>

          <NeonCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Low Priority Risks</Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>{lowRisks}</Typography>
                </Box>
                <Shield size={32} color="#22c55e" />
              </Box>
            </CardContent>
          </NeonCard>
        </Box>

        <NeonCard fadeIn>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab icon={<AlertTriangle size={16} />} label="Risk Register" iconPosition="start" />
            <Tab icon={<BarChart3 size={16} />} label="Risk Heat Map" iconPosition="start" />
            <Tab icon={<Shield size={16} />} label="Mitigation Plans" iconPosition="start" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              loading ? (
                <Typography>Loading risks...</Typography>
              ) : risks.length === 0 ? (
                <Alert severity="info">No risks registered yet. Add risks to track and manage them.</Alert>
              ) : (
                <DataGrid
                  rows={risks}
                  columns={columns}
                  autoHeight
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                />
              )
            )}

            {activeTab === 1 && (
              risks.length === 0 ? (
                <Alert severity="info">No risks to visualize. Add risks to see them on the heat map.</Alert>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  <Card sx={{ p: 2, backgroundColor: '#fee', border: '1px solid #fcc' }}>
                    <Typography variant="subtitle1" textAlign="center" fontWeight={600}>High Likelihood</Typography>
                    <Typography textAlign="center">{risks.filter(r => r.likelihood === 'High').length} risks</Typography>
                  </Card>
                  <Card sx={{ p: 2, backgroundColor: '#ffe', border: '1px solid #ffc' }}>
                    <Typography variant="subtitle1" textAlign="center" fontWeight={600}>Medium Likelihood</Typography>
                    <Typography textAlign="center">{risks.filter(r => r.likelihood === 'Medium').length} risks</Typography>
                  </Card>
                  <Card sx={{ p: 2, backgroundColor: '#efe', border: '1px solid #cfc' }}>
                    <Typography variant="subtitle1" textAlign="center" fontWeight={600}>Low Likelihood</Typography>
                    <Typography textAlign="center">{risks.filter(r => r.likelihood === 'Low').length} risks</Typography>
                  </Card>
                </Box>
              )
            )}

            {activeTab === 2 && (
              risks.length === 0 ? (
                <Alert severity="info">No mitigation plans yet. Risks will appear here once added.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {risks.map(risk => (
                    <Card key={risk.id}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6">{risk.title}</Typography>
                          <Chip label={risk.status} color={getRiskColor(risk.impact)} size="small" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Mitigation:</strong> {risk.mitigation || 'No mitigation plan yet'}
                        </Typography>
                        {risk.owner && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            <strong>Owner:</strong> {risk.owner}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )
            )}
          </Box>
        </NeonCard>
      </FinancePortalLayout>
    </ThemeProvider>
  );
};
