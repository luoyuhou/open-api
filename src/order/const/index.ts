export enum E_USER_ORDER_STATUS {
  delete = -2,
  cancel = -1,
  active = 0,
}

export enum E_USER_ORDER_STAGE {
  create = 1,
  accept = 2,
  delivery = 3,
  received = 4,
  finished = 5,
}

// 支付状态：只表示商家是否确认收款
export enum E_USER_ORDER_PAY_STATUS {
  unpaid = 0, // 未支付 / 未收款
  paid = 1, // 商家已确认收款
}

// 支付方式：统一使用字符串，方便前后端扩展
export enum E_USER_ORDER_PAYMENT_METHOD {
  ONLINE_QR = 'online_qr', // 扫码向商家付款
  COD = 'cod', // 货到付款
  PICKUP_PAY = 'pickup_pay', // 到店付款
}
