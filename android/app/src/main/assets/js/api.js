/* ============================================
   文俊影视 - 真实API接口层 (已验证可用)
   VOD: suoniapi.com | 短剧: duanju.click | 直播: WebView嵌入
   ============================================ */

// ========== 检测运行环境 ==========
function getApiBase() {
  if (window.location.port === '4567' || window.location.hostname === 'localhost') {
    return { vod: '/api/vod/', drama: '/api/drama' };
  }
  // file:// (WebView) 或 公网
  return { vod: 'https://suoniapi.com/api.php/provide/vod/', drama: 'https://www.duanju.click/api/short/baidu' };
}

// ========== VOD源（已验证可用） ==========
const VOD_API = {
  baseUrl: getApiBase().vod,
  // 26个已验证分类，按组组织
  groups: [
    { name: '电影', icon: '🎬', cats: [
      { id: '6',  name: '动作片',   icon: '💥', total: 5604 },
      { id: '7',  name: '喜剧片',   icon: '😂', total: 9224 },
      { id: '8',  name: '爱情片',   icon: '💕', total: 1362 },
      { id: '9',  name: '科幻片',   icon: '🚀', total: 1232 },
      { id: '10', name: '恐怖片',   icon: '👻', total: 4714 },
      { id: '11', name: '剧情片',   icon: '🎭', total: 25684 },
      { id: '12', name: '战争片',   icon: '⚔️', total: 399 }
    ]},
    { name: '电视剧', icon: '📺', cats: [
      { id: '13', name: '国产剧',   icon: '🇨🇳', total: 8480 },
      { id: '14', name: '欧美剧',   icon: '🌍', total: 3354 },
      { id: '15', name: '韩剧',     icon: '🇰🇷', total: 878 },
      { id: '16', name: '日剧',     icon: '🇯🇵', total: 1686 },
      { id: '17', name: '港剧',     icon: '🇭🇰', total: 1736 },
      { id: '18', name: '台剧',     icon: '🇹🇼', total: 338 },
      { id: '19', name: '泰剧',     icon: '🇹🇭', total: 856 },
      { id: '23', name: '海外剧',   icon: '🌏', total: 159 }
    ]},
    { name: '综艺', icon: '🎪', cats: [
      { id: '25', name: '大陆综艺', icon: '🎤', total: 2609 },
      { id: '26', name: '日韩综艺', icon: '🎌', total: 359 },
      { id: '27', name: '港台综艺', icon: '🎯', total: 175 },
      { id: '28', name: '欧美综艺', icon: '🎬', total: 477 }
    ]},
    { name: '动漫', icon: '🤡', cats: [
      { id: '29', name: '国产动漫', icon: '🐉', total: 1616 },
      { id: '30', name: '日韩动漫', icon: '🍥', total: 4417 },
      { id: '31', name: '欧美动漫', icon: '🦸', total: 1042 }
    ]},
    { name: '纪录', icon: '📹', cats: [
      { id: '20', name: '纪录片',   icon: '🎬', total: 2438 }
    ]}
  ],
  // 扁平分类列表（兼容旧代码）
  get allCats() {
    let flat = [];
    this.groups.forEach(g => flat.push(...g.cats));
    return flat;
  },
  totalItems: 77336
};

// ========== 短剧API（已验证可用） ==========
const DRAMA_API = {
  getBaseUrl() { return getApiBase().drama; },
  quarkUrl: getApiBase().drama,
  baiduUrl: getApiBase().drama
};

// ========== 直播平台（WebView嵌入官方页面） ==========
const LIVE_PLATFORMS = [
  { key: 'huya',     name: '虎牙直播', icon: '🐯', url: 'https://www.huya.com',    rooms: [
    { roomId:'11352824',name:'热门推荐',owner:'虎牙直播',viewers:'10万+'},
    { roomId:'11342412',name:'LOL专区',owner:'英雄联盟',viewers:'8万+'},
    { roomId:'660000',  name:'王者荣耀',owner:'王者专区',viewers:'15万+'},
    { roomId:'880201',  name:'和平精英',owner:'吃鸡专区',viewers:'5万+'},
    { roomId:'517407',  name:'颜值星秀',owner:'娱乐专区',viewers:'20万+'},
    { roomId:'880205',  name:'户外直播',owner:'户外专区',viewers:'12万+'}
  ]},
  { key: 'douyu',    name: '斗鱼直播', icon: '🐳', url: 'https://www.douyu.com',   rooms: [
    { roomId:'9999',  name:'热门推荐',owner:'斗鱼直播',viewers:'15万+'},
    { roomId:'288016',name:'LOL赛事',owner:'英雄联盟',viewers:'20万+'},
    { roomId:'606118',name:'王者荣耀',owner:'王者荣耀',viewers:'10万+'},
    { roomId:'88660', name:'CSGO专区',owner:'CS:GO',viewers:'8万+'},
    { roomId:'100',   name:'颜值区',owner:'星秀',viewers:'25万+'},
    { roomId:'74751', name:'主机游戏',owner:'主机区',viewers:'6万+'}
  ]},
  { key: 'bilibili', name: '哔哩直播', icon: '🅱️', url: 'https://live.bilibili.com', rooms: [
    { roomId:'3',       name:'B站热门',owner:'bilibili',viewers:'30万+'},
    { roomId:'21652717',name:'原神直播',owner:'原神',viewers:'15万+'},
    { roomId:'6',       name:'LOL专区',owner:'英雄联盟',viewers:'10万+'},
    { roomId:'5440',    name:'虚拟主播',owner:'VUP',viewers:'20万+'},
    { roomId:'240',     name:'单机游戏',owner:'游戏区',viewers:'8万+'},
    { roomId:'7734200', name:'王者荣耀',owner:'王者',viewers:'12万+'}
  ]}
];

