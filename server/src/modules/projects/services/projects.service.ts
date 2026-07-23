import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { ProjectRepository } from "../repositories/projects.repository.js";
import type {
  ProjectData,
  ProjectWithLands,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilters,
  PaginatedProjects,
} from "../types/index.js";

export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async findAll(filters: ProjectFilters): Promise<PaginatedProjects> {
    return this.projectRepository.findAll(filters);
  }

  async findById(id: string): Promise<ProjectWithLands> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundError("Project not found");
    return project;
  }

  async create(input: CreateProjectInput): Promise<ProjectData> {
    const existingName = await this.projectRepository.findByName(input.titleAr);
    if (existingName) throw new ConflictError("A project with this Arabic title already exists");

    return this.projectRepository.create(input);
  }

  async update(id: string, input: UpdateProjectInput): Promise<ProjectData> {
    const existing = await this.projectRepository.findById(id);
    if (!existing) throw new NotFoundError("Project not found");

    if (input.titleAr && input.titleAr !== existing.titleAr) {
      const nameTaken = await this.projectRepository.findByName(input.titleAr);
      if (nameTaken) throw new ConflictError("A project with this Arabic title already exists");
    }

    return this.projectRepository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.projectRepository.findById(id);
    if (!existing) throw new NotFoundError("Project not found");

    if (existing._count.lands > 0) {
      throw new ConflictError(
        "Cannot delete project with existing lands. Remove all lands first.",
      );
    }

    await this.projectRepository.delete(id);
  }

  async count(): Promise<number> {
    return this.projectRepository.count();
  }
}
