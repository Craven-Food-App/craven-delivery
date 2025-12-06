import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Modal, Form, Input, Select, Space, Badge, Typography, message, Tree, Tabs, Descriptions, Divider, Steps, Alert } from 'antd';
import { SaveOutlined, FileOutlined, FolderOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, ArrowLeftOutlined, SettingOutlined, CheckOutlined, CloudSyncOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { supabase } from '@/integrations/supabase/client';
import { useCodeChangeRequests } from '@/hooks/useTechSupport';
import type { CodeChangeRequest } from '@/types/tech-support';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface FileNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: FileNode[];
}

interface CodeEditorPortalProps {
  standalone?: boolean;
  onBack?: () => void;
}

export default function CodeEditorPortal({ standalone = true, onBack }: CodeEditorPortalProps) {
  const [selectedRepository, setSelectedRepository] = useState<string>('craven-delivery');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { requests, loading: requestsLoading, refetch: refetchRequests } = useCodeChangeRequests();
  const [pendingRequests, setPendingRequests] = useState<CodeChangeRequest[]>([]);
  const editorRef = useRef<any>(null);
  
  // Authorization state
  const [authSetupVisible, setAuthSetupVisible] = useState(false);
  const [authStep, setAuthStep] = useState(0);
  const [githubToken, setGithubToken] = useState<string>('');
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean>(false);
  const [githubConfigured, setGithubConfigured] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const repositories = [
    { value: 'craven-delivery', label: 'craven-delivery' },
    { value: 'craven-mobile', label: 'craven-mobile' },
    { value: 'craven-api', label: 'craven-api' },
  ];

  useEffect(() => {
    checkAuthStatus();
    if (selectedRepository) {
      fetchFileTree();
    }
  }, [selectedRepository]);

  useEffect(() => {
    setPendingRequests(requests.filter(r => r.status === 'pending' || r.status === 'needs_changes'));
  }, [requests]);

  const checkAuthStatus = async () => {
    try {
      // Check Supabase connection
      const { data: { session } } = await supabase.auth.getSession();
      setSupabaseConfigured(!!session);
      
      // Check GitHub token (stored in user metadata or local storage)
      const storedToken = localStorage.getItem('github_token') || session?.user?.user_metadata?.github_token;
      setGithubConfigured(!!storedToken);
      if (storedToken) {
        setGithubToken(storedToken);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const callGitHubProxy = async (action: string, params: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Use Supabase URL from client
    const supabaseUrl = 'https://xaxbucnjlrfkccsfiddq.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhheGJ1Y25qbHJma2Njc2ZpZGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODMyODAsImV4cCI6MjA3Mjg1OTI4MH0.3ETuLETgSEj6W8gYi7WAoUFDPNo4IwTjuSnVtt1BCFE';

    const response = await fetch(`${supabaseUrl}/functions/v1/github-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        action,
        repository: selectedRepository,
        ...params,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'GitHub API error');
    }
    return result.data;
  };

  const fetchFileTree = async () => {
    setLoading(true);
    try {
      // Get default branch first
      const branches = await callGitHubProxy('get_branches', {});
      const defaultBranch = branches.find((b: any) => b.name === 'main' || b.name === 'master') || branches[0];
      if (!defaultBranch) {
        throw new Error('No branches found');
      }

      // Get repository tree
      const treeData = await callGitHubProxy('get_tree', { branch: defaultBranch.name });
      
      // Convert GitHub tree to Ant Design Tree format
      const buildTree = (items: any[]): FileNode[] => {
        const treeMap: Record<string, FileNode> = {};
        const rootNodes: FileNode[] = [];

        // First pass: create all nodes
        items.forEach((item: any) => {
          const pathParts = item.path.split('/');
          const fileName = pathParts[pathParts.length - 1];
          
          treeMap[item.path] = {
            title: fileName,
            key: item.path,
            isLeaf: item.type === 'blob',
            children: item.type === 'tree' ? [] : undefined,
          };
        });

        // Second pass: build hierarchy
        items.forEach((item: any) => {
          const pathParts = item.path.split('/');
          if (pathParts.length === 1) {
            // Root level
            rootNodes.push(treeMap[item.path]);
          } else {
            // Has parent
            const parentPath = pathParts.slice(0, -1).join('/');
            if (treeMap[parentPath]) {
              if (!treeMap[parentPath].children) {
                treeMap[parentPath].children = [];
              }
              treeMap[parentPath].children!.push(treeMap[item.path]);
            }
          }
        });

        return rootNodes;
      };

      const tree = buildTree(treeData.tree || []);
      setFileTree(tree);
    } catch (error: any) {
      console.error('Error fetching file tree:', error);
      message.error(error.message || 'Failed to load repository structure');
      setFileTree([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (filePath: string) => {
    if (!filePath || (filePath.includes('/') && !filePath.includes('.'))) {
      return; // Don't load directories
    }

    setSelectedFile(filePath);
    setLoading(true);
    try {
      // Get default branch
      const branches = await callGitHubProxy('get_branches', {});
      const defaultBranch = branches.find((b: any) => b.name === 'main' || b.name === 'master') || branches[0];
      if (!defaultBranch) {
        throw new Error('No branches found');
      }

      // Get file content from GitHub
      const fileData = await callGitHubProxy('get_file', {
        path: filePath,
        branch: defaultBranch.name,
      });

      const content = fileData.content || '';
      setFileContent(content);
      setOriginalContent(content);
    } catch (error: any) {
      console.error('Error loading file:', error);
      message.error(error.message || 'Failed to load file content');
      setFileContent('');
      setOriginalContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContent(value);
    }
  };

  const handleSaveRequest = () => {
    if (!selectedFile) {
      message.warning('Please select a file first');
      return;
    }

    if (fileContent === originalContent) {
      message.info('No changes detected');
      return;
    }

    form.setFieldsValue({
      repository: selectedRepository,
      file_path: selectedFile,
      old_content: originalContent,
      new_content: fileContent,
      branch_name: `feature/${selectedFile.replace(/\//g, '-')}-${Date.now()}`,
    });
    setRequestModalVisible(true);
  };

  const handleSubmitRequest = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        message.error('You must be logged in to submit a code change request');
        return;
      }

      // Get old_content and new_content from form values (they're set but not in form fields)
      const formValues = form.getFieldsValue();
      const oldContent = formValues.old_content || '';
      const newContent = formValues.new_content || '';

      if (!newContent) {
        message.error('No content to submit');
        return;
      }
      
      // Generate request number
      let requestNumber = `CCR-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
      // Try to use RPC function if available, otherwise use generated number
      try {
        const { data: rpcNumber, error: numError } = await supabase.rpc('generate_code_request_number');
        if (!numError && rpcNumber) requestNumber = rpcNumber;
      } catch (e) {
        // Use generated number if RPC fails
      }

      const { error } = await supabase.from('code_change_requests').insert({
        repository: values.repository || formValues.repository,
        file_path: values.file_path || formValues.file_path,
        branch_name: values.branch_name || formValues.branch_name,
        commit_message: values.commit_message || formValues.commit_message,
        old_content: oldContent,
        new_content: newContent,
        developer_id: user.id,
        request_number: requestNumber,
        status: 'pending',
      });

      if (error) {
        console.error('Error submitting code change request:', error);
        throw error;
      }
      
      message.success('Code change request submitted successfully');
      setRequestModalVisible(false);
      form.resetFields();
      refetchRequests();
    } catch (error: any) {
      console.error('Failed to submit code change request:', error);
      message.error(error.message || 'Failed to submit code change request');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      // Get default branch
      const branches = await callGitHubProxy('get_branches', {});
      const defaultBranch = branches.find((b: any) => b.name === 'main' || b.name === 'master') || branches[0];
      if (!defaultBranch) {
        throw new Error('No branches found');
      }

      // Create branch if it doesn't exist
      try {
        await callGitHubProxy('create_branch', {
          branch: request.branch_name,
          base_branch: defaultBranch.name,
        });
      } catch (e: any) {
        // Branch might already exist, continue
        if (!e.message?.includes('already exists') && !e.message?.includes('Reference already exists')) {
          console.warn('Branch creation warning:', e);
        }
      }

      // Commit the file change to the branch
      await callGitHubProxy('commit_file', {
        path: request.file_path,
        branch: request.branch_name,
        content: request.new_content,
        commit_message: request.commit_message || `Update ${request.file_path}`,
      });

      // Create PR via GitHub API
      const prData = await callGitHubProxy('create_pr', {
        branch: request.branch_name,
        base_branch: defaultBranch.name,
        pr_title: request.commit_message || `Update ${request.file_path}`,
        pr_body: `Code change request: ${request.request_number}\n\nFile: ${request.file_path}\n\nThis PR was created from the CTO Portal Code Editor.`,
      });

      // Update request with PR info
      const { error } = await supabase
        .from('code_change_requests')
        .update({
          status: 'approved',
          reviewer_id: user?.id,
          github_pr_url: prData.html_url,
          github_pr_number: prData.number,
        })
        .eq('id', requestId);

      if (error) throw error;
      message.success(`Code change request approved. PR #${prData.number} created.`);
      refetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      message.error(error.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string, notes: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('code_change_requests')
        .update({
          status: 'rejected',
          reviewer_id: user?.id,
          review_notes: notes,
        })
        .eq('id', requestId);

      if (error) throw error;
      message.success('Code change request rejected');
      refetchRequests();
    } catch (error: any) {
      message.error(error.message || 'Failed to reject request');
    }
  };

  const handleSaveGitHubToken = async () => {
    if (!githubToken.trim()) {
      message.error('Please enter a GitHub token');
      return;
    }

    try {
      // Store token in localStorage
      localStorage.setItem('github_token', githubToken);
      
      // Also try to store in user metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: { github_token: githubToken }
        });
        if (error) console.warn('Could not save token to user metadata:', error);
      }
      
      setGithubConfigured(true);
      setAuthStep(1);
      message.success('GitHub token saved successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to save GitHub token');
    }
  };

  const handleSyncToGitHub = async () => {
    if (!selectedFile || !githubConfigured) {
      message.warning('Please configure GitHub authorization first');
      setAuthSetupVisible(true);
      return;
    }

    setSyncStatus('syncing');
    try {
      const branches = await callGitHubProxy('get_branches', {});
      const defaultBranch = branches.find((b: any) => b.name === 'main' || b.name === 'master') || branches[0];
      
      await callGitHubProxy('commit_file', {
        path: selectedFile,
        branch: defaultBranch.name,
        content: fileContent,
        commit_message: `Update ${selectedFile} via Code Editor`,
      });
      
      setSyncStatus('success');
      setOriginalContent(fileContent);
      message.success('Successfully synced to GitHub');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error: any) {
      setSyncStatus('error');
      message.error(error.message || 'Failed to sync to GitHub');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleSyncToSupabase = async () => {
    if (!selectedFile || !supabaseConfigured) {
      message.warning('Supabase is not configured');
      return;
    }

    setSyncStatus('syncing');
    try {
      // Store file content in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('code_change_requests')
        .insert({
          repository: selectedRepository,
          file_path: selectedFile,
          new_content: fileContent,
          old_content: originalContent,
          developer_id: user?.id,
          status: 'pending',
          commit_message: `Sync ${selectedFile} to Supabase`,
        });

      if (error) throw error;
      setSyncStatus('success');
      message.success('Successfully synced to Supabase');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error: any) {
      setSyncStatus('error');
      message.error(error.message || 'Failed to sync to Supabase');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const hasChanges = fileContent !== originalContent;

  // Corporate standalone layout
  return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        {/* Corporate Header */}
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e8e8e8',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={onBack}
              style={{ border: 'none', boxShadow: 'none' }}
            >
              Back to Portal
            </Button>
            <Divider type="vertical" style={{ height: '24px', margin: '0' }} />
            <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#262626' }}>
              Code Editor
            </Title>
            <Badge 
              status={githubConfigured && supabaseConfigured ? 'success' : 'warning'} 
              text={githubConfigured && supabaseConfigured ? 'Connected' : 'Setup Required'}
              style={{ marginLeft: '8px' }}
            />
          </div>
          
          <Space>
            <Button 
              icon={<SettingOutlined />}
              onClick={() => setAuthSetupVisible(true)}
            >
              Authorization Setup
            </Button>
            <Select
              value={selectedRepository}
              onChange={setSelectedRepository}
              style={{ width: 180 }}
            >
              {repositories.map(repo => (
                <Select.Option key={repo.value} value={repo.value}>
                  {repo.label}
                </Select.Option>
              ))}
            </Select>
            {selectedFile && (
              <>
                <Button
                  icon={<CloudSyncOutlined />}
                  onClick={handleSyncToGitHub}
                  loading={syncStatus === 'syncing'}
                  disabled={!githubConfigured || !hasChanges}
                  type="default"
                >
                  Sync to GitHub
                </Button>
                <Button
                  icon={<CloudSyncOutlined />}
                  onClick={handleSyncToSupabase}
                  loading={syncStatus === 'syncing'}
                  disabled={!supabaseConfigured || !hasChanges}
                  type="default"
                >
                  Sync to Supabase
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveRequest}
                  disabled={!hasChanges}
                >
                  Submit Change Request
                </Button>
              </>
            )}
          </Space>
        </div>

        {/* Main Content Area */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          gap: '16px', 
          padding: '16px',
          overflow: 'hidden'
        }}>
          {/* File Tree Sidebar */}
          <Card 
            style={{ 
              width: '320px', 
              overflow: 'auto',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Title level={5} style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
              Repository Files
            </Title>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#8c8c8c' }}>
                Loading...
              </div>
            ) : fileTree.length === 0 ? (
              <Alert
                message="No files loaded"
                description={githubConfigured ? "Select a repository to view files" : "Configure GitHub authorization to load files"}
                type="info"
                showIcon
              />
            ) : (
              <Tree
                showLine
                treeData={fileTree}
                onSelect={(keys) => {
                  if (keys.length > 0) {
                    handleFileSelect(keys[0] as string);
                  }
                }}
                selectedKeys={[selectedFile]}
              />
            )}
          </Card>

          {/* Code Editor */}
          <Card 
            style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
            bodyStyle={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              padding: '16px',
              overflow: 'hidden'
            }}
          >
            {selectedFile ? (
              <>
                <div style={{ 
                  marginBottom: '12px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <Text strong style={{ fontSize: '14px', color: '#262626' }}>{selectedFile}</Text>
                  {hasChanges && (
                    <Badge status="warning" text="Unsaved Changes" />
                  )}
                </div>
                <div style={{ 
                  flex: 1, 
                  border: '1px solid #e8e8e8', 
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    value={fileContent}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: true },
                      fontSize: 14,
                      wordWrap: 'on',
                      automaticLayout: true,
                    }}
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '48px', 
                color: '#8c8c8c',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                <FileOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
                <Text style={{ fontSize: '16px' }}>Select a file from the tree to start editing</Text>
              </div>
            )}
          </Card>

          {/* Pending Requests Sidebar */}
          <Card 
            style={{ 
              width: '360px', 
              overflow: 'auto',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Title level={5} style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
              Pending Requests ({pendingRequests.length})
            </Title>
            {pendingRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#8c8c8c' }}>
                No pending requests
              </div>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {pendingRequests.map((req) => (
                  <Card 
                    key={req.id} 
                    size="small" 
                    style={{ marginBottom: '12px', borderRadius: '6px' }}
                  >
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Request #">{req.request_number}</Descriptions.Item>
                      <Descriptions.Item label="File">{req.file_path}</Descriptions.Item>
                      <Descriptions.Item label="Developer">{req.developer?.email}</Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Badge status={req.status === 'pending' ? 'processing' : 'warning'} text={req.status} />
                      </Descriptions.Item>
                    </Descriptions>
                    <Space style={{ marginTop: '12px' }}>
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleApproveRequest(req.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => {
                          Modal.confirm({
                            title: 'Reject Code Change Request',
                            content: (
                              <Input.TextArea
                                placeholder="Enter rejection reason..."
                                rows={4}
                                id="rejection-notes"
                              />
                            ),
                            onOk: () => {
                              const notes = (document.getElementById('rejection-notes') as HTMLTextAreaElement)?.value || '';
                              handleRejectRequest(req.id, notes);
                            },
                          });
                        }}
                      >
                        Reject
                      </Button>
                    </Space>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Authorization Setup Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingOutlined />
              <span>Authorization Setup</span>
            </div>
          }
          open={authSetupVisible}
          onCancel={() => {
            setAuthSetupVisible(false);
            setAuthStep(0);
          }}
          footer={null}
          width={600}
        >
          <Steps current={authStep} style={{ marginBottom: '24px' }}>
            <Steps.Step title="GitHub" icon={<CheckOutlined />} />
            <Steps.Step title="Supabase" icon={<CheckOutlined />} />
            <Steps.Step title="Complete" icon={<CheckOutlined />} />
          </Steps>

          {authStep === 0 && (
            <div>
              <Alert
                message="GitHub Personal Access Token Required"
                description="You need a GitHub Personal Access Token to access repositories. Create one at: https://github.com/settings/tokens"
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              <Form layout="vertical">
                <Form.Item label="GitHub Personal Access Token">
                  <Input.Password
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                  />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={handleSaveGitHubToken} block>
                    Save Token
                  </Button>
                </Form.Item>
              </Form>
            </div>
          )}

          {authStep === 1 && (
            <div>
              <Alert
                message="Supabase Configuration"
                description={supabaseConfigured 
                  ? "Supabase is already configured and connected." 
                  : "Supabase connection is managed automatically through your session."}
                type={supabaseConfigured ? 'success' : 'warning'}
                showIcon
                style={{ marginBottom: '16px' }}
              />
              <Button 
                type="primary" 
                onClick={() => {
                  checkAuthStatus();
                  setAuthStep(2);
                }}
                block
              >
                Continue
              </Button>
            </div>
          )}

          {authStep === 2 && (
            <div>
              <Alert
                message="Setup Complete"
                description="Your authorizations are configured. You can now sync code to GitHub and Supabase."
                type="success"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <Badge 
                  status={githubConfigured ? 'success' : 'error'} 
                  text={`GitHub ${githubConfigured ? 'Connected' : 'Not Connected'}`}
                />
                <Badge 
                  status={supabaseConfigured ? 'success' : 'error'} 
                  text={`Supabase ${supabaseConfigured ? 'Connected' : 'Not Connected'}`}
                />
              </div>
              <Button 
                type="primary" 
                onClick={() => {
                  setAuthSetupVisible(false);
                  setAuthStep(0);
                  fetchFileTree();
                }}
                block
                style={{ marginTop: '16px' }}
              >
                Done
              </Button>
            </div>
          )}
        </Modal>

        {/* Submit Request Modal */}
        <Modal
          title="Submit Code Change Request"
          open={requestModalVisible}
          onCancel={() => {
            setRequestModalVisible(false);
            form.resetFields();
          }}
          onOk={async () => {
            try {
              const values = await form.validateFields();
              await handleSubmitRequest(values);
            } catch (error: any) {
              if (error.errorFields) {
                // Form validation errors
                message.warning('Please fill in all required fields');
              } else {
                console.error('Form submission error:', error);
              }
            }
          }}
          okText="Submit"
          cancelText="Cancel"
          width={700}
        >
          <Form form={form} onFinish={handleSubmitRequest} layout="vertical">
            <Form.Item name="repository" label="Repository" rules={[{ required: true, message: 'Repository is required' }]}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="file_path" label="File Path" rules={[{ required: true, message: 'File path is required' }]}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="branch_name" label="Branch Name" rules={[{ required: true, message: 'Branch name is required' }]}>
              <Input placeholder="feature/my-feature" />
            </Form.Item>
            <Form.Item name="commit_message" label="Commit Message" rules={[{ required: true, message: 'Commit message is required' }]}>
              <TextArea rows={3} placeholder="Describe your changes..." />
            </Form.Item>
            <Form.Item label="Changes Preview">
              <div style={{ maxHeight: '200px', overflow: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  {form.getFieldValue('new_content')?.substring(0, 500)}
                  {form.getFieldValue('new_content')?.length > 500 ? '...' : ''}
                </Text>
              </div>
            </Form.Item>
            {/* Hidden fields for old_content and new_content */}
            <Form.Item name="old_content" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="new_content" hidden>
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
}

