export const PLATFORM_ORDER_TYPE = {
  STORE_CREATE: 'STORE_CREATE',
  MEMBER_QUOTA: 'MEMBER_QUOTA',
} as const;

export const PLATFORM_ORDER_STATUS = {
  PENDING: 0,
  CONFIRMED: 1,
  CANCELLED: 2,
} as const;

export const PLATFORM_CODE_STATUS = {
  UNUSED: 0,
  USED: 1,
} as const;

export const FREE_STORES_PER_USER = 1;
export const FREE_MEMBERS_PER_STORE = 10;

/** 会员扩容档位价格（分） */
export const MEMBER_QUOTA_PRICES: Record<number, number> = {
  10: 100,
  50: 450,
  100: 800,
};

export const MEMBER_QUOTA_OPTIONS = [10, 50, 100] as const;

export const PLATFORM_SETTING_KEYS = {
  DUTY_USER_IDS: 'duty_user_ids',
} as const;
