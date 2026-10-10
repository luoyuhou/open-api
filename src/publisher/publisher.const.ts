/** 一键发文平台默认目录（seed / fallback；运行时以 DB 为准） */
export const PUBLISHER_PLATFORMS = [
  {
    id: 'wechat',
    name: '微信公众号',
    color: '#07C160',
    loginUrl: 'https://mp.weixin.qq.com/',
    hint: '在电脑浏览器登录公众号后台，或在 ALQQ 中扫码绑定微信公众号。',
    sort: 10,
  },
  {
    id: 'toutiao',
    name: '今日头条',
    color: '#FF1E10',
    loginUrl: 'https://mp.toutiao.com/',
    hint: '在电脑浏览器登录头条号，或在 ALQQ 桌面端扫码授权。',
    sort: 20,
  },
  {
    id: 'baijiahao',
    name: '百度百家号',
    color: '#2932E1',
    loginUrl: 'https://baijiahao.baidu.com/',
    hint: '在电脑浏览器登录百家号，或在 ALQQ 中完成授权。',
    sort: 30,
  },
  {
    id: 'zhihu',
    name: '知乎',
    color: '#0066FF',
    loginUrl: 'https://www.zhihu.com/',
    hint: '在电脑浏览器登录知乎创作者账号，或在 ALQQ 中扫码绑定。',
    sort: 40,
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    color: '#FF2442',
    loginUrl: 'https://creator.xiaohongshu.com/',
    hint: '在电脑浏览器登录小红书创作者中心，或在 ALQQ 中授权。',
    sort: 50,
  },
  {
    id: 'douyin',
    name: '抖音',
    color: '#111111',
    loginUrl: 'https://creator.douyin.com/',
    hint: '在电脑浏览器登录抖音创作者中心，或在 ALQQ 桌面端授权。',
    sort: 60,
  },
  {
    id: 'qiehao',
    name: '企鹅号',
    color: '#12B7F5',
    loginUrl: 'https://om.qq.com/',
    hint: '在 ALQQ 中扫码绑定企鹅号。',
    sort: 70,
  },
  {
    id: 'bilibili',
    name: '哔哩哔哩',
    color: '#FB7299',
    loginUrl: 'https://member.bilibili.com/',
    hint: '在 ALQQ 中扫码绑定哔哩哔哩。',
    sort: 80,
  },
  {
    id: 'kuaishou',
    name: '快手',
    color: '#FF4906',
    loginUrl: 'https://cp.kuaishou.com/',
    hint: '在 ALQQ 中扫码绑定快手。',
    sort: 90,
  },
  {
    id: 'shipinhao',
    name: '视频号',
    color: '#FA9D3B',
    loginUrl: 'https://channels.weixin.qq.com/',
    hint: '在 ALQQ 中扫码绑定视频号。',
    sort: 100,
  },
  {
    id: 'guanghe',
    name: '淘宝光合',
    color: '#FF5000',
    loginUrl: 'https://www.guanghe.taobao.com/',
    hint: '在 ALQQ 中绑定淘宝光合账号。',
    sort: 110,
  },
  {
    id: 'sohu',
    name: '搜狐号',
    color: '#FFCC00',
    loginUrl: 'https://mp.sohu.com/',
    hint: '在 ALQQ 中扫码绑定搜狐号。',
    sort: 120,
  },
  {
    id: 'dayu',
    name: '大鱼号',
    color: '#FF6A00',
    loginUrl: 'https://mp.dayu.com/',
    hint: '在 ALQQ 中扫码绑定大鱼号。',
    sort: 130,
  },
  {
    id: 'kuaichuan',
    name: '快传号',
    color: '#00A4FF',
    loginUrl: 'https://www.kuaichuan.com/',
    hint: '在 ALQQ 中绑定快传号。',
    sort: 140,
  },
  {
    id: 'weibo',
    name: '微博',
    color: '#E6162D',
    loginUrl: 'https://weibo.com/',
    hint: '在 ALQQ 中扫码绑定微博。',
    sort: 150,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E4405F',
    loginUrl: 'https://www.instagram.com/',
    hint: '在 ALQQ 桌面端绑定 Instagram。',
    sort: 160,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    loginUrl: 'https://www.facebook.com/',
    hint: '在 ALQQ 桌面端绑定 Facebook。',
    sort: 170,
  },
  {
    id: 'douban',
    name: '豆瓣',
    color: '#007722',
    loginUrl: 'https://www.douban.com/',
    hint: '在 ALQQ 中绑定豆瓣账号。',
    sort: 180,
  },
  {
    id: 'csdn',
    name: 'CSDN',
    color: '#FC5531',
    loginUrl: 'https://mp.csdn.net/',
    hint: '在 ALQQ 中绑定 CSDN。',
    sort: 190,
  },
  {
    id: 'jianshu',
    name: '简书',
    color: '#EA6F5A',
    loginUrl: 'https://www.jianshu.com/',
    hint: '在 ALQQ 中绑定简书。',
    sort: 200,
  },
  {
    id: 'pbootcms',
    name: 'PbootCMS 站点',
    color: '#2F54EB',
    loginUrl: '',
    hint: '在 ALQQ 账号管理中配对 PbootCMS 站点。',
    sort: 210,
  },
  {
    id: 'innoshop',
    name: 'InnoShop 站点',
    color: '#13C2C2',
    loginUrl: '',
    hint: '在 ALQQ 账号管理中配对 InnoShop 站点。',
    sort: 220,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    loginUrl: 'https://studio.youtube.com/',
    hint: '仅支持视频发布；文章一键发文默认下线。',
    sort: 900,
    enabled: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#010101',
    loginUrl: 'https://www.tiktok.com/',
    hint: '仅支持视频发布；文章一键发文默认下线。',
    sort: 910,
    enabled: false,
  },
] as const;

export type PublisherPlatformSeed = {
  id: string;
  name: string;
  color: string;
  loginUrl: string;
  hint: string;
  sort: number;
  enabled?: boolean;
};

export type PublisherPlatformId = typeof PUBLISHER_PLATFORMS[number]['id'];

/** 单张封面/插图上限 */
export const PUBLISHER_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** 单篇文章最多引用的图片数（封面+正文） */
export const PUBLISHER_MAX_IMAGES_PER_ARTICLE = 20;

/** 每用户一键发文图片默认配额（MB），可被环境变量覆盖 */
export const PUBLISHER_DEFAULT_USER_QUOTA_MB = 50;

/** 未更新的草稿超过该天数后清理图片并删除草稿 */
export const PUBLISHER_DRAFT_EXPIRE_DAYS = 30;

/** 全部平台成功后，图片再保留的小时数 */
export const PUBLISHER_PUBLISH_GRACE_HOURS_SUCCESS = 6;

/** 存在失败平台时，给重试留的小时数；到期后不论成败都清理 */
export const PUBLISHER_PUBLISH_GRACE_HOURS_RETRY = 24;

/** 上传后未挂到任何文章的孤儿图，超过该小时数可回收（编辑中频繁换图的兜底） */
export const PUBLISHER_ORPHAN_HOURS = 2;

export const PUBLISHER_FILE_SOURCE = 'publisher';
