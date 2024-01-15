export enum STORE_ACTION_TYPES {
  APPLY = 0,
  CANCEL = 1,
  PREVIEW = 2,
  REVIEWED = 3,
  APPROVED = 4,
  REJECTED = 5,
  SUSPENDED = 6, // hung up
  OPENED = 7,
  CLOSED = 8,
  UPDATED = 9,
  TRANSFORM = 10,
  FROZEN = 99,
}

export enum STORE_STATUS_TYPES {
  FROZEN = -3,
  CANCEL = -2,
  REJECTED = -1,
  PENDING = 0,
  PREVIEW = 1,
  REVIEWED = 2,
  APPROVED = 3,
  SUSPENDED = 4, // hung up
  OPENED = 5, // hung up
  CLOSED = 6,
}
