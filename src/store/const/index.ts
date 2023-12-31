export enum STORE_ACTION_TYPES {
  close = 0,
  apply = 1,
  review = 2,
  approve = 2,
  transform = 3,
}

export enum STORE_STATUS_TYPES {
  FROZEN = -2,
  REJECTED = -1,
  PENDING = 0,
  PREVIEW = 1,
  REVIEWED = 2,
  APPROVED = 3,
}
