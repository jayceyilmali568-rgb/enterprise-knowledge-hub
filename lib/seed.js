/**
 * 种子数据脚本 - 预置示例企业资料
 * Run: node lib/seed.js   （或 EKH_AUTOSEED=1 时由 server.js 首启自动调用）
 */
const path = require('path');
const fs = require('fs');
const AIEngine = require('./ai-engine');

const DATA_DIR = process.env.EKH_DATA_DIR || path.join(__dirname, '..', 'data');

// 轻量存储适配
const store = {
  docsFile: path.join(DATA_DIR, 'documents.json'),
  readJSON(p) {
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch (e) { return []; }
  },
  saveJSON(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf-8'); },
  getDocuments() { return this.readJSON(this.docsFile); },
  saveDocuments(docs) { this.saveJSON(this.docsFile, docs); }
};

const aiEngine = new AIEngine(store);

const samples = [
  {
    title: '2026年度公司战略规划白皮书',
    department: 'dept-rd',
    accessLevel: 'public',
    content: `2026年度公司战略规划白皮书。本年度公司战略核心方向为"AI驱动、产品领先"。技术战略：投入8000万元建设AI中台，完成核心产品V3.0微服务架构升级，性能提升40%，支撑千万级用户并发。市场战略：品牌升级计划，Q2启动全国渠道拓展，目标新增渠道合作伙伴200家。组织战略：推行OKR管理体系，强化跨部门协作机制，建立知识共享平台。关键里程碑：Q1完成AI中台规划，Q2发布V3.0公测，Q3实现核心业务全部上云，Q4达成年度营收目标20亿元。风险应对：建立数据安全合规体系，核心数据本地化存储。`
  },
  {
    title: '新产品V3.0产品需求文档',
    department: 'dept-rd',
    accessLevel: 'department',
    content: `新产品V3.0产品需求文档（PRD）。产品定位：企业级AI知识管理平台。核心功能模块：智能文档解析、知识图谱构建、AI问答助手、跨部门协作空间。目标用户：企业内部员工、部门管理者、知识管理者。核心指标：文档处理准确率≥95%，知识检索响应时间<500ms，用户月活≥8000人。技术架构：微服务架构，前端Vue3+TypeScript，后端Node.js微服务集群，AI引擎支持多模型调度。非功能需求：系统可用性99.9%，数据加密存储，权限分级管理。发布计划：2026年10月15日上线公测，11月1日全量发布。`
  },
  {
    title: 'Q4市场推广与品牌传播方案',
    department: 'dept-mkt',
    accessLevel: 'public',
    content: `Q4市场推广与品牌传播方案。目标：新产品V3.0上市首月获得5万注册用户，品牌曝光量突破3亿。策略：1.发布会营销，10月15日举办线上发布会，联动5家主流媒体直播；2.KOL矩阵投放，签约20位科技领域KOL，覆盖抖音、B站、小红书平台；3.内容营销，产出50篇深度内容，包括产品评测、行业白皮书；4.社群运营，建立30个用户社群，举办线上训练营。预算：总投入500万元，其中发布会100万，KOL投放200万，内容制作100万，社群运营100万。预期效果：品牌搜索指数提升200%，注册转化率提升3倍。`
  },
  {
    title: '2026年财务预算执行与成本优化报告',
    department: 'dept-fin',
    accessLevel: 'public',
    content: `2026年财务预算执行与成本优化报告。年度总预算1.2亿元，截至Q3执行率82%，整体进度良好。重点分析：1.研发投入4800万元，执行率88%，AI中台项目超支8%；2.市场费用2500万元，执行率75%，Q4需追加发布会预算；3.运营成本3000万元，通过云资源优化节省15%；4.人力成本1700万元，执行率90%。成本优化建议：1.云资源按需付费改造，预计年省300万元；2.外包开发转内部团队，预计年省200万元；3.差旅费用数字化管控，预计年省80万元。Q4调整：申请追加预算350万元用于新产品发布。`
  },
  {
    title: '员工手册2026版 - 人事制度与福利体系',
    department: 'dept-hr',
    accessLevel: 'public',
    content: `员工手册2026版。第一章 总则：本手册适用于公司全体员工。第二章 招聘与入职：新员工入职需完成3天入职培训，试用期3个月。第三章 考勤制度：弹性工作制，核心办公时间10:00-16:00，每日工作时间8小时。第四章 薪酬福利：年度调薪窗口期每年3月和9月，绩效奖金与OKR考核挂钩；五险一金全额缴纳，补充商业医疗保险；年度体检、带薪年假、弹性福利积分。第五章 晋升通道：管理序列和技术序列双通道发展，每半年一次晋升评审。第六章 培训发展：每人每年培训预算5000元，鼓励内部讲师制度。`
  },
  {
    title: '供应链数字化转型项目方案',
    department: 'dept-ops',
    accessLevel: 'department',
    content: `供应链数字化转型项目方案。背景：现有供应链管理依赖人工，效率低、错误率高。目标：6个月内完成供应链数字化平台建设，实现采购、库存、物流全链路可视化。方案：1.采购管理系统，供应商管理、电子询比价、采购订单自动化，预计降低采购成本10%；2.智能库存管理，引入库存预测算法，库存周转率提升25%；3.物流追踪系统，对接3家主流物流商API，物流状态实时同步。预算：总投入800万元，其中系统开发500万，硬件改造200万，实施服务100万。预期收益：年节约成本1200万元，投资回收期8个月。`
  },
  {
    title: '数据合规与个人信息保护管理规范',
    department: 'dept-legal',
    accessLevel: 'public',
    content: `数据合规与个人信息保护管理规范。依据《中华人民共和国个人信息保护法》《数据安全法》制定。适用范围：公司所有业务系统及数据处理活动。核心要求：1.个人信息收集需取得用户明示同意，遵循最小必要原则；2.重要数据分级分类管理，核心数据加密存储；3.数据跨境传输需进行安全评估；4.建立数据安全事件应急响应机制，事件发生后24小时内上报。合规流程：新业务上线前需完成合规审查（PIA评估），每年开展数据合规审计。违规责任：违反本规范将依据公司制度追责，情节严重者移交司法机关。`
  },
  {
    title: '2026年9月管理层月度会议纪要',
    department: 'all',
    accessLevel: 'public',
    content: `2026年9月管理层月度会议纪要。参会人员：CEO、CTO、各部门负责人。会议要点：1.CEO宣布公司Q3业绩达成率96%，核心产品V3.0进展顺利，预计10月15日如期发布；2.CTO汇报AI中台建设进度，已完成技术选型和架构评审，12月底可投入生产；3.市场部汇报品牌升级计划，Q4将投入500万元推广预算；4.财务部提示Q4资金状况良好，建议各部门按期提交预算调整申请；5.人力资源部通报秋季校招进展，已签约30名应届生；6.决议：成立跨部门V3.0发布专项组，每周三同步进展。`
  },
  {
    title: 'AI知识中台建设技术方案',
    department: 'dept-rd',
    accessLevel: 'department',
    content: `AI知识中台建设技术方案。建设目标：构建企业统一知识处理与问答平台，支持多部门知识接入。技术架构：1.数据层：多源数据接入（文档、数据库、API），统一数据湖存储；2.处理层：NLP预处理、文档解析、知识抽取、向量化；3.服务层：语义检索、知识图谱、RAG问答引擎；4.应用层：企业AI助手、知识门户、API开放平台。关键技术：采用向量数据库存储知识切片，混合检索策略（BM25+向量召回），大模型+领域规则融合问答。性能指标：知识入库延迟<10秒，检索P95<500ms，问答准确率≥90%。安全设计：数据隔离、权限控制、审计日志。`
  }
];

function run() {
  let docs = store.getDocuments();  console.log('=== 智汇中枢 种子数据生成 ===');

  samples.forEach((s, idx) => {
    const aiResult = aiEngine.processDocument(s.content, s.title, s.department);
    const doc = {
      id: 'seed-' + (idx + 1).toString().padStart(3, '0'),
      title: s.title,
      originalName: s.title + '.md',
      filePath: null,
      fileSize: s.content.length,
      mimeType: 'text/markdown',
      department: s.department,
      type: aiResult.type,
      tags: aiResult.tags,
      keywords: aiResult.keywords,
      summary: aiResult.summary,
      content: s.content,
      uploadDate: new Date(Date.now() - (samples.length - idx) * 3600 * 1000 * 24).toISOString(),
      uploader: '系统初始化',
      accessLevel: s.accessLevel,
      aiProcessed: true,
      aiScore: aiResult.importanceScore
    };
    docs.push(doc);
    console.log(`  ✓ [${doc.type}] ${s.title} (关键词: ${aiResult.keywords.slice(0, 4).join(',')}...)`);
  });

  aiEngine.updateRelationships(docs);
  store.saveDocuments(docs);
  console.log(`\n完成！共生成 ${docs.length} 份示例文档`);
}

// 支持被 server.js require 后按需调用（node lib/seed.js 直接执行，require 不自动执行）
if (require.main === module) {
  run();
}

module.exports = { run, samples };
