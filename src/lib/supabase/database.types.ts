export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      airport_transfer_routes: {
        Row: {
          active: boolean
          airport_name: string
          estimated_duration_mins: number | null
          fixed_price_usd: number
          id: string
        }
        Insert: {
          active?: boolean
          airport_name: string
          estimated_duration_mins?: number | null
          fixed_price_usd: number
          id?: string
        }
        Update: {
          active?: boolean
          airport_name?: string
          estimated_duration_mins?: number | null
          fixed_price_usd?: number
          id?: string
        }
        Relationships: []
      }
      airport_transfers: {
        Row: {
          booking_id: string | null
          direction: Database["public"]["Enums"]["transfer_direction"]
          flight_number: string | null
          guest_id: string
          id: string
          notes: string | null
          price_usd: number | null
          route_id: string
          status: Database["public"]["Enums"]["transfer_status"]
          transfer_datetime: string
        }
        Insert: {
          booking_id?: string | null
          direction: Database["public"]["Enums"]["transfer_direction"]
          flight_number?: string | null
          guest_id: string
          id?: string
          notes?: string | null
          price_usd?: number | null
          route_id: string
          status?: Database["public"]["Enums"]["transfer_status"]
          transfer_datetime: string
        }
        Update: {
          booking_id?: string | null
          direction?: Database["public"]["Enums"]["transfer_direction"]
          flight_number?: string | null
          guest_id?: string
          id?: string
          notes?: string | null
          price_usd?: number | null
          route_id?: string
          status?: Database["public"]["Enums"]["transfer_status"]
          transfer_datetime?: string
        }
        Relationships: [
          {
            foreignKeyName: "airport_transfers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airport_transfers_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airport_transfers_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "airport_transfer_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_charges: {
        Row: {
          added_by_staff_id: string | null
          booking_id: string
          category: Database["public"]["Enums"]["charge_category"]
          created_at: string
          description: string
          id: string
          line_total_usd: number
          quantity: number
          unit_price_usd: number
        }
        Insert: {
          added_by_staff_id?: string | null
          booking_id: string
          category?: Database["public"]["Enums"]["charge_category"]
          created_at?: string
          description: string
          id?: string
          line_total_usd: number
          quantity?: number
          unit_price_usd: number
        }
        Update: {
          added_by_staff_id?: string | null
          booking_id?: string
          category?: Database["public"]["Enums"]["charge_category"]
          created_at?: string
          description?: string
          id?: string
          line_total_usd?: number
          quantity?: number
          unit_price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_charges_added_by_staff_id_fkey"
            columns: ["added_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_charges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          created_by_staff_id: string | null
          group_booking_id: string | null
          guest_id: string | null
          id: string
          notes: string | null
          num_guests: number | null
          ota_name: string | null
          room_id: string
          room_total_usd: number | null
          source: Database["public"]["Enums"]["booking_source"]
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          created_by_staff_id?: string | null
          group_booking_id?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          num_guests?: number | null
          ota_name?: string | null
          room_id: string
          room_total_usd?: number | null
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          created_by_staff_id?: string | null
          group_booking_id?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          num_guests?: number | null
          ota_name?: string | null
          room_id?: string
          room_total_usd?: number | null
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_bookings: {
        Row: {
          booking_id: string | null
          end_date: string
          guest_id: string
          id: string
          price_usd: number | null
          start_date: string
          status: Database["public"]["Enums"]["equipment_booking_status"]
          unit_id: string
        }
        Insert: {
          booking_id?: string | null
          end_date: string
          guest_id: string
          id?: string
          price_usd?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["equipment_booking_status"]
          unit_id: string
        }
        Update: {
          booking_id?: string | null
          end_date?: string
          guest_id?: string
          id?: string
          price_usd?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["equipment_booking_status"]
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_bookings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_bookings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "equipment_units"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          id: string
          name: string
          price_per_day_usd: number
        }
        Insert: {
          id?: string
          name: string
          price_per_day_usd: number
        }
        Update: {
          id?: string
          name?: string
          price_per_day_usd?: number
        }
        Relationships: []
      }
      equipment_units: {
        Row: {
          category_id: string
          condition_status: Database["public"]["Enums"]["equipment_condition_status"]
          id: string
          unit_label: string
        }
        Insert: {
          category_id: string
          condition_status?: Database["public"]["Enums"]["equipment_condition_status"]
          id?: string
          unit_label: string
        }
        Update: {
          category_id?: string
          condition_status?: Database["public"]["Enums"]["equipment_condition_status"]
          id?: string
          unit_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_units_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          nationality: string | null
          nic_or_passport: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          nationality?: string | null
          nic_or_passport?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          nationality?: string | null
          nic_or_passport?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          addon_charges_total_usd: number
          booking_id: string
          grand_total_usd: number
          id: string
          issued_at: string | null
          room_charges_total_usd: number
          status: Database["public"]["Enums"]["invoice_status"]
          surcharge_pct_applied: number
        }
        Insert: {
          addon_charges_total_usd?: number
          booking_id: string
          grand_total_usd?: number
          id?: string
          issued_at?: string | null
          room_charges_total_usd?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          surcharge_pct_applied?: number
        }
        Update: {
          addon_charges_total_usd?: number
          booking_id?: string
          grand_total_usd?: number
          id?: string
          issued_at?: string | null
          room_charges_total_usd?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          surcharge_pct_applied?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          created_at: string
          description: string
          id: string
          notes: string | null
          priority: string
          reported_by_staff_id: string | null
          resolved_at: string | null
          resolved_by_staff_id: string | null
          room_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          priority?: string
          reported_by_staff_id?: string | null
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          room_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          priority?: string
          reported_by_staff_id?: string | null
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          room_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_reported_by_staff_id_fkey"
            columns: ["reported_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_resolved_by_staff_id_fkey"
            columns: ["resolved_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_usd: number
          booking_id: string
          id: string
          invoice_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          payhere_payment_id: string | null
          polar_order_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_usd: number
          booking_id: string
          id?: string
          invoice_id?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          payhere_payment_id?: string | null
          polar_order_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_usd?: number
          booking_id?: string
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          payhere_payment_id?: string | null
          polar_order_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: []
      }
      room_categories: {
        Row: {
          base_price_usd: number
          description: string | null
          id: string
          image_url: string | null
          max_occupancy: number
          name: string
        }
        Insert: {
          base_price_usd: number
          description?: string | null
          id?: string
          image_url?: string | null
          max_occupancy: number
          name: string
        }
        Update: {
          base_price_usd?: number
          description?: string | null
          id?: string
          image_url?: string | null
          max_occupancy?: number
          name?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          category_id: string
          housekeeping_status: Database["public"]["Enums"]["room_housekeeping_status"]
          id: string
          operational_status: Database["public"]["Enums"]["room_operational_status"]
          room_number: string
        }
        Insert: {
          category_id: string
          housekeeping_status?: Database["public"]["Enums"]["room_housekeeping_status"]
          id?: string
          operational_status?: Database["public"]["Enums"]["room_operational_status"]
          room_number: string
        }
        Update: {
          category_id?: string
          housekeeping_status?: Database["public"]["Enums"]["room_housekeeping_status"]
          id?: string
          operational_status?: Database["public"]["Enums"]["room_operational_status"]
          room_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "room_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          check_in_time: string
          check_out_time: string
          id: boolean
          min_deposit_pct: number
          surcharge_pct: number
        }
        Insert: {
          check_in_time?: string
          check_out_time?: string
          id?: boolean
          min_deposit_pct?: number
          surcharge_pct?: number
        }
        Update: {
          check_in_time?: string
          check_out_time?: string
          id?: boolean
          min_deposit_pct?: number
          surcharge_pct?: number
        }
        Relationships: []
      }
      shift_notes: {
        Row: {
          content: string
          created_at: string
          created_by_staff_id: string
          id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by_staff_id: string
          id?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_staff_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_notes_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_available_equipment_units: {
        Args: {
          p_category_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          category_id: string
          condition_status: Database["public"]["Enums"]["equipment_condition_status"]
          id: string
          unit_label: string
        }[]
      }
      get_available_rooms: {
        Args: { p_category_id: string; p_check_in: string; p_check_out: string }
        Returns: {
          housekeeping_status: Database["public"]["Enums"]["room_housekeeping_status"]
          id: string
          room_number: string
        }[]
      }
      get_calendar_bookings: {
        Args: { p_end: string; p_start: string }
        Returns: {
          check_in: string
          check_out: string
          guest_full_name: string
          guest_id: string
          id: string
          room_category_name: string
          room_id: string
          room_number: string
          room_total_usd: number
          status: Database["public"]["Enums"]["booking_status"]
        }[]
      }
      get_staff_role: {
        Args: never
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      lookup_booking_by_ref: {
        Args: { p_email: string; p_ref: string }
        Returns: {
          check_in: string
          check_out: string
          created_at: string
          created_by_staff_id: string
          group_booking_id: string
          guest_email: string
          guest_full_name: string
          guest_id: string
          guest_nationality: string
          guest_nic_or_passport: string
          guest_phone: string
          id: string
          notes: string
          num_guests: number
          ota_name: string
          room_category_name: string
          room_id: string
          room_number: string
          room_total_usd: number
          source: string
          status: string
        }[]
      }
    }
    Enums: {
      booking_source: "website" | "walk_in" | "ota_manual"
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "no_show"
        | "maintenance_block"
      charge_category:
        | "room"
        | "late_checkout_fee"
        | "meal"
        | "transport"
        | "misc"
      equipment_booking_status: "active" | "returned" | "cancelled" | "pending"
      equipment_condition_status: "good" | "needs_maintenance" | "retired"
      invoice_status: "draft" | "issued" | "paid"
      payment_method: "card_payhere" | "cash" | "bank_transfer" | "card_polar"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      room_housekeeping_status: "dirty" | "cleaning" | "ready"
      room_operational_status: "active" | "retired"
      staff_role: "admin" | "receptionist" | "housekeeping"
      transfer_direction: "arrival" | "departure"
      transfer_status: "scheduled" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
