export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_review_items: {
        Row: {
          access_review_id: string | null
          action_taken: string | null
          created_at: string | null
          entity_id: string | null
          id: string
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_id: string | null
          user_id: string | null
        }
        Insert: {
          access_review_id?: string | null
          action_taken?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_id?: string | null
          user_id?: string | null
        }
        Update: {
          access_review_id?: string | null
          action_taken?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_review_items_access_review_id_fkey"
            columns: ["access_review_id"]
            isOneToOne: false
            referencedRelation: "access_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_review_items_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_review_items_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "access_review_items_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "finance_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_review_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      access_reviews: {
        Row: {
          completed_at: string | null
          created_at: string | null
          findings: Json | null
          id: string
          remediation_actions: Json | null
          review_period_end: string
          review_period_start: string
          review_type: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          findings?: Json | null
          id?: string
          remediation_actions?: Json | null
          review_period_end: string
          review_period_start: string
          review_type?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          findings?: Json | null
          id?: string
          remediation_actions?: Json | null
          review_period_end?: string
          review_period_start?: string
          review_type?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      account_balances: {
        Row: {
          account_id: string
          closing_balance: number | null
          id: string
          opening_balance: number | null
          period: string
          period_credits: number | null
          period_debits: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          closing_balance?: number | null
          id?: string
          opening_balance?: number | null
          period: string
          period_credits?: number | null
          period_debits?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          closing_balance?: number | null
          id?: string
          opening_balance?: number | null
          period?: string
          period_credits?: number | null
          period_debits?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          amount: number
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          order_id: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          payment_terms: string | null
          payments: Json | null
          status: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          order_id?: string | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          payment_terms?: string | null
          payments?: Json | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          order_id?: string | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          payment_terms?: string | null
          payments?: Json | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounts_receivable_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      ach_transfers: {
        Row: {
          ach_fee: number | null
          ach_number: string
          ach_type: string
          amount: number
          approved_at: string | null
          approved_by: string | null
          approver_id: string | null
          bank_account_id: string | null
          batch_id: string | null
          company_id: string | null
          company_name: string
          created_at: string | null
          created_by: string
          currency: string | null
          effective_date: string
          id: string
          metadata: Json | null
          receiver_account: string
          receiver_account_type: string | null
          receiver_name: string
          receiver_routing: string
          requires_approval: boolean | null
          return_code: string | null
          return_date: string | null
          return_reason: string | null
          settlement_date: string | null
          standard_entry_class: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          submitted_date: string | null
          updated_at: string | null
        }
        Insert: {
          ach_fee?: number | null
          ach_number: string
          ach_type: string
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          bank_account_id?: string | null
          batch_id?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string | null
          created_by: string
          currency?: string | null
          effective_date: string
          id?: string
          metadata?: Json | null
          receiver_account: string
          receiver_account_type?: string | null
          receiver_name: string
          receiver_routing: string
          requires_approval?: boolean | null
          return_code?: string | null
          return_date?: string | null
          return_reason?: string | null
          settlement_date?: string | null
          standard_entry_class?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Update: {
          ach_fee?: number | null
          ach_number?: string
          ach_type?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          bank_account_id?: string | null
          batch_id?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string | null
          created_by?: string
          currency?: string | null
          effective_date?: string
          id?: string
          metadata?: Json | null
          receiver_account?: string
          receiver_account_type?: string | null
          receiver_name?: string
          receiver_routing?: string
          requires_approval?: boolean | null
          return_code?: string | null
          return_date?: string | null
          return_reason?: string | null
          settlement_date?: string | null
          standard_entry_class?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ach_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ach_transfers_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ach_transfers_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ach_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ach_transfers_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      activation_queue: {
        Row: {
          added_at: string | null
          driver_id: string | null
          id: number
          priority_score: number | null
          region_id: number | null
        }
        Insert: {
          added_at?: string | null
          driver_id?: string | null
          id?: number
          priority_score?: number | null
          region_id?: number | null
        }
        Update: {
          added_at?: string | null
          driver_id?: string | null
          id?: number
          priority_score?: number | null
          region_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_queue_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "craver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_queue_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "unified_driver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_queue_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placements: {
        Row: {
          ad_code: string | null
          click_url: string | null
          created_at: string
          created_by: string | null
          display_order: number
          height: number
          id: string
          image_url: string | null
          is_active: boolean
          page_path: string
          placement_key: string
          placement_name: string
          target_audience: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          width: number
        }
        Insert: {
          ad_code?: string | null
          click_url?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          height?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          page_path: string
          placement_key: string
          placement_name: string
          target_audience?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          width?: number
        }
        Update: {
          ad_code?: string | null
          click_url?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          height?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          page_path?: string
          placement_key?: string
          placement_name?: string
          target_audience?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_placements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_anomalies: {
        Row: {
          anomaly_data: Json
          anomaly_type: string
          audit_log_id: string | null
          confidence_score: number
          created_at: string | null
          description: string
          detected_at: string | null
          id: string
          next_steps: string[] | null
          recommended_actions: string[] | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score: number
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          anomaly_data: Json
          anomaly_type: string
          audit_log_id?: string | null
          confidence_score: number
          created_at?: string | null
          description: string
          detected_at?: string | null
          id?: string
          next_steps?: string[] | null
          recommended_actions?: string[] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score: number
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          anomaly_data?: Json
          anomaly_type?: string
          audit_log_id?: string | null
          confidence_score?: number
          created_at?: string | null
          description?: string
          detected_at?: string | null
          id?: string
          next_steps?: string[] | null
          recommended_actions?: string[] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_anomalies_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_anomalies_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      android_tester_enrollments: {
        Row: {
          activated_at: string | null
          created_at: string | null
          deadline_at: string | null
          email: string
          enrolled_at: string | null
          full_name: string
          id: string
          is_selected_tester: boolean | null
          notes: string | null
          platform: string
          referral_code: string | null
          selected_at: string | null
          selected_by: string | null
          status: string | null
          tester_reward_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          deadline_at?: string | null
          email: string
          enrolled_at?: string | null
          full_name: string
          id?: string
          is_selected_tester?: boolean | null
          notes?: string | null
          platform: string
          referral_code?: string | null
          selected_at?: string | null
          selected_by?: string | null
          status?: string | null
          tester_reward_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          deadline_at?: string | null
          email?: string
          enrolled_at?: string | null
          full_name?: string
          id?: string
          is_selected_tester?: boolean | null
          notes?: string | null
          platform?: string
          referral_code?: string | null
          selected_at?: string | null
          selected_by?: string | null
          status?: string | null
          tester_reward_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "android_tester_enrollments_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "android_tester_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      appointment_audit_log: {
        Row: {
          action_type: string
          actor_user_id: string | null
          appointment_id: string
          created_at: string | null
          department: string | null
          document_hash: string | null
          document_id: string | null
          id: string
          ip_address: string | null
          metadata_json: Json | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_user_id?: string | null
          appointment_id: string
          created_at?: string | null
          department?: string | null
          document_hash?: string | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          metadata_json?: Json | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string | null
          appointment_id?: string
          created_at?: string | null
          department?: string | null
          document_hash?: string | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          metadata_json?: Json | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      appointment_documents: {
        Row: {
          appointment_id: string
          created_at: string
          governance_document_id: string
          id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          governance_document_id: string
          id?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          governance_document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_documents_governance_document_id_fkey"
            columns: ["governance_document_id"]
            isOneToOne: false
            referencedRelation: "board_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_workflow_gates: {
        Row: {
          appointment_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          department_owner: string
          document_hashes: string[] | null
          gate_name: string
          gate_number: number
          id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          required_documents: string[] | null
          stage_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          department_owner: string
          document_hashes?: string[] | null
          gate_name: string
          gate_number: number
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          required_documents?: string[] | null
          stage_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          department_owner?: string
          document_hashes?: string[] | null
          gate_name?: string
          gate_number?: number
          id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          required_documents?: string[] | null
          stage_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_workflow_gates_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointment_workflow_gates_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointee_user_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          role_titles: string[]
          updated_at: string
        }
        Insert: {
          appointee_user_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          role_titles: string[]
          updated_at?: string
        }
        Update: {
          appointee_user_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          role_titles?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointee_user_id_fkey"
            columns: ["appointee_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      approval_queue: {
        Row: {
          amount: number | null
          approval_history: Json | null
          approval_level: number | null
          created_at: string | null
          currency: string | null
          current_approver_role: string | null
          current_approver_user_id: string | null
          due_date: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          requested_at: string | null
          requested_by: string | null
          status: string | null
          total_approval_levels: number | null
          transaction_id: string
          transaction_type: string
          updated_at: string | null
          workflow_definition_id: string | null
        }
        Insert: {
          amount?: number | null
          approval_history?: Json | null
          approval_level?: number | null
          created_at?: string | null
          currency?: string | null
          current_approver_role?: string | null
          current_approver_user_id?: string | null
          due_date?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          total_approval_levels?: number | null
          transaction_id: string
          transaction_type: string
          updated_at?: string | null
          workflow_definition_id?: string | null
        }
        Update: {
          amount?: number | null
          approval_history?: Json | null
          approval_level?: number | null
          created_at?: string | null
          currency?: string | null
          current_approver_role?: string | null
          current_approver_user_id?: string | null
          due_date?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          total_approval_levels?: number | null
          transaction_id?: string
          transaction_type?: string
          updated_at?: string | null
          workflow_definition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_queue_current_approver_user_id_fkey"
            columns: ["current_approver_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_queue_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_queue_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "approval_workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow_definitions: {
        Row: {
          amount_thresholds: Json
          created_at: string | null
          entity_id: string | null
          escalation_rules: Json | null
          id: string
          is_active: boolean | null
          requires_dual_approval: boolean | null
          transaction_type: string
          workflow_code: string
          workflow_name: string
        }
        Insert: {
          amount_thresholds: Json
          created_at?: string | null
          entity_id?: string | null
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean | null
          requires_dual_approval?: boolean | null
          transaction_type: string
          workflow_code: string
          workflow_name: string
        }
        Update: {
          amount_thresholds?: Json
          created_at?: string | null
          entity_id?: string | null
          escalation_rules?: Json | null
          id?: string
          is_active?: boolean | null
          requires_dual_approval?: boolean | null
          transaction_type?: string
          workflow_code?: string
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_definitions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_competitions: {
        Row: {
          claim_window_seconds: number | null
          eligible_drivers: string[]
          ended_at: string | null
          id: string
          order_id: string
          started_at: string | null
          winner_driver_id: string | null
        }
        Insert: {
          claim_window_seconds?: number | null
          eligible_drivers: string[]
          ended_at?: string | null
          id?: string
          order_id: string
          started_at?: string | null
          winner_driver_id?: string | null
        }
        Update: {
          claim_window_seconds?: number | null
          eligible_drivers?: string[]
          ended_at?: string | null
          id?: string
          order_id?: string
          started_at?: string | null
          winner_driver_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_competitions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_competitions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_competitions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
          {
            foreignKeyName: "arena_competitions_winner_driver_id_fkey"
            columns: ["winner_driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_documents: {
        Row: {
          audit_log_id: string | null
          created_at: string | null
          description: string | null
          document_name: string
          document_type: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          tags: string[] | null
          transaction_id: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          audit_log_id?: string | null
          created_at?: string | null
          description?: string | null
          document_name: string
          document_type: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          tags?: string[] | null
          transaction_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          audit_log_id?: string | null
          created_at?: string | null
          description?: string | null
          document_name?: string
          document_type?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          tags?: string[] | null
          transaction_id?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_documents_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_flags: {
        Row: {
          audit_log_id: string | null
          confidence_score: number | null
          created_at: string | null
          description: string
          detected_at: string | null
          detected_by: string | null
          flag_type: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          audit_log_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description: string
          detected_at?: string | null
          detected_by?: string | null
          flag_type: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          audit_log_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          detected_at?: string | null
          detected_by?: string | null
          flag_type?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_flags_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          account_category: string | null
          ai_confidence_score: number | null
          amount: number | null
          anomaly_detected: boolean | null
          approved_by: string | null
          audit_trail: Json | null
          cfo_comment: string | null
          cleared_date: string | null
          created_at: string | null
          currency: string | null
          details: Json | null
          device_info: Json | null
          documentation_count: number | null
          entered_by: string | null
          entered_date: string | null
          expense_category: string | null
          flag_reason: string | null
          geo_location: Json | null
          has_documentation: boolean | null
          id: string
          internal_notes: string | null
          ip_address: unknown
          linked_customer_id: string | null
          linked_driver_id: string | null
          linked_merchant_id: string | null
          linked_order_id: string | null
          linked_vendor_id: string | null
          locked_at: string | null
          notes: string | null
          operation: string
          reviewed_by: string | null
          risk_score: number | null
          severity: string | null
          source: string | null
          status: string | null
          table_name: string
          timestamp: string | null
          transaction_date: string | null
          transaction_id: string | null
          transaction_type: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          account_category?: string | null
          ai_confidence_score?: number | null
          amount?: number | null
          anomaly_detected?: boolean | null
          approved_by?: string | null
          audit_trail?: Json | null
          cfo_comment?: string | null
          cleared_date?: string | null
          created_at?: string | null
          currency?: string | null
          details?: Json | null
          device_info?: Json | null
          documentation_count?: number | null
          entered_by?: string | null
          entered_date?: string | null
          expense_category?: string | null
          flag_reason?: string | null
          geo_location?: Json | null
          has_documentation?: boolean | null
          id?: string
          internal_notes?: string | null
          ip_address?: unknown
          linked_customer_id?: string | null
          linked_driver_id?: string | null
          linked_merchant_id?: string | null
          linked_order_id?: string | null
          linked_vendor_id?: string | null
          locked_at?: string | null
          notes?: string | null
          operation: string
          reviewed_by?: string | null
          risk_score?: number | null
          severity?: string | null
          source?: string | null
          status?: string | null
          table_name: string
          timestamp?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          account_category?: string | null
          ai_confidence_score?: number | null
          amount?: number | null
          anomaly_detected?: boolean | null
          approved_by?: string | null
          audit_trail?: Json | null
          cfo_comment?: string | null
          cleared_date?: string | null
          created_at?: string | null
          currency?: string | null
          details?: Json | null
          device_info?: Json | null
          documentation_count?: number | null
          entered_by?: string | null
          entered_date?: string | null
          expense_category?: string | null
          flag_reason?: string | null
          geo_location?: Json | null
          has_documentation?: boolean | null
          id?: string
          internal_notes?: string | null
          ip_address?: unknown
          linked_customer_id?: string | null
          linked_driver_id?: string | null
          linked_merchant_id?: string | null
          linked_order_id?: string | null
          linked_vendor_id?: string | null
          locked_at?: string | null
          notes?: string | null
          operation?: string
          reviewed_by?: string | null
          risk_score?: number | null
          severity?: string | null
          source?: string | null
          status?: string | null
          table_name?: string
          timestamp?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          transaction_type?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_logs_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_logs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          pdf_url: string | null
          report_data: Json
          report_name: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status: string | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          pdf_url?: string | null
          report_data: Json
          report_name: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          pdf_url?: string | null
          report_data?: Json
          report_name?: string
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          status?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_requests: {
        Row: {
          assigned_to: string
          created_at: string | null
          due_date: string
          id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to: string
          created_at?: string | null
          due_date: string
          id?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string
          created_at?: string | null
          due_date?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_timeline: {
        Row: {
          created_at: string | null
          date: string
          id: string
          phase: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          phase: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          phase?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      audit_trail: {
        Row: {
          action_description: string
          action_type: string
          changed_fields: string[] | null
          created_at: string | null
          device_info: Json | null
          geo_location: Json | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          session_id: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          changed_fields?: string[] | null
          created_at?: string | null
          device_info?: Json | null
          geo_location?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          session_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          changed_fields?: string[] | null
          created_at?: string | null
          device_info?: Json | null
          geo_location?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          session_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      auto_escalations: {
        Row: {
          escalated_at: string | null
          escalated_to: string | null
          escalation_reason: string
          id: string
          incident_id: string | null
        }
        Insert: {
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason: string
          id?: string
          incident_id?: string | null
        }
        Update: {
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string
          id?: string
          incident_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_escalations_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auto_escalations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "it_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      background_check_reports: {
        Row: {
          admin_decision: string | null
          admin_review_notes: string | null
          admin_review_required: boolean | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          application_id: string
          checkr_candidate_id: string | null
          checkr_package: string | null
          checkr_report_id: string | null
          checkr_status: string | null
          completed_at: string | null
          created_at: string | null
          criminal_records: Json | null
          criminal_search_status: string | null
          id: string
          initiated_at: string | null
          mvr_records: Json | null
          mvr_status: string | null
          ssn_trace_status: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_decision?: string | null
          admin_review_notes?: string | null
          admin_review_required?: boolean | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          application_id: string
          checkr_candidate_id?: string | null
          checkr_package?: string | null
          checkr_report_id?: string | null
          checkr_status?: string | null
          completed_at?: string | null
          created_at?: string | null
          criminal_records?: Json | null
          criminal_search_status?: string | null
          id?: string
          initiated_at?: string | null
          mvr_records?: Json | null
          mvr_status?: string | null
          ssn_trace_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_decision?: string | null
          admin_review_notes?: string | null
          admin_review_required?: boolean | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          application_id?: string
          checkr_candidate_id?: string | null
          checkr_package?: string | null
          checkr_report_id?: string | null
          checkr_status?: string | null
          completed_at?: string | null
          created_at?: string | null
          criminal_records?: Json | null
          criminal_search_status?: string | null
          id?: string
          initiated_at?: string | null
          mvr_records?: Json | null
          mvr_status?: string | null
          ssn_trace_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_check_reports_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "craver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_check_reports_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "unified_driver_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_classification: string | null
          account_number_masked: string | null
          account_type: string | null
          available_balance: number | null
          currency: string
          current_balance: number
          daily_limit: number | null
          iban: string | null
          id: string
          institution: string | null
          last_reconciled_at: string | null
          last_reconciled_balance: number | null
          ledger_balance: number | null
          metadata: Json | null
          name: string
          pending_balance: number | null
          routing_number: string | null
          status: string | null
          swift_code: string | null
          transaction_limit: number | null
          updated_at: string
        }
        Insert: {
          account_classification?: string | null
          account_number_masked?: string | null
          account_type?: string | null
          available_balance?: number | null
          currency?: string
          current_balance?: number
          daily_limit?: number | null
          iban?: string | null
          id?: string
          institution?: string | null
          last_reconciled_at?: string | null
          last_reconciled_balance?: number | null
          ledger_balance?: number | null
          metadata?: Json | null
          name: string
          pending_balance?: number | null
          routing_number?: string | null
          status?: string | null
          swift_code?: string | null
          transaction_limit?: number | null
          updated_at?: string
        }
        Update: {
          account_classification?: string | null
          account_number_masked?: string | null
          account_type?: string | null
          available_balance?: number | null
          currency?: string
          current_balance?: number
          daily_limit?: number | null
          iban?: string | null
          id?: string
          institution?: string | null
          last_reconciled_at?: string | null
          last_reconciled_balance?: number | null
          ledger_balance?: number | null
          metadata?: Json | null
          name?: string
          pending_balance?: number | null
          routing_number?: string | null
          status?: string | null
          swift_code?: string | null
          transaction_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      bank_statements: {
        Row: {
          available_balance: number | null
          bank_account_id: string | null
          closing_balance: number
          created_at: string | null
          file_format: string | null
          id: string
          metadata: Json | null
          opening_balance: number
          processed: boolean | null
          processed_at: string | null
          processed_by: string | null
          reconciled: boolean | null
          reconciliation_id: string | null
          statement_date: string
          statement_file_name: string | null
          statement_file_url: string | null
          statement_number: string
          statement_period_end: string
          statement_period_start: string
          total_deposits: number | null
          total_fees: number | null
          total_interest: number | null
          total_withdrawals: number | null
          transaction_count: number | null
          updated_at: string | null
        }
        Insert: {
          available_balance?: number | null
          bank_account_id?: string | null
          closing_balance: number
          created_at?: string | null
          file_format?: string | null
          id?: string
          metadata?: Json | null
          opening_balance: number
          processed?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          reconciled?: boolean | null
          reconciliation_id?: string | null
          statement_date: string
          statement_file_name?: string | null
          statement_file_url?: string | null
          statement_number: string
          statement_period_end: string
          statement_period_start: string
          total_deposits?: number | null
          total_fees?: number | null
          total_interest?: number | null
          total_withdrawals?: number | null
          transaction_count?: number | null
          updated_at?: string | null
        }
        Update: {
          available_balance?: number | null
          bank_account_id?: string | null
          closing_balance?: number
          created_at?: string | null
          file_format?: string | null
          id?: string
          metadata?: Json | null
          opening_balance?: number
          processed?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          reconciled?: boolean | null
          reconciliation_id?: string | null
          statement_date?: string
          statement_file_name?: string | null
          statement_file_url?: string | null
          statement_number?: string
          statement_period_end?: string
          statement_period_start?: string
          total_deposits?: number | null
          total_fees?: number | null
          total_interest?: number | null
          total_withdrawals?: number | null
          transaction_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bank_statements_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "banking_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      banking_reconciliations: {
        Row: {
          adjusted_balance: number | null
          bank_account_id: string | null
          bank_charges: number | null
          bank_credits: number | null
          created_at: string | null
          created_by: string
          difference: number | null
          discrepancy_explanation: string | null
          errors: number | null
          id: string
          ledger_ending_balance: number
          metadata: Json | null
          notes: string | null
          outstanding_deposits: number | null
          outstanding_withdrawals: number | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          reconciliation_number: string
          statement_end_date: string
          statement_ending_balance: number
          statement_start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          adjusted_balance?: number | null
          bank_account_id?: string | null
          bank_charges?: number | null
          bank_credits?: number | null
          created_at?: string | null
          created_by: string
          difference?: number | null
          discrepancy_explanation?: string | null
          errors?: number | null
          id?: string
          ledger_ending_balance: number
          metadata?: Json | null
          notes?: string | null
          outstanding_deposits?: number | null
          outstanding_withdrawals?: number | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          reconciliation_number: string
          statement_end_date: string
          statement_ending_balance: number
          statement_start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          adjusted_balance?: number | null
          bank_account_id?: string | null
          bank_charges?: number | null
          bank_credits?: number | null
          created_at?: string | null
          created_by?: string
          difference?: number | null
          discrepancy_explanation?: string | null
          errors?: number | null
          id?: string
          ledger_ending_balance?: number
          metadata?: Json | null
          notes?: string | null
          outstanding_deposits?: number | null
          outstanding_withdrawals?: number | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          reconciliation_number?: string
          statement_end_date?: string
          statement_ending_balance?: number
          statement_start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banking_reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banking_reconciliations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "banking_reconciliations_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      banking_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string | null
          check_number: string | null
          counterparty_account: string | null
          counterparty_bank: string | null
          counterparty_name: string | null
          created_at: string | null
          created_by: string
          currency: string | null
          description: string
          exchange_rate: number | null
          id: string
          metadata: Json | null
          posted_date: string | null
          reconciled: boolean | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_id: string | null
          reference_number: string | null
          requires_approval: boolean | null
          status: string
          transaction_category: string | null
          transaction_date: string
          transaction_number: string
          transaction_type: string
          updated_at: string | null
          value_date: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          check_number?: string | null
          counterparty_account?: string | null
          counterparty_bank?: string | null
          counterparty_name?: string | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          description: string
          exchange_rate?: number | null
          id?: string
          metadata?: Json | null
          posted_date?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_id?: string | null
          reference_number?: string | null
          requires_approval?: boolean | null
          status?: string
          transaction_category?: string | null
          transaction_date: string
          transaction_number: string
          transaction_type: string
          updated_at?: string | null
          value_date?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          check_number?: string | null
          counterparty_account?: string | null
          counterparty_bank?: string | null
          counterparty_name?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          description?: string
          exchange_rate?: number | null
          id?: string
          metadata?: Json | null
          posted_date?: string | null
          reconciled?: boolean | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_id?: string | null
          reference_number?: string | null
          requires_approval?: boolean | null
          status?: string
          transaction_category?: string | null
          transaction_date?: string
          transaction_number?: string
          transaction_type?: string
          updated_at?: string | null
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banking_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "banking_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banking_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "banking_transactions_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      batch_orders: {
        Row: {
          batch_id: string | null
          created_at: string | null
          delivery_eta: string | null
          id: string
          order_id: string | null
          pickup_eta: string | null
          sequence_number: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          delivery_eta?: string | null
          id?: string
          order_id?: string | null
          pickup_eta?: string | null
          sequence_number: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          delivery_eta?: string | null
          id?: string
          order_id?: string | null
          pickup_eta?: string | null
          sequence_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_orders_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batched_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      batched_deliveries: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          optimized_route: Json | null
          order_sequence: string[] | null
          status: string | null
          total_distance_meters: number | null
          total_duration_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          optimized_route?: Json | null
          order_sequence?: string[] | null
          status?: string | null
          total_distance_meters?: number | null
          total_duration_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          optimized_route?: Json | null
          order_sequence?: string[] | null
          status?: string | null
          total_distance_meters?: number | null
          total_duration_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batched_deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      board_documents: {
        Row: {
          company_id: string | null
          created_at: string | null
          html_template: string | null
          id: string
          pdf_url: string | null
          related_appointment_id: string | null
          resolution_number: string | null
          signers: Json | null
          signing_status: string | null
          template_id: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          html_template?: string | null
          id?: string
          pdf_url?: string | null
          related_appointment_id?: string | null
          resolution_number?: string | null
          signers?: Json | null
          signing_status?: string | null
          template_id?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          html_template?: string | null
          id?: string
          pdf_url?: string | null
          related_appointment_id?: string | null
          resolution_number?: string | null
          signers?: Json | null
          signing_status?: string | null
          template_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      board_meetings: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          meeting_url: string | null
          scheduled_at: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_url?: string | null
          scheduled_at: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_url?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      board_members: {
        Row: {
          appointment_date: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          role_title: string
          signature_tags: Json | null
          signing_completed: boolean | null
          signing_required: boolean | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          appointment_date?: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          role_title: string
          signature_tags?: Json | null
          signing_completed?: boolean | null
          signing_required?: boolean | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_date?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role_title?: string
          signature_tags?: Json | null
          signing_completed?: boolean | null
          signing_required?: boolean | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      board_resolution_votes: {
        Row: {
          board_member_id: string
          comment: string | null
          created_at: string
          id: string
          resolution_id: string
          vote: string
        }
        Insert: {
          board_member_id: string
          comment?: string | null
          created_at?: string
          id?: string
          resolution_id: string
          vote: string
        }
        Update: {
          board_member_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          resolution_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_resolution_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "governance_board_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      board_resolutions: {
        Row: {
          board_members: Json
          created_at: string | null
          created_by: string | null
          document_id: string | null
          effective_date: string
          employee_id: string | null
          executed_at: string | null
          executed_by: string | null
          id: string
          notes: string | null
          required_documents: Json
          resolution_number: string
          resolution_text: string
          resolution_title: string
          resolution_type: string
          status: string
          subject_person_email: string
          subject_person_name: string
          subject_position: string
          updated_at: string | null
          votes_abstain: number
          votes_against: number
          votes_for: number
        }
        Insert: {
          board_members?: Json
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          effective_date?: string
          employee_id?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          required_documents?: Json
          resolution_number: string
          resolution_text: string
          resolution_title: string
          resolution_type: string
          status?: string
          subject_person_email: string
          subject_person_name: string
          subject_position: string
          updated_at?: string | null
          votes_abstain?: number
          votes_against?: number
          votes_for?: number
        }
        Update: {
          board_members?: Json
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          effective_date?: string
          employee_id?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          required_documents?: Json
          resolution_number?: string
          resolution_text?: string
          resolution_title?: string
          resolution_type?: string
          status?: string
          subject_person_email?: string
          subject_person_name?: string
          subject_position?: string
          updated_at?: string | null
          votes_abstain?: number
          votes_against?: number
          votes_for?: number
        }
        Relationships: [
          {
            foreignKeyName: "board_resolutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "board_resolutions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_resolutions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_resolutions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "board_resolutions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated_amount: number
          approved_at: string | null
          approved_by: string | null
          budget_name: string
          budget_quarter: number | null
          budget_year: number
          category_id: string | null
          committed_amount: number | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          id: string
          notes: string | null
          remaining_amount: number | null
          spent_amount: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          allocated_amount: number
          approved_at?: string | null
          approved_by?: string | null
          budget_name: string
          budget_quarter?: number | null
          budget_year: number
          category_id?: string | null
          committed_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          notes?: string | null
          remaining_amount?: number | null
          spent_amount?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          allocated_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          budget_name?: string
          budget_quarter?: number | null
          budget_year?: number
          category_id?: string | null
          committed_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          notes?: string | null
          remaining_amount?: number | null
          spent_amount?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "budgets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      business_documents: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          document_type: string
          file_url: string
          id: string
          is_latest_version: boolean
          metadata: Json | null
          parent_document_id: string | null
          requires_signature: boolean
          signature_deadline: string | null
          signed_at: string | null
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_type: string
          file_url: string
          id?: string
          is_latest_version?: boolean
          metadata?: Json | null
          parent_document_id?: string | null
          requires_signature?: boolean
          signature_deadline?: string | null
          signed_at?: string | null
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_type?: string
          file_url?: string
          id?: string
          is_latest_version?: boolean
          metadata?: Json | null
          parent_document_id?: string | null
          requires_signature?: boolean
          signature_deadline?: string | null
          signed_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      cap_table_entries: {
        Row: {
          appointment_id: string | null
          certificate_id: string | null
          created_at: string | null
          holder_id: string
          id: string
          is_deferred: boolean | null
          shares_granted: number
          vesting_months: number | null
          vesting_start_date: string | null
        }
        Insert: {
          appointment_id?: string | null
          certificate_id?: string | null
          created_at?: string | null
          holder_id: string
          id?: string
          is_deferred?: boolean | null
          shares_granted: number
          vesting_months?: number | null
          vesting_start_date?: string | null
        }
        Update: {
          appointment_id?: string | null
          certificate_id?: string | null
          created_at?: string | null
          holder_id?: string
          id?: string
          is_deferred?: boolean | null
          shares_granted?: number
          vesting_months?: number | null
          vesting_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cap_table_entries_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cap_table_holdings: {
        Row: {
          created_at: string
          equity_source: string
          holder_email: string
          holder_name: string | null
          holder_user_id: string | null
          id: string
          issuance_id: string | null
          share_class: string | null
          shares_total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          equity_source: string
          holder_email: string
          holder_name?: string | null
          holder_user_id?: string | null
          id?: string
          issuance_id?: string | null
          share_class?: string | null
          shares_total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          equity_source?: string
          holder_email?: string
          holder_name?: string | null
          holder_user_id?: string | null
          id?: string
          issuance_id?: string | null
          share_class?: string | null
          shares_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cap_table_holdings_holder_user_id_fkey"
            columns: ["holder_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cap_table_holdings_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "equity_issuances"
            referencedColumns: ["id"]
          },
        ]
      }
      cap_tables: {
        Row: {
          as_of_date: string
          company_id: string | null
          created_at: string
          equity_pool: number
          founder_percentage: number
          founder_shares: number
          holding_company_percentage: number
          holding_company_shares: number
          id: string
          micro_equity_pool: number | null
          par_value: number
          pool_percentage: number
          total_authorized: number
          total_issued: number
          total_unissued: number
          updated_at: string
        }
        Insert: {
          as_of_date?: string
          company_id?: string | null
          created_at?: string
          equity_pool?: number
          founder_percentage?: number
          founder_shares?: number
          holding_company_percentage?: number
          holding_company_shares?: number
          id?: string
          micro_equity_pool?: number | null
          par_value?: number
          pool_percentage?: number
          total_authorized?: number
          total_issued?: number
          total_unissued?: number
          updated_at?: string
        }
        Update: {
          as_of_date?: string
          company_id?: string | null
          created_at?: string
          equity_pool?: number
          founder_percentage?: number
          founder_shares?: number
          holding_company_percentage?: number
          holding_company_shares?: number
          id?: string
          micro_equity_pool?: number | null
          par_value?: number
          pool_percentage?: number
          total_authorized?: number
          total_issued?: number
          total_unissued?: number
          updated_at?: string
        }
        Relationships: []
      }
      capital_stack: {
        Row: {
          amount: number
          created_at: string | null
          holders: string
          id: string
          investment_type: string
          percentage: number
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          holders: string
          id?: string
          investment_type: string
          percentage?: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          holders?: string
          id?: string
          investment_type?: string
          percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      cash_forecast_details: {
        Row: {
          actual_balance: number | null
          actual_inflow: number | null
          actual_outflow: number | null
          created_at: string | null
          forecast_id: string | null
          id: string
          metadata: Json | null
          period_date: string
          period_type: string | null
          projected_balance: number | null
          projected_inflow: number | null
          projected_outflow: number | null
          updated_at: string | null
          variance: number | null
        }
        Insert: {
          actual_balance?: number | null
          actual_inflow?: number | null
          actual_outflow?: number | null
          created_at?: string | null
          forecast_id?: string | null
          id?: string
          metadata?: Json | null
          period_date: string
          period_type?: string | null
          projected_balance?: number | null
          projected_inflow?: number | null
          projected_outflow?: number | null
          updated_at?: string | null
          variance?: number | null
        }
        Update: {
          actual_balance?: number | null
          actual_inflow?: number | null
          actual_outflow?: number | null
          created_at?: string | null
          forecast_id?: string | null
          id?: string
          metadata?: Json | null
          period_date?: string
          period_type?: string | null
          projected_balance?: number | null
          projected_inflow?: number | null
          projected_outflow?: number | null
          updated_at?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_forecast_details_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "cash_forecasts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_forecasts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assumptions: Json | null
          created_at: string | null
          created_by: string
          forecast_date: string
          forecast_end_date: string
          forecast_number: string
          forecast_start_date: string
          forecast_type: string
          id: string
          inflows_by_category: Json | null
          metadata: Json | null
          notes: string | null
          opening_cash_balance: number
          outflows_by_category: Json | null
          projected_ending_balance: number | null
          projected_inflows: number | null
          projected_net_flow: number | null
          projected_outflows: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assumptions?: Json | null
          created_at?: string | null
          created_by: string
          forecast_date: string
          forecast_end_date: string
          forecast_number: string
          forecast_start_date: string
          forecast_type: string
          id?: string
          inflows_by_category?: Json | null
          metadata?: Json | null
          notes?: string | null
          opening_cash_balance: number
          outflows_by_category?: Json | null
          projected_ending_balance?: number | null
          projected_inflows?: number | null
          projected_net_flow?: number | null
          projected_outflows?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assumptions?: Json | null
          created_at?: string | null
          created_by?: string
          forecast_date?: string
          forecast_end_date?: string
          forecast_number?: string
          forecast_start_date?: string
          forecast_type?: string
          id?: string
          inflows_by_category?: Json | null
          metadata?: Json | null
          notes?: string | null
          opening_cash_balance?: number
          outflows_by_category?: Json | null
          projected_ending_balance?: number | null
          projected_inflows?: number | null
          projected_net_flow?: number | null
          projected_outflows?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_forecasts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cash_forecasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ceo_access_credentials: {
        Row: {
          access_count: number | null
          biometric_credential_id: string | null
          biometric_public_key: string | null
          created_at: string | null
          id: string
          last_access_at: string | null
          pin_hash: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          access_count?: number | null
          biometric_credential_id?: string | null
          biometric_public_key?: string | null
          created_at?: string | null
          id?: string
          last_access_at?: string | null
          pin_hash?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          access_count?: number | null
          biometric_credential_id?: string | null
          biometric_public_key?: string | null
          created_at?: string | null
          id?: string
          last_access_at?: string | null
          pin_hash?: string | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      ceo_action_logs: {
        Row: {
          action_category: string
          action_description: string
          action_type: string
          created_at: string | null
          id: string
          severity: string | null
          target_name: string | null
          user_id: string | null
        }
        Insert: {
          action_category: string
          action_description: string
          action_type: string
          created_at?: string | null
          id?: string
          severity?: string | null
          target_name?: string | null
          user_id?: string | null
        }
        Update: {
          action_category?: string
          action_description?: string
          action_type?: string
          created_at?: string | null
          id?: string
          severity?: string | null
          target_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceo_action_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ceo_financial_approvals: {
        Row: {
          amount: number
          created_at: string | null
          department_id: string | null
          description: string
          id: string
          priority: string | null
          request_type: string
          requested_date: string
          requester_id: string | null
          requester_name: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          department_id?: string | null
          description: string
          id?: string
          priority?: string | null
          request_type: string
          requested_date?: string
          requester_id?: string | null
          requester_name: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          department_id?: string | null
          description?: string
          id?: string
          priority?: string | null
          request_type?: string
          requested_date?: string
          requester_id?: string | null
          requester_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceo_financial_approvals_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ceo_financial_approvals_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ceo_meetings: {
        Row: {
          agenda: Json | null
          attendees: Json | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          meeting_password: string | null
          meeting_type: string
          meeting_url: string | null
          notes: string | null
          organizer_id: string | null
          organizer_name: string | null
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agenda?: Json | null
          attendees?: Json | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_password?: string | null
          meeting_type: string
          meeting_url?: string | null
          notes?: string | null
          organizer_id?: string | null
          organizer_name?: string | null
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agenda?: Json | null
          attendees?: Json | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_password?: string | null
          meeting_type?: string
          meeting_url?: string | null
          notes?: string | null
          organizer_id?: string | null
          organizer_name?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceo_meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ceo_mindmaps: {
        Row: {
          created_at: string | null
          id: string
          map_data: Json
          map_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          map_data: Json
          map_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          map_data?: Json
          map_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ceo_objectives: {
        Row: {
          completed_date: string | null
          created_at: string | null
          current_value: number | null
          department_id: string | null
          description: string | null
          id: string
          milestones: Json | null
          objective_type: string
          owner_id: string | null
          owner_name: string | null
          priority: string | null
          progress_percentage: number | null
          start_date: string
          status: string | null
          target_date: string | null
          target_value: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          current_value?: number | null
          department_id?: string | null
          description?: string | null
          id?: string
          milestones?: Json | null
          objective_type: string
          owner_id?: string | null
          owner_name?: string | null
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string
          status?: string | null
          target_date?: string | null
          target_value?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          current_value?: number | null
          department_id?: string | null
          description?: string | null
          id?: string
          milestones?: Json | null
          objective_type?: string
          owner_id?: string | null
          owner_name?: string | null
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string
          status?: string | null
          target_date?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceo_objectives_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ceo_objectives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ceo_system_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_critical: boolean | null
          requires_confirmation: boolean | null
          setting_key: string
          setting_value: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean | null
          requires_confirmation?: boolean | null
          setting_key: string
          setting_value?: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean | null
          requires_confirmation?: boolean | null
          setting_key?: string
          setting_value?: Json
        }
        Relationships: []
      }
      cfo_acknowledgments: {
        Row: {
          agreed_checkbox: boolean
          created_at: string | null
          document_key: string
          id: string
          ip_address: string | null
          signed_at: string
          typed_full_name: string
          user_agent: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          agreed_checkbox?: boolean
          created_at?: string | null
          document_key: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          typed_full_name: string
          user_agent?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          agreed_checkbox?: boolean
          created_at?: string | null
          document_key?: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          typed_full_name?: string
          user_agent?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfo_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cfo_documents: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfo_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cfo_evaluation_events: {
        Row: {
          actor_user_id: string
          created_at: string
          details: Json
          evaluation_id: string
          event_type: string
          gate_id: string | null
          id: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          details?: Json
          evaluation_id: string
          event_type: string
          gate_id?: string | null
          id?: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          details?: Json
          evaluation_id?: string
          event_type?: string
          gate_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfo_evaluation_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cfo_evaluation_events_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "cfo_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfo_evaluation_events_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "cfo_evaluation_gates"
            referencedColumns: ["id"]
          },
        ]
      }
      cfo_evaluation_gates: {
        Row: {
          auto_fail_reason: string | null
          ceo_decided_at: string | null
          ceo_decision: string | null
          created_at: string
          due_date: string
          evaluation_id: string
          gate_code: Database["public"]["Enums"]["cfo_gate_code"]
          gate_order: number
          id: string
          status: Database["public"]["Enums"]["cfo_gate_status"]
        }
        Insert: {
          auto_fail_reason?: string | null
          ceo_decided_at?: string | null
          ceo_decision?: string | null
          created_at?: string
          due_date: string
          evaluation_id: string
          gate_code: Database["public"]["Enums"]["cfo_gate_code"]
          gate_order: number
          id?: string
          status?: Database["public"]["Enums"]["cfo_gate_status"]
        }
        Update: {
          auto_fail_reason?: string | null
          ceo_decided_at?: string | null
          ceo_decision?: string | null
          created_at?: string
          due_date?: string
          evaluation_id?: string
          gate_code?: Database["public"]["Enums"]["cfo_gate_code"]
          gate_order?: number
          id?: string
          status?: Database["public"]["Enums"]["cfo_gate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cfo_evaluation_gates_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "cfo_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      cfo_evaluation_submissions: {
        Row: {
          gate_id: string
          id: string
          payload: Json
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          gate_id: string
          id?: string
          payload?: Json
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          gate_id?: string
          id?: string
          payload?: Json
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfo_evaluation_submissions_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "cfo_evaluation_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfo_evaluation_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cfo_evaluations: {
        Row: {
          ceo_user_id: string
          cfo_user_id: string
          completed_at: string | null
          created_at: string
          evaluation_end_date: string
          evaluation_start_date: string
          fail_count: number
          id: string
          is_test: boolean
          outcome: string | null
          status: Database["public"]["Enums"]["cfo_eval_status"]
        }
        Insert: {
          ceo_user_id: string
          cfo_user_id: string
          completed_at?: string | null
          created_at?: string
          evaluation_end_date: string
          evaluation_start_date: string
          fail_count?: number
          id?: string
          is_test?: boolean
          outcome?: string | null
          status?: Database["public"]["Enums"]["cfo_eval_status"]
        }
        Update: {
          ceo_user_id?: string
          cfo_user_id?: string
          completed_at?: string | null
          created_at?: string
          evaluation_end_date?: string
          evaluation_start_date?: string
          fail_count?: number
          id?: string
          is_test?: boolean
          outcome?: string | null
          status?: Database["public"]["Enums"]["cfo_eval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cfo_evaluations_ceo_user_id_fkey"
            columns: ["ceo_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cfo_evaluations_cfo_user_id_fkey"
            columns: ["cfo_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_account: boolean | null
          normal_balance: string
          parent_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_account?: boolean | null
          normal_balance: string
          parent_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_account?: boolean | null
          normal_balance?: string
          parent_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          admin_id: string | null
          created_at: string
          customer_id: string | null
          driver_id: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          priority: string
          status: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          customer_id?: string | null
          driver_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          priority?: string
          status?: string
          subject?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          customer_id?: string | null
          driver_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          priority?: string
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_conversations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          metadata: Json | null
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_quick_responses: {
        Row: {
          auto_message: string
          button_icon: string | null
          button_text: string
          category: string
          created_at: string | null
          follow_up_options: Json | null
          id: string
          is_active: boolean | null
          priority: number | null
        }
        Insert: {
          auto_message: string
          button_icon?: string | null
          button_text: string
          category: string
          created_at?: string | null
          follow_up_options?: Json | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
        }
        Update: {
          auto_message?: string
          button_icon?: string | null
          button_text?: string
          category?: string
          created_at?: string | null
          follow_up_options?: Json | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
        }
        Relationships: []
      }
      code_access_logs: {
        Row: {
          action: string
          created_at: string | null
          developer_id: string
          file_path: string | null
          id: string
          ip_address: string | null
          repository: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          developer_id: string
          file_path?: string | null
          id?: string
          ip_address?: string | null
          repository: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          developer_id?: string
          file_path?: string | null
          id?: string
          ip_address?: string | null
          repository?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_access_logs_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      code_change_requests: {
        Row: {
          branch_name: string
          commit_message: string | null
          created_at: string | null
          developer_id: string
          file_path: string
          github_pr_number: number | null
          github_pr_url: string | null
          id: string
          merged_at: string | null
          new_content: string
          old_content: string | null
          repository: string
          request_number: string
          review_notes: string | null
          reviewer_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          branch_name: string
          commit_message?: string | null
          created_at?: string | null
          developer_id: string
          file_path: string
          github_pr_number?: number | null
          github_pr_url?: string | null
          id?: string
          merged_at?: string | null
          new_content: string
          old_content?: string | null
          repository: string
          request_number: string
          review_notes?: string | null
          reviewer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_name?: string
          commit_message?: string | null
          created_at?: string | null
          developer_id?: string
          file_path?: string
          github_pr_number?: number | null
          github_pr_url?: string | null
          id?: string
          merged_at?: string | null
          new_content?: string
          old_content?: string | null
          repository?: string
          request_number?: string
          review_notes?: string | null
          reviewer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_change_requests_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "code_change_requests_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      commission_settings: {
        Row: {
          created_at: string
          customer_service_fee_percent: number
          delivery_fee_base_cents: number
          delivery_fee_per_mile_cents: number
          id: string
          is_active: boolean
          peak_hour_multiplier: number
          restaurant_commission_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          customer_service_fee_percent?: number
          delivery_fee_base_cents?: number
          delivery_fee_per_mile_cents?: number
          id?: string
          is_active?: boolean
          peak_hour_multiplier?: number
          restaurant_commission_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          customer_service_fee_percent?: number
          delivery_fee_base_cents?: number
          delivery_fee_per_mile_cents?: number
          id?: string
          is_active?: boolean
          peak_hour_multiplier?: number
          restaurant_commission_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      commission_settings_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          id: string
          settings_snapshot: Json
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          settings_snapshot: Json
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          settings_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "commission_settings_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          commission_percent: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          max_monthly_volume: number | null
          min_monthly_volume: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          commission_percent: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_monthly_volume?: number | null
          min_monthly_volume?: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_monthly_volume?: number | null
          min_monthly_volume?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      compensation_config: {
        Row: {
          base_percentage: number
          bonus_per_delivery: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          minimum_per_delivery: number
          peak_hour_multiplier: number | null
          surge_multiplier: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          base_percentage?: number
          bonus_per_delivery?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_per_delivery?: number
          peak_hour_multiplier?: number | null
          surge_multiplier?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          base_percentage?: number
          bonus_per_delivery?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_per_delivery?: number
          peak_hour_multiplier?: number | null
          surge_multiplier?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compensation_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "compensation_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      compliance_records: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          expiry_date: string | null
          id: string
          issued_by: string | null
          notes: string | null
          record_type: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          expiry_date?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          record_type: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          expiry_date?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          record_type?: string
          status?: string | null
        }
        Relationships: []
      }
      compliance_tracking: {
        Row: {
          applicability: string
          audit_frequency_days: number | null
          compliance_notes: string | null
          compliance_status: string | null
          created_at: string | null
          id: string
          jurisdiction: string
          last_audit_date: string | null
          metadata: Json | null
          mitigation_plan: string | null
          next_audit_date: string | null
          regulation_name: string
          regulation_type: string
          responsible_department_id: string | null
          responsible_person_id: string | null
          risk_level: string | null
          updated_at: string | null
        }
        Insert: {
          applicability: string
          audit_frequency_days?: number | null
          compliance_notes?: string | null
          compliance_status?: string | null
          created_at?: string | null
          id?: string
          jurisdiction: string
          last_audit_date?: string | null
          metadata?: Json | null
          mitigation_plan?: string | null
          next_audit_date?: string | null
          regulation_name: string
          regulation_type: string
          responsible_department_id?: string | null
          responsible_person_id?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Update: {
          applicability?: string
          audit_frequency_days?: number | null
          compliance_notes?: string | null
          compliance_status?: string | null
          created_at?: string | null
          id?: string
          jurisdiction?: string
          last_audit_date?: string | null
          metadata?: Json | null
          mitigation_plan?: string | null
          next_audit_date?: string | null
          regulation_name?: string
          regulation_type?: string
          responsible_department_id?: string | null
          responsible_person_id?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_tracking_responsible_department_id_fkey"
            columns: ["responsible_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_tracking_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contribution_orders: {
        Row: {
          amount_cents: number
          contributor_email: string
          contributor_name: string | null
          created_at: string
          equity_percentage: number
          id: string
          invite_id: string
          paid_at: string | null
          payment_status: string
          shares_promised: number
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tier_name: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          contributor_email: string
          contributor_name?: string | null
          created_at?: string
          equity_percentage: number
          id?: string
          invite_id: string
          paid_at?: string | null
          payment_status?: string
          shares_promised: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_name: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          contributor_email?: string
          contributor_name?: string | null
          created_at?: string
          equity_percentage?: number
          id?: string
          invite_id?: string
          paid_at?: string | null
          payment_status?: string
          shares_promised?: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_orders_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "foundational_invite_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_orders_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_officers: {
        Row: {
          appointed_date: string
          created_at: string | null
          executive_id: string
          id: string
          position: string
          resolution_id: string | null
          status: string
          term_end: string | null
          term_start: string
          updated_at: string | null
        }
        Insert: {
          appointed_date?: string
          created_at?: string | null
          executive_id: string
          id?: string
          position: string
          resolution_id?: string | null
          status?: string
          term_end?: string | null
          term_start: string
          updated_at?: string | null
        }
        Update: {
          appointed_date?: string
          created_at?: string | null
          executive_id?: string
          id?: string
          position?: string
          resolution_id?: string | null
          status?: string
          term_end?: string | null
          term_start?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_officers_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      cravemore_payment_sessions: {
        Row: {
          amount_cents: number
          base_price_cents: number
          completed_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          payment_provider: string | null
          payment_provider_transaction_id: string | null
          plan_id: string | null
          plan_key: string
          processing_fee_cents: number
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          base_price_cents: number
          completed_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          payment_provider?: string | null
          payment_provider_transaction_id?: string | null
          plan_id?: string | null
          plan_key: string
          processing_fee_cents?: number
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          base_price_cents?: number
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          payment_provider?: string | null
          payment_provider_transaction_id?: string | null
          plan_id?: string | null
          plan_key?: string
          processing_fee_cents?: number
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cravemore_payment_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cravemore_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cravemore_payment_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cravemore_plans: {
        Row: {
          badge_text: string | null
          billing_period: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_most_popular: boolean | null
          lifetime_cap_total: number | null
          lifetime_cap_used: number | null
          plan_key: string
          price_cents: number
          promo_price_cents: number | null
          updated_at: string | null
        }
        Insert: {
          badge_text?: string | null
          billing_period: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_most_popular?: boolean | null
          lifetime_cap_total?: number | null
          lifetime_cap_used?: number | null
          plan_key: string
          price_cents: number
          promo_price_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          badge_text?: string | null
          billing_period?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_most_popular?: boolean | null
          lifetime_cap_total?: number | null
          lifetime_cap_used?: number | null
          plan_key?: string
          price_cents?: number
          promo_price_cents?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cravemore_promos: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          is_active: boolean | null
          promo_key: string
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          is_active?: boolean | null
          promo_key: string
          starts_at: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean | null
          promo_key?: string
          starts_at?: string
        }
        Relationships: []
      }
      craver_applications: {
        Row: {
          account_number_encrypted: string | null
          account_number_last_four: string | null
          background_check: boolean | null
          background_check_approved_at: string | null
          background_check_auto_approved: boolean | null
          background_check_consent: boolean | null
          background_check_consent_date: string | null
          background_check_estimated_completion: string | null
          background_check_initiated_at: string | null
          background_check_report_id: string | null
          bank_account_type: string | null
          business_name: string | null
          cash_tag: string | null
          city: string
          consent_ip_address: string | null
          consent_user_agent: string | null
          contract_signed_at: string | null
          created_at: string | null
          date_of_birth: string | null
          drivers_license: string | null
          drivers_license_back: string | null
          drivers_license_front: string | null
          email: string
          fcra_accepted: boolean | null
          fcra_accepted_at: string | null
          first_name: string
          i9_document: string | null
          id: string
          insurance_document: string | null
          insurance_policy: string | null
          insurance_provider: string | null
          last_name: string
          license_expiry: string | null
          license_number: string | null
          license_plate: string | null
          license_state: string | null
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          onboarding_step: string | null
          payout_method: string | null
          phone: string
          points: number | null
          priority_score: number | null
          privacy_accepted: boolean | null
          privacy_accepted_at: string | null
          profile_photo: string | null
          referred_by: string | null
          region_id: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          routing_number: string | null
          signature_image_url: string | null
          ssn_encrypted: string | null
          ssn_last_four: string | null
          state: string
          status: string | null
          street_address: string | null
          tax_classification: string | null
          tos_accepted: boolean | null
          tos_accepted_at: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_color: string | null
          vehicle_inspection: boolean | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_photo_back: string | null
          vehicle_photo_front: string | null
          vehicle_photo_left: string | null
          vehicle_photo_right: string | null
          vehicle_registration: string | null
          vehicle_type: string | null
          vehicle_year: number | null
          w9_document: string | null
          waitlist_joined_at: string | null
          waitlist_notes: string | null
          waitlist_position: number | null
          waitlist_priority_score: number | null
          welcome_screen_shown: boolean | null
          zip_code: string
        }
        Insert: {
          account_number_encrypted?: string | null
          account_number_last_four?: string | null
          background_check?: boolean | null
          background_check_approved_at?: string | null
          background_check_auto_approved?: boolean | null
          background_check_consent?: boolean | null
          background_check_consent_date?: string | null
          background_check_estimated_completion?: string | null
          background_check_initiated_at?: string | null
          background_check_report_id?: string | null
          bank_account_type?: string | null
          business_name?: string | null
          cash_tag?: string | null
          city: string
          consent_ip_address?: string | null
          consent_user_agent?: string | null
          contract_signed_at?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          drivers_license?: string | null
          drivers_license_back?: string | null
          drivers_license_front?: string | null
          email: string
          fcra_accepted?: boolean | null
          fcra_accepted_at?: string | null
          first_name: string
          i9_document?: string | null
          id?: string
          insurance_document?: string | null
          insurance_policy?: string | null
          insurance_provider?: string | null
          last_name: string
          license_expiry?: string | null
          license_number?: string | null
          license_plate?: string | null
          license_state?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: string | null
          payout_method?: string | null
          phone: string
          points?: number | null
          priority_score?: number | null
          privacy_accepted?: boolean | null
          privacy_accepted_at?: string | null
          profile_photo?: string | null
          referred_by?: string | null
          region_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          routing_number?: string | null
          signature_image_url?: string | null
          ssn_encrypted?: string | null
          ssn_last_four?: string | null
          state: string
          status?: string | null
          street_address?: string | null
          tax_classification?: string | null
          tos_accepted?: boolean | null
          tos_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_inspection?: boolean | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_back?: string | null
          vehicle_photo_front?: string | null
          vehicle_photo_left?: string | null
          vehicle_photo_right?: string | null
          vehicle_registration?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
          w9_document?: string | null
          waitlist_joined_at?: string | null
          waitlist_notes?: string | null
          waitlist_position?: number | null
          waitlist_priority_score?: number | null
          welcome_screen_shown?: boolean | null
          zip_code: string
        }
        Update: {
          account_number_encrypted?: string | null
          account_number_last_four?: string | null
          background_check?: boolean | null
          background_check_approved_at?: string | null
          background_check_auto_approved?: boolean | null
          background_check_consent?: boolean | null
          background_check_consent_date?: string | null
          background_check_estimated_completion?: string | null
          background_check_initiated_at?: string | null
          background_check_report_id?: string | null
          bank_account_type?: string | null
          business_name?: string | null
          cash_tag?: string | null
          city?: string
          consent_ip_address?: string | null
          consent_user_agent?: string | null
          contract_signed_at?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          drivers_license?: string | null
          drivers_license_back?: string | null
          drivers_license_front?: string | null
          email?: string
          fcra_accepted?: boolean | null
          fcra_accepted_at?: string | null
          first_name?: string
          i9_document?: string | null
          id?: string
          insurance_document?: string | null
          insurance_policy?: string | null
          insurance_provider?: string | null
          last_name?: string
          license_expiry?: string | null
          license_number?: string | null
          license_plate?: string | null
          license_state?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: string | null
          payout_method?: string | null
          phone?: string
          points?: number | null
          priority_score?: number | null
          privacy_accepted?: boolean | null
          privacy_accepted_at?: string | null
          profile_photo?: string | null
          referred_by?: string | null
          region_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          routing_number?: string | null
          signature_image_url?: string | null
          ssn_encrypted?: string | null
          ssn_last_four?: string | null
          state?: string
          status?: string | null
          street_address?: string | null
          tax_classification?: string | null
          tos_accepted?: boolean | null
          tos_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_inspection?: boolean | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_back?: string | null
          vehicle_photo_front?: string | null
          vehicle_photo_left?: string | null
          vehicle_photo_right?: string | null
          vehicle_registration?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
          w9_document?: string | null
          waitlist_joined_at?: string | null
          waitlist_notes?: string | null
          waitlist_position?: number | null
          waitlist_priority_score?: number | null
          welcome_screen_shown?: boolean | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "craver_applications_background_check_report_id_fkey"
            columns: ["background_check_report_id"]
            isOneToOne: false
            referencedRelation: "background_check_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craver_applications_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "craver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craver_applications_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "unified_driver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craver_applications_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craver_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "craver_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      craver_locations: {
        Row: {
          created_at: string
          id: string
          lat: number
          lng: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat: number
          lng: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "craver_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      craving_wheel_progress: {
        Row: {
          acceptance_rate: number | null
          created_at: string | null
          current_points: number | null
          current_streak: number | null
          date: string
          deliveries_completed: number | null
          id: string
          max_points: number | null
          speed_violations: number | null
          total_tips: number | null
          updated_at: string | null
          user_id: string
          wheels_filled: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          created_at?: string | null
          current_points?: number | null
          current_streak?: number | null
          date?: string
          deliveries_completed?: number | null
          id?: string
          max_points?: number | null
          speed_violations?: number | null
          total_tips?: number | null
          updated_at?: string | null
          user_id: string
          wheels_filled?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          created_at?: string | null
          current_points?: number | null
          current_streak?: number | null
          date?: string
          deliveries_completed?: number | null
          id?: string
          max_points?: number | null
          speed_violations?: number | null
          total_tips?: number | null
          updated_at?: string | null
          user_id?: string
          wheels_filled?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "craving_wheel_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_acknowledgments: {
        Row: {
          agreed_checkbox: boolean
          created_at: string | null
          document_key: string
          id: string
          ip_address: string | null
          signed_at: string
          typed_full_name: string
          user_agent: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          agreed_checkbox?: boolean
          created_at?: string | null
          document_key: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          typed_full_name: string
          user_agent?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          agreed_checkbox?: boolean
          created_at?: string | null
          document_key?: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          typed_full_name?: string
          user_agent?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_architecture_changes: {
        Row: {
          change_type: string
          created_at: string | null
          deployed_at: string | null
          description: string | null
          id: string
          impact_level: string | null
          proposed_by: string | null
          rollback_notes: string | null
          rolled_back_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          change_type: string
          created_at?: string | null
          deployed_at?: string | null
          description?: string | null
          id?: string
          impact_level?: string | null
          proposed_by?: string | null
          rollback_notes?: string | null
          rolled_back_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string | null
          deployed_at?: string | null
          description?: string | null
          id?: string
          impact_level?: string | null
          proposed_by?: string | null
          rollback_notes?: string | null
          rolled_back_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_architecture_changes_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_code_reviews: {
        Row: {
          author_id: string | null
          created_at: string | null
          id: string
          lines_changed: number | null
          pr_number: string
          pr_title: string
          pr_url: string | null
          quality_score: number | null
          repository: string
          review_notes: string | null
          reviewer_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          lines_changed?: number | null
          pr_number: string
          pr_title: string
          pr_url?: string | null
          quality_score?: number | null
          repository: string
          review_notes?: string | null
          reviewer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          id?: string
          lines_changed?: number | null
          pr_number?: string
          pr_title?: string
          pr_url?: string | null
          quality_score?: number | null
          repository?: string
          review_notes?: string | null
          reviewer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_code_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "cto_developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_code_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "cto_developers"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_daily_checklist: {
        Row: {
          checklist_date: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          priority: string | null
          task_category: string
          task_description: string | null
          task_name: string
          updated_at: string | null
        }
        Insert: {
          checklist_date?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          task_category: string
          task_description?: string | null
          task_name: string
          updated_at?: string | null
        }
        Update: {
          checklist_date?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          task_category?: string
          task_description?: string | null
          task_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cto_daily_reports: {
        Row: {
          blockers: string[] | null
          completed_tasks: string[] | null
          created_at: string | null
          created_by: string | null
          deployment_notes: string[] | null
          engineering_risks: string[] | null
          id: string
          meeting_summaries: string[] | null
          next_day_priorities: string[] | null
          report_date: string
          security_findings: string[] | null
          sprint_status: string | null
          submitted: boolean | null
          submitted_at: string | null
          updated_at: string | null
          uptime_log: string | null
        }
        Insert: {
          blockers?: string[] | null
          completed_tasks?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deployment_notes?: string[] | null
          engineering_risks?: string[] | null
          id?: string
          meeting_summaries?: string[] | null
          next_day_priorities?: string[] | null
          report_date: string
          security_findings?: string[] | null
          sprint_status?: string | null
          submitted?: boolean | null
          submitted_at?: string | null
          updated_at?: string | null
          uptime_log?: string | null
        }
        Update: {
          blockers?: string[] | null
          completed_tasks?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deployment_notes?: string[] | null
          engineering_risks?: string[] | null
          id?: string
          meeting_summaries?: string[] | null
          next_day_priorities?: string[] | null
          report_date?: string
          security_findings?: string[] | null
          sprint_status?: string | null
          submitted?: boolean | null
          submitted_at?: string | null
          updated_at?: string | null
          uptime_log?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_daily_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_developers: {
        Row: {
          availability_status: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          role: string
          skills: Json | null
          team: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          availability_status?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          role: string
          skills?: Json | null
          team?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          availability_status?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          role?: string
          skills?: Json | null
          team?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_developers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_documents: {
        Row: {
          content: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_evaluation_events: {
        Row: {
          actor_user_id: string
          created_at: string
          details: Json
          evaluation_id: string
          event_type: string
          gate_id: string | null
          id: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          details?: Json
          evaluation_id: string
          event_type: string
          gate_id?: string | null
          id?: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          details?: Json
          evaluation_id?: string
          event_type?: string
          gate_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cto_evaluation_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cto_evaluation_events_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "cto_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_evaluation_events_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "cto_evaluation_gates"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_evaluation_gates: {
        Row: {
          auto_fail_reason: string | null
          ceo_decided_at: string | null
          ceo_decision: string | null
          created_at: string
          due_date: string
          evaluation_id: string
          gate_code: Database["public"]["Enums"]["cto_gate_code"]
          gate_order: number
          id: string
          status: Database["public"]["Enums"]["cto_gate_status"]
        }
        Insert: {
          auto_fail_reason?: string | null
          ceo_decided_at?: string | null
          ceo_decision?: string | null
          created_at?: string
          due_date: string
          evaluation_id: string
          gate_code: Database["public"]["Enums"]["cto_gate_code"]
          gate_order: number
          id?: string
          status?: Database["public"]["Enums"]["cto_gate_status"]
        }
        Update: {
          auto_fail_reason?: string | null
          ceo_decided_at?: string | null
          ceo_decision?: string | null
          created_at?: string
          due_date?: string
          evaluation_id?: string
          gate_code?: Database["public"]["Enums"]["cto_gate_code"]
          gate_order?: number
          id?: string
          status?: Database["public"]["Enums"]["cto_gate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cto_evaluation_gates_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "cto_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_evaluation_submissions: {
        Row: {
          gate_id: string
          id: string
          payload: Json
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          gate_id: string
          id?: string
          payload?: Json
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          gate_id?: string
          id?: string
          payload?: Json
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cto_evaluation_submissions_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "cto_evaluation_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_evaluation_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_evaluations: {
        Row: {
          auto_generated_demote: boolean
          auto_generated_terminate: boolean
          ceo_user_id: string
          completed_at: string | null
          created_at: string
          cto_user_id: string
          evaluation_end_date: string
          evaluation_start_date: string
          fail_count: number
          id: string
          is_test: boolean
          outcome: string | null
          status: Database["public"]["Enums"]["cto_eval_status"]
        }
        Insert: {
          auto_generated_demote?: boolean
          auto_generated_terminate?: boolean
          ceo_user_id: string
          completed_at?: string | null
          created_at?: string
          cto_user_id: string
          evaluation_end_date: string
          evaluation_start_date: string
          fail_count?: number
          id?: string
          is_test?: boolean
          outcome?: string | null
          status?: Database["public"]["Enums"]["cto_eval_status"]
        }
        Update: {
          auto_generated_demote?: boolean
          auto_generated_terminate?: boolean
          ceo_user_id?: string
          completed_at?: string | null
          created_at?: string
          cto_user_id?: string
          evaluation_end_date?: string
          evaluation_start_date?: string
          fail_count?: number
          id?: string
          is_test?: boolean
          outcome?: string | null
          status?: Database["public"]["Enums"]["cto_eval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cto_evaluations_ceo_user_id_fkey"
            columns: ["ceo_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cto_evaluations_cto_user_id_fkey"
            columns: ["cto_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_github_sync_log: {
        Row: {
          data_synced: Json | null
          error_message: string | null
          github_id: number | null
          github_url: string | null
          id: string
          initiative_id: string | null
          sync_status: string | null
          sync_type: string
          synced_at: string | null
        }
        Insert: {
          data_synced?: Json | null
          error_message?: string | null
          github_id?: number | null
          github_url?: string | null
          id?: string
          initiative_id?: string | null
          sync_status?: string | null
          sync_type: string
          synced_at?: string | null
        }
        Update: {
          data_synced?: Json | null
          error_message?: string | null
          github_id?: number | null
          github_url?: string | null
          id?: string
          initiative_id?: string | null
          sync_status?: string | null
          sync_type?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_github_sync_log_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "cto_roadmap_initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          severity: string
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cto_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_performance_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          developer_id: string | null
          id: string
          message: string
          severity: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          developer_id?: string | null
          id?: string
          message: string
          severity: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          developer_id?: string | null
          id?: string
          message?: string
          severity?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_performance_alerts_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_performance_thresholds: {
        Row: {
          applies_to_role: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          threshold_type: string
          threshold_value: number
          updated_at: string | null
        }
        Insert: {
          applies_to_role?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          threshold_type: string
          threshold_value: number
          updated_at?: string | null
        }
        Update: {
          applies_to_role?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          threshold_type?: string
          threshold_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      cto_redistribution_suggestions: {
        Row: {
          created_at: string | null
          id: string
          impact_score: number | null
          overloaded_developer_id: string | null
          reason: string
          status: string | null
          suggested_reassign_to: string | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          impact_score?: number | null
          overloaded_developer_id?: string | null
          reason: string
          status?: string | null
          suggested_reassign_to?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          impact_score?: number | null
          overloaded_developer_id?: string | null
          reason?: string
          status?: string | null
          suggested_reassign_to?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_redistribution_suggestions_overloaded_developer_id_fkey"
            columns: ["overloaded_developer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cto_redistribution_suggestions_suggested_reassign_to_fkey"
            columns: ["suggested_reassign_to"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_roadmap_dependencies: {
        Row: {
          auto_block_enabled: boolean | null
          blocked_at: string | null
          created_at: string | null
          dependency_type: string | null
          dependent_initiative_id: string
          depends_on_initiative_id: string
          id: string
          is_blocking: boolean | null
          required_milestone: string | null
          unblocked_at: string | null
          updated_at: string | null
        }
        Insert: {
          auto_block_enabled?: boolean | null
          blocked_at?: string | null
          created_at?: string | null
          dependency_type?: string | null
          dependent_initiative_id: string
          depends_on_initiative_id: string
          id?: string
          is_blocking?: boolean | null
          required_milestone?: string | null
          unblocked_at?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_block_enabled?: boolean | null
          blocked_at?: string | null
          created_at?: string | null
          dependency_type?: string | null
          dependent_initiative_id?: string
          depends_on_initiative_id?: string
          id?: string
          is_blocking?: boolean | null
          required_milestone?: string | null
          unblocked_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_roadmap_dependencies_dependent_initiative_id_fkey"
            columns: ["dependent_initiative_id"]
            isOneToOne: false
            referencedRelation: "cto_roadmap_initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_roadmap_dependencies_depends_on_initiative_id_fkey"
            columns: ["depends_on_initiative_id"]
            isOneToOne: false
            referencedRelation: "cto_roadmap_initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_roadmap_initiatives: {
        Row: {
          actual_end_date: string | null
          completed_milestones: number | null
          created_at: string | null
          days_behind_schedule: number | null
          description: string | null
          escalation_sent: boolean | null
          escalation_sent_at: string | null
          github_deployments_count: number | null
          github_issues_count: number | null
          github_milestone_id: number | null
          github_milestone_url: string | null
          github_prs_count: number | null
          health_score: string | null
          id: string
          last_github_sync_at: string | null
          last_progress_update: string | null
          metadata: Json | null
          owner_id: string | null
          priority: string | null
          progress_percentage: number | null
          quarter: string
          slip_detected_at: string | null
          start_date: string | null
          status: string | null
          tags: string[] | null
          target_end_date: string
          title: string
          total_milestones: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          actual_end_date?: string | null
          completed_milestones?: number | null
          created_at?: string | null
          days_behind_schedule?: number | null
          description?: string | null
          escalation_sent?: boolean | null
          escalation_sent_at?: string | null
          github_deployments_count?: number | null
          github_issues_count?: number | null
          github_milestone_id?: number | null
          github_milestone_url?: string | null
          github_prs_count?: number | null
          health_score?: string | null
          id?: string
          last_github_sync_at?: string | null
          last_progress_update?: string | null
          metadata?: Json | null
          owner_id?: string | null
          priority?: string | null
          progress_percentage?: number | null
          quarter: string
          slip_detected_at?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          target_end_date: string
          title: string
          total_milestones?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          actual_end_date?: string | null
          completed_milestones?: number | null
          created_at?: string | null
          days_behind_schedule?: number | null
          description?: string | null
          escalation_sent?: boolean | null
          escalation_sent_at?: string | null
          github_deployments_count?: number | null
          github_issues_count?: number | null
          github_milestone_id?: number | null
          github_milestone_url?: string | null
          github_prs_count?: number | null
          health_score?: string | null
          id?: string
          last_github_sync_at?: string | null
          last_progress_update?: string | null
          metadata?: Json | null
          owner_id?: string | null
          priority?: string | null
          progress_percentage?: number | null
          quarter?: string
          slip_detected_at?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          target_end_date?: string
          title?: string
          total_milestones?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cto_roadmap_initiatives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_roadmap_milestones: {
        Row: {
          completed_date: string | null
          created_at: string | null
          description: string | null
          github_issue_id: number | null
          github_issue_url: string | null
          id: string
          initiative_id: string
          order_index: number | null
          status: string | null
          target_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          github_issue_id?: number | null
          github_issue_url?: string | null
          id?: string
          initiative_id: string
          order_index?: number | null
          status?: string | null
          target_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          description?: string | null
          github_issue_id?: number | null
          github_issue_url?: string | null
          id?: string
          initiative_id?: string
          order_index?: number | null
          status?: string | null
          target_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_roadmap_milestones_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "cto_roadmap_initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_roadmap_slip_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_message: string
          created_at: string | null
          days_behind: number
          escalation_sent: boolean | null
          escalation_sent_at: string | null
          id: string
          initiative_id: string
          resolved: boolean | null
          resolved_at: string | null
          severity: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message: string
          created_at?: string | null
          days_behind: number
          escalation_sent?: boolean | null
          escalation_sent_at?: string | null
          id?: string
          initiative_id: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message?: string
          created_at?: string | null
          days_behind?: number
          escalation_sent?: boolean | null
          escalation_sent_at?: string | null
          id?: string
          initiative_id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_roadmap_slip_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cto_roadmap_slip_alerts_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "cto_roadmap_initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_sprint_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          sprint_id: string | null
          status: string | null
          story_points: number | null
          ticket_number: string
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          sprint_id?: string | null
          status?: string | null
          story_points?: number | null
          ticket_number: string
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          sprint_id?: string | null
          status?: string | null
          story_points?: number | null
          ticket_number?: string
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cto_sprint_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "cto_developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_sprint_tickets_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "cto_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_sprints: {
        Row: {
          created_at: string | null
          end_date: string
          goal: string | null
          id: string
          sprint_name: string
          sprint_number: number | null
          start_date: string
          status: string | null
          team: string | null
          updated_at: string | null
          velocity: number | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          goal?: string | null
          id?: string
          sprint_name: string
          sprint_number?: number | null
          start_date: string
          status?: string | null
          team?: string | null
          updated_at?: string | null
          velocity?: number | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          goal?: string | null
          id?: string
          sprint_name?: string
          sprint_number?: number | null
          start_date?: string
          status?: string | null
          team?: string | null
          updated_at?: string | null
          velocity?: number | null
        }
        Relationships: []
      }
      cto_training_audit: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          lesson_id: string | null
          metadata: Json | null
          module_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          module_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          module_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cto_training_audit_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "cto_training_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_training_audit_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "cto_training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_training_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_training_lessons: {
        Row: {
          associated_route: string | null
          content_markdown: string
          created_at: string | null
          estimated_minutes: number
          id: string
          module_id: string
          order_index: number
          subtitle: string | null
          title: string
        }
        Insert: {
          associated_route?: string | null
          content_markdown: string
          created_at?: string | null
          estimated_minutes?: number
          id?: string
          module_id: string
          order_index?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          associated_route?: string | null
          content_markdown?: string
          created_at?: string | null
          estimated_minutes?: number
          id?: string
          module_id?: string
          order_index?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cto_training_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "cto_training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_training_modules: {
        Row: {
          associated_route: string | null
          created_at: string | null
          description: string
          estimated_minutes: number
          id: string
          key: string
          order_index: number
          title: string
        }
        Insert: {
          associated_route?: string | null
          created_at?: string | null
          description: string
          estimated_minutes?: number
          id?: string
          key: string
          order_index?: number
          title: string
        }
        Update: {
          associated_route?: string | null
          created_at?: string | null
          description?: string
          estimated_minutes?: number
          id?: string
          key?: string
          order_index?: number
          title?: string
        }
        Relationships: []
      }
      cto_training_progress: {
        Row: {
          completed_at: string | null
          completed_steps: Json | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          lesson_id: string | null
          module_id: string | null
          quiz_score: number | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          module_id?: string | null
          quiz_score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          module_id?: string | null
          quiz_score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cto_training_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "cto_training_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "cto_training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_training_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cto_training_quizzes: {
        Row: {
          correct_answer: Json | null
          created_at: string | null
          id: string
          lesson_id: string
          options: Json | null
          order_index: number
          question: string
          question_type: string
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string | null
          id?: string
          lesson_id: string
          options?: Json | null
          order_index?: number
          question: string
          question_type: string
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          options?: Json | null
          order_index?: number
          question?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cto_training_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "cto_training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_training_steps: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_required: boolean | null
          lesson_id: string
          order_index: number
          related_ui_key: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          is_required?: boolean | null
          lesson_id: string
          order_index?: number
          related_ui_key?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_required?: boolean | null
          lesson_id?: string
          order_index?: number
          related_ui_key?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cto_training_steps_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "cto_training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      cto_workforce_predictions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          predicted_bottlenecks: Json | null
          predicted_capacity: number | null
          predicted_velocity: number | null
          prediction_date: string
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          predicted_bottlenecks?: Json | null
          predicted_capacity?: number | null
          predicted_velocity?: number | null
          prediction_date: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          predicted_bottlenecks?: Json | null
          predicted_capacity?: number | null
          predicted_velocity?: number | null
          prediction_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_acquisition: {
        Row: {
          acquisition_channel: string
          acquisition_cost: number | null
          acquisition_date: string | null
          acquisition_source: string | null
          attribution_model: string | null
          campaign_id: string | null
          customer_id: string | null
          first_order_id: string | null
          id: string
          lifetime_value: number | null
          metadata: Json | null
        }
        Insert: {
          acquisition_channel: string
          acquisition_cost?: number | null
          acquisition_date?: string | null
          acquisition_source?: string | null
          attribution_model?: string | null
          campaign_id?: string | null
          customer_id?: string | null
          first_order_id?: string | null
          id?: string
          lifetime_value?: number | null
          metadata?: Json | null
        }
        Update: {
          acquisition_channel?: string
          acquisition_cost?: number | null
          acquisition_date?: string | null
          acquisition_source?: string | null
          attribution_model?: string | null
          campaign_id?: string | null
          customer_id?: string | null
          first_order_id?: string | null
          id?: string
          lifetime_value?: number | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_acquisition_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "customer_acquisition_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_acquisition_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customer_carts: {
        Row: {
          created_at: string
          customer_id: string
          delivery_address: Json | null
          id: string
          items: Json
          restaurant_id: string
          special_instructions: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_address?: Json | null
          id?: string
          items?: Json
          restaurant_id: string
          special_instructions?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_address?: Json | null
          id?: string
          items?: Json
          restaurant_id?: string
          special_instructions?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "customer_favorites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee_cents: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_method: string
          estimated_delivery_time: string | null
          estimated_pickup_time: string | null
          id: string
          order_items: Json
          order_status: string
          payment_provider: string | null
          payment_status: string
          restaurant_id: string
          special_instructions: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee_cents?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method: string
          estimated_delivery_time?: string | null
          estimated_pickup_time?: string | null
          id?: string
          order_items: Json
          order_status?: string
          payment_provider?: string | null
          payment_status?: string
          restaurant_id: string
          special_instructions?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee_cents?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: string
          estimated_delivery_time?: string | null
          estimated_pickup_time?: string | null
          id?: string
          order_items?: Json
          order_status?: string
          payment_provider?: string | null
          payment_status?: string
          restaurant_id?: string
          special_instructions?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "customer_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string
          delivery_speed: number | null
          food_quality: number | null
          id: string
          is_flagged: boolean | null
          order_accuracy: number | null
          order_id: string
          rating: number
          responded_at: string | null
          response: string | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id: string
          delivery_speed?: number | null
          food_quality?: number | null
          id?: string
          is_flagged?: boolean | null
          order_accuracy?: number | null
          order_id: string
          rating: number
          responded_at?: string | null
          response?: string | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          delivery_speed?: number | null
          food_quality?: number | null
          id?: string
          is_flagged?: boolean | null
          order_accuracy?: number | null
          order_id?: string
          rating?: number
          responded_at?: string | null
          response?: string | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
          {
            foreignKeyName: "customer_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "customer_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      cxo_acknowledgments: {
        Row: {
          agreed_checkbox: boolean
          created_at: string | null
          document_key: string
          id: string
          ip_address: string | null
          signed_at: string
          typed_full_name: string
          user_agent: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          agreed_checkbox?: boolean
          created_at?: string | null
          document_key: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          typed_full_name: string
          user_agent?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          agreed_checkbox?: boolean
          created_at?: string | null
          document_key?: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          typed_full_name?: string
          user_agent?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cxo_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cxo_reports: {
        Row: {
          author_id: string | null
          biggest_issue: string | null
          created_at: string | null
          fix_deployed: string | null
          id: string
          metrics_moved: string | null
          recommendation_for_tomorrow: string | null
          report_date: string
          ticket_backlog_status: string | null
          type: string
        }
        Insert: {
          author_id?: string | null
          biggest_issue?: string | null
          created_at?: string | null
          fix_deployed?: string | null
          id?: string
          metrics_moved?: string | null
          recommendation_for_tomorrow?: string | null
          report_date: string
          ticket_backlog_status?: string | null
          type: string
        }
        Update: {
          author_id?: string | null
          biggest_issue?: string | null
          created_at?: string | null
          fix_deployed?: string | null
          id?: string
          metrics_moved?: string | null
          recommendation_for_tomorrow?: string | null
          report_date?: string
          ticket_backlog_status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_reports_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cxo_training_audit: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          lesson_id: string | null
          metadata: Json | null
          module_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          module_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          lesson_id?: string | null
          metadata?: Json | null
          module_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_training_audit_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "cxo_training_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cxo_training_audit_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "cxo_training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cxo_training_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cxo_training_lessons: {
        Row: {
          associated_route: string | null
          content_markdown: string
          created_at: string | null
          estimated_minutes: number
          id: string
          module_id: string
          order_index: number
          subtitle: string | null
          title: string
        }
        Insert: {
          associated_route?: string | null
          content_markdown: string
          created_at?: string | null
          estimated_minutes?: number
          id?: string
          module_id: string
          order_index?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          associated_route?: string | null
          content_markdown?: string
          created_at?: string | null
          estimated_minutes?: number
          id?: string
          module_id?: string
          order_index?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_training_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "cxo_training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      cxo_training_modules: {
        Row: {
          associated_route: string | null
          created_at: string | null
          description: string
          estimated_minutes: number
          id: string
          key: string
          order_index: number
          title: string
        }
        Insert: {
          associated_route?: string | null
          created_at?: string | null
          description: string
          estimated_minutes?: number
          id?: string
          key: string
          order_index?: number
          title: string
        }
        Update: {
          associated_route?: string | null
          created_at?: string | null
          description?: string
          estimated_minutes?: number
          id?: string
          key?: string
          order_index?: number
          title?: string
        }
        Relationships: []
      }
      cxo_training_progress: {
        Row: {
          completed_at: string | null
          completed_steps: Json | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          lesson_id: string | null
          module_id: string | null
          quiz_score: number | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          module_id?: string | null
          quiz_score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          lesson_id?: string | null
          module_id?: string | null
          quiz_score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_training_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "cxo_training_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cxo_training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "cxo_training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cxo_training_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cxo_training_quizzes: {
        Row: {
          correct_answer: Json | null
          created_at: string | null
          id: string
          lesson_id: string
          options: Json | null
          order_index: number
          question: string
          question_type: string
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string | null
          id?: string
          lesson_id: string
          options?: Json | null
          order_index?: number
          question: string
          question_type: string
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          options?: Json | null
          order_index?: number
          question?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_training_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "cxo_training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      cxo_training_steps: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_required: boolean | null
          lesson_id: string
          order_index: number
          related_ui_key: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          is_required?: boolean | null
          lesson_id: string
          order_index?: number
          related_ui_key?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_required?: boolean | null
          lesson_id?: string
          order_index?: number
          related_ui_key?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_training_steps_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "cxo_training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_payout_batches: {
        Row: {
          created_at: string | null
          id: string
          payout_date: string
          processed_at: string | null
          status: string
          total_amount: number
          total_drivers: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          payout_date: string
          processed_at?: string | null
          status?: string
          total_amount?: number
          total_drivers?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          payout_date?: string
          processed_at?: string | null
          status?: string
          total_amount?: number
          total_drivers?: number
        }
        Relationships: []
      }
      daily_performance: {
        Row: {
          acceptance_rate: number | null
          average_points: number | null
          created_at: string | null
          date: string
          deliveries: number | null
          earnings: number | null
          id: string
          speed_violations: number | null
          user_id: string
          wheels_filled: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          average_points?: number | null
          created_at?: string | null
          date: string
          deliveries?: number | null
          earnings?: number | null
          id?: string
          speed_violations?: number | null
          user_id: string
          wheels_filled?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          average_points?: number | null
          created_at?: string | null
          date?: string
          deliveries?: number | null
          earnings?: number | null
          id?: string
          speed_violations?: number | null
          user_id?: string
          wheels_filled?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_performance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      debt_instruments: {
        Row: {
          created_at: string | null
          id: string
          instrument_type: string
          interest_rate: number
          maturity_date: string
          principal: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instrument_type: string
          interest_rate?: number
          maturity_date: string
          principal?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instrument_type?: string
          interest_rate?: number
          maturity_date?: string
          principal?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_addresses: {
        Row: {
          apt_suite: string | null
          city: string
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string | null
          state: string
          street_address: string
          user_id: string | null
          zip_code: string
        }
        Insert: {
          apt_suite?: string | null
          city: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          state: string
          street_address: string
          user_id?: string | null
          zip_code: string
        }
        Update: {
          apt_suite?: string | null
          city?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          state?: string
          street_address?: string
          user_id?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          active: boolean
          city: string
          created_at: string
          created_by: string | null
          geom: unknown
          id: string
          name: string | null
          state: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          active?: boolean
          city: string
          created_at?: string
          created_by?: string | null
          geom: unknown
          id?: string
          name?: string | null
          state: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          active?: boolean
          city?: string
          created_at?: string
          created_by?: string | null
          geom?: unknown
          id?: string
          name?: string | null
          state?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      departments: {
        Row: {
          budget: number | null
          created_at: string | null
          description: string | null
          head_employee_id: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          description?: string | null
          head_employee_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          description?: string | null
          head_employee_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      developer_onboarding: {
        Row: {
          assigned_mentor_id: string | null
          completed_at: string | null
          created_at: string | null
          dev_environment_setup: boolean | null
          developer_id: string
          documentation_reviewed: boolean | null
          first_code_review_completed: boolean | null
          github_access_granted: boolean | null
          id: string
          onboarding_notes: string | null
          onboarding_status: string | null
          started_at: string | null
          supabase_access_granted: boolean | null
          updated_at: string | null
        }
        Insert: {
          assigned_mentor_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          dev_environment_setup?: boolean | null
          developer_id: string
          documentation_reviewed?: boolean | null
          first_code_review_completed?: boolean | null
          github_access_granted?: boolean | null
          id?: string
          onboarding_notes?: string | null
          onboarding_status?: string | null
          started_at?: string | null
          supabase_access_granted?: boolean | null
          updated_at?: string | null
        }
        Update: {
          assigned_mentor_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          dev_environment_setup?: boolean | null
          developer_id?: string
          documentation_reviewed?: boolean | null
          first_code_review_completed?: boolean | null
          github_access_granted?: boolean | null
          id?: string
          onboarding_notes?: string | null
          onboarding_status?: string | null
          started_at?: string | null
          supabase_access_granted?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developer_onboarding_assigned_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "developer_onboarding_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      developer_permissions: {
        Row: {
          can_deploy: boolean | null
          can_merge: boolean | null
          can_read: boolean | null
          can_write: boolean | null
          developer_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          repository: string
          revoked_at: string | null
        }
        Insert: {
          can_deploy?: boolean | null
          can_merge?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          developer_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          repository: string
          revoked_at?: string | null
        }
        Update: {
          can_deploy?: boolean | null
          can_merge?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          developer_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          repository?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developer_permissions_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "developer_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devops_builds: {
        Row: {
          artifact_storage_url: string | null
          artifacts: Json | null
          branch: string
          build_number: string
          commit_author: string | null
          commit_hash: string
          commit_message: string | null
          commit_url: string | null
          completed_at: string | null
          created_at: string | null
          duration: number | null
          id: string
          logs_summary: string | null
          logs_url: string | null
          metadata: Json | null
          pipeline_id: string | null
          quality_gate_details: Json | null
          quality_gate_status: string | null
          queued_at: string | null
          stage: string | null
          started_at: string | null
          status: string
          test_coverage: number | null
          tests_failed: number | null
          tests_passed: number | null
          tests_skipped: number | null
          tests_total: number | null
          trigger_reason: string | null
          triggered_by: string | null
          triggered_by_type: string | null
          updated_at: string | null
        }
        Insert: {
          artifact_storage_url?: string | null
          artifacts?: Json | null
          branch: string
          build_number: string
          commit_author?: string | null
          commit_hash: string
          commit_message?: string | null
          commit_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          logs_summary?: string | null
          logs_url?: string | null
          metadata?: Json | null
          pipeline_id?: string | null
          quality_gate_details?: Json | null
          quality_gate_status?: string | null
          queued_at?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string
          test_coverage?: number | null
          tests_failed?: number | null
          tests_passed?: number | null
          tests_skipped?: number | null
          tests_total?: number | null
          trigger_reason?: string | null
          triggered_by?: string | null
          triggered_by_type?: string | null
          updated_at?: string | null
        }
        Update: {
          artifact_storage_url?: string | null
          artifacts?: Json | null
          branch?: string
          build_number?: string
          commit_author?: string | null
          commit_hash?: string
          commit_message?: string | null
          commit_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          logs_summary?: string | null
          logs_url?: string | null
          metadata?: Json | null
          pipeline_id?: string | null
          quality_gate_details?: Json | null
          quality_gate_status?: string | null
          queued_at?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string
          test_coverage?: number | null
          tests_failed?: number | null
          tests_passed?: number | null
          tests_skipped?: number | null
          tests_total?: number | null
          trigger_reason?: string | null
          triggered_by?: string | null
          triggered_by_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devops_builds_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "devops_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_builds_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devops_environments: {
        Row: {
          access_restricted: boolean | null
          allowed_teams: string[] | null
          allowed_users: string[] | null
          cluster_name: string | null
          config_vars: Json | null
          created_at: string | null
          created_by: string
          current_build_id: string | null
          current_release_id: string | null
          deployed_at: string | null
          description: string | null
          display_name: string
          environment_name: string
          environment_type: string
          health_status: string | null
          id: string
          infrastructure_provider: string | null
          last_health_check: string | null
          logs_url: string | null
          metadata: Json | null
          metrics_url: string | null
          monitoring_url: string | null
          namespace: string | null
          region: string | null
          secrets_managed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          access_restricted?: boolean | null
          allowed_teams?: string[] | null
          allowed_users?: string[] | null
          cluster_name?: string | null
          config_vars?: Json | null
          created_at?: string | null
          created_by: string
          current_build_id?: string | null
          current_release_id?: string | null
          deployed_at?: string | null
          description?: string | null
          display_name: string
          environment_name: string
          environment_type: string
          health_status?: string | null
          id?: string
          infrastructure_provider?: string | null
          last_health_check?: string | null
          logs_url?: string | null
          metadata?: Json | null
          metrics_url?: string | null
          monitoring_url?: string | null
          namespace?: string | null
          region?: string | null
          secrets_managed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          access_restricted?: boolean | null
          allowed_teams?: string[] | null
          allowed_users?: string[] | null
          cluster_name?: string | null
          config_vars?: Json | null
          created_at?: string | null
          created_by?: string
          current_build_id?: string | null
          current_release_id?: string | null
          deployed_at?: string | null
          description?: string | null
          display_name?: string
          environment_name?: string
          environment_type?: string
          health_status?: string | null
          id?: string
          infrastructure_provider?: string | null
          last_health_check?: string | null
          logs_url?: string | null
          metadata?: Json | null
          metrics_url?: string | null
          monitoring_url?: string | null
          namespace?: string | null
          region?: string | null
          secrets_managed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devops_environments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "devops_environments_current_build_id_fkey"
            columns: ["current_build_id"]
            isOneToOne: false
            referencedRelation: "devops_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_environments_current_release_id_fkey"
            columns: ["current_release_id"]
            isOneToOne: false
            referencedRelation: "devops_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      devops_notifications: {
        Row: {
          build_id: string | null
          channels: string[] | null
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          pipeline_id: string | null
          release_id: string | null
          sent_at: string | null
          sent_to: Json | null
          severity: string | null
          status: string
          title: string
        }
        Insert: {
          build_id?: string | null
          channels?: string[] | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          pipeline_id?: string | null
          release_id?: string | null
          sent_at?: string | null
          sent_to?: Json | null
          severity?: string | null
          status?: string
          title: string
        }
        Update: {
          build_id?: string | null
          channels?: string[] | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          pipeline_id?: string | null
          release_id?: string | null
          sent_at?: string | null
          sent_to?: Json | null
          severity?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "devops_notifications_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "devops_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_notifications_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "devops_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_notifications_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "devops_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      devops_performance_metrics: {
        Row: {
          baseline_value: number | null
          build_id: string | null
          created_at: string | null
          endpoint: string | null
          environment_id: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_unit: string
          metric_value: number
          pipeline_id: string | null
          recorded_at: string | null
          service_name: string | null
          stage: string | null
          threshold_exceeded: boolean | null
          threshold_value: number | null
        }
        Insert: {
          baseline_value?: number | null
          build_id?: string | null
          created_at?: string | null
          endpoint?: string | null
          environment_id?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_unit: string
          metric_value: number
          pipeline_id?: string | null
          recorded_at?: string | null
          service_name?: string | null
          stage?: string | null
          threshold_exceeded?: boolean | null
          threshold_value?: number | null
        }
        Update: {
          baseline_value?: number | null
          build_id?: string | null
          created_at?: string | null
          endpoint?: string | null
          environment_id?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_unit?: string
          metric_value?: number
          pipeline_id?: string | null
          recorded_at?: string | null
          service_name?: string | null
          stage?: string | null
          threshold_exceeded?: boolean | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "devops_performance_metrics_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "devops_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_performance_metrics_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "devops_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_performance_metrics_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "devops_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      devops_pipelines: {
        Row: {
          avg_duration: number | null
          branch: string
          created_at: string | null
          created_by: string
          description: string | null
          failed_runs: number | null
          id: string
          last_run_at: string | null
          last_run_duration: number | null
          last_run_status: string | null
          metadata: Json | null
          notification_config: Json | null
          pipeline_key: string
          pipeline_name: string
          pipeline_yaml: string | null
          repository_url: string
          stages: Json | null
          status: string
          steps: Json | null
          successful_runs: number | null
          tags: string[] | null
          total_runs: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          avg_duration?: number | null
          branch?: string
          created_at?: string | null
          created_by: string
          description?: string | null
          failed_runs?: number | null
          id?: string
          last_run_at?: string | null
          last_run_duration?: number | null
          last_run_status?: string | null
          metadata?: Json | null
          notification_config?: Json | null
          pipeline_key: string
          pipeline_name: string
          pipeline_yaml?: string | null
          repository_url: string
          stages?: Json | null
          status?: string
          steps?: Json | null
          successful_runs?: number | null
          tags?: string[] | null
          total_runs?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Update: {
          avg_duration?: number | null
          branch?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          failed_runs?: number | null
          id?: string
          last_run_at?: string | null
          last_run_duration?: number | null
          last_run_status?: string | null
          metadata?: Json | null
          notification_config?: Json | null
          pipeline_key?: string
          pipeline_name?: string
          pipeline_yaml?: string | null
          repository_url?: string
          stages?: Json | null
          status?: string
          steps?: Json | null
          successful_runs?: number | null
          tags?: string[] | null
          total_runs?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devops_pipelines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devops_releases: {
        Row: {
          approval_required: boolean | null
          approved_at: string | null
          approved_by: string | null
          build_id: string | null
          changelog: Json | null
          created_at: string | null
          created_by: string
          deployed_at: string | null
          deployment_strategy: string | null
          description: string | null
          id: string
          metadata: Json | null
          pipeline_id: string | null
          release_name: string | null
          release_notes: string | null
          release_number: string
          release_type: string
          rollback_initiated_by: string | null
          rollback_reason: string | null
          rolled_back_at: string | null
          scheduled_at: string | null
          status: string
          tags: string[] | null
          target_environment: string
          updated_at: string | null
        }
        Insert: {
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          build_id?: string | null
          changelog?: Json | null
          created_at?: string | null
          created_by: string
          deployed_at?: string | null
          deployment_strategy?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          pipeline_id?: string | null
          release_name?: string | null
          release_notes?: string | null
          release_number: string
          release_type: string
          rollback_initiated_by?: string | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          scheduled_at?: string | null
          status?: string
          tags?: string[] | null
          target_environment: string
          updated_at?: string | null
        }
        Update: {
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          build_id?: string | null
          changelog?: Json | null
          created_at?: string | null
          created_by?: string
          deployed_at?: string | null
          deployment_strategy?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          pipeline_id?: string | null
          release_name?: string | null
          release_notes?: string | null
          release_number?: string
          release_type?: string
          rollback_initiated_by?: string | null
          rollback_reason?: string | null
          rolled_back_at?: string | null
          scheduled_at?: string | null
          status?: string
          tags?: string[] | null
          target_environment?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devops_releases_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "devops_releases_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "devops_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_releases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "devops_releases_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "devops_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_releases_rollback_initiated_by_fkey"
            columns: ["rollback_initiated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devops_security_scans: {
        Row: {
          action_required: boolean | null
          blocking: boolean | null
          build_id: string | null
          completed_at: string | null
          compliance_details: Json | null
          compliance_status: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          pipeline_id: string | null
          scan_config: Json | null
          scan_number: string
          scan_results: Json | null
          scan_type: string
          scanner_tool: string
          started_at: string | null
          status: string
          total_vulnerabilities: number | null
          vulnerabilities_critical: number | null
          vulnerabilities_high: number | null
          vulnerabilities_info: number | null
          vulnerabilities_low: number | null
          vulnerabilities_medium: number | null
        }
        Insert: {
          action_required?: boolean | null
          blocking?: boolean | null
          build_id?: string | null
          completed_at?: string | null
          compliance_details?: Json | null
          compliance_status?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          pipeline_id?: string | null
          scan_config?: Json | null
          scan_number: string
          scan_results?: Json | null
          scan_type: string
          scanner_tool: string
          started_at?: string | null
          status?: string
          total_vulnerabilities?: number | null
          vulnerabilities_critical?: number | null
          vulnerabilities_high?: number | null
          vulnerabilities_info?: number | null
          vulnerabilities_low?: number | null
          vulnerabilities_medium?: number | null
        }
        Update: {
          action_required?: boolean | null
          blocking?: boolean | null
          build_id?: string | null
          completed_at?: string | null
          compliance_details?: Json | null
          compliance_status?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          pipeline_id?: string | null
          scan_config?: Json | null
          scan_number?: string
          scan_results?: Json | null
          scan_type?: string
          scanner_tool?: string
          started_at?: string | null
          status?: string
          total_vulnerabilities?: number | null
          vulnerabilities_critical?: number | null
          vulnerabilities_high?: number | null
          vulnerabilities_info?: number | null
          vulnerabilities_low?: number | null
          vulnerabilities_medium?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "devops_security_scans_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "devops_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_security_scans_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "devops_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      devops_test_runs: {
        Row: {
          avg_response_time: number | null
          build_id: string | null
          completed_at: string | null
          coverage_percentage: number | null
          coverage_report_url: string | null
          created_at: string | null
          duration: number | null
          failed_tests: number | null
          failures: Json | null
          id: string
          metadata: Json | null
          p95_response_time: number | null
          p99_response_time: number | null
          passed_tests: number | null
          pipeline_id: string | null
          skipped_tests: number | null
          started_at: string | null
          status: string
          test_results: Json | null
          test_run_number: string
          test_suite_name: string
          test_type: string
          total_tests: number | null
        }
        Insert: {
          avg_response_time?: number | null
          build_id?: string | null
          completed_at?: string | null
          coverage_percentage?: number | null
          coverage_report_url?: string | null
          created_at?: string | null
          duration?: number | null
          failed_tests?: number | null
          failures?: Json | null
          id?: string
          metadata?: Json | null
          p95_response_time?: number | null
          p99_response_time?: number | null
          passed_tests?: number | null
          pipeline_id?: string | null
          skipped_tests?: number | null
          started_at?: string | null
          status?: string
          test_results?: Json | null
          test_run_number: string
          test_suite_name: string
          test_type: string
          total_tests?: number | null
        }
        Update: {
          avg_response_time?: number | null
          build_id?: string | null
          completed_at?: string | null
          coverage_percentage?: number | null
          coverage_report_url?: string | null
          created_at?: string | null
          duration?: number | null
          failed_tests?: number | null
          failures?: Json | null
          id?: string
          metadata?: Json | null
          p95_response_time?: number | null
          p99_response_time?: number | null
          passed_tests?: number | null
          pipeline_id?: string | null
          skipped_tests?: number | null
          started_at?: string | null
          status?: string
          test_results?: Json | null
          test_run_number?: string
          test_suite_name?: string
          test_type?: string
          total_tests?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "devops_test_runs_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "devops_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devops_test_runs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "devops_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      diamond_points_history: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          order_id: string | null
          points: number
          source: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          order_id?: string | null
          points: number
          source: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          order_id?: string | null
          points?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "diamond_points_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "diamond_points_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diamond_points_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diamond_points_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          created_at: string | null
          dispute_id: string
          id: string
          message: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string | null
          dispute_id: string
          id?: string
          message: string
          sender_id: string
          sender_type: string
        }
        Update: {
          created_at?: string | null
          dispute_id?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string | null
          description: string
          dispute_type: string
          evidence: Json | null
          id: string
          order_id: string | null
          priority: string | null
          reported_by: string
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          dispute_type: string
          evidence?: Json | null
          id?: string
          order_id?: string | null
          priority?: string | null
          reported_by: string
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          dispute_type?: string
          evidence?: Json | null
          id?: string
          order_id?: string | null
          priority?: string | null
          reported_by?: string
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_signers: {
        Row: {
          created_at: string
          document_id: string
          id: string
          ip_address: string | null
          signature_data_url: string | null
          signature_svg: string | null
          signature_token: string | null
          signature_token_expires_at: string | null
          signed_at: string | null
          signer_email: string
          signer_name: string
          signer_role: string | null
          signer_type: string
          signing_order: number | null
          status: string
          typed_name: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          ip_address?: string | null
          signature_data_url?: string | null
          signature_svg?: string | null
          signature_token?: string | null
          signature_token_expires_at?: string | null
          signed_at?: string | null
          signer_email: string
          signer_name: string
          signer_role?: string | null
          signer_type: string
          signing_order?: number | null
          status?: string
          typed_name?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          ip_address?: string | null
          signature_data_url?: string | null
          signature_svg?: string | null
          signature_token?: string | null
          signature_token_expires_at?: string | null
          signed_at?: string | null
          signer_email?: string
          signer_name?: string
          signer_role?: string | null
          signer_type?: string
          signing_order?: number | null
          status?: string
          typed_name?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_template_signature_fields: {
        Row: {
          created_at: string | null
          field_type: string
          height_percent: number
          id: string
          label: string | null
          page_number: number
          required: boolean
          signer_role: string
          template_id: string
          updated_at: string | null
          width_percent: number
          x_percent: number
          y_percent: number
        }
        Insert: {
          created_at?: string | null
          field_type: string
          height_percent: number
          id?: string
          label?: string | null
          page_number: number
          required?: boolean
          signer_role: string
          template_id: string
          updated_at?: string | null
          width_percent: number
          x_percent: number
          y_percent: number
        }
        Update: {
          created_at?: string | null
          field_type?: string
          height_percent?: number
          id?: string
          label?: string | null
          page_number?: number
          required?: boolean
          signer_role?: string
          template_id?: string
          updated_at?: string | null
          width_percent?: number
          x_percent?: number
          y_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_template_signature_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          placeholders: Json
          template_key: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          placeholders?: Json
          template_key: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          placeholders?: Json
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_versions: {
        Row: {
          changes_description: string | null
          created_at: string
          created_by: string | null
          document_id: string
          file_url: string
          id: string
          metadata: Json | null
          version_number: number
        }
        Insert: {
          changes_description?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          file_url: string
          id?: string
          metadata?: Json | null
          version_number: number
        }
        Update: {
          changes_description?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_url?: string
          id?: string
          metadata?: Json | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_background_checks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          driver_id: string
          external_check_id: string | null
          id: string
          initiated_at: string | null
          notes: string | null
          provider: string | null
          result_data: Json | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          driver_id: string
          external_check_id?: string | null
          id?: string
          initiated_at?: string | null
          notes?: string | null
          provider?: string | null
          result_data?: Json | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          driver_id?: string
          external_check_id?: string | null
          id?: string
          initiated_at?: string | null
          notes?: string | null
          provider?: string | null
          result_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_background_checks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_cards: {
        Row: {
          card_number: string | null
          created_at: string
          cvv: string | null
          driver_id: string
          expiry_date: string
          id: string
          issuing_card_id: string
          status: string
          updated_at: string
        }
        Insert: {
          card_number?: string | null
          created_at?: string
          cvv?: string | null
          driver_id: string
          expiry_date?: string
          id?: string
          issuing_card_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          card_number?: string | null
          created_at?: string
          cvv?: string | null
          driver_id?: string
          expiry_date?: string
          id?: string
          issuing_card_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_cards_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_consents: {
        Row: {
          created_at: string | null
          driver_id: string
          fcra_authorization_accepted: boolean | null
          fcra_authorization_accepted_at: string | null
          id: string
          ip_address: string | null
          privacy_policy_accepted: boolean | null
          privacy_policy_accepted_at: string | null
          terms_of_service_accepted: boolean | null
          terms_of_service_accepted_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          fcra_authorization_accepted?: boolean | null
          fcra_authorization_accepted_at?: string | null
          id?: string
          ip_address?: string | null
          privacy_policy_accepted?: boolean | null
          privacy_policy_accepted_at?: string | null
          terms_of_service_accepted?: boolean | null
          terms_of_service_accepted_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          fcra_authorization_accepted?: boolean | null
          fcra_authorization_accepted_at?: string | null
          id?: string
          ip_address?: string | null
          privacy_policy_accepted?: boolean | null
          privacy_policy_accepted_at?: string | null
          terms_of_service_accepted?: boolean | null
          terms_of_service_accepted_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_consents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_earnings: {
        Row: {
          amount_cents: number
          driver_id: string | null
          earned_at: string | null
          id: string
          order_id: string | null
          payout_cents: number
          tip_cents: number | null
          total_cents: number
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          driver_id?: string | null
          earned_at?: string | null
          id?: string
          order_id?: string | null
          payout_cents: number
          tip_cents?: number | null
          total_cents: number
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          driver_id?: string | null
          earned_at?: string | null
          id?: string
          order_id?: string | null
          payout_cents?: number
          tip_cents?: number | null
          total_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      driver_gas_money: {
        Row: {
          balance: number
          created_at: string
          driver_id: string
          id: string
          last_earned_at: string | null
          total_accumulated: number
          total_transferred: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          driver_id: string
          id?: string
          last_earned_at?: string | null
          total_accumulated?: number
          total_transferred?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          driver_id?: string
          id?: string
          last_earned_at?: string | null
          total_accumulated?: number
          total_transferred?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_gas_money_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_identity: {
        Row: {
          created_at: string | null
          date_of_birth_encrypted: string
          dl_number_encrypted: string
          dl_state: string
          driver_id: string
          id: string
          ssn_encrypted: string
        }
        Insert: {
          created_at?: string | null
          date_of_birth_encrypted: string
          dl_number_encrypted: string
          dl_state: string
          driver_id: string
          id?: string
          ssn_encrypted: string
        }
        Update: {
          created_at?: string | null
          date_of_birth_encrypted?: string
          dl_number_encrypted?: string
          dl_state?: string
          driver_id?: string
          id?: string
          ssn_encrypted?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_identity_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_location_history: {
        Row: {
          accuracy: number | null
          created_at: string
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          timestamp: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          timestamp?: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          lat: number
          lng: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          lat: number
          lng: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          lat?: number
          lng?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_onboarding_progress: {
        Row: {
          application_id: string | null
          created_at: string | null
          current_step: string
          first_delivery_bonus_eligible: boolean | null
          id: string
          onboarding_completed_at: string | null
          orientation_video_watched: boolean | null
          payment_method_added: boolean | null
          profile_creation_completed: boolean | null
          safety_quiz_passed: boolean | null
          updated_at: string | null
          user_id: string
          w9_completed: boolean | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          current_step?: string
          first_delivery_bonus_eligible?: boolean | null
          id?: string
          onboarding_completed_at?: string | null
          orientation_video_watched?: boolean | null
          payment_method_added?: boolean | null
          profile_creation_completed?: boolean | null
          safety_quiz_passed?: boolean | null
          updated_at?: string | null
          user_id: string
          w9_completed?: boolean | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          current_step?: string
          first_delivery_bonus_eligible?: boolean | null
          id?: string
          onboarding_completed_at?: string | null
          orientation_video_watched?: boolean | null
          payment_method_added?: boolean | null
          profile_creation_completed?: boolean | null
          safety_quiz_passed?: boolean | null
          updated_at?: string | null
          user_id?: string
          w9_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_onboarding_progress_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "craver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_onboarding_progress_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "unified_driver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_payment_methods: {
        Row: {
          account_identifier: string
          created_at: string | null
          driver_id: string
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          payment_type: string
          updated_at: string | null
        }
        Insert: {
          account_identifier: string
          created_at?: string | null
          driver_id: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          payment_type: string
          updated_at?: string | null
        }
        Update: {
          account_identifier?: string
          created_at?: string | null
          driver_id?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          payment_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_payment_methods_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_payout_settings: {
        Row: {
          created_at: string
          driver_base_pay_cents: number
          driver_delivery_fee_share_bps: number
          id: string
          is_active: boolean
          merchant_commission_bps: number
          percentage: number
          tips_pass_through: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          driver_base_pay_cents?: number
          driver_delivery_fee_share_bps?: number
          id?: string
          is_active?: boolean
          merchant_commission_bps?: number
          percentage?: number
          tips_pass_through?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          driver_base_pay_cents?: number
          driver_delivery_fee_share_bps?: number
          id?: string
          is_active?: boolean
          merchant_commission_bps?: number
          percentage?: number
          tips_pass_through?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      driver_payouts: {
        Row: {
          amount: number
          amount_cents: number
          arrival_date: string | null
          created_at: string | null
          currency: string
          driver_id: string
          failure_code: string | null
          failure_message: string | null
          id: string
          payout_type: string
          status: string
          stripe_account_id: string
          stripe_payout_id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          amount_cents: number
          arrival_date?: string | null
          created_at?: string | null
          currency?: string
          driver_id: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          payout_type: string
          status: string
          stripe_account_id: string
          stripe_payout_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_cents?: number
          arrival_date?: string | null
          created_at?: string | null
          currency?: string
          driver_id?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          payout_type?: string
          status?: string
          stripe_account_id?: string
          stripe_payout_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_preferences: {
        Row: {
          app_lock_enabled: boolean | null
          app_lock_pin_hash: string | null
          app_lock_type: string | null
          auto_accept_orders: boolean | null
          auto_logout_minutes: number | null
          auto_logout_on_inactive: boolean | null
          auto_share_location_on_delivery: boolean | null
          avoid_highways: boolean | null
          avoid_tolls: boolean | null
          created_at: string
          data_export_completed: boolean | null
          data_export_last_request_at: string | null
          data_export_requested: boolean | null
          driver_id: string
          id: string
          map_style: string | null
          notification_sound: boolean | null
          panic_button_enabled: boolean | null
          preferred_nav_app: string | null
          require_reauth_for_sensitive: boolean | null
          security_alert_location_access: boolean | null
          security_alert_new_device: boolean | null
          security_alert_password_change: boolean | null
          security_alert_suspicious_activity: boolean | null
          share_location_with_emergency: boolean | null
          show_earnings_summary: boolean | null
          two_factor_enabled: boolean | null
          updated_at: string
          voice_navigation: boolean | null
        }
        Insert: {
          app_lock_enabled?: boolean | null
          app_lock_pin_hash?: string | null
          app_lock_type?: string | null
          auto_accept_orders?: boolean | null
          auto_logout_minutes?: number | null
          auto_logout_on_inactive?: boolean | null
          auto_share_location_on_delivery?: boolean | null
          avoid_highways?: boolean | null
          avoid_tolls?: boolean | null
          created_at?: string
          data_export_completed?: boolean | null
          data_export_last_request_at?: string | null
          data_export_requested?: boolean | null
          driver_id: string
          id?: string
          map_style?: string | null
          notification_sound?: boolean | null
          panic_button_enabled?: boolean | null
          preferred_nav_app?: string | null
          require_reauth_for_sensitive?: boolean | null
          security_alert_location_access?: boolean | null
          security_alert_new_device?: boolean | null
          security_alert_password_change?: boolean | null
          security_alert_suspicious_activity?: boolean | null
          share_location_with_emergency?: boolean | null
          show_earnings_summary?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          voice_navigation?: boolean | null
        }
        Update: {
          app_lock_enabled?: boolean | null
          app_lock_pin_hash?: string | null
          app_lock_type?: string | null
          auto_accept_orders?: boolean | null
          auto_logout_minutes?: number | null
          auto_logout_on_inactive?: boolean | null
          auto_share_location_on_delivery?: boolean | null
          avoid_highways?: boolean | null
          avoid_tolls?: boolean | null
          created_at?: string
          data_export_completed?: boolean | null
          data_export_last_request_at?: string | null
          data_export_requested?: boolean | null
          driver_id?: string
          id?: string
          map_style?: string | null
          notification_sound?: boolean | null
          panic_button_enabled?: boolean | null
          preferred_nav_app?: string | null
          require_reauth_for_sensitive?: boolean | null
          security_alert_location_access?: boolean | null
          security_alert_new_device?: boolean | null
          security_alert_password_change?: boolean | null
          security_alert_suspicious_activity?: boolean | null
          share_location_with_emergency?: boolean | null
          show_earnings_summary?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          voice_navigation?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_preferences_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          acceptance_rate: number | null
          completed_orders: number | null
          completion_rate: number | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          customer_complaints_count: number | null
          diamond_points: number | null
          dispatch_weight: number | null
          fraud_flag: boolean | null
          heading: number | null
          id: string
          is_available: boolean | null
          is_test_user: boolean | null
          last_location_update: string | null
          license_plate: string | null
          on_time_rate: number | null
          optimized_route: Json | null
          rating: number | null
          rating_tier: string | null
          region_id: number | null
          rolling_cancel_rate: number | null
          rolling_completion_rate: number | null
          rolling_deliveries: number | null
          rolling_on_time_rate: number | null
          rolling_rating: number | null
          route_updated_at: string | null
          speed: number | null
          status: string | null
          tier_grace_period_start: string | null
          tier_last_updated: string | null
          tier_review_required: boolean | null
          tier_status: Database["public"]["Enums"]["feeder_tier"] | null
          total_deliveries: number | null
          updated_at: string | null
          user_id: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_type: string | null
          vehicle_year: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          completed_orders?: number | null
          completion_rate?: number | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_complaints_count?: number | null
          diamond_points?: number | null
          dispatch_weight?: number | null
          fraud_flag?: boolean | null
          heading?: number | null
          id?: string
          is_available?: boolean | null
          is_test_user?: boolean | null
          last_location_update?: string | null
          license_plate?: string | null
          on_time_rate?: number | null
          optimized_route?: Json | null
          rating?: number | null
          rating_tier?: string | null
          region_id?: number | null
          rolling_cancel_rate?: number | null
          rolling_completion_rate?: number | null
          rolling_deliveries?: number | null
          rolling_on_time_rate?: number | null
          rolling_rating?: number | null
          route_updated_at?: string | null
          speed?: number | null
          status?: string | null
          tier_grace_period_start?: string | null
          tier_last_updated?: string | null
          tier_review_required?: boolean | null
          tier_status?: Database["public"]["Enums"]["feeder_tier"] | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          completed_orders?: number | null
          completion_rate?: number | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_complaints_count?: number | null
          diamond_points?: number | null
          dispatch_weight?: number | null
          fraud_flag?: boolean | null
          heading?: number | null
          id?: string
          is_available?: boolean | null
          is_test_user?: boolean | null
          last_location_update?: string | null
          license_plate?: string | null
          on_time_rate?: number | null
          optimized_route?: Json | null
          rating?: number | null
          rating_tier?: string | null
          region_id?: number | null
          rolling_cancel_rate?: number | null
          rolling_completion_rate?: number | null
          rolling_deliveries?: number | null
          rolling_on_time_rate?: number | null
          rolling_rating?: number | null
          route_updated_at?: string | null
          speed?: number | null
          status?: string | null
          tier_grace_period_start?: string | null
          tier_last_updated?: string | null
          tier_review_required?: boolean | null
          tier_status?: Database["public"]["Enums"]["feeder_tier"] | null
          total_deliveries?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_promotion_participation: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          driver_id: string
          id: string
          progress: number | null
          promotion_id: string
          reward_paid: boolean | null
          updated_at: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          driver_id: string
          id?: string
          progress?: number | null
          promotion_id: string
          reward_paid?: boolean | null
          updated_at?: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          progress?: number | null
          promotion_id?: string
          reward_paid?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_promotion_participation_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_promotion_participation_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "driver_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_promotions: {
        Row: {
          created_at: string
          description: string
          end_date: string
          id: string
          is_active: boolean | null
          promo_type: string
          requirements: Json
          reward_amount: number
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          end_date: string
          id?: string
          is_active?: boolean | null
          promo_type: string
          requirements: Json
          reward_amount: number
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          promo_type?: string
          requirements?: Json
          reward_amount?: number
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          driver_id: string
          endpoint: string
          id: string
          is_active: boolean
          is_native: boolean
          p256dh_key: string
          push_token: string | null
        }
        Insert: {
          auth_key: string
          created_at?: string
          driver_id: string
          endpoint: string
          id?: string
          is_active?: boolean
          is_native?: boolean
          p256dh_key: string
          push_token?: string | null
        }
        Update: {
          auth_key?: string
          created_at?: string
          driver_id?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          is_native?: boolean
          p256dh_key?: string
          push_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_push_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points: number
          question_text: string
          section: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points?: number
          question_text: string
          section: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          points?: number
          question_text?: string
          section?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_quiz_questions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_referrals: {
        Row: {
          activated_at: string | null
          created_at: string | null
          id: string
          points_awarded: number | null
          referee_id: string | null
          referral_code: string | null
          referred_id: string | null
          referrer_id: string | null
          status: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          points_awarded?: number | null
          referee_id?: string | null
          referral_code?: string | null
          referred_id?: string | null
          referrer_id?: string | null
          status?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          points_awarded?: number | null
          referee_id?: string | null
          referral_code?: string | null
          referred_id?: string | null
          referrer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "craver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "unified_driver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "craver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "unified_driver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "craver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "unified_driver_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          driver_id: string
          end_time: string
          id: string
          is_active: boolean
          is_recurring: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          driver_id: string
          end_time: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          driver_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_sessions: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          is_online: boolean
          last_activity: string
          session_data: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          is_online?: boolean
          last_activity?: string
          session_data?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          is_online?: boolean
          last_activity?: string
          session_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_driver_sessions_driver_id"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settings: {
        Row: {
          created_at: string | null
          id: string
          is_test_user: boolean | null
          on_fire_game_enabled: boolean | null
          speed_detection_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_test_user?: boolean | null
          on_fire_game_enabled?: boolean | null
          speed_detection_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_test_user?: boolean | null
          on_fire_game_enabled?: boolean | null
          speed_detection_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_signatures: {
        Row: {
          agreement_type: string
          agreement_version: string
          created_at: string | null
          driver_id: string
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          signature_image_url: string | null
          signed_at: string | null
          typed_name: string | null
          user_agent: string | null
        }
        Insert: {
          agreement_type?: string
          agreement_version?: string
          created_at?: string | null
          driver_id: string
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          signature_image_url?: string | null
          signed_at?: string | null
          typed_name?: string | null
          user_agent?: string | null
        }
        Update: {
          agreement_type?: string
          agreement_version?: string
          created_at?: string | null
          driver_id?: string
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          signature_image_url?: string | null
          signed_at?: string | null
          typed_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_signatures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_support_chats: {
        Row: {
          agent_id: string | null
          agent_response_count: number | null
          category: string | null
          created_at: string | null
          driver_id: string
          driver_response_count: number | null
          first_response_time_seconds: number | null
          id: string
          last_message_at: string | null
          priority: string | null
          resolution_time_seconds: number | null
          resolved_at: string | null
          satisfaction_feedback: string | null
          satisfaction_rating: number | null
          status: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_response_count?: number | null
          category?: string | null
          created_at?: string | null
          driver_id: string
          driver_response_count?: number | null
          first_response_time_seconds?: number | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          resolution_time_seconds?: number | null
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_response_count?: number | null
          category?: string | null
          created_at?: string | null
          driver_id?: string
          driver_response_count?: number | null
          first_response_time_seconds?: number | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          resolution_time_seconds?: number | null
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_support_chats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_support_chats_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_support_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          chat_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message_text: string | null
          message_type: string | null
          metadata: Json | null
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          chat_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text?: string | null
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          chat_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text?: string | null
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_support_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "driver_support_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_surge_zones: {
        Row: {
          city: string | null
          coordinates: Json
          created_at: string
          end_time: string | null
          id: string
          is_active: boolean | null
          start_time: string | null
          surge_multiplier: number
          updated_at: string
          zone_name: string
        }
        Insert: {
          city?: string | null
          coordinates: Json
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          surge_multiplier?: number
          updated_at?: string
          zone_name: string
        }
        Update: {
          city?: string | null
          coordinates?: Json
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          surge_multiplier?: number
          updated_at?: string
          zone_name?: string
        }
        Relationships: []
      }
      driver_waitlist: {
        Row: {
          activated_at: string | null
          added_at: string | null
          contract_signed: boolean | null
          driver_id: string
          id: string
          notified_at: string | null
          position: number | null
          zone_id: string
        }
        Insert: {
          activated_at?: string | null
          added_at?: string | null
          contract_signed?: boolean | null
          driver_id: string
          id?: string
          notified_at?: string | null
          position?: number | null
          zone_id: string
        }
        Update: {
          activated_at?: string | null
          added_at?: string | null
          contract_signed?: boolean | null
          driver_id?: string
          id?: string
          notified_at?: string | null
          position?: number | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_waitlist_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_waitlist_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_wallet: {
        Row: {
          available_cents: number
          driver_id: string
          reserved_cents: number
          updated_at: string
        }
        Insert: {
          available_cents?: number
          driver_id: string
          reserved_cents?: number
          updated_at?: string
        }
        Update: {
          available_cents?: number
          driver_id?: string
          reserved_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_wallet_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_weekly_stats: {
        Row: {
          active_hours: number | null
          avg_earnings_per_hour: number | null
          avg_earnings_per_trip: number | null
          avg_miles_per_trip: number | null
          avg_rating: number | null
          base_earnings_cents: number | null
          bonuses_cents: number | null
          calculated_at: string | null
          cancelled_trips: number | null
          completed_trips: number | null
          driver_id: string
          id: string
          on_time_percentage: number | null
          surge_earnings_cents: number | null
          tips_cents: number | null
          total_earnings_cents: number | null
          total_hours: number | null
          total_miles: number | null
          total_ratings: number | null
          total_trips: number | null
          updated_at: string | null
          week_start_date: string
        }
        Insert: {
          active_hours?: number | null
          avg_earnings_per_hour?: number | null
          avg_earnings_per_trip?: number | null
          avg_miles_per_trip?: number | null
          avg_rating?: number | null
          base_earnings_cents?: number | null
          bonuses_cents?: number | null
          calculated_at?: string | null
          cancelled_trips?: number | null
          completed_trips?: number | null
          driver_id: string
          id?: string
          on_time_percentage?: number | null
          surge_earnings_cents?: number | null
          tips_cents?: number | null
          total_earnings_cents?: number | null
          total_hours?: number | null
          total_miles?: number | null
          total_ratings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          week_start_date: string
        }
        Update: {
          active_hours?: number | null
          avg_earnings_per_hour?: number | null
          avg_earnings_per_trip?: number | null
          avg_miles_per_trip?: number | null
          avg_rating?: number | null
          base_earnings_cents?: number | null
          bonuses_cents?: number | null
          calculated_at?: string | null
          cancelled_trips?: number | null
          completed_trips?: number | null
          driver_id?: string
          id?: string
          on_time_percentage?: number | null
          surge_earnings_cents?: number | null
          tips_cents?: number | null
          total_earnings_cents?: number | null
          total_hours?: number | null
          total_miles?: number | null
          total_ratings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_weekly_stats_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      drivers: {
        Row: {
          activated_at: string | null
          auth_user_id: string | null
          city: string
          contract_signed_at: string | null
          created_at: string | null
          docusign_envelope_id: string | null
          email: string
          full_name: string
          home_zone: string | null
          id: string
          online_state: string | null
          phone: string
          rating: number | null
          ssn_last4: string | null
          status: string
          updated_at: string | null
          zip: string
          zone_id: string | null
        }
        Insert: {
          activated_at?: string | null
          auth_user_id?: string | null
          city: string
          contract_signed_at?: string | null
          created_at?: string | null
          docusign_envelope_id?: string | null
          email: string
          full_name: string
          home_zone?: string | null
          id?: string
          online_state?: string | null
          phone: string
          rating?: number | null
          ssn_last4?: string | null
          status?: string
          updated_at?: string | null
          zip: string
          zone_id?: string | null
        }
        Update: {
          activated_at?: string | null
          auth_user_id?: string | null
          city?: string
          contract_signed_at?: string | null
          created_at?: string | null
          docusign_envelope_id?: string | null
          email?: string
          full_name?: string
          home_zone?: string | null
          id?: string
          online_state?: string | null
          phone?: string
          rating?: number | null
          ssn_last4?: string | null
          status?: string
          updated_at?: string | null
          zip?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "drivers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      eas_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_key: string
          document_type: string
          id: string
          template_content: string
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_key: string
          document_type: string
          id?: string
          template_content: string
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_key?: string
          document_type?: string
          id?: string
          template_content?: string
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eas_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      eas_instances: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          document_type: string
          executive_id: string
          filled_content: string
          id: string
          issued_at: string | null
          issuer_id: string
          metadata: Json | null
          pdf_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          document_type: string
          executive_id: string
          filled_content: string
          id?: string
          issued_at?: string | null
          issuer_id: string
          metadata?: Json | null
          pdf_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          document_type?: string
          executive_id?: string
          filled_content?: string
          id?: string
          issued_at?: string | null
          issuer_id?: string
          metadata?: Json | null
          pdf_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eas_instances_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eas_instances_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      eas_workflow: {
        Row: {
          bnnc_instance_id: string | null
          created_at: string | null
          current_step: string
          ecap_instance_id: string | null
          epm_instance_id: string | null
          etfcn_instance_id: string | null
          executive_id: string
          id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          bnnc_instance_id?: string | null
          created_at?: string | null
          current_step: string
          ecap_instance_id?: string | null
          epm_instance_id?: string | null
          etfcn_instance_id?: string | null
          executive_id: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          bnnc_instance_id?: string | null
          created_at?: string | null
          current_step?: string
          ecap_instance_id?: string | null
          epm_instance_id?: string | null
          etfcn_instance_id?: string | null
          executive_id?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eas_workflow_bnnc_instance_id_fkey"
            columns: ["bnnc_instance_id"]
            isOneToOne: false
            referencedRelation: "eas_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eas_workflow_ecap_instance_id_fkey"
            columns: ["ecap_instance_id"]
            isOneToOne: false
            referencedRelation: "eas_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eas_workflow_epm_instance_id_fkey"
            columns: ["epm_instance_id"]
            isOneToOne: false
            referencedRelation: "eas_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eas_workflow_etfcn_instance_id_fkey"
            columns: ["etfcn_instance_id"]
            isOneToOne: false
            referencedRelation: "eas_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eas_workflow_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: true
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_type: string
          employee_id: string | null
          from_email: string
          id: string
          recipient_email: string
          recipient_name: string | null
          resend_email_id: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string | null
          email_type: string
          employee_id?: string | null
          from_email: string
          id?: string
          recipient_email: string
          recipient_name?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string | null
          email_type?: string
          employee_id?: string | null
          from_email?: string
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      email_otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
          variables: Json
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_key: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      employee_deductions: {
        Row: {
          amount: number | null
          annual_limit: number | null
          calculation_method: string | null
          created_at: string | null
          deduction_code: string
          deduction_name: string
          deduction_template_id: string | null
          deduction_type: string
          effective_date: string
          employee_id: string
          expiration_date: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          percentage: number | null
          updated_at: string | null
          ytd_amount: number | null
        }
        Insert: {
          amount?: number | null
          annual_limit?: number | null
          calculation_method?: string | null
          created_at?: string | null
          deduction_code: string
          deduction_name: string
          deduction_template_id?: string | null
          deduction_type: string
          effective_date?: string
          employee_id: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          percentage?: number | null
          updated_at?: string | null
          ytd_amount?: number | null
        }
        Update: {
          amount?: number | null
          annual_limit?: number | null
          calculation_method?: string | null
          created_at?: string | null
          deduction_code?: string
          deduction_name?: string
          deduction_template_id?: string | null
          deduction_type?: string
          effective_date?: string
          employee_id?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          percentage?: number | null
          updated_at?: string | null
          ytd_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_deductions_deduction_template_id_fkey"
            columns: ["deduction_template_id"]
            isOneToOne: false
            referencedRelation: "payroll_deduction_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_title: string
          document_type: string
          employee_id: string
          file_size_bytes: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          storage_path: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_title: string
          document_type: string
          employee_id: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_title?: string
          document_type?: string
          employee_id?: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_equity: {
        Row: {
          authorized_by: string | null
          consideration_type: string | null
          created_at: string | null
          employee_id: string | null
          equity_type: string
          grant_date: string | null
          id: string
          is_majority_shareholder: boolean | null
          notes: string | null
          share_class: string | null
          shareholder_name: string | null
          shareholder_type: string | null
          shares_percentage: number
          shares_total: number | null
          strike_price: number | null
          updated_at: string | null
          vesting_schedule: Json | null
          vesting_start_date: string | null
        }
        Insert: {
          authorized_by?: string | null
          consideration_type?: string | null
          created_at?: string | null
          employee_id?: string | null
          equity_type?: string
          grant_date?: string | null
          id?: string
          is_majority_shareholder?: boolean | null
          notes?: string | null
          share_class?: string | null
          shareholder_name?: string | null
          shareholder_type?: string | null
          shares_percentage: number
          shares_total?: number | null
          strike_price?: number | null
          updated_at?: string | null
          vesting_schedule?: Json | null
          vesting_start_date?: string | null
        }
        Update: {
          authorized_by?: string | null
          consideration_type?: string | null
          created_at?: string | null
          employee_id?: string | null
          equity_type?: string
          grant_date?: string | null
          id?: string
          is_majority_shareholder?: boolean | null
          notes?: string | null
          share_class?: string | null
          shareholder_name?: string | null
          shareholder_type?: string | null
          shares_percentage?: number
          shares_total?: number | null
          strike_price?: number | null
          updated_at?: string | null
          vesting_schedule?: Json | null
          vesting_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_equity_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_equity_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_equity_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_history: {
        Row: {
          action_type: string
          created_at: string | null
          effective_date: string
          employee_id: string
          id: string
          new_department_id: string | null
          new_position: string | null
          new_salary: number | null
          notes: string | null
          performed_by: string | null
          previous_department_id: string | null
          previous_position: string | null
          previous_salary: number | null
          reason: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          effective_date?: string
          employee_id: string
          id?: string
          new_department_id?: string | null
          new_position?: string | null
          new_salary?: number | null
          notes?: string | null
          performed_by?: string | null
          previous_department_id?: string | null
          previous_position?: string | null
          previous_salary?: number | null
          reason?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          effective_date?: string
          employee_id?: string
          id?: string
          new_department_id?: string | null
          new_position?: string | null
          new_salary?: number | null
          notes?: string | null
          performed_by?: string | null
          previous_department_id?: string | null
          previous_position?: string | null
          previous_salary?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_history_new_department_id_fkey"
            columns: ["new_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_history_previous_department_id_fkey"
            columns: ["previous_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_tax_settings: {
        Row: {
          additional_federal_withholding: number | null
          additional_local_withholding: number | null
          additional_state_withholding: number | null
          created_at: string | null
          effective_date: string
          employee_id: string
          expiration_date: string | null
          federal_allowances: number | null
          federal_exempt: boolean | null
          filing_status: string | null
          id: string
          local_allowances: number | null
          local_exempt: boolean | null
          local_filing_status: string | null
          local_jurisdiction: string | null
          medicare_exempt: boolean | null
          metadata: Json | null
          social_security_exempt: boolean | null
          state_allowances: number | null
          state_code: string | null
          state_exempt: boolean | null
          state_filing_status: string | null
          tax_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          additional_federal_withholding?: number | null
          additional_local_withholding?: number | null
          additional_state_withholding?: number | null
          created_at?: string | null
          effective_date?: string
          employee_id: string
          expiration_date?: string | null
          federal_allowances?: number | null
          federal_exempt?: boolean | null
          filing_status?: string | null
          id?: string
          local_allowances?: number | null
          local_exempt?: boolean | null
          local_filing_status?: string | null
          local_jurisdiction?: string | null
          medicare_exempt?: boolean | null
          metadata?: Json | null
          social_security_exempt?: boolean | null
          state_allowances?: number | null
          state_code?: string | null
          state_exempt?: boolean | null
          state_filing_status?: string | null
          tax_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          additional_federal_withholding?: number | null
          additional_local_withholding?: number | null
          additional_state_withholding?: number | null
          created_at?: string | null
          effective_date?: string
          employee_id?: string
          expiration_date?: string | null
          federal_allowances?: number | null
          federal_exempt?: boolean | null
          filing_status?: string | null
          id?: string
          local_allowances?: number | null
          local_exempt?: boolean | null
          local_filing_status?: string | null
          local_jurisdiction?: string | null
          medicare_exempt?: boolean | null
          metadata?: Json | null
          social_security_exempt?: boolean | null
          state_allowances?: number | null
          state_code?: string | null
          state_exempt?: boolean | null
          state_filing_status?: string | null
          tax_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_tax_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_tax_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employees: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          date_of_birth: string | null
          deferred_salary_clause: boolean | null
          department_id: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string | null
          employment_status: string
          employment_type: string
          first_name: string
          funding_trigger: number | null
          hire_date: string
          hired_by: string | null
          hourly_rate: number | null
          id: string
          last_name: string
          manager_id: string | null
          notes: string | null
          phone: string | null
          portal_access_granted: boolean | null
          portal_pin: string | null
          portal_pin_issued_at: string | null
          position: string
          position_id: string | null
          remote_allowed: boolean | null
          salary: number | null
          salary_status: string | null
          sponsor_id: string | null
          sponsor_super: boolean | null
          ssn_last4: string | null
          start_date: string
          terminated_by: string | null
          termination_date: string | null
          updated_at: string | null
          user_id: string | null
          work_location: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deferred_salary_clause?: boolean | null
          department_id?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          employment_status?: string
          employment_type: string
          first_name: string
          funding_trigger?: number | null
          hire_date?: string
          hired_by?: string | null
          hourly_rate?: number | null
          id?: string
          last_name: string
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          portal_access_granted?: boolean | null
          portal_pin?: string | null
          portal_pin_issued_at?: string | null
          position: string
          position_id?: string | null
          remote_allowed?: boolean | null
          salary?: number | null
          salary_status?: string | null
          sponsor_id?: string | null
          sponsor_super?: boolean | null
          ssn_last4?: string | null
          start_date?: string
          terminated_by?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_location?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deferred_salary_clause?: boolean | null
          department_id?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          employment_status?: string
          employment_type?: string
          first_name?: string
          funding_trigger?: number | null
          hire_date?: string
          hired_by?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          portal_access_granted?: boolean | null
          portal_pin?: string | null
          portal_pin_issued_at?: string | null
          position?: string
          position_id?: string | null
          remote_allowed?: boolean | null
          salary?: number | null
          salary_status?: string | null
          sponsor_id?: string | null
          sponsor_super?: boolean | null
          ssn_last4?: string | null
          start_date?: string
          terminated_by?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_hired_by_fkey"
            columns: ["hired_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_terminated_by_fkey"
            columns: ["terminated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      equity_grant_history: {
        Row: {
          change_type: string
          changed_by: string | null
          grant_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          timestamp: string | null
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          grant_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          timestamp?: string | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          grant_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equity_grant_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_grant_history_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "equity_grants"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_grants: {
        Row: {
          approved_at: string | null
          board_resolution_id: string | null
          consideration_type: string | null
          consideration_value: number | null
          created_at: string | null
          employee_id: string | null
          executive_id: string | null
          grant_date: string
          granted_by: string | null
          id: string
          notes: string | null
          share_class: string | null
          shares_percentage: number
          shares_total: number
          status: string | null
          stock_issuance_doc_id: string | null
          strike_price: number
          vesting_schedule: Json
        }
        Insert: {
          approved_at?: string | null
          board_resolution_id?: string | null
          consideration_type?: string | null
          consideration_value?: number | null
          created_at?: string | null
          employee_id?: string | null
          executive_id?: string | null
          grant_date: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          share_class?: string | null
          shares_percentage: number
          shares_total: number
          status?: string | null
          stock_issuance_doc_id?: string | null
          strike_price: number
          vesting_schedule: Json
        }
        Update: {
          approved_at?: string | null
          board_resolution_id?: string | null
          consideration_type?: string | null
          consideration_value?: number | null
          created_at?: string | null
          employee_id?: string | null
          executive_id?: string | null
          grant_date?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          share_class?: string | null
          shares_percentage?: number
          shares_total?: number
          status?: string | null
          stock_issuance_doc_id?: string | null
          strike_price?: number
          vesting_schedule?: Json
        }
        Relationships: [
          {
            foreignKeyName: "equity_grants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_grants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "equity_grants_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_issuances: {
        Row: {
          contribution_order_id: string | null
          contributor_id: string | null
          created_at: string
          equity_pool_code: string | null
          equity_pool_id: string | null
          equity_source: string
          id: string
          issuance_context: string
          issuance_status: string
          issued_at: string | null
          shares_issued: number
          strike_price_per_share: number | null
          updated_at: string
        }
        Insert: {
          contribution_order_id?: string | null
          contributor_id?: string | null
          created_at?: string
          equity_pool_code?: string | null
          equity_pool_id?: string | null
          equity_source: string
          id?: string
          issuance_context: string
          issuance_status?: string
          issued_at?: string | null
          shares_issued: number
          strike_price_per_share?: number | null
          updated_at?: string
        }
        Update: {
          contribution_order_id?: string | null
          contributor_id?: string | null
          created_at?: string
          equity_pool_code?: string | null
          equity_pool_id?: string | null
          equity_source?: string
          id?: string
          issuance_context?: string
          issuance_status?: string
          issued_at?: string | null
          shares_issued?: number
          strike_price_per_share?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_issuances_contribution_order_id_fkey"
            columns: ["contribution_order_id"]
            isOneToOne: false
            referencedRelation: "contribution_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_issuances_equity_pool_id_fkey"
            columns: ["equity_pool_id"]
            isOneToOne: false
            referencedRelation: "equity_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_ledger: {
        Row: {
          certificate_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          effective_date: string
          grant_id: string | null
          id: string
          notes: string | null
          price_per_share: number | null
          recipient_user_id: string
          resolution_id: string | null
          share_class: string | null
          shares_amount: number
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          certificate_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          grant_id?: string | null
          id?: string
          notes?: string | null
          price_per_share?: number | null
          recipient_user_id: string
          resolution_id?: string | null
          share_class?: string | null
          shares_amount: number
          transaction_date?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          certificate_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          grant_id?: string | null
          id?: string
          notes?: string | null
          price_per_share?: number | null
          recipient_user_id?: string
          resolution_id?: string | null
          share_class?: string | null
          shares_amount?: number
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equity_ledger_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equity_ledger_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "governance_board_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_pools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          pool_code: string
          pool_name: string
          remaining_reserved_shares: number
          total_reserved_shares: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          pool_code: string
          pool_name: string
          remaining_reserved_shares?: number
          total_reserved_shares?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          pool_code?: string
          pool_name?: string
          remaining_reserved_shares?: number
          total_reserved_shares?: number
          updated_at?: string
        }
        Relationships: []
      }
      error_clusters: {
        Row: {
          count: number | null
          created_at: string | null
          error_pattern: string
          first_seen: string | null
          id: string
          last_seen: string | null
          severity: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          error_pattern: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          severity?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          error_pattern?: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      exec_audit_logs: {
        Row: {
          action_category: string
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          severity: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action_category: string
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          severity?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action_category?: string
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          severity?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_conversation_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: string | null
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string | null
          from_exec_id: string
          id: string
          message_text: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string | null
          from_exec_id: string
          id?: string
          message_text: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string | null
          from_exec_id?: string
          id?: string
          message_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "exec_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "exec_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_conversation_messages_from_exec_id_fkey"
            columns: ["from_exec_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_conversations: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          last_message_at: string | null
          participant1_exec_id: string
          participant2_exec_id: string
          portal_context: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          last_message_at?: string | null
          participant1_exec_id: string
          participant2_exec_id: string
          portal_context: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          last_message_at?: string | null
          participant1_exec_id?: string
          participant2_exec_id?: string
          portal_context?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_conversations_participant1_exec_id_fkey"
            columns: ["participant1_exec_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_conversations_participant2_exec_id_fkey"
            columns: ["participant2_exec_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_documents: {
        Row: {
          access_level: number | null
          category: string
          created_at: string | null
          description: string | null
          employee_id: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          access_level?: number | null
          category: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          access_level?: number | null
          category?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "exec_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_group_conversation_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: string | null
          attachment_type: string | null
          attachment_url: string | null
          created_at: string | null
          from_exec_id: string
          group_conversation_id: string
          id: string
          message_text: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string | null
          from_exec_id: string
          group_conversation_id: string
          id?: string
          message_text: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string | null
          from_exec_id?: string
          group_conversation_id?: string
          id?: string
          message_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "exec_group_conversation_messages_from_exec_id_fkey"
            columns: ["from_exec_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_group_conversation_messages_group_conversation_id_fkey"
            columns: ["group_conversation_id"]
            isOneToOne: false
            referencedRelation: "exec_group_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_group_conversation_participants: {
        Row: {
          exec_user_id: string
          group_conversation_id: string
          id: string
          joined_at: string | null
        }
        Insert: {
          exec_user_id: string
          group_conversation_id: string
          id?: string
          joined_at?: string | null
        }
        Update: {
          exec_user_id?: string
          group_conversation_id?: string
          id?: string
          joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_group_conversation_participants_exec_user_id_fkey"
            columns: ["exec_user_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_group_conversation_participants_group_conversation_id_fkey"
            columns: ["group_conversation_id"]
            isOneToOne: false
            referencedRelation: "exec_group_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_group_conversations: {
        Row: {
          created_at: string | null
          created_by_exec_id: string
          device_id: string | null
          id: string
          last_message_at: string | null
          name: string
          portal_context: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_exec_id: string
          device_id?: string | null
          id?: string
          last_message_at?: string | null
          name: string
          portal_context: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_exec_id?: string
          device_id?: string | null
          id?: string
          last_message_at?: string | null
          name?: string
          portal_context?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_group_conversations_created_by_exec_id_fkey"
            columns: ["created_by_exec_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_messages: {
        Row: {
          created_at: string | null
          delete_mark_for: string[] | null
          from_user_id: string
          id: string
          is_confidential: boolean | null
          message: string
          priority: string | null
          read_by: string[] | null
          subject: string
          to_user_ids: string[]
          trashed_for: string[] | null
        }
        Insert: {
          created_at?: string | null
          delete_mark_for?: string[] | null
          from_user_id: string
          id?: string
          is_confidential?: boolean | null
          message: string
          priority?: string | null
          read_by?: string[] | null
          subject: string
          to_user_ids: string[]
          trashed_for?: string[] | null
        }
        Update: {
          created_at?: string | null
          delete_mark_for?: string[] | null
          from_user_id?: string
          id?: string
          is_confidential?: boolean | null
          message?: string
          priority?: string | null
          read_by?: string[] | null
          subject?: string
          to_user_ids?: string[]
          trashed_for?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_users: {
        Row: {
          access_level: number
          allow_direct_messages: boolean | null
          appointment_date: string | null
          approved_at: string | null
          approved_by: string | null
          board_resolution_id: string | null
          created_at: string | null
          department: string | null
          id: string
          ip_whitelist: Json | null
          is_also_employee: boolean | null
          last_login: string | null
          linked_employee_id: string | null
          mention_handle: string | null
          metadata: Json | null
          mfa_enabled: boolean | null
          officer_status: string | null
          photo_url: string | null
          role: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_level?: number
          allow_direct_messages?: boolean | null
          appointment_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          board_resolution_id?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          ip_whitelist?: Json | null
          is_also_employee?: boolean | null
          last_login?: string | null
          linked_employee_id?: string | null
          mention_handle?: string | null
          metadata?: Json | null
          mfa_enabled?: boolean | null
          officer_status?: string | null
          photo_url?: string | null
          role: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_level?: number
          allow_direct_messages?: boolean | null
          appointment_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          board_resolution_id?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          ip_whitelist?: Json | null
          is_also_employee?: boolean | null
          last_login?: string | null
          linked_employee_id?: string | null
          mention_handle?: string | null
          metadata?: Json | null
          mfa_enabled?: boolean | null
          officer_status?: string | null
          photo_url?: string | null
          role?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exec_users_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_users_board_resolution_id_fkey"
            columns: ["board_resolution_id"]
            isOneToOne: false
            referencedRelation: "board_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_users_linked_employee_id_fkey"
            columns: ["linked_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_users_linked_employee_id_fkey"
            columns: ["linked_employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "exec_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      executive_appointments: {
        Row: {
          appointed_by: string
          appointment_date: string
          appointment_type: string
          created_at: string | null
          effective_date: string
          executive_id: string
          id: string
          notes: string | null
          position: string
          resolution_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          appointed_by: string
          appointment_date?: string
          appointment_type: string
          created_at?: string | null
          effective_date: string
          executive_id: string
          id?: string
          notes?: string | null
          position: string
          resolution_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          appointed_by?: string
          appointment_date?: string
          appointment_type?: string
          created_at?: string | null
          effective_date?: string
          executive_id?: string
          id?: string
          notes?: string | null
          position?: string
          resolution_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_appointments_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_banking_authority: {
        Row: {
          appointment_id: string | null
          bank_authorization_packet_url: string | null
          can_access_treasury_portal: boolean | null
          can_sign_checks: boolean | null
          can_sign_wires: boolean | null
          created_at: string | null
          id: string
          officer_id: string | null
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          bank_authorization_packet_url?: string | null
          can_access_treasury_portal?: boolean | null
          can_sign_checks?: boolean | null
          can_sign_wires?: boolean | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          role: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          bank_authorization_packet_url?: string | null
          can_access_treasury_portal?: boolean | null
          can_sign_checks?: boolean | null
          can_sign_wires?: boolean | null
          created_at?: string | null
          id?: string
          officer_id?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      executive_compensation: {
        Row: {
          activated_at: string | null
          activation_trigger: string | null
          appointment_id: string | null
          base_salary: number | null
          created_at: string | null
          id: string
          is_deferred: boolean | null
          trigger_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activation_trigger?: string | null
          appointment_id?: string | null
          base_salary?: number | null
          created_at?: string | null
          id?: string
          is_deferred?: boolean | null
          trigger_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activation_trigger?: string | null
          appointment_id?: string | null
          base_salary?: number | null
          created_at?: string | null
          id?: string
          is_deferred?: boolean | null
          trigger_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_compensation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      executive_compliance_records: {
        Row: {
          added_to_do_insurance: boolean | null
          appointment_id: string | null
          background_verified: boolean | null
          conflict_form_signed: boolean | null
          created_at: string | null
          id: string
          identity_verified: boolean | null
          nda_signed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          added_to_do_insurance?: boolean | null
          appointment_id?: string | null
          background_verified?: boolean | null
          conflict_form_signed?: boolean | null
          created_at?: string | null
          id?: string
          identity_verified?: boolean | null
          nda_signed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          added_to_do_insurance?: boolean | null
          appointment_id?: string | null
          background_verified?: boolean | null
          conflict_form_signed?: boolean | null
          created_at?: string | null
          id?: string
          identity_verified?: boolean | null
          nda_signed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_compliance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      executive_documents: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          created_by: string | null
          depends_on_document_id: string | null
          equity: number | null
          executive_id: string | null
          file_url: string | null
          id: string
          officer_name: string
          packet_id: string | null
          required_signers: string[] | null
          role: string
          signature_field_layout: Json | null
          signature_status: string | null
          signature_token: string | null
          signature_token_expires_at: string | null
          signed_at: string | null
          signed_by_user: string | null
          signed_file_url: string | null
          signer_roles: Json | null
          signing_order: number | null
          signing_stage: number | null
          stage_completed: boolean | null
          status: string
          template_id: string | null
          template_key: string | null
          type: string
          verification_status: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          depends_on_document_id?: string | null
          equity?: number | null
          executive_id?: string | null
          file_url?: string | null
          id?: string
          officer_name: string
          packet_id?: string | null
          required_signers?: string[] | null
          role: string
          signature_field_layout?: Json | null
          signature_status?: string | null
          signature_token?: string | null
          signature_token_expires_at?: string | null
          signed_at?: string | null
          signed_by_user?: string | null
          signed_file_url?: string | null
          signer_roles?: Json | null
          signing_order?: number | null
          signing_stage?: number | null
          stage_completed?: boolean | null
          status?: string
          template_id?: string | null
          template_key?: string | null
          type: string
          verification_status?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          depends_on_document_id?: string | null
          equity?: number | null
          executive_id?: string | null
          file_url?: string | null
          id?: string
          officer_name?: string
          packet_id?: string | null
          required_signers?: string[] | null
          role?: string
          signature_field_layout?: Json | null
          signature_status?: string | null
          signature_token?: string | null
          signature_token_expires_at?: string | null
          signed_at?: string | null
          signed_by_user?: string | null
          signed_file_url?: string | null
          signer_roles?: Json | null
          signing_order?: number | null
          signing_stage?: number | null
          stage_completed?: boolean | null
          status?: string
          template_id?: string | null
          template_key?: string | null
          type?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_documents_depends_on_document_id_fkey"
            columns: ["depends_on_document_id"]
            isOneToOne: false
            referencedRelation: "executive_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_documents_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_documents_signed_by_user_fkey"
            columns: ["signed_by_user"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "executive_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_emails: {
        Row: {
          attachments: Json | null
          body: string | null
          created_at: string | null
          employee_id: string | null
          exec_user_id: string | null
          folder: string
          id: string
          message: string | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          recipient_email: string
          recipient_name: string | null
          sender_email: string
          sender_name: string | null
          sent_at: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          created_at?: string | null
          employee_id?: string | null
          exec_user_id?: string | null
          folder?: string
          id?: string
          message?: string | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          sender_email: string
          sender_name?: string | null
          sent_at?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          created_at?: string | null
          employee_id?: string | null
          exec_user_id?: string | null
          folder?: string
          id?: string
          message?: string | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sender_email?: string
          sender_name?: string | null
          sent_at?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_emails_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_emails_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "executive_emails_exec_user_id_fkey"
            columns: ["exec_user_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_identity: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string
          executive_id: string
          full_name: string
          id: string
          postal_code: string | null
          ssn_ciphertext: string
          ssn_iv: string
          ssn_last4: string
          state: string | null
          updated_at: string | null
          w9_storage_path: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth: string
          executive_id: string
          full_name: string
          id?: string
          postal_code?: string | null
          ssn_ciphertext: string
          ssn_iv: string
          ssn_last4: string
          state?: string | null
          updated_at?: string | null
          w9_storage_path?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string
          executive_id?: string
          full_name?: string
          id?: string
          postal_code?: string | null
          ssn_ciphertext?: string
          ssn_iv?: string
          ssn_last4?: string
          state?: string | null
          updated_at?: string | null
          w9_storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_identity_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: true
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_onboarding: {
        Row: {
          appointment_id: string
          completed_at: string | null
          created_at: string
          documents_completed: Json
          documents_required: Json
          id: string
          onboarding_notes: string | null
          signing_deadline: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          completed_at?: string | null
          created_at?: string
          documents_completed?: Json
          documents_required?: Json
          id?: string
          onboarding_notes?: string | null
          signing_deadline?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          completed_at?: string | null
          created_at?: string
          documents_completed?: Json
          documents_required?: Json
          id?: string
          onboarding_notes?: string | null
          signing_deadline?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_onboarding_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_onboarding_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      executive_saved_signatures: {
        Row: {
          created_at: string | null
          executive_id: string | null
          id: string
          is_default: boolean | null
          signature_data_url: string
          signature_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          executive_id?: string | null
          id?: string
          is_default?: boolean | null
          signature_data_url: string
          signature_name?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          executive_id?: string | null
          id?: string
          is_default?: boolean | null
          signature_data_url?: string
          signature_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_saved_signatures_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_saved_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      executive_signatures: {
        Row: {
          created_at: string | null
          document_id: string | null
          document_type: string
          employee_email: string
          employee_name: string | null
          id: string
          metadata: Json | null
          position: string | null
          signature_png_base64: string | null
          signature_svg: string | null
          signed_at: string | null
          signer_ip: string | null
          signer_user_agent: string | null
          token: string
          token_expires_at: string
          typed_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          document_type: string
          employee_email: string
          employee_name?: string | null
          id?: string
          metadata?: Json | null
          position?: string | null
          signature_png_base64?: string | null
          signature_svg?: string | null
          signed_at?: string | null
          signer_ip?: string | null
          signer_user_agent?: string | null
          token: string
          token_expires_at?: string
          typed_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          document_type?: string
          employee_email?: string
          employee_name?: string | null
          id?: string
          metadata?: Json | null
          position?: string | null
          signature_png_base64?: string | null
          signature_svg?: string | null
          signed_at?: string | null
          signer_ip?: string | null
          signer_user_agent?: string | null
          token?: string
          token_expires_at?: string
          typed_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "executive_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_access_revocations: {
        Row: {
          access_type: string
          created_at: string | null
          email_forward_to: string | null
          id: string
          notes: string | null
          revoked: boolean | null
          revoked_at: string | null
          revoked_by: string | null
          system_name: string
          workflow_id: string
        }
        Insert: {
          access_type: string
          created_at?: string | null
          email_forward_to?: string | null
          id?: string
          notes?: string | null
          revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          system_name: string
          workflow_id: string
        }
        Update: {
          access_type?: string
          created_at?: string | null
          email_forward_to?: string | null
          id?: string
          notes?: string | null
          revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
          system_name?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exit_access_revocations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "exit_access_revocations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "exit_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_asset_returns: {
        Row: {
          asset_description: string
          asset_serial_number: string | null
          asset_type: string
          condition_notes: string | null
          created_at: string | null
          id: string
          returned: boolean | null
          returned_at: string | null
          returned_by: string | null
          workflow_id: string
        }
        Insert: {
          asset_description: string
          asset_serial_number?: string | null
          asset_type: string
          condition_notes?: string | null
          created_at?: string | null
          id?: string
          returned?: boolean | null
          returned_at?: string | null
          returned_by?: string | null
          workflow_id: string
        }
        Update: {
          asset_description?: string
          asset_serial_number?: string | null
          asset_type?: string
          condition_notes?: string | null
          created_at?: string | null
          id?: string
          returned?: boolean | null
          returned_at?: string | null
          returned_by?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exit_asset_returns_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "exit_asset_returns_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "exit_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_workflow_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          status: string
          step_name: string
          step_number: number
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string
          step_name: string
          step_number: number
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          status?: string
          step_name?: string
          step_number?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exit_workflow_steps_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "exit_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "exit_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_workflows: {
        Row: {
          access_revoked_at: string | null
          access_revoked_by: string | null
          assets_checklist: Json | null
          assets_returned_at: string | null
          assets_returned_by: string | null
          board_resolution_id: string | null
          completed_at: string | null
          created_at: string | null
          effective_date: string
          employee_id: string
          equity_notes: string | null
          equity_vesting_status: string | null
          external_notification_required: boolean | null
          external_notification_sent: boolean | null
          final_compensation: number | null
          final_pay_date: string | null
          grounds_for_cause: string[] | null
          id: string
          initiated_at: string | null
          initiated_by: string
          internal_notification_sent: boolean | null
          last_day: string | null
          metadata: Json | null
          notes: string | null
          notice_date: string | null
          pto_payout: number | null
          severance_amount: number | null
          status: string
          steps_completed: Json | null
          steps_required: Json | null
          termination_reason: string | null
          termination_type: string | null
          unused_pto_days: number | null
          updated_at: string | null
          workflow_type: string
        }
        Insert: {
          access_revoked_at?: string | null
          access_revoked_by?: string | null
          assets_checklist?: Json | null
          assets_returned_at?: string | null
          assets_returned_by?: string | null
          board_resolution_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          effective_date: string
          employee_id: string
          equity_notes?: string | null
          equity_vesting_status?: string | null
          external_notification_required?: boolean | null
          external_notification_sent?: boolean | null
          final_compensation?: number | null
          final_pay_date?: string | null
          grounds_for_cause?: string[] | null
          id?: string
          initiated_at?: string | null
          initiated_by: string
          internal_notification_sent?: boolean | null
          last_day?: string | null
          metadata?: Json | null
          notes?: string | null
          notice_date?: string | null
          pto_payout?: number | null
          severance_amount?: number | null
          status?: string
          steps_completed?: Json | null
          steps_required?: Json | null
          termination_reason?: string | null
          termination_type?: string | null
          unused_pto_days?: number | null
          updated_at?: string | null
          workflow_type: string
        }
        Update: {
          access_revoked_at?: string | null
          access_revoked_by?: string | null
          assets_checklist?: Json | null
          assets_returned_at?: string | null
          assets_returned_by?: string | null
          board_resolution_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          effective_date?: string
          employee_id?: string
          equity_notes?: string | null
          equity_vesting_status?: string | null
          external_notification_required?: boolean | null
          external_notification_sent?: boolean | null
          final_compensation?: number | null
          final_pay_date?: string | null
          grounds_for_cause?: string[] | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string
          internal_notification_sent?: boolean | null
          last_day?: string | null
          metadata?: Json | null
          notes?: string | null
          notice_date?: string | null
          pto_payout?: number | null
          severance_amount?: number | null
          status?: string
          steps_completed?: Json | null
          steps_required?: Json | null
          termination_reason?: string | null
          termination_type?: string | null
          unused_pto_days?: number | null
          updated_at?: string | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "exit_workflows_access_revoked_by_fkey"
            columns: ["access_revoked_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "exit_workflows_assets_returned_by_fkey"
            columns: ["assets_returned_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "exit_workflows_board_resolution_id_fkey"
            columns: ["board_resolution_id"]
            isOneToOne: false
            referencedRelation: "board_resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_workflows_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_workflows_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "exit_workflows_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      expense_approval_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          comments: string | null
          created_at: string | null
          expense_request_id: string
          id: string
          new_status: string | null
          previous_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          comments?: string | null
          created_at?: string | null
          expense_request_id: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          comments?: string | null
          created_at?: string | null
          expense_request_id?: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_approval_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "expense_approval_log_expense_request_id_fkey"
            columns: ["expense_request_id"]
            isOneToOne: false
            referencedRelation: "expense_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          approval_threshold: number | null
          budget_code: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category_id: string | null
          requires_approval: boolean | null
          requires_receipt: boolean | null
        }
        Insert: {
          approval_threshold?: number | null
          budget_code?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category_id?: string | null
          requires_approval?: boolean | null
          requires_receipt?: boolean | null
        }
        Update: {
          approval_threshold?: number | null
          budget_code?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category_id?: string | null
          requires_approval?: boolean | null
          requires_receipt?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          approver_id: string | null
          business_purpose: string
          cost_center: string | null
          created_at: string | null
          currency: string | null
          department_id: string | null
          description: string
          due_date: string | null
          expense_category_id: string
          expense_date: string
          gl_account_code: string | null
          id: string
          justification: string | null
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          priority: string | null
          project_code: string | null
          receipt_urls: string[] | null
          rejection_reason: string | null
          request_number: string
          requested_date: string
          requester_employee_id: string | null
          requester_id: string
          status: string | null
          supporting_documents: string[] | null
          updated_at: string | null
          vendor_account_number: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          business_purpose: string
          cost_center?: string | null
          created_at?: string | null
          currency?: string | null
          department_id?: string | null
          description: string
          due_date?: string | null
          expense_category_id: string
          expense_date: string
          gl_account_code?: string | null
          id?: string
          justification?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          priority?: string | null
          project_code?: string | null
          receipt_urls?: string[] | null
          rejection_reason?: string | null
          request_number: string
          requested_date?: string
          requester_employee_id?: string | null
          requester_id: string
          status?: string | null
          supporting_documents?: string[] | null
          updated_at?: string | null
          vendor_account_number?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          business_purpose?: string
          cost_center?: string | null
          created_at?: string | null
          currency?: string | null
          department_id?: string | null
          description?: string
          due_date?: string | null
          expense_category_id?: string
          expense_date?: string
          gl_account_code?: string | null
          id?: string
          justification?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          priority?: string | null
          project_code?: string | null
          receipt_urls?: string[] | null
          rejection_reason?: string | null
          request_number?: string
          requested_date?: string
          requester_employee_id?: string | null
          requester_id?: string
          status?: string | null
          supporting_documents?: string[] | null
          updated_at?: string | null
          vendor_account_number?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "expense_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "expense_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_requester_employee_id_fkey"
            columns: ["requester_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_requester_employee_id_fkey"
            columns: ["requester_employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "expense_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      experience_analytics: {
        Row: {
          avg_delivery_minutes: number | null
          created_at: string | null
          csat_score: number | null
          date: string
          id: string
          late_delivery_rate: number | null
          nps_score: number | null
          repeat_complaint_rate: number | null
          segment: string
          total_surveys: number | null
        }
        Insert: {
          avg_delivery_minutes?: number | null
          created_at?: string | null
          csat_score?: number | null
          date: string
          id?: string
          late_delivery_rate?: number | null
          nps_score?: number | null
          repeat_complaint_rate?: number | null
          segment?: string
          total_surveys?: number | null
        }
        Update: {
          avg_delivery_minutes?: number | null
          created_at?: string | null
          csat_score?: number | null
          date?: string
          id?: string
          late_delivery_rate?: number | null
          nps_score?: number | null
          repeat_complaint_rate?: number | null
          segment?: string
          total_surveys?: number | null
        }
        Relationships: []
      }
      experience_incidents: {
        Row: {
          created_at: string | null
          description: string
          id: string
          linked_ticket_id: string | null
          notes: string | null
          owner_id: string | null
          reported_at: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
          type: string
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          linked_ticket_id?: string | null
          notes?: string | null
          owner_id?: string | null
          reported_at: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          type: string
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          linked_ticket_id?: string | null
          notes?: string | null
          owner_id?: string | null
          reported_at?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experience_incidents_linked_ticket_id_fkey"
            columns: ["linked_ticket_id"]
            isOneToOne: false
            referencedRelation: "experience_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_incidents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      experience_initiatives: {
        Row: {
          completed_date: string | null
          created_at: string | null
          id: string
          impact_metrics: Json | null
          owner_id: string | null
          plan: string
          problem_statement: string
          root_cause: string | null
          start_date: string
          status: string
          target_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          id?: string
          impact_metrics?: Json | null
          owner_id?: string | null
          plan: string
          problem_statement: string
          root_cause?: string | null
          start_date: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          id?: string
          impact_metrics?: Json | null
          owner_id?: string | null
          plan?: string
          problem_statement?: string
          root_cause?: string | null
          start_date?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experience_initiatives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      experience_metrics_snapshots: {
        Row: {
          at_risk_restaurants_count: number | null
          avg_delivery_minutes: number | null
          cancellation_rate: number | null
          captured_at: string
          created_at: string | null
          delayed_orders: number | null
          driver_offline_count: number | null
          driver_online_count: number | null
          id: string
          max_delivery_minutes: number | null
          open_orders: number | null
          problem_zones: Json | null
          tickets_escalated_count: number | null
          tickets_open_count: number | null
          time_bucket: string
        }
        Insert: {
          at_risk_restaurants_count?: number | null
          avg_delivery_minutes?: number | null
          cancellation_rate?: number | null
          captured_at: string
          created_at?: string | null
          delayed_orders?: number | null
          driver_offline_count?: number | null
          driver_online_count?: number | null
          id?: string
          max_delivery_minutes?: number | null
          open_orders?: number | null
          problem_zones?: Json | null
          tickets_escalated_count?: number | null
          tickets_open_count?: number | null
          time_bucket: string
        }
        Update: {
          at_risk_restaurants_count?: number | null
          avg_delivery_minutes?: number | null
          cancellation_rate?: number | null
          captured_at?: string
          created_at?: string | null
          delayed_orders?: number | null
          driver_offline_count?: number | null
          driver_online_count?: number | null
          id?: string
          max_delivery_minutes?: number | null
          open_orders?: number | null
          problem_zones?: Json | null
          tickets_escalated_count?: number | null
          tickets_open_count?: number | null
          time_bucket?: string
        }
        Relationships: []
      }
      experience_tickets: {
        Row: {
          approved_credit_amount: number | null
          assigned_to: string | null
          category: string
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description: string
          driver_id: string | null
          external_ticket_id: string | null
          id: string
          merchant_id: string | null
          needs_cxo_approval: boolean | null
          priority: string
          resolution_notes: string | null
          root_cause_tag: string | null
          status: string
          summary: string
          type: string
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          approved_credit_amount?: number | null
          assigned_to?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description: string
          driver_id?: string | null
          external_ticket_id?: string | null
          id?: string
          merchant_id?: string | null
          needs_cxo_approval?: boolean | null
          priority?: string
          resolution_notes?: string | null
          root_cause_tag?: string | null
          status?: string
          summary: string
          type: string
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          approved_credit_amount?: number | null
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string
          driver_id?: string | null
          external_ticket_id?: string | null
          id?: string
          merchant_id?: string | null
          needs_cxo_approval?: boolean | null
          priority?: string
          resolution_notes?: string | null
          root_cause_tag?: string | null
          status?: string
          summary?: string
          type?: string
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experience_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "experience_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "experience_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      favorite_restaurants: {
        Row: {
          created_at: string | null
          id: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_restaurants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      finance_audit_log: {
        Row: {
          action_type: string
          compliance_tag: string | null
          entity_id: string | null
          id: number
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          severity: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          compliance_tag?: string | null
          entity_id?: string | null
          id?: number
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          severity?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          compliance_tag?: string | null
          entity_id?: string | null
          id?: number
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          severity?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_audit_log_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      finance_audit_log_2025_01: {
        Row: {
          action_type: string
          compliance_tag: string | null
          entity_id: string | null
          id: number
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          request_id: string | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          severity: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          compliance_tag?: string | null
          entity_id?: string | null
          id?: number
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          severity?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          compliance_tag?: string | null
          entity_id?: string | null
          id?: number
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          severity?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      finance_employees: {
        Row: {
          access_level: number | null
          can_approve_expenses_up_to: number | null
          can_create_budgets: boolean | null
          can_view_all_financials: boolean | null
          created_at: string | null
          employee_id: string
          employment_status: string | null
          hire_date: string
          id: string
          manager_id: string | null
          notes: string | null
          position_id: string
          start_date: string
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          access_level?: number | null
          can_approve_expenses_up_to?: number | null
          can_create_budgets?: boolean | null
          can_view_all_financials?: boolean | null
          created_at?: string | null
          employee_id: string
          employment_status?: string | null
          hire_date?: string
          id?: string
          manager_id?: string | null
          notes?: string | null
          position_id: string
          start_date?: string
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          access_level?: number | null
          can_approve_expenses_up_to?: number | null
          can_create_budgets?: boolean | null
          can_view_all_financials?: boolean | null
          created_at?: string | null
          employee_id?: string
          employment_status?: string | null
          hire_date?: string
          id?: string
          manager_id?: string | null
          notes?: string | null
          position_id?: string
          start_date?: string
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "finance_employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "finance_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "finance_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entities: {
        Row: {
          base_currency: string | null
          consolidation_method: string | null
          country_code: string | null
          created_at: string | null
          entity_code: string
          entity_name: string
          entity_type: string
          fiscal_year_end: string | null
          id: string
          is_active: boolean | null
          legal_structure: string | null
          parent_entity_id: string | null
          reporting_standard: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          base_currency?: string | null
          consolidation_method?: string | null
          country_code?: string | null
          created_at?: string | null
          entity_code: string
          entity_name: string
          entity_type: string
          fiscal_year_end?: string | null
          id?: string
          is_active?: boolean | null
          legal_structure?: string | null
          parent_entity_id?: string | null
          reporting_standard?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          base_currency?: string | null
          consolidation_method?: string | null
          country_code?: string | null
          created_at?: string | null
          entity_code?: string
          entity_name?: string
          entity_type?: string
          fiscal_year_end?: string | null
          id?: string
          is_active?: boolean | null
          legal_structure?: string | null
          parent_entity_id?: string | null
          reporting_standard?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_entities_parent_entity_id_fkey"
            columns: ["parent_entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_permissions: {
        Row: {
          action_type: string
          audit_level: string | null
          description: string | null
          id: string
          permission_code: string
          permission_name: string
          requires_dual_approval: boolean | null
          resource_type: string
        }
        Insert: {
          action_type: string
          audit_level?: string | null
          description?: string | null
          id?: string
          permission_code: string
          permission_name: string
          requires_dual_approval?: boolean | null
          resource_type: string
        }
        Update: {
          action_type?: string
          audit_level?: string | null
          description?: string | null
          id?: string
          permission_code?: string
          permission_name?: string
          requires_dual_approval?: boolean | null
          resource_type?: string
        }
        Relationships: []
      }
      finance_positions: {
        Row: {
          created_at: string | null
          department: string
          id: string
          is_active: boolean | null
          key_responsibilities: string[] | null
          max_salary: number | null
          min_salary: number | null
          position_level: number
          position_title: string
          reports_to_position_id: string | null
          required_education: string | null
          required_experience_years: number | null
          required_skills: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string
          id?: string
          is_active?: boolean | null
          key_responsibilities?: string[] | null
          max_salary?: number | null
          min_salary?: number | null
          position_level: number
          position_title: string
          reports_to_position_id?: string | null
          required_education?: string | null
          required_experience_years?: number | null
          required_skills?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string
          id?: string
          is_active?: boolean | null
          key_responsibilities?: string[] | null
          max_salary?: number | null
          min_salary?: number | null
          position_level?: number
          position_title?: string
          reports_to_position_id?: string | null
          required_education?: string | null
          required_experience_years?: number | null
          required_skills?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_positions_reports_to_position_id_fkey"
            columns: ["reports_to_position_id"]
            isOneToOne: false
            referencedRelation: "finance_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_role_permissions: {
        Row: {
          conditions: Json | null
          permission_id: string
          role_id: string
        }
        Insert: {
          conditions?: Json | null
          permission_id: string
          role_id: string
        }
        Update: {
          conditions?: Json | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "finance_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "finance_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_roles: {
        Row: {
          access_level: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          parent_role_id: string | null
          role_category: string
          role_code: string
          role_name: string
          updated_at: string | null
        }
        Insert: {
          access_level: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_role_id?: string | null
          role_category: string
          role_code: string
          role_name: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_role_id?: string | null
          role_category?: string
          role_code?: string
          role_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_roles_parent_role_id_fkey"
            columns: ["parent_role_id"]
            isOneToOne: false
            referencedRelation: "finance_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transaction_limits: {
        Row: {
          created_at: string | null
          dual_approval_threshold: number | null
          id: string
          max_amount: number | null
          requires_dual_approval: boolean | null
          role_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          dual_approval_threshold?: number | null
          id?: string
          max_amount?: number | null
          requires_dual_approval?: boolean | null
          role_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          dual_approval_threshold?: number | null
          id?: string
          max_amount?: number | null
          requires_dual_approval?: boolean | null
          role_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transaction_limits_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "finance_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_user_roles: {
        Row: {
          approval_notes: string | null
          approval_status: string | null
          assigned_by: string | null
          created_at: string | null
          department_codes: string[] | null
          effective_date: string
          entity_id: string | null
          expiration_date: string | null
          gl_account_ranges: string[] | null
          id: string
          region_codes: string[] | null
          role_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          assigned_by?: string | null
          created_at?: string | null
          department_codes?: string[] | null
          effective_date?: string
          entity_id?: string | null
          expiration_date?: string | null
          gl_account_ranges?: string[] | null
          id?: string
          region_codes?: string[] | null
          role_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          assigned_by?: string | null
          created_at?: string | null
          department_codes?: string[] | null
          effective_date?: string
          entity_id?: string | null
          expiration_date?: string | null
          gl_account_ranges?: string[] | null
          id?: string
          region_codes?: string[] | null
          role_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_user_roles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "finance_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financial_controls: {
        Row: {
          category: string
          control_name: string
          created_at: string | null
          id: string
          last_tested: string | null
          owner: string
          status: string
          updated_at: string | null
        }
        Insert: {
          category: string
          control_name: string
          created_at?: string | null
          id?: string
          last_tested?: string | null
          owner: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          control_name?: string
          created_at?: string | null
          id?: string
          last_tested?: string | null
          owner?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_reports: {
        Row: {
          created_at: string | null
          excel_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          is_public: boolean | null
          pdf_url: string | null
          report_data: Json
          report_name: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status: string | null
          summary: string | null
        }
        Insert: {
          created_at?: string | null
          excel_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_public?: boolean | null
          pdf_url?: string | null
          report_data: Json
          report_name: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status?: string | null
          summary?: string | null
        }
        Update: {
          created_at?: string | null
          excel_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_public?: boolean | null
          pdf_url?: string | null
          report_data?: Json
          report_name?: string
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          status?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financial_scenarios: {
        Row: {
          base_expenses: number
          base_revenue: number
          created_at: string | null
          id: string
          optimistic_expenses: number
          optimistic_revenue: number
          pessimistic_expenses: number
          pessimistic_revenue: number
          scenario_name: string
          updated_at: string | null
        }
        Insert: {
          base_expenses?: number
          base_revenue?: number
          created_at?: string | null
          id?: string
          optimistic_expenses?: number
          optimistic_revenue?: number
          pessimistic_expenses?: number
          pessimistic_revenue?: number
          scenario_name: string
          updated_at?: string | null
        }
        Update: {
          base_expenses?: number
          base_revenue?: number
          created_at?: string | null
          id?: string
          optimistic_expenses?: number
          optimistic_revenue?: number
          pessimistic_expenses?: number
          pessimistic_revenue?: number
          scenario_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fleet_vehicles: {
        Row: {
          created_at: string | null
          driver_id: string | null
          id: string
          inspection_due: string | null
          insurance_expiry: string | null
          license_plate: string | null
          registration_expiry: string | null
          status: string | null
          vehicle_type: string
        }
        Insert: {
          created_at?: string | null
          driver_id?: string | null
          id?: string
          inspection_due?: string | null
          insurance_expiry?: string | null
          license_plate?: string | null
          registration_expiry?: string | null
          status?: string | null
          vehicle_type: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string | null
          id?: string
          inspection_due?: string | null
          insurance_expiry?: string | null
          license_plate?: string | null
          registration_expiry?: string | null
          status?: string | null
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      foundational_access_logs: {
        Row: {
          accessed_at: string | null
          created_at: string | null
          email: string
          id: string
          invite_id: string | null
          ip_address: string | null
          page_accessed: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          invite_id?: string | null
          ip_address?: string | null
          page_accessed?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invite_id?: string | null
          ip_address?: string | null
          page_accessed?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "foundational_access_logs_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "foundational_invite_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foundational_access_logs_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
      }
      foundational_documents: {
        Row: {
          certificate_number: string | null
          contribution_order_id: string | null
          contributor_email: string
          contributor_id: string | null
          contributor_name: string | null
          created_at: string | null
          document_title: string
          document_type: string
          equity_issuance_id: string | null
          file_url: string
          id: string
          meta: Json | null
          pool_code: string | null
        }
        Insert: {
          certificate_number?: string | null
          contribution_order_id?: string | null
          contributor_email: string
          contributor_id?: string | null
          contributor_name?: string | null
          created_at?: string | null
          document_title: string
          document_type: string
          equity_issuance_id?: string | null
          file_url: string
          id?: string
          meta?: Json | null
          pool_code?: string | null
        }
        Update: {
          certificate_number?: string | null
          contribution_order_id?: string | null
          contributor_email?: string
          contributor_id?: string | null
          contributor_name?: string | null
          created_at?: string | null
          document_title?: string
          document_type?: string
          equity_issuance_id?: string | null
          file_url?: string
          id?: string
          meta?: Json | null
          pool_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "foundational_documents_contribution_order_id_fkey"
            columns: ["contribution_order_id"]
            isOneToOne: false
            referencedRelation: "contribution_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foundational_documents_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "foundational_documents_equity_issuance_id_fkey"
            columns: ["equity_issuance_id"]
            isOneToOne: false
            referencedRelation: "equity_issuances"
            referencedColumns: ["id"]
          },
        ]
      }
      gas_money_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          destination: string | null
          driver_id: string
          id: string
          notes: string | null
          order_id: string | null
          status: string
          transaction_type: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          destination?: string | null
          driver_id: string
          id?: string
          notes?: string | null
          order_id?: string | null
          status?: string
          transaction_type: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          destination?: string | null
          driver_id?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gas_money_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gas_money_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gas_money_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gas_money_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      gl_account_assignments: {
        Row: {
          access_level: string
          account_name: string | null
          account_number: string
          assigned_user_id: string | null
          assignment_type: string
          created_at: string | null
          effective_date: string
          entity_id: string | null
          expiration_date: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          access_level: string
          account_name?: string | null
          account_number: string
          assigned_user_id?: string | null
          assignment_type: string
          created_at?: string | null
          effective_date?: string
          entity_id?: string | null
          expiration_date?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string
          account_name?: string | null
          account_number?: string
          assigned_user_id?: string | null
          assignment_type?: string
          created_at?: string | null
          effective_date?: string
          entity_id?: string | null
          expiration_date?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_account_assignments_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gl_account_assignments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          cc_address: string | null
          created_at: string | null
          delegated_user: string
          folder: string | null
          from_address: string | null
          gmail_message_id: string
          gmail_thread_id: string | null
          has_attachments: boolean | null
          id: string
          is_read: boolean | null
          is_starred: boolean | null
          label_ids: string[] | null
          raw_headers: Json | null
          received_at: string | null
          subject: string | null
          synced_at: string | null
          to_address: string | null
          updated_at: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          cc_address?: string | null
          created_at?: string | null
          delegated_user: string
          folder?: string | null
          from_address?: string | null
          gmail_message_id: string
          gmail_thread_id?: string | null
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          label_ids?: string[] | null
          raw_headers?: Json | null
          received_at?: string | null
          subject?: string | null
          synced_at?: string | null
          to_address?: string | null
          updated_at?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          cc_address?: string | null
          created_at?: string | null
          delegated_user?: string
          folder?: string | null
          from_address?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string | null
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          label_ids?: string[] | null
          raw_headers?: Json | null
          received_at?: string | null
          subject?: string | null
          synced_at?: string | null
          to_address?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gmail_sync_state: {
        Row: {
          created_at: string | null
          delegated_user: string
          delta_token: string | null
          history_id: string | null
          id: string
          last_sync_at: string | null
          subscription_expires_at: string | null
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delegated_user: string
          delta_token?: string | null
          history_id?: string | null
          id?: string
          last_sync_at?: string | null
          subscription_expires_at?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delegated_user?: string
          delta_token?: string | null
          history_id?: string | null
          id?: string
          last_sync_at?: string | null
          subscription_expires_at?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      governance_board_resolutions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          effective_date: string | null
          id: string
          meeting_date: string | null
          metadata: Json | null
          related_officer_id: string | null
          resolution_number: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          meeting_date?: string | null
          metadata?: Json | null
          related_officer_id?: string | null
          resolution_number: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          meeting_date?: string | null
          metadata?: Json | null
          related_officer_id?: string | null
          resolution_number?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_board_resolutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      governance_log: {
        Row: {
          action_category: string
          action_type: string
          company_id: string | null
          description: string
          id: string
          metadata: Json | null
          performed_at: string
          performed_by: string | null
          target_id: string | null
          target_name: string | null
          target_type: string | null
        }
        Insert: {
          action_category: string
          action_type: string
          company_id?: string | null
          description: string
          id?: string
          metadata?: Json | null
          performed_at?: string
          performed_by?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Update: {
          action_category?: string
          action_type?: string
          company_id?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          performed_at?: string
          performed_by?: string | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      governance_logs: {
        Row: {
          action: string
          actor_id: string | null
          data: Json | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          timestamp: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          data?: Json | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          timestamp?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          data?: Json | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      holding_companies: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      hotspots: {
        Row: {
          claimed_by: string | null
          created_at: string | null
          expires_at: string
          id: string
          lat: number
          lng: number
          order_id: string
        }
        Insert: {
          claimed_by?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          lat: number
          lng: number
          order_id: string
        }
        Update: {
          claimed_by?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          lat?: number
          lng?: number
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotspots_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hotspots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotspots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      iboe_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          template_key: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          template_key: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iboe_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      infrastructure_capacity_plans: {
        Row: {
          action_priority: string | null
          created_at: string | null
          current_capacity: number
          current_utilization: number
          estimated_cost: number | null
          id: string
          notes: string | null
          projected_growth_rate: number | null
          projected_utilization_date: string | null
          recommended_action: string | null
          resource_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          service_id: string | null
          updated_at: string | null
          utilization_percent: number | null
        }
        Insert: {
          action_priority?: string | null
          created_at?: string | null
          current_capacity: number
          current_utilization: number
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          projected_growth_rate?: number | null
          projected_utilization_date?: string | null
          recommended_action?: string | null
          resource_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string | null
          updated_at?: string | null
          utilization_percent?: number | null
        }
        Update: {
          action_priority?: string | null
          created_at?: string | null
          current_capacity?: number
          current_utilization?: number
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          projected_growth_rate?: number | null
          projected_utilization_date?: string | null
          recommended_action?: string | null
          resource_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string | null
          updated_at?: string | null
          utilization_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_capacity_plans_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      infrastructure_changes: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          affected_services: string[] | null
          approved_by: string | null
          change_number: string
          change_type: string
          created_at: string | null
          description: string
          id: string
          implementation_notes: string | null
          implemented_by: string | null
          planned_end: string
          planned_start: string
          post_implementation_review: string | null
          requested_by: string | null
          risk_assessment: string | null
          rollback_plan: string | null
          status: string | null
          testing_notes: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          affected_services?: string[] | null
          approved_by?: string | null
          change_number: string
          change_type: string
          created_at?: string | null
          description: string
          id?: string
          implementation_notes?: string | null
          implemented_by?: string | null
          planned_end: string
          planned_start: string
          post_implementation_review?: string | null
          requested_by?: string | null
          risk_assessment?: string | null
          rollback_plan?: string | null
          status?: string | null
          testing_notes?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          affected_services?: string[] | null
          approved_by?: string | null
          change_number?: string
          change_type?: string
          created_at?: string | null
          description?: string
          id?: string
          implementation_notes?: string | null
          implemented_by?: string | null
          planned_end?: string
          planned_start?: string
          post_implementation_review?: string | null
          requested_by?: string | null
          risk_assessment?: string | null
          rollback_plan?: string | null
          status?: string | null
          testing_notes?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_changes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "infrastructure_changes_implemented_by_fkey"
            columns: ["implemented_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "infrastructure_changes_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      infrastructure_cost_optimizations: {
        Row: {
          actual_savings: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          current_cost: number
          id: string
          implementation_effort: string | null
          implemented_at: string | null
          optimization_type: string
          potential_savings: number
          recommendation: string
          resource_id: string | null
          resource_type: string
          risk_level: string | null
          savings_percent: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_savings?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          current_cost: number
          id?: string
          implementation_effort?: string | null
          implemented_at?: string | null
          optimization_type: string
          potential_savings: number
          recommendation: string
          resource_id?: string | null
          resource_type: string
          risk_level?: string | null
          savings_percent?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_savings?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          current_cost?: number
          id?: string
          implementation_effort?: string | null
          implemented_at?: string | null
          optimization_type?: string
          potential_savings?: number
          recommendation?: string
          resource_id?: string | null
          resource_type?: string
          risk_level?: string | null
          savings_percent?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_cost_optimizations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "infrastructure_cost_optimizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      infrastructure_incidents: {
        Row: {
          acknowledged_at: string | null
          affected_services: string[] | null
          affected_users: number | null
          assigned_team: string | null
          assigned_to: string | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string
          detected_at: string
          follow_up_required: boolean | null
          id: string
          incident_number: string
          metadata: Json | null
          post_mortem_url: string | null
          priority: string
          resolution_notes: string | null
          resolution_steps: Json | null
          resolved_at: string | null
          revenue_impact: number | null
          root_cause: string | null
          service_impact: string | null
          severity: string
          sla_breach: boolean | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          affected_services?: string[] | null
          affected_users?: number | null
          assigned_team?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          detected_at?: string
          follow_up_required?: boolean | null
          id?: string
          incident_number: string
          metadata?: Json | null
          post_mortem_url?: string | null
          priority?: string
          resolution_notes?: string | null
          resolution_steps?: Json | null
          resolved_at?: string | null
          revenue_impact?: number | null
          root_cause?: string | null
          service_impact?: string | null
          severity: string
          sla_breach?: boolean | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          affected_services?: string[] | null
          affected_users?: number | null
          assigned_team?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          detected_at?: string
          follow_up_required?: boolean | null
          id?: string
          incident_number?: string
          metadata?: Json | null
          post_mortem_url?: string | null
          priority?: string
          resolution_notes?: string | null
          resolution_steps?: Json | null
          resolved_at?: string | null
          revenue_impact?: number | null
          root_cause?: string | null
          service_impact?: string | null
          severity?: string
          sla_breach?: boolean | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "infrastructure_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      infrastructure_provisioning_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completion_notes: string | null
          created_at: string | null
          estimated_cost: number | null
          id: string
          justification: string
          priority: string | null
          provider: string
          provisioned_at: string | null
          provisioned_by: string | null
          request_number: string
          request_type: string
          requested_at: string | null
          requested_by: string | null
          resource_type: string
          service_name: string
          specifications: Json
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          justification: string
          priority?: string | null
          provider: string
          provisioned_at?: string | null
          provisioned_by?: string | null
          request_number: string
          request_type: string
          requested_at?: string | null
          requested_by?: string | null
          resource_type: string
          service_name: string
          specifications: Json
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          justification?: string
          priority?: string | null
          provider?: string
          provisioned_at?: string | null
          provisioned_by?: string | null
          request_number?: string
          request_type?: string
          requested_at?: string | null
          requested_by?: string | null
          resource_type?: string
          service_name?: string
          specifications?: Json
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_provisioning_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "infrastructure_provisioning_requests_provisioned_by_fkey"
            columns: ["provisioned_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "infrastructure_provisioning_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      infrastructure_slas: {
        Row: {
          breach_count: number | null
          created_at: string | null
          current_value: number | null
          id: string
          is_active: boolean | null
          last_measured_at: string | null
          measurement_period: string
          service_id: string | null
          sla_name: string
          sla_type: string
          status: string | null
          target_value: number
          updated_at: string | null
        }
        Insert: {
          breach_count?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          is_active?: boolean | null
          last_measured_at?: string | null
          measurement_period?: string
          service_id?: string | null
          sla_name: string
          sla_type: string
          status?: string | null
          target_value: number
          updated_at?: string | null
        }
        Update: {
          breach_count?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          is_active?: boolean | null
          last_measured_at?: string | null
          measurement_period?: string
          service_id?: string | null
          sla_name?: string
          sla_type?: string
          status?: string | null
          target_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      intern_activation_status: {
        Row: {
          activated_at: string | null
          core_modules_completed: boolean | null
          created_at: string | null
          id: string
          is_activated: boolean | null
          onboarding_started_at: string | null
          role_modules_completed: boolean | null
          role_track: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          core_modules_completed?: boolean | null
          created_at?: string | null
          id?: string
          is_activated?: boolean | null
          onboarding_started_at?: string | null
          role_modules_completed?: boolean | null
          role_track: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          core_modules_completed?: boolean | null
          created_at?: string | null
          id?: string
          is_activated?: boolean | null
          onboarding_started_at?: string | null
          role_modules_completed?: boolean | null
          role_track?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intern_activation_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_certifications: {
        Row: {
          certificate_url: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          module_id: string
          module_name: string
          score: number
          user_id: string
          verification_code: string | null
        }
        Insert: {
          certificate_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          module_id: string
          module_name: string
          score: number
          user_id: string
          verification_code?: string | null
        }
        Update: {
          certificate_url?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          module_id?: string
          module_name?: string
          score?: number
          user_id?: string
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_certifications_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "intern_training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_enforcement_actions: {
        Row: {
          action_type: string
          engagement_id: string
          id: string
          is_active: boolean | null
          performed_at: string | null
          performed_by: string
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          action_type: string
          engagement_id: string
          id?: string
          is_active?: boolean | null
          performed_at?: string | null
          performed_by: string
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          action_type?: string
          engagement_id?: string
          id?: string
          is_active?: boolean | null
          performed_at?: string | null
          performed_by?: string
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_enforcement_actions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_enforcement_actions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_enforcement_actions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_enforcement_requests: {
        Row: {
          action_type: string
          created_at: string | null
          decided_at: string | null
          engagement_id: string
          evidence_links: string[] | null
          id: string
          reason: string
          recommended_duration: number | null
          requested_by: string
          severity: string
          sponsor_comment: string | null
          sponsor_id: string | null
          sponsor_reason_code: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          decided_at?: string | null
          engagement_id: string
          evidence_links?: string[] | null
          id?: string
          reason: string
          recommended_duration?: number | null
          requested_by: string
          severity?: string
          sponsor_comment?: string | null
          sponsor_id?: string | null
          sponsor_reason_code?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          decided_at?: string | null
          engagement_id?: string
          evidence_links?: string[] | null
          id?: string
          reason?: string
          recommended_duration?: number | null
          requested_by?: string
          severity?: string
          sponsor_comment?: string | null
          sponsor_id?: string | null
          sponsor_reason_code?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_enforcement_requests_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_enforcement_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_enforcement_requests_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_module_progress: {
        Row: {
          attempts: number | null
          completed_at: string | null
          id: string
          last_activity_at: string | null
          module_id: string
          progress_percent: number | null
          score: number | null
          started_at: string | null
          status: string
          time_spent_minutes: number | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          id?: string
          last_activity_at?: string | null
          module_id: string
          progress_percent?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          time_spent_minutes?: number | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          id?: string
          last_activity_at?: string | null
          module_id?: string
          progress_percent?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          time_spent_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intern_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "intern_training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_module_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_module_unlocks: {
        Row: {
          id: string
          module_id: string
          reason: string
          unlocked_at: string | null
          unlocked_by: string
          user_id: string
        }
        Insert: {
          id?: string
          module_id: string
          reason: string
          unlocked_at?: string | null
          unlocked_by: string
          user_id: string
        }
        Update: {
          id?: string
          module_id?: string
          reason?: string
          unlocked_at?: string | null
          unlocked_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intern_module_unlocks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "intern_training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_module_unlocks_unlocked_by_fkey"
            columns: ["unlocked_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_module_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_program_audit_log: {
        Row: {
          action: string
          actor_id: string
          affected_user_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          reason: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          affected_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          reason: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          affected_user_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_program_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_program_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          placeholders: string[] | null
          template_type: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          placeholders?: string[] | null
          template_type: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          placeholders?: string[] | null
          template_type?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_program_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_promotion_requests: {
        Row: {
          created_at: string | null
          decided_at: string | null
          eligibility_snapshot: Json
          eligibility_status: string
          engagement_id: string
          id: string
          manager_recommendation: string | null
          requested_by: string
          sponsor_comment: string | null
          sponsor_decision: string | null
          sponsor_id: string | null
          sponsor_reason_code: string | null
          status: string
          target_role_state: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decided_at?: string | null
          eligibility_snapshot?: Json
          eligibility_status?: string
          engagement_id: string
          id?: string
          manager_recommendation?: string | null
          requested_by: string
          sponsor_comment?: string | null
          sponsor_decision?: string | null
          sponsor_id?: string | null
          sponsor_reason_code?: string | null
          status?: string
          target_role_state: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decided_at?: string | null
          eligibility_snapshot?: Json
          eligibility_status?: string
          engagement_id?: string
          id?: string
          manager_recommendation?: string | null
          requested_by?: string
          sponsor_comment?: string | null
          sponsor_decision?: string | null
          sponsor_id?: string | null
          sponsor_reason_code?: string | null
          status?: string
          target_role_state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_promotion_requests_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_promotion_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_promotion_requests_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_promotion_rules: {
        Row: {
          acting_term_completed: boolean | null
          compliance_required: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          from_state: string
          id: string
          is_active: boolean | null
          min_passed_tests: number | null
          min_review_score: number | null
          min_tenure_days: number | null
          min_test_level: string | null
          priority: number | null
          required_categories: string[] | null
          rule_name: string
          sponsor_approval_required: boolean | null
          to_state: string
          updated_at: string | null
        }
        Insert: {
          acting_term_completed?: boolean | null
          compliance_required?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          from_state: string
          id?: string
          is_active?: boolean | null
          min_passed_tests?: number | null
          min_review_score?: number | null
          min_tenure_days?: number | null
          min_test_level?: string | null
          priority?: number | null
          required_categories?: string[] | null
          rule_name: string
          sponsor_approval_required?: boolean | null
          to_state: string
          updated_at?: string | null
        }
        Update: {
          acting_term_completed?: boolean | null
          compliance_required?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          from_state?: string
          id?: string
          is_active?: boolean | null
          min_passed_tests?: number | null
          min_review_score?: number | null
          min_tenure_days?: number | null
          min_test_level?: string | null
          priority?: number | null
          required_categories?: string[] | null
          rule_name?: string
          sponsor_approval_required?: boolean | null
          to_state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_promotion_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_role_tracks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          leadership_required: boolean | null
          minimum_test_level: string | null
          name: string
          recommended_test_modules: string[] | null
          required_competency_tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          leadership_required?: boolean | null
          minimum_test_level?: string | null
          name: string
          recommended_test_modules?: string[] | null
          required_competency_tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          leadership_required?: boolean | null
          minimum_test_level?: string | null
          name?: string
          recommended_test_modules?: string[] | null
          required_competency_tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      intern_sponsor_notes: {
        Row: {
          context: string | null
          created_at: string
          engagement_id: string
          id: string
          note_text: string
          related_request_id: string | null
          related_request_type: string | null
          sponsor_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          engagement_id: string
          id?: string
          note_text: string
          related_request_id?: string | null
          related_request_type?: string | null
          sponsor_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          engagement_id?: string
          id?: string
          note_text?: string
          related_request_id?: string | null
          related_request_type?: string | null
          sponsor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intern_sponsor_notes_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_sponsor_notes_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_test_assignments: {
        Row: {
          artifact_url: string | null
          assigned_at: string | null
          assigned_by: string | null
          attempts: number | null
          due_date: string | null
          engagement_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          score: number | null
          status: string
          submitted_at: string | null
          test_module_id: string
        }
        Insert: {
          artifact_url?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          attempts?: number | null
          due_date?: string | null
          engagement_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          score?: number | null
          status?: string
          submitted_at?: string | null
          test_module_id: string
        }
        Update: {
          artifact_url?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          attempts?: number | null
          due_date?: string | null
          engagement_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          score?: number | null
          status?: string
          submitted_at?: string | null
          test_module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intern_test_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_test_assignments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_test_assignments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intern_test_assignments_test_module_id_fkey"
            columns: ["test_module_id"]
            isOneToOne: false
            referencedRelation: "intern_test_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      intern_test_modules: {
        Row: {
          allowed_role_states: string[] | null
          artifact_required: boolean | null
          category: string
          competency_tags: string[] | null
          content_json: Json | null
          counts_toward_promotion: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          instructions: string | null
          is_archived: boolean | null
          level: string
          name: string
          pass_threshold: number
          retake_limit: number | null
          reviewer_type: string
          test_type: string
          time_limit_minutes: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          allowed_role_states?: string[] | null
          artifact_required?: boolean | null
          category: string
          competency_tags?: string[] | null
          content_json?: Json | null
          counts_toward_promotion?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          is_archived?: boolean | null
          level: string
          name: string
          pass_threshold?: number
          retake_limit?: number | null
          reviewer_type?: string
          test_type: string
          time_limit_minutes?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          allowed_role_states?: string[] | null
          artifact_required?: boolean | null
          category?: string
          competency_tags?: string[] | null
          content_json?: Json | null
          counts_toward_promotion?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          is_archived?: boolean | null
          level?: string
          name?: string
          pass_threshold?: number
          retake_limit?: number | null
          reviewer_type?: string
          test_type?: string
          time_limit_minutes?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_test_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      intern_training_modules: {
        Row: {
          admin_unlock_only: boolean | null
          certification_issued: boolean | null
          content_json: Json | null
          content_url: string | null
          created_at: string | null
          delivery_type: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          passing_score: number | null
          performance_flag_required: boolean | null
          prerequisite_module_ids: string[] | null
          scope: string
          sort_order: number | null
          unlock_after_weeks: number | null
          updated_at: string | null
        }
        Insert: {
          admin_unlock_only?: boolean | null
          certification_issued?: boolean | null
          content_json?: Json | null
          content_url?: string | null
          created_at?: string | null
          delivery_type: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          passing_score?: number | null
          performance_flag_required?: boolean | null
          prerequisite_module_ids?: string[] | null
          scope: string
          sort_order?: number | null
          unlock_after_weeks?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_unlock_only?: boolean | null
          certification_issued?: boolean | null
          content_json?: Json | null
          content_url?: string | null
          created_at?: string | null
          delivery_type?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          passing_score?: number | null
          performance_flag_required?: boolean | null
          prerequisite_module_ids?: string[] | null
          scope?: string
          sort_order?: number | null
          unlock_after_weeks?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      investment_opportunities: {
        Row: {
          banner_url: string | null
          business_description: string | null
          company_name: string
          created_at: string | null
          created_by: string | null
          deal_description: string | null
          documents: Json | null
          financials: Json | null
          gallery_images: string[] | null
          highlights: string[] | null
          id: string
          investment_raised: number | null
          investor_role: string
          is_active: boolean | null
          location: string
          logo_url: string | null
          market_description: string | null
          minimum_investment: number
          objectives_description: string | null
          previous_rounds: number | null
          progress_description: string | null
          short_summary: string
          stage: string
          tags: string[] | null
          target_amount: number
          team_members: Json | null
          updated_at: string | null
          video_url: string | null
          why_we_win: string | null
        }
        Insert: {
          banner_url?: string | null
          business_description?: string | null
          company_name: string
          created_at?: string | null
          created_by?: string | null
          deal_description?: string | null
          documents?: Json | null
          financials?: Json | null
          gallery_images?: string[] | null
          highlights?: string[] | null
          id?: string
          investment_raised?: number | null
          investor_role: string
          is_active?: boolean | null
          location: string
          logo_url?: string | null
          market_description?: string | null
          minimum_investment: number
          objectives_description?: string | null
          previous_rounds?: number | null
          progress_description?: string | null
          short_summary: string
          stage: string
          tags?: string[] | null
          target_amount: number
          team_members?: Json | null
          updated_at?: string | null
          video_url?: string | null
          why_we_win?: string | null
        }
        Update: {
          banner_url?: string | null
          business_description?: string | null
          company_name?: string
          created_at?: string | null
          created_by?: string | null
          deal_description?: string | null
          documents?: Json | null
          financials?: Json | null
          gallery_images?: string[] | null
          highlights?: string[] | null
          id?: string
          investment_raised?: number | null
          investor_role?: string
          is_active?: boolean | null
          location?: string
          logo_url?: string | null
          market_description?: string | null
          minimum_investment?: number
          objectives_description?: string | null
          previous_rounds?: number | null
          progress_description?: string | null
          short_summary?: string
          stage?: string
          tags?: string[] | null
          target_amount?: number
          team_members?: Json | null
          updated_at?: string | null
          video_url?: string | null
          why_we_win?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investor_access_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          investor_type: string
          linkedin_url: string | null
          location: string | null
          notes: string | null
          organization: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          investor_type: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          organization?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          investor_type?: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          organization?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "investor_access_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investor_demo_access: {
        Row: {
          access_code: string | null
          access_count: number | null
          access_token: string
          created_at: string | null
          email: string
          expires_at: string | null
          full_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          last_accessed_at: string | null
          notes: string | null
          organization: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          access_code?: string | null
          access_count?: number | null
          access_token: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_accessed_at?: string | null
          notes?: string | null
          organization?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          access_code?: string | null
          access_count?: number | null
          access_token?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_accessed_at?: string | null
          notes?: string | null
          organization?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_demo_access_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investor_demo_access_logs: {
        Row: {
          access_id: string | null
          accessed_at: string | null
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          session_duration_seconds: number | null
          user_agent: string | null
          view_type: string
        }
        Insert: {
          access_id?: string | null
          accessed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          session_duration_seconds?: number | null
          user_agent?: string | null
          view_type: string
        }
        Update: {
          access_id?: string | null
          accessed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          session_duration_seconds?: number | null
          user_agent?: string | null
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_demo_access_logs_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "investor_demo_access"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_intake: {
        Row: {
          accepted_at: string | null
          acknowledgment_accepted: boolean
          admin_notes: string | null
          capital_range: string | null
          created_at: string | null
          email: string
          entity_name: string | null
          full_name: string
          id: string
          investor_type: string
          ip_address: string | null
          jurisdiction: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          acknowledgment_accepted?: boolean
          admin_notes?: string | null
          capital_range?: string | null
          created_at?: string | null
          email: string
          entity_name?: string | null
          full_name: string
          id?: string
          investor_type: string
          ip_address?: string | null
          jurisdiction?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          acknowledgment_accepted?: boolean
          admin_notes?: string | null
          capital_range?: string | null
          created_at?: string | null
          email?: string
          entity_name?: string | null
          full_name?: string
          id?: string
          investor_type?: string
          ip_address?: string | null
          jurisdiction?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_intake_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "investor_intake_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investor_interests: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          investment_range: string | null
          investor_type: string | null
          message: string | null
          notes: string | null
          opportunity_id: string
          phone: string | null
          shortlisted: boolean | null
          source: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          investment_range?: string | null
          investor_type?: string | null
          message?: string | null
          notes?: string | null
          opportunity_id: string
          phone?: string | null
          shortlisted?: boolean | null
          source?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          investment_range?: string | null
          investor_type?: string | null
          message?: string | null
          notes?: string | null
          opportunity_id?: string
          phone?: string | null
          shortlisted?: boolean | null
          source?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_interests_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "investment_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          access_status: string
          accreditation_self_certified_at: string | null
          accreditation_status: string | null
          created_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_status?: string
          accreditation_self_certified_at?: string | null
          accreditation_status?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_status?: string
          accreditation_self_certified_at?: string | null
          accreditation_status?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investor_shortlists: {
        Row: {
          created_at: string | null
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_shortlists_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "investment_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_shortlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investor_updates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          sent_date: string | null
          status: string
          update_content: string
          update_title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          sent_date?: string | null
          status?: string
          update_content: string
          update_title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          sent_date?: string | null
          status?: string
          update_content?: string
          update_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      investors: {
        Row: {
          contact_email: string | null
          created_at: string | null
          id: string
          investment_amount: number
          investment_date: string
          investor_name: string
          investor_type: string
          ownership_percent: number
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          id?: string
          investment_amount?: number
          investment_date: string
          investor_name: string
          investor_type: string
          ownership_percent?: number
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          id?: string
          investment_amount?: number
          investment_date?: string
          investor_name?: string
          investor_type?: string
          ownership_percent?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          access_code: string
          access_count: number | null
          created_at: string | null
          email: string
          expires_at: string | null
          full_name: string | null
          id: string
          last_accessed_at: string | null
          max_amount_cents: number
          min_amount_cents: number
          paid_amount_cents: number | null
          paid_at: string | null
          relationship_note: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          access_code: string
          access_count?: number | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          full_name?: string | null
          id?: string
          last_accessed_at?: string | null
          max_amount_cents?: number
          min_amount_cents?: number
          paid_amount_cents?: number | null
          paid_at?: string | null
          relationship_note?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          access_code?: string
          access_count?: number | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          full_name?: string | null
          id?: string
          last_accessed_at?: string | null
          max_amount_cents?: number
          min_amount_cents?: number
          paid_amount_cents?: number | null
          paid_at?: string | null
          relationship_note?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_email_logs: {
        Row: {
          created_at: string | null
          email_from: string
          email_received_at: string | null
          email_subject: string | null
          error_message: string | null
          extracted_data: Json | null
          id: string
          invoice_id: string | null
          processing_status: string | null
        }
        Insert: {
          created_at?: string | null
          email_from: string
          email_received_at?: string | null
          email_subject?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          invoice_id?: string | null
          processing_status?: string | null
        }
        Update: {
          created_at?: string | null
          email_from?: string
          email_received_at?: string | null
          email_subject?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          invoice_id?: string | null
          processing_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_email_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          approver_id: string | null
          budget_id: string | null
          created_at: string | null
          currency: string | null
          department_id: string | null
          due_date: string
          expense_category_id: string | null
          id: string
          invoice_date: string
          invoice_file_url: string | null
          invoice_number: string
          line_items: Json | null
          notes: string | null
          paid_by: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          purchase_order_id: string | null
          status: string | null
          supporting_documents: string[] | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          vendor_address: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          budget_id?: string | null
          created_at?: string | null
          currency?: string | null
          department_id?: string | null
          due_date: string
          expense_category_id?: string | null
          id?: string
          invoice_date: string
          invoice_file_url?: string | null
          invoice_number: string
          line_items?: Json | null
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          purchase_order_id?: string | null
          status?: string | null
          supporting_documents?: string[] | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_address?: string | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          budget_id?: string | null
          created_at?: string | null
          currency?: string | null
          department_id?: string | null
          due_date?: string
          expense_category_id?: string | null
          id?: string
          invoice_date?: string
          invoice_file_url?: string | null
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          purchase_order_id?: string | null
          status?: string | null
          supporting_documents?: string[] | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_address?: string | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partner_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      it_assets: {
        Row: {
          asset_name: string
          asset_type: string
          assigned_to: string | null
          created_at: string | null
          id: string
          manufacturer: string | null
          metadata: Json | null
          model: string | null
          purchase_cost: number | null
          purchase_date: string | null
          serial_number: string | null
          status: string | null
          warranty_expiry: string | null
        }
        Insert: {
          asset_name: string
          asset_type: string
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          manufacturer?: string | null
          metadata?: Json | null
          model?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          asset_name?: string
          asset_type?: string
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          manufacturer?: string | null
          metadata?: Json | null
          model?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "it_assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      it_help_desk_messages: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "it_help_desk_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "it_help_desk_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "it_help_desk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      it_help_desk_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          description: string
          id: string
          priority: string | null
          requester_id: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          requester_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          ticket_number: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          requester_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "it_help_desk_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "it_help_desk_tickets_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      it_incidents: {
        Row: {
          affected_services: string[] | null
          assigned_to: string | null
          created_at: string | null
          description: string
          id: string
          incident_type: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string | null
          title: string
        }
        Insert: {
          affected_services?: string[] | null
          assigned_to?: string | null
          created_at?: string | null
          description: string
          id?: string
          incident_type: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          title: string
        }
        Update: {
          affected_services?: string[] | null
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          id?: string
          incident_type?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "it_incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "it_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "it_incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      it_infrastructure: {
        Row: {
          created_at: string | null
          id: string
          last_check: string | null
          metadata: Json | null
          response_time_ms: number | null
          service_name: string
          service_provider: string | null
          status: string | null
          uptime_percent: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_check?: string | null
          metadata?: Json | null
          response_time_ms?: number | null
          service_name: string
          service_provider?: string | null
          status?: string | null
          uptime_percent?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_check?: string | null
          metadata?: Json | null
          response_time_ms?: number | null
          service_name?: string
          service_provider?: string | null
          status?: string | null
          uptime_percent?: number | null
        }
        Relationships: []
      }
      job_applicants: {
        Row: {
          ai_analysis: Json | null
          applicant_role: string | null
          applied_date: string | null
          created_at: string | null
          created_by: string | null
          current_company: string | null
          education: string | null
          email: string
          fit_score: number | null
          id: string
          job_posting_id: string | null
          linkedin_url: string | null
          location: string | null
          name: string
          phone: string | null
          resume_file_path: string | null
          resume_text: string | null
          skills: string[] | null
          source: string | null
          status: string | null
          summary: string | null
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          applicant_role?: string | null
          applied_date?: string | null
          created_at?: string | null
          created_by?: string | null
          current_company?: string | null
          education?: string | null
          email: string
          fit_score?: number | null
          id?: string
          job_posting_id?: string | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          phone?: string | null
          resume_file_path?: string | null
          resume_text?: string | null
          skills?: string[] | null
          source?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          applicant_role?: string | null
          applied_date?: string | null
          created_at?: string | null
          created_by?: string | null
          current_company?: string | null
          education?: string | null
          email?: string
          fit_score?: number | null
          id?: string
          job_posting_id?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          phone?: string | null
          resume_file_path?: string | null
          resume_text?: string | null
          skills?: string[] | null
          source?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applicants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_applicants_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          created_at: string | null
          department: string
          description: string | null
          id: string
          location: string
          posted_date: string | null
          requirements: string[] | null
          salary_max: number | null
          salary_min: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department: string
          description?: string | null
          id?: string
          location: string
          posted_date?: string | null
          requirements?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string
          description?: string | null
          id?: string
          location?: string
          posted_date?: string | null
          requirements?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string
          description: string
          entity_code: string | null
          entry_date: string
          entry_number: string
          id: string
          period: string | null
          posted_at: string | null
          posted_by: string | null
          reference_number: string | null
          requires_approval: boolean | null
          reversal_entry_id: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: string | null
          total_credits: number | null
          total_debits: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          description: string
          entity_code?: string | null
          entry_date: string
          entry_number: string
          id?: string
          period?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_number?: string | null
          requires_approval?: boolean | null
          reversal_entry_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string | null
          total_credits?: number | null
          total_debits?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          description?: string
          entity_code?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          period?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_number?: string | null
          requires_approval?: boolean | null
          reversal_entry_id?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string | null
          total_credits?: number | null
          total_debits?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "journal_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          journal_entry_id: string
          line_number: number
          reference_id: string | null
          reference_type: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
          line_number: number
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
          line_number?: number
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string
          entry_type: string
          id: string
          memo: string | null
          order_id: string | null
          owner_id: string | null
          owner_type: string
          stripe_object_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency?: string
          entry_type: string
          id?: string
          memo?: string | null
          order_id?: string | null
          owner_id?: string | null
          owner_type: string
          stripe_object_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string
          entry_type?: string
          id?: string
          memo?: string | null
          order_id?: string | null
          owner_id?: string | null
          owner_type?: string
          stripe_object_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          category: string
          created_at: string | null
          document_type: string
          document_url: string
          effective_date: string | null
          entity_id: string | null
          entity_type: string | null
          expiry_date: string | null
          id: string
          key_terms: Json | null
          last_review_date: string | null
          metadata: Json | null
          next_review_date: string | null
          renewal_required: boolean | null
          review_frequency_days: number | null
          reviewed_by: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          document_type: string
          document_url: string
          effective_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expiry_date?: string | null
          id?: string
          key_terms?: Json | null
          last_review_date?: string | null
          metadata?: Json | null
          next_review_date?: string | null
          renewal_required?: boolean | null
          review_frequency_days?: number | null
          reviewed_by?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          document_type?: string
          document_url?: string
          effective_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expiry_date?: string | null
          id?: string
          key_terms?: Json | null
          last_review_date?: string | null
          metadata?: Json | null
          next_review_date?: string | null
          renewal_required?: boolean | null
          review_frequency_days?: number | null
          reviewed_by?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      legal_reviews: {
        Row: {
          action_items: Json | null
          action_required: boolean | null
          created_at: string | null
          document_id: string | null
          findings: string | null
          id: string
          metadata: Json | null
          next_review_date: string | null
          recommendations: string | null
          review_date: string
          review_type: string
          reviewer_id: string | null
          status: string | null
        }
        Insert: {
          action_items?: Json | null
          action_required?: boolean | null
          created_at?: string | null
          document_id?: string | null
          findings?: string | null
          id?: string
          metadata?: Json | null
          next_review_date?: string | null
          recommendations?: string | null
          review_date?: string
          review_type: string
          reviewer_id?: string | null
          status?: string | null
        }
        Update: {
          action_items?: Json | null
          action_required?: boolean | null
          created_at?: string | null
          document_id?: string | null
          findings?: string | null
          id?: string
          metadata?: Json | null
          next_review_date?: string | null
          recommendations?: string | null
          review_date?: string
          review_type?: string
          reviewer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      login_activity: {
        Row: {
          created_at: string | null
          device_id: string | null
          device_name: string | null
          device_type: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          location_city: string | null
          location_country: string | null
          location_region: string | null
          login_type: string
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          login_type: string
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          login_type?: string
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketing_assets: {
        Row: {
          alt_text: string | null
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          file_type: string
          file_url: string
          folder: string
          id: string
          mime_type: string | null
          name: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          file_type: string
          file_url: string
          folder?: string
          id?: string
          mime_type?: string | null
          name: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          file_type?: string
          file_url?: string
          folder?: string
          id?: string
          mime_type?: string | null
          name?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget: number
          campaign_name: string
          campaign_type: string
          channel: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          objective: string
          spend_to_date: number | null
          start_date: string
          status: string | null
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget: number
          campaign_name: string
          campaign_type: string
          channel: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          objective: string
          spend_to_date?: number | null
          start_date: string
          status?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget?: number
          campaign_name?: string
          campaign_type?: string
          channel?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          objective?: string
          spend_to_date?: number | null
          start_date?: string
          status?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketing_metrics: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          cpa: number | null
          created_at: string | null
          ctr: number | null
          id: string
          impressions: number | null
          metadata: Json | null
          metric_date: string
          new_customers: number | null
          revenue_attributed: number | null
          roas: number | null
          spend: number | null
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          metadata?: Json | null
          metric_date: string
          new_customers?: number | null
          revenue_attributed?: number | null
          roas?: number | null
          spend?: number | null
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          metadata?: Json | null
          metric_date?: string
          new_customers?: number | null
          revenue_attributed?: number | null
          roas?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "marketing_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_portal_access: {
        Row: {
          access_level: string | null
          created_at: string | null
          employee_id: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          employee_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          employee_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_portal_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_portal_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketing_portal_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketing_portal_access_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketing_portal_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketing_settings: {
        Row: {
          application_background_image_url: string | null
          created_at: string
          feeder_hero_image_url: string | null
          id: string
          independent_contractor_agreement_url: string | null
          mobile_hero_image_url: string | null
          partner_hero_image_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          application_background_image_url?: string | null
          created_at?: string
          feeder_hero_image_url?: string | null
          id?: string
          independent_contractor_agreement_url?: string | null
          mobile_hero_image_url?: string | null
          partner_hero_image_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          application_background_image_url?: string | null
          created_at?: string
          feeder_hero_image_url?: string | null
          id?: string
          independent_contractor_agreement_url?: string | null
          mobile_hero_image_url?: string | null
          partner_hero_image_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      membership_entitlements: {
        Row: {
          early_access: boolean | null
          id: string
          member_discounts: boolean | null
          priority_support: boolean | null
          updated_at: string | null
          user_id: string
          zero_delivery_fee: boolean | null
        }
        Insert: {
          early_access?: boolean | null
          id?: string
          member_discounts?: boolean | null
          priority_support?: boolean | null
          updated_at?: string | null
          user_id: string
          zero_delivery_fee?: boolean | null
        }
        Update: {
          early_access?: boolean | null
          id?: string
          member_discounts?: boolean | null
          priority_support?: boolean | null
          updated_at?: string | null
          user_id?: string
          zero_delivery_fee?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          menu_item_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          menu_item_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          menu_item_id?: string
        }
        Relationships: []
      }
      menu_item_modifier_groups: {
        Row: {
          created_at: string
          display_order: number
          id: string
          menu_item_id: string
          modifier_group_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          menu_item_id: string
          modifier_group_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          menu_item_id?: string
          modifier_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_modifier_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_modifier_groups_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_modifiers: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_available: boolean
          is_recommended: boolean
          is_required: boolean
          max_selections: number | null
          menu_item_id: string
          modifier_type: string
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_available?: boolean
          is_recommended?: boolean
          is_required?: boolean
          max_selections?: number | null
          menu_item_id: string
          modifier_type?: string
          name: string
          price_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_available?: boolean
          is_recommended?: boolean
          is_required?: boolean
          max_selections?: number | null
          menu_item_id?: string
          modifier_type?: string
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          barcode: string | null
          brand: string | null
          category_id: string | null
          compare_at_price_cents: number | null
          cost_price_cents: number | null
          created_at: string
          description: string | null
          display_order: number
          has_variants: boolean | null
          height_cm: number | null
          id: string
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          is_gluten_free: boolean
          is_vegan: boolean
          is_vegetarian: boolean
          length_cm: number | null
          manufacturer: string | null
          name: string
          order_count: number
          preparation_time: number | null
          price_cents: number
          product_type: string | null
          requires_shipping: boolean | null
          restaurant_id: string
          spice_level: string | null
          tags: string[] | null
          tax_rate: number | null
          updated_at: string
          vendor: string | null
          weight_unit: string | null
          weight_value: number | null
          width_cm: number | null
        }
        Insert: {
          allergens?: string[] | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          compare_at_price_cents?: number | null
          cost_price_cents?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          has_variants?: boolean | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_gluten_free?: boolean
          is_vegan?: boolean
          is_vegetarian?: boolean
          length_cm?: number | null
          manufacturer?: string | null
          name: string
          order_count?: number
          preparation_time?: number | null
          price_cents: number
          product_type?: string | null
          requires_shipping?: boolean | null
          restaurant_id: string
          spice_level?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          updated_at?: string
          vendor?: string | null
          weight_unit?: string | null
          weight_value?: number | null
          width_cm?: number | null
        }
        Update: {
          allergens?: string[] | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          compare_at_price_cents?: number | null
          cost_price_cents?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          has_variants?: boolean | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_gluten_free?: boolean
          is_vegan?: boolean
          is_vegetarian?: boolean
          length_cm?: number | null
          manufacturer?: string | null
          name?: string
          order_count?: number
          preparation_time?: number | null
          price_cents?: number
          product_type?: string | null
          requires_shipping?: boolean | null
          restaurant_id?: string
          spice_level?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          updated_at?: string
          vendor?: string | null
          weight_unit?: string | null
          weight_value?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_category_config: {
        Row: {
          category: Database["public"]["Enums"]["merchant_category"]
          created_at: string | null
          default_commission_bps: number
          default_delivery_radius_miles: number
          default_prep_time_minutes: number
          display_name: string
          id: string
          requires_alcohol_license: boolean
          requires_health_permit: boolean
          requires_inventory: boolean
          requires_prep_time: boolean
          supports_bundles: boolean
          supports_modifiers: boolean
          supports_pick_pack: boolean
          track_perishable_turnover: boolean
          track_sku_velocity: boolean
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["merchant_category"]
          created_at?: string | null
          default_commission_bps?: number
          default_delivery_radius_miles?: number
          default_prep_time_minutes?: number
          display_name: string
          id?: string
          requires_alcohol_license?: boolean
          requires_health_permit?: boolean
          requires_inventory?: boolean
          requires_prep_time?: boolean
          supports_bundles?: boolean
          supports_modifiers?: boolean
          supports_pick_pack?: boolean
          track_perishable_turnover?: boolean
          track_sku_velocity?: boolean
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["merchant_category"]
          created_at?: string | null
          default_commission_bps?: number
          default_delivery_radius_miles?: number
          default_prep_time_minutes?: number
          display_name?: string
          id?: string
          requires_alcohol_license?: boolean
          requires_health_permit?: boolean
          requires_inventory?: boolean
          requires_prep_time?: boolean
          supports_bundles?: boolean
          supports_modifiers?: boolean
          supports_pick_pack?: boolean
          track_perishable_turnover?: boolean
          track_sku_velocity?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      merchant_inventory: {
        Row: {
          barcode: string | null
          cost_cents: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          is_perishable: boolean | null
          last_restocked_at: string | null
          menu_item_id: string | null
          quantity_on_hand: number
          quantity_reserved: number
          reorder_point: number | null
          restaurant_id: string
          sku: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          cost_cents?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_perishable?: boolean | null
          last_restocked_at?: string | null
          menu_item_id?: string | null
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_point?: number | null
          restaurant_id: string
          sku?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          cost_cents?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_perishable?: boolean | null
          last_restocked_at?: string | null
          menu_item_id?: string | null
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_point?: number | null
          restaurant_id?: string
          sku?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_inventory_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_inventory_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "merchant_inventory_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          avg_prep_minutes: number | null
          cravemore_eligible: boolean | null
          created_at: string | null
          id: string
          is_at_risk: boolean | null
          name: string
          rating: number | null
          status: string
          zone: string | null
        }
        Insert: {
          address?: string | null
          avg_prep_minutes?: number | null
          cravemore_eligible?: boolean | null
          created_at?: string | null
          id?: string
          is_at_risk?: boolean | null
          name: string
          rating?: number | null
          status?: string
          zone?: string | null
        }
        Update: {
          address?: string | null
          avg_prep_minutes?: number | null
          cravemore_eligible?: boolean | null
          created_at?: string | null
          id?: string
          is_at_risk?: boolean | null
          name?: string
          rating?: number | null
          status?: string
          zone?: string | null
        }
        Relationships: []
      }
      mobile_app_analytics_events: {
        Row: {
          created_at: string | null
          device_info: Json | null
          driver_id: string | null
          event_name: string
          event_type: string
          id: string
          properties: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          driver_id?: string | null
          event_name: string
          event_type: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          driver_id?: string | null
          event_name?: string
          event_type?: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_app_analytics_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_app_analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mobile_app_error_logs: {
        Row: {
          created_at: string | null
          device_info: Json | null
          driver_id: string | null
          error_context: Json | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          driver_id?: string | null
          error_context?: Json | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          driver_id?: string | null
          error_context?: Json | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_app_error_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_app_error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mobile_app_feature_completion: {
        Row: {
          completion_percentage: number | null
          created_at: string | null
          driver_id: string | null
          feature_name: string
          feature_status: string
          id: string
          properties: Json | null
          time_spent_seconds: number | null
          user_id: string | null
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string | null
          driver_id?: string | null
          feature_name: string
          feature_status: string
          id?: string
          properties?: Json | null
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string | null
          driver_id?: string | null
          feature_name?: string
          feature_status?: string
          id?: string
          properties?: Json | null
          time_spent_seconds?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_app_feature_completion_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_app_feature_completion_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mobile_app_performance_metrics: {
        Row: {
          api_response_time_ms: number | null
          crash_count: number | null
          created_at: string | null
          device_info: Json | null
          driver_id: string | null
          error_count: number | null
          id: string
          load_time_ms: number | null
          memory_usage_mb: number | null
          network_latency_ms: number | null
          render_time_ms: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          api_response_time_ms?: number | null
          crash_count?: number | null
          created_at?: string | null
          device_info?: Json | null
          driver_id?: string | null
          error_count?: number | null
          id?: string
          load_time_ms?: number | null
          memory_usage_mb?: number | null
          network_latency_ms?: number | null
          render_time_ms?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          api_response_time_ms?: number | null
          crash_count?: number | null
          created_at?: string | null
          device_info?: Json | null
          driver_id?: string | null
          error_count?: number | null
          id?: string
          load_time_ms?: number | null
          memory_usage_mb?: number | null
          network_latency_ms?: number | null
          render_time_ms?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_app_performance_metrics_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_app_performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mobile_app_uptime_downtime: {
        Row: {
          created_at: string | null
          device_info: Json | null
          driver_id: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          session_id: string
          start_time: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          driver_id?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          session_id: string
          start_time: string
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          driver_id?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          session_id?: string
          start_time?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_app_uptime_downtime_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_app_uptime_downtime_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      modifier_group_items: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_available: boolean
          modifier_group_id: string
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_available?: boolean
          modifier_group_id: string
          name: string
          price_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_available?: boolean
          modifier_group_id?: string
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_group_items_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      modifier_groups: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_required: boolean
          max_selections: number | null
          min_selections: number
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          max_selections?: number | null
          min_selections?: number
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          max_selections?: number | null
          min_selections?: number
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "modifier_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      moov_invites: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          invite_link: string
          metadata: Json | null
          moov_account_id: string | null
          restaurant_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          invite_link: string
          metadata?: Json | null
          moov_account_id?: string | null
          restaurant_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          invite_link?: string
          metadata?: Json | null
          moov_account_id?: string | null
          restaurant_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moov_invites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "moov_invites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moov_invites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ms365_email_accounts: {
        Row: {
          access_level: number | null
          created_at: string | null
          display_name: string
          email_address: string
          employee_id: string | null
          first_name: string
          id: string
          last_name: string
          mailbox_type: string
          ms365_user_id: string | null
          ms365_user_principal_name: string | null
          provisioned_at: string | null
          provisioning_status: string
          role_alias: string | null
          updated_at: string | null
        }
        Insert: {
          access_level?: number | null
          created_at?: string | null
          display_name: string
          email_address: string
          employee_id?: string | null
          first_name: string
          id?: string
          last_name: string
          mailbox_type?: string
          ms365_user_id?: string | null
          ms365_user_principal_name?: string | null
          provisioned_at?: string | null
          provisioning_status?: string
          role_alias?: string | null
          updated_at?: string | null
        }
        Update: {
          access_level?: number | null
          created_at?: string | null
          display_name?: string
          email_address?: string
          employee_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          mailbox_type?: string
          ms365_user_id?: string | null
          ms365_user_principal_name?: string | null
          provisioned_at?: string | null
          provisioning_status?: string
          role_alias?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ms365_email_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ms365_email_accounts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      notification_dispatch_log: {
        Row: {
          body: string | null
          category: string
          channel: string
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string
          clicked_at: string | null
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          error_message: string | null
          fcm_message_id: string | null
          id: string
          notification_type: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          fcm_message_id?: string | null
          id?: string
          notification_type: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          fcm_message_id?: string | null
          id?: string
          notification_type?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          description: string | null
          duration_ms: number
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          repeat_count: number
          repeat_interval_ms: number
          sound_file: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_ms?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          repeat_count?: number
          repeat_interval_ms?: number
          sound_file: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_ms?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          repeat_count?: number
          repeat_interval_ms?: number
          sound_file?: string
          updated_at?: string
        }
        Relationships: []
      }
      offer_recommendations: {
        Row: {
          applicant_id: string | null
          benefits: string[] | null
          created_at: string | null
          id: string
          reasoning: string | null
          salary_max: number | null
          salary_min: number | null
          salary_recommended: number | null
          start_date_suggestion: string | null
          title: string | null
        }
        Insert: {
          applicant_id?: string | null
          benefits?: string[] | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_recommended?: number | null
          start_date_suggestion?: string | null
          title?: string | null
        }
        Update: {
          applicant_id?: string | null
          benefits?: string[] | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_recommended?: number | null
          start_date_suggestion?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_recommendations_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "job_applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_activation_timeline: {
        Row: {
          appointment_id: string
          created_at: string | null
          event_description: string
          event_type: string
          id: string
          metadata: Json | null
          performed_by: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          event_description: string
          event_type: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          event_description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_activation_timeline_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      officer_ledger: {
        Row: {
          appointment_id: string | null
          certificate_url: string | null
          created_at: string | null
          effective_date: string
          id: string
          name: string
          officer_id: string | null
          resolution_id: string | null
          resolution_number: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          certificate_url?: string | null
          created_at?: string | null
          effective_date: string
          id?: string
          name: string
          officer_id?: string | null
          resolution_id?: string | null
          resolution_number?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          certificate_url?: string | null
          created_at?: string | null
          effective_date?: string
          id?: string
          name?: string
          officer_id?: string | null
          resolution_id?: string | null
          resolution_number?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officer_ledger_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "governance_board_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          driver_id: string | null
          id: number
          points_reward: number | null
          task_key: string
          task_name: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          driver_id?: string | null
          id?: number
          points_reward?: number | null
          task_key: string
          task_name: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          driver_id?: string | null
          id?: number
          points_reward?: number | null
          task_key?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "craver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "unified_driver_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_metrics: {
        Row: {
          id: string
          measured_at: string | null
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
        }
        Insert: {
          id?: string
          measured_at?: string | null
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
        }
        Update: {
          id?: string
          measured_at?: string | null
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
        }
        Relationships: []
      }
      order_assignments: {
        Row: {
          created_at: string
          driver_id: string
          expires_at: string
          id: string
          order_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          expires_at: string
          id?: string
          order_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          expires_at?: string
          id?: string
          order_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      order_batches: {
        Row: {
          batch_type: string
          created_at: string | null
          diamond_only_until: string | null
          id: string
          order_ids: string[]
        }
        Insert: {
          batch_type: string
          created_at?: string | null
          diamond_only_until?: string | null
          id?: string
          order_ids: string[]
        }
        Update: {
          batch_type?: string
          created_at?: string | null
          diamond_only_until?: string | null
          id?: string
          order_ids?: string[]
        }
        Relationships: []
      }
      order_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string | null
          driver_id: string | null
          feedback_type: string | null
          id: string
          order_id: string | null
          rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          driver_id?: string | null
          feedback_type?: string | null
          id?: string
          order_id?: string | null
          rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          driver_id?: string | null
          feedback_type?: string | null
          id?: string
          order_id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      order_heat_map: {
        Row: {
          created_at: string
          id: string
          intensity: number
          lat: number
          lng: number
          location_type: string
          time_window: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intensity?: number
          lat: number
          lng: number
          location_type?: string
          time_window?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intensity?: number
          lat?: number
          lng?: number
          location_type?: string
          time_window?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_item_modifiers: {
        Row: {
          created_at: string
          id: string
          modifier_id: string
          modifier_name: string
          modifier_price_cents: number
          order_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modifier_id: string
          modifier_name: string
          modifier_price_cents?: number
          order_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modifier_id?: string
          modifier_name?: string
          modifier_price_cents?: number
          order_item_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          order_id: string
          price_cents: number
          quantity: number
          special_instructions: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          order_id: string
          price_cents: number
          quantity?: number
          special_instructions?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          order_id?: string
          price_cents?: number
          quantity?: number
          special_instructions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      order_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          order_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type?: string
          order_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          order_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          accepted_at: string | null
          accepted_driver_id: string | null
          amount_total_cents: number | null
          assigned_craver_id: string | null
          auto_boost_cap_cents: number
          auto_boost_enabled: boolean
          base_delivery_fee_cents: number
          base_pay: number | null
          batch_id: string | null
          broadcast_started_at: string | null
          created_at: string | null
          currency: string | null
          customer_boost_required: boolean
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_fee_cents: number | null
          delivery_fees_total_cents: number
          delivery_method: string | null
          demand_fee_cents: number
          diamond_only_until: string | null
          distance_fee_cents: number
          distance_km: number | null
          driver_base_pay_cents: number
          driver_delivery_fee_share_bps: number
          driver_fee_share_cents: number
          driver_id: string | null
          driver_pay_cents: number | null
          driver_payout_cents: number
          dropoff_address: Json | null
          dropoff_location: Json | null
          escalated_total_cents: number
          escalation_fee_cents: number
          estimated_delivery_time: string | null
          estimated_distance_meters: number | null
          estimated_duration_seconds: number | null
          exclusive_type: string | null
          food_subtotal_cents: number | null
          id: string
          is_stacked: boolean | null
          is_test: boolean | null
          merchant_commission_cents: number
          merchant_payout_cents: number
          mileage_pay_cents: number | null
          next_escalation_at: string | null
          next_escalation_step: number
          order_number: string | null
          order_status: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_provider: string | null
          payment_status: string | null
          payout_cents: number | null
          payout_hidden: boolean | null
          pickup_address: Json | null
          pickup_code: string | null
          pickup_confirmed_at: string | null
          pickup_location: Json | null
          pickup_photo_url: string | null
          platform_delivery_share_cents: number
          platform_fee_cents: number | null
          platform_food_commission_cents: number
          promo_applied: boolean | null
          promo_applied_at: string | null
          promo_credit_applied_cents: number | null
          promo_delivery_credit_applied_cents: number | null
          promo_id: string | null
          promo_service_credit_applied_cents: number | null
          promo_step: number | null
          restaurant_id: string | null
          restaurant_net_cents: number | null
          route_geometry: Json | null
          service_fee: number | null
          service_fee_cents: number | null
          stack_order_number: number | null
          stack_parent_order_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_driver_id: string | null
          stripe_transfer_restaurant_id: string | null
          subtotal_cents: number
          tax_cents: number | null
          time_fee_cents: number
          tip: number | null
          tip_cents: number | null
          total_amount: number | null
          total_cents: number
          transfers_error: string | null
          transfers_lease_expires_at: string | null
          transfers_lease_id: string | null
          transfers_status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_driver_id?: string | null
          amount_total_cents?: number | null
          assigned_craver_id?: string | null
          auto_boost_cap_cents?: number
          auto_boost_enabled?: boolean
          base_delivery_fee_cents?: number
          base_pay?: number | null
          batch_id?: string | null
          broadcast_started_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_boost_required?: boolean
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_fee_cents?: number | null
          delivery_fees_total_cents?: number
          delivery_method?: string | null
          demand_fee_cents?: number
          diamond_only_until?: string | null
          distance_fee_cents?: number
          distance_km?: number | null
          driver_base_pay_cents?: number
          driver_delivery_fee_share_bps?: number
          driver_fee_share_cents?: number
          driver_id?: string | null
          driver_pay_cents?: number | null
          driver_payout_cents?: number
          dropoff_address?: Json | null
          dropoff_location?: Json | null
          escalated_total_cents?: number
          escalation_fee_cents?: number
          estimated_delivery_time?: string | null
          estimated_distance_meters?: number | null
          estimated_duration_seconds?: number | null
          exclusive_type?: string | null
          food_subtotal_cents?: number | null
          id?: string
          is_stacked?: boolean | null
          is_test?: boolean | null
          merchant_commission_cents?: number
          merchant_payout_cents?: number
          mileage_pay_cents?: number | null
          next_escalation_at?: string | null
          next_escalation_step?: number
          order_number?: string | null
          order_status?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          payout_cents?: number | null
          payout_hidden?: boolean | null
          pickup_address?: Json | null
          pickup_code?: string | null
          pickup_confirmed_at?: string | null
          pickup_location?: Json | null
          pickup_photo_url?: string | null
          platform_delivery_share_cents?: number
          platform_fee_cents?: number | null
          platform_food_commission_cents?: number
          promo_applied?: boolean | null
          promo_applied_at?: string | null
          promo_credit_applied_cents?: number | null
          promo_delivery_credit_applied_cents?: number | null
          promo_id?: string | null
          promo_service_credit_applied_cents?: number | null
          promo_step?: number | null
          restaurant_id?: string | null
          restaurant_net_cents?: number | null
          route_geometry?: Json | null
          service_fee?: number | null
          service_fee_cents?: number | null
          stack_order_number?: number | null
          stack_parent_order_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_driver_id?: string | null
          stripe_transfer_restaurant_id?: string | null
          subtotal_cents: number
          tax_cents?: number | null
          time_fee_cents?: number
          tip?: number | null
          tip_cents?: number | null
          total_amount?: number | null
          total_cents: number
          transfers_error?: string | null
          transfers_lease_expires_at?: string | null
          transfers_lease_id?: string | null
          transfers_status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_driver_id?: string | null
          amount_total_cents?: number | null
          assigned_craver_id?: string | null
          auto_boost_cap_cents?: number
          auto_boost_enabled?: boolean
          base_delivery_fee_cents?: number
          base_pay?: number | null
          batch_id?: string | null
          broadcast_started_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_boost_required?: boolean
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_fee_cents?: number | null
          delivery_fees_total_cents?: number
          delivery_method?: string | null
          demand_fee_cents?: number
          diamond_only_until?: string | null
          distance_fee_cents?: number
          distance_km?: number | null
          driver_base_pay_cents?: number
          driver_delivery_fee_share_bps?: number
          driver_fee_share_cents?: number
          driver_id?: string | null
          driver_pay_cents?: number | null
          driver_payout_cents?: number
          dropoff_address?: Json | null
          dropoff_location?: Json | null
          escalated_total_cents?: number
          escalation_fee_cents?: number
          estimated_delivery_time?: string | null
          estimated_distance_meters?: number | null
          estimated_duration_seconds?: number | null
          exclusive_type?: string | null
          food_subtotal_cents?: number | null
          id?: string
          is_stacked?: boolean | null
          is_test?: boolean | null
          merchant_commission_cents?: number
          merchant_payout_cents?: number
          mileage_pay_cents?: number | null
          next_escalation_at?: string | null
          next_escalation_step?: number
          order_number?: string | null
          order_status?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          payout_cents?: number | null
          payout_hidden?: boolean | null
          pickup_address?: Json | null
          pickup_code?: string | null
          pickup_confirmed_at?: string | null
          pickup_location?: Json | null
          pickup_photo_url?: string | null
          platform_delivery_share_cents?: number
          platform_fee_cents?: number | null
          platform_food_commission_cents?: number
          promo_applied?: boolean | null
          promo_applied_at?: string | null
          promo_credit_applied_cents?: number | null
          promo_delivery_credit_applied_cents?: number | null
          promo_id?: string | null
          promo_service_credit_applied_cents?: number | null
          promo_step?: number | null
          restaurant_id?: string | null
          restaurant_net_cents?: number | null
          route_geometry?: Json | null
          service_fee?: number | null
          service_fee_cents?: number | null
          stack_order_number?: number | null
          stack_parent_order_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_driver_id?: string | null
          stripe_transfer_restaurant_id?: string | null
          subtotal_cents?: number
          tax_cents?: number | null
          time_fee_cents?: number
          tip?: number | null
          tip_cents?: number | null
          total_amount?: number | null
          total_cents?: number
          transfers_error?: string | null
          transfers_lease_expires_at?: string | null
          transfers_lease_id?: string | null
          transfers_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_craver_id_fkey"
            columns: ["assigned_craver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_stack_parent_order_id_fkey"
            columns: ["stack_parent_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_stack_parent_order_id_fkey"
            columns: ["stack_parent_order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_stack_parent_order_id_fkey"
            columns: ["stack_parent_order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      panic_button_logs: {
        Row: {
          authorities_notified: boolean | null
          device_info: string | null
          emergency_contact_notified: boolean | null
          id: string
          latitude: number | null
          location_accuracy: number | null
          longitude: number | null
          notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          authorities_notified?: boolean | null
          device_info?: string | null
          emergency_contact_notified?: boolean | null
          id?: string
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          authorities_notified?: boolean | null
          device_info?: string | null
          emergency_contact_notified?: boolean | null
          id?: string
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panic_button_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      partner_vendors: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_value: number | null
          country: string | null
          created_at: string | null
          default_currency: string | null
          id: string
          metadata: Json | null
          payment_terms: string | null
          performance_rating: number | null
          relationship_start: string | null
          state: string | null
          status: string | null
          tax_id: string | null
          vendor_name: string
          vendor_type: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_value?: number | null
          country?: string | null
          created_at?: string | null
          default_currency?: string | null
          id?: string
          metadata?: Json | null
          payment_terms?: string | null
          performance_rating?: number | null
          relationship_start?: string | null
          state?: string | null
          status?: string | null
          tax_id?: string | null
          vendor_name: string
          vendor_type: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_value?: number | null
          country?: string | null
          created_at?: string | null
          default_currency?: string | null
          id?: string
          metadata?: Json | null
          payment_terms?: string | null
          performance_rating?: number | null
          relationship_start?: string | null
          state?: string | null
          status?: string | null
          tax_id?: string | null
          vendor_name?: string
          vendor_type?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      pay_stubs: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          delivered_method: string | null
          employee_id: string
          generated_at: string | null
          generated_by: string | null
          gross_pay: number
          id: string
          metadata: Json | null
          net_pay: number
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          payroll_entry_id: string
          stub_html: string | null
          stub_number: string
          stub_pdf_url: string | null
          total_deductions: number
          ytd_gross_pay: number | null
          ytd_net_pay: number | null
          ytd_total_deductions: number | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          delivered_method?: string | null
          employee_id: string
          generated_at?: string | null
          generated_by?: string | null
          gross_pay: number
          id?: string
          metadata?: Json | null
          net_pay: number
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          payroll_entry_id: string
          stub_html?: string | null
          stub_number: string
          stub_pdf_url?: string | null
          total_deductions: number
          ytd_gross_pay?: number | null
          ytd_net_pay?: number | null
          ytd_total_deductions?: number | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          delivered_method?: string | null
          employee_id?: string
          generated_at?: string | null
          generated_by?: string | null
          gross_pay?: number
          id?: string
          metadata?: Json | null
          net_pay?: number
          pay_date?: string
          pay_period_end?: string
          pay_period_start?: string
          payroll_entry_id?: string
          stub_html?: string | null
          stub_number?: string
          stub_pdf_url?: string | null
          total_deductions?: number
          ytd_gross_pay?: number | null
          ytd_net_pay?: number | null
          ytd_total_deductions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pay_stubs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_stubs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "pay_stubs_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pay_stubs_payroll_entry_id_fkey"
            columns: ["payroll_entry_id"]
            isOneToOne: false
            referencedRelation: "payroll_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          last4: string | null
          provider: string
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          token: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          provider?: string
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          token: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          provider?: string
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          token?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          base_pay: number
          benefits: number | null
          bonus: number | null
          commission: number | null
          created_at: string | null
          employee_id: string
          gross_pay: number | null
          id: string
          invoice_id: string | null
          net_pay: number | null
          notes: string | null
          other_deductions: number | null
          overtime_pay: number | null
          pay_period_end: string
          pay_period_start: string
          payment_date: string | null
          payment_method: string | null
          payment_run_id: string | null
          payment_status: string | null
          taxes: number | null
          total_deductions: number | null
        }
        Insert: {
          base_pay?: number
          benefits?: number | null
          bonus?: number | null
          commission?: number | null
          created_at?: string | null
          employee_id: string
          gross_pay?: number | null
          id?: string
          invoice_id?: string | null
          net_pay?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_pay?: number | null
          pay_period_end: string
          pay_period_start: string
          payment_date?: string | null
          payment_method?: string | null
          payment_run_id?: string | null
          payment_status?: string | null
          taxes?: number | null
          total_deductions?: number | null
        }
        Update: {
          base_pay?: number
          benefits?: number | null
          bonus?: number | null
          commission?: number | null
          created_at?: string | null
          employee_id?: string
          gross_pay?: number | null
          id?: string
          invoice_id?: string | null
          net_pay?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_pay?: number | null
          pay_period_end?: string
          pay_period_start?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_run_id?: string | null
          payment_status?: string | null
          taxes?: number | null
          total_deductions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      payroll_deduction_templates: {
        Row: {
          amount: number | null
          annual_limit: number | null
          calculation_method: string | null
          category: string | null
          created_at: string | null
          deduction_code: string
          deduction_name: string
          deduction_type: string
          description: string | null
          eligibility_rules: Json | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          percentage: number | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          annual_limit?: number | null
          calculation_method?: string | null
          category?: string | null
          created_at?: string | null
          deduction_code: string
          deduction_name: string
          deduction_type: string
          description?: string | null
          eligibility_rules?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          annual_limit?: number | null
          calculation_method?: string | null
          category?: string | null
          created_at?: string | null
          deduction_code?: string
          deduction_name?: string
          deduction_type?: string
          description?: string | null
          eligibility_rules?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payroll_entries: {
        Row: {
          additional_medicare_tax: number | null
          base_salary: number | null
          bonus: number | null
          commission: number | null
          created_at: string | null
          earnings_details: Json | null
          employee_id: string
          employer_benefits: number | null
          employer_contributions: number | null
          employer_medicare: number | null
          employer_social_security: number | null
          employer_unemployment: number | null
          employer_workers_comp: number | null
          federal_income_tax: number | null
          gross_pay: number
          holiday_pay: number | null
          hours_worked: number | null
          id: string
          local_income_tax: number | null
          medicare_tax: number | null
          metadata: Json | null
          net_pay: number | null
          notes: string | null
          other_earnings: number | null
          other_taxes: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          payroll_run_id: string
          post_tax_deductions: number | null
          post_tax_details: Json | null
          pre_tax_deductions: number | null
          pre_tax_details: Json | null
          regular_hours: number | null
          regular_rate: number | null
          sick_pay: number | null
          social_security_tax: number | null
          state_disability_tax: number | null
          state_income_tax: number | null
          status: string | null
          tax_details: Json | null
          taxable_income: number | null
          tips: number | null
          total_deductions: number | null
          total_employer_cost: number | null
          total_taxes: number | null
          unemployment_tax: number | null
          updated_at: string | null
          vacation_pay: number | null
          ytd_deductions: number | null
          ytd_gross_pay: number | null
          ytd_net_pay: number | null
          ytd_taxes: number | null
        }
        Insert: {
          additional_medicare_tax?: number | null
          base_salary?: number | null
          bonus?: number | null
          commission?: number | null
          created_at?: string | null
          earnings_details?: Json | null
          employee_id: string
          employer_benefits?: number | null
          employer_contributions?: number | null
          employer_medicare?: number | null
          employer_social_security?: number | null
          employer_unemployment?: number | null
          employer_workers_comp?: number | null
          federal_income_tax?: number | null
          gross_pay?: number
          holiday_pay?: number | null
          hours_worked?: number | null
          id?: string
          local_income_tax?: number | null
          medicare_tax?: number | null
          metadata?: Json | null
          net_pay?: number | null
          notes?: string | null
          other_earnings?: number | null
          other_taxes?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          pay_date: string
          pay_period_end: string
          pay_period_start: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payroll_run_id: string
          post_tax_deductions?: number | null
          post_tax_details?: Json | null
          pre_tax_deductions?: number | null
          pre_tax_details?: Json | null
          regular_hours?: number | null
          regular_rate?: number | null
          sick_pay?: number | null
          social_security_tax?: number | null
          state_disability_tax?: number | null
          state_income_tax?: number | null
          status?: string | null
          tax_details?: Json | null
          taxable_income?: number | null
          tips?: number | null
          total_deductions?: number | null
          total_employer_cost?: number | null
          total_taxes?: number | null
          unemployment_tax?: number | null
          updated_at?: string | null
          vacation_pay?: number | null
          ytd_deductions?: number | null
          ytd_gross_pay?: number | null
          ytd_net_pay?: number | null
          ytd_taxes?: number | null
        }
        Update: {
          additional_medicare_tax?: number | null
          base_salary?: number | null
          bonus?: number | null
          commission?: number | null
          created_at?: string | null
          earnings_details?: Json | null
          employee_id?: string
          employer_benefits?: number | null
          employer_contributions?: number | null
          employer_medicare?: number | null
          employer_social_security?: number | null
          employer_unemployment?: number | null
          employer_workers_comp?: number | null
          federal_income_tax?: number | null
          gross_pay?: number
          holiday_pay?: number | null
          hours_worked?: number | null
          id?: string
          local_income_tax?: number | null
          medicare_tax?: number | null
          metadata?: Json | null
          net_pay?: number | null
          notes?: string | null
          other_earnings?: number | null
          other_taxes?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          pay_date?: string
          pay_period_end?: string
          pay_period_start?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payroll_run_id?: string
          post_tax_deductions?: number | null
          post_tax_details?: Json | null
          pre_tax_deductions?: number | null
          pre_tax_details?: Json | null
          regular_hours?: number | null
          regular_rate?: number | null
          sick_pay?: number | null
          social_security_tax?: number | null
          state_disability_tax?: number | null
          state_income_tax?: number | null
          status?: string | null
          tax_details?: Json | null
          taxable_income?: number | null
          tips?: number | null
          total_deductions?: number | null
          total_employer_cost?: number | null
          total_taxes?: number | null
          unemployment_tax?: number | null
          updated_at?: string | null
          vacation_pay?: number | null
          ytd_deductions?: number | null
          ytd_gross_pay?: number | null
          ytd_net_pay?: number | null
          ytd_taxes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_entries_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_reports: {
        Row: {
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          metadata: Json | null
          report_data: Json | null
          report_date: string
          report_name: string
          report_number: string
          report_pdf_url: string | null
          report_period_end: string | null
          report_period_start: string | null
          report_type: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_data?: Json | null
          report_date: string
          report_name: string
          report_number: string
          report_pdf_url?: string | null
          report_period_end?: string | null
          report_period_start?: string | null
          report_type: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_data?: Json | null
          report_date?: string
          report_name?: string
          report_number?: string
          report_pdf_url?: string | null
          report_period_end?: string | null
          report_period_start?: string | null
          report_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          pay_date: string
          pay_frequency: string
          pay_period_end: string
          pay_period_start: string
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          requires_approval: boolean | null
          run_number: string
          run_type: string
          status: string
          total_deductions: number | null
          total_employees: number | null
          total_employer_contributions: number | null
          total_employer_taxes: number | null
          total_gross_pay: number | null
          total_net_pay: number | null
          total_taxes: number | null
          updated_at: string | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          pay_date: string
          pay_frequency: string
          pay_period_end: string
          pay_period_start: string
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requires_approval?: boolean | null
          run_number: string
          run_type?: string
          status?: string
          total_deductions?: number | null
          total_employees?: number | null
          total_employer_contributions?: number | null
          total_employer_taxes?: number | null
          total_gross_pay?: number | null
          total_net_pay?: number | null
          total_taxes?: number | null
          updated_at?: string | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          pay_date?: string
          pay_frequency?: string
          pay_period_end?: string
          pay_period_start?: string
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requires_approval?: boolean | null
          run_number?: string
          run_type?: string
          status?: string
          total_deductions?: number | null
          total_employees?: number | null
          total_employer_contributions?: number | null
          total_employer_taxes?: number | null
          total_gross_pay?: number | null
          total_net_pay?: number | null
          total_taxes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payroll_runs_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payroll_tax_configs: {
        Row: {
          additional_rate: number | null
          additional_threshold: number | null
          brackets: Json | null
          created_at: string | null
          description: string | null
          effective_date: string
          exemptions: number | null
          expiration_date: string | null
          id: string
          is_active: boolean | null
          jurisdiction: string | null
          metadata: Json | null
          tax_rate: number | null
          tax_type: string
          updated_at: string | null
          wage_base: number | null
        }
        Insert: {
          additional_rate?: number | null
          additional_threshold?: number | null
          brackets?: Json | null
          created_at?: string | null
          description?: string | null
          effective_date: string
          exemptions?: number | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string | null
          metadata?: Json | null
          tax_rate?: number | null
          tax_type: string
          updated_at?: string | null
          wage_base?: number | null
        }
        Update: {
          additional_rate?: number | null
          additional_threshold?: number | null
          brackets?: Json | null
          created_at?: string | null
          description?: string | null
          effective_date?: string
          exemptions?: number | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string | null
          metadata?: Json | null
          tax_rate?: number | null
          tax_type?: string
          updated_at?: string | null
          wage_base?: number | null
        }
        Relationships: []
      }
      performance_diagnostics: {
        Row: {
          diagnosed_at: string | null
          id: string
          metric_name: string
          service_name: string
          status: string | null
          threshold: number | null
          value: number | null
        }
        Insert: {
          diagnosed_at?: string | null
          id?: string
          metric_name: string
          service_name: string
          status?: string | null
          threshold?: number | null
          value?: number | null
        }
        Update: {
          diagnosed_at?: string | null
          id?: string
          metric_name?: string
          service_name?: string
          status?: string | null
          threshold?: number | null
          value?: number | null
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          areas_for_improvement: string | null
          comments: string | null
          created_at: string | null
          employee_id: string
          goals: string | null
          id: string
          overall_rating: number | null
          review_date: string
          review_period_end: string | null
          review_period_start: string | null
          reviewer_id: string | null
          strengths: string | null
          updated_at: string | null
        }
        Insert: {
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string | null
          employee_id: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          review_date?: string
          review_period_end?: string | null
          review_period_start?: string | null
          reviewer_id?: string | null
          strengths?: string | null
          updated_at?: string | null
        }
        Update: {
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string | null
          employee_id?: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          review_date?: string
          review_period_end?: string | null
          review_period_start?: string | null
          reviewer_id?: string | null
          strengths?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          key: string
          label: string
          module: string
        }
        Insert: {
          description?: string | null
          key: string
          label: string
          module: string
        }
        Update: {
          description?: string | null
          key?: string
          label?: string
          module?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          phone: string
          step: number | null
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          phone: string
          step?: number | null
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          phone?: string
          step?: number | null
          verified?: boolean | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          education_level: string | null
          id: string
          is_active: boolean | null
          is_executive: boolean | null
          reports_to_position_id: string | null
          requirements: string | null
          salary_range_max: number | null
          salary_range_min: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          education_level?: string | null
          id?: string
          is_active?: boolean | null
          is_executive?: boolean | null
          reports_to_position_id?: string | null
          requirements?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          education_level?: string | null
          id?: string
          is_active?: boolean | null
          is_executive?: boolean | null
          reports_to_position_id?: string | null
          requirements?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_reports_to_position_id_fkey"
            columns: ["reports_to_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          created_at: string | null
          delivery_commission_percent: number
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_fee_cents: number | null
          name: string
          pickup_commission_percent: number
          tier: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_commission_percent: number
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_fee_cents?: number | null
          name: string
          pickup_commission_percent: number
          tier: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_commission_percent?: number
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_fee_cents?: number | null
          name?: string
          pickup_commission_percent?: number
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      procurement_categories: {
        Row: {
          budget_allocated: number | null
          category_name: string
          created_at: string | null
          description: string | null
          id: string
          responsible_department_id: string | null
        }
        Insert: {
          budget_allocated?: number | null
          category_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          responsible_department_id?: string | null
        }
        Update: {
          budget_allocated?: number | null
          category_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          responsible_department_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_categories_responsible_department_id_fkey"
            columns: ["responsible_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_requisitions: {
        Row: {
          approval_chain: string[] | null
          approved_at: string | null
          category_id: string | null
          created_at: string | null
          current_approver_id: string | null
          department_id: string | null
          description: string
          estimated_cost: number | null
          id: string
          justification: string | null
          notes: string | null
          priority: string | null
          rejected_at: string | null
          requested_by: string | null
          requisition_number: string
          status: string | null
        }
        Insert: {
          approval_chain?: string[] | null
          approved_at?: string | null
          category_id?: string | null
          created_at?: string | null
          current_approver_id?: string | null
          department_id?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          justification?: string | null
          notes?: string | null
          priority?: string | null
          rejected_at?: string | null
          requested_by?: string | null
          requisition_number: string
          status?: string | null
        }
        Update: {
          approval_chain?: string[] | null
          approved_at?: string | null
          category_id?: string | null
          created_at?: string | null
          current_approver_id?: string | null
          department_id?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          justification?: string | null
          notes?: string | null
          priority?: string | null
          rejected_at?: string | null
          requested_by?: string | null
          requisition_number?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_requisitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "procurement_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requisitions_current_approver_id_fkey"
            columns: ["current_approver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "procurement_requisitions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requisitions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          menu_item_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          menu_item_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          menu_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string
          name: string
          position: number | null
          values: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id: string
          name: string
          position?: number | null
          values?: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string
          name?: string
          position?: number | null
          values?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "product_options_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          compare_at_price_cents: number | null
          cost_price_cents: number | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          menu_item_id: string
          option1_name: string | null
          option1_value: string | null
          option2_name: string | null
          option2_value: string | null
          option3_name: string | null
          option3_value: string | null
          price_cents: number
          quantity_on_hand: number
          quantity_reserved: number
          reorder_point: number | null
          sku: string | null
          title: string
          updated_at: string | null
          weight_unit: string | null
          weight_value: number | null
        }
        Insert: {
          barcode?: string | null
          compare_at_price_cents?: number | null
          cost_price_cents?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          menu_item_id: string
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          option3_name?: string | null
          option3_value?: string | null
          price_cents: number
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_point?: number | null
          sku?: string | null
          title: string
          updated_at?: string | null
          weight_unit?: string | null
          weight_value?: number | null
        }
        Update: {
          barcode?: string | null
          compare_at_price_cents?: number | null
          cost_price_cents?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          menu_item_id?: string
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          option3_name?: string | null
          option3_value?: string | null
          price_cents?: number
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_point?: number | null
          sku?: string | null
          title?: string
          updated_at?: string | null
          weight_unit?: string | null
          weight_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_usage: {
        Row: {
          discount_applied_cents: number
          id: string
          order_id: string | null
          promo_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          discount_applied_cents: number
          id?: string
          order_id?: string | null
          promo_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          discount_applied_cents?: number
          id?: string
          order_id?: string | null
          promo_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applicable_to: string | null
          code: string
          created_at: string
          created_by: string | null
          customer_eligibility: string | null
          description: string | null
          discount_amount_cents: number | null
          discount_percentage: number | null
          id: string
          is_active: boolean
          maximum_discount_cents: number | null
          minimum_order_cents: number | null
          name: string
          per_user_limit: number | null
          type: string
          updated_at: string
          usage_count: number
          usage_limit: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_to?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          customer_eligibility?: string | null
          description?: string | null
          discount_amount_cents?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean
          maximum_discount_cents?: number | null
          minimum_order_cents?: number | null
          name: string
          per_user_limit?: number | null
          type?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_to?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          customer_eligibility?: string | null
          description?: string | null
          discount_amount_cents?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean
          maximum_discount_cents?: number | null
          minimum_order_cents?: number | null
          name?: string
          per_user_limit?: number | null
          type?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promo_ledger: {
        Row: {
          created_at: string | null
          credit_cents: number
          event_type: string
          id: string
          metadata: Json | null
          order_id: string | null
          promotion_id: string
          step: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credit_cents: number
          event_type: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          promotion_id: string
          step: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          credit_cents?: number
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          promotion_id?: string
          step?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
          {
            foreignKeyName: "promo_ledger_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promo_wallets: {
        Row: {
          created_at: string | null
          enrolled_at: string | null
          expires_at: string
          id: string
          is_locked: boolean | null
          promotion_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enrolled_at?: string | null
          expires_at: string
          id?: string
          is_locked?: boolean | null
          promotion_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enrolled_at?: string | null
          expires_at?: string
          id?: string
          is_locked?: boolean | null
          promotion_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_wallets_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promotion_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comment: string | null
          created_at: string | null
          document_id: string
          id: string
          required_role: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          required_role: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          required_role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "promotion_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "promotion_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_authority_revocations: {
        Row: {
          authority_scope: string | null
          created_at: string | null
          document_id: string | null
          engagement_id: string
          id: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          authority_scope?: string | null
          created_at?: string | null
          document_id?: string | null
          engagement_id: string
          id?: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          authority_scope?: string | null
          created_at?: string | null
          document_id?: string | null
          engagement_id?: string
          id?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_authority_revocations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "promotion_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_authority_revocations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_authority_revocations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promotion_comp_packages: {
        Row: {
          created_at: string | null
          deferred_salary_annual: number | null
          engagement_id: string
          equity_conditions: string | null
          equity_percent_target: number | null
          equity_type: string | null
          id: string
          salary_accrual_start_date: string | null
          salary_activation_triggers: string | null
          updated_at: string | null
          vesting_schedule: string | null
          visibility_level: string | null
        }
        Insert: {
          created_at?: string | null
          deferred_salary_annual?: number | null
          engagement_id: string
          equity_conditions?: string | null
          equity_percent_target?: number | null
          equity_type?: string | null
          id?: string
          salary_accrual_start_date?: string | null
          salary_activation_triggers?: string | null
          updated_at?: string | null
          vesting_schedule?: string | null
          visibility_level?: string | null
        }
        Update: {
          created_at?: string | null
          deferred_salary_annual?: number | null
          engagement_id?: string
          equity_conditions?: string | null
          equity_percent_target?: number | null
          equity_type?: string | null
          id?: string
          salary_accrual_start_date?: string | null
          salary_activation_triggers?: string | null
          updated_at?: string | null
          vesting_schedule?: string | null
          visibility_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_comp_packages_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          doc_type: string
          engagement_id: string
          html_template_id: string | null
          id: string
          rendered_html: string | null
          rendered_pdf_url: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          doc_type: string
          engagement_id: string
          html_template_id?: string | null
          id?: string
          rendered_html?: string | null
          rendered_pdf_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          doc_type?: string
          engagement_id?: string
          html_template_id?: string | null
          id?: string
          rendered_html?: string | null
          rendered_pdf_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "promotion_documents_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_engagements: {
        Row: {
          created_at: string | null
          current_stage: string
          current_title: string
          end_date: string | null
          exit_date: string | null
          exit_document_id: string | null
          exit_reason: string | null
          id: string
          is_review_blocked: boolean | null
          is_successor_eligible: boolean | null
          missed_review_count: number | null
          next_review_due_date: string | null
          notes: string | null
          person_id: string
          promotion_lock_reason: string | null
          promotion_locked: boolean | null
          promotion_readiness_percent: number | null
          reports_to_person_id: string | null
          review_cadence_days: number | null
          risk_status: string | null
          start_date: string
          successor_for_role: string | null
          successor_readiness_score: number | null
          track: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stage?: string
          current_title: string
          end_date?: string | null
          exit_date?: string | null
          exit_document_id?: string | null
          exit_reason?: string | null
          id?: string
          is_review_blocked?: boolean | null
          is_successor_eligible?: boolean | null
          missed_review_count?: number | null
          next_review_due_date?: string | null
          notes?: string | null
          person_id: string
          promotion_lock_reason?: string | null
          promotion_locked?: boolean | null
          promotion_readiness_percent?: number | null
          reports_to_person_id?: string | null
          review_cadence_days?: number | null
          risk_status?: string | null
          start_date?: string
          successor_for_role?: string | null
          successor_readiness_score?: number | null
          track?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stage?: string
          current_title?: string
          end_date?: string | null
          exit_date?: string | null
          exit_document_id?: string | null
          exit_reason?: string | null
          id?: string
          is_review_blocked?: boolean | null
          is_successor_eligible?: boolean | null
          missed_review_count?: number | null
          next_review_due_date?: string | null
          notes?: string | null
          person_id?: string
          promotion_lock_reason?: string | null
          promotion_locked?: boolean | null
          promotion_readiness_percent?: number | null
          reports_to_person_id?: string | null
          review_cadence_days?: number | null
          risk_status?: string | null
          start_date?: string
          successor_for_role?: string | null
          successor_readiness_score?: number | null
          track?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_engagements_exit_document_id_fkey"
            columns: ["exit_document_id"]
            isOneToOne: false
            referencedRelation: "promotion_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_engagements_reports_to_person_id_fkey"
            columns: ["reports_to_person_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_performance_reviews: {
        Row: {
          created_at: string | null
          deliverables_complete: boolean | null
          engagement_id: string
          id: string
          kpi_json: Json | null
          period_end: string
          period_start: string
          rating: number
          recommendation: string | null
          reviewer_person_id: string | null
        }
        Insert: {
          created_at?: string | null
          deliverables_complete?: boolean | null
          engagement_id: string
          id?: string
          kpi_json?: Json | null
          period_end: string
          period_start: string
          rating: number
          recommendation?: string | null
          reviewer_person_id?: string | null
        }
        Update: {
          created_at?: string | null
          deliverables_complete?: boolean | null
          engagement_id?: string
          id?: string
          kpi_json?: Json | null
          period_end?: string
          period_start?: string
          rating?: number
          recommendation?: string | null
          reviewer_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_performance_reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_review_schedules: {
        Row: {
          completed_at: string | null
          created_at: string | null
          engagement_id: string
          id: string
          is_blocking: boolean | null
          review_id: string | null
          review_type: string
          scheduled_date: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          engagement_id: string
          id?: string
          is_blocking?: boolean | null
          review_id?: string | null
          review_type: string
          scheduled_date: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          engagement_id?: string
          id?: string
          is_blocking?: boolean | null
          review_id?: string | null
          review_type?: string
          scheduled_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_review_schedules_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "promotion_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_review_schedules_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "promotion_performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_banners: {
        Row: {
          action_type: string | null
          action_url: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          subtitle: string
          target_audience: string | null
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          action_type?: string | null
          action_url?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          subtitle: string
          target_audience?: string | null
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          action_type?: string | null
          action_url?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          subtitle?: string
          target_audience?: string | null
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotional_banners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promotions: {
        Row: {
          code: string
          created_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          name: string
          rules: Json
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rules?: Json
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rules?: Json
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          approval_workflow: string | null
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          expected_delivery: string | null
          id: string
          invoice_id: string | null
          items: Json
          notes: string | null
          po_number: string
          requested_by: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          approval_workflow?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_delivery?: string | null
          id?: string
          invoice_id?: string | null
          items?: Json
          notes?: string | null
          po_number: string
          requested_by?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          approval_workflow?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_delivery?: string | null
          id?: string
          invoice_id?: string | null
          items?: Json
          notes?: string | null
          po_number?: string
          requested_by?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_orders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "procurement_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partner_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          device_type: string | null
          endpoint: string
          id: string
          is_active: boolean
          is_native: boolean
          p256dh_key: string
          push_token: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          device_type?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          is_native?: boolean
          p256dh_key: string
          push_token?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          device_type?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          is_native?: boolean
          p256dh_key?: string
          push_token?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer: string
          due_date: string
          id: string
          issue_date: string
          reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer: string
          due_date: string
          id?: string
          issue_date: string
          reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer?: string
          due_date?: string
          id?: string
          issue_date?: string
          reference?: string | null
          status?: string
        }
        Relationships: []
      }
      reconciliation_bank: {
        Row: {
          account_name: string
          account_type: string
          actual_balance: number | null
          checklist_completed: boolean | null
          checklist_items: Json | null
          closing_balance: number
          created_at: string | null
          discrepancy_notes: string | null
          expected_balance: number | null
          id: string
          notes: string | null
          opening_balance: number
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          reconciliation_period_end: string
          reconciliation_period_start: string
          status: string | null
          updated_at: string | null
          variance: number | null
        }
        Insert: {
          account_name: string
          account_type: string
          actual_balance?: number | null
          checklist_completed?: boolean | null
          checklist_items?: Json | null
          closing_balance: number
          created_at?: string | null
          discrepancy_notes?: string | null
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opening_balance: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          reconciliation_period_end: string
          reconciliation_period_start: string
          status?: string | null
          updated_at?: string | null
          variance?: number | null
        }
        Update: {
          account_name?: string
          account_type?: string
          actual_balance?: number | null
          checklist_completed?: boolean | null
          checklist_items?: Json | null
          closing_balance?: number
          created_at?: string | null
          discrepancy_notes?: string | null
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          reconciliation_period_end?: string
          reconciliation_period_start?: string
          status?: string | null
          updated_at?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_bank_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reconciliation_ledger: {
        Row: {
          actual_amount: number | null
          audit_log_id: string | null
          auto_suggestion: Json | null
          created_at: string | null
          description: string
          expected_amount: number | null
          id: string
          ledger_entry_id: string | null
          manual_adjustment_log: Json | null
          mismatch_type: string
          reconciliation_date: string
          reconciliation_period_end: string
          reconciliation_period_start: string
          resolution_action: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          suggestion_confidence: number | null
          updated_at: string | null
          variance: number | null
        }
        Insert: {
          actual_amount?: number | null
          audit_log_id?: string | null
          auto_suggestion?: Json | null
          created_at?: string | null
          description: string
          expected_amount?: number | null
          id?: string
          ledger_entry_id?: string | null
          manual_adjustment_log?: Json | null
          mismatch_type: string
          reconciliation_date: string
          reconciliation_period_end: string
          reconciliation_period_start: string
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          suggestion_confidence?: number | null
          updated_at?: string | null
          variance?: number | null
        }
        Update: {
          actual_amount?: number | null
          audit_log_id?: string | null
          auto_suggestion?: Json | null
          created_at?: string | null
          description?: string
          expected_amount?: number | null
          id?: string
          ledger_entry_id?: string | null
          manual_adjustment_log?: Json | null
          mismatch_type?: string
          reconciliation_date?: string
          reconciliation_period_end?: string
          reconciliation_period_start?: string
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          suggestion_confidence?: number | null
          updated_at?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_ledger_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_ledger_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reconciliations: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          period: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          period: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          period?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      referral_bonuses: {
        Row: {
          amount: number
          bonus_type: string
          created_at: string | null
          id: string
          paid_at: string | null
          referral_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          bonus_type: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          bonus_type?: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_bonuses_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_bonuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          user_id: string
          user_type: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          user_id: string
          user_type: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          milestone_1_amount_cents: number | null
          milestone_1_delivery_count: number | null
          milestone_2_amount_cents: number | null
          milestone_2_delivery_count: number | null
          min_orders_required: number
          referral_type: string | null
          referred_bonus_amount: number | null
          referred_bonus_cents: number
          referrer_bonus_amount: number | null
          referrer_bonus_cents: number
          require_background_check: boolean | null
          require_documents: boolean | null
          required_days_active: number | null
          required_min_rating: number | null
          requirements: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          milestone_1_amount_cents?: number | null
          milestone_1_delivery_count?: number | null
          milestone_2_amount_cents?: number | null
          milestone_2_delivery_count?: number | null
          min_orders_required?: number
          referral_type?: string | null
          referred_bonus_amount?: number | null
          referred_bonus_cents?: number
          referrer_bonus_amount?: number | null
          referrer_bonus_cents?: number
          require_background_check?: boolean | null
          require_documents?: boolean | null
          required_days_active?: number | null
          required_min_rating?: number | null
          requirements?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          milestone_1_amount_cents?: number | null
          milestone_1_delivery_count?: number | null
          milestone_2_amount_cents?: number | null
          milestone_2_delivery_count?: number | null
          min_orders_required?: number
          referral_type?: string | null
          referred_bonus_amount?: number | null
          referred_bonus_cents?: number
          referrer_bonus_amount?: number | null
          referrer_bonus_cents?: number
          require_background_check?: boolean | null
          require_documents?: boolean | null
          required_days_active?: number | null
          required_min_rating?: number | null
          requirements?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_video_content: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          referral_type: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          referral_type: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          referral_type?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          background_check_passed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_rating: number | null
          days_active: number | null
          documents_uploaded: boolean | null
          id: string
          milestone_1_amount_cents: number | null
          milestone_1_paid: boolean | null
          milestone_1_paid_at: string | null
          milestone_2_amount_cents: number | null
          milestone_2_paid: boolean | null
          milestone_2_paid_at: string | null
          paid_at: string | null
          referee_completed_deliveries: number | null
          referral_code: string
          referral_type: string
          referred_bonus_amount: number | null
          referred_id: string
          referrer_bonus_amount: number | null
          referrer_id: string
          requirements_met: boolean | null
          status: string | null
        }
        Insert: {
          background_check_passed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_rating?: number | null
          days_active?: number | null
          documents_uploaded?: boolean | null
          id?: string
          milestone_1_amount_cents?: number | null
          milestone_1_paid?: boolean | null
          milestone_1_paid_at?: string | null
          milestone_2_amount_cents?: number | null
          milestone_2_paid?: boolean | null
          milestone_2_paid_at?: string | null
          paid_at?: string | null
          referee_completed_deliveries?: number | null
          referral_code: string
          referral_type: string
          referred_bonus_amount?: number | null
          referred_id: string
          referrer_bonus_amount?: number | null
          referrer_id: string
          requirements_met?: boolean | null
          status?: string | null
        }
        Update: {
          background_check_passed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_rating?: number | null
          days_active?: number | null
          documents_uploaded?: boolean | null
          id?: string
          milestone_1_amount_cents?: number | null
          milestone_1_paid?: boolean | null
          milestone_1_paid_at?: string | null
          milestone_2_amount_cents?: number | null
          milestone_2_paid?: boolean | null
          milestone_2_paid_at?: string | null
          paid_at?: string | null
          referee_completed_deliveries?: number | null
          referral_code?: string
          referral_type?: string
          referred_bonus_amount?: number | null
          referred_id?: string
          referrer_bonus_amount?: number | null
          referrer_id?: string
          requirements_met?: boolean | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          created_at: string | null
          customer_id: string
          id: string
          order_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          requested_at: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          created_at?: string | null
          customer_id: string
          id?: string
          order_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          requested_at?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          created_at?: string | null
          customer_id?: string
          id?: string
          order_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          requested_at?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
          {
            foreignKeyName: "refund_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      regions: {
        Row: {
          active_quota: number | null
          created_at: string | null
          display_quota: number | null
          id: number
          name: string
          status: string | null
          updated_at: string | null
          zip_prefix: string | null
        }
        Insert: {
          active_quota?: number | null
          created_at?: string | null
          display_quota?: number | null
          id?: number
          name: string
          status?: string | null
          updated_at?: string | null
          zip_prefix?: string | null
        }
        Update: {
          active_quota?: number | null
          created_at?: string | null
          display_quota?: number | null
          id?: number
          name?: string
          status?: string | null
          updated_at?: string | null
          zip_prefix?: string | null
        }
        Relationships: []
      }
      restaurant_commission_overrides: {
        Row: {
          approved_by: string | null
          commission_percent: number
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean | null
          reason: string | null
          restaurant_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          commission_percent: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          restaurant_id: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          commission_percent?: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          restaurant_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_commission_overrides_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "restaurant_commission_overrides_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_commission_overrides_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_employee_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_employee_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_employee_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_employees: {
        Row: {
          created_at: string
          employee_id: string
          full_name: string
          id: string
          is_active: boolean
          pin_code: string
          restaurant_id: string
          role: string
          role_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          full_name: string
          id?: string
          is_active?: boolean
          pin_code: string
          restaurant_id: string
          role?: string
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          full_name?: string
          id?: string
          is_active?: boolean
          pin_code?: string
          restaurant_id?: string
          role?: string
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "restaurant_employee_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_go_live_checklist: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_blocker: boolean | null
          is_completed: boolean | null
          is_required: boolean | null
          item_description: string | null
          item_key: string
          item_name: string
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_blocker?: boolean | null
          is_completed?: boolean | null
          is_required?: boolean | null
          item_description?: string | null
          item_key: string
          item_name: string
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_blocker?: boolean | null
          is_completed?: boolean | null
          is_required?: boolean | null
          item_description?: string | null
          item_key?: string
          item_name?: string
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_go_live_checklist_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_go_live_checklist_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_groups: {
        Row: {
          commission_tier: string | null
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          commission_tier?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_tier?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      restaurant_hours: {
        Row: {
          close_time: string | null
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          close_time?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_integrations: {
        Row: {
          config: Json | null
          created_at: string | null
          credentials_encrypted: Json | null
          error_message: string | null
          id: string
          integration_type: string
          last_synced_at: string | null
          provider_name: string
          restaurant_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          credentials_encrypted?: Json | null
          error_message?: string | null
          id?: string
          integration_type: string
          last_synced_at?: string | null
          provider_name: string
          restaurant_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          credentials_encrypted?: Json | null
          error_message?: string | null
          id?: string
          integration_type?: string
          last_synced_at?: string | null
          provider_name?: string
          restaurant_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_integrations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_integrations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_onboarding: {
        Row: {
          admin_notes: string | null
          business_info_verified: boolean
          business_verified_at: string | null
          created_at: string
          go_live_ready: boolean
          id: string
          menu_preparation_status: string
          menu_ready_at: string | null
          restaurant_id: string
          tablet_shipped: boolean | null
          tablet_shipped_at: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          business_info_verified?: boolean
          business_verified_at?: string | null
          created_at?: string
          go_live_ready?: boolean
          id?: string
          menu_preparation_status?: string
          menu_ready_at?: string | null
          restaurant_id: string
          tablet_shipped?: boolean | null
          tablet_shipped_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          business_info_verified?: boolean
          business_verified_at?: string | null
          created_at?: string
          go_live_ready?: boolean
          id?: string
          menu_preparation_status?: string
          menu_ready_at?: string | null
          restaurant_id?: string
          tablet_shipped?: boolean | null
          tablet_shipped_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_onboarding_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_onboarding_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_onboarding_activity_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          restaurant_id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          restaurant_id: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_onboarding_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "restaurant_onboarding_activity_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_onboarding_activity_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_onboarding_progress: {
        Row: {
          admin_notes: string | null
          business_info_verified: boolean | null
          business_verified_at: string | null
          created_at: string | null
          delivery_status: string | null
          go_live_ready: boolean | null
          go_live_scheduled_at: string | null
          id: string
          menu_preparation_status:
            | Database["public"]["Enums"]["menu_preparation_status"]
            | null
          menu_ready_at: string | null
          package_weight_oz: number | null
          restaurant_id: string
          shipping_cost_cents: number | null
          tablet_delivered_at: string | null
          tablet_preparing_at: string | null
          tablet_preparing_shipment: boolean | null
          tablet_serial_number: string | null
          tablet_shipped: boolean | null
          tablet_shipped_at: string | null
          tablet_shipping_carrier: string | null
          tablet_shipping_label_url: string | null
          tablet_tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          business_info_verified?: boolean | null
          business_verified_at?: string | null
          created_at?: string | null
          delivery_status?: string | null
          go_live_ready?: boolean | null
          go_live_scheduled_at?: string | null
          id?: string
          menu_preparation_status?:
            | Database["public"]["Enums"]["menu_preparation_status"]
            | null
          menu_ready_at?: string | null
          package_weight_oz?: number | null
          restaurant_id: string
          shipping_cost_cents?: number | null
          tablet_delivered_at?: string | null
          tablet_preparing_at?: string | null
          tablet_preparing_shipment?: boolean | null
          tablet_serial_number?: string | null
          tablet_shipped?: boolean | null
          tablet_shipped_at?: string | null
          tablet_shipping_carrier?: string | null
          tablet_shipping_label_url?: string | null
          tablet_tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          business_info_verified?: boolean | null
          business_verified_at?: string | null
          created_at?: string | null
          delivery_status?: string | null
          go_live_ready?: boolean | null
          go_live_scheduled_at?: string | null
          id?: string
          menu_preparation_status?:
            | Database["public"]["Enums"]["menu_preparation_status"]
            | null
          menu_ready_at?: string | null
          package_weight_oz?: number | null
          restaurant_id?: string
          shipping_cost_cents?: number | null
          tablet_delivered_at?: string | null
          tablet_preparing_at?: string | null
          tablet_preparing_shipment?: boolean | null
          tablet_serial_number?: string | null
          tablet_shipped?: boolean | null
          tablet_shipped_at?: string | null
          tablet_shipping_carrier?: string | null
          tablet_shipping_label_url?: string | null
          tablet_tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_onboarding_progress_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_onboarding_progress_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_report_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          report_id: string
          row_count: number | null
          schedule_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          report_id: string
          row_count?: number | null
          schedule_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          report_id?: string
          row_count?: number | null
          schedule_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_report_executions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "restaurant_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_report_executions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "restaurant_report_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_report_schedules: {
        Row: {
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          email_recipients: string[]
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          report_id: string
          time_of_day: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          email_recipients?: string[]
          frequency: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          report_id: string
          time_of_day?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          email_recipients?: string[]
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          report_id?: string
          time_of_day?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_report_schedules_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "restaurant_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_report_templates: {
        Row: {
          available_filters: Json
          category: string
          created_at: string
          default_columns: Json
          description: string | null
          id: string
          is_active: boolean
          name: string
          sql_query: string
          updated_at: string
        }
        Insert: {
          available_filters?: Json
          category: string
          created_at?: string
          default_columns?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sql_query: string
          updated_at?: string
        }
        Update: {
          available_filters?: Json
          category?: string
          created_at?: string
          default_columns?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sql_query?: string
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_reports: {
        Row: {
          columns: Json
          created_at: string
          created_by: string | null
          description: string | null
          filters: Json
          format: string
          id: string
          is_scheduled: boolean
          name: string
          restaurant_id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          format?: string
          id?: string
          is_scheduled?: boolean
          name: string
          restaurant_id: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          format?: string
          id?: string
          is_scheduled?: boolean
          name?: string
          restaurant_id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "restaurant_reports_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_reports_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "restaurant_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_special_hours: {
        Row: {
          close_time: string | null
          created_at: string | null
          end_date: string
          id: string
          is_closed: boolean | null
          name: string
          open_time: string | null
          restaurant_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          close_time?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_closed?: boolean | null
          name: string
          open_time?: string | null
          restaurant_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          close_time?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_closed?: boolean | null
          name?: string
          open_time?: string | null
          restaurant_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_special_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_special_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_users: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          last_name: string | null
          restaurant_id: string
          role: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_name?: string | null
          restaurant_id: string
          role: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_name?: string | null
          restaurant_id?: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "restaurant_users_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_users_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      restaurant_verification_tasks: {
        Row: {
          assigned_admin_id: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          id: string
          restaurant_id: string
          status: Database["public"]["Enums"]["verification_task_status"] | null
          task_type: Database["public"]["Enums"]["verification_task_type"]
          updated_at: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          id?: string
          restaurant_id: string
          status?:
            | Database["public"]["Enums"]["verification_task_status"]
            | null
          task_type: Database["public"]["Enums"]["verification_task_type"]
          updated_at?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          id?: string
          restaurant_id?: string
          status?:
            | Database["public"]["Enums"]["verification_task_status"]
            | null
          task_type?: Database["public"]["Enums"]["verification_task_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_verification_tasks_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "restaurant_verification_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "restaurant_verification_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string
          alcohol_enabled: boolean | null
          auto_descriptions_enabled: boolean | null
          background_check_authorized: boolean | null
          banking_complete: boolean | null
          business_license_url: string | null
          business_verified_at: string | null
          chat_enabled: boolean | null
          city: string | null
          commission_tier: string | null
          cravemore_eligible: boolean | null
          created_at: string | null
          cuisine_type: string | null
          delivery_fee_cents: number | null
          delivery_radius_miles: number | null
          description: string | null
          email: string | null
          estimated_delivery_time: number | null
          expected_monthly_orders: number | null
          go_live_scheduled_at: string | null
          has_physical_location: boolean | null
          header_image_url: string | null
          health_permit_url: string | null
          id: string
          image_url: string | null
          instagram_handle: string | null
          insurance_certificate_url: string | null
          is_active: boolean | null
          is_promoted: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          marketing_opt_in: boolean | null
          max_delivery_time: number | null
          menu_ready_at: string | null
          merchant_category: Database["public"]["Enums"]["merchant_category"]
          merchant_welcome_shown: boolean | null
          merchant_welcome_shown_at: string | null
          min_delivery_time: number | null
          minimum_order_cents: number | null
          moov_account_id: string | null
          moov_capabilities: Json | null
          moov_fee_plan_codes: string[] | null
          moov_onboarding_complete: boolean | null
          moov_onboarding_invite_code: string | null
          moov_onboarding_status: string | null
          name: string
          onboarding_status: string | null
          owner_id: string | null
          owner_id_url: string | null
          phone: string | null
          pos_system: string | null
          promotion_description: string | null
          promotion_discount_amount_cents: number | null
          promotion_discount_percentage: number | null
          promotion_image_url: string | null
          promotion_maximum_discount_cents: number | null
          promotion_minimum_order_cents: number | null
          promotion_title: string | null
          promotion_valid_until: string | null
          rating: number | null
          readiness_score: number | null
          restaurant_type: string | null
          setup_deadline: string | null
          ssn_last4: string | null
          state: string | null
          stripe_charges_enabled: boolean | null
          stripe_connect_account_id: string | null
          stripe_onboarding_complete: boolean | null
          stripe_payouts_enabled: boolean | null
          tablet_password: string | null
          tablet_shipped_at: string | null
          total_reviews: number
          updated_at: string | null
          verification_notes: Json | null
          zip_code: string | null
        }
        Insert: {
          address: string
          alcohol_enabled?: boolean | null
          auto_descriptions_enabled?: boolean | null
          background_check_authorized?: boolean | null
          banking_complete?: boolean | null
          business_license_url?: string | null
          business_verified_at?: string | null
          chat_enabled?: boolean | null
          city?: string | null
          commission_tier?: string | null
          cravemore_eligible?: boolean | null
          created_at?: string | null
          cuisine_type?: string | null
          delivery_fee_cents?: number | null
          delivery_radius_miles?: number | null
          description?: string | null
          email?: string | null
          estimated_delivery_time?: number | null
          expected_monthly_orders?: number | null
          go_live_scheduled_at?: string | null
          has_physical_location?: boolean | null
          header_image_url?: string | null
          health_permit_url?: string | null
          id?: string
          image_url?: string | null
          instagram_handle?: string | null
          insurance_certificate_url?: string | null
          is_active?: boolean | null
          is_promoted?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          marketing_opt_in?: boolean | null
          max_delivery_time?: number | null
          menu_ready_at?: string | null
          merchant_category?: Database["public"]["Enums"]["merchant_category"]
          merchant_welcome_shown?: boolean | null
          merchant_welcome_shown_at?: string | null
          min_delivery_time?: number | null
          minimum_order_cents?: number | null
          moov_account_id?: string | null
          moov_capabilities?: Json | null
          moov_fee_plan_codes?: string[] | null
          moov_onboarding_complete?: boolean | null
          moov_onboarding_invite_code?: string | null
          moov_onboarding_status?: string | null
          name: string
          onboarding_status?: string | null
          owner_id?: string | null
          owner_id_url?: string | null
          phone?: string | null
          pos_system?: string | null
          promotion_description?: string | null
          promotion_discount_amount_cents?: number | null
          promotion_discount_percentage?: number | null
          promotion_image_url?: string | null
          promotion_maximum_discount_cents?: number | null
          promotion_minimum_order_cents?: number | null
          promotion_title?: string | null
          promotion_valid_until?: string | null
          rating?: number | null
          readiness_score?: number | null
          restaurant_type?: string | null
          setup_deadline?: string | null
          ssn_last4?: string | null
          state?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
          tablet_password?: string | null
          tablet_shipped_at?: string | null
          total_reviews?: number
          updated_at?: string | null
          verification_notes?: Json | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          alcohol_enabled?: boolean | null
          auto_descriptions_enabled?: boolean | null
          background_check_authorized?: boolean | null
          banking_complete?: boolean | null
          business_license_url?: string | null
          business_verified_at?: string | null
          chat_enabled?: boolean | null
          city?: string | null
          commission_tier?: string | null
          cravemore_eligible?: boolean | null
          created_at?: string | null
          cuisine_type?: string | null
          delivery_fee_cents?: number | null
          delivery_radius_miles?: number | null
          description?: string | null
          email?: string | null
          estimated_delivery_time?: number | null
          expected_monthly_orders?: number | null
          go_live_scheduled_at?: string | null
          has_physical_location?: boolean | null
          header_image_url?: string | null
          health_permit_url?: string | null
          id?: string
          image_url?: string | null
          instagram_handle?: string | null
          insurance_certificate_url?: string | null
          is_active?: boolean | null
          is_promoted?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          marketing_opt_in?: boolean | null
          max_delivery_time?: number | null
          menu_ready_at?: string | null
          merchant_category?: Database["public"]["Enums"]["merchant_category"]
          merchant_welcome_shown?: boolean | null
          merchant_welcome_shown_at?: string | null
          min_delivery_time?: number | null
          minimum_order_cents?: number | null
          moov_account_id?: string | null
          moov_capabilities?: Json | null
          moov_fee_plan_codes?: string[] | null
          moov_onboarding_complete?: boolean | null
          moov_onboarding_invite_code?: string | null
          moov_onboarding_status?: string | null
          name?: string
          onboarding_status?: string | null
          owner_id?: string | null
          owner_id_url?: string | null
          phone?: string | null
          pos_system?: string | null
          promotion_description?: string | null
          promotion_discount_amount_cents?: number | null
          promotion_discount_percentage?: number | null
          promotion_image_url?: string | null
          promotion_maximum_discount_cents?: number | null
          promotion_minimum_order_cents?: number | null
          promotion_title?: string | null
          promotion_valid_until?: string | null
          rating?: number | null
          readiness_score?: number | null
          restaurant_type?: string | null
          setup_deadline?: string | null
          ssn_last4?: string | null
          state?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_payouts_enabled?: boolean | null
          tablet_password?: string | null
          tablet_shipped_at?: string | null
          total_reviews?: number
          updated_at?: string | null
          verification_notes?: Json | null
          zip_code?: string | null
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          impact: string | null
          likelihood: string | null
          metadata: Json | null
          mitigation_plan: string | null
          responsible_person_id: string | null
          risk_category: string
          risk_score: number | null
          risk_title: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          metadata?: Json | null
          mitigation_plan?: string | null
          responsible_person_id?: string | null
          risk_category: string
          risk_score?: number | null
          risk_title: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          metadata?: Json | null
          mitigation_plan?: string | null
          responsible_person_id?: string | null
          risk_category?: string
          risk_score?: number | null
          risk_title?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      risk_register: {
        Row: {
          category: string
          created_at: string | null
          id: string
          impact: string
          likelihood: string
          mitigation: string | null
          owner: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          impact: string
          likelihood: string
          mitigation?: string | null
          owner?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          impact?: string
          likelihood?: string
          mitigation?: string | null
          owner?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          id: string
          permission_key: string
          position_id: string
        }
        Insert: {
          allowed?: boolean
          id?: string
          permission_key: string
          position_id: string
        }
        Update: {
          allowed?: boolean
          id?: string
          permission_key?: string
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["permission_key"]
          },
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: number
          label: string | null
          name: Database["public"]["Enums"]["role_name"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          label?: string | null
          name: Database["public"]["Enums"]["role_name"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          label?: string | null
          name?: Database["public"]["Enums"]["role_name"]
        }
        Relationships: []
      }
      roles_catalog: {
        Row: {
          authority_template: string | null
          created_at: string | null
          default_deferred_salary: number | null
          default_equity_target: number | null
          id: string
          role_name: string
          tier: number
        }
        Insert: {
          authority_template?: string | null
          created_at?: string | null
          default_deferred_salary?: number | null
          default_equity_target?: number | null
          id?: string
          role_name: string
          tier: number
        }
        Update: {
          authority_template?: string | null
          created_at?: string | null
          default_deferred_salary?: number | null
          default_equity_target?: number | null
          id?: string
          role_name?: string
          tier?: number
        }
        Relationships: []
      }
      rollback_recommendations: {
        Row: {
          created_at: string | null
          deployment_id: string | null
          id: string
          priority: string | null
          reason: string
        }
        Insert: {
          created_at?: string | null
          deployment_id?: string | null
          id?: string
          priority?: string | null
          reason: string
        }
        Update: {
          created_at?: string | null
          deployment_id?: string | null
          id?: string
          priority?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollback_recommendations_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "cto_architecture_changes"
            referencedColumns: ["id"]
          },
        ]
      }
      root_cause_suggestions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          incident_id: string | null
          suggestion: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          suggestion: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          suggestion?: string
        }
        Relationships: [
          {
            foreignKeyName: "root_cause_suggestions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "it_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audits: {
        Row: {
          assigned_to: string | null
          audit_type: string
          created_at: string | null
          finding: string
          id: string
          metadata: Json | null
          recommendation: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          audit_type: string
          created_at?: string | null
          finding: string
          id?: string
          metadata?: Json | null
          recommendation?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          audit_type?: string
          created_at?: string | null
          finding?: string
          id?: string
          metadata?: Json | null
          recommendation?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sensitive_data_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          id: string
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          id?: string
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          id?: string
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sensitive_data_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      share_certificates: {
        Row: {
          appointment_id: string | null
          certificate_number: string
          created_at: string
          document_url: string | null
          html_template: string | null
          id: string
          issue_date: string
          recipient_user_id: string
          replaced_by_certificate_id: string | null
          resolution_id: string | null
          share_class: string | null
          shares_amount: number
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          certificate_number: string
          created_at?: string
          document_url?: string | null
          html_template?: string | null
          id?: string
          issue_date?: string
          recipient_user_id: string
          replaced_by_certificate_id?: string | null
          resolution_id?: string | null
          share_class?: string | null
          shares_amount: number
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          certificate_number?: string
          created_at?: string
          document_url?: string | null
          html_template?: string | null
          id?: string
          issue_date?: string
          recipient_user_id?: string
          replaced_by_certificate_id?: string | null
          resolution_id?: string | null
          share_class?: string | null
          shares_amount?: number
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_certificates_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_certificates_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "share_certificates_replaced_by_certificate_id_fkey"
            columns: ["replaced_by_certificate_id"]
            isOneToOne: false
            referencedRelation: "share_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_certificates_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "governance_board_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      share_certificates_backup: {
        Row: {
          appointment_id: string | null
          certificate_number: string | null
          created_at: string | null
          document_url: string | null
          html_template: string | null
          id: string | null
          issue_date: string | null
          recipient_user_id: string | null
          replaced_by_certificate_id: string | null
          resolution_id: string | null
          share_class: string | null
          shares_amount: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          certificate_number?: string | null
          created_at?: string | null
          document_url?: string | null
          html_template?: string | null
          id?: string | null
          issue_date?: string | null
          recipient_user_id?: string | null
          replaced_by_certificate_id?: string | null
          resolution_id?: string | null
          share_class?: string | null
          shares_amount?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          certificate_number?: string | null
          created_at?: string | null
          document_url?: string | null
          html_template?: string | null
          id?: string | null
          issue_date?: string | null
          recipient_user_id?: string | null
          replaced_by_certificate_id?: string | null
          resolution_id?: string | null
          share_class?: string | null
          shares_amount?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      signatures: {
        Row: {
          document_id: string | null
          id: string
          ip: string | null
          signature_data_url: string | null
          signed_at: string | null
          signed_by: string | null
        }
        Insert: {
          document_id?: string | null
          id?: string
          ip?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          signed_by?: string | null
        }
        Update: {
          document_id?: string | null
          id?: string
          ip?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          signed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "executive_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      sod_rules: {
        Row: {
          conflicting_permissions: string[]
          description: string | null
          enforcement_level: string | null
          id: string
          is_active: boolean | null
          rule_code: string
          rule_name: string
          violation_severity: string | null
        }
        Insert: {
          conflicting_permissions: string[]
          description?: string | null
          enforcement_level?: string | null
          id?: string
          is_active?: boolean | null
          rule_code: string
          rule_name: string
          violation_severity?: string | null
        }
        Update: {
          conflicting_permissions?: string[]
          description?: string | null
          enforcement_level?: string | null
          id?: string
          is_active?: boolean | null
          rule_code?: string
          rule_name?: string
          violation_severity?: string | null
        }
        Relationships: []
      }
      sop_documents: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_size_bytes: number | null
          id: string
          keywords: string[] | null
          last_reviewed_at: string | null
          markdown_file_path: string | null
          next_review_due_at: string | null
          owner_department: string | null
          page_count: number | null
          pdf_file_path: string | null
          review_frequency_days: number | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          updated_by: string | null
          version: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size_bytes?: number | null
          id?: string
          keywords?: string[] | null
          last_reviewed_at?: string | null
          markdown_file_path?: string | null
          next_review_due_at?: string | null
          owner_department?: string | null
          page_count?: number | null
          pdf_file_path?: string | null
          review_frequency_days?: number | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size_bytes?: number | null
          id?: string
          keywords?: string[] | null
          last_reviewed_at?: string | null
          markdown_file_path?: string | null
          next_review_due_at?: string | null
          owner_department?: string | null
          page_count?: number | null
          pdf_file_path?: string | null
          review_frequency_days?: number | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sop_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      speed_violations: {
        Row: {
          actual_speed: number
          created_at: string | null
          delivery_id: string | null
          excess_speed: number
          id: string
          latitude: number
          longitude: number
          points_penalty: number
          speed_limit: number
          timestamp: string
          user_id: string
        }
        Insert: {
          actual_speed: number
          created_at?: string | null
          delivery_id?: string | null
          excess_speed: number
          id?: string
          latitude: number
          longitude: number
          points_penalty: number
          speed_limit: number
          timestamp: string
          user_id: string
        }
        Update: {
          actual_speed?: number
          created_at?: string | null
          delivery_id?: string | null
          excess_speed?: number
          id?: string
          latitude?: number
          longitude?: number
          points_penalty?: number
          speed_limit?: number
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_violations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      store_employees: {
        Row: {
          created_at: string | null
          hired_date: string | null
          id: string
          is_active: boolean | null
          role: string
          store_location_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hired_date?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          store_location_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hired_date?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          store_location_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_employees_store_location_id_fkey"
            columns: ["store_location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      store_inventory: {
        Row: {
          id: string
          is_available: boolean | null
          last_updated: string | null
          low_stock_threshold: number | null
          menu_item_id: string
          quantity_available: number | null
          store_location_id: string
        }
        Insert: {
          id?: string
          is_available?: boolean | null
          last_updated?: string | null
          low_stock_threshold?: number | null
          menu_item_id: string
          quantity_available?: number | null
          store_location_id: string
        }
        Update: {
          id?: string
          is_available?: boolean | null
          last_updated?: string | null
          low_stock_threshold?: number | null
          menu_item_id?: string
          quantity_available?: number | null
          store_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_store_location_id_fkey"
            columns: ["store_location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_locations: {
        Row: {
          address: string
          city: string
          coordinates: unknown
          created_at: string | null
          delivery_radius_miles: number | null
          email: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          name: string
          operating_hours: Json | null
          phone: string | null
          restaurant_id: string
          state: string
          updated_at: string | null
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          coordinates?: unknown
          created_at?: string | null
          delivery_radius_miles?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          restaurant_id: string
          state: string
          updated_at?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          coordinates?: unknown
          created_at?: string | null
          delivery_radius_miles?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          restaurant_id?: string
          state?: string
          updated_at?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "store_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          assigned_at: string | null
          completed_at: string | null
          id: string
          order_id: string
          store_location_id: string
        }
        Insert: {
          assigned_at?: string | null
          completed_at?: string | null
          id?: string
          order_id: string
          store_location_id: string
        }
        Update: {
          assigned_at?: string | null
          completed_at?: string | null
          id?: string
          order_id?: string
          store_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
          {
            foreignKeyName: "store_orders_store_location_id_fkey"
            columns: ["store_location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_accounts: {
        Row: {
          charges_enabled: boolean | null
          created_at: string | null
          details_submitted: boolean | null
          id: string
          owner_id: string
          owner_type: string
          payouts_enabled: boolean | null
          requirements: Json | null
          stripe_account_id: string
          updated_at: string | null
        }
        Insert: {
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          owner_id: string
          owner_type: string
          payouts_enabled?: boolean | null
          requirements?: Json | null
          stripe_account_id: string
          updated_at?: string | null
        }
        Update: {
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          owner_id?: string
          owner_type?: string
          payouts_enabled?: boolean | null
          requirements?: Json | null
          stripe_account_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created: string
          error: string | null
          event_id: string
          metadata: Json | null
          processed_at: string | null
          received_at: string | null
          status: string | null
          type: string
        }
        Insert: {
          created: string
          error?: string | null
          event_id: string
          metadata?: Json | null
          processed_at?: string | null
          received_at?: string | null
          status?: string | null
          type: string
        }
        Update: {
          created?: string
          error?: string | null
          event_id?: string
          metadata?: Json | null
          processed_at?: string | null
          received_at?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          benefits: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_annual: number
          price_monthly: number
          updated_at: string
        }
        Insert: {
          benefits?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_annual: number
          price_monthly: number
          updated_at?: string
        }
        Update: {
          benefits?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_annual?: number
          price_monthly?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          benefit_type: string
          created_at: string | null
          discount_amount: number
          id: string
          order_id: string
          subscription_id: string
        }
        Insert: {
          benefit_type: string
          created_at?: string | null
          discount_amount: number
          id?: string
          order_id: string
          subscription_id: string
        }
        Update: {
          benefit_type?: string
          created_at?: string | null
          discount_amount?: number
          id?: string
          order_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_agents: {
        Row: {
          avatar_url: string | null
          avg_response_time_seconds: number | null
          avg_satisfaction_rating: number | null
          created_at: string | null
          current_active_chats: number | null
          display_name: string
          id: string
          is_online: boolean | null
          max_concurrent_chats: number | null
          total_chats_handled: number | null
          total_chats_resolved: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          avg_response_time_seconds?: number | null
          avg_satisfaction_rating?: number | null
          created_at?: string | null
          current_active_chats?: number | null
          display_name: string
          id?: string
          is_online?: boolean | null
          max_concurrent_chats?: number | null
          total_chats_handled?: number | null
          total_chats_resolved?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          avg_response_time_seconds?: number | null
          avg_satisfaction_rating?: number | null
          created_at?: string | null
          current_active_chats?: number | null
          display_name?: string
          id?: string
          is_online?: boolean | null
          max_concurrent_chats?: number | null
          total_chats_handled?: number | null
          total_chats_resolved?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_staff: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          role: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          role: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_staff_metrics: {
        Row: {
          avg_handle_minutes: number | null
          created_at: string | null
          csat_score: number | null
          date: string
          escalations_count: number | null
          id: string
          notes: string | null
          staff_id: string | null
          tickets_resolved: number | null
        }
        Insert: {
          avg_handle_minutes?: number | null
          created_at?: string | null
          csat_score?: number | null
          date: string
          escalations_count?: number | null
          id?: string
          notes?: string | null
          staff_id?: string | null
          tickets_resolved?: number | null
        }
        Update: {
          avg_handle_minutes?: number | null
          created_at?: string | null
          csat_score?: number | null
          date?: string
          escalations_count?: number | null
          id?: string
          notes?: string | null
          staff_id?: string | null
          tickets_resolved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "support_staff_metrics_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "support_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          customer_id: string
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string | null
          customer_id: string
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          ticket_number: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          customer_id?: string
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tablet_inventory: {
        Row: {
          created_at: string
          id: string
          model: string
          notes: string | null
          purchase_date: string | null
          serial_number: string
          status: string
          updated_at: string
          warranty_expiry: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          model: string
          notes?: string | null
          purchase_date?: string | null
          serial_number: string
          status?: string
          updated_at?: string
          warranty_expiry?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          model?: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string
          status?: string
          updated_at?: string
          warranty_expiry?: string | null
        }
        Relationships: []
      }
      tablet_shipments: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_date: string | null
          id: string
          notes: string | null
          restaurant_id: string
          shipped_date: string | null
          shipping_address: Json
          status: string
          tablet_id: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_date?: string | null
          id?: string
          notes?: string | null
          restaurant_id: string
          shipped_date?: string | null
          shipping_address: Json
          status?: string
          tablet_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_date?: string | null
          id?: string
          notes?: string | null
          restaurant_id?: string
          shipped_date?: string | null
          shipping_address?: Json
          status?: string
          tablet_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tablet_shipments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "tablet_shipments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_shipments_tablet_id_fkey"
            columns: ["tablet_id"]
            isOneToOne: false
            referencedRelation: "tablet_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_calendar: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          due_date: string
          id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      tax_credits: {
        Row: {
          created_at: string | null
          credit_name: string
          credit_type: string
          eligibility_status: string
          estimated_value: number
          id: string
        }
        Insert: {
          created_at?: string | null
          credit_name: string
          credit_type: string
          eligibility_status: string
          estimated_value?: number
          id?: string
        }
        Update: {
          created_at?: string | null
          credit_name?: string
          credit_type?: string
          eligibility_status?: string
          estimated_value?: number
          id?: string
        }
        Relationships: []
      }
      tax_estimates: {
        Row: {
          created_at: string | null
          effective_rate: number
          estimated_income: number
          federal_tax: number
          id: string
          state_tax: number
          tax_year: number
          total_tax: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          effective_rate?: number
          estimated_income?: number
          federal_tax?: number
          id?: string
          state_tax?: number
          tax_year: number
          total_tax?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          effective_rate?: number
          estimated_income?: number
          federal_tax?: number
          id?: string
          state_tax?: number
          tax_year?: number
          total_tax?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tech_actual_costs: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          period: string
          recorded_at: string | null
          usage_metrics: Json | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          period: string
          recorded_at?: string | null
          usage_metrics?: Json | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          period?: string
          recorded_at?: string | null
          usage_metrics?: Json | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_actual_costs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tech_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_actual_costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "tech_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_budgets: {
        Row: {
          budgeted_amount: number
          category_id: string | null
          created_at: string | null
          id: string
          period: string
          updated_at: string | null
        }
        Insert: {
          budgeted_amount?: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          period: string
          updated_at?: string | null
        }
        Update: {
          budgeted_amount?: number
          category_id?: string | null
          created_at?: string | null
          id?: string
          period?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tech_cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_cost_alert_notifications: {
        Row: {
          alert_id: string | null
          error_message: string | null
          id: string
          notification_type: string
          recipient_email: string | null
          sent_at: string | null
          slack_channel: string | null
          status: string | null
        }
        Insert: {
          alert_id?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          recipient_email?: string | null
          sent_at?: string | null
          slack_channel?: string | null
          status?: string | null
        }
        Update: {
          alert_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string | null
          sent_at?: string | null
          slack_channel?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_cost_alert_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "tech_cost_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_cost_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          category_id: string | null
          created_at: string | null
          estimated_impact: number | null
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          status: string | null
          title: string
          variance_percentage: number | null
          vendor_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          category_id?: string | null
          created_at?: string | null
          estimated_impact?: number | null
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          status?: string | null
          title: string
          variance_percentage?: number | null
          vendor_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          category_id?: string | null
          created_at?: string | null
          estimated_impact?: number | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          title?: string
          variance_percentage?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_cost_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tech_cost_alerts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tech_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_cost_alerts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "tech_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_cost_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_cost_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "tech_cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_cost_forecasts: {
        Row: {
          assumptions: Json | null
          category_id: string | null
          confidence_level: number | null
          created_at: string | null
          forecast_period: string
          forecast_type: string
          forecasted_amount: number
          id: string
        }
        Insert: {
          assumptions?: Json | null
          category_id?: string | null
          confidence_level?: number | null
          created_at?: string | null
          forecast_period: string
          forecast_type: string
          forecasted_amount: number
          id?: string
        }
        Update: {
          assumptions?: Json | null
          category_id?: string | null
          confidence_level?: number | null
          created_at?: string | null
          forecast_period?: string
          forecast_type?: string
          forecasted_amount?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_cost_forecasts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tech_cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_knowledge_base: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_published: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_knowledge_base_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tech_licenses: {
        Row: {
          cost_per_license: number | null
          created_at: string | null
          id: string
          last_usage_check: string | null
          license_type: string
          optimization_recommendation: string | null
          total_licenses: number
          unused_licenses: number | null
          updated_at: string | null
          used_licenses: number | null
          vendor_id: string | null
        }
        Insert: {
          cost_per_license?: number | null
          created_at?: string | null
          id?: string
          last_usage_check?: string | null
          license_type: string
          optimization_recommendation?: string | null
          total_licenses: number
          unused_licenses?: number | null
          updated_at?: string | null
          used_licenses?: number | null
          vendor_id?: string | null
        }
        Update: {
          cost_per_license?: number | null
          created_at?: string | null
          id?: string
          last_usage_check?: string | null
          license_type?: string
          optimization_recommendation?: string | null
          total_licenses?: number
          unused_licenses?: number | null
          updated_at?: string | null
          used_licenses?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_licenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "tech_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_vendors: {
        Row: {
          annual_cost: number | null
          billing_cycle: string | null
          category_id: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_shadow_tool: boolean | null
          metadata: Json | null
          monthly_cost: number
          name: string
          service_name: string
          updated_at: string | null
        }
        Insert: {
          annual_cost?: number | null
          billing_cycle?: string | null
          category_id?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_shadow_tool?: boolean | null
          metadata?: Json | null
          monthly_cost: number
          name: string
          service_name: string
          updated_at?: string | null
        }
        Update: {
          annual_cost?: number | null
          billing_cycle?: string | null
          category_id?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_shadow_tool?: boolean | null
          metadata?: Json | null
          monthly_cost?: number
          name?: string
          service_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_vendors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tech_cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      template_usage: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          template_id: string
          template_type: string
          updated_at: string
          usage_context: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          template_id: string
          template_type: string
          updated_at?: string
          usage_context: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          template_id?: string
          template_type?: string
          updated_at?: string
          usage_context?: string
        }
        Relationships: []
      }
      tester_activity_days: {
        Row: {
          activity_date: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          activity_date: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tester_activity_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tester_credit_grants: {
        Row: {
          created_at: string | null
          credit_cents: number
          enrollment_id: string | null
          expires_at: string
          grant_type: string
          id: string
          is_expired: boolean | null
          is_revoked: boolean | null
          issued_at: string | null
          revoked_at: string | null
          revoked_reason: string | null
          updated_at: string | null
          used_cents: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credit_cents: number
          enrollment_id?: string | null
          expires_at: string
          grant_type: string
          id?: string
          is_expired?: boolean | null
          is_revoked?: boolean | null
          issued_at?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          updated_at?: string | null
          used_cents?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credit_cents?: number
          enrollment_id?: string | null
          expires_at?: string
          grant_type?: string
          id?: string
          is_expired?: boolean | null
          is_revoked?: boolean | null
          issued_at?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          updated_at?: string | null
          used_cents?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tester_credit_grants_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "android_tester_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tester_credit_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tester_credit_ledger: {
        Row: {
          applied_at: string | null
          credit_cents: number
          credit_grant_id: string
          credit_type: string
          fee_amount_after_credit_cents: number
          fee_amount_before_credit_cents: number
          fee_type_before_credit: string
          id: string
          metadata: Json | null
          order_id: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          credit_cents: number
          credit_grant_id: string
          credit_type: string
          fee_amount_after_credit_cents: number
          fee_amount_before_credit_cents: number
          fee_type_before_credit: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          credit_cents?: number
          credit_grant_id?: string
          credit_type?: string
          fee_amount_after_credit_cents?: number
          fee_amount_before_credit_cents?: number
          fee_type_before_credit?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tester_credit_ledger_credit_grant_id_fkey"
            columns: ["credit_grant_id"]
            isOneToOne: false
            referencedRelation: "tester_credit_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tester_credit_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tester_credit_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tester_credit_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
          {
            foreignKeyName: "tester_credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tester_feedback_events: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          prompt_key: string
          rating: number | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          prompt_key: string
          rating?: number | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          prompt_key?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tester_feedback_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tester_referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          merchant_contact_email: string | null
          merchant_contact_name: string | null
          merchant_contact_phone: string | null
          merchant_name: string | null
          referral_type: string
          referred_email: string | null
          referred_phone: string | null
          referrer_user_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          merchant_contact_email?: string | null
          merchant_contact_name?: string | null
          merchant_contact_phone?: string | null
          merchant_name?: string | null
          referral_type: string
          referred_email?: string | null
          referred_phone?: string | null
          referrer_user_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          merchant_contact_email?: string | null
          merchant_contact_name?: string | null
          merchant_contact_phone?: string | null
          merchant_name?: string | null
          referral_type?: string
          referred_email?: string | null
          referred_phone?: string | null
          referrer_user_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tester_referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tester_reward_issuances: {
        Row: {
          credit_grant_id: string | null
          id: string
          issued_at: string | null
          tier: string
          user_id: string
        }
        Insert: {
          credit_grant_id?: string | null
          id?: string
          issued_at?: string | null
          tier: string
          user_id: string
        }
        Update: {
          credit_grant_id?: string | null
          id?: string
          issued_at?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tester_reward_issuances_credit_grant_id_fkey"
            columns: ["credit_grant_id"]
            isOneToOne: false
            referencedRelation: "tester_credit_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tester_reward_issuances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_history: {
        Row: {
          created_at: string
          feeder_id: string
          id: string
          new_tier: Database["public"]["Enums"]["feeder_tier"]
          old_tier: Database["public"]["Enums"]["feeder_tier"]
          reason: string | null
        }
        Insert: {
          created_at?: string
          feeder_id: string
          id?: string
          new_tier: Database["public"]["Enums"]["feeder_tier"]
          old_tier: Database["public"]["Enums"]["feeder_tier"]
          reason?: string | null
        }
        Update: {
          created_at?: string
          feeder_id?: string
          id?: string
          new_tier?: Database["public"]["Enums"]["feeder_tier"]
          old_tier?: Database["public"]["Enums"]["feeder_tier"]
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_history_feeder_id_fkey"
            columns: ["feeder_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_duration_minutes: number | null
          clock_in_at: string
          clock_out_at: string | null
          created_at: string | null
          employee_id: string | null
          exec_user_id: string | null
          id: string
          notes: string | null
          status: string
          total_hours: number | null
          updated_at: string | null
          user_id: string
          work_location: string | null
        }
        Insert: {
          break_duration_minutes?: number | null
          clock_in_at: string
          clock_out_at?: string | null
          created_at?: string | null
          employee_id?: string | null
          exec_user_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string | null
          user_id: string
          work_location?: string | null
        }
        Update: {
          break_duration_minutes?: number | null
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string | null
          employee_id?: string | null
          exec_user_id?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string | null
          user_id?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "payroll_summary"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_entries_exec_user_id_fkey"
            columns: ["exec_user_id"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transaction_limits: {
        Row: {
          created_at: string | null
          currency: string | null
          effective_date: string
          entity_id: string | null
          expiration_date: string | null
          id: string
          max_amount: number | null
          period_type: string | null
          role_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          effective_date?: string
          entity_id?: string | null
          expiration_date?: string | null
          id?: string
          max_amount?: number | null
          period_type?: string | null
          role_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          effective_date?: string
          entity_id?: string | null
          expiration_date?: string | null
          id?: string
          max_amount?: number | null
          period_type?: string | null
          role_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_limits_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "finance_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_limits_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "finance_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_operations: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string
          currency: string | null
          executed_at: string | null
          executed_by: string | null
          executed_date: string | null
          id: string
          metadata: Json | null
          notes: string | null
          operation_date: string
          operation_number: string
          operation_type: string
          requires_approval: boolean | null
          source_account_id: string | null
          status: string
          target_account_id: string | null
          updated_at: string | null
          value_date: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          executed_at?: string | null
          executed_by?: string | null
          executed_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          operation_date: string
          operation_number: string
          operation_type: string
          requires_approval?: boolean | null
          source_account_id?: string | null
          status?: string
          target_account_id?: string | null
          updated_at?: string | null
          value_date?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          executed_at?: string | null
          executed_by?: string | null
          executed_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          operation_date?: string
          operation_number?: string
          operation_type?: string
          requires_approval?: boolean | null
          source_account_id?: string | null
          status?: string
          target_account_id?: string | null
          updated_at?: string | null
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_operations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "treasury_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "treasury_operations_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "treasury_operations_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_operations_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          device_id: string
          device_name: string
          device_type: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_used_at: string | null
          location_city: string | null
          location_country: string | null
          location_region: string | null
          trusted_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_id: string
          device_name: string
          device_type: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          trusted_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_id?: string
          device_name?: string
          device_type?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          trusted_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      two_factor_backup_codes: {
        Row: {
          code_hash: string
          created_at: string | null
          id: string
          used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_backup_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      unified_audit_trail: {
        Row: {
          action_category: string
          action_description: string
          action_type: string
          compliance_tag: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          requires_review: boolean | null
          session_id: string | null
          severity: string | null
          target_resource_id: string | null
          target_resource_name: string | null
          target_resource_type: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action_category: string
          action_description: string
          action_type: string
          compliance_tag?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          requires_review?: boolean | null
          session_id?: string | null
          severity?: string | null
          target_resource_id?: string | null
          target_resource_name?: string | null
          target_resource_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action_category?: string
          action_description?: string
          action_type?: string
          compliance_tag?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          requires_review?: boolean | null
          session_id?: string | null
          severity?: string | null
          target_resource_id?: string | null
          target_resource_name?: string | null
          target_resource_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_audit_trail_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          location: string | null
          metadata: Json | null
          portal_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          metadata?: Json | null
          portal_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          metadata?: Json | null
          portal_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_finance_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_finance_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_finance_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "finance_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_finance_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_memberships: {
        Row: {
          canceled_at: string | null
          created_at: string | null
          founding_member: boolean | null
          id: string
          plan_key: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          renews_at: string | null
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string | null
          founding_member?: boolean | null
          id?: string
          plan_key: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          renews_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string | null
          founding_member?: boolean | null
          id?: string
          plan_key?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          renews_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_enabled: boolean
          notification_setting_id: string | null
          push_enabled: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_setting_id?: string | null
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_setting_id?: string | null
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_notification_setting_id_fkey"
            columns: ["notification_setting_id"]
            isOneToOne: false
            referencedRelation: "notification_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          allowed: boolean
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          allowed: boolean
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["permission_key"]
          },
          {
            foreignKeyName: "user_permission_overrides_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_permission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          account_status: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          fcm_token: string | null
          full_name: string | null
          id: string
          needs_password_reset: boolean | null
          notification_preferences: Json | null
          phone: string | null
          preferences: Json | null
          role: string | null
          settings: Json | null
          stripe_customer_id: string | null
          suspension_reason: string | null
          suspension_until: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          fcm_token?: string | null
          full_name?: string | null
          id?: string
          needs_password_reset?: boolean | null
          notification_preferences?: Json | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          settings?: Json | null
          stripe_customer_id?: string | null
          suspension_reason?: string | null
          suspension_until?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          fcm_token?: string | null
          full_name?: string | null
          id?: string
          needs_password_reset?: boolean | null
          notification_preferences?: Json | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          settings?: Json | null
          stripe_customer_id?: string | null
          suspension_reason?: string | null
          suspension_until?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_id: string | null
          device_name: string | null
          device_type: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          is_current_session: boolean | null
          last_activity_at: string | null
          location_city: string | null
          location_country: string | null
          location_region: string | null
          portal_type: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_current_session?: boolean | null
          last_activity_at?: string | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          portal_type?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_current_session?: boolean | null
          last_activity_at?: string | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          portal_type?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string | null
          cancelled_at: string | null
          created_at: string | null
          end_date: string | null
          id: string
          next_billing_date: string | null
          plan_id: string
          start_date: string | null
          status: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          plan_id: string
          start_date?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          next_billing_date?: string | null
          plan_id?: string
          start_date?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password_hash: string
          phone: string | null
          role: string
          Role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
          phone?: string | null
          role: string
          Role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
          phone?: string | null
          role?: string
          Role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_contracts: {
        Row: {
          auto_renew: boolean | null
          contract_type: string
          contract_value: number | null
          created_at: string | null
          end_date: string
          id: string
          metadata: Json | null
          renewal_terms: string | null
          signed_at: string | null
          signed_by: string | null
          start_date: string
          status: string | null
          terms_document_url: string | null
          vendor_id: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          contract_type: string
          contract_value?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          metadata?: Json | null
          renewal_terms?: string | null
          signed_at?: string | null
          signed_by?: string | null
          start_date: string
          status?: string | null
          terms_document_url?: string | null
          vendor_id?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          contract_type?: string
          contract_value?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          metadata?: Json | null
          renewal_terms?: string | null
          signed_at?: string | null
          signed_by?: string | null
          start_date?: string
          status?: string | null
          terms_document_url?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contracts_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vendor_contracts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partner_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vesting_schedules: {
        Row: {
          acceleration_events: Json | null
          cliff_months: number | null
          created_at: string
          end_date: string | null
          grant_id: string | null
          id: string
          recipient_user_id: string
          start_date: string
          total_shares: number
          unvested_shares: number | null
          updated_at: string
          vested_shares: number | null
          vesting_period_months: number
          vesting_schedule: Json
          vesting_type: string
        }
        Insert: {
          acceleration_events?: Json | null
          cliff_months?: number | null
          created_at?: string
          end_date?: string | null
          grant_id?: string | null
          id?: string
          recipient_user_id: string
          start_date: string
          total_shares: number
          unvested_shares?: number | null
          updated_at?: string
          vested_shares?: number | null
          vesting_period_months: number
          vesting_schedule?: Json
          vesting_type: string
        }
        Update: {
          acceleration_events?: Json | null
          cliff_months?: number | null
          created_at?: string
          end_date?: string | null
          grant_id?: string | null
          id?: string
          recipient_user_id?: string
          start_date?: string
          total_shares?: number
          unvested_shares?: number | null
          updated_at?: string
          vested_shares?: number | null
          vesting_period_months?: number
          vesting_schedule?: Json
          vesting_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vesting_schedules_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          amount_cents: number
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          order_id: string | null
          stripe_auth_id: string | null
          stripe_txn_id: string | null
          type: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          order_id?: string | null
          stripe_auth_id?: string | null
          stripe_txn_id?: string | null
          type: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          stripe_auth_id?: string | null
          stripe_txn_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallet_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_needs_attention"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "stacked_orders_view"
            referencedColumns: ["stack_parent_id"]
          },
        ]
      }
      wire_transfers: {
        Row: {
          amount: number
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          approver_id: string | null
          bank_account_id: string | null
          beneficiary_account: string
          beneficiary_address: string | null
          beneficiary_bank_address: string | null
          beneficiary_bank_name: string
          beneficiary_bank_routing: string | null
          beneficiary_bank_swift: string | null
          beneficiary_name: string
          confirmation_number: string | null
          created_at: string | null
          created_by: string
          currency: string | null
          direction: string
          error_message: string | null
          exchange_rate: number | null
          executed_at: string | null
          executed_by: string | null
          executed_date: string | null
          external_reference: string | null
          id: string
          metadata: Json | null
          payment_instructions: string | null
          purpose_of_payment: string | null
          requested_date: string
          requires_approval: boolean | null
          retry_count: number | null
          sender_account: string | null
          sender_bank_name: string | null
          sender_bank_swift: string | null
          sender_name: string | null
          status: string
          transfer_type: string
          updated_at: string | null
          value_date: string | null
          wire_fee: number | null
          wire_number: string
        }
        Insert: {
          amount: number
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          bank_account_id?: string | null
          beneficiary_account: string
          beneficiary_address?: string | null
          beneficiary_bank_address?: string | null
          beneficiary_bank_name: string
          beneficiary_bank_routing?: string | null
          beneficiary_bank_swift?: string | null
          beneficiary_name: string
          confirmation_number?: string | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          direction: string
          error_message?: string | null
          exchange_rate?: number | null
          executed_at?: string | null
          executed_by?: string | null
          executed_date?: string | null
          external_reference?: string | null
          id?: string
          metadata?: Json | null
          payment_instructions?: string | null
          purpose_of_payment?: string | null
          requested_date: string
          requires_approval?: boolean | null
          retry_count?: number | null
          sender_account?: string | null
          sender_bank_name?: string | null
          sender_bank_swift?: string | null
          sender_name?: string | null
          status?: string
          transfer_type: string
          updated_at?: string | null
          value_date?: string | null
          wire_fee?: number | null
          wire_number: string
        }
        Update: {
          amount?: number
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          bank_account_id?: string | null
          beneficiary_account?: string
          beneficiary_address?: string | null
          beneficiary_bank_address?: string | null
          beneficiary_bank_name?: string
          beneficiary_bank_routing?: string | null
          beneficiary_bank_swift?: string | null
          beneficiary_name?: string
          confirmation_number?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          direction?: string
          error_message?: string | null
          exchange_rate?: number | null
          executed_at?: string | null
          executed_by?: string | null
          executed_date?: string | null
          external_reference?: string | null
          id?: string
          metadata?: Json | null
          payment_instructions?: string | null
          purpose_of_payment?: string | null
          requested_date?: string
          requires_approval?: boolean | null
          retry_count?: number | null
          sender_account?: string | null
          sender_bank_name?: string | null
          sender_bank_swift?: string | null
          sender_name?: string | null
          status?: string
          transfer_type?: string
          updated_at?: string | null
          value_date?: string | null
          wire_fee?: number | null
          wire_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "wire_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wire_transfers_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wire_transfers_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wire_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wire_transfers_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      zones: {
        Row: {
          active_drivers: number
          capacity: number
          city: string
          cravemore_eligible: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          state: string
          updated_at: string | null
          waitlist_count: number
          zip_code: string
        }
        Insert: {
          active_drivers?: number
          capacity?: number
          city: string
          cravemore_eligible?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          state: string
          updated_at?: string | null
          waitlist_count?: number
          zip_code: string
        }
        Update: {
          active_drivers?: number
          capacity?: number
          city?: string
          cravemore_eligible?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          state?: string
          updated_at?: string | null
          waitlist_count?: number
          zip_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      campaign_performance: {
        Row: {
          avg_cpa: number | null
          avg_ctr: number | null
          avg_roas: number | null
          budget: number | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_type: string | null
          channel: string | null
          new_customers: number | null
          spend_to_date: number | null
          status: string | null
          total_clicks: number | null
          total_conversions: number | null
          total_impressions: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      effective_permissions: {
        Row: {
          allowed: boolean | null
          permission_key: string | null
          user_id: string | null
        }
        Relationships: []
      }
      executive_identity_admin: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          executive_id: string | null
          full_name: string | null
          id: string | null
          postal_code: string | null
          ssn_last4: string | null
          state: string | null
          updated_at: string | null
          w9_storage_path: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          executive_id?: string | null
          full_name?: string | null
          id?: string | null
          postal_code?: string | null
          ssn_last4?: string | null
          state?: string | null
          updated_at?: string | null
          w9_storage_path?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          executive_id?: string | null
          full_name?: string | null
          id?: string | null
          postal_code?: string | null
          ssn_last4?: string | null
          state?: string | null
          updated_at?: string | null
          w9_storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_identity_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: true
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      foundational_invite_analytics: {
        Row: {
          accepted_at: string | null
          access_code: string | null
          access_count: number | null
          email: string | null
          expires_at: string | null
          first_access_at: string | null
          full_name: string | null
          id: string | null
          invited_at: string | null
          last_accessed_at: string | null
          most_recent_access_at: string | null
          paid_amount_cents: number | null
          paid_at: string | null
          relationship_note: string | null
          status: string | null
          total_page_views: number | null
          unique_days_accessed: number | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      inventory_health_by_category: {
        Row: {
          expiring_soon: number | null
          inventory_value_cents: number | null
          low_stock_skus: number | null
          merchant_category:
            | Database["public"]["Enums"]["merchant_category"]
            | null
          out_of_stock_skus: number | null
          restaurant_id: string | null
          restaurant_name: string | null
          total_skus: number | null
        }
        Relationships: []
      }
      investor_demo_analytics: {
        Row: {
          access_count: number | null
          customer_views: number | null
          driver_views: number | null
          email: string | null
          expires_at: string | null
          full_name: string | null
          invited_at: string | null
          last_accessed_at: string | null
          last_view_at: string | null
          merchant_views: number | null
          organization: string | null
          status: string | null
          total_views: number | null
        }
        Relationships: []
      }
      merchant_category_summary: {
        Row: {
          active_merchants: number | null
          avg_rating: number | null
          avg_readiness_score: number | null
          category_display_name: string | null
          merchant_category:
            | Database["public"]["Enums"]["merchant_category"]
            | null
          merchant_count: number | null
          pending_merchants: number | null
        }
        Relationships: []
      }
      orders_by_merchant_category: {
        Row: {
          avg_order_cents: number | null
          cancellation_rate_pct: number | null
          cancelled_count: number | null
          delivered_count: number | null
          merchant_category:
            | Database["public"]["Enums"]["merchant_category"]
            | null
          order_date: string | null
          total_food_subtotal_cents: number | null
          total_orders: number | null
          total_revenue_cents: number | null
          total_tips_cents: number | null
        }
        Relationships: []
      }
      orders_needs_attention: {
        Row: {
          accepted_at: string | null
          accepted_driver_id: string | null
          amount_total_cents: number | null
          assigned_craver_id: string | null
          attention_reason: string | null
          auto_boost_cap_cents: number | null
          auto_boost_enabled: boolean | null
          base_delivery_fee_cents: number | null
          base_pay: number | null
          batch_id: string | null
          broadcast_started_at: string | null
          created_at: string | null
          currency: string | null
          customer_boost_required: boolean | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_fee_cents: number | null
          delivery_fees_total_cents: number | null
          delivery_method: string | null
          demand_fee_cents: number | null
          diamond_only_until: string | null
          distance_fee_cents: number | null
          distance_km: number | null
          driver_base_pay_cents: number | null
          driver_delivery_fee_share_bps: number | null
          driver_fee_share_cents: number | null
          driver_id: string | null
          driver_pay_cents: number | null
          driver_payout_cents: number | null
          dropoff_address: Json | null
          dropoff_location: Json | null
          escalated_total_cents: number | null
          escalation_fee_cents: number | null
          estimated_delivery_time: string | null
          estimated_distance_meters: number | null
          estimated_duration_seconds: number | null
          exclusive_type: string | null
          food_subtotal_cents: number | null
          id: string | null
          is_test: boolean | null
          merchant_commission_cents: number | null
          merchant_payout_cents: number | null
          next_escalation_at: string | null
          next_escalation_step: number | null
          order_number: string | null
          order_status: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_provider: string | null
          payment_status: string | null
          payout_cents: number | null
          payout_hidden: boolean | null
          pickup_address: Json | null
          pickup_code: string | null
          pickup_confirmed_at: string | null
          pickup_location: Json | null
          pickup_photo_url: string | null
          platform_delivery_share_cents: number | null
          platform_fee_cents: number | null
          platform_food_commission_cents: number | null
          promo_applied: boolean | null
          promo_applied_at: string | null
          promo_credit_applied_cents: number | null
          promo_delivery_credit_applied_cents: number | null
          promo_id: string | null
          promo_service_credit_applied_cents: number | null
          promo_step: number | null
          restaurant_id: string | null
          restaurant_net_cents: number | null
          route_geometry: Json | null
          service_fee: number | null
          service_fee_cents: number | null
          stripe_payment_intent_id: string | null
          stripe_transfer_driver_id: string | null
          stripe_transfer_restaurant_id: string | null
          subtotal_cents: number | null
          tax_cents: number | null
          time_fee_cents: number | null
          tip: number | null
          tip_cents: number | null
          total_amount: number | null
          total_cents: number | null
          transfers_error: string | null
          transfers_lease_expires_at: string | null
          transfers_lease_id: string | null
          transfers_status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_driver_id?: string | null
          amount_total_cents?: number | null
          assigned_craver_id?: string | null
          attention_reason?: never
          auto_boost_cap_cents?: number | null
          auto_boost_enabled?: boolean | null
          base_delivery_fee_cents?: number | null
          base_pay?: number | null
          batch_id?: string | null
          broadcast_started_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_boost_required?: boolean | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_fee_cents?: number | null
          delivery_fees_total_cents?: number | null
          delivery_method?: string | null
          demand_fee_cents?: number | null
          diamond_only_until?: string | null
          distance_fee_cents?: number | null
          distance_km?: number | null
          driver_base_pay_cents?: number | null
          driver_delivery_fee_share_bps?: number | null
          driver_fee_share_cents?: number | null
          driver_id?: string | null
          driver_pay_cents?: number | null
          driver_payout_cents?: number | null
          dropoff_address?: Json | null
          dropoff_location?: Json | null
          escalated_total_cents?: number | null
          escalation_fee_cents?: number | null
          estimated_delivery_time?: string | null
          estimated_distance_meters?: number | null
          estimated_duration_seconds?: number | null
          exclusive_type?: string | null
          food_subtotal_cents?: number | null
          id?: string | null
          is_test?: boolean | null
          merchant_commission_cents?: number | null
          merchant_payout_cents?: number | null
          next_escalation_at?: string | null
          next_escalation_step?: number | null
          order_number?: string | null
          order_status?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          payout_cents?: number | null
          payout_hidden?: boolean | null
          pickup_address?: Json | null
          pickup_code?: string | null
          pickup_confirmed_at?: string | null
          pickup_location?: Json | null
          pickup_photo_url?: string | null
          platform_delivery_share_cents?: number | null
          platform_fee_cents?: number | null
          platform_food_commission_cents?: number | null
          promo_applied?: boolean | null
          promo_applied_at?: string | null
          promo_credit_applied_cents?: number | null
          promo_delivery_credit_applied_cents?: number | null
          promo_id?: string | null
          promo_service_credit_applied_cents?: number | null
          promo_step?: number | null
          restaurant_id?: string | null
          restaurant_net_cents?: number | null
          route_geometry?: Json | null
          service_fee?: number | null
          service_fee_cents?: number | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_driver_id?: string | null
          stripe_transfer_restaurant_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
          time_fee_cents?: number | null
          tip?: number | null
          tip_cents?: number | null
          total_amount?: number | null
          total_cents?: number | null
          transfers_error?: string | null
          transfers_lease_expires_at?: string | null
          transfers_lease_id?: string | null
          transfers_status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_driver_id?: string | null
          amount_total_cents?: number | null
          assigned_craver_id?: string | null
          attention_reason?: never
          auto_boost_cap_cents?: number | null
          auto_boost_enabled?: boolean | null
          base_delivery_fee_cents?: number | null
          base_pay?: number | null
          batch_id?: string | null
          broadcast_started_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_boost_required?: boolean | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_fee_cents?: number | null
          delivery_fees_total_cents?: number | null
          delivery_method?: string | null
          demand_fee_cents?: number | null
          diamond_only_until?: string | null
          distance_fee_cents?: number | null
          distance_km?: number | null
          driver_base_pay_cents?: number | null
          driver_delivery_fee_share_bps?: number | null
          driver_fee_share_cents?: number | null
          driver_id?: string | null
          driver_pay_cents?: number | null
          driver_payout_cents?: number | null
          dropoff_address?: Json | null
          dropoff_location?: Json | null
          escalated_total_cents?: number | null
          escalation_fee_cents?: number | null
          estimated_delivery_time?: string | null
          estimated_distance_meters?: number | null
          estimated_duration_seconds?: number | null
          exclusive_type?: string | null
          food_subtotal_cents?: number | null
          id?: string | null
          is_test?: boolean | null
          merchant_commission_cents?: number | null
          merchant_payout_cents?: number | null
          next_escalation_at?: string | null
          next_escalation_step?: number | null
          order_number?: string | null
          order_status?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          payout_cents?: number | null
          payout_hidden?: boolean | null
          pickup_address?: Json | null
          pickup_code?: string | null
          pickup_confirmed_at?: string | null
          pickup_location?: Json | null
          pickup_photo_url?: string | null
          platform_delivery_share_cents?: number | null
          platform_fee_cents?: number | null
          platform_food_commission_cents?: number | null
          promo_applied?: boolean | null
          promo_applied_at?: string | null
          promo_credit_applied_cents?: number | null
          promo_delivery_credit_applied_cents?: number | null
          promo_id?: string | null
          promo_service_credit_applied_cents?: number | null
          promo_step?: number | null
          restaurant_id?: string | null
          restaurant_net_cents?: number | null
          route_geometry?: Json | null
          service_fee?: number | null
          service_fee_cents?: number | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_driver_id?: string | null
          stripe_transfer_restaurant_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
          time_fee_cents?: number | null
          tip?: number | null
          tip_cents?: number | null
          total_amount?: number | null
          total_cents?: number | null
          transfers_error?: string | null
          transfers_lease_expires_at?: string | null
          transfers_lease_id?: string | null
          transfers_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_craver_id_fkey"
            columns: ["assigned_craver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "inventory_health_by_category"
            referencedColumns: ["restaurant_id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_summary: {
        Row: {
          department_id: string | null
          department_name: string | null
          employee_id: string | null
          employee_name: string | null
          last_payment_date: string | null
          pay_periods: number | null
          total_gross: number | null
          total_net: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      stacked_orders_view: {
        Row: {
          combined_total_cents: number | null
          customer_id: string | null
          orders: Json | null
          parent_status: string | null
          stack_created_at: string | null
          stack_parent_id: string | null
          total_orders_in_stack: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stripe_accounts_summary: {
        Row: {
          charges_enabled: boolean | null
          created_at: string | null
          details_submitted: boolean | null
          id: string | null
          owner_id: string | null
          owner_name: string | null
          owner_type: string | null
          payouts_enabled: boolean | null
          requirements: Json | null
          stripe_account_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      unified_driver_applications: {
        Row: {
          auth_user_id: string | null
          city: string | null
          contract_signed_at: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          points: number | null
          priority_score: number | null
          region_capacity: number | null
          region_id: number | null
          region_name: string | null
          region_status: string | null
          ssn_last4: string | null
          status: string | null
          updated_at: string | null
          waitlist_joined_at: string | null
          waitlist_position: number | null
          zip: string | null
        }
        Relationships: [
          {
            foreignKeyName: "craver_applications_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craver_applications_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "effective_permissions"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accumulate_gas_money: {
        Args: { p_amount_cents: number; p_driver_id: string }
        Returns: undefined
      }
      add_diamond_points: {
        Args: {
          p_driver_id: string
          p_order_id?: string
          p_points: number
          p_source: string
        }
        Returns: undefined
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_update_craving_progress: {
        Args: {
          p_current_points?: number
          p_date?: string
          p_max_points?: number
          p_user_id: string
        }
        Returns: undefined
      }
      alert_expiring_contracts: {
        Args: never
        Returns: {
          days_until_expiry: number
          document_id: string
          title: string
        }[]
      }
      apply_subscription_benefits: {
        Args: { p_order_id: string }
        Returns: Json
      }
      apply_tester_credits_to_checkout: {
        Args: {
          p_delivery_fee_cents?: number
          p_platform_fee_cents?: number
          p_service_fee_cents?: number
          p_user_id: string
        }
        Returns: Json
      }
      approve_approval_item: {
        Args: { p_actor_id?: string; p_comment?: string; p_queue_id: string }
        Returns: undefined
      }
      auto_create_cost_alerts: { Args: never; Returns: number }
      award_wheel_completion_bonus: {
        Args: { p_bonus_amount?: number; p_user_id: string }
        Returns: undefined
      }
      backfill_executive_documents_from_appointments: {
        Args: never
        Returns: {
          appointment_id: string
          created: boolean
          document_type: string
          executive_id: string
        }[]
      }
      backfill_my_executive_documents: {
        Args: { p_user_email: string }
        Returns: number
      }
      calculate_acceptance_rate: {
        Args: { p_days_back?: number; p_user_id: string }
        Returns: number
      }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_driver_daily_earnings: {
        Args: { target_date: string; target_driver_id: string }
        Returns: number
      }
      calculate_driver_payout_cents: {
        Args: {
          p_base_pay_cents?: number
          p_delivery_fees_total_cents: number
          p_share_bps?: number
          p_tip_cents: number
        }
        Returns: {
          driver_before_tip_cents: number
          driver_fee_share_cents: number
          driver_payout_cents: number
          platform_delivery_share_cents: number
        }[]
      }
      calculate_due_date: {
        Args: { p_invoice_date: string; p_payment_terms?: string }
        Returns: string
      }
      calculate_foundational_tier: {
        Args: { p_amount_cents: number }
        Returns: Json
      }
      calculate_marketing_roi: {
        Args: { campaign_uuid: string }
        Returns: {
          cpa: number
          new_customers: number
          roas: number
          roi_percent: number
          total_revenue: number
          total_spend: number
        }[]
      }
      calculate_merchant_payout_cents: {
        Args: {
          p_food_subtotal_cents: number
          p_merchant_commission_bps?: number
        }
        Returns: {
          merchant_commission_cents: number
          merchant_payout_cents: number
          platform_food_commission_cents: number
        }[]
      }
      calculate_order_splits: {
        Args: {
          p_delivery_fee_cents: number
          p_subtotal_cents: number
          p_tax_cents: number
          p_tip_cents: number
        }
        Returns: {
          amount_total_cents: number
          driver_pay_cents: number
          platform_fee_cents: number
          restaurant_net_cents: number
        }[]
      }
      calculate_waitlist_position: {
        Args: { driver_uuid: string }
        Returns: number
      }
      check_all_documents_signed: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      check_core_modules_completed: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_cost_variances: {
        Args: never
        Returns: {
          actual: number
          budgeted: number
          category_id: string
          category_name: string
          variance: number
          variance_pct: number
        }[]
      }
      check_customer_notification_preference: {
        Args: { p_category: string; p_channel?: string; p_user_id: string }
        Returns: boolean
      }
      check_inventory_for_order: {
        Args: { p_items: Json; p_restaurant_id: string }
        Returns: Json
      }
      check_point_in_zones: {
        Args: { lat: number; lng: number }
        Returns: {
          restaurant_id: string
          zone_id: string
          zone_name: string
        }[]
      }
      check_role_modules_completed: {
        Args: { p_role_track: string; p_user_id: string }
        Returns: boolean
      }
      check_sod_violation: {
        Args: { p_permission_codes: string[]; p_user_id: string }
        Returns: boolean
      }
      check_violation_threshold: {
        Args: { p_hours_back?: number; p_threshold?: number; p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_expired_verifications: { Args: never; Returns: undefined }
      clock_in: {
        Args: { p_user_id: string; p_work_location?: string }
        Returns: string
      }
      clock_out: {
        Args: { p_break_duration_minutes?: number; p_user_id: string }
        Returns: string
      }
      compute_delivery_fees_total_cents: {
        Args: {
          p_base_delivery_fee_cents: number
          p_demand_fee_cents: number
          p_distance_fee_cents: number
          p_escalation_fee_cents?: number
          p_time_fee_cents: number
        }
        Returns: number
      }
      create_board_resolution_for_removal: {
        Args: {
          p_created_by?: string
          p_employee_email: string
          p_employee_id: string
          p_employee_name: string
          p_employee_position: string
          p_grounds_for_cause?: string[]
          p_termination_reason: string
          p_termination_type: string
          p_workflow_id: string
        }
        Returns: string
      }
      create_budget_approval: {
        Args: { budget_uuid: string; request_description?: string }
        Returns: string
      }
      create_default_onboarding_tasks: {
        Args: { driver_uuid: string }
        Returns: undefined
      }
      create_delivery_zone: {
        Args: {
          p_city: string
          p_geojson: Json
          p_name: string
          p_state: string
          p_zip_code: string
        }
        Returns: {
          active: boolean
          city: string
          created_at: string
          created_by: string | null
          geom: unknown
          id: string
          name: string | null
          state: string
          updated_at: string
          zip_code: string
        }
        SetofOptions: {
          from: "*"
          to: "delivery_zones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_driver_profile_from_application: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      create_executive_user: {
        Args: {
          p_access_level?: number
          p_department?: string
          p_role: string
          p_title?: string
          p_user_id: string
        }
        Returns: string
      }
      create_group_conversation: {
        Args: {
          p_created_by_exec_id: string
          p_device_id?: string
          p_name: string
          p_participant_exec_ids: string[]
          p_portal_context: string
        }
        Returns: string
      }
      create_invoice_from_email: {
        Args: {
          p_amount?: number
          p_due_date?: string
          p_email_subject?: string
          p_extracted_data?: Json
          p_invoice_date?: string
          p_invoice_file_url?: string
          p_notes?: string
          p_payment_terms?: string
          p_tax_amount?: number
          p_vendor_email: string
          p_vendor_name: string
        }
        Returns: {
          amount: number
          created_at: string
          due_date: string
          id: string
          invoice_date: string
          invoice_file_url: string
          invoice_number: string
          notes: string
          status: string
          tax_amount: number
          total_amount: number
          vendor_email: string
          vendor_name: string
        }[]
      }
      create_moov_onboarding_invite_record: {
        Args: { p_invite_code: string; p_restaurant_id: string }
        Returns: string
      }
      credit_wallet_from_earnings: {
        Args: {
          p_amount_cents: number
          p_driver_id: string
          p_order_id: string
        }
        Returns: undefined
      }
      daitch_mokotoff: { Args: { "": string }; Returns: string[] }
      decrypt_driver_identity: {
        Args: { p_driver_id: string; p_encryption_key: string }
        Returns: Json
      }
      deduct_inventory: {
        Args: { p_items: Json; p_restaurant_id: string }
        Returns: undefined
      }
      disablelongtransactions: { Args: never; Returns: string }
      dmetaphone: { Args: { "": string }; Returns: string }
      dmetaphone_alt: { Args: { "": string }; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      encrypt_driver_identity: {
        Args: {
          p_dl_number: string
          p_dl_state: string
          p_dob: string
          p_driver_id: string
          p_encryption_key: string
          p_ssn: string
        }
        Returns: Json
      }
      enroll_android_tester: {
        Args: { p_email: string; p_full_name: string; p_platform?: string }
        Returns: Json
      }
      ensure_ceo_marketing_access: { Args: never; Returns: undefined }
      ensure_driver_can_go_online: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      evaluate_feeder_tier: {
        Args: { p_feeder_id: string }
        Returns: undefined
      }
      expire_old_investor_tokens: { Args: never; Returns: undefined }
      finalize_order_transfers: {
        Args: {
          p_driver_transfer_id: string
          p_order_id: string
          p_restaurant_transfer_id: string
          p_transfers_lease_id: string
        }
        Returns: boolean
      }
      finalize_wallet_clearing: {
        Args: {
          p_cleared_amount_cents: number
          p_driver_id: string
          p_held_amount_cents: number
          p_stripe_auth_id: string
          p_stripe_txn_id: string
        }
        Returns: undefined
      }
      generate_certificate_number: { Args: never; Returns: string }
      generate_code_request_number: { Args: never; Returns: string }
      generate_employee_number: { Args: never; Returns: string }
      generate_expense_number: { Args: never; Returns: string }
      generate_governance_resolution_number: { Args: never; Returns: string }
      generate_investor_access_token: { Args: never; Returns: string }
      generate_investor_demo_access_code: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_journal_entry_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_payroll_invoice: {
        Args: { payroll_end: string; payroll_start: string }
        Returns: {
          employee_count: number
          invoice_id: string
          total_amount: number
        }[]
      }
      generate_pickup_code: { Args: never; Returns: string }
      generate_referral_code: {
        Args: { p_user_id: string; p_user_type: string }
        Returns: string
      }
      generate_ticket_number: { Args: never; Returns: string }
      generate_variant_title: {
        Args: { opt1_val?: string; opt2_val?: string; opt3_val?: string }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_available_tester_credits: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_avg_performance_metrics: {
        Args: { days_back?: number }
        Returns: {
          avg_api_response_time_ms: number
          avg_load_time_ms: number
          avg_memory_usage_mb: number
          avg_network_latency_ms: number
          avg_render_time_ms: number
          total_crashes: number
          total_errors: number
        }[]
      }
      get_cfo_email: { Args: never; Returns: string }
      get_cravemore_price: { Args: { p_plan_key: string }; Returns: number }
      get_current_user_email: { Args: never; Returns: string }
      get_daily_uptime_percentage: {
        Args: { target_date?: string }
        Returns: {
          online_seconds: number
          total_seconds: number
          uptime_percentage: number
        }[]
      }
      get_db_connection_count: { Args: never; Returns: number }
      get_department_name: { Args: { dept_id: string }; Returns: string }
      get_document_statistics: {
        Args: never
        Returns: {
          document_type: string
          recent_count: number
          total_count: number
        }[]
      }
      get_driver_queue_position: {
        Args: { driver_uuid: string }
        Returns: {
          priority_score: number
          queue_position: number
          region_name: string
          total_in_region: number
        }[]
      }
      get_employee_board_resolutions: {
        Args: { emp_id: string }
        Returns: {
          created_at: string
          document_id: string
          effective_date: string
          id: string
          resolution_number: string
          resolution_title: string
          resolution_type: string
          status: string
        }[]
      }
      get_employee_clock_status: {
        Args: { p_user_id: string }
        Returns: {
          clock_in_time: string
          current_entry_id: string
          is_clocked_in: boolean
          total_hours_today: number
          weekly_hours: number
        }[]
      }
      get_employee_documents: {
        Args: { emp_id: string }
        Returns: {
          created_at: string
          document_title: string
          document_type: string
          file_size_bytes: number
          id: string
          metadata: Json
          storage_path: string
        }[]
      }
      get_feature_completion_stats: {
        Args: { days_back?: number }
        Returns: {
          abandoned_count: number
          avg_completion_percentage: number
          avg_time_spent_seconds: number
          completed_count: number
          completion_rate: number
          failed_count: number
          feature_name: string
          total_attempts: number
        }[]
      }
      get_merchant_category_config: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      get_or_create_conversation: {
        Args: {
          p_device_id?: string
          p_participant1_exec_id: string
          p_participant2_exec_id: string
          p_portal_context: string
        }
        Returns: string
      }
      get_promo_offer: { Args: { p_user_id: string }; Returns: Json }
      get_promo_usage_stats: { Args: never; Returns: Json }
      get_region_capacity_status: {
        Args: { region_id_param: number }
        Returns: {
          capacity: number
          current_drivers: number
          region_name: string
          status: string
          waitlist_count: number
        }[]
      }
      get_template_id_from_document_type: {
        Args: { p_document_type: string }
        Returns: string
      }
      get_tester_progress: { Args: { p_user_id: string }; Returns: Json }
      get_today_craving_progress: {
        Args: { p_user_id: string }
        Returns: {
          acceptance_rate: number
          current_points: number
          current_streak: number
          deliveries_completed: number
          max_points: number
          progress_percent: number
          speed_violations: number
          wheels_filled: number
        }[]
      }
      get_user_audit_info: {
        Args: { p_user_id: string }
        Returns: {
          is_admin: boolean
          is_c_level: boolean
          is_executive: boolean
          user_email: string
          user_name: string
          user_role: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_active_cravemore: { Args: { p_user_id: string }; Returns: boolean }
      has_active_subscription: { Args: { p_user_id: string }; Returns: boolean }
      has_finance_permission:
        | {
            Args: {
              p_entity_id?: string
              p_permission_code: string
              p_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: { p_permission_code: string; p_user_id: string }
            Returns: boolean
          }
      has_finance_role_safe: {
        Args: { p_role_codes: string[]; p_user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { p_permission: string; p_user_id: string }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      has_universal_access: { Args: never; Returns: boolean }
      hash_and_update_pin: {
        Args: { p_email: string; p_new_pin: string }
        Returns: boolean
      }
      increment_lifetime_cap: { Args: never; Returns: number }
      increment_missed_review_count: {
        Args: { engagement_id_param: string }
        Returns: undefined
      }
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_c_level_position: { Args: { position_text: string }; Returns: boolean }
      is_ceo: { Args: { user_uuid: string }; Returns: boolean }
      is_ceo_email: { Args: { p_email: string }; Returns: boolean }
      is_craven_founder: { Args: never; Returns: boolean }
      is_cto_or_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_cxo_or_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_diamond_driver: { Args: { p_driver_id: string }; Returns: boolean }
      is_executive: { Args: { user_uuid: string }; Returns: boolean }
      is_executive_role: {
        Args: { exec_role: string; user_uuid: string }
        Returns: boolean
      }
      is_executive_role_safe: {
        Args: { exec_role?: string; user_uuid: string }
        Returns: boolean
      }
      is_torrance_or_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_universal_ceo: { Args: never; Returns: boolean }
      is_user_admin: { Args: { user_id_param: string }; Returns: boolean }
      is_user_in_exec_users: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      issue_micro_equity_from_pool: {
        Args: {
          p_contribution_order_id: string
          p_contributor_email: string
          p_contributor_name: string
          p_shares_promised: number
        }
        Returns: Json
      }
      link_document_to_resolution: {
        Args: { doc_id: string; resolution_id: string }
        Returns: undefined
      }
      lock_order_for_transfers: {
        Args: { p_order_id: string; p_stripe_payment_intent_id: string }
        Returns: {
          amount_total_cents: number
          currency: string
          driver_id: string
          driver_pay_cents: number
          order_id: string
          platform_fee_cents: number
          restaurant_id: string
          restaurant_net_cents: number
          status_code: string
          stripe_transfer_driver_id: string
          stripe_transfer_restaurant_id: string
          tip_cents: number
          transfers_lease_id: string
        }[]
      }
      log_audit_trail: {
        Args: {
          p_action_category: string
          p_action_description: string
          p_action_type: string
          p_compliance_tag?: string
          p_ip_address?: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_requires_review?: boolean
          p_severity?: string
          p_target_resource_id?: string
          p_target_resource_name?: string
          p_target_resource_type?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      log_audit_trail_entry: {
        Args: {
          p_action_description: string
          p_action_type: string
          p_changed_fields?: string[]
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: string
      }
      log_ceo_action: {
        Args: {
          p_action_category: string
          p_action_type: string
          p_description: string
          p_severity?: string
          p_target_id: string
          p_target_name: string
          p_target_type: string
        }
        Returns: string
      }
      log_governance_action: {
        Args: {
          p_action_category: string
          p_action_type: string
          p_description: string
          p_metadata?: Json
          p_performed_by?: string
          p_target_id: string
          p_target_name: string
          p_target_type: string
        }
        Returns: string
      }
      log_intern_program_action: {
        Args: {
          p_action: string
          p_actor_id: string
          p_affected_user_id: string
          p_entity_id: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
          p_reason: string
        }
        Returns: string
      }
      log_invoice_email: {
        Args: {
          p_email_from: string
          p_email_subject?: string
          p_error_message?: string
          p_extracted_data?: Json
          p_invoice_id: string
          p_processing_status?: string
        }
        Returns: string
      }
      log_login_activity: {
        Args: {
          p_device_id: string
          p_device_name: string
          p_device_type: string
          p_failure_reason?: string
          p_ip_address: string
          p_login_type: string
          p_success?: boolean
          p_user_agent: string
          p_user_id: string
        }
        Returns: string
      }
      log_tester_activity_day: { Args: { p_user_id: string }; Returns: Json }
      longtransactionsenabled: { Args: never; Returns: boolean }
      lookup_user_by_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          found_in: string
          user_id: string
        }[]
      }
      make_user_active_driver: {
        Args: { target_user_id: string; vehicle_info?: Json }
        Returns: undefined
      }
      mark_expired_tester_credits: { Args: never; Returns: number }
      mark_inactive_sessions: { Args: never; Returns: undefined }
      mark_transfer_failed: {
        Args: {
          p_driver_transfer_id?: string
          p_error_message: string
          p_order_id: string
          p_restaurant_transfer_id?: string
          p_transfers_lease_id: string
        }
        Returns: boolean
      }
      merge_duplicate_resolutions: {
        Args: {
          p_delete_resolution_number: string
          p_keep_resolution_number: string
        }
        Returns: Json
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      position_to_exec_role: {
        Args: { position_text: string }
        Returns: string
      }
      post_journal_entry: {
        Args: { entry_id: string; posted_by_user: string }
        Returns: boolean
      }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_cfo_evaluation_timeouts: { Args: never; Returns: undefined }
      process_cto_evaluation_timeouts: { Args: never; Returns: undefined }
      process_driver_referral_milestone: {
        Args: { p_milestone_number: number; p_referral_id: string }
        Returns: boolean
      }
      redeem_reserved_promo: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      redeem_tester_credits_for_order: {
        Args: {
          p_delivery_credit_applied_cents: number
          p_order_id: string
          p_platform_credit_applied_cents: number
          p_service_credit_applied_cents: number
          p_total_credit_applied_cents: number
          p_user_id: string
        }
        Returns: Json
      }
      refresh_effective_permissions: { Args: never; Returns: undefined }
      reject_approval_item: {
        Args: { p_actor_id?: string; p_comment?: string; p_queue_id: string }
        Returns: undefined
      }
      release_inventory: {
        Args: { p_items: Json; p_restaurant_id: string }
        Returns: undefined
      }
      release_wallet_hold: {
        Args: {
          p_amount_cents: number
          p_driver_id: string
          p_stripe_auth_id: string
        }
        Returns: undefined
      }
      reserve_inventory: {
        Args: { p_items: Json; p_restaurant_id: string }
        Returns: undefined
      }
      reserve_promo_for_checkout: {
        Args: {
          p_delivery_fee_cents: number
          p_food_subtotal_cents: number
          p_service_fee_cents: number
          p_user_id: string
        }
        Returns: Json
      }
      reserve_wallet_for_card_auth: {
        Args: {
          p_amount_cents: number
          p_driver_id: string
          p_stripe_auth_id: string
        }
        Returns: boolean
      }
      revoke_expired_reservations: { Args: never; Returns: number }
      rpc_has_finance_permission: {
        Args: { p_entity_id?: string; p_permission_code: string }
        Returns: boolean
      }
      soundex: { Args: { "": string }; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      start_approval: {
        Args: {
          p_amount: number
          p_currency: string
          p_entity_id: string
          p_requested_by?: string
          p_transaction_id: string
          p_transaction_type: string
        }
        Returns: string
      }
      start_cfo_evaluation_prefunding: {
        Args: { p_cfo_user_id: string }
        Returns: string
      }
      start_cfo_test_evaluation_prefunding: {
        Args: { p_cfo_user_id: string }
        Returns: string
      }
      start_cto_evaluation: { Args: { p_cto_user_id: string }; Returns: string }
      start_cto_test_evaluation: {
        Args: { p_cto_user_id: string }
        Returns: string
      }
      submit_tester_feedback: {
        Args: {
          p_comment?: string
          p_prompt_key: string
          p_rating?: number
          p_user_id: string
        }
        Returns: Json
      }
      sync_user_roles_for_employee: {
        Args: {
          p_employee_id: string
          p_employee_role?: string
          p_executive_role?: string
          p_user_id: string
        }
        Returns: Json
      }
      text_soundex: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      update_driver_location: {
        Args: { driver_user_id: string; latitude: number; longitude: number }
        Returns: undefined
      }
      update_order_heat_map: { Args: never; Returns: undefined }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_appointment_status_transition: {
        Args: { new_status: string; old_status: string }
        Returns: boolean
      }
      validate_journal_entry_balance: {
        Args: { entry_id: string }
        Returns: boolean
      }
      verify_ceo_master_pin: { Args: { p_pin: string }; Returns: boolean }
      verify_ceo_pin: {
        Args: { check_email: string; check_pin: string }
        Returns: boolean
      }
      verify_employee_portal_pin: {
        Args: { p_email: string; p_pin: string }
        Returns: {
          department_id: string
          email: string
          employee_id: string
          employee_number: string
          full_name: string
          position: string
        }[]
      }
      verify_micro_equity_pool_integrity: {
        Args: never
        Returns: {
          expected_remaining: number
          integrity_status: string
          pool_code: string
          remaining_reserved: number
          total_issued: number
          total_reserved: number
        }[]
      }
    }
    Enums: {
      cfo_eval_status: "active" | "completed" | "cancelled"
      cfo_gate_code:
        | "G1_FINANCIAL_SNAPSHOT"
        | "G2_RUNWAY_SURVIVAL"
        | "G3_RISK_DISCLOSURE"
        | "G4_FUNDBILITY_READINESS"
        | "G5_EXEC_BRIEFING"
      cfo_gate_status:
        | "locked"
        | "open"
        | "submitted"
        | "ceo_review"
        | "passed"
        | "failed"
        | "auto_failed"
      cto_eval_status: "active" | "completed" | "cancelled"
      cto_gate_code:
        | "GATE_1_ARCHITECTURE"
        | "GATE_2_SECURITY"
        | "GATE_3_EXECUTION"
        | "GATE_4_LEADERSHIP"
        | "GATE_5_CEO_BRIEFING"
      cto_gate_status:
        | "locked"
        | "open"
        | "submitted"
        | "ceo_review"
        | "passed"
        | "failed"
        | "auto_failed"
      feeder_tier: "Feeder" | "Gold" | "Platinum" | "Diamond" | "Ultimate"
      menu_preparation_status: "not_started" | "in_progress" | "ready"
      merchant_category:
        | "restaurant"
        | "grocery"
        | "convenience"
        | "alcohol"
        | "flowers_gifts"
        | "pet_supplies"
        | "specialty_retail"
        | "marketplace"
      role_name:
        | "admin"
        | "moderator"
        | "user"
        | "employee"
        | "executive"
        | "customer"
        | "driver"
        | "ceo"
        | "cfo"
        | "coo"
        | "cto"
        | "cxo"
        | "cmo"
        | "cro"
        | "cpo"
        | "cdo"
        | "chro"
        | "clo"
        | "cso"
        | "board_member"
        | "advisor"
        | "CRAVEN_FOUNDER"
        | "CRAVEN_CORPORATE_SECRETARY"
        | "CRAVEN_BOARD_MEMBER"
        | "CRAVEN_EXECUTIVE"
        | "CRAVEN_CEO"
        | "CRAVEN_CFO"
        | "CRAVEN_CTO"
        | "CRAVEN_CXO"
        | "CRAVEN_COO"
        | "CRAVEN_CMO"
        | "CRAVEN_CCO"
        | "CRAVEN_STAFF"
        | "CRAVEN_SUPPORT"
        | "CRAVEN_DISPATCH"
        | "CRAVEN_DRIVER"
        | "CRAVEN_RESTAURANT"
        | "CRAVEN_CUSTOMER"
        | "INTERN"
        | "INTERN_MANAGER"
        | "INTERN_SPONSOR"
        | "INTERN_PROGRAM_ADMIN"
      verification_task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "rejected"
      verification_task_type:
        | "business_license_review"
        | "menu_import"
        | "quality_check"
        | "insurance_review"
        | "banking_review"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cfo_eval_status: ["active", "completed", "cancelled"],
      cfo_gate_code: [
        "G1_FINANCIAL_SNAPSHOT",
        "G2_RUNWAY_SURVIVAL",
        "G3_RISK_DISCLOSURE",
        "G4_FUNDBILITY_READINESS",
        "G5_EXEC_BRIEFING",
      ],
      cfo_gate_status: [
        "locked",
        "open",
        "submitted",
        "ceo_review",
        "passed",
        "failed",
        "auto_failed",
      ],
      cto_eval_status: ["active", "completed", "cancelled"],
      cto_gate_code: [
        "GATE_1_ARCHITECTURE",
        "GATE_2_SECURITY",
        "GATE_3_EXECUTION",
        "GATE_4_LEADERSHIP",
        "GATE_5_CEO_BRIEFING",
      ],
      cto_gate_status: [
        "locked",
        "open",
        "submitted",
        "ceo_review",
        "passed",
        "failed",
        "auto_failed",
      ],
      feeder_tier: ["Feeder", "Gold", "Platinum", "Diamond", "Ultimate"],
      menu_preparation_status: ["not_started", "in_progress", "ready"],
      merchant_category: [
        "restaurant",
        "grocery",
        "convenience",
        "alcohol",
        "flowers_gifts",
        "pet_supplies",
        "specialty_retail",
        "marketplace",
      ],
      role_name: [
        "admin",
        "moderator",
        "user",
        "employee",
        "executive",
        "customer",
        "driver",
        "ceo",
        "cfo",
        "coo",
        "cto",
        "cxo",
        "cmo",
        "cro",
        "cpo",
        "cdo",
        "chro",
        "clo",
        "cso",
        "board_member",
        "advisor",
        "CRAVEN_FOUNDER",
        "CRAVEN_CORPORATE_SECRETARY",
        "CRAVEN_BOARD_MEMBER",
        "CRAVEN_EXECUTIVE",
        "CRAVEN_CEO",
        "CRAVEN_CFO",
        "CRAVEN_CTO",
        "CRAVEN_CXO",
        "CRAVEN_COO",
        "CRAVEN_CMO",
        "CRAVEN_CCO",
        "CRAVEN_STAFF",
        "CRAVEN_SUPPORT",
        "CRAVEN_DISPATCH",
        "CRAVEN_DRIVER",
        "CRAVEN_RESTAURANT",
        "CRAVEN_CUSTOMER",
        "INTERN",
        "INTERN_MANAGER",
        "INTERN_SPONSOR",
        "INTERN_PROGRAM_ADMIN",
      ],
      verification_task_status: [
        "pending",
        "in_progress",
        "completed",
        "rejected",
      ],
      verification_task_type: [
        "business_license_review",
        "menu_import",
        "quality_check",
        "insurance_review",
        "banking_review",
      ],
    },
  },
} as const
