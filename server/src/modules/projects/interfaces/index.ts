import type {
  ProjectData,
  ProjectWithLands,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilters,
  PaginatedProjects,
} from "../types/index.js";

export interface IProjectRepository {
  findAll(filters: ProjectFilters): Promise<PaginatedProjects>;
  findById(id: string): Promise<ProjectWithLands | null>;
  findByName(name: string): Promise<ProjectData | null>;
  create(data: CreateProjectInput): Promise<ProjectData>;
  update(id: string, data: UpdateProjectInput): Promise<ProjectData>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
