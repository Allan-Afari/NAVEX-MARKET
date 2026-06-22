export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      access_unlocks: {
        Row: {
          id: string;
          investor_id: string;
          opportunity_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          investor_id?: string;
          opportunity_id?: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          investor_id?: string;
          opportunity_id?: string;
          unlocked_at?: string;
        };
      };
      agreement_signatures: {
        Row: {
          id: string;
          agreement_id: string;
          signer_id: string;
          signer_name: string;
          signer_role: string;
          signature_data: string;
          signed_at: string;
          ip_address: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agreement_id?: string;
          signer_id?: string;
          signer_name?: string;
          signer_role?: string;
          signature_data?: string;
          signed_at?: string;
          ip_address?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agreement_id?: string;
          signer_id?: string;
          signer_name?: string;
          signer_role?: string;
          signature_data?: string;
          signed_at?: string;
          ip_address?: string;
          created_at?: string;
        };
      };
      agreement_templates: {
        Row: {
          id: string;
          name: string;
          description: string;
          content: Json;
          category: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          description?: string;
          content?: Json;
          category?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          content?: Json;
          category?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      agreement_versions: {
        Row: {
          id: string;
          agreement_id: string;
          version_number: number;
          content: Json;
          changed_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agreement_id?: string;
          version_number?: number;
          content?: Json;
          changed_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agreement_id?: string;
          version_number?: number;
          content?: Json;
          changed_by?: string;
          created_at?: string;
        };
      };
      agreements: {
        Row: {
          id: string;
          deal_id: string;
          template_id: string;
          title: string;
          content: Json;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          template_id?: string;
          title?: string;
          content?: Json;
          status?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          template_id?: string;
          title?: string;
          content?: Json;
          status?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          key_name: string;
          key_hash: string;
          key_prefix: string;
          scopes: string[];
          is_active: boolean;
          last_used: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          key_name?: string;
          key_hash?: string;
          key_prefix?: string;
          scopes?: string[];
          is_active?: boolean;
          last_used?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          key_name?: string;
          key_hash?: string;
          key_prefix?: string;
          scopes?: string[];
          is_active?: boolean;
          last_used?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string;
          ip_address: string;
          user_agent: string;
          metadata: Json;
          status: string;
          error_message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          action?: string;
          resource_type?: string;
          resource_id?: string;
          ip_address?: string;
          user_agent?: string;
          metadata?: Json;
          status?: string;
          error_message?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          resource_type?: string;
          resource_id?: string;
          ip_address?: string;
          user_agent?: string;
          metadata?: Json;
          status?: string;
          error_message?: string;
          created_at?: string;
        };
      };
      bulk_import_logs: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          total_count: number;
          processed_count: number;
          status: string;
          error_message: string;
          created_at: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          file_name?: string;
          total_count?: number;
          processed_count?: number;
          status?: string;
          error_message?: string;
          created_at?: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          total_count?: number;
          processed_count?: number;
          status?: string;
          error_message?: string;
          created_at?: string;
          completed_at?: string;
        };
      };
      cap_table_entries: {
        Row: {
          id: string;
          portfolio_investment_id: string;
          shareholder_name: string;
          shareholder_type: string;
          share_class: string;
          Preferred: Json;
          Preferred: Json;
          'etc.': Json;
          share_price: number;
          fully_diluted_shares: number;
          ownership_percentage: number;
          voting_rights: number;
          liquidation_preference: number;
          anti_dilution: boolean;
          board_seat: boolean;
          information_rights: boolean;
          pro_rata_rights: boolean;
          vesting_schedule: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          portfolio_investment_id?: string;
          shareholder_name?: string;
          shareholder_type?: string;
          share_class?: string;
          Preferred?: Json;
          Preferred?: Json;
          'etc.'?: Json;
          share_price?: number;
          fully_diluted_shares?: number;
          ownership_percentage?: number;
          voting_rights?: number;
          liquidation_preference?: number;
          anti_dilution?: boolean;
          board_seat?: boolean;
          information_rights?: boolean;
          pro_rata_rights?: boolean;
          vesting_schedule?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          portfolio_investment_id?: string;
          shareholder_name?: string;
          shareholder_type?: string;
          share_class?: string;
          Preferred?: Json;
          Preferred?: Json;
          'etc.'?: Json;
          share_price?: number;
          fully_diluted_shares?: number;
          ownership_percentage?: number;
          voting_rights?: number;
          liquidation_preference?: number;
          anti_dilution?: boolean;
          board_seat?: boolean;
          information_rights?: boolean;
          pro_rata_rights?: boolean;
          vesting_schedule?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      competitor_analysis: {
        Row: {
          id: string;
          company_name: string;
          sector: string;
          funding_stage: string;
          last_funding_amount: number;
          last_funding_date: string;
          key_metrics: Json;
          analysis_date: string;
          analyst_id: string;
        };
        Insert: {
          id?: string;
          company_name?: string;
          sector?: string;
          funding_stage?: string;
          last_funding_amount?: number;
          last_funding_date?: string;
          key_metrics?: Json;
          analysis_date?: string;
          analyst_id?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          sector?: string;
          funding_stage?: string;
          last_funding_amount?: number;
          last_funding_date?: string;
          key_metrics?: Json;
          analysis_date?: string;
          analyst_id?: string;
        };
      };
      compliance_flags: {
        Row: {
          id: string;
          deal_room_id: string;
          user_id: string;
          flag_type: string;
          geographic_risk: Json;
          critical: Json;
          status: string;
          escalated: Json;
          reviewed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_room_id?: string;
          user_id?: string;
          flag_type?: string;
          geographic_risk?: Json;
          critical?: Json;
          status?: string;
          escalated?: Json;
          reviewed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_room_id?: string;
          user_id?: string;
          flag_type?: string;
          geographic_risk?: Json;
          critical?: Json;
          status?: string;
          escalated?: Json;
          reviewed_at?: string;
          created_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          deal_id: string;
          title: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          deal_room_id: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          title?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deal_room_id?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          title?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deal_room_id?: string;
        };
      };
      data_retention_policies: {
        Row: {
          id: string;
          user_id: string;
          deal_room_id: string;
          retention_days: number;
          auto_delete: boolean;
          encryption_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          deal_room_id?: string;
          retention_days?: number;
          auto_delete?: boolean;
          encryption_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          deal_room_id?: string;
          retention_days?: number;
          auto_delete?: boolean;
          encryption_enabled?: boolean;
          created_at?: string;
        };
      };
      deal_activity_log: {
        Row: {
          id: string;
          deal_id: string;
          user_id: string;
          action: string;
          details: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          action?: string;
          details?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          action?: string;
          details?: string;
          created_at?: string;
        };
      };
      deal_interests: {
        Row: {
          id: string;
          deal_id: string;
          user_id: string;
          message: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          message?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          message?: string;
          status?: string;
          created_at?: string;
        };
      };
      deal_milestones: {
        Row: {
          id: string;
          deal_id: string;
          title: string;
          description: string;
          due_date: string;
          is_completed: boolean;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          title?: string;
          description?: string;
          due_date?: string;
          is_completed?: boolean;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          title?: string;
          description?: string;
          due_date?: string;
          is_completed?: boolean;
          completed_at?: string;
          created_at?: string;
        };
      };
      deal_negotiation_terms: {
        Row: {
          id: string;
          deal_room_id: string;
          version: number;
          title: string;
          terms: Json;
          proposed_by: string;
          status: string;
          'counter-offered': Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_room_id?: string;
          version?: number;
          title?: string;
          terms?: Json;
          proposed_by?: string;
          status?: string;
          'counter-offered'?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deal_room_id?: string;
          version?: number;
          title?: string;
          terms?: Json;
          proposed_by?: string;
          status?: string;
          'counter-offered'?: Json;
          updated_at?: string;
        };
      };
      deal_predictions: {
        Row: {
          id: string;
          deal_id: string;
          success_probability: number;
          predicted_timeline_days: number;
          risk_factors: Json;
          confidence_score: number;
          predicted_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          success_probability?: number;
          predicted_timeline_days?: number;
          risk_factors?: Json;
          confidence_score?: number;
          predicted_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          success_probability?: number;
          predicted_timeline_days?: number;
          risk_factors?: Json;
          confidence_score?: number;
          predicted_at?: string;
        };
      };
      deal_recommendations: {
        Row: {
          id: string;
          investor_id: string;
          deal_id: string;
          match_score: number;
          match_reasons: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          investor_id?: string;
          deal_id?: string;
          match_score?: number;
          match_reasons?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          investor_id?: string;
          deal_id?: string;
          match_score?: number;
          match_reasons?: Json;
          created_at?: string;
        };
      };
      deal_room_activity: {
        Row: {
          id: string;
          deal_room_id: string;
          user_id: string;
          action: string;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_room_id?: string;
          user_id?: string;
          action?: string;
          description?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_room_id?: string;
          user_id?: string;
          action?: string;
          description?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      deal_room_documents: {
        Row: {
          id: string;
          deal_room_id: string;
          uploaded_by: string;
          file_name: string;
          file_url: string;
          file_size: number;
          file_type: string;
          category: string;
          is_confidential: boolean;
          uploaded_at: string;
          signature_status: string;
          signature_id: string;
        };
        Insert: {
          id?: string;
          deal_room_id?: string;
          uploaded_by?: string;
          file_name?: string;
          file_url?: string;
          file_size?: number;
          file_type?: string;
          category?: string;
          is_confidential?: boolean;
          uploaded_at?: string;
          signature_status?: string;
          signature_id?: string;
        };
        Update: {
          id?: string;
          deal_room_id?: string;
          uploaded_by?: string;
          file_name?: string;
          file_url?: string;
          file_size?: number;
          file_type?: string;
          category?: string;
          is_confidential?: boolean;
          uploaded_at?: string;
          signature_status?: string;
          signature_id?: string;
        };
      };
      deal_room_messages: {
        Row: {
          id: string;
          deal_room_id: string;
          sender_id: string;
          content: string;
          deleted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_room_id?: string;
          sender_id?: string;
          content?: string;
          deleted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deal_room_id?: string;
          sender_id?: string;
          content?: string;
          deleted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      deal_room_negotiations: {
        Row: {
          id: string;
          deal_room_id: string;
          proposed_by: string;
          parent_offer_id: string;
          status: string;
          amount: number;
          terms: string;
          created_at: string;
          updated_at: string;
          deadline: string;
        };
        Insert: {
          id?: string;
          deal_room_id?: string;
          proposed_by?: string;
          parent_offer_id?: string;
          status?: string;
          amount?: number;
          terms?: string;
          created_at?: string;
          updated_at?: string;
          deadline?: string;
        };
        Update: {
          id?: string;
          deal_room_id?: string;
          proposed_by?: string;
          parent_offer_id?: string;
          status?: string;
          amount?: number;
          terms?: string;
          created_at?: string;
          updated_at?: string;
          deadline?: string;
        };
      };
      deal_room_participants: {
        Row: {
          id: string;
          deal_room_id: string;
          user_id: string;
          role: string;
          invited_by: string;
          invited_at: string;
          last_accessed_at: string;
        };
        Insert: {
          id?: string;
          deal_room_id?: string;
          user_id?: string;
          role?: string;
          invited_by?: string;
          invited_at?: string;
          last_accessed_at?: string;
        };
        Update: {
          id?: string;
          deal_room_id?: string;
          user_id?: string;
          role?: string;
          invited_by?: string;
          invited_at?: string;
          last_accessed_at?: string;
        };
      };
      deal_rooms: {
        Row: {
          id: string;
          deal_id: string;
          created_by: string;
          title: string;
          description: string;
          status: string;
          expires_at: string;
          access_code: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          created_by?: string;
          title?: string;
          description?: string;
          status?: string;
          expires_at?: string;
          access_code?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          created_by?: string;
          title?: string;
          description?: string;
          status?: string;
          expires_at?: string;
          access_code?: string;
        };
      };
      deal_scores: {
        Row: {
          id: string;
          deal_id: string;
          total_score: number;
          completeness_score: number;
          documentation_score: number;
          participation_score: number;
          compliance_score: number;
          factors: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          total_score?: number;
          completeness_score?: number;
          documentation_score?: number;
          participation_score?: number;
          compliance_score?: number;
          factors?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          total_score?: number;
          completeness_score?: number;
          documentation_score?: number;
          participation_score?: number;
          compliance_score?: number;
          factors?: Json;
          updated_at?: string;
        };
      };
      deal_updates: {
        Row: {
          id: string;
          deal_id: string;
          posted_by: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          posted_by?: string;
          content?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          posted_by?: string;
          content?: string;
          created_at?: string;
        };
      };
      deal_view_analytics: {
        Row: {
          id: string;
          deal_id: string;
          user_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          viewed_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          title: string;
          description: string;
          sector: string;
          location: string;
          funding_amount: number;
          funding_type: string;
          stage: string;
          is_featured: boolean;
          is_premium: boolean;
          created_by: string;
          investor_id: string;
          created_at: string;
          updated_at: string;
          is_removed: boolean;
          industry: string;
        };
        Insert: {
          id?: string;
          title?: string;
          description?: string;
          sector?: string;
          location?: string;
          funding_amount?: number;
          funding_type?: string;
          stage?: string;
          is_featured?: boolean;
          is_premium?: boolean;
          created_by?: string;
          investor_id?: string;
          created_at?: string;
          updated_at?: string;
          is_removed?: boolean;
          industry?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          sector?: string;
          location?: string;
          funding_amount?: number;
          funding_type?: string;
          stage?: string;
          is_featured?: boolean;
          is_premium?: boolean;
          created_by?: string;
          investor_id?: string;
          created_at?: string;
          updated_at?: string;
          is_removed?: boolean;
          industry?: string;
        };
      };
      dispute_evidence: {
        Row: {
          id: string;
          dispute_id: string;
          uploaded_by: string;
          file_url: string;
          file_name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id?: string;
          uploaded_by?: string;
          file_url?: string;
          file_name?: string;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          dispute_id?: string;
          uploaded_by?: string;
          file_url?: string;
          file_name?: string;
          description?: string;
          created_at?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          deal_id: string | null;
          deal_room_id: string | null;
          initiated_by: string;
          against_user: string;
          reason: string;
          description: string | null;
          status: string;
          resolution: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string | null;
          deal_room_id?: string | null;
          initiated_by?: string;
          against_user?: string;
          reason?: string;
          description?: string | null;
          status?: string;
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string | null;
          deal_room_id?: string | null;
          initiated_by?: string;
          against_user?: string;
          reason?: string;
          description?: string | null;
          status?: string;
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_access_log: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          action: string;
          ip_address: string;
          user_agent: string;
          accessed_at: string;
        };
        Insert: {
          id?: string;
          document_id?: string;
          user_id?: string;
          action?: string;
          ip_address?: string;
          user_agent?: string;
          accessed_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_id?: string;
          action?: string;
          ip_address?: string;
          user_agent?: string;
          accessed_at?: string;
        };
      };
      document_signatures: {
        Row: {
          id: string;
          document_id: string;
          deal_room_id: string;
          requested_by: string;
          signature_type: string;
          status: string;
          expires_at: string;
          signed_at: string;
          signature_data: Json;
          'etc.': Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id?: string;
          deal_room_id?: string;
          requested_by?: string;
          signature_type?: string;
          status?: string;
          expires_at?: string;
          signed_at?: string;
          signature_data?: Json;
          'etc.'?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          deal_room_id?: string;
          requested_by?: string;
          signature_type?: string;
          status?: string;
          expires_at?: string;
          signed_at?: string;
          signature_data?: Json;
          'etc.'?: Json;
          updated_at?: string;
        };
      };
      document_templates: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: string;
          content: string;
          file_type: string;
          tags: string[];
          created_by: string;
          created_at: string;
          is_public: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          description?: string;
          category?: string;
          content?: string;
          file_type?: string;
          tags?: string[];
          created_by?: string;
          created_at?: string;
          is_public?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          category?: string;
          content?: string;
          file_type?: string;
          tags?: string[];
          created_by?: string;
          created_at?: string;
          is_public?: boolean;
          updated_at?: string;
        };
      };
      email_queue: {
        Row: {
          id: string;
          to_email: string;
          subject: string;
          body_plain: string;
          body_html: string;
          notification_type: string;
          related_id: string;
          status: string;
          failed: Json;
          last_error: string;
          created_at: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          to_email?: string;
          subject?: string;
          body_plain?: string;
          body_html?: string;
          notification_type?: string;
          related_id?: string;
          status?: string;
          failed?: Json;
          last_error?: string;
          created_at?: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          to_email?: string;
          subject?: string;
          body_plain?: string;
          body_html?: string;
          notification_type?: string;
          related_id?: string;
          status?: string;
          failed?: Json;
          last_error?: string;
          created_at?: string;
          sent_at?: string;
        };
      };
      encryption_keys: {
        Row: {
          id: string;
          key_name: string;
          key_type: string;
          algorithm: string;
          key_version: number;
          is_active: boolean;
          key_rotation_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key_name?: string;
          key_type?: string;
          algorithm?: string;
          key_version?: number;
          is_active?: boolean;
          key_rotation_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key_name?: string;
          key_type?: string;
          algorithm?: string;
          key_version?: number;
          is_active?: boolean;
          key_rotation_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      featured_listing_payments: {
        Row: {
          id: string;
          deal_id: string;
          user_id: string;
          amount: number;
          currency: string;
          paystack_reference: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          paystack_reference?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          paystack_reference?: string;
          status?: string;
          created_at?: string;
        };
      };
      funding_rounds: {
        Row: {
          id: string;
          deal_id: string;
          deal_room_id: string;
          round_type: string;
          Series: Json;
          Series: Json;
          'etc.': Json;
          pre_money_valuation: number;
          post_money_valuation: number;
          amount_raised: number;
          lead_investor: string;
          investors_count: number;
          announcement_date: string;
          closed_date: string;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          deal_room_id?: string;
          round_type?: string;
          Series?: Json;
          Series?: Json;
          'etc.'?: Json;
          pre_money_valuation?: number;
          post_money_valuation?: number;
          amount_raised?: number;
          lead_investor?: string;
          investors_count?: number;
          announcement_date?: string;
          closed_date?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          deal_room_id?: string;
          round_type?: string;
          Series?: Json;
          Series?: Json;
          'etc.'?: Json;
          pre_money_valuation?: number;
          post_money_valuation?: number;
          amount_raised?: number;
          lead_investor?: string;
          investors_count?: number;
          announcement_date?: string;
          closed_date?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      industry_reports: {
        Row: {
          id: string;
          title: string;
          sector: string;
          summary: string;
          content: Json;
          report_type: string;
          published_at: string;
          is_premium: boolean;
          view_count: number;
        };
        Insert: {
          id?: string;
          title?: string;
          sector?: string;
          summary?: string;
          content?: Json;
          report_type?: string;
          published_at?: string;
          is_premium?: boolean;
          view_count?: number;
        };
        Update: {
          id?: string;
          title?: string;
          sector?: string;
          summary?: string;
          content?: Json;
          report_type?: string;
          published_at?: string;
          is_premium?: boolean;
          view_count?: number;
        };
      };
      market_insights: {
        Row: {
          id: string;
          sector: string;
          region: string;
          metric_type: string;
          value: number;
          period_start: string;
          period_end: string;
          data_source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sector?: string;
          region?: string;
          metric_type?: string;
          value?: number;
          period_start?: string;
          period_end?: string;
          data_source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sector?: string;
          region?: string;
          metric_type?: string;
          value?: number;
          period_start?: string;
          period_end?: string;
          data_source?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          file_url: string;
          file_name: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          file_url?: string;
          file_name?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          file_url?: string;
          file_name?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          user_id: string;
          in_app_enabled: boolean;
          email_enabled: boolean;
          muted_types: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          in_app_enabled?: boolean;
          email_enabled?: boolean;
          muted_types?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          in_app_enabled?: boolean;
          email_enabled?: boolean;
          muted_types?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          deal_room_id: string;
          related_entity_id: string;
          is_read: boolean;
          created_at: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          deal_room_id?: string;
          related_entity_id?: string;
          is_read?: boolean;
          created_at?: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          deal_room_id?: string;
          related_entity_id?: string;
          is_read?: boolean;
          created_at?: string;
          read_at?: string;
        };
      };
      portfolio_alerts: {
        Row: {
          id: string;
          portfolio_id: string;
          investment_id: string;
          alert_type: string;
          severity: string;
          title: string;
          message: string;
          is_read: boolean;
          action_required: boolean;
          action_url: string;
          metadata: Json;
          created_at: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id?: string;
          investment_id?: string;
          alert_type?: string;
          severity?: string;
          title?: string;
          message?: string;
          is_read?: boolean;
          action_required?: boolean;
          action_url?: string;
          metadata?: Json;
          created_at?: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          investment_id?: string;
          alert_type?: string;
          severity?: string;
          title?: string;
          message?: string;
          is_read?: boolean;
          action_required?: boolean;
          action_url?: string;
          metadata?: Json;
          created_at?: string;
          read_at?: string;
        };
      };
      portfolio_investments: {
        Row: {
          id: string;
          portfolio_id: string;
          deal_id: string;
          deal_room_id: string;
          company_name: string;
          investment_amount: number;
          shares_count: number;
          share_price: number;
          ownership_percentage: number;
          investment_date: string;
          status: string;
          exit_date: string;
          exit_amount: number;
          exit_multiple: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id?: string;
          deal_id?: string;
          deal_room_id?: string;
          company_name?: string;
          investment_amount?: number;
          shares_count?: number;
          share_price?: number;
          ownership_percentage?: number;
          investment_date?: string;
          status?: string;
          exit_date?: string;
          exit_amount?: number;
          exit_multiple?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          deal_id?: string;
          deal_room_id?: string;
          company_name?: string;
          investment_amount?: number;
          shares_count?: number;
          share_price?: number;
          ownership_percentage?: number;
          investment_date?: string;
          status?: string;
          exit_date?: string;
          exit_amount?: number;
          exit_multiple?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      portfolio_performance: {
        Row: {
          id: string;
          portfolio_id: string;
          metric_date: string;
          total_invested: number;
          current_value: number;
          unrealized_gains: number;
          realized_gains: number;
          total_returns: number;
          irr: number;
          multiple: number;
          active_investments: number;
          exited_investments: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id?: string;
          metric_date?: string;
          total_invested?: number;
          current_value?: number;
          unrealized_gains?: number;
          realized_gains?: number;
          total_returns?: number;
          irr?: number;
          multiple?: number;
          active_investments?: number;
          exited_investments?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          metric_date?: string;
          total_invested?: number;
          current_value?: number;
          unrealized_gains?: number;
          realized_gains?: number;
          total_returns?: number;
          irr?: number;
          multiple?: number;
          active_investments?: number;
          exited_investments?: number;
          metadata?: Json;
          created_at?: string;
        };
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          type: string;
          total_value: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          type?: string;
          total_value?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          type?: string;
          total_value?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: string;
          avatar_url: string;
          bio: string;
          company_name: string;
          sector: string;
          location: string;
          trust_score: number;
          verification_status: string;
          total_deals: number;
          created_at: string;
          updated_at: string;
          preferred_regions: string[];
          preferred_sectors: string[];
          is_suspended: boolean;
          phone: string;
          onboarded_at: string;
          privacy_settings: Json;
        };
        Insert: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: string;
          avatar_url?: string;
          bio?: string;
          company_name?: string;
          sector?: string;
          location?: string;
          trust_score?: number;
          verification_status?: string;
          total_deals?: number;
          created_at?: string;
          updated_at?: string;
          preferred_regions?: string[];
          preferred_sectors?: string[];
          is_suspended?: boolean;
          phone?: string;
          onboarded_at?: string;
          privacy_settings?: Json;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: string;
          avatar_url?: string;
          bio?: string;
          company_name?: string;
          sector?: string;
          location?: string;
          trust_score?: number;
          verification_status?: string;
          total_deals?: number;
          created_at?: string;
          updated_at?: string;
          preferred_regions?: string[];
          preferred_sectors?: string[];
          is_suspended?: boolean;
          phone?: string;
          onboarded_at?: string;
          privacy_settings?: Json;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          opportunity_id: string;
          reason: string;
          details: string;
          status: string;
          created_at: string;
          reviewed_at: string;
          reviewed_by: string;
        };
        Insert: {
          id?: string;
          reporter_id?: string;
          opportunity_id?: string;
          reason?: string;
          details?: string;
          status?: string;
          created_at?: string;
          reviewed_at?: string;
          reviewed_by?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          opportunity_id?: string;
          reason?: string;
          details?: string;
          status?: string;
          created_at?: string;
          reviewed_at?: string;
          reviewed_by?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          deal_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          comment?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          comment?: string;
          created_at?: string;
        };
      };
      saved_deals: {
        Row: {
          id: string;
          user_id: string;
          deal_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          deal_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          deal_id?: string;
          created_at?: string;
        };
      };
      security_events: {
        Row: {
          id: string;
          event_type: string;
          severity: string;
          user_id: string;
          description: string;
          metadata: Json;
          is_resolved: boolean;
          resolved_by: string;
          resolved_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type?: string;
          severity?: string;
          user_id?: string;
          description?: string;
          metadata?: Json;
          is_resolved?: boolean;
          resolved_by?: string;
          resolved_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          severity?: string;
          user_id?: string;
          description?: string;
          metadata?: Json;
          is_resolved?: boolean;
          resolved_by?: string;
          resolved_at?: string;
          created_at?: string;
        };
      };
      security_policies: {
        Row: {
          id: string;
          policy_name: string;
          policy_type: string;
          is_enabled: boolean;
          policy_config: Json;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_name?: string;
          policy_type?: string;
          is_enabled?: boolean;
          policy_config?: Json;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          policy_name?: string;
          policy_type?: string;
          is_enabled?: boolean;
          policy_config?: Json;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      signature_audit_log: {
        Row: {
          id: string;
          signature_id: string;
          signer_id: string;
          action: string;
          reminded?: Json;
          ip_address: string;
          user_agent: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          signature_id?: string;
          signer_id?: string;
          action?: string;
          reminded?: Json;
          ip_address?: string;
          user_agent?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          signature_id?: string;
          signer_id?: string;
          action?: string;
          reminded?: Json;
          ip_address?: string;
          user_agent?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      signature_signers: {
        Row: {
          id: string;
          signature_id: string;
          user_id: string;
          email: string;
          name: string;
          role: string;
          legal?: Json;
          signature_data: Json;
          ip_address: string;
          user_agent: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          signature_id?: string;
          user_id?: string;
          email?: string;
          name?: string;
          role?: string;
          legal?: Json;
          signature_data?: Json;
          ip_address?: string;
          user_agent?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          signature_id?: string;
          user_id?: string;
          email?: string;
          name?: string;
          role?: string;
          legal?: Json;
          signature_data?: Json;
          ip_address?: string;
          user_agent?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: string;
          status: string;
          paystack_reference: string;
          paystack_subscription_code: string;
          amount: number;
          currency: string;
          started_at: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          tier?: string;
          status?: string;
          paystack_reference?: string;
          paystack_subscription_code?: string;
          amount?: number;
          currency?: string;
          started_at?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tier?: string;
          status?: string;
          paystack_reference?: string;
          paystack_subscription_code?: string;
          amount?: number;
          currency?: string;
          started_at?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      template_usage: {
        Row: {
          id: string;
          template_id: string;
          deal_room_id: string;
          document_id: string;
          used_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id?: string;
          deal_room_id?: string;
          document_id?: string;
          used_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          deal_room_id?: string;
          document_id?: string;
          used_by?: string;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: Json;
        };
        Insert: {
          id?: string;
          user_id?: string;
          role?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: Json;
        };
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_token: string;
          ip_address: string;
          user_agent: string;
          device_type: string;
          location_country: string;
          location_city: string;
          is_active: boolean;
          last_activity: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          session_token?: string;
          ip_address?: string;
          user_agent?: string;
          device_type?: string;
          location_country?: string;
          location_city?: string;
          is_active?: boolean;
          last_activity?: string;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_token?: string;
          ip_address?: string;
          user_agent?: string;
          device_type?: string;
          location_country?: string;
          location_city?: string;
          is_active?: boolean;
          last_activity?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      verification_requests: {
        Row: {
          id: string;
          user_id: string;
          document_type: string;
          document_url: string;
          business_registration_number: string;
          notes: string;
          status: string;
          admin_notes: string;
          reviewed_by: string;
          reviewed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          document_type?: string;
          document_url?: string;
          business_registration_number?: string;
          notes?: string;
          status?: string;
          admin_notes?: string;
          reviewed_by?: string;
          reviewed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_type?: string;
          document_url?: string;
          business_registration_number?: string;
          notes?: string;
          status?: string;
          admin_notes?: string;
          reviewed_by?: string;
          reviewed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
