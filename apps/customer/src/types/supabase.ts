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
            foreignKeyName: "activation_queue_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
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
        Relationships: []
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
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          operation: string
          table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          operation: string
          table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          operation?: string
          table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        ]
      }
      ceo_objectives: {
        Row: {
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string
          objective_type: string
          priority: string | null
          progress_percentage: number | null
          start_date: string
          status: string | null
          target_date: string | null
          target_value: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          objective_type: string
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string
          status?: string | null
          target_date?: string | null
          target_value?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          objective_type?: string
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string
          status?: string | null
          target_date?: string | null
          target_value?: number | null
          title?: string
        }
        Relationships: []
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
            foreignKeyName: "chat_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
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
        Relationships: []
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
      craver_applications: {
        Row: {
          account_number_encrypted: string | null
          account_number_last_four: string | null
          background_check: boolean | null
          background_check_approved_at: string | null
          background_check_consent: boolean | null
          background_check_consent_date: string | null
          background_check_estimated_completion: string | null
          background_check_initiated_at: string | null
          background_check_report_id: string | null
          bank_account_type: string | null
          business_name: string | null
          cash_tag: string | null
          city: string
          created_at: string | null
          date_of_birth: string
          drivers_license: string
          drivers_license_back: string | null
          drivers_license_front: string | null
          email: string
          first_name: string
          i9_document: string | null
          id: string
          insurance_document: string | null
          insurance_policy: string
          insurance_provider: string
          last_name: string
          license_expiry: string | null
          license_number: string | null
          license_plate: string
          license_state: string | null
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          payout_method: string | null
          phone: string
          points: number | null
          priority_score: number | null
          profile_photo: string | null
          referred_by: string | null
          region_id: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          routing_number: string | null
          ssn_encrypted: string | null
          ssn_last_four: string | null
          state: string
          status: string | null
          street_address: string
          tax_classification: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_color: string
          vehicle_inspection: boolean | null
          vehicle_make: string
          vehicle_model: string
          vehicle_photo_back: string | null
          vehicle_photo_front: string | null
          vehicle_photo_left: string | null
          vehicle_photo_right: string | null
          vehicle_registration: string | null
          vehicle_type: string
          vehicle_year: number
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
          background_check_consent?: boolean | null
          background_check_consent_date?: string | null
          background_check_estimated_completion?: string | null
          background_check_initiated_at?: string | null
          background_check_report_id?: string | null
          bank_account_type?: string | null
          business_name?: string | null
          cash_tag?: string | null
          city: string
          created_at?: string | null
          date_of_birth: string
          drivers_license: string
          drivers_license_back?: string | null
          drivers_license_front?: string | null
          email: string
          first_name: string
          i9_document?: string | null
          id?: string
          insurance_document?: string | null
          insurance_policy: string
          insurance_provider: string
          last_name: string
          license_expiry?: string | null
          license_number?: string | null
          license_plate: string
          license_state?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          payout_method?: string | null
          phone: string
          points?: number | null
          priority_score?: number | null
          profile_photo?: string | null
          referred_by?: string | null
          region_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          routing_number?: string | null
          ssn_encrypted?: string | null
          ssn_last_four?: string | null
          state: string
          status?: string | null
          street_address: string
          tax_classification?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color: string
          vehicle_inspection?: boolean | null
          vehicle_make: string
          vehicle_model: string
          vehicle_photo_back?: string | null
          vehicle_photo_front?: string | null
          vehicle_photo_left?: string | null
          vehicle_photo_right?: string | null
          vehicle_registration?: string | null
          vehicle_type: string
          vehicle_year: number
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
          background_check_consent?: boolean | null
          background_check_consent_date?: string | null
          background_check_estimated_completion?: string | null
          background_check_initiated_at?: string | null
          background_check_report_id?: string | null
          bank_account_type?: string | null
          business_name?: string | null
          cash_tag?: string | null
          city?: string
          created_at?: string | null
          date_of_birth?: string
          drivers_license?: string
          drivers_license_back?: string | null
          drivers_license_front?: string | null
          email?: string
          first_name?: string
          i9_document?: string | null
          id?: string
          insurance_document?: string | null
          insurance_policy?: string
          insurance_provider?: string
          last_name?: string
          license_expiry?: string | null
          license_number?: string | null
          license_plate?: string
          license_state?: string | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          payout_method?: string | null
          phone?: string
          points?: number | null
          priority_score?: number | null
          profile_photo?: string | null
          referred_by?: string | null
          region_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          routing_number?: string | null
          ssn_encrypted?: string | null
          ssn_last_four?: string | null
          state?: string
          status?: string | null
          street_address?: string
          tax_classification?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color?: string
          vehicle_inspection?: boolean | null
          vehicle_make?: string
          vehicle_model?: string
          vehicle_photo_back?: string | null
          vehicle_photo_front?: string | null
          vehicle_photo_left?: string | null
          vehicle_photo_right?: string | null
          vehicle_registration?: string | null
          vehicle_type?: string
          vehicle_year?: number
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
            foreignKeyName: "craver_applications_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
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
        Relationships: []
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
            foreignKeyName: "customer_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
      delivery_addresses: {
        Row: {
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
        Relationships: []
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
        Relationships: []
      }
      driver_payout_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          percentage: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      driver_payouts: {
        Row: {
          amount: number
          batch_id: string
          created_at: string | null
          driver_id: string
          error_message: string | null
          external_transaction_id: string | null
          id: string
          payment_method_id: string
          processed_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          batch_id: string
          created_at?: string | null
          driver_id: string
          error_message?: string | null
          external_transaction_id?: string | null
          id?: string
          payment_method_id: string
          processed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string
          created_at?: string | null
          driver_id?: string
          error_message?: string | null
          external_transaction_id?: string | null
          id?: string
          payment_method_id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_payouts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "daily_payout_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_payouts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "driver_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_preferences: {
        Row: {
          auto_accept_orders: boolean | null
          avoid_highways: boolean | null
          avoid_tolls: boolean | null
          created_at: string
          driver_id: string
          id: string
          map_style: string | null
          notification_sound: boolean | null
          preferred_nav_app: string | null
          show_earnings_summary: boolean | null
          updated_at: string
          voice_navigation: boolean | null
        }
        Insert: {
          auto_accept_orders?: boolean | null
          avoid_highways?: boolean | null
          avoid_tolls?: boolean | null
          created_at?: string
          driver_id: string
          id?: string
          map_style?: string | null
          notification_sound?: boolean | null
          preferred_nav_app?: string | null
          show_earnings_summary?: boolean | null
          updated_at?: string
          voice_navigation?: boolean | null
        }
        Update: {
          auto_accept_orders?: boolean | null
          avoid_highways?: boolean | null
          avoid_tolls?: boolean | null
          created_at?: string
          driver_id?: string
          id?: string
          map_style?: string | null
          notification_sound?: boolean | null
          preferred_nav_app?: string | null
          show_earnings_summary?: boolean | null
          updated_at?: string
          voice_navigation?: boolean | null
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          acceptance_rate: number | null
          completion_rate: number | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          heading: number | null
          id: string
          is_available: boolean | null
          last_location_update: string | null
          license_plate: string | null
          on_time_rate: number | null
          optimized_route: Json | null
          rating: number | null
          region_id: number | null
          route_updated_at: string | null
          speed: number | null
          status: string | null
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
          completion_rate?: number | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          heading?: number | null
          id?: string
          is_available?: boolean | null
          last_location_update?: string | null
          license_plate?: string | null
          on_time_rate?: number | null
          optimized_route?: Json | null
          rating?: number | null
          region_id?: number | null
          route_updated_at?: string | null
          speed?: number | null
          status?: string | null
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
          completion_rate?: number | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          heading?: number | null
          id?: string
          is_available?: boolean | null
          last_location_update?: string | null
          license_plate?: string | null
          on_time_rate?: number | null
          optimized_route?: Json | null
          rating?: number | null
          region_id?: number | null
          route_updated_at?: string | null
          speed?: number | null
          status?: string | null
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
          p256dh_key: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          driver_id: string
          endpoint: string
          id?: string
          p256dh_key: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          driver_id?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
        }
        Relationships: []
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
            foreignKeyName: "driver_referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "craver_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "craver_applications"
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
        Relationships: []
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
        ]
      }
      driver_surge_zones: {
        Row: {
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
            foreignKeyName: "employee_history_new_department_id_fkey"
            columns: ["new_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
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
      employees: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string | null
          employment_status: string
          employment_type: string
          first_name: string
          hire_date: string
          hired_by: string | null
          hourly_rate: number | null
          id: string
          last_name: string
          manager_id: string | null
          notes: string | null
          phone: string | null
          position: string
          remote_allowed: boolean | null
          salary: number | null
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
          department_id?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          employment_status?: string
          employment_type: string
          first_name: string
          hire_date?: string
          hired_by?: string | null
          hourly_rate?: number | null
          id?: string
          last_name: string
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          position: string
          remote_allowed?: boolean | null
          salary?: number | null
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
          department_id?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          employment_status?: string
          employment_type?: string
          first_name?: string
          hire_date?: string
          hired_by?: string | null
          hourly_rate?: number | null
          id?: string
          last_name?: string
          manager_id?: string | null
          notes?: string | null
          phone?: string | null
          position?: string
          remote_allowed?: boolean | null
          salary?: number | null
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
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_messages: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          is_confidential: boolean | null
          message: string
          priority: string | null
          read_by: string[] | null
          subject: string
          to_user_ids: string[]
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          is_confidential?: boolean | null
          message: string
          priority?: string | null
          read_by?: string[] | null
          subject: string
          to_user_ids: string[]
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          is_confidential?: boolean | null
          message?: string
          priority?: string | null
          read_by?: string[] | null
          subject?: string
          to_user_ids?: string[]
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
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          department: string | null
          id: string
          ip_whitelist: Json | null
          last_login: string | null
          mfa_enabled: boolean | null
          role: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_level?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          ip_whitelist?: Json | null
          last_login?: string | null
          mfa_enabled?: boolean | null
          role: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_level?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          ip_whitelist?: Json | null
          last_login?: string | null
          mfa_enabled?: boolean | null
          role?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_users_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "exec_users"
            referencedColumns: ["id"]
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
        Relationships: []
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
      menu_item_modifiers: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_available: boolean
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
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          is_gluten_free: boolean
          is_vegan: boolean
          is_vegetarian: boolean
          name: string
          order_count: number
          preparation_time: number | null
          price_cents: number
          restaurant_id: string
          spice_level: string | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_gluten_free?: boolean
          is_vegan?: boolean
          is_vegetarian?: boolean
          name: string
          order_count?: number
          preparation_time?: number | null
          price_cents: number
          restaurant_id: string
          spice_level?: string | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_gluten_free?: boolean
          is_vegan?: boolean
          is_vegetarian?: boolean
          name?: string
          order_count?: number
          preparation_time?: number | null
          price_cents?: number
          restaurant_id?: string
          spice_level?: string | null
          updated_at?: string
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
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
        ]
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
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
          assigned_craver_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_fee_cents: number | null
          delivery_method: string | null
          distance_km: number | null
          driver_id: string | null
          dropoff_address: Json | null
          estimated_delivery_time: string | null
          estimated_distance_meters: number | null
          estimated_duration_seconds: number | null
          id: string
          order_number: string | null
          order_status: string | null
          payout_cents: number | null
          pickup_address: Json | null
          pickup_confirmed_at: string | null
          pickup_photo_url: string | null
          restaurant_id: string | null
          route_geometry: Json | null
          service_fee: number | null
          subtotal_cents: number
          tax_cents: number | null
          tip_cents: number | null
          total_amount: number | null
          total_cents: number
          updated_at: string | null
        }
        Insert: {
          assigned_craver_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_fee_cents?: number | null
          delivery_method?: string | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: Json | null
          estimated_delivery_time?: string | null
          estimated_distance_meters?: number | null
          estimated_duration_seconds?: number | null
          id?: string
          order_number?: string | null
          order_status?: string | null
          payout_cents?: number | null
          pickup_address?: Json | null
          pickup_confirmed_at?: string | null
          pickup_photo_url?: string | null
          restaurant_id?: string | null
          route_geometry?: Json | null
          service_fee?: number | null
          subtotal_cents: number
          tax_cents?: number | null
          tip_cents?: number | null
          total_amount?: number | null
          total_cents: number
          updated_at?: string | null
        }
        Update: {
          assigned_craver_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_fee_cents?: number | null
          delivery_method?: string | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: Json | null
          estimated_delivery_time?: string | null
          estimated_distance_meters?: number | null
          estimated_duration_seconds?: number | null
          id?: string
          order_number?: string | null
          order_status?: string | null
          payout_cents?: number | null
          pickup_address?: Json | null
          pickup_confirmed_at?: string | null
          pickup_photo_url?: string | null
          restaurant_id?: string | null
          route_geometry?: Json | null
          service_fee?: number | null
          subtotal_cents?: number
          tax_cents?: number | null
          tip_cents?: number | null
          total_amount?: number | null
          total_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
          token: string
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          provider: string
          token: string
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          provider?: string
          token?: string
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
          net_pay: number | null
          notes: string | null
          other_deductions: number | null
          overtime_pay: number | null
          pay_period_end: string
          pay_period_start: string
          payment_date: string | null
          payment_method: string | null
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
          net_pay?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_pay?: number | null
          pay_period_end: string
          pay_period_start: string
          payment_date?: string | null
          payment_method?: string | null
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
          net_pay?: number | null
          notes?: string | null
          other_deductions?: number | null
          overtime_pay?: number | null
          pay_period_end?: string
          pay_period_start?: string
          payment_date?: string | null
          payment_method?: string | null
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
        ]
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
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
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
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          device_type: string | null
          endpoint: string
          id: string
          is_active: boolean
          p256dh_key: string
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
          p256dh_key: string
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
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
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
        Relationships: []
      }
      referral_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          min_orders_required: number
          referral_type: string | null
          referred_bonus_amount: number | null
          referred_bonus_cents: number
          referrer_bonus_amount: number | null
          referrer_bonus_cents: number
          requirements: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_orders_required?: number
          referral_type?: string | null
          referred_bonus_amount?: number | null
          referred_bonus_cents?: number
          referrer_bonus_amount?: number | null
          referrer_bonus_cents?: number
          requirements?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_orders_required?: number
          referral_type?: string | null
          referred_bonus_amount?: number | null
          referred_bonus_cents?: number
          referrer_bonus_amount?: number | null
          referrer_bonus_cents?: number
          requirements?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          paid_at: string | null
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
          completed_at?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
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
          completed_at?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_code?: string
          referral_type?: string
          referred_bonus_amount?: number | null
          referred_id?: string
          referrer_bonus_amount?: number | null
          referrer_id?: string
          requirements_met?: boolean | null
          status?: string | null
        }
        Relationships: []
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
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
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
        Relationships: []
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
            foreignKeyName: "restaurant_users_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
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
          merchant_welcome_shown: boolean | null
          merchant_welcome_shown_at: string | null
          min_delivery_time: number | null
          minimum_order_cents: number | null
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
          merchant_welcome_shown?: boolean | null
          merchant_welcome_shown_at?: string | null
          min_delivery_time?: number | null
          minimum_order_cents?: number | null
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
          merchant_welcome_shown?: boolean | null
          merchant_welcome_shown_at?: string | null
          min_delivery_time?: number | null
          minimum_order_cents?: number | null
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
        Relationships: []
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
            foreignKeyName: "store_orders_store_location_id_fkey"
            columns: ["store_location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
        Relationships: []
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
      user_notification_preferences: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          notification_setting_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_setting_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_setting_id?: string
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
      user_profiles: {
        Row: {
          account_status: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          fcm_token: string | null
          full_name: string | null
          id: string
          notification_preferences: Json | null
          phone: string | null
          preferences: Json | null
          role: string | null
          settings: Json | null
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
          notification_preferences?: Json | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          settings?: Json | null
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
          notification_preferences?: Json | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          settings?: Json | null
          suspension_reason?: string | null
          suspension_until?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
        Relationships: []
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
    }
    Views: {
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
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
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
      apply_subscription_benefits: {
        Args: { p_order_id: string }
        Returns: Json
      }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_driver_daily_earnings: {
        Args: { target_date: string; target_driver_id: string }
        Returns: number
      }
      calculate_waitlist_position: {
        Args: { driver_uuid: string }
        Returns: number
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
      daitch_mokotoff: { Args: { "": string }; Returns: string[] }
      disablelongtransactions: { Args: never; Returns: string }
      dmetaphone: { Args: { "": string }; Returns: string }
      dmetaphone_alt: { Args: { "": string }; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      ensure_driver_can_go_online: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_employee_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_referral_code: {
        Args: { p_user_id: string; p_user_type: string }
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
      get_driver_queue_position: {
        Args: { driver_uuid: string }
        Returns: {
          priority_score: number
          queue_position: number
          region_name: string
          total_in_region: number
        }[]
      }
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
      gettransactionid: { Args: never; Returns: unknown }
      has_active_subscription: { Args: { p_user_id: string }; Returns: boolean }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_ceo: { Args: { user_uuid: string }; Returns: boolean }
      is_executive: { Args: { user_uuid: string }; Returns: boolean }
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
      longtransactionsenabled: { Args: never; Returns: boolean }
      make_user_active_driver: {
        Args: { target_user_id: string; vehicle_info?: Json }
        Returns: undefined
      }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
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
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
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
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
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
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
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
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
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
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
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
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
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
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
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
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
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
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
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
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
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
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number }
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
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
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
      text_soundex: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
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
    }
    Enums: {
      menu_preparation_status: "not_started" | "in_progress" | "ready"
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
      menu_preparation_status: ["not_started", "in_progress", "ready"],
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
