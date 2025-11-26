import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, Tabs, Tab, Alert, LinearProgress } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { financePortalTheme } from '@/themes/financePortalTheme';
import { FinancePortalLayout } from '@/components/finance/FinancePortalLayout';
import { NeonCard } from '@/components/finance/NeonCard';
import { FileCheck, Calendar, AlertTriangle, Download, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import '../../styles/neon-finance.css';

interface AuditRequest {
  id: string;
  title: string;
  assigned_to: string;
  due_date: string;
  status: string;
}

interface AuditTimelineItem {
  id: string;
  title: string;
  phase: string;
  date: string;
  status: string;
}

export const EnhancedAuditManagement: React.FC = () => {
  const [auditRequests, setAuditRequests] = useState<AuditRequest[]>([]);
  const [timeline, setTimeline] = useState<AuditTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    try {
      const [requestsRes, timelineRes] = await Promise.all([
        supabase.from('audit_requests').select('*').order('due_date'),
        supabase.from('audit_timeline').select('*').order('date')
      ]);

      if (requestsRes.data) setAuditRequests(requestsRes.data);
      if (timelineRes.data) setTimeline(timelineRes.data);
    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedRequests = auditRequests.filter(r => r.status === 'completed').length;
  const totalRequests = auditRequests.length || 1;
  const auditProgress = (completedRequests / totalRequests) * 100;

  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Request', flex: 1 },
    { field: 'assigned_to', headerName: 'Assigned To', width: 150 },
    {
      field: 'due_date',
      headerName: 'Due Date',
      width: 120,
      valueFormatter: (value: any) => new Date(value).toLocaleDateString(),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value.replace('_', ' ')}
          color={params.value === 'completed' ? 'success' : params.value === 'in_progress' ? 'warning' : 'default'}
          size="small"
        />
      ),
    },
  ];

  return (
    <ThemeProvider theme={financePortalTheme}>
      <FinancePortalLayout
        title="Audit Management"
        subtitle="Coordinate financial audits, manage audit requests, ensure audit readiness"
        actions={
          <Button variant="outlined" startIcon={<Download size={16} />}>
            Export Audit Package
          </Button>
        }
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
          <NeonCard glow>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Audit Status</Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {timeline.find(t => t.status === 'in_progress')?.phase || 'In Progress'}
                  </Typography>
                </Box>
                <FileCheck size={32} color="#ff6a00" />
              </Box>
            </CardContent>
          </NeonCard>

          <NeonCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Requests Complete</Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>{completedRequests}/{totalRequests}</Typography>
                </Box>
                <Check size={32} color="#22c55e" />
              </Box>
            </CardContent>
          </NeonCard>

          <NeonCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Days Until Review</Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>TBD</Typography>
                </Box>
                <Calendar size={32} color="#f59e0b" />
              </Box>
            </CardContent>
          </NeonCard>

          <NeonCard>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Completion Progress</Typography>
              <Typography variant="h4" sx={{ mb: 2 }}>{auditProgress.toFixed(0)}%</Typography>
              <LinearProgress variant="determinate" value={auditProgress} color="success" />
            </CardContent>
          </NeonCard>
        </Box>

        <NeonCard fadeIn>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab icon={<Calendar size={16} />} label="Audit Timeline" iconPosition="start" />
            <Tab icon={<FileCheck size={16} />} label="Information Requests" iconPosition="start" />
            <Tab icon={<AlertTriangle size={16} />} label="Audit Findings" iconPosition="start" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              loading ? (
                <Typography>Loading timeline...</Typography>
              ) : timeline.length === 0 ? (
                <Alert severity="info">No audit timeline items yet. Create timeline phases to track audit progress.</Alert>
              ) : (
                <Box>
                  {timeline.map((item, idx) => (
                    <Card key={item.id} sx={{ mb: 2, backgroundColor: 'background.paper' }}>
                      <CardContent>
                        <Typography variant="h6">{item.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{item.phase}</Typography>
                        <Chip
                          label={item.status.replace('_', ' ')}
                          color={item.status === 'complete' ? 'success' : item.status === 'in_progress' ? 'warning' : 'default'}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )
            )}

            {activeTab === 1 && (
              loading ? (
                <Typography>Loading requests...</Typography>
              ) : auditRequests.length === 0 ? (
                <Alert severity="info">No audit requests yet. Requests will appear here when auditors submit information requests.</Alert>
              ) : (
                <DataGrid
                  rows={auditRequests}
                  columns={columns}
                  autoHeight
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                />
              )
            )}

            {activeTab === 2 && (
              <Alert severity="info" icon={<FileCheck />}>
                <Typography variant="subtitle1">No Significant Findings</Typography>
                <Typography variant="body2">Audit in progress. Findings will be reported as identified.</Typography>
              </Alert>
            )}
          </Box>
        </NeonCard>
      </FinancePortalLayout>
    </ThemeProvider>
  );
};
