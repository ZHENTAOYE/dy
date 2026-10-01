# 宇宙 · THE UNIVERSE

一部用 [Remotion](https://www.remotion.dev/) 纯代码绘制的宇宙科普短片。没有任何素材图片或视频：所有画面都由 WebGL 着色器、粒子系统和 SVG 实时生成。

- 竖屏 1080×1920（抖音），约 2 分 58 秒（5350 帧 @ 30fps）
- 另有横屏 1920×1080 版本 `UniverseLandscape`（同一套代码自适应，尚未逐帧检查）

## 片段结构

| # | 场景 | 文件 | 画面 |
|---|------|------|------|
| 0 | 序章 | `src/scenes/Intro.tsx` | 星空 → 粒子汇聚成「宇宙」标题 + 冲击波 |
| 1 | 地球 | `src/scenes/Earth.tsx` | 轨道日出 → 地球全貌（城市灯光）→ 光 1 秒绕地球 7.5 圈 → 地月光速 1.3 秒 |
| 2 | 太阳 | `src/scenes/Sun.tsx` | 强光逼近 → 沸腾的日面 + 地球凌日对比 → 俯冲日面边缘 → 日冕物质抛射 |
| 3 | 太阳系 | `src/scenes/Solar.tsx` | 行星轨道延时 → 小行星带 / 柯伊伯带 → 奥尔特云 + 旅行者 1 号 |
| 4 | 恒星 | `src/scenes/Stars.tsx` | 恒星大小对比（太阳 → 史蒂文森 2-18，叠加土星轨道）→ 超新星爆发 |
| 5 | 黑洞 | `src/scenes/BlackHole.tsx` | 光线追踪引力透镜黑洞 → EHT 2019 照片风格 → 坠入视界 |
| 6 | 银河系 | `src/scenes/MilkyWay.tsx` | 从银心拉出 → 旋臂与尘埃带 →「你在这里」→ 仙女座星系 |
| 7 | 宇宙网 | `src/scenes/CosmicWeb.tsx` | 宇宙大尺度纤维结构穿梭 → 时间倒流、坍缩成一点 |
| 8 | 大爆炸 | `src/scenes/BigBang.tsx` | 奇点 → 火球与光芒 → 宇宙微波背景 → 第一代恒星点亮 → 曲速 |
| 9 | 尾声 | `src/scenes/Finale.tsx` | 曲速减速 → 回到地球日出 → 卡尔·萨根名言 → 片尾 |

## 代码结构

- `src/timing.ts` — **唯一的时间轴来源**：每个场景的时长、交叉淡入帧数、关键事件帧（爆炸、冲击等）。音轨生成器也读取它。
- `src/script.ts` — 全部中文文案。字体会按这里出现的字预加载。
- `src/Video.tsx` — 总合成：按时间轴拼接场景、转场闪白、左侧「尺度」标尺 HUD、背景音轨（`public/soundtrack.wav` 存在时自动加入）。
- `src/lib/ShaderLayer.tsx` — 全屏片元着色器图层（WebGL2）。
- `src/lib/ParticleLayer.tsx` — 实例化粒子渲染器：支持运动拖尾、相机运动模糊、HDR + ACES 色调映射、减法混合（尘埃带）。
- `src/lib/galaxy.ts` — 程序化旋涡星系生成（银河系 / 仙女座共用）。
- `src/shaders/` — 地球、太阳、恒星、超新星、黑洞、大爆炸、星云着色器。
- `src/components/` — 文字动画（`Text.tsx`）、星空、曲速星场、闪光 / 震动 / 暗角、尺度 HUD。

## 本地运行

需要 Node.js 18+。

```bash
npm install
npm run studio            # 打开 Remotion Studio 实时预览（浏览器）
npm run render            # 渲染竖屏成片 -> out/universe.mp4
npm run render:landscape  # 渲染横屏版本 -> out/universe-16x9.mp4
npm run typecheck
```

渲染时 WebGL 默认使用软件渲染（`swangle`），任何机器都能跑但较慢。有独立显卡 / Apple Silicon 的电脑可以用 GPU 加速：

```bash
REMOTION_GL=angle npm run render
```

如果 GPU 模式下画面发黑，换回默认的 `swangle` 即可。

快速出预览图（单次打包，多帧拼成一张联系表 `out/sheet-<id>.jpg`）：

```bash
npm run preview -- Universe 300,1500,3000,4200 0.4
npm run preview -- BlackHole 120,390,500 0.4     # 每个场景也单独注册成了合成，方便调试
```

## 当前进度与待办

- [x] 10 个场景全部完成并逐一调过画面
- [x] 总合成、交叉淡入、转场闪白、尺度 HUD
- [ ] **音轨**：计划用 Python（numpy + scipy）合成原创配乐，与 `src/timing.ts` 里的 `EVENTS` 对齐（序章标题冲击、日冕抛射、超新星、黑洞点亮、时间倒流前的静默、大爆炸主冲击、恒星点亮的钟声、尾声和弦）。`npm run timeline` 会把时间轴导出到 `out/timeline.json` 供脚本读取；生成结果放到 `public/soundtrack.wav`，`Video.tsx` 会自动挂上。
- [ ] 渲染完整成片并整体复看节奏（尤其是场景之间的衔接）
- [ ] 逐帧检查横屏 `UniverseLandscape` 的构图
- [ ] 可选：配音 / 字幕文件
