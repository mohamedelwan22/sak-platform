export interface SakConfigData {
  id: string;
  sakToGoldRatio: number;
  sellFeePercent: number;
  effectiveFrom: Date;
  createdAt: Date;
}

export interface CreateSakConfigInput {
  sakToGoldRatio: number;
  sellFeePercent: number;
  effectiveFrom: Date;
}

export interface UpdateSakConfigInput {
  sakToGoldRatio?: number;
  sellFeePercent?: number;
  effectiveFrom?: Date;
}
