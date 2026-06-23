export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      access_profiles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_system: boolean;
          modules: string[];
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          modules?: string[];
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          modules?: string[];
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      atestados: {
        Row: {
          content: string;
          created_at: string;
          date: string;
          days: number | null;
          id: string;
          patient_id: string;
          updated_at: string;
          vet_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          date?: string;
          days?: number | null;
          id?: string;
          patient_id: string;
          updated_at?: string;
          vet_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          date?: string;
          days?: number | null;
          id?: string;
          patient_id?: string;
          updated_at?: string;
          vet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "atestados_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          created_at: string;
          document: string | null;
          email: string | null;
          full_name: string;
          id: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          document?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          document?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      consultations: {
        Row: {
          anamnesis: string | null;
          created_at: string;
          date: string;
          diagnosis: string | null;
          exam: string | null;
          heart_rate: number | null;
          id: string;
          observations: string | null;
          patient_id: string;
          temperature: number | null;
          treatment: string | null;
          updated_at: string;
          vet_id: string | null;
          weight: number | null;
        };
        Insert: {
          anamnesis?: string | null;
          created_at?: string;
          date?: string;
          diagnosis?: string | null;
          exam?: string | null;
          heart_rate?: number | null;
          id?: string;
          observations?: string | null;
          patient_id: string;
          temperature?: number | null;
          treatment?: string | null;
          updated_at?: string;
          vet_id?: string | null;
          weight?: number | null;
        };
        Update: {
          anamnesis?: string | null;
          created_at?: string;
          date?: string;
          diagnosis?: string | null;
          exam?: string | null;
          heart_rate?: number | null;
          id?: string;
          observations?: string | null;
          patient_id?: string;
          temperature?: number | null;
          treatment?: string | null;
          updated_at?: string;
          vet_id?: string | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      exames: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          name: string;
          notes: string | null;
          patient_id: string;
          requested: string | null;
          result: string | null;
          vet_id: string | null;
        };
        Insert: {
          created_at?: string;
          date?: string;
          id?: string;
          name: string;
          notes?: string | null;
          patient_id: string;
          requested?: string | null;
          result?: string | null;
          vet_id?: string | null;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          patient_id?: string;
          requested?: string | null;
          result?: string | null;
          vet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exames_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: {
          birth_date: string | null;
          breed: string | null;
          client_id: string;
          color: string | null;
          created_at: string;
          id: string;
          microchip: string | null;
          name: string;
          notes: string | null;
          sex: string | null;
          species: string;
          updated_at: string;
          weight: number | null;
        };
        Insert: {
          birth_date?: string | null;
          breed?: string | null;
          client_id: string;
          color?: string | null;
          created_at?: string;
          id?: string;
          microchip?: string | null;
          name: string;
          notes?: string | null;
          sex?: string | null;
          species: string;
          updated_at?: string;
          weight?: number | null;
        };
        Update: {
          birth_date?: string | null;
          breed?: string | null;
          client_id?: string;
          color?: string | null;
          created_at?: string;
          id?: string;
          microchip?: string | null;
          name?: string;
          notes?: string | null;
          sex?: string | null;
          species?: string;
          updated_at?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "patients_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      prescricao_items: {
        Row: {
          created_at: string;
          dosage: string | null;
          duration: string | null;
          frequency: string | null;
          id: string;
          notes: string | null;
          prescricao_id: string;
          product_id: string | null;
          product_name: string;
        };
        Insert: {
          created_at?: string;
          dosage?: string | null;
          duration?: string | null;
          frequency?: string | null;
          id?: string;
          notes?: string | null;
          prescricao_id: string;
          product_id?: string | null;
          product_name: string;
        };
        Update: {
          created_at?: string;
          dosage?: string | null;
          duration?: string | null;
          frequency?: string | null;
          id?: string;
          notes?: string | null;
          prescricao_id?: string;
          product_id?: string | null;
          product_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prescricao_items_prescricao_id_fkey";
            columns: ["prescricao_id"];
            isOneToOne: false;
            referencedRelation: "prescricoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescricao_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      prescricoes: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          notes: string | null;
          patient_id: string;
          vet_id: string | null;
        };
        Insert: {
          created_at?: string;
          date?: string;
          id?: string;
          notes?: string | null;
          patient_id: string;
          vet_id?: string | null;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          notes?: string | null;
          patient_id?: string;
          vet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "prescricoes_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      prescription_items: {
        Row: {
          consultation_id: string;
          created_at: string;
          dosage: string | null;
          duration: string | null;
          frequency: string | null;
          id: string;
          notes: string | null;
          product_id: string | null;
          product_name: string;
        };
        Insert: {
          consultation_id: string;
          created_at?: string;
          dosage?: string | null;
          duration?: string | null;
          frequency?: string | null;
          id?: string;
          notes?: string | null;
          product_id?: string | null;
          product_name: string;
        };
        Update: {
          consultation_id?: string;
          created_at?: string;
          dosage?: string | null;
          duration?: string | null;
          frequency?: string | null;
          id?: string;
          notes?: string | null;
          product_id?: string | null;
          product_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prescription_items_consultation_id_fkey";
            columns: ["consultation_id"];
            isOneToOne: false;
            referencedRelation: "consultations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescription_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          category: string;
          created_at: string;
          description: string | null;
          id: string;
          min_stock: number;
          name: string;
          price: number;
          sku: string | null;
          stock: number;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          min_stock?: number;
          name: string;
          price?: number;
          sku?: string | null;
          stock?: number;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          min_stock?: number;
          name?: string;
          price?: number;
          sku?: string | null;
          stock?: number;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string;
          id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      queue: {
        Row: {
          called_at: string | null;
          created_at: string;
          id: string;
          patient_id: string;
          priority: number;
          reason: string | null;
          room: string | null;
          status: Database["public"]["Enums"]["queue_status"];
          updated_at: string;
        };
        Insert: {
          called_at?: string | null;
          created_at?: string;
          id?: string;
          patient_id: string;
          priority?: number;
          reason?: string | null;
          room?: string | null;
          status?: Database["public"]["Enums"]["queue_status"];
          updated_at?: string;
        };
        Update: {
          called_at?: string | null;
          created_at?: string;
          id?: string;
          patient_id?: string;
          priority?: number;
          reason?: string | null;
          room?: string | null;
          status?: Database["public"]["Enums"]["queue_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "queue_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      receituarios: {
        Row: {
          content: string;
          created_at: string;
          date: string;
          id: string;
          kind: string;
          patient_id: string;
          updated_at: string;
          vet_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          date?: string;
          id?: string;
          kind?: string;
          patient_id: string;
          updated_at?: string;
          vet_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          date?: string;
          id?: string;
          kind?: string;
          patient_id?: string;
          updated_at?: string;
          vet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "receituarios_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          invoice_number: string | null;
          kind: string;
          notes: string | null;
          product_id: string;
          quantity: number;
          supplier: string | null;
          unit_cost: number | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_number?: string | null;
          kind: string;
          notes?: string | null;
          product_id: string;
          quantity: number;
          supplier?: string | null;
          unit_cost?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_number?: string | null;
          kind?: string;
          notes?: string | null;
          product_id?: string;
          quantity?: number;
          supplier?: string | null;
          unit_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      user_access_profiles: {
        Row: {
          created_at: string;
          profile_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          profile_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          profile_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_access_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "access_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vacinas: {
        Row: {
          application_date: string;
          batch: string | null;
          created_at: string;
          id: string;
          manufacturer: string | null;
          name: string;
          next_dose_date: string | null;
          notes: string | null;
          patient_id: string;
          updated_at: string;
          vet_id: string | null;
        };
        Insert: {
          application_date?: string;
          batch?: string | null;
          created_at?: string;
          id?: string;
          manufacturer?: string | null;
          name: string;
          next_dose_date?: string | null;
          notes?: string | null;
          patient_id: string;
          updated_at?: string;
          vet_id?: string | null;
        };
        Update: {
          application_date?: string;
          batch?: string | null;
          created_at?: string;
          id?: string;
          manufacturer?: string | null;
          name?: string;
          next_dose_date?: string | null;
          notes?: string | null;
          patient_id?: string;
          updated_at?: string;
          vet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vacinas_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      queue_panel: {
        Row: {
          called_at: string | null;
          created_at: string | null;
          id: string | null;
          patient_name: string | null;
          patient_species: string | null;
          room: string | null;
          status: Database["public"]["Enums"]["queue_status"] | null;
          tutor_name: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_user_modules: { Args: { _uid: string }; Returns: string[] };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "vet" | "reception";
      queue_status: "waiting" | "called" | "in_consult" | "done" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vet", "reception"],
      queue_status: ["waiting", "called", "in_consult", "done", "cancelled"],
    },
  },
} as const;
