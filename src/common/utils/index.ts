class Utils {
  static formatIp(ip: string) {
    const ipPrefix = '::ffff:';
    if (ip.includes(ipPrefix)) {
      return ip.indexOf(ipPrefix) === 0 ? ip.slice(ipPrefix.length) : ip;
    }

    if (ip.includes('::')) {
      return ip.split('::')?.[0] ?? ip;
    }

    return ip;
  }

  /**
   * tow level
   * @param arr
   * @param pid
   * @param key
   */
  static array2Tree<T>(
    arr: T[],
    pid: { key: string; emptyValue: string | number | null },
    key: string,
  ): (T & { children?: T[] })[] {
    const map: { [k: string]: T & { children?: T[] } } = {};
    const roots = [];

    arr.forEach((item) => {
      map[item[key]] = { ...item };
    });

    arr.forEach((v) => {
      const parent = map[v[pid.key]];

      if (v[pid.key] !== pid.emptyValue && parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(v);
        return;
      }

      roots.push(v);
    });

    return roots.map((item) => map[item[key]] || item);
  }

  static formatWhereByPagination(
    filtered: { id: string; value: boolean | number | string | string[] }[],
  ) {
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (value === undefined || (Array.isArray(value) && !value.length)) {
        return;
      }
      if (Array.isArray(value) && value.length) {
        where[id] = { in: value };
        return;
      }
      where[id] = value;
    });

    return where;
  }

  static verifyPhoneNumber(phone: string) {
    return /^[1][3-9]\d{9}$/.test(phone);
  }

  /** 微信登录等场景下的临时手机号前缀，后台可一眼区分 */
  static readonly TEMP_PHONE_PREFIX = 'tmp';

  /** 生成临时手机号，例如 tmp1730000000000 */
  static createTempPhone(): string {
    return `${Utils.TEMP_PHONE_PREFIX}${Date.now()}`;
  }

  /** 是否为临时手机号（含历史纯时间戳 / tmp_ 虚拟号） */
  static isTempPhone(phone?: string | null): boolean {
    if (!phone) return true;
    const p = String(phone).trim();
    if (p.startsWith(Utils.TEMP_PHONE_PREFIX)) return true;
    // 兼容旧数据：未加前缀的时间戳虚拟号
    if (/^\d{13}$/.test(p)) return true;
    return false;
  }

  /** 是否为真实可用的大陆手机号 */
  static isRealMobilePhone(phone?: string | null): boolean {
    if (!phone || Utils.isTempPhone(phone)) return false;
    return Utils.verifyPhoneNumber(String(phone).trim());
  }
}

export default Utils;
