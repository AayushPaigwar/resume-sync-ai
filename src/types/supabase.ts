export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at'>;
        Update: Partial<Omit<User, 'created_at'>>;
      };
      resumes: {
        Row: Resume;
        Insert: Omit<Resume, 'created_at'>;
        Update: Partial<Omit<Resume, 'created_at'>>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, 'created_at'>;
        Update: Partial<Omit<Job, 'created_at'>>;
      };
      feature_flags: {
        Row: {
          feature_flag_id: number;
          is_visible: boolean;
          announcement_content: string;
        };
        Insert: {
          is_visible: boolean;
          announcement_content: string;
        };
        Update: Partial<{
          is_visible: boolean;
          announcement_content: string;
        }>;
      };
      saved_jobs: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          created_at: string;
        };
        Insert: Omit<{
          id: string;
          user_id: string;
          job_id: string;
          created_at: string;
        }, 'created_at'>;
        Update: Partial<Omit<{
          id: string;
          user_id: string;
          job_id: string;
          created_at: string;
        }, 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  file_url: string;
  extracted_data: {
    technical_skills: string[];
    soft_skills: string[];
    experience: string[];
  };
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  skills: string[];
  location: string;
  created_at: string;
}