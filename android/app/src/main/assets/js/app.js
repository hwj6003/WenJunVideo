/* ============================================
   文俊影视 - 主应用逻辑 v2.0（真实数据）
   ============================================ */

const App = {
  tab: 'home',
  livePlatform: 'huya',
  vodCatId: '6',
  vodGroupIdx: 0,
  vodPage: 1,
  dramaMode: 'list',

  init() {
    Player.init();
    this.updateClock();
    setInterval(() => this.updateClock(), 60000);
    this.loadHome();
    this.renderLiveTabs();
    this.renderVodCats();
    window.addEventListener('popstate', () => {
      if (Player.overlay.classList.contains('active')) { Player.close(); history.pushState(null,'',location.href); }
    });
    history.pushState(null,'',location.href);
  },

  updateClock() {
    const d = new Date();
    document.getElementById('statusTime').textContent =
      String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  },

  // ========== 导航 ==========
  switchTab(tab) {
    this.tab = tab;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + tab).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('pageContainer').scrollTop = 0;
    if (tab === 'live') this.loadLiveRooms();
    if (tab === 'vod') this.loadVodList();
    if (tab === 'drama' && document.getElementById('dramaList').querySelector('.empty-state')) this.loadDramas('list');
  },

  // ========== 首页 ==========
  async loadHome() {
    const grid = document.getElementById('homeVodGrid');
    grid.innerHTML = '';
    try {
      const items = await getHomeRecommend();
      this.renderVodCards('homeVodGrid', items);
    } catch (e) {
      grid.innerHTML = '<div class="empty-state">加载失败，请检查网络</div>';
    }
  },

  // ========== VOD秒播（两级导航：分类组 + 子分类） ==========
  renderVodCats() {
    const groups = document.getElementById('vodGroups');
    const cats = document.getElementById('vodCategories');
    // 渲染一级分组Tab
    groups.innerHTML = VOD_API.groups.map((g, i) =>
      `<div class="group-tab${i === this.vodGroupIdx ? ' active' : ''}" onclick="App.selectVodGroup(${i})">${g.icon} ${g.name}</div>`
    ).join('');
    // 渲染二级分类
    this.renderSubCats();
  },

  selectVodGroup(groupIdx) {
    this.vodGroupIdx = groupIdx;
    const group = VOD_API.groups[groupIdx];
    this.vodCatId = group.cats[0].id;
    this.vodPage = 1;
    this.renderVodCats();
    this.loadVodList();
  },

  renderSubCats() {
    const cats = document.getElementById('vodCategories');
    const group = VOD_API.groups[this.vodGroupIdx];
    cats.innerHTML = group.cats.map(c =>
      `<div class="cat-tab${c.id === this.vodCatId ? ' active' : ''}" onclick="App.selectVodCat('${c.id}')">${c.icon} ${c.name}</div>`
    ).join('');
  },

  selectVodCat(catId) {
    this.vodCatId = catId;
    this.vodPage = 1;
    this.renderSubCats();
    this.loadVodList();
  },

  async loadVodList() {
    const grid = document.getElementById('vodGrid');
    grid.innerHTML = '<div class="vod-card skeleton"></div><div class="vod-card skeleton"></div><div class="vod-card skeleton"></div><div class="vod-card skeleton"></div>';
    const res = await vodGetList(this.vodCatId, this.vodPage);
    this.renderVodCards('vodGrid', res.list);
    this.renderPager(res);
  },

  /** 精准搜索：hhzyapi关键词搜索 + 短剧API */
  async searchVod() {
    const kw = document.getElementById('vodSearchInput').value.trim();
    if (!kw) { this.showToast('请输入关键词'); return; }
    const grid = document.getElementById('vodGrid');
    const pagination = document.getElementById('vodPagination');
    grid.innerHTML = '<div style="text-align:center;padding:48px;color:#a0a0b8;">🔍 正在搜索「<b>' + this._esc(kw) + '</b>」...</div>';
    pagination.innerHTML = '';

    // 并行搜索：hhzyapi VOD + 短剧API
    const [vodRes, dramaResults] = await Promise.all([
      vodSearch(kw).catch(() => ({list:[]})),
      dramaSearch(kw).catch(() => [])
    ]);

    const vodList = vodRes.list || [];
    if (vodList.length === 0 && dramaResults.length === 0) {
      grid.innerHTML = '<div class="empty-state">📭 未找到「' + this._esc(kw) + '」<br><small>试试其他关键词，或通过分类浏览</small></div>';
      return;
    }

    // 保存搜索结果用于播放
    this._searchResults = vodList;

    let html = '';
    // VOD结果
    if (vodList.length > 0) {
      html += '<div class="section-header" style="margin:4px 0 8px"><h3>🎬 影视结果 (' + vodList.length + ')</h3></div>';
      html += '<div class="vod-grid">';
      html += vodList.slice(0, 30).map(item => {
        const name = item.vod_name || '未知';
        const remark = item.vod_remarks || '';
        return `<div class="vod-card" onclick="App.playSearchResult('${item.vod_id}','${this._esc(name)}')">
          <div class="vod-poster">
            ${item.vod_pic ? `<img src="${item.vod_pic}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
            <div class="vod-emoji" style="${item.vod_pic?'display:none':'display:flex;align-items:center;justify-content:center;width:100%;height:100%'}">🎬</div>
            ${remark ? `<div class="vod-badge">${remark}</div>` : ''}
          </div>
          <div class="vod-info"><div class="vod-title">${name}</div><div class="vod-meta">${item.type_name||''}</div></div>
        </div>`;
      }).join('');
      html += '</div>';
    }
    // 短剧结果
    if (dramaResults.length > 0) {
      html += '<div class="section-header" style="margin:12px 0 8px"><h3>🎭 短剧结果 (' + dramaResults.length + ')</h3></div>';
      html += dramaResults.slice(0, 6).map(d => 
        `<div class="drama-item" onclick="App.playDrama('${this._esc(d.name||'')}','${this._esc(d.link||'')}')" style="margin-bottom:6px">
          <div class="drama-icon">🎭</div>
          <div class="drama-content"><div class="drama-name">${d.name||'未知'}</div><div class="drama-date">📥 百度网盘</div></div>
          <div class="drama-link-arrow">→</div></div>`
      ).join('');
    }

    grid.innerHTML = html;
    this.showToast(`找到 ${vodList.length + dramaResults.length} 个结果`);
  },

  /** 播放搜索结果（使用hhzyapi详情获取m3u8） */
  async playSearchResult(vodId, vodName) {
    this.showToast('正在获取播放地址...');
    const detail = await vodSearchDetail(vodId);
    if (!detail || !detail.vod_play_url) {
      this.showToast('获取播放地址失败');
      return;
    }
    // hhzyapi有两个来源：hhyun(播放器页) 和 hhm3u8(直链)，优先使用hhm3u8
    const epData = parseEpisodes(detail.vod_play_url, detail.vod_play_from);
    // 找到m3u8来源
    let m3u8Source = epData.sources.find(s => s.name.toLowerCase().includes('m3u8'));
    if (!m3u8Source) m3u8Source = epData.sources[epData.sources.length - 1] || epData.sources[0];
    if (!m3u8Source || !m3u8Source.episodes.length) {
      this.showToast('未找到可用播放链接');
      return;
    }
    if (m3u8Source.episodes.length > 1) {
      // 电视剧 → 显示剧集选择器
      this._currentEpData = { sources: [m3u8Source], hasMultiple: true };
      this.showEpisodePicker(vodName, this._currentEpData);
    } else {
      Player.play({ title: vodName, url: m3u8Source.episodes[0].url, type: 'm3u8' });
    }
  },

  changeVodPage(page) {
    this.vodPage = page;
    this.loadVodList();
    document.getElementById('pageContainer').scrollTop = 0;
  },

  async playVod(vodId, vodName) {
    this.showToast('正在获取播放地址...');
    const detail = await vodGetDetail(vodId);
    if (!detail || !detail.vod_play_url) {
      this.showToast('获取播放地址失败');
      return;
    }
    
    const epData = parseEpisodes(detail.vod_play_url, detail.vod_play_from);
    if (!epData.sources.length || !epData.sources[0].episodes.length) {
      this.showToast('未找到可用播放链接');
      return;
    }

    if (epData.hasMultiple) {
      // 多集内容 → 显示剧集选择器
      this.showEpisodePicker(vodName, epData);
    } else {
      // 单集内容 → 直接播放
      const ep = epData.sources[0].episodes[0];
      Player.play({ title: vodName, url: ep.url, type: 'm3u8' });
    }
  },

  /** 显示剧集选择器 */
  showEpisodePicker(vodName, epData) {
    const picker = document.getElementById('episodePicker');
    const title = document.getElementById('epPickerTitle');
    const grid = document.getElementById('epGrid');
    const sourceTabs = document.getElementById('epSourceTabs');
    
    title.textContent = vodName;
    
    // 渲染来源Tab（如果多来源）
    const hasMultiSource = epData.sources.length > 1;
    sourceTabs.style.display = hasMultiSource ? 'flex' : 'none';
    if (hasMultiSource) {
      sourceTabs.innerHTML = epData.sources.map((s, i) =>
        `<div class="ep-source-tab${i === 0 ? ' active' : ''}" onclick="App.switchEpSource(${i})">${s.name}</div>`
      ).join('');
    }
    
    // 渲染剧集列表
    this._currentEpData = epData;
    this._currentEpSource = 0;
    this._renderEpisodes(0);
    
    picker.classList.add('active');
  },

  _renderEpisodes(sourceIdx) {
    const grid = document.getElementById('epGrid');
    const source = this._currentEpData.sources[sourceIdx];
    if (!source) return;
    
    grid.innerHTML = source.episodes.map((ep, i) =>
      `<div class="ep-item" onclick="App.playEpisode(${sourceIdx}, ${i})">
        <div class="ep-num">${ep.label.replace('第','').replace('集','')}</div>
      </div>`
    ).join('');
    
    // 更新来源Tab
    const tabs = document.querySelectorAll('#epSourceTabs .ep-source-tab');
    tabs.forEach((t, i) => t.classList.toggle('active', i === sourceIdx));
  },

  switchEpSource(idx) {
    this._currentEpSource = idx;
    this._renderEpisodes(idx);
  },

  playEpisode(sourceIdx, epIdx) {
    const ep = this._currentEpData.sources[sourceIdx].episodes[epIdx];
    document.getElementById('episodePicker').classList.remove('active');
    Player.play({ title: document.getElementById('epPickerTitle').textContent + ' ' + ep.label, url: ep.url, type: 'm3u8' });
  },

  closeEpisodePicker() {
    document.getElementById('episodePicker').classList.remove('active');
  },

  renderVodCards(containerId, items) {
    const grid = document.getElementById(containerId);
    if (!items || !items.length) { grid.innerHTML = '<div class="empty-state">暂无内容，换个分类试试</div>'; return; }
    grid.innerHTML = items.map((item, i) => {
      const name = item.vod_name || '未知';
      const remark = item.vod_remarks || '';
      const pic = item.vod_pic || '';
      return `<div class="vod-card" onclick="App.playVod('${item.vod_id}','${this._esc(name)}')">
        <div class="vod-poster">
          ${pic ? `<img src="${pic}" alt="${name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
          <div class="vod-emoji" style="${pic?'display:none':'display:flex;align-items:center;justify-content:center;width:100%;height:100%'}">🎬</div>
          ${remark ? `<div class="vod-badge">${remark}</div>` : ''}
        </div>
        <div class="vod-info"><div class="vod-title">${name}</div></div>
      </div>`;
    }).join('');
  },

  renderPager(res) {
    const pg = document.getElementById('vodPagination');
    const p = res.page, pc = res.pagecount;
    pg.innerHTML = `
      <button ${p <= 1 ? 'disabled' : ''} onclick="App.changeVodPage(${p - 1})">‹ 上一页</button>
      <span>${p} / ${pc} 页 (${res.total}部)</span>
      <button ${p >= pc ? 'disabled' : ''} onclick="App.changeVodPage(${p + 1})">下一页 ›</button>`;
  },

  // ========== 直播 ==========
  renderLiveTabs() {
    document.getElementById('livePlatformTabs').innerHTML = LIVE_PLATFORMS.map(p =>
      `<div class="live-platform-tab${p.key === this.livePlatform ? ' active' : ''}" onclick="App.selectLive('${p.key}')">${p.icon} ${p.name}</div>`
    ).join('');
  },

  selectLive(platform) {
    this.livePlatform = platform;
    this.renderLiveTabs();
    this.loadLiveRooms();
  },

  loadLiveRooms() {
    const grid = document.getElementById('liveRoomGrid');
    const rooms = getLiveRooms(this.livePlatform);
    if (!rooms.length) { grid.innerHTML = '<div class="empty-state">暂无直播数据</div>'; return; }
    const p = LIVE_PLATFORMS.find(pl => pl.key === this.livePlatform);
    grid.innerHTML = rooms.map(r => `<div class="live-room-card" onclick="App.playLive('${this.livePlatform}','${r.roomId}','${this._esc(r.name)}')">
      <div class="live-preview"><span style="font-size:40px">${p.icon}</span><div class="live-status">● LIVE</div></div>
      <div class="live-info"><div class="live-name">${r.name}</div><div class="live-owner">${r.owner} · ${r.viewers}</div></div>
    </div>`).join('');
  },

  playLive(platform, roomId, name) {
    const url = getLiveRoomUrl(platform, roomId);
    if (url) Player.play({ title: name, url, type: 'live' });
  },

  // ========== 短剧 ==========
  async loadDramas(mode) {
    this.dramaMode = mode;
    document.querySelectorAll('.drama-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && mode === 'list') || (i === 1 && mode === 'today')));
    const list = document.getElementById('dramaList');
    list.innerHTML = '<div class="empty-state">⏳ 加载中...</div>';
    try {
      const dramas = await dramaGetList(mode);
      if (!dramas || !dramas.length) { list.innerHTML = '<div class="empty-state">📭 暂无短剧<br><small>尝试搜索或刷新</small></div>'; return; }
      list.innerHTML = dramas.map(d => `<div class="drama-item" onclick="App.playDrama('${this._esc(d.name||'未知')}','${this._esc(d.link||'')}')">
        <div class="drama-icon">🎭</div>
        <div class="drama-content"><div class="drama-name">${d.name||'未知'}</div><div class="drama-date">📅 ${d.time||''} ${d.remarks||''}</div></div>
        <div class="drama-link-arrow">📥</div></div>`).join('');
      this.showToast(`加载了 ${dramas.length} 部短剧`);
    } catch (e) {
      list.innerHTML = '<div class="empty-state">❌ 加载失败<br><small>请检查网络后重试</small></div>';
    }
  },

  async searchDrama() {
    const kw = document.getElementById('dramaSearchInput').value.trim();
    if (!kw) { this.showToast('请输入短剧名称'); return; }
    const list = document.getElementById('dramaList');
    list.innerHTML = '<div class="empty-state">🔍 搜索中...</div>';
    try {
      const dramas = await dramaSearch(kw);
      if (!dramas || !dramas.length) { list.innerHTML = '<div class="empty-state">📭 未找到相关短剧<br><small>试试其他关键词</small></div>'; return; }
      list.innerHTML = dramas.map(d => `<div class="drama-item" onclick="App.playDrama('${this._esc(d.name||'未知')}','${this._esc(d.link||'')}')">
        <div class="drama-icon">🎭</div>
        <div class="drama-content"><div class="drama-name">${d.name||'未知'}</div><div class="drama-date">📅 ${d.time||''}</div></div>
        <div class="drama-link-arrow">📥</div></div>`).join('');
      this.showToast(`找到 ${dramas.length} 个结果`);
    } catch (e) {
      list.innerHTML = '<div class="empty-state">❌ 搜索失败</div>';
    }
  },

  playDrama(name, link) {
    if (link) { Player.play({ title: name, url: link, type: 'drama' }); }
    else { this.showToast('暂无播放链接'); }
  },

  // ========== 工具 ==========
  showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 2200);
  },

  _esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
};

// 全局函数
function switchTab(t) { App.switchTab(t); }
function closePlayer() { Player.close(); }
function searchVod() { App.searchVod(); }
function searchDrama() { App.searchDrama(); }
function loadDramas(m) { App.loadDramas(m); }

document.addEventListener('DOMContentLoaded', () => App.init());
