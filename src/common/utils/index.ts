class Utils {
  static formatIp(ip: string) {
    const ipPrefix = '::ffff:';
    return ip.indexOf(ipPrefix) === 0 ? ip.slice(ipPrefix.length) : ip;
  }
}

export default Utils;
