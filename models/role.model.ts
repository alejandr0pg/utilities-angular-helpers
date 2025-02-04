export interface RoleModel {
  id: string;
  name: string;
  description: string;
  permissions: {
    [key: string]: Permission;
  };
  created_at: number;
  updated_at?: number;
}

export interface Permission {
  read: boolean;
  write: boolean;
  delete: boolean;
}
