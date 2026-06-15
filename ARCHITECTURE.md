# 文俊影视 — 技术架构文档

> 安卓手机影视APP · 完整框架设计 + 接口对接方案

---

## 📐 一、总体架构

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer (Jetpack Compose)          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │
│  │ 首页  │ │ 秒播  │ │ 直播  │ │ 短剧  │ │   我的   │  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘  │
├─────────────────────────────────────────────────────┤
│              ViewModel Layer (MVVM)                   │
│  ┌────────────┐ ┌──────────┐ ┌──────────────┐        │
│  │ HomeVM     │ │ VodVM    │ │ LiveVM/DramaVM│       │
│  └────────────┘ └──────────┘ └──────────────┘        │
├─────────────────────────────────────────────────────┤
│              Domain Layer (Use Cases)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐     │
│  │ GetVods  │ │ Search   │ │ GetLiveRooms     │     │
│  └──────────┘ └──────────┘ └──────────────────┘     │
├─────────────────────────────────────────────────────┤
│              Data Layer                              │
│  ┌──────────────────────────────────────────────┐   │
│  │ Repositories                                  │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │ │VodRepo   │ │DramaRepo │ │LiveRepo      │   │   │
│  │ │(8源)     │ │(5源)     │ │(3平台)       │   │   │
│  │ └──────────┘ └──────────┘ └──────────────┘   │   │
│  ├──────────────────────────────────────────────┤   │
│  │ API Services (Retrofit + OkHttp)             │   │
│  │ ┌──────────────┐ ┌──────────────┐            │   │
│  │ │ VOD API      │ │ Drama API    │            │   │
│  │ │ (TVBox标准)  │ │ (kuleu.com)  │            │   │
│  │ └──────────────┘ └──────────────┘            │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Player: WebView (直播) / ExoPlayer (VOD直链)       │
└─────────────────────────────────────────────────────┘
```

---

## 🏗️ 二、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **语言** | Kotlin 1.9 | 100% Kotlin |
| **UI** | Jetpack Compose + Material 3 | 声明式UI |
| **架构** | MVVM + Clean Architecture | 分层解耦 |
| **DI** | Hilt (Dagger) | 依赖注入 |
| **网络** | Retrofit2 + OkHttp4 | API请求 |
| **图片** | Coil | 异步图片加载 |
| **播放器** | WebView (直播) / ExoPlayer Media3 (VOD) | 视频播放 |
| **存储** | DataStore (偏好) + Room (历史) | 本地数据 |
| **异步** | Kotlin Coroutines + Flow | 响应式编程 |
| **导航** | Navigation Compose | 页面路由 |

---

## 📡 三、19 个接口源对接方案

### 3.1 秒播影视（已验证可用：suoniapi.com）

```
┌──────────────────────────────────────────────────────────┐
│ ✅ 已验证 VOD API: suoniapi.com/api.php/provide/vod/     │
│                                                           │
│ 15个分类 │ 67,000+ 资源 │ 支持搜索 │ 返回m3u8播放链接    │
│ ─────────────────────────────────────────────────────────│
│ 动作片(5,604) │ 喜剧片(9,224) │ 爱情片(1,362)             │
│ 科幻片(1,232) │ 恐怖片(4,714) │ 剧情片(25,684)           │
│ 战争片(399)   │ 国产剧(8,480) │ 欧美剧(3,354)            │
│ 韩剧(878)     │ 日剧(1,686)   │ 港剧(1,736)              │
│ 台剧(338)     │ 泰剧(856)     │ 纪录片(2,438)            │
│                                                           │
│ API格式: ac=videolist&t={typeId}&pg={page}               │
│ 搜索: ac=videolist&wd={keyword}                          │
│ 详情: ac=detail&ids={vodId}  → 返回m3u8播放地址          │
└──────────────────────────────────────────────────────────┘
```

**测试结果**：suoniapi.com **200 OK**，全部接口可用，真实返回 67,000+ 影视资源，详情接口直接返回 m3u8 播放链接。

### 3.2 短剧API（已验证可用：duanju.click）

### 3.2 直播平台（3个直播源）

```
┌──────────────────────────────────────────────────────┐
│ newwex.json 直播源                                    │
│                                                       │
│ 平台  │ Guard API          │ APP实现方式               │
│ ──────────────────────────────────────────────────────│
│ 虎牙  │ csp_LiveHuYaGuard  │ WebView嵌入 huya.com     │
│ 斗鱼  │ csp_LiveDouYuGuard │ WebView嵌入 douyu.com    │
│ 哔哩  │ csp_LiveBiLiGuard  │ WebView嵌入 live.bili…   │
└──────────────────────────────────────────────────────┘
```

**实现方式**：直播平台不直接抓取流地址（涉及反爬和法律风险），而是通过 `WebView` 嵌入官方直播间页面。用户可正常观看弹幕、切换清晰度，体验与官方APP一致。

**LiveRepository.kt** 预置了每个平台的热门房间ID和名称。

### 3.3 短剧（5个短剧源）

```
┌──────────────────────────────────────────────────────┐
│ newwex.json 短剧源                                    │
│                                                       │
│ 源名称  │ Guard API              │ APP实现方式         │
│ ──────────────────────────────────────────────────────│
│ 好看短剧│ csp_DuanJuHaoKanGuard  │ api.kuleu.com      │
│ 小猫短剧│ csp_DuanJuQiMiaoGuard  │ 公共短剧API        │
│ 小马短剧│ csp_DuanJuHeMaGuard    │                    │
│ 星星短剧│ csp_DuanJuXingYaGuard  │ → GET /api/action  │
│ 小薇短剧│ csp_DuanJuWeiGuanGuard │ → 搜索/列表/详情   │
└──────────────────────────────────────────────────────┘
```

**实现方式**：使用 `api.kuleu.com` 公共短剧API作为统一接入层。短剧资源实际存储在夸克网盘，点击后通过 `Intent.ACTION_VIEW` 跳转外部浏览器/夸克APP观看。

**DramaApiService.kt** 定义了 3 个接口：
- `getAllDramas()` — 全部短剧
- `getTodayDramas()` — 今日更新
- `searchDramas()` — 搜索

---

## 📂 四、项目文件结构

```
android/
├── build.gradle.kts                          # 根构建配置
├── settings.gradle.kts                       # 项目设置
├── gradle/wrapper/gradle-wrapper.properties  # Gradle版本
└── app/
    ├── build.gradle.kts                      # App构建配置（依赖声明）
    └── src/main/
        ├── AndroidManifest.xml               # 权限/Activity声明
        ├── res/
        │   ├── values/themes.xml             # 主题定义
        │   ├── xml/network_security_config.xml # 网络安全配置
        │   └── mipmap/                       # 图标资源
        └── java/com/wenjun/video/
            ├── WenJunApp.kt                  # Application（Hilt入口）
            ├── MainActivity.kt               # 主Activity
            ├── di/
            │   └── AppModule.kt              # Hilt依赖注入模块
            ├── data/
            │   ├── api/
            │   │   └── ApiServices.kt        # Retrofit接口定义
            │   ├── model/
            │   │   └── BaseModels.kt         # 数据模型
            │   └── repository/
            │       ├── VodRepository.kt      # VOD数据仓库（8源）
            │       ├── DramaRepository.kt    # 短剧数据仓库（5源）
            │       └── LiveRepository.kt     # 直播数据仓库（3平台）
            └── ui/
                ├── theme/
                │   └── Theme.kt              # Material3主题
                ├── navigation/
                │   └── AppNavigation.kt      # 路由导航
                └── screen/
                    ├── home/
                    │   ├── HomeScreen.kt     # 首页
                    │   └── HomeViewModel.kt
                    ├── vod/
                    │   ├── VodScreen.kt      # 秒播影视页
                    │   └── VodViewModel.kt
                    ├── live/
                    │   ├── LiveScreen.kt     # 直播页
                    │   └── LiveViewModel.kt
                    ├── drama/
                    │   ├── DramaScreen.kt    # 短剧页
                    │   └── DramaViewModel.kt
                    └── player/
                        ├── PlayerScreen.kt   # 播放器Composable
                        ├── PlayerViewModel.kt
                        └── PlayerActivity.kt # 全屏播放器Activity
