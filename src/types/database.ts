export type UserRole = 'viewer' | 'editor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  calendar_token: string;
  created_at: string;
  updated_at: string;
}

export interface AcademicYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorContact {
  name: string;
  email: string | null;
  company: string | null;
}

export type SessionType = 'simulation' | 'other';

export interface Session {
  id: string;
  academic_year_id: string;
  session_date: string;
  session_type: SessionType;
  topic: string | null;
  faculty: string[];
  vendor: string | null;
  vendor_contacts: VendorContact[];
  equipment: string[];
  tissue: string | null;
  bdp_superficial: string | null;
  bdp_compartments: string | null;
  bdp_bony_structures: string | null;
  bdp_vasculature: string | null;
  collaboration: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Attachment {
  id: string;
  session_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  created_at: string;
}

// Session with attachments included
export interface SessionWithAttachments extends Session {
  attachments?: Attachment[];
}

// Fields visible to viewers
export const VIEWER_FIELDS = [
  'id', 'session_date', 'session_type', 'topic', 'faculty', 'vendor',
  'vendor_contacts', 'equipment', 'tissue', 'academic_year_id', 'sort_order'
] as const;

// All fields visible to editors/admins
export const EDITOR_FIELDS = [
  ...VIEWER_FIELDS,
  'bdp_superficial', 'bdp_compartments', 'bdp_bony_structures',
  'bdp_vasculature', 'collaboration', 'notes',
  'created_at', 'updated_at', 'created_by', 'updated_by'
] as const;
