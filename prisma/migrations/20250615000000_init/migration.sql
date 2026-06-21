-- CreateTable
CREATE TABLE "user" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "gender" INTEGER NOT NULL DEFAULT 0,
    "avatar" TEXT,
    "bio" TEXT,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_signin_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "ip" TEXT,
    "useragent" TEXT,
    "source" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_signin_password" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "failed_login_times" INTEGER NOT NULL DEFAULT 0,
    "locked_date" DATETIME,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_signin_wechat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "openid" TEXT NOT NULL,
    "unionid" TEXT,
    "user_id" TEXT NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "id_code" TEXT NOT NULL,
    "id_name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "wechat_qr_url" TEXT,
    "alipay_qr_url" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "action_type" INTEGER NOT NULL,
    "action_content" TEXT NOT NULL,
    "payload" TEXT,
    "action_user_id" TEXT NOT NULL,
    "action_date" DATETIME NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_address" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_address_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "tag" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "category_goods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "pid" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_goods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "goods_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_goods_version" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "image_url" TEXT,
    "image_hash" TEXT,
    "version_number" TEXT,
    "bar_code" TEXT,
    "count" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "unit_name" TEXT NOT NULL,
    "supplier" TEXT,
    "status" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "stage" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_channel" TEXT,
    "pay_status" INTEGER NOT NULL DEFAULT 0,
    "paid_at" DATETIME,
    "pay_proof_url" TEXT,
    "recipient" TEXT NOT NULL,
    "money" INTEGER NOT NULL,
    "original_amount" INTEGER DEFAULT 0,
    "discount_rate" INTEGER DEFAULT 100,
    "discount_amount" INTEGER DEFAULT 0,
    "points_used" INTEGER DEFAULT 0,
    "points_earn" INTEGER DEFAULT 0,
    "phone" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "delivery_date" DATETIME NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_order_info" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_info_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "goods_name" TEXT NOT NULL,
    "goods_version_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_order_action" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_action_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "province" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "town" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "store_apply" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "applicant_user_id" TEXT NOT NULL,
    "applicant_date" DATETIME NOT NULL,
    "applicant_summary" TEXT NOT NULL,
    "applicant_content" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "replient_user_id" TEXT,
    "replient_date" DATETIME,
    "replient_content" TEXT,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "auth" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pid" TEXT NOT NULL DEFAULT '0',
    "auth_id" TEXT NOT NULL,
    "side" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT,
    "status" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "role" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role_id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "description" TEXT,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_auth" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL,
    "status" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_role" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "auth_role" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auth_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_fetch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "source" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "report_daily_user_fetch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "times" INTEGER NOT NULL,
    "use_time" INTEGER NOT NULL,
    "record_date" DATETIME NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "report_store_daily_order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "total_orders" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "record_date" DATETIME NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "report_platform_daily_order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "total_orders" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "record_date" DATETIME NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "report_store_daily_goods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "goods_version_id" TEXT NOT NULL,
    "goods_name" TEXT NOT NULL,
    "total_count" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "record_date" DATETIME NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "report_store_finance_daily" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "record_date" TEXT NOT NULL,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "ingredient_cost" INTEGER NOT NULL DEFAULT 0,
    "rent_amount" INTEGER NOT NULL DEFAULT 0,
    "water_amount" INTEGER NOT NULL DEFAULT 0,
    "electricity_amount" INTEGER NOT NULL DEFAULT 0,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "home_banner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "banner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "file" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "file_name" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "chat_group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "chat_group_user" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" INTEGER NOT NULL DEFAULT 0,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_rating" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 0,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "avg_star" REAL NOT NULL DEFAULT 0,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_favorite_store" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_store_browse_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "visit_date" DATETIME NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_feedback" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feedback_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_feedback_attachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feedback_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_feedback_comment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feedback_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" INTEGER,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_service_plan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthly_fee" INTEGER NOT NULL,
    "max_subscriptions" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_service_subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "is_infinite" BOOLEAN NOT NULL DEFAULT false,
    "order_count_last_cycle" INTEGER DEFAULT 0,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contract_id" INTEGER
);