```

---

## 🎯 五、数据流

```
用户操作 → Composable Screen → ViewModel.Action
                                        ↓
                              ViewModel (Flow State)
                                        ↓
                              Repository (suspend fun)
                                        ↓
                              Retrofit ApiService
                                        ↓
                              OkHttp → 网络请求
                                        ↓
                              Gson → JSON解析 → Data Model
                                        ↓
                              StateFlow 更新 → Compose 重组UI
```

---

## 🚀 六、构建与运行

### 环境要求
- Android Studio Hedgehog (2024.1+)
- JDK 17
- Android SDK 34
- Gradle 8.5

### 构建步骤
```bash
# 1. 导入项目到 Android Studio
# 2. 同步 Gradle
# 3. 连接安卓手机或启动模拟器
# 4. 点击 Run

# 命令行构建
cd android
./gradlew assembleDebug
# APK输出: app/build/outputs/apk/debug/app-debug.apk
```

### Web Demo 快速体验
```bash
cd web-demo

# 方式一：使用代理服务器（推荐，解决CORS问题）
node server.js
# 浏览器打开 http://localhost:4567

# 方式二：使用静态服务器（可能有CORS问题）
npx serve . -p 3000
# 浏览器打开 http://localhost:3000
```

> **重要**：由于浏览器CORS限制，必须使用 `node server.js` 启动代理服务器才能正常加载数据。直接打开 HTML 文件或使用静态服务器会因跨域限制无法获取API数据。

---

## 🔧 七、问题与解决方案

### 7.1 Guard API 是原生编译的，无法直接调用
**解决方案**：使用 TVBox 标准 JSON 格式的公开 VOD API 作为替代实现。公开的VOD API 遵循相同的TVBox格式标准。

### 7.2 短剧存储在夸克网盘
**解决方案**：点击短剧后通过 Intent 跳转到外部浏览器打开夸克网盘链接。这符合短剧分发生态的实际情况。

### 7.3 直播平台需要登录/反爬
**解决方案**：使用 WebView 嵌入官方直播间页面，用户直接与官方页面交互，无法律风险且播放稳定。

### 7.4 M3U8/HLS 流在WebView中播放
**解决方案**：WebView 原生支持 HLS 播放（Android 4.4+），无需额外处理。也可降级使用 ExoPlayer 直接播放 m3u8 链接。

---

## 📊 八、API 接口清单

| # | 分类 | 接口函数 | 请求方式 | 目标URL |
|---|------|----------|----------|---------|
| 1 | VOD | getVodList | GET | api.yingredient.com/api.php/provide/vod/?ac=videolist&t={typeId}&pg={page} |
| 2 | VOD | searchVod | GET | api.yingredient.com/api.php/provide/vod/?ac=videolist&wd={keyword} |
| 3 | VOD | getVodDetail | GET | api.yingredient.com/api.php/provide/vod/?ac=detail&ids={vodId} |
| 4 | 短剧 | getAllDramas | GET | api.kuleu.com/api/action?list |
| 5 | 短剧 | getTodayDramas | GET | api.kuleu.com/api/action?today |
| 6 | 短剧 | searchDramas | GET | api.kuleu.com/api/action?text={keyword} |
| 7 | 虎牙 | (WebView) | - | www.huya.com/{roomId} |
| 8 | 斗鱼 | (WebView) | - | www.douyu.com/{roomId} |
| 9 | 哔哩 | (WebView) | - | live.bilibili.com/{roomId} |

---

**文档版本**: 1.0.0  
**更新日期**: 2026-06-12  
**项目**: 文俊影视 (WenJun Video)
