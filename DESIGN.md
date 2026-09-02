---
version: alpha
name: Yuzheng Digital Research Desk
description: A premium academic evidence design system that combines editorial clarity with restrained digital depth.
colors:
  primary: "#202B5B"
  on-primary: "#FFFFFF"
  primary-container: "#E9ECF8"
  on-primary-container: "#182148"
  secondary: "#9A6A1F"
  on-secondary: "#FFFFFF"
  secondary-container: "#F7EBCF"
  on-secondary-container: "#4A3210"
  background: "#F5F1E8"
  on-background: "#191816"
  surface: "#FFFDF8"
  on-surface: "#211F1B"
  surface-muted: "#EEE9DF"
  on-surface-muted: "#625E56"
  outline: "#D6CEC0"
  success: "#246B55"
  on-success: "#FFFFFF"
  warning: "#8C5311"
  on-warning: "#FFFFFF"
  error: "#A43D3D"
  on-error: "#FFFFFF"
  glass: "#FFFDFA"
typography:
  display-xl:
    fontFamily: Noto Serif SC, Songti SC, SimSun, serif
    fontSize: "4.5rem"
    fontWeight: 700
    lineHeight: 1.16
    letterSpacing: -0.02em
  heading-lg:
    fontFamily: Noto Serif SC, Songti SC, SimSun, serif
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.01em
  heading-md:
    fontFamily: Noto Serif SC, Songti SC, SimSun, serif
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.35
  title-sm:
    fontFamily: Inter, PingFang SC, Microsoft YaHei, sans-serif
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.5
  body-md:
    fontFamily: Inter, PingFang SC, Microsoft YaHei, sans-serif
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.7
  body-sm:
    fontFamily: Inter, PingFang SC, Microsoft YaHei, sans-serif
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Inter, PingFang SC, Microsoft YaHei, sans-serif
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
  "3xl": "48px"
  "4xl": "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    height: "44px"
  navigation-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "36px"
  source-row-selected:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "12px"
  metadata-chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  evidence-anchor:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  home-primary-action:
    backgroundColor: "{colors.on-background}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
    height: "52px"
  research-desk:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "28px"
  research-evidence-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "28px"
  analysis-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-dock:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "12px 14px"
    height: "64px"
  error-banner:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

## Overview

语证采用“数字研究台”语言：保留纸张的温度、档案的秩序与出版物的可信感，再加入克制的玻璃层次、柔光和证据路径。界面首先服务于阅读、核验和回到来源，不以技术能力或装饰性面板填满页面。

## Colors

暖象牙色是全站基底，深墨色保证长文可读；深靛蓝承担品牌、选中和主要操作，暖金色只标记证据与引用。成功、警告和错误色只表达状态，不参与品牌装饰。

## Typography

中文标题使用宋体风格营造学术出版感，正文和控件使用中性无衬线体。首页主标题可在桌面端达到 72px，但必须保持短句、明确换行和足够留白；长文单行建议不超过 65 个汉字视觉宽度，正文保持 14–16px，行高不低于 1.55。

## Layout

桌面端优先使用完整横向空间。首页采用约 42% 文案区与 58% 数字研究台的非对称布局，首屏只突出“进入工作区”一个主要动作和“了解证据原则”一个辅助动作；原则区使用同一平面上的分栏和细分隔线，不使用三张独立卡片。证据问答采用约 280–320px 左侧资料架与弹性右侧工作区，右侧底部固定输入栏；移动端改为资料选择抽屉和单列卡片。页面以 8px 基准网格组织，主要区块间距 24–32px。

## Elevation & Depth

默认依赖间距、分组和细分隔线。首页数字研究台允许使用多层半透明纸张与证据卡，但必须保持明显的前后关系，不能形成卡片嵌套噪声。玻璃效果仅用于研究台、导航活动项、被选中的资料、悬停卡片、全屏详情和底部输入栏；模糊与透明度必须轻微。卡片默认浅影，悬停最多放大至 1.015–1.02，并伴随靛蓝轮廓和柔和跟随光泽。鼠标光泽只响应局部位置，不追踪光标跨越整个页面。

## Shapes

核心内容卡片使用 18px 圆角，按钮和输入使用 12px，标签使用胶囊圆角。不要把所有信息都装进卡片；普通列表以行分隔组织。

## Components

首页研究台展示最近完成分析的真实工作台与证据卡：工作台、结论、来源资料、页码及原文入口必须来自当前用户的有效记录。最多轮播三个不同工作台，每项停留二十秒，以克制的透明度、景深和位移渐变切换；鼠标悬停或键盘聚焦时暂停。没有有效证据时显示真实空状态或最近工作台入口，不使用演示数据，不渲染不可点击的“查看原文”。资料行必须显示类型、标题和处理状态，并支持清晰多选；勾选只形成待确认范围，左侧固定确认按钮才提交选择。确认一份资料时右侧自动显示内容摘要、关键观点、原文依据、信息不足与歧义四张卡；确认两份或以上时进入自定义分析需求流程。问题卡展示分析需求、回答预览、证据数量、来源数量和时间；处理中卡片保留位置并使用克制边缘流光。四部分分析始终显示固定标题，缺失部分使用明确空结果文案；点击卡片全屏展开，悬停总结显示远处逐渐淡化的真实原文上下文。

## Do's and Don'ts

应让证据比装饰更醒目；应支持键盘焦点与减少动效；应让每条可核验结论回到原文。不要使用提示词、Prompt 等技术语言；不要大面积强玻璃、炫目渐变、聊天气泡、嵌套卡片或虚构证据；不要在客户端代码中暴露服务端密钥。
