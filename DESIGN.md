---
version: alpha
name: Yuzheng Academic Reading Room
description: A modern academic archive design system for traceable evidence workflows.
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
    fontSize: "3rem"
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

语证采用‘现代学术阅览室’语言：纸张的温度、档案的秩序和数字工具的轻盈。界面首先服务于阅读、核验和回到来源，不以技术能力或装饰性面板填满页面。

## Colors

暖象牙色是全站基底，深墨色保证长文可读；深靛蓝承担品牌、选中和主要操作，暖金色只标记证据与引用。成功、警告和错误色只表达状态，不参与品牌装饰。

## Typography

中文标题使用宋体风格营造学术出版感，正文和控件使用中性无衬线体。长文单行建议不超过 65 个汉字视觉宽度；正文保持 14–16px，行高不低于 1.55。

## Layout

桌面端优先使用完整横向空间。证据问答采用约 280–320px 左侧资料架与弹性右侧工作区，右侧底部固定输入栏；移动端改为资料选择抽屉和单列卡片。页面以 8px 基准网格组织，主要区块间距 24–32px。

## Elevation & Depth

默认依赖间距、分组和细分隔线。玻璃效果仅用于导航活动项、被选中的资料、悬停卡片、全屏详情和底部输入栏；模糊与透明度必须轻微。卡片默认浅影，悬停最多放大至 1.015–1.02，并伴随靛蓝轮廓和柔和跟随光泽。

## Shapes

核心内容卡片使用 18px 圆角，按钮和输入使用 12px，标签使用胶囊圆角。不要把所有信息都装进卡片；普通列表以行分隔组织。

## Components

资料行必须显示类型、标题和处理状态，并支持清晰多选。问题卡展示分析需求、回答预览、证据数量、来源数量和时间；处理中卡片保留位置并使用克制边缘流光。四部分分析始终显示固定标题，缺失部分使用明确空结果文案。

## Do's and Don'ts

应让证据比装饰更醒目；应支持键盘焦点与减少动效；应让每条可核验结论回到原文。不要使用提示词、Prompt 等技术语言；不要大面积强玻璃、炫目渐变、聊天气泡、嵌套卡片或虚构证据；不要在客户端代码中暴露服务端密钥。
