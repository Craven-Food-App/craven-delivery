// Tech Support & Code Management Types

export interface ITHelpDeskTicket {
  id: string;
  ticket_number: string;
  requester_id: string;
  assigned_to?: string;
  category: 'hardware' | 'software' | 'access' | 'password_reset' | 'network' | 'email' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  subject: string;
  description: string;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  requester?: {
    email: string;
  };
  assignee?: {
    email: string;
  };
}

export interface ITHelpDeskMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  sender?: {
    email: string;
  };
}

export interface CodeChangeRequest {
  id: string;
  request_number: string;
  developer_id: string;
  reviewer_id?: string;
  repository: string;
  branch_name: string;
  file_path: string;
  old_content?: string;
  new_content: string;
  commit_message?: string;
  status: 'pending' | 'approved' | 'rejected' | 'merged' | 'needs_changes';
  github_pr_url?: string;
  github_pr_number?: number;
  review_notes?: string;
  merged_at?: string;
  created_at: string;
  updated_at: string;
  developer?: {
    email: string;
  };
  reviewer?: {
    email: string;
  };
}

export interface DeveloperPermission {
  id: string;
  developer_id: string;
  repository: string;
  can_read: boolean;
  can_write: boolean;
  can_merge: boolean;
  can_deploy: boolean;
  granted_by?: string;
  granted_at: string;
  revoked_at?: string;
  is_active: boolean;
  developer?: {
    email: string;
  };
}

export interface DeveloperOnboarding {
  id: string;
  developer_id: string;
  onboarding_status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  github_access_granted: boolean;
  supabase_access_granted: boolean;
  dev_environment_setup: boolean;
  documentation_reviewed: boolean;
  first_code_review_completed: boolean;
  onboarding_notes?: string;
  assigned_mentor_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  developer?: {
    email: string;
  };
  mentor?: {
    email: string;
  };
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  category: 'setup' | 'troubleshooting' | 'best_practices' | 'architecture' | 'api' | 'deployment' | 'other';
  content: string;
  tags: string[];
  author_id: string;
  views_count: number;
  helpful_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    email: string;
  };
}

export interface CodeAccessLog {
  id: string;
  developer_id: string;
  repository: string;
  action: 'read' | 'write' | 'merge' | 'deploy' | 'access_denied';
  file_path?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  developer?: {
    email: string;
  };
}

