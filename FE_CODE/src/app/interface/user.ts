export interface JUser {
  id: number;
  username?: string;
  email: string;
  fullName: string;
  sex?: string;
  dob?: string;
  phoneNumber?: string;
  address?: string;
  position?: string;
  position_1?: string | null;
  position_level?: string | null;
  start_date?: string | null;
  avatarUrl: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}
