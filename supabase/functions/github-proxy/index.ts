import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface GitHubRequest {
  action: 'get_file' | 'list_files' | 'create_pr' | 'get_tree' | 'get_branches' | 'create_branch' | 'commit_file';
  repository: string;
  path?: string;
  branch?: string;
  content?: string;
  commit_message?: string;
  pr_title?: string;
  pr_body?: string;
  base_branch?: string;
  old_content?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check admin role (no hardcoded email allow-list)
    let permissions = { can_read: false, can_write: false, can_merge: false };
    {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "ceo"])
        .maybeSingle();

      // Also accept approved CEO/CTO via exec_users
      const { data: execRow } = await supabase
        .from("exec_users")
        .select("role, is_approved")
        .eq("user_id", user.id)
        .maybeSingle();
      const execRole = String(execRow?.role || "").toLowerCase();
      const isExecAdmin = execRow?.is_approved !== false && ["ceo", "cto", "admin"].includes(execRole);

      if (roleData || isExecAdmin) {
        permissions = { can_read: true, can_write: true, can_merge: true };
      } else {
        // Check developer permissions table
        const { data: devPermissions, error: permError } = await supabase
          .from("developer_permissions")
          .select("can_read, can_write, can_merge")
          .eq("developer_id", user.id)
          .eq("is_active", true)
          .single();

        if (permError || !devPermissions) {
          throw new Error("No developer permissions found");
        }
        permissions = devPermissions;
      }
    }

    const { action, repository, path, branch, content, commit_message, pr_title, pr_body, base_branch, old_content }: GitHubRequest = await req.json();

    if (!action || !repository) {
      throw new Error("Missing required fields: action, repository");
    }

    // Get GitHub token from environment (stored securely)
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) {
      throw new Error("GitHub token not configured");
    }

    const owner = "Craven-Food-App"; // Your GitHub org/username
    const repo = repository;

    let response: Response;
    let result: any;

    switch (action) {
      case 'get_file':
        if (!path || !branch) {
          throw new Error("Missing path or branch for get_file");
        }
        if (!permissions.can_read) {
          throw new Error("No read permission");
        }
        // Get file content from GitHub
        response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
          {
            headers: {
              "Authorization": `token ${githubToken}`,
              "Accept": "application/vnd.github.v3+json",
            },
          }
        );
        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }
        result = await response.json();
        // Decode base64 content
        if (result.content) {
          result.content = atob(result.content.replace(/\n/g, ''));
        }
        break;

      case 'list_files':
      case 'get_tree':
        if (!branch) {
          throw new Error("Missing branch for list_files/get_tree");
        }
        if (!permissions.can_read) {
          throw new Error("No read permission");
        }
        // Get repository tree
        response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
          {
            headers: {
              "Authorization": `token ${githubToken}`,
              "Accept": "application/vnd.github.v3+json",
            },
          }
        );
        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }
        result = await response.json();
        break;

      case 'get_branches':
        if (!permissions.can_read) {
          throw new Error("No read permission");
        }
        response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/branches`,
          {
            headers: {
              "Authorization": `token ${githubToken}`,
              "Accept": "application/vnd.github.v3+json",
            },
          }
        );
        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }
        result = await response.json();
        break;

      case 'create_branch':
        if (!branch || !base_branch) {
          throw new Error("Missing branch or base_branch");
        }
        if (!permissions.can_write) {
          throw new Error("No write permission");
        }
        // Get SHA of base branch
        const baseResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${base_branch}`,
          {
            headers: {
              "Authorization": `token ${githubToken}`,
              "Accept": "application/vnd.github.v3+json",
            },
          }
        );
        if (!baseResponse.ok) {
          throw new Error(`Failed to get base branch: ${baseResponse.statusText}`);
        }
        const baseData = await baseResponse.json();
        const sha = baseData.object.sha;

        // Create new branch
        response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/refs`,
          {
            method: "POST",
            headers: {
              "Authorization": `token ${githubToken}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ref: `refs/heads/${branch}`,
              sha: sha,
            }),
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to create branch: ${response.statusText}`);
        }
        result = await response.json();
        break;

      case 'commit_file':
        if (!path || !branch || !content || !commit_message) {
          throw new Error("Missing required fields for commit");
        }
        if (!permissions.can_write) {
          throw new Error("No write permission");
        }
        // Get current file SHA if it exists
        let fileSha = null;
        try {
          const fileResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
            {
              headers: {
                "Authorization": `token ${githubToken}`,
                "Accept": "application/vnd.github.v3+json",
              },
            }
          );
          if (fileResponse.ok) {
            const fileData = await fileResponse.json();
            fileSha = fileData.sha;
          }
        } catch (e) {
          // File doesn't exist, that's okay
        }

        // Commit file change
        const contentBase64 = btoa(unescape(encodeURIComponent(content)));
        response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
          {
            method: "PUT",
            headers: {
              "Authorization": `token ${githubToken}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: commit_message,
              content: contentBase64,
              branch: branch,
              sha: fileSha, // Include SHA if updating existing file
            }),
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to commit file: ${errorData.message || response.statusText}`);
        }
        result = await response.json();
        
        // Log code access
        await supabase.from("code_access_logs").insert({
          developer_id: user.id,
          repository: repository,
          action: "write",
          file_path: path,
        });
        break;

      case 'create_pr':
        if (!pr_title || !branch || !base_branch) {
          throw new Error("Missing required fields for PR");
        }
        if (!permissions.can_write) {
          throw new Error("No write permission");
        }
        // Create pull request
        response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls`,
          {
            method: "POST",
            headers: {
              "Authorization": `token ${githubToken}`,
              "Accept": "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: pr_title,
              head: branch,
              base: base_branch,
              body: pr_body || "",
            }),
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to create PR: ${errorData.message || response.statusText}`);
        }
        result = await response.json();
        
        // Log code access
        await supabase.from("code_access_logs").insert({
          developer_id: user.id,
          repository: repository,
          action: "write",
          file_path: path,
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("GitHub proxy error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

