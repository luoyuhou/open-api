export enum STORE_ACTION_TYPES {
  FROZEN = -3,
  CANCEL = -2,
  REJECTED = -1,
  APPLY = 0,
  PREVIEW = 1,
  REVIEWED = 2,
  APPROVED = 3,
  SUSPENDED = 4, // hung up
  OPENED = 5,
  CLOSED = 6,
  UPDATED = 7,
  TRANSFORM = 7,
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
