export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AccountType = 'player' | 'venue'
export type SessionStatus = 'active' | 'expired' | 'completed'
export type GameMode = 'cricket_singles' | 'cricket_tag_team' | 'cricket_4way' | 'golf_stroke_play' | 'golf_match_play' | 'royal_rumble' | 'extra_games'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          username: string | null
          avatar: string | null
          photo_url: string | null
          account_type: AccountType
          is_venue_approved: boolean
          venue_approval_requested_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          username?: string | null
          avatar?: string | null
          photo_url?: string | null
          account_type?: AccountType
          is_venue_approved?: boolean
          venue_approval_requested_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          username?: string | null
          avatar?: string | null
          photo_url?: string | null
          account_type?: AccountType
          is_venue_approved?: boolean
          venue_approval_requested_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          owner_id: string
          venue_name: string
          venue_location: string | null
          qr_code_payload: string | null
          invite_quota: number
          invites_used: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          venue_name: string
          venue_location?: string | null
          qr_code_payload?: string | null
          invite_quota?: number
          invites_used?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          venue_name?: string
          venue_location?: string | null
          qr_code_payload?: string | null
          invite_quota?: number
          invites_used?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      venue_sessions: {
        Row: {
          id: string
          venue_id: string
          player_id: string
          session_token: string
          status: SessionStatus
          approved_duration_hours: number
          expires_at: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          venue_id: string
          player_id: string
          session_token: string
          status?: SessionStatus
          approved_duration_hours: number
          expires_at: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          venue_id?: string
          player_id?: string
          session_token?: string
          status?: SessionStatus
          approved_duration_hours?: number
          expires_at?: string
          created_at?: string
          completed_at?: string | null
        }
      }
      guests: {
        Row: {
          id: string
          venue_id: string
          guest_name: string
          games_played: number
          total_wins: number
          first_seen_at: string
          last_seen_at: string
          cricket_games_played: number
          cricket_games_won: number
          cricket_total_mpr: number
          golf_games_played: number
          golf_games_won: number
          golf_total_score: number
          extra_games_played: number
          extra_games_won: number
        }
        Insert: {
          id?: string
          venue_id: string
          guest_name: string
          games_played?: number
          total_wins?: number
          first_seen_at?: string
          last_seen_at?: string
          cricket_games_played?: number
          cricket_games_won?: number
          cricket_total_mpr?: number
          golf_games_played?: number
          golf_games_won?: number
          golf_total_score?: number
          extra_games_played?: number
          extra_games_won?: number
        }
        Update: {
          id?: string
          venue_id?: string
          guest_name?: string
          games_played?: number
          total_wins?: number
          first_seen_at?: string
          last_seen_at?: string
          cricket_games_played?: number
          cricket_games_won?: number
          cricket_total_mpr?: number
          golf_games_played?: number
          golf_games_won?: number
          golf_total_score?: number
          extra_games_played?: number
          extra_games_won?: number
        }
      }
      games: {
        Row: {
          id: string
          game_mode: GameMode
          venue_id: string | null
          session_id: string | null
          winner_id: string | null
          players: Json
          game_data: Json
          play_mode: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          game_mode: GameMode
          venue_id?: string | null
          session_id?: string | null
          winner_id?: string | null
          players: Json
          game_data: Json
          play_mode?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          game_mode?: GameMode
          venue_id?: string | null
          session_id?: string | null
          winner_id?: string | null
          players?: Json
          game_data?: Json
          play_mode?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      player_stats: {
        Row: {
          id: string
          player_id: string
          total_games_played: number
          total_games_won: number
          cricket_games_played: number
          cricket_games_won: number
          cricket_total_mpr: number
          cricket_average_mpr: number
          golf_games_played: number
          golf_games_won: number
          golf_total_score: number
          golf_average_score: number
          golf_best_score: number | null
          golf_tiebreaker_wins: number
          extra_games_played: number
          extra_games_won: number
          updated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          total_games_played?: number
          total_games_won?: number
          cricket_games_played?: number
          cricket_games_won?: number
          cricket_total_mpr?: number
          cricket_average_mpr?: number
          golf_games_played?: number
          golf_games_won?: number
          golf_total_score?: number
          golf_average_score?: number
          golf_best_score?: number | null
          golf_tiebreaker_wins?: number
          extra_games_played?: number
          extra_games_won?: number
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          total_games_played?: number
          total_games_won?: number
          cricket_games_played?: number
          cricket_games_won?: number
          cricket_total_mpr?: number
          cricket_average_mpr?: number
          golf_games_played?: number
          golf_games_won?: number
          golf_total_score?: number
          golf_average_score?: number
          golf_best_score?: number | null
          golf_tiebreaker_wins?: number
          extra_games_played?: number
          extra_games_won?: number
          updated_at?: string
        }
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: AccountType
      session_status: SessionStatus
      game_mode: GameMode
    }
  }
}
