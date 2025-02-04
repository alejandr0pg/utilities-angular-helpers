export interface UserModel {
  id: string;
  name: string;
  last_name: string;
  username: string;
  email: string;
  role_id: string;
  avatar_url?: string;
  created_at: number;
  updated_at?: number;
  status?: boolean;
  phone?: string;
  otp_active?: boolean;
}
