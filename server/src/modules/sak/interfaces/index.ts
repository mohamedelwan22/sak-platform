import type { SakConfigData, CreateSakConfigInput, UpdateSakConfigInput } from "../types/index.js";

export interface ISakConfigRepository {
  findAll(): Promise<SakConfigData[]>;
  findById(id: string): Promise<SakConfigData | null>;
  findCurrent(): Promise<SakConfigData | null>;
  create(data: CreateSakConfigInput): Promise<SakConfigData>;
  update(id: string, data: UpdateSakConfigInput): Promise<SakConfigData>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
