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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          added_at: string
          course_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          course_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          course_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          last_watched_at: string | null
          subsection_id: string
          user_id: string
          video_progress: number | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          last_watched_at?: string | null
          subsection_id: string
          user_id: string
          video_progress?: number | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          last_watched_at?: string | null
          subsection_id?: string
          user_id?: string
          video_progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          average_rating: number | null
          category_id: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          id: string
          instructor_id: string
          is_free: boolean
          last_edited_at: string | null
          last_edited_by: string | null
          price: number
          recommended_price: number | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_url: string | null
          title: string
          total_duration: number | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          average_rating?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          instructor_id: string
          is_free?: boolean
          last_edited_at?: string | null
          last_edited_by?: string | null
          price?: number
          recommended_price?: number | null
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_url?: string | null
          title: string
          total_duration?: number | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          average_rating?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          instructor_id?: string
          is_free?: boolean
          last_edited_at?: string | null
          last_edited_by?: string | null
          price?: number
          recommended_price?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_url?: string | null
          title?: string
          total_duration?: number | null
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          verified?: boolean
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_applications: {
        Row: {
          account_id: string | null
          account_name: string | null
          bio: string | null
          created_at: string
          current_occupation: string | null
          field_of_expertise: string | null
          highest_qualification: string | null
          id: string
          payment_method: string | null
          resume_url: string | null
          updated_at: string
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          bio?: string | null
          created_at?: string
          current_occupation?: string | null
          field_of_expertise?: string | null
          highest_qualification?: string | null
          id?: string
          payment_method?: string | null
          resume_url?: string | null
          updated_at?: string
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          bio?: string | null
          created_at?: string
          current_occupation?: string | null
          field_of_expertise?: string | null
          highest_qualification?: string | null
          id?: string
          payment_method?: string | null
          resume_url?: string | null
          updated_at?: string
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          notification_type: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          notification_type?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          notification_type?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          id: string
          payment_method: string
          payment_reference: string | null
          status: Database["public"]["Enums"]["order_status"]
          transaction_uuid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          course_id: string
          created_at?: string
          id?: string
          payment_method: string
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          transaction_uuid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          transaction_uuid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          instructor_id: string
          notes: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          instructor_id: string
          notes?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          instructor_id?: string
          notes?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          id: string
          is_disabled: boolean
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          section_id: string
          title: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          section_id: string
          title: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          section_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          is_approved: boolean
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          is_approved?: boolean
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      subsections: {
        Row: {
          created_at: string
          duration: number | null
          id: string
          is_preview: boolean
          position: number
          section_id: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          id?: string
          is_preview?: boolean
          position?: number
          section_id: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          id?: string
          is_preview?: boolean
          position?: number
          section_id?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          category_id: string | null
          course_id: string | null
          created_at: string
          id: string
          search_query: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          category_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          search_query?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          category_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          search_query?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_logs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_course_difficulty: {
        Args: { course_uuid: string }
        Returns: string
      }
      calculate_recommended_price: {
        Args: { course_uuid: string }
        Returns: number
      }
      generate_certificate_number: { Args: never; Returns: string }
      get_all_users_with_emails: {
        Args: never
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_course_recommendations: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          average_rating: number
          category_id: string
          category_name: string
          description: string
          difficulty_level: string
          id: string
          instructor_id: string
          is_free: boolean
          price: number
          recommendation_score: number
          slug: string
          thumbnail_url: string
          title: string
          total_duration: number
        }[]
      }
      get_instructor_profile: {
        Args: { instructor_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          full_name: string
        }[]
      }
      get_reviewer_name: { Args: { reviewer_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_courses: {
        Args: {
          category_filter?: string
          difficulty_filter?: string
          max_price?: number
          min_price?: number
          min_rating?: number
          price_type?: string
          search_term: string
        }
        Returns: {
          average_rating: number
          category_id: string
          category_name: string
          description: string
          difficulty_level: string
          enrollment_count: number
          id: string
          instructor_id: string
          is_free: boolean
          price: number
          relevance_score: number
          slug: string
          thumbnail_url: string
          title: string
          total_duration: number
          total_reviews: number
        }[]
      }
    }
    Enums: {
      app_role: "student" | "instructor" | "admin"
      course_status: "draft" | "pending" | "published" | "rejected"
      notification_type:
        | "review"
        | "admin_edit"
        | "enrollment"
        | "certificate"
        | "system"
      order_status: "pending" | "completed" | "failed" | "refunded"
      payout_status: "pending" | "approved" | "rejected" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
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
      app_role: ["student", "instructor", "admin"],
      course_status: ["draft", "pending", "published", "rejected"],
      notification_type: [
        "review",
        "admin_edit",
        "enrollment",
        "certificate",
        "system",
      ],
      order_status: ["pending", "completed", "failed", "refunded"],
      payout_status: ["pending", "approved", "rejected", "completed"],
    },
  },
} as const
