# Link Timer - 链接定时器

<div align="center">

**一个智能的 Chrome 浏览器扩展，帮助您管理和定时访问重要的网页链接**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://github.com/yourusername/link-timer-chrome-extensions)
[![Version](https://img.shields.io/badge/version-1.5.1-green.svg)](https://github.com/yourusername/link-timer-chrome-extensions/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

</div>

---

## 简介

Link Timer 是一个基于 Chrome Extension Manifest V3 开发的浏览器扩展，专为需要定时访问特定网页的用户设计。无论是每日必看的新闻网站、定期检查的工作平台，还是需要定时打开的在线工具，Link Timer 都能帮您自动化这些重复性操作。

## 核心功能

### 🕐 智能定时打开
- **灵活的时间设置** - 精确到分钟的定时控制
- **一次性/重复任务** - 支持单次执行或每日自动重复
- **桌面通知提醒** - 确保您不会错过任何重要链接
- **自动关闭标签** - 可选的自动关闭功能，支持自定义延迟时间

### 🔗 便捷链接管理
- **右键快速添加** - 在任何网页上右键点击链接即可添加
- **完整管理界面** - 支持增删改查等全方位操作
- **智能搜索** - 快速定位目标链接
- **分组整理** - 按类别组织和管理链接
- **导入导出** - 轻松备份和迁移配置数据

### ⚙️ 用户友好体验
- **简洁直观的界面** - 清晰的视觉设计，易于上手
- **快速访问弹窗** - 点击扩展图标即可快速添加链接
- **完整选项页面** - 集中管理所有链接和设置
- **智能信息填充** - 自动获取链接标题，减少手动输入

## 快速开始

### 📦 安装方式

#### 方法一：从 Release 安装（推荐）

1. 访问 [Release 页面](https://github.com/yourusername/link-timer-chrome-extensions/releases) 下载最新版本
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 开启右上角的 **开发者模式**
4. 将下载的 `link-timer.zip` 文件直接拖入浏览器窗口

#### 方法二：开发者模式安装

```bash
# 克隆项目
git clone https://github.com/yourusername/link-timer-chrome-extensions.git
cd link-timer-chrome-extensions
```

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择项目文件夹

## 使用指南

### 🎯 添加定时链接

**方式一：右键菜单添加**
1. 在任何网页中找到目标链接
2. 右键点击链接 → 选择 **"添加到定时链接管理器"**
3. 设置打开时间、重复选项等参数
4. 点击 **保存配置**

**方式二：扩展弹窗添加**
1. 点击浏览器工具栏中的 Link Timer 图标
2. 在弹窗中输入链接信息
3. 配置定时参数后保存

### 📋 管理链接

1. 点击扩展图标 → **管理所有链接** 进入管理页面
2. 在管理界面可以：
   - ✏️ 编辑链接信息和定时设置
   - 🗑️ 删除不需要的链接
   - 🔍 搜索特定链接
   - 📁 使用分组功能整理链接
   - 💾 导入/导出配置进行备份

### ⏱️ 自动关闭标签页

1. 添加或编辑链接时，勾选 **"自动关闭"** 选项
2. 设置延迟时间（默认 10 秒）
3. 链接打开后将在指定时间后自动关闭


## 技术架构

### 核心技术栈

| 技术 | 说明 |
|------|------|
| **Chrome Extension Manifest V3** | 使用最新的 Chrome 扩展 API 标准 |
| **Storage API** | 本地存储链接数据和配置 |
| **Alarms API** | 精确的定时任务调度 |
| **Notifications API** | 桌面通知提醒 |
| **Context Menus API** | 右键菜单集成 |
| **Tabs API** | 标签页管理和自动关闭 |

### 项目结构

```
link-timer-chrome-extensions/
├── background.js      # Service Worker - 核心业务逻辑
├── popup.html/js      # 扩展弹窗 - 快速添加界面
├── options.html/js    # 选项页面 - 完整管理界面
├── manifest.json      # 扩展配置文件
└── icons/             # 扩展图标资源
```

### 权限说明

| 权限 | 用途 |
|------|------|
| `contextMenus` | 创建右键菜单项 |
| `storage` | 存储链接数据和用户配置 |
| `alarms` | 设置和管理定时任务 |
| `notifications` | 显示桌面通知 |
| `tabs` | 管理浏览器标签页（自动关闭功能） |

## 开发指南

### 代码规范
- 使用现代 JavaScript (ES6+)
- 遵循 Chrome Extension Manifest V3 规范
- 采用模块化设计思想
- 注重代码可读性和可维护性

### 本地开发

```bash
# 克隆项目
git clone https://github.com/yourusername/link-timer-chrome-extensions.git
cd link-timer-chrome-extensions

# 在 Chrome 中加载扩展
# 1. 打开 chrome://extensions/
# 2. 开启开发者模式
# 3. 点击"加载已解压的扩展程序"
# 4. 选择项目目录
```

## 常见问题

<details>
<summary><b>如何修改默认打开时间？</b></summary>

在添加或编辑链接时，可以自定义打开时间。默认时间为当前时间加 2 分钟。
</details>

<details>
<summary><b>定时任务没有触发怎么办？</b></summary>

1. 确保已开启"自动定时"选项
2. 检查系统通知权限是否已授予
3. 确认 Chrome 浏览器在后台运行
</details>

<details>
<summary><b>如何备份我的链接数据？</b></summary>

在管理页面点击"导出配置"按钮，将配置保存为 JSON 文件。需要恢复时使用"导入配置"功能。
</details>

<details>
<summary><b>扩展图标不显示怎么办？</b></summary>

确保 `icons/` 目录中的图标文件存在且格式正确。如果问题持续，尝试重新加载扩展。
</details>

## 更新日志

### 🎉 v1.5.1 (2025-10-19)
- 🐛 **修复** 每天重复任务指数级增长的严重 BUG
- 🐛 **修复** 彻底解决链接重复打开问题
- ✨ **优化** 将 Alarm 开关名称改为"自动定时"，更加直观

### 🚀 v1.4.0 (2025-09-28)
- ✨ **新增** 链接自动关闭选项，支持自定义延迟时间
- ✨ **新增** 分组管理功能，支持按组分类链接
- ✨ **新增** 导入导出配置功能，方便数据备份和迁移
- 🎨 **优化** 链接打开逻辑，支持自动关闭标签页
- 🎨 **优化** 添加分组建议和自动补全功能
- 🎨 **改进** 链接列表展示，按分组和时间排序
- 📝 **更新** 上下文菜单标题和版本号

### 🎊 v1.0.0 (2025-09-22)
- 🎉 初始版本发布
- ✨ 实现基本的链接定时打开功能
- ✨ 支持一次性打开和每日重复打开
- ✨ 提供完整的链接管理界面

---

## 贡献指南

欢迎参与 Link Timer 的开发和改进！

### 如何贡献

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 报告问题

如果您发现 Bug 或有功能建议，请在 [Issues](https://github.com/yourusername/link-timer-chrome-extensions/issues) 页面提交。

## 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](LICENSE) 文件。

## 联系方式

- 项目主页：[GitHub Repository](https://github.com/yourusername/link-timer-chrome-extensions)
- 问题反馈：[Issues](https://github.com/yourusername/link-timer-chrome-extensions/issues)

---

<div align="center">

**如果这个项目对您有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by Link Timer Team

</div>
