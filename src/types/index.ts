export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Prospect {
  id: string;
  company: string;
  industry: string;
  website: string;
  linkedin?: string;
  email?: string;
  phone?: string;
  location?: string;
  company_size?: string;
  status: "Verified" | "Pending" | "Invalid";
  created_at: string;
  user_id: string;
}

export interface ProspectList {
  id: string;
  name: string;
  description?: string;
  prospect_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface SearchFilters {
  industry?: string;
  location?: string;
  company_size?: string;
  keywords?: string;
}