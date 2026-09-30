export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      account: {
        Row: {
          asset_class_id: number | null;
          balance_cents: number | null;
          cpf_type: string | null;
          created_at: string;
          currency: string;
          id: number;
          interest_rate: number;
          is_active: boolean;
          is_liability: boolean;
          mask: string | null;
          name: string;
          note: string | null;
          type: string;
        };
        Insert: {
          asset_class_id?: number | null;
          balance_cents?: number | null;
          cpf_type?: string | null;
          created_at?: string;
          currency?: string;
          id?: never;
          interest_rate?: number;
          is_active?: boolean;
          is_liability?: boolean;
          mask?: string | null;
          name: string;
          note?: string | null;
          type: string;
        };
        Update: {
          asset_class_id?: number | null;
          balance_cents?: number | null;
          cpf_type?: string | null;
          created_at?: string;
          currency?: string;
          id?: never;
          interest_rate?: number;
          is_active?: boolean;
          is_liability?: boolean;
          mask?: string | null;
          name?: string;
          note?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_asset_class_id_fkey';
            columns: ['asset_class_id'];
            isOneToOne: false;
            referencedRelation: 'asset_class';
            referencedColumns: ['id'];
          },
        ];
      };
      asset_class: {
        Row: {
          color: string | null;
          id: number;
          label: string;
        };
        Insert: {
          color?: string | null;
          id?: never;
          label: string;
        };
        Update: {
          color?: string | null;
          id?: never;
          label?: string;
        };
        Relationships: [];
      };
      card: {
        Row: {
          account_id: number;
          bank: string;
          bill_due_day: number | null;
          card_type: string;
          color_theme: string | null;
          credit_limit_cents: number | null;
          id: number;
          include_in_budget: boolean;
          last4: string | null;
          network: string | null;
          product_name: string;
          rewards_earned_display: string | null;
          rewards_program: string | null;
          statement_date: string | null;
          statement_day: number | null;
        };
        Insert: {
          account_id: number;
          bank: string;
          bill_due_day?: number | null;
          card_type: string;
          color_theme?: string | null;
          credit_limit_cents?: number | null;
          id?: never;
          include_in_budget?: boolean;
          last4?: string | null;
          network?: string | null;
          product_name: string;
          rewards_earned_display?: string | null;
          rewards_program?: string | null;
          statement_date?: string | null;
          statement_day?: number | null;
        };
        Update: {
          account_id?: number;
          bank?: string;
          bill_due_day?: number | null;
          card_type?: string;
          color_theme?: string | null;
          credit_limit_cents?: number | null;
          id?: never;
          include_in_budget?: boolean;
          last4?: string | null;
          network?: string | null;
          product_name?: string;
          rewards_earned_display?: string | null;
          rewards_program?: string | null;
          statement_date?: string | null;
          statement_day?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'card_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'account';
            referencedColumns: ['id'];
          },
        ];
      };
      category: {
        Row: {
          icon: string | null;
          id: number;
          kind: string;
          name: string;
        };
        Insert: {
          icon?: string | null;
          id?: never;
          kind?: string;
          name: string;
        };
        Update: {
          icon?: string | null;
          id?: never;
          kind?: string;
          name?: string;
        };
        Relationships: [];
      };
      goal: {
        Row: {
          current_amount_cents: number;
          id: number;
          name: string;
          sort_order: number;
          src: string;
          target_amount_cents: number;
          target_date: string | null;
        };
        Insert: {
          current_amount_cents?: number;
          id?: never;
          name: string;
          sort_order?: number;
          src: string;
          target_amount_cents: number;
          target_date?: string | null;
        };
        Update: {
          current_amount_cents?: number;
          id?: never;
          name?: string;
          sort_order?: number;
          src?: string;
          target_amount_cents?: number;
          target_date?: string | null;
        };
        Relationships: [];
      };
      income_source: {
        Row: {
          account_id: number | null;
          base_income_cents: number;
          custom_every: number | null;
          custom_unit: string | null;
          employer: string | null;
          frequency: string;
          id: number;
          is_active: boolean;
          last_posted_date: string | null;
          name: string;
          payday: number | null;
          start_date: string;
          type: string;
        };
        Insert: {
          account_id?: number | null;
          base_income_cents: number;
          custom_every?: number | null;
          custom_unit?: string | null;
          employer?: string | null;
          frequency: string;
          id?: never;
          is_active?: boolean;
          last_posted_date?: string | null;
          name: string;
          payday?: number | null;
          start_date: string;
          type: string;
        };
        Update: {
          account_id?: number | null;
          base_income_cents?: number;
          custom_every?: number | null;
          custom_unit?: string | null;
          employer?: string | null;
          frequency?: string;
          id?: never;
          is_active?: boolean;
          last_posted_date?: string | null;
          name?: string;
          payday?: number | null;
          start_date?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'income_source_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'account';
            referencedColumns: ['id'];
          },
        ];
      };
      instrument: {
        Row: {
          currency: string;
          exchange: string | null;
          id: number;
          kind: string | null;
          name: string | null;
          sector: string | null;
          symbol: string;
        };
        Insert: {
          currency?: string;
          exchange?: string | null;
          id?: never;
          kind?: string | null;
          name?: string | null;
          sector?: string | null;
          symbol: string;
        };
        Update: {
          currency?: string;
          exchange?: string | null;
          id?: never;
          kind?: string | null;
          name?: string | null;
          sector?: string | null;
          symbol?: string;
        };
        Relationships: [];
      };
      lot: {
        Row: {
          cost_per_unit_cents: number;
          created_at: string;
          id: number;
          position_id: number;
          purchased_at: string;
          quantity: number;
        };
        Insert: {
          cost_per_unit_cents: number;
          created_at?: string;
          id?: never;
          position_id: number;
          purchased_at: string;
          quantity: number;
        };
        Update: {
          cost_per_unit_cents?: number;
          created_at?: string;
          id?: never;
          position_id?: number;
          purchased_at?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lot_position_id_fkey';
            columns: ['position_id'];
            isOneToOne: false;
            referencedRelation: 'position';
            referencedColumns: ['id'];
          },
        ];
      };
      net_worth_snapshot: {
        Row: {
          date: string;
          id: number;
          liabilities_cents: number;
          total_cents: number;
        };
        Insert: {
          date: string;
          id?: never;
          liabilities_cents?: number;
          total_cents: number;
        };
        Update: {
          date?: string;
          id?: never;
          liabilities_cents?: number;
          total_cents?: number;
        };
        Relationships: [];
      };
      net_worth_snapshot_class: {
        Row: {
          amount_cents: number;
          asset_class_id: number;
          snapshot_id: number;
        };
        Insert: {
          amount_cents: number;
          asset_class_id: number;
          snapshot_id: number;
        };
        Update: {
          amount_cents?: number;
          asset_class_id?: number;
          snapshot_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'net_worth_snapshot_class_asset_class_id_fkey';
            columns: ['asset_class_id'];
            isOneToOne: false;
            referencedRelation: 'asset_class';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'net_worth_snapshot_class_snapshot_id_fkey';
            columns: ['snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'net_worth_snapshot';
            referencedColumns: ['id'];
          },
        ];
      };
      position: {
        Row: {
          account_id: number | null;
          id: number;
          instrument_id: number;
        };
        Insert: {
          account_id?: number | null;
          id?: never;
          instrument_id: number;
        };
        Update: {
          account_id?: number | null;
          id?: never;
          instrument_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'position_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'account';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'position_instrument_id_fkey';
            columns: ['instrument_id'];
            isOneToOne: false;
            referencedRelation: 'instrument';
            referencedColumns: ['id'];
          },
        ];
      };
      recurring_charge: {
        Row: {
          account_id: number | null;
          amount_cents: number;
          category_id: number | null;
          custom_every: number | null;
          custom_unit: string | null;
          end_date: string | null;
          frequency: string;
          id: number;
          is_active: boolean;
          last_posted_date: string | null;
          name: string;
          start_date: string;
        };
        Insert: {
          account_id?: number | null;
          amount_cents: number;
          category_id?: number | null;
          custom_every?: number | null;
          custom_unit?: string | null;
          end_date?: string | null;
          frequency: string;
          id?: never;
          is_active?: boolean;
          last_posted_date?: string | null;
          name: string;
          start_date: string;
        };
        Update: {
          account_id?: number | null;
          amount_cents?: number;
          category_id?: number | null;
          custom_every?: number | null;
          custom_unit?: string | null;
          end_date?: string | null;
          frequency?: string;
          id?: never;
          is_active?: boolean;
          last_posted_date?: string | null;
          name?: string;
          start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recurring_charge_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'account';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_charge_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'category';
            referencedColumns: ['id'];
          },
        ];
      };
      sale: {
        Row: {
          account_id: number | null;
          cost_basis_cents: number;
          created_at: string;
          id: number;
          instrument_id: number;
          price_per_unit_cents: number;
          proceeds_cents: number;
          quantity: number;
          realized_pnl_cents: number;
          sold_at: string;
        };
        Insert: {
          account_id?: number | null;
          cost_basis_cents: number;
          created_at?: string;
          id?: never;
          instrument_id: number;
          price_per_unit_cents: number;
          proceeds_cents: number;
          quantity: number;
          realized_pnl_cents: number;
          sold_at: string;
        };
        Update: {
          account_id?: number | null;
          cost_basis_cents?: number;
          created_at?: string;
          id?: never;
          instrument_id?: number;
          price_per_unit_cents?: number;
          proceeds_cents?: number;
          quantity?: number;
          realized_pnl_cents?: number;
          sold_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sale_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'account';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_instrument_id_fkey';
            columns: ['instrument_id'];
            isOneToOne: false;
            referencedRelation: 'instrument';
            referencedColumns: ['id'];
          },
        ];
      };
      settings: {
        Row: {
          base_currency: string;
          cpf_employee_rate: number;
          cpf_employer_rate: number;
          cpf_ma_rate: number;
          cpf_oa_rate: number;
          cpf_sa_rate: number;
          email: string | null;
          id: number;
          monthly_expenditure_cents: number;
          monthly_investment_cents: number;
          monthly_savings_cents: number;
          name: string;
          payday: string | null;
        };
        Insert: {
          base_currency?: string;
          cpf_employee_rate?: number;
          cpf_employer_rate?: number;
          cpf_ma_rate?: number;
          cpf_oa_rate?: number;
          cpf_sa_rate?: number;
          email?: string | null;
          id?: number;
          monthly_expenditure_cents?: number;
          monthly_investment_cents?: number;
          monthly_savings_cents?: number;
          name: string;
          payday?: string | null;
        };
        Update: {
          base_currency?: string;
          cpf_employee_rate?: number;
          cpf_employer_rate?: number;
          cpf_ma_rate?: number;
          cpf_oa_rate?: number;
          cpf_sa_rate?: number;
          email?: string | null;
          id?: number;
          monthly_expenditure_cents?: number;
          monthly_investment_cents?: number;
          monthly_savings_cents?: number;
          name?: string;
          payday?: string | null;
        };
        Relationships: [];
      };
      txn: {
        Row: {
          account_id: number | null;
          amount_cents: number;
          category_id: number | null;
          created_at: string;
          currency: string;
          date: string;
          description: string;
          id: number;
          income_id: number | null;
          kind: string;
          recurring_id: number | null;
        };
        Insert: {
          account_id?: number | null;
          amount_cents: number;
          category_id?: number | null;
          created_at?: string;
          currency?: string;
          date: string;
          description: string;
          id?: never;
          income_id?: number | null;
          kind: string;
          recurring_id?: number | null;
        };
        Update: {
          account_id?: number | null;
          amount_cents?: number;
          category_id?: number | null;
          created_at?: string;
          currency?: string;
          date?: string;
          description?: string;
          id?: never;
          income_id?: number | null;
          kind?: string;
          recurring_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'txn_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'account';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'txn_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'category';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'txn_income_id_fkey';
            columns: ['income_id'];
            isOneToOne: false;
            referencedRelation: 'income_source';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'txn_recurring_id_fkey';
            columns: ['recurring_id'];
            isOneToOne: false;
            referencedRelation: 'recurring_charge';
            referencedColumns: ['id'];
          },
        ];
      };
      watchlist_item: {
        Row: {
          added_at: string;
          id: number;
          instrument_id: number;
        };
        Insert: {
          added_at?: string;
          id?: never;
          instrument_id: number;
        };
        Update: {
          added_at?: string;
          id?: never;
          instrument_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'watchlist_item_instrument_id_fkey';
            columns: ['instrument_id'];
            isOneToOne: true;
            referencedRelation: 'instrument';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_sale: {
        Args: {
          p_account_id: number;
          p_instrument_id: number;
          p_lots: Json;
          p_price_per_unit_cents: number;
          p_quantity: number;
          p_sold_at: string;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
      DefaultSchema['Views'])
  ? (DefaultSchema['Tables'] &
      DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
  ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
  ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
