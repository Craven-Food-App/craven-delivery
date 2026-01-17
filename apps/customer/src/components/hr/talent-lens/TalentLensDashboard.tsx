import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Button, Space, message, Select, Drawer } from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import { Applicant, JobPosting, DashboardStats } from './types';
import StatsCards from './StatsCards';
import FilterBar from './FilterBar';
import JobPostingSidebar from './JobPostingSidebar';
import ApplicantGrid from './ApplicantGrid';
import ApplicantDetailPanel from './ApplicantDetailPanel';
import ImportModal from './ImportModal';
import JobPostingModal from './JobPostingModal';

const { Content, Sider } = Layout;
const { Option } = Select;

const TalentLensDashboard: React.FC = () => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [detailPanelVisible, setDetailPanelVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importMode, setImportMode] = useState<'csv' | 'pdf'>('csv');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [jobPostingModalVisible, setJobPostingModalVisible] = useState(false);
  const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fitScoreFilter, setFitScoreFilter] = useState<string>('all');

  // Load data
  useEffect(() => {
    loadJobPostings();
    loadApplicants();
  }, [selectedPostingId]);

  const loadJobPostings = async () => {
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .order('posted_date', { ascending: false });

      if (error) throw error;

      const postingsWithCounts = await Promise.all(
        (data || []).map(async (posting) => {
          const { count } = await supabase
            .from('job_applicants')
            .select('*', { count: 'exact', head: true })
            .eq('job_posting_id', posting.id);

          return {
            ...posting,
            salaryRange: {
              min: posting.salary_min || 0,
              max: posting.salary_max || 0,
            },
            requirements: posting.requirements || [],
            applicantCount: count || 0,
            postedDate: posting.posted_date,
          } as JobPosting;
        })
      );

      setJobPostings(postingsWithCounts);
    } catch (error: any) {
      message.error(`Error loading job postings: ${error.message}`);
    }
  };

  const loadApplicants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('job_applicants')
        .select(`
          *,
          job_postings (
            id,
            title
          )
        `)
        .order('applied_date', { ascending: false });

      if (selectedPostingId) {
        query = query.eq('job_posting_id', selectedPostingId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedApplicants: Applicant[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        linkedinUrl: item.linkedin_url,
        currentRole: item.applicant_role || '',
        currentCompany: item.current_company || '',
        yearsExperience: item.years_experience || 0,
        location: item.location || '',
        skills: item.skills || [],
        education: item.education || '',
        summary: item.summary,
        appliedDate: item.applied_date,
        status: item.status,
        fitScore: item.fit_score,
        aiAnalysis: item.ai_analysis as any,
        jobPostingId: item.job_posting_id,
        jobPostingTitle: item.job_postings?.title || null,
        resumeFilePath: item.resume_file_path,
        resumeText: item.resume_text,
        source: item.source,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setApplicants(mappedApplicants);
    } catch (error: any) {
      message.error(`Error loading applicants: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats: DashboardStats = useMemo(() => {
    return {
      totalApplicants: applicants.length,
      newApplicants: applicants.filter((a) => a.status === 'new').length,
      shortlisted: applicants.filter((a) => a.status === 'shortlisted').length,
      offersExtended: applicants.filter((a) => a.status === 'offered').length,
    };
  }, [applicants]);

  // Filter applicants
  const filteredApplicants = useMemo(() => {
    let filtered = [...applicants];

    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email.toLowerCase().includes(searchLower) ||
          a.currentCompany?.toLowerCase().includes(searchLower) ||
          a.skills.some((s) => s.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    // Fit score filter
    if (fitScoreFilter !== 'all' && fitScoreFilter !== '') {
      filtered = filtered.filter((a) => {
        if (!a.fitScore) return false;
        switch (fitScoreFilter) {
          case 'excellent':
            return a.fitScore >= 80;
          case 'good':
            return a.fitScore >= 60 && a.fitScore < 80;
          case 'moderate':
            return a.fitScore >= 40 && a.fitScore < 60;
          case 'poor':
            return a.fitScore < 40;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [applicants, searchText, statusFilter, fitScoreFilter]);

  // Handle import
  const handleImport = async (importedApplicants: Partial<Applicant>[]) => {
    try {
      setLoading(true);
      const applicantsToInsert = importedApplicants.map((app) => ({
        job_posting_id: app.jobPostingId || null,
        name: app.name || '',
        email: app.email || '',
        phone: app.phone || null,
        linkedin_url: app.linkedinUrl || null,
        applicant_role: app.currentRole || '',
        current_company: app.currentCompany || '',
        years_experience: app.yearsExperience || 0,
        location: app.location || '',
        skills: app.skills || [],
        education: app.education || '',
        summary: app.summary || null,
        status: 'new',
        source: app.source || 'manual',
        applied_date: new Date().toISOString().split('T')[0],
      }));

      const { error } = await supabase
        .from('job_applicants')
        .insert(applicantsToInsert);

      if (error) throw error;

      message.success(`Successfully imported ${importedApplicants.length} applicants`);
      await loadApplicants();
      setImportModalVisible(false);
    } catch (error: any) {
      message.error(`Error importing applicants: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle AI analysis
  const handleAnalyze = async (applicantId: string) => {
    if (!selectedApplicant?.jobPostingId) {
      message.warning('Applicant must be associated with a job posting for analysis');
      return;
    }

    try {
      setAnalyzing(true);
      const { data, error } = await supabase.functions.invoke('analyze-applicant', {
        body: {
          applicantId,
          jobPostingId: selectedApplicant.jobPostingId,
        },
      });

      if (error) throw error;

      message.success('Analysis completed successfully');
      await loadApplicants();
      
      // Refresh selected applicant
      const updated = applicants.find((a) => a.id === applicantId);
      if (updated) {
        setSelectedApplicant(updated);
      }
    } catch (error: any) {
      message.error(`Error analyzing applicant: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplicantClick = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setDetailPanelVisible(true);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setFitScoreFilter('all');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Sider width={300} style={{ background: '#fafafa', borderRight: '1px solid #e8e8e8' }}>
        <JobPostingSidebar
          postings={jobPostings}
          selectedPostingId={selectedPostingId}
          onSelectPosting={setSelectedPostingId}
          onEditPosting={(posting) => {
            setEditingPosting(posting);
            setJobPostingModalVisible(true);
          }}
        />
      </Sider>

      <Content style={{ padding: '24px', background: '#fff' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>TalentLens - Applicant Screening</h2>
            <Space>
              <Button
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingPosting(null);
                  setJobPostingModalVisible(true);
                }}
              >
                Create Job Posting
              </Button>
              <Select
                value={importMode}
                onChange={setImportMode}
                style={{ width: 120 }}
              >
                <Option value="csv">CSV Import</Option>
                <Option value="pdf">PDF Resume</Option>
              </Select>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setImportModalVisible(true)}
              >
                Import Applicants
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadApplicants}>
                Refresh
              </Button>
            </Space>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Filter Bar */}
          <FilterBar
            searchText={searchText}
            onSearchChange={setSearchText}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            fitScoreFilter={fitScoreFilter}
            onFitScoreFilterChange={setFitScoreFilter}
            onReset={handleResetFilters}
          />

          {/* Applicant Grid */}
          <ApplicantGrid
            applicants={filteredApplicants}
            onApplicantClick={handleApplicantClick}
            loading={loading}
          />
        </Space>
      </Content>

      {/* Detail Panel */}
      <ApplicantDetailPanel
        applicant={selectedApplicant}
        visible={detailPanelVisible}
        onClose={() => {
          setDetailPanelVisible(false);
          setSelectedApplicant(null);
        }}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />

      {/* Import Modal */}
      <ImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImport={handleImport}
        jobPostingId={selectedPostingId || undefined}
        mode={importMode}
        jobPostings={jobPostings}
      />

      {/* Job Posting Modal */}
      <JobPostingModal
        visible={jobPostingModalVisible}
        onClose={() => {
          setJobPostingModalVisible(false);
          setEditingPosting(null);
        }}
        onSuccess={() => {
          loadJobPostings();
        }}
        editingPosting={editingPosting}
      />
    </Layout>
  );
};

export default TalentLensDashboard;

