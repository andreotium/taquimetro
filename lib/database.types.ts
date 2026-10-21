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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agregados_taqueria: {
        Row: {
          porcentaje_copia: number | null
          precio_promedio: number | null
          prom_carne: number | null
          prom_salsa: number | null
          prom_tortilla: number | null
          puntaje_bayesiano: number | null
          taqueria_id: number
          votos: number
        }
        Insert: {
          porcentaje_copia?: number | null
          precio_promedio?: number | null
          prom_carne?: number | null
          prom_salsa?: number | null
          prom_tortilla?: number | null
          puntaje_bayesiano?: number | null
          taqueria_id: number
          votos?: number
        }
        Update: {
          porcentaje_copia?: number | null
          precio_promedio?: number | null
          prom_carne?: number | null
          prom_salsa?: number | null
          prom_tortilla?: number | null
          puntaje_bayesiano?: number | null
          taqueria_id?: number
          votos?: number
        }
        Relationships: [
          {
            foreignKeyName: "agregados_taqueria_taqueria_id_fkey"
            columns: ["taqueria_id"]
            isOneToOne: true
            referencedRelation: "taquerias"
            referencedColumns: ["id"]
          },
        ]
      }
      calificaciones: {
        Row: {
          carne: number
          copia: boolean
          creada_en: string
          id: number
          precio: number
          puntaje: number | null
          salsa: number
          taqueria_id: number
          tortilla: number
          user_id: string
        }
        Insert: {
          carne: number
          copia: boolean
          creada_en?: string
          id?: never
          precio: number
          puntaje?: number | null
          salsa: number
          taqueria_id: number
          tortilla: number
          user_id?: string
        }
        Update: {
          carne?: number
          copia?: boolean
          creada_en?: string
          id?: never
          precio?: number
          puntaje?: number | null
          salsa?: number
          taqueria_id?: number
          tortilla?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_taqueria_id_fkey"
            columns: ["taqueria_id"]
            isOneToOne: false
            referencedRelation: "taquerias"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos: {
        Row: {
          creada_en: string
          id: number
          ruta: string
          taqueria_id: number
          user_id: string
        }
        Insert: {
          creada_en?: string
          id?: never
          ruta: string
          taqueria_id: number
          user_id?: string
        }
        Update: {
          creada_en?: string
          id?: never
          ruta?: string
          taqueria_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_taqueria_id_fkey"
            columns: ["taqueria_id"]
            isOneToOne: false
            referencedRelation: "taquerias"
            referencedColumns: ["id"]
          },
        ]
      }
      taquerias: {
        Row: {
          alcaldia: string | null
          id: number
          latitud: number | null
          longitud: number | null
          nombre: string
        }
        Insert: {
          alcaldia?: string | null
          id?: number
          latitud?: number | null
          longitud?: number | null
          nombre: string
        }
        Update: {
          alcaldia?: string | null
          id?: number
          latitud?: number | null
          longitud?: number | null
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      puntaje_bayesiano: {
        Args: { c: number; m: number; r: number; v: number }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