-- CreateTable
CREATE TABLE "store_service_invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subscription_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "due_date" DATETIME NOT NULL,
    "paid_at" DATETIME,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_service_invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "store_service_subscription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "store_service_payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoice_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "remark" TEXT,
    "paid_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_service_payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "store_service_invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "store_service_contract" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contract_no" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "sign_type" INTEGER NOT NULL,
    "signed_at" DATETIME,
    "total_amount" INTEGER NOT NULL,
    "file_url" TEXT,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_file" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "file_id" INTEGER NOT NULL,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_resource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "total_quota" BIGINT NOT NULL DEFAULT 10485760,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_resource_order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "quota_amount" BIGINT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_settlement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "settlement_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "total_income" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "settled_at" DATETIME,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_settlement_detail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "settlement_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "order_stage" INTEGER NOT NULL,
    "pay_status" INTEGER NOT NULL,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "store_settlement_detail_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "store_settlement" ("settlement_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "platform_settlement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "settlement_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "total_subscription_fee" INTEGER NOT NULL DEFAULT 0,
    "total_resource_fee" INTEGER NOT NULL DEFAULT 0,
    "total_order_service_fee" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "settled_at" DATETIME,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "platform_settlement_detail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "settlement_id" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "ref_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "remark" TEXT,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_settlement_detail_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "platform_settlement" ("settlement_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "store_order_service_fee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "fee_date" DATETIME NOT NULL,
    "fee_amount" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "is_charged" BOOLEAN NOT NULL DEFAULT false,
    "create_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_member" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "member_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" INTEGER NOT NULL DEFAULT 0,
    "avatar" TEXT,
    "birthday" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_recharge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recharge_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "received_amount" INTEGER NOT NULL,
    "cashier_name" TEXT,
    "remark" TEXT,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_staff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "staff_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "store_finance_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "record_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "record_date" TEXT NOT NULL,
    "item_name" TEXT NOT NULL DEFAULT '',
    "alipay" INTEGER NOT NULL DEFAULT 0,
    "wechat" INTEGER NOT NULL DEFAULT 0,
    "cash" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "rent_amount" INTEGER NOT NULL DEFAULT 0,
    "water_volume" REAL NOT NULL DEFAULT 0,
    "water_amount" INTEGER NOT NULL DEFAULT 0,
    "electricity_kwh" REAL NOT NULL DEFAULT 0,
    "electricity_amount" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "create_date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "update_date" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "user_user_id_key" ON "user"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_signin_password_user_id_key" ON "user_signin_password"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_signin_wechat_openid_key" ON "user_signin_wechat"("openid");

-- CreateIndex
CREATE UNIQUE INDEX "store_store_id_key" ON "store"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_address_user_address_id_key" ON "user_address"("user_address_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_goods_category_id_key" ON "category_goods"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_goods_store_id_name_key" ON "category_goods"("store_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "store_goods_goods_id_key" ON "store_goods"("goods_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_goods_store_id_category_id_name_key" ON "store_goods"("store_id", "category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "store_goods_version_version_id_key" ON "store_goods_version"("version_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_goods_version_goods_id_unit_name_version_number_key" ON "store_goods_version"("goods_id", "unit_name", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "store_goods_version_goods_id_unit_name_bar_code_key" ON "store_goods_version"("goods_id", "unit_name", "bar_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_order_order_id_key" ON "user_order"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_order_info_order_info_id_key" ON "user_order_info"("order_info_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_order_action_order_action_id_key" ON "user_order_action"("order_action_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_auth_id_key" ON "auth"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_side_path_key" ON "auth"("side", "path");

-- CreateIndex
CREATE UNIQUE INDEX "role_role_id_key" ON "role"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_role_name_key" ON "role"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_user_id_key" ON "user_auth"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_user_id_role_id_key" ON "user_role"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_role_role_id_auth_id_key" ON "auth_role"("role_id", "auth_id");

-- CreateIndex
CREATE INDEX "report_store_daily_order_record_date_idx" ON "report_store_daily_order"("record_date");

-- CreateIndex
CREATE INDEX "report_store_daily_order_store_id_idx" ON "report_store_daily_order"("store_id");

-- CreateIndex
CREATE INDEX "report_platform_daily_order_record_date_idx" ON "report_platform_daily_order"("record_date");

-- CreateIndex
CREATE INDEX "report_store_daily_goods_record_date_idx" ON "report_store_daily_goods"("record_date");

-- CreateIndex
CREATE INDEX "report_store_daily_goods_store_id_goods_id_idx" ON "report_store_daily_goods"("store_id", "goods_id");

-- CreateIndex
CREATE INDEX "report_store_daily_goods_store_id_goods_id_goods_version_id_idx" ON "report_store_daily_goods"("store_id", "goods_id", "goods_version_id");

-- CreateIndex
CREATE INDEX "report_store_finance_daily_store_id_record_date_idx" ON "report_store_finance_daily"("store_id", "record_date");

-- CreateIndex
CREATE UNIQUE INDEX "report_store_finance_daily_store_id_record_date_key" ON "report_store_finance_daily"("store_id", "record_date");

-- CreateIndex
CREATE UNIQUE INDEX "home_banner_banner_id_key" ON "home_banner"("banner_id");

-- CreateIndex
CREATE INDEX "home_banner_status_sort_idx" ON "home_banner"("status", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "file_hash_key" ON "file"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_group_id_key" ON "chat_group"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_group_user_group_id_user_id_key" ON "chat_group_user"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_rating_store_id_key" ON "store_rating"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_store_user_id_store_id_key" ON "user_favorite_store"("user_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_store_browse_history_user_id_store_id_key" ON "user_store_browse_history"("user_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_feedback_feedback_id_key" ON "user_feedback"("feedback_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_service_plan_plan_id_key" ON "store_service_plan"("plan_id");

-- CreateIndex
CREATE INDEX "store_service_subscription_store_id_idx" ON "store_service_subscription"("store_id");

-- CreateIndex
CREATE INDEX "store_service_subscription_plan_id_idx" ON "store_service_subscription"("plan_id");

-- CreateIndex
CREATE INDEX "store_service_subscription_contract_id_idx" ON "store_service_subscription"("contract_id");

-- CreateIndex
CREATE INDEX "store_service_invoice_subscription_id_month_idx" ON "store_service_invoice"("subscription_id", "month");

-- CreateIndex
CREATE INDEX "store_service_payment_invoice_id_idx" ON "store_service_payment"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_service_contract_contract_no_key" ON "store_service_contract"("contract_no");

-- CreateIndex
CREATE INDEX "store_service_contract_store_id_idx" ON "store_service_contract"("store_id");

-- CreateIndex
CREATE INDEX "store_service_contract_plan_id_idx" ON "store_service_contract"("plan_id");

-- CreateIndex
CREATE INDEX "store_file_store_id_idx" ON "store_file"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_file_store_id_file_id_key" ON "store_file"("store_id", "file_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_resource_store_id_key" ON "store_resource"("store_id");

-- CreateIndex
CREATE INDEX "store_resource_store_id_idx" ON "store_resource"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_resource_order_order_id_key" ON "store_resource_order"("order_id");

-- CreateIndex
CREATE INDEX "store_resource_order_store_id_idx" ON "store_resource_order"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_settlement_settlement_id_key" ON "store_settlement"("settlement_id");

-- CreateIndex
CREATE INDEX "store_settlement_store_id_idx" ON "store_settlement"("store_id");

-- CreateIndex
CREATE INDEX "store_settlement_month_idx" ON "store_settlement"("month");

-- CreateIndex
CREATE UNIQUE INDEX "store_settlement_store_id_month_key" ON "store_settlement"("store_id", "month");

-- CreateIndex
CREATE INDEX "store_settlement_detail_settlement_id_idx" ON "store_settlement_detail"("settlement_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settlement_settlement_id_key" ON "platform_settlement"("settlement_id");

-- CreateIndex
CREATE INDEX "platform_settlement_month_idx" ON "platform_settlement"("month");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settlement_month_key" ON "platform_settlement"("month");

-- CreateIndex
CREATE INDEX "platform_settlement_detail_settlement_id_idx" ON "platform_settlement_detail"("settlement_id");

-- CreateIndex
CREATE INDEX "platform_settlement_detail_type_ref_id_idx" ON "platform_settlement_detail"("type", "ref_id");

-- CreateIndex
CREATE INDEX "store_order_service_fee_store_id_month_idx" ON "store_order_service_fee"("store_id", "month");

-- CreateIndex
CREATE INDEX "store_order_service_fee_fee_date_idx" ON "store_order_service_fee"("fee_date");

-- CreateIndex
CREATE UNIQUE INDEX "store_order_service_fee_store_id_order_id_key" ON "store_order_service_fee"("store_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_member_member_id_key" ON "store_member"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_member_store_id_phone_key" ON "store_member"("store_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "store_recharge_recharge_id_key" ON "store_recharge"("recharge_id");

-- CreateIndex
CREATE INDEX "store_recharge_member_id_idx" ON "store_recharge"("member_id");

-- CreateIndex
CREATE INDEX "store_recharge_store_id_idx" ON "store_recharge"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_staff_staff_id_key" ON "store_staff"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_staff_store_id_phone_key" ON "store_staff"("store_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "store_finance_record_record_id_key" ON "store_finance_record"("record_id");

-- CreateIndex
CREATE INDEX "store_finance_record_store_id_type_idx" ON "store_finance_record"("store_id", "type");

-- CreateIndex
CREATE INDEX "store_finance_record_store_id_record_date_idx" ON "store_finance_record"("store_id", "record_date");

-- CreateIndex
CREATE UNIQUE INDEX "store_finance_record_store_id_type_record_date_item_name_key" ON "store_finance_record"("store_id", "type", "record_date", "item_name");

