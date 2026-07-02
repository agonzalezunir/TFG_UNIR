// src/app/auth/models/auth.models.ts

export interface LoginResponse {
  status: 'ok' | 'error';
  token?: string;
}

export interface UserProfile {
  userid: number;
  username: string;
  name: string;
  profilename:string;
  userstatus:string;
  isadmin: boolean;
  roles: string[];
}

export interface NavItem {
  id: string;
  label: string;
  route?: string;
  icon?: string;
  children?: NavItem[];
}
