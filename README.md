# 量子纠错 · 科普动画（Remotion）

一条约 **1 分 53 秒** 的竖屏（1080×1920，30fps）抖音科普短片，主题是 **量子纠错（Quantum Error Correction）**。

所有画面都是用 React/SVG **纯代码绘制**的，没有任何图片或视频素材。配乐和音效也由脚本**程序化合成**，同样没有用到音频素材。

## 内容结构

| # | 场景 | 时长 | 视觉看点 |
|---|------|------|----------|
| 1 | 开场 | 7s | 量子比特能量球被噪声闪电击碎 → 黑场 → “量子纠错”标题砸出：冲击波、粒子爆发、旋转神光 |
| 2 | 量子比特 | 12s | 3D 布洛赫球：经典比特在两极翻转，量子比特在球面自由漫游（带拖尾），引出叠加态公式 |
| 3 | 噪声与退相干 | 14s | 热噪声/电磁干扰/宇宙射线/材料缺陷轮番轰炸，态矢量缩短（退相干）；比特翻转 X 与相位翻转 Z；错误率差距“百万倍以上” |
| 4 | 经典纠错 | 9s | 0 → 000 复制，闪电劈翻中间位，多数投票纠正 |
| 5 | 三道难关 | 11s | 不可克隆 / 测量坍缩 / 连续错误，三张卡片带震屏依次砸入 |
| 6 | 量子纠错的妙招 | 19s | CNOT 编码电路 → α\|000⟩+β\|111⟩；奇偶校验“哨兵”报警、查表定位、精准修复；测量把连续误差“掐”成离散 |
| 7 | 表面码 | 16s | 3D 透视的旋转表面码（d=5）：稳定子测量、错误链两端报警、解码器连线修复；d=3/5/7 码距对比 |
| 8 | 阈值定理 | 15s | 对数坐标逻辑/物理错误率曲线交于阈值；2024 年谷歌 Willow 实验数据（Λ = 2.14，d=7 每轮 0.143%） |
| 9 | 结尾 | 10s | 成百上千个物理比特螺旋汇聚成一个带六边形护盾的逻辑比特，片尾标题 |

## 快速开始

```bash
npm install
npm run dev        # 打开 Remotion Studio 实时预览/调整
npm run render     # 渲染成片 → out/quantum-error-correction.mp4
npx remotion still Cover out/cover.png   # 导出抖音封面
```

如果要渲染不带音效的纯画面版本（方便自己配音、配乐）：

```bash
npx remotion render QuantumErrorCorrection out/silent.mp4 --props='{"sfx":false}'
```

## 目录

```
src/
  Root.tsx            组合注册（视频 + 封面）
  QECVideo.tsx        主时间轴：背景、场景、转场闪白、胶片颗粒
  scenes.json         各场景时长（视频和音效脚本共用）
  timeline.ts         场景顺序与配色
  scenes/S1~S9        九个场景
  components/
    BlochSphere.tsx   3D 布洛赫球（正交投影、前后半球虚实区分）
    Lattice.tsx       旋转表面码格子（d×d 数据比特 + d²−1 稳定子）
    fx.tsx            发光线条、能量球、闪电、冲击波、粒子爆发、神光、故障条纹
    text.tsx          故障文字、逐字弹出字幕、章节标签
    Background.tsx    深空背景 + 量子点阵波纹 + 星尘
    Overlay.tsx       胶片颗粒、扫描线、暗角
scripts/
  fetch-fonts.mjs     从 Google Fonts 下载“只含用到的字”的子集字体 → public/fonts
  make-sfx.mjs        纯 JS 合成配乐与音效 → public/audio/soundtrack.mp3
```

## 修改文案或节奏后

- **改了字幕/文字**：运行 `node scripts/fetch-fonts.mjs` 重新生成字体子集，新加的汉字才能正确显示。如果需要走代理，加上 `NODE_USE_ENV_PROXY=1`。
- **改了场景时长或动画时间点**：运行 `node scripts/make-sfx.mjs` 重新合成音效。脚本里的 `CUES` 和各场景文件中的帧常量一一对应，改动时要同步修改。

## 字体

- Noto Sans SC / Noto Sans Math / Orbitron，均为 SIL Open Font License，以子集形式放在 `public/fonts/`

## 科学内容说明

- 物理比特错误率约 10⁻³ 指当前最好的超导/离子阱两比特门水平（约千分之一）。实用算法（如大数分解）需要数十亿次逻辑操作，因此对逻辑错误率的要求在 10⁻⁹ 以下。
- 阈值图中的曲线是示意，采用 P_L ∝ (p/p_th)^((d+1)/2)，阈值取约 1%，与表面码的常见估计一致。
- Willow 数据出自 Google Quantum AI，*Quantum error correction below the surface code threshold*，Nature 2024：码距每增加 2，逻辑错误率降低 Λ = 2.14 倍；d=7 时每轮纠错的逻辑错误率为 0.143%；逻辑比特寿命是最好物理比特的 2.4 倍。
