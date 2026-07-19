export interface PermissionData {
  id: string;
  name: string;
  description: string | null;
  type: string;
  resource: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionListResponse {
  data: PermissionData[];
  total: number;
}

export interface CreatePermissionInput {
  name: string;
  description?: string;
  type: string;
  resource: string;
}

export interface UpdatePermissionInput {
  description?: string;
  type?: string;
  resource?: string;
  isActive?: boolean;
}