// ========== 通用API请求 ==========
async function apiFetch(url, timeout = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    clearTimeout(timer);
    console.error('API Error:', e.message, url.slice(0,80));
    return null;
  }
}

// ========== VOD API 函数 ==========
async function vodGetList(categoryId, page = 1) {
  const url = `${VOD_API.baseUrl}?ac=videolist&t=${categoryId}&pg=${page}`;
  const data = await apiFetch(url);
  if (data && data.code === 1) {
    return { list: data.list || [], page: parseInt(data.page) || 1, pagecount: parseInt(data.pagecount) || 1, total: parseInt(data.total) || 0 };
  }
  return { list: [], page: 1, pagecount: 1, total: 0 };
}

async function vodSearch(keyword, page = 1) {
  // 使用 hhzyapi 搜索（支持关键词 + 返回m3u8播放链接）
  const searchBase = getApiBase().vod.includes('/api/vod/') ? '/api/search/' : 'https://hhzyapi.com/api.php/provide/vod/';
  const url = `${searchBase}?ac=videolist&wd=${encodeURIComponent(keyword)}&pg=${page}`;
  const data = await apiFetch(url);
  if (data && data.code === 1) {
    return { list: data.list || [], page: parseInt(data.page) || 1, pagecount: parseInt(data.pagecount) || 1, total: parseInt(data.total) || 0 };
  }
  return { list: [], page: 1, pagecount: 1, total: 0 };
}

/** 获取搜索结果的详情和播放地址（使用hhzyapi，返回m3u8直链） */
async function vodSearchDetail(vodId) {
  const searchBase = getApiBase().vod.includes('/api/vod/') ? '/api/search/' : 'https://hhzyapi.com/api.php/provide/vod/';
  const url = `${searchBase}?ac=detail&ids=${vodId}`;
  const data = await apiFetch(url);
  if (data && data.code === 1 && data.list && data.list.length > 0) {
    return data.list[0];
  }
  return null;
}

async function vodGetDetail(vodId) {
  const url = `${VOD_API.baseUrl}?ac=detail&ids=${vodId}`;
  const data = await apiFetch(url);
  if (data && data.code === 1 && data.list && data.list.length > 0) {
    return data.list[0];
  }
  return null;
}

/** 解析vod_play_url获取所有剧集 */
function parseEpisodes(vodPlayUrl, vodPlayFrom) {
  if (!vodPlayUrl) return { sources: [], hasMultiple: false };
  const sourceNames = (vodPlayFrom || '默认源').split('$$$').filter(Boolean);
  const sourceBlocks = vodPlayUrl.split('$$$').filter(Boolean);
  
  const sources = [];
  let totalEpisodes = 0;
  
  sourceBlocks.forEach((block, si) => {
    const episodes = [];
    const eps = block.split('#').filter(Boolean);
    eps.forEach(ep => {
      const parts = ep.split('$');
      if (parts.length >= 2) {
        episodes.push({ label: parts[0].trim(), url: parts[1].trim() });
        totalEpisodes++;
      } else if (parts[0].startsWith('http')) {
        episodes.push({ label: '正片', url: parts[0].trim() });
        totalEpisodes++;
      }
    });
    if (episodes.length > 0) {
      sources.push({ name: sourceNames[si] || ('源' + (si + 1)), episodes });
    }
  });
  
  return { sources, hasMultiple: totalEpisodes > 1, totalEpisodes };
}

// ========== 短剧API函数 ==========
async function dramaGetList(type = 'list') {
  const url = `${DRAMA_API.baiduUrl}?${type}`;
  const data = await apiFetch(url);
  if (data && data.code === 200 && data.data) {
    return data.data;
  }
  return [];
}

async function dramaSearch(keyword) {
  const url = `${DRAMA_API.baiduUrl}?text=${encodeURIComponent(keyword)}`;
  const data = await apiFetch(url);
  if (data && data.code === 200 && data.data) {
    return data.data;
  }
  return [];
}

// ========== 直播辅助函数 ==========
function getLiveRoomUrl(platform, roomId) {
  const p = LIVE_PLATFORMS.find(pl => pl.key === platform);
  if (!p) return '';
  if (platform === 'huya') return `https://www.huya.com/${roomId}`;
  if (platform === 'douyu') return `https://www.douyu.com/${roomId}`;
  if (platform === 'bilibili') return `https://live.bilibili.com/${roomId}`;
  return '';
}

function getLiveRooms(platform) {
  const p = LIVE_PLATFORMS.find(pl => pl.key === platform);
  return p ? p.rooms : [];
}

// ========== 首页推荐 ==========
async function getHomeRecommend() {
  const data = await vodGetList('6', 1);
  return data.list.slice(0, 12);
}
