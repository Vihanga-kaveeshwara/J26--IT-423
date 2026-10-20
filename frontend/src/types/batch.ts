/**
 * TypeScript Type Definitions for M2 Batch & ML Prediction
 * frontend/src/types/batch.ts
 */

export interface BatchInput {
  batch_id?: string;
  factory_id: string;
  region: string;
  elevation_band?: string;
  batch_date?: string;
  green_leaf_input_kg: number;
  withering_duration_hrs: number;
  dryer_temperature_c: number;
  machine_downtime_hrs?: number;
  plucking_fine_leaf_pct: number;
  relative_humidity_pct: number;
  ambient_temperature_c: number;
  tea_grade_produced: string;
  refuse_resale_status?: string;
  season?: string;
  month?: number;
  total_dry_tea_kg?: number;
}

export interface FeatureAttribution {
  feature: string;
  feature_value: number;
  shap_value_pp: number;
  contribution: 'INCREASES_REFUSE' | 'DECREASES_REFUSE' | string;
}

export interface MitigationAdvice {
  feature: string;
  feature_value: number;
  shap_value_pp: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  category: string;
  recommendation: string;
}

export interface EconomicImpactResult {
  mode: string;
  success: boolean;
  green_leaf_input_kg: number;
  predicted_refuse_pct: number;
  total_dry_tea_kg: number;
  yield_ratio_used: number;
  estimated_refuse_tea_kg: number;
  tea_grade_produced: string;
  good_tea_price_per_kg: number;
  refuse_resale_status: string;
  is_recovered: boolean;
  recovered_price_per_kg: number;
  net_loss_per_kg: number;
  gross_revenue_loss_lkr: number;
  recovered_revenue_lkr: number;
  revenue_loss_lkr: number;
  disclaimer: string;
}

export interface PredictionSummary {
  predicted_refuse_tea_pct: number;
  used_fallback_rolling_features: boolean;
  rolling_humidity_3batch: number | null;
  rolling_ambient_temp_3batch: number | null;
  prior_batches_count?: number;
  latency_ms: number;
}

export interface ExplanationSummary {
  base_value_pct: number;
  top_features: FeatureAttribution[];
  mitigations: MitigationAdvice[];
  latency_ms?: number;
}

export interface BatchRecord {
  id: string;
  batch_id: string;
  factory_id: string;
  region: string;
  elevation_band?: string | null;
  batch_date: string;
  month?: number | null;
  season?: string | null;
  source: 'synthetic_seed' | 'operator_submitted' | string;
  green_leaf_input_kg: number;
  withering_duration_hrs: number;
  dryer_temperature_c: number;
  machine_downtime_hrs: number;
  plucking_fine_leaf_pct: number;
  relative_humidity_pct: number;
  ambient_temperature_c: number;
  tea_grade_produced: string;
  refuse_resale_status: string;
  made_tea_output_kg?: number | null;
  refuse_tea_kg?: number | null;
  actual_refuse_tea_pct?: number | null;
  rolling_humidity_3batch?: number | null;
  rolling_ambient_temp_3batch?: number | null;
  used_fallback_rolling_features: boolean;
  predicted_refuse_tea_pct?: number | null;
  top_shap_drivers?: FeatureAttribution[] | null;
  mitigations?: MitigationAdvice[] | null;
  economic_impact?: EconomicImpactResult | null;
  created_at: string;
  updated_at: string;
}

export interface BatchCreationResponse {
  success: boolean;
  data: BatchRecord;
  prediction: PredictionSummary;
  explanation: ExplanationSummary;
  economic_impact: EconomicImpactResult;
}

export interface BatchListResponse {
  success: boolean;
  data: BatchRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BatchDetailResponse {
  success: boolean;
  data: BatchRecord;
}

export interface WhatIfOverrides {
  withering_duration_hrs?: number;
  dryer_temperature_c?: number;
  machine_downtime_hrs?: number;
  plucking_fine_leaf_pct?: number;
  [key: string]: number | undefined;
}

export interface WhatIfEconomicSummary {
  base_revenue_loss_lkr: number;
  simulated_revenue_loss_lkr: number;
  simulated_savings_lkr: number;
  savings_pct_of_loss: number;
}

export interface WhatIfSimulationResult {
  baseline_predicted_refuse_pct: number;
  simulated_predicted_refuse_pct: number;
  delta_refuse_pct: number;
  direction: 'IMPROVEMENT' | 'REGRESSION' | 'UNCHANGED' | string;
  overrides_applied: Record<string, number>;
  derived_features_updated: Record<string, any>;
  out_of_distribution_warning: boolean;
  out_of_distribution_details: string[];
  economic_impact?: WhatIfEconomicSummary | null;
  disclaimer: string;
  latency_ms: number;
  used_fallback_rolling_features: boolean;
}

export interface WhatIfResponse {
  success: boolean;
  batch_id: string;
  simulation: WhatIfSimulationResult;
}

export interface BatchQueryFilter {
  factory_id?: string;
  region?: string;
  source?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
