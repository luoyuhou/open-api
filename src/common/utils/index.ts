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
}

export default Utils;
