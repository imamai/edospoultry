// Auto-generated types for EdosHatch Supabase project: gxgcrpemrmqrfoxrbsdf
// Regenerate: npm run db:types

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string; name: string; slug: string; country: "KE" | "RW" | "UG";
          currency: string; phone: string | null; email: string | null;
          address: string | null; logo_url: string | null; settings: Json;
          is_active: boolean; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string; organization_id: string; full_name: string;
          phone_number: string | null; email: string | null; avatar_url: string | null;
          role: UserRole; county_id: number | null; subcounty_id: number | null;
          depot_id: string | null; preferred_language: PreferredLanguage;
          is_active: boolean; last_seen_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      counties: {
        Row: { id: number; code: string; name: string; region: string; country: "KE" | "RW" | "UG"; centroid: Json | null; created_at: string; };
        Insert: Omit<Database["public"]["Tables"]["counties"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["counties"]["Insert"]>;
      };
      subcounties: {
        Row: { id: number; county_id: number; name: string; created_at: string; };
        Insert: Omit<Database["public"]["Tables"]["subcounties"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["subcounties"]["Insert"]>;
      };
      wards: {
        Row: { id: number; subcounty_id: number; county_id: number; name: string; population_estimate: number | null; centroid: Json | null; boundary: Json | null; created_at: string; };
        Insert: Omit<Database["public"]["Tables"]["wards"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["wards"]["Insert"]>;
      };
      depots: {
        Row: {
          id: string; organization_id: string; name: string; code: string;
          county_id: number | null; subcounty_id: number | null; address: string | null;
          gps_coordinates: Json | null; phone: string | null; manager_id: string | null;
          is_active: boolean; has_hatchery: boolean; has_cold_storage: boolean;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["depots"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["depots"]["Insert"]>;
      };
      farmers: {
        Row: {
          id: string; organization_id: string; registered_by: string | null;
          phone_number: string; full_name: string; id_number: string | null;
          county_id: number | null; subcounty_id: number | null; ward_id: number | null;
          gps_coordinates: Json | null; nearest_depot_id: string | null;
          farm_size_acres: number | null; preferred_language: PreferredLanguage;
          preferred_channel: PreferredChannel; whatsapp_opted_in: boolean;
          is_active: boolean; notes: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["farmers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["farmers"]["Insert"]>;
      };
      farmer_flocks: {
        Row: {
          id: string; organization_id: string; farmer_id: string; house_id: string | null;
          flock_code: string | null; bird_category: BirdCategory; breed: string | null;
          initial_quantity: number; current_quantity: number; placement_date: string;
          expected_depletion_date: string | null; actual_depletion_date: string | null;
          status: FlockStatus; purpose: FlockPurpose; purchase_price_per_bird: number | null;
          source_depot_id: string | null; vaccination_status: Json; notes: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["farmer_flocks"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["farmer_flocks"]["Insert"]>;
      };
      egg_production_records: {
        Row: {
          id: string; organization_id: string; flock_id: string; farmer_id: string;
          production_date: string; morning_collection: number; afternoon_collection: number;
          total_eggs_laid: number; cracked_eggs: number; dirty_eggs: number;
          grade_a_count: number; grade_b_count: number; grade_c_count: number;
          hatching_eggs: number; saleable_eggs: number; hen_count: number;
          hen_day_production: number; feed_consumption_kg: number | null;
          mortality_count: number; avg_egg_weight_g: number | null;
          temperature_c: number | null; humidity_pct: number | null;
          recorded_by: string | null; notes: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["egg_production_records"]["Row"],
          "id" | "total_eggs_laid" | "saleable_eggs" | "hen_day_production" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["egg_production_records"]["Insert"]>;
      };
      sales_orders: {
        Row: {
          id: string; organization_id: string; order_number: string;
          farmer_id: string | null; agent_id: string | null; depot_id: string;
          order_type: OrderType; product_details: Json; batch_id: string | null;
          chick_quantity: number | null; chick_price_per_unit: number | null;
          egg_trays: number | null; egg_grade: EggGrade | null; egg_price_per_tray: number | null;
          subtotal: number; discount_amount: number; total_amount: number;
          amount_paid: number; balance_due: number; order_date: string;
          requested_delivery_date: string | null; delivery_address: string | null;
          delivery_county_id: number | null; delivery_ward_id: number | null;
          status: OrderStatus; channel: string; notes: string | null;
          etims_invoice_id: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sales_orders"]["Row"],
          "id" | "balance_due" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["sales_orders"]["Insert"]>;
      };
      order_payments: {
        Row: {
          id: string; organization_id: string; order_id: string;
          payment_method: PaymentMethod; mpesa_transaction_id: string | null;
          mpesa_checkout_request_id: string | null; mpesa_merchant_request_id: string | null;
          mpesa_phone_number: string | null; amount: number; status: PaymentStatus;
          failure_reason: string | null; paid_at: string | null; metadata: Json;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["order_payments"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["order_payments"]["Insert"]>;
      };
      deliveries: {
        Row: {
          id: string; organization_id: string; order_id: string;
          driver_id: string | null; depot_id: string; status: DeliveryStatus;
          dispatch_time: string | null; estimated_arrival: string | null;
          delivery_time: string | null; route_description: string | null;
          realtime_gps_track: Json; current_lat: number | null; current_lng: number | null;
          delivery_photo_url: string | null; recipient_name: string | null;
          recipient_signature_url: string | null; failure_reason: string | null;
          notes: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["deliveries"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["deliveries"]["Insert"]>;
      };
      chick_batches: {
        Row: {
          id: string; organization_id: string; depot_id: string; batch_code: string;
          hatchery_name: string | null; bird_category: BirdCategory; breed: string;
          hatch_date: string; expected_mortality_rate: number; vaccination_status: Json;
          initial_count: number; available_count: number; price_per_chick: number;
          notes: string | null; is_active: boolean; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chick_batches"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["chick_batches"]["Insert"]>;
      };
      vaccination_schedules: {
        Row: {
          id: string; organization_id: string; farmer_id: string; flock_id: string;
          vaccine_type: string; disease_target: string; bird_age_days: number | null;
          scheduled_date: string; completed_date: string | null; administered_by: string | null;
          reminder_sent: boolean; reminder_sent_at: string | null; method: string | null;
          dose_per_bird: number | null; notes: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vaccination_schedules"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["vaccination_schedules"]["Insert"]>;
      };
      mortality_claims: {
        Row: {
          id: string; organization_id: string; farmer_id: string; flock_id: string;
          order_id: string | null; claim_date: string; bird_age_days: number | null;
          claimed_deaths: number; claimed_mortality_rate: number | null;
          actual_deaths: number | null; actual_mortality_rate: number | null;
          cause_of_death: string | null; agent_notes: string | null; vet_notes: string | null;
          photos: Json; compensation_amount: number | null; status: ClaimStatus;
          reviewed_by: string | null; reviewed_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["mortality_claims"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["mortality_claims"]["Insert"]>;
      };
      hatchery_batches: {
        Row: {
          id: string; organization_id: string; depot_id: string; batch_code: string;
          batch_name: string; egg_source: string; bird_category: BirdCategory; breed: string | null;
          set_date: string; expected_hatch_date: string; actual_hatch_date: string | null;
          incubator_id: string | null; eggs_set: number; eggs_candled: number;
          fertile_eggs: number; eggs_transferred: number; chicks_hatched: number;
          chicks_culled: number; chicks_saleable: number; hatch_rate_pct: number | null;
          fertility_rate_pct: number | null; status: string; notes: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["hatchery_batches"]["Row"],
          "id" | "expected_hatch_date" | "chicks_saleable" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["hatchery_batches"]["Insert"]>;
      };
      ussd_sessions: {
        Row: {
          id: string; session_id: string; phone_number: string; farmer_id: string | null;
          organization_id: string | null; current_step: string; session_data: Json;
          is_active: boolean; language: PreferredLanguage;
          created_at: string; updated_at: string; expires_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ussd_sessions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ussd_sessions"]["Insert"]>;
      };
    };
    Views: {
      vw_active_flocks: { Row: Record<string, unknown> };
    };
    Functions: {
      fn_my_org_id: { Args: Record<never, never>; Returns: string };
      fn_my_role: { Args: Record<never, never>; Returns: string };
      fn_find_ward_for_point: {
        Args: { lat: number; lng: number };
        Returns: { ward_id: number; ward_name: string; subcounty_id: number; subcounty_name: string; county_id: number; county_name: string }[];
      };
      fn_generate_order_number: { Args: { org_slug: string }; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      country_code: "KE" | "RW" | "UG";
      preferred_language: PreferredLanguage;
      preferred_channel: PreferredChannel;
      bird_category: BirdCategory;
      flock_status: FlockStatus;
      flock_purpose: FlockPurpose;
      egg_grade: EggGrade;
      order_type: OrderType;
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      delivery_status: DeliveryStatus;
      claim_status: ClaimStatus;
    };
  };
};

// ── Enum types ────────────────────────────────────────────────
export type UserRole =
  | "super_admin" | "country_admin" | "county_manager"
  | "subcounty_manager" | "depot_manager" | "agent"
  | "driver" | "accountant" | "farmer_self_service";

export type PreferredLanguage = "en" | "sw" | "rw" | "lg";
export type PreferredChannel = "whatsapp" | "ussd" | "sms" | "app";

export type BirdCategory =
  | "broiler" | "layer" | "dual_purpose" | "indigenous" | "breeder"
  | "turkey" | "duck" | "quail" | "guinea_fowl";

export type FlockStatus = "active" | "depleted" | "sold" | "transferred" | "cancelled";
export type FlockPurpose = "meat" | "eggs" | "breeding" | "replacement" | "dual_purpose";
export type EggGrade = "A" | "B" | "C" | "hatching" | "cracked" | "dirty";

export type OrderType = "chicks" | "eggs" | "feed" | "vaccine" | "equipment" | "mixed";
export type OrderStatus =
  | "draft" | "pending" | "confirmed" | "processing"
  | "dispatched" | "delivered" | "cancelled" | "refunded";

export type PaymentMethod =
  | "mpesa_stk" | "mpesa_c2b" | "mpesa_b2c" | "cash" | "bank_transfer" | "credit";
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";

export type DeliveryStatus =
  | "pending" | "assigned" | "dispatched" | "in_transit"
  | "delivered" | "failed" | "returned";

export type ClaimStatus = "submitted" | "under_review" | "approved" | "rejected" | "paid";

// ── Row helpers ───────────────────────────────────────────────
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
