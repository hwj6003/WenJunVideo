/* ============================================
   文俊影视 - 播放器模块 v2.0
   支持：iframe直播 / m3u8直链 / 外部链接跳转
   ============================================ */

const Player = {
  overlay: null,
  container: null,
  titleEl: null,
  currentSource: null,

  init() {
    this.overlay = document.getElementById('playerOverlay');
    this.container = document.getElementById('playerContainer');
    this.titleEl = document.getElementById('playerTitle');
    document.getElementById('playerBackBtn').addEventListener('click', () => this.close());
  },

  /** 播放视频 */
  play(options) {
    this.currentSource = options;
    this.overlay.classList.add('active');
    this.titleEl.textContent = options.title || '播放中';
    this.container.innerHTML = '';

    if (options.type === 'live') {
      this._playLiveEmbed(options);
    } else if (options.type === 'm3u8' || options.type === 'video') {
      this._playVideoJs(options);
    } else if (options.type === 'drama') {
      this._playDramaLink(options);
    } else {
      this._playWebEmbed(options);
    }
  },

  /** 使用videojs播放m3u8/直链视频 */
  _playVideoJs(options) {
    const videoId = 'wjplayer_' + Date.now();
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%;height:100%;position:relative;background:#000;';
    wrapper.innerHTML = `
      <video id="${videoId}" class="video-js vjs-big-play-centered" controls autoplay playsinline
        style="width:100%;height:100%;object-fit:contain;" preload="auto">
        <p class="vjs-no-js">请使用现代浏览器播放视频</p>
      </video>`;
    this.container.appendChild(wrapper);

    // 尝试加载video.js CDN
    const playerInit = () => {
      if (typeof videojs !== 'undefined') {
        const player = videojs(videoId, {
          controls: true, autoplay: true, preload: 'auto',
          fluid: true, aspectRatio: '16:9',
          playbackRates: [0.5, 1, 1.25, 1.5, 2],
          html5: { hls: { overrideNative: true } }
        });
        player.src({ src: options.url, type: options.type === 'm3u8' ? 'application/x-mpegURL' : 'video/mp4' });
        player.ready(() => player.play().catch(() => {}));
        player.on('error', () => {
          wrapper.innerHTML = `<div style="color:#fff;text-align:center;padding-top:40px;">
            <div style="font-size:48px;">😞</div>
            <p style="margin-top:16px;">播放失败，正在尝试备用方案...</p>
            <button onclick="window.open('${options.url}','_blank')" 
              style="margin-top:12px;background:#6c5ce7;color:#fff;border:none;padding:10px 24px;border-radius:20px;font-size:14px;cursor:pointer;">
              在浏览器中打开</button></div>`;
        });
      } else {
        // 降级：使用原生video标签
        wrapper.innerHTML = `<video controls autoplay playsinline style="width:100%;height:100%;object-fit:contain;">
          <source src="${options.url}" type="${options.type === 'm3u8' ? 'application/x-mpegURL' : 'video/mp4'}">
          <div style="color:#fff;text-align:center;padding-top:40px;">
            <div style="font-size:48px;">😞</div>
            <p style="margin-top:16px;">您的浏览器不支持直接播放</p>
            <button onclick="window.open('${options.url}','_blank')"
              style="margin-top:12px;background:#6c5ce7;color:#fff;border:none;padding:10px 24px;border-radius:20px;font-size:14px;cursor:pointer;">
              在外部播放器打开</button></div>`;
      }
    };

    // 动态加载video.js
    if (typeof videojs === 'undefined') {
      const link = document.createElement('link');
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video-js.min.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video.min.js';
      script.onload = playerInit;
      script.onerror = () => {
        wrapper.innerHTML = `<video controls autoplay playsinline style="width:100%;height:100%;object-fit:contain;">
          <source src="${options.url}" type="application/x-mpegURL">
          您的浏览器不支持播放此视频<br>
          <a href="${options.url}" target="_blank" style="color:#a29bfe;">点击在外部播放器打开</a></video>`;
      };
      document.head.appendChild(script);
    } else {
      playerInit();
    }
  },

  /** 直播iframe嵌入 */
  _playLiveEmbed(options) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%;height:100%;position:relative;';
    const loading = document.createElement('div');
    loading.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;color:#888;font-size:16px;';
    loading.textContent = '📺 正在连接直播...';
    wrapper.appendChild(loading);

    const iframe = document.createElement('iframe');
    iframe.src = options.url;
    iframe.allow = 'autoplay; fullscreen; encrypted-media';
    iframe.style.cssText = 'width:100%;height:100%;border:none;position:relative;z-index:2;';
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.onload = () => { loading.style.display = 'none'; };
    iframe.onerror = () => { loading.textContent = '❌ 直播加载失败，请重试'; };
    wrapper.appendChild(iframe);
    this.container.appendChild(wrapper);
  },

  /** 短剧链接 */
  _playDramaLink(options) {
    this.container.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;color:#fff;">
      <div style="font-size:64px;margin-bottom:16px;">🎭</div>
      <div style="font-size:18px;font-weight:600;margin-bottom:8px;">${options.title || '短剧资源'}</div>
      <div style="font-size:14px;color:#a0a0b8;margin-bottom:24px;">短剧资源存储在百度网盘，点击下方按钮打开</div>
      <button onclick="window.open('${options.url}','_blank')"
        style="background:linear-gradient(135deg,#ffa502,#ff6348);color:#fff;border:none;padding:14px 40px;border-radius:30px;font-size:16px;font-weight:700;cursor:pointer;">
        📥 打开百度网盘观看</button>
      <div style="font-size:12px;color:#6c6c8a;margin-top:16px;">提取码通常在链接中已包含</div></div>`;
  },

  /** 网页嵌入 */
  _playWebEmbed(options) {
    const iframe = document.createElement('iframe');
    iframe.src = options.url;
    iframe.allow = 'autoplay; fullscreen';
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    iframe.setAttribute('allowfullscreen', 'true');
    this.container.appendChild(iframe);
  },

  /** 关闭 */
  close() {
    this.overlay.classList.remove('active');
    this.container.innerHTML = '';
    this.currentSource = null;
  }
};
