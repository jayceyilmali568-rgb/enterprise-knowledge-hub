# 🧠 智汇中枢 · Enterprise Knowledge Hub

> 企业知识大脑：资料进来，知识出来。让每个部门都能看懂整个公司的核心日程、核心资料与核心业务。

![Node.js](https://img.shields.io/badge/后端-Node.js%20%2B%20Express-green) ![LLM](https://img.shields.io/badge/AI-DeepSeek%20LLM%20%2B%20RAG-blue) ![双形态](https://img.shields.io/badge/形态-全栈版%20%2F%20静态演示版-orange)

## ✨ 在线体验（静态演示版）

**https://jayceyilmali568-rgb.github.io/enterprise-knowledge-hub/**

> 纯静态托管于 GitHub Pages，打开即可用。首次访问自带示例企业数据（6 个部门、9 份资料、8 条日程）。
> ⚠️ 该演示版为免部署形态，AI 回答走内置规则引擎；**完整的大模型（DeepSeek + RAG）版本在本仓库的 `server.js` + `lib/rag-service.js` 中**，本地启动即可体验。

## 📖 系统定位

**智汇中枢**是一套面向企业内部的 AI 知识管理平台，解决三大核心问题：

1. **资料碎片化** — 各部门资料散落各处、格式不一、难以检索
2. **信息孤岛** — 部门之间不了解彼此的业务、文档与日程
3. **知识沉淀难** — 经验与知识只存在员工脑中，无法沉淀为组织资产

**核心流程**：上传资料 → AI 自动加工（分类 / 提关键词 / 摘要 / 部门推荐 / 建关联）→ 全员可检索、可问答、可看全局图谱。

## 🧬 双形态架构

同一套产品逻辑与 AI 引擎接口契约，提供两种运行形态，按部署条件自由切换：

| 维度 | 全栈版（本仓库主代码） | 静态演示版（GitHub Pages） |
|------|----------------------|--------------------------|
| 运行 | `server.js`（Node.js + Express） | 纯静态 `index.html` + `css/` + `js/` |
| AI 回答 | **DeepSeek 大模型生成 + RAG 检索**（可降级规则引擎） | 内置规则引擎 |
| 存储 | 本地 JSON 文件 + `uploads/`（可挂载持久盘） | 浏览器 localStorage |
| 适合 | 企业内网私有化、多人共用、简历核心演示 | 零部署秒级试用、数据不出浏览器 |

## 🚀 核心功能

| 模块 | 能力 |
|------|------|
| 📊 总览仪表盘 | 全公司数据一屏总览：文档/日程/部门统计、紧急事项提醒 |
| 📁 智能文档中心 | 拖拽上传 / 文本录入；多格式解析；AI 自动分类、关键词、摘要、重要性评分；自动挂靠部门并建立文档关联；「AI 深度摘要」一键生成 |
| 🤖 AI 知识助手 | 基于企业知识库的智能问答，**大模型生成式回答 + 逐句来源标注**，支持多轮对话与快捷提问 |
| 📅 核心日程看板 | 公司级日程统一管理（会议/截止/活动/评审），优先级标注，按部门筛选 |
| 🏢 部门信息中枢 | 部门全景卡片（负责人/规模/职责/关键指标），自动聚合该部门的文档与日程 |
| 🕸️ 知识图谱 | 力导向图可视化「部门 ↔ 文档 ↔ 文档」关联，节点大小反映重要性，点击直达详情 |
| 🔍 全局搜索 | 一次搜索同时命中文档、日程、部门，相关度排序 + 关键词高亮 |

## 🤖 LLM + RAG 实现（核心亮点）

完整版采用 **检索增强生成（RAG）** 架构，链路如下：

```
用户提问
   │
   ▼
① 召回层   意图识别（日程/部门/文档/总览）
           文档粗筛：n-gram 关键词加权评分（稀疏检索，效果类 BM25）
           段落精排：正文按 320 字滑动窗口切段 → 段级打分取 Top-K
           日程/部门类问题附加结构化企业信息
   │
   ▼
② 生成层   检索段落 + 问题 → 组装 Prompt → DeepSeek chat completions
           回答逐句标注 [来源：《文档标题》]
   │
   ▼
③ 兜底层   未配置 API key 或调用失败 → 自动降级内置规则引擎（永不白屏）
```

- **召回**：`lib/ai-engine.js` 中文 n-gram（2~4 字）+ 停用词/粘着词过滤 + 领域词表加权 + 子串去重，段级精排
- **生成**：`lib/rag-service.js` 封装 DeepSeek `chat/completions`（原生 fetch，零新增依赖），支持 `deepseek-chat`
- **降级**：响应携带 `engine: "llm" | "rule"` 字段，前端无感切换
- **可演进**：接口契约固定，召回层可无缝替换为 Embedding 向量检索，生成层可对接企业私有本地 LLM

## 🏗️ 技术架构（全栈版）

```
enterprise-knowledge-hub/
├── server.js              # Express 后端（API + 静态资源 + 双引擎路由）
├── lib/
│   ├── ai-engine.js       # 规则 AI 引擎：分类/关键词/摘要/部门推荐/问答
│   ├── rag-service.js     # LLM+RAG 服务：DeepSeek 调用/段落检索/Prompt 组装
│   └── seed.js            # 示例数据（EKH_AUTOSEED=1 首启自动种子）
├── public/                # 全栈版前端（7 大功能模块）
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── index.html             # 静态演示版入口（GitHub Pages 直接托管）
├── css/  js/              # 静态演示版资源（浏览器端 LocalAPI + AI 引擎）
├── data/                  # 运行时数据（JSON + uploads，不入库）
├── Dockerfile             # 云托管容器化配置
└── package.json           # 依赖（express / multer）
```

## ⚙️ 环境变量

| 变量 | 作用 | 默认 |
|------|------|------|
| `PORT` | 服务端口 | `3000` |
| `DEEPSEEK_API_KEY` | 配置后自动启用 LLM + RAG（否则规则引擎） | 无 |
| `DEEPSEEK_MODEL` | 模型名 | `deepseek-chat` |
| `EKH_DATA_DIR` | 数据目录（云托管挂载持久盘时指向 `/mnt` 等） | `./data` |
| `EKH_AUTOSEED` | `1` 时文档库为空首启自动写入 9 份示例资料 | 无 |

## 🚀 快速开始

**方式 A：全栈版（体验大模型 + RAG）**

```bash
npm install
# Linux / macOS
DEEPSEEK_API_KEY=sk-xxx node server.js
# Windows PowerShell
$env:DEEPSEEK_API_KEY="sk-xxx"; node server.js
```

访问 http://localhost:3000 ，向 AI 助手提问，即可看到 DeepSeek 生成式回答与来源标注。
首次启动可加 `EKH_AUTOSEED=1` 自动生成示例企业数据（6 部门 / 9 资料 / 8 日程）。

**方式 B：静态演示版（零部署）**

```bash
npx serve cloud        # 或 python -m http.server 8080 指向 cloud/
```

## ☁️ 云端部署

仓库内置 `Dockerfile`，适用于腾讯云 CloudBase 云托管等容器平台：

1. 上传本仓库代码包（或从 Git 拉取）自动构建；
2. 设置环境变量 `DEEPSEEK_API_KEY`、`EKH_AUTOSEED=1`、`PORT=3000`；
3. 将云存储（COS/CFS）挂载至数据目录（`EKH_DATA_DIR` 指向挂载点），实现重启不丢数据。

## 💾 数据与备份

- 全栈版：数据落于 `data/`（`documents.json` / `schedules.json` / `departments.json` / `chat-history.json` + `uploads/`），直接拷贝目录即备份
- 演示版：浏览器 localStorage，侧边栏「导出数据 / 导入数据」一键 JSON 备份迁移

## 🔐 数据安全与隐私

- ✅ API key 只存在于服务端环境变量，**永不进入前端代码**（仓库代码无任何硬编码密钥）
- ✅ 无 key 时自动降级本地规则引擎，敏感数据可不出企业内网
- ✅ 生成层可对接企业私有化本地 LLM，全链路私有部署
- ⚙️ 演示版无后端、无第三方统计，数据不出浏览器

## 📄 License

仅供学习交流与内部试用。示例数据均为虚构，不涉及真实企业信息。
