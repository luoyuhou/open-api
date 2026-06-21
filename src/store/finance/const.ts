export const E_FINANCE_TYPE = {
  daily_revenue: 'daily_revenue',
  ingredient_cost: 'ingredient_cost',
  monthly_overhead: 'monthly_overhead',
  /** @deprecated 兼容旧数据 */
  rent: 'rent',
  /** @deprecated 兼容旧数据 */
  utilities: 'utilities',
} as const;

export type FinanceType = typeof E_FINANCE_TYPE[keyof typeof E_FINANCE_TYPE];
