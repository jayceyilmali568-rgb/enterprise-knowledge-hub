/**
 * 智汇中枢 - 本地服务层（云端静态版）
 * Local API Server - Browser Edition
 *
 * 以 localStorage 替代后端数据存储，在浏览器内完整复刻
 * 原 Node.js 服务的全部 API 能力（文档/AI问答/日程/部门/图谱/搜索）。
 * 数据仅保存在当前浏览器中，换设备需重新导入。
 */

const LocalAPI = {
  ai: null,
  KEYS: {
    docs: 'ekh_documents',
    schedules: 'ekh_schedules',
    departments: 'ekh_departments',
    chat: 'ekh_chat_history'
  },

  // ========== 初始化 ==========
  init() {
    this.ai = new AIEngine(null);

    if (!localStorage.getItem(this.KEYS.departments)) {
      this.save(this.KEYS.departments, this.seedDepartments());
    }
    if (!localStorage.getItem(this.KEYS.schedules)) {
      this.save(this.KEYS.schedules, this.seedSchedules());
    }
    if (!localStorage.getItem(this.KEYS.docs)) {
      this.seedDocuments();
    }
  },

  // ========== 存取 ==========
  load(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('localStorage 保存失败（可能超出容量）:', e);
    }
  },
  getDocuments() { return this.load(this.KEYS.docs); },
  saveDocuments(d) { this.save(this.KEYS.docs, d); },
  getSchedules() { return this.load(this.KEYS.schedules); },
  saveSchedules(s) { this.save(this.KEYS.schedules, s); },
  getDepartments() { return this.load(this.KEYS.departments); },
  getChatHistory() { return this.load(this.KEYS.chat); },
  saveChatHistory(h) { this.save(this.KEYS.chat, h); },

  // ========== 种子数据：部门 ==========
  seedDepartments() {
    return [
      {
        id: 'dept-rd', name: '研发中心', code: 'R&D', head: '张伟', memberCount: 45,
        description: '负责公司核心产品技术研发、架构设计与技术创新',
        coreResponsibilities: ['产品研发', '技术架构', '系统维护', '创新孵化'],
        color: '#4f7cff',
        keyMetrics: [
          { label: '在研项目', value: 8 },
          { label: '专利数量', value: 32 },
          { label: '技术债', value: '低' }
        ]
      },
      {
        id: 'dept-mkt', name: '市场部', code: 'MKT', head: '李娜', memberCount: 20,
        description: '负责品牌传播、市场推广、用户增长与渠道拓展',
        coreResponsibilities: ['品牌传播', '市场推广', '用户增长', '渠道管理'],
        color: '#e85d75',
        keyMetrics: [
          { label: '活跃渠道', value: 12 },
          { label: '本月ROI', value: '3.2x' },
          { label: '品牌曝光', value: '2.4亿' }
        ]
      },
      {
        id: 'dept-fin', name: '财务部', code: 'FIN', head: '王强', memberCount: 12,
        description: '负责公司财务管理、预算编制、成本控制与税务筹划',
        coreResponsibilities: ['财务核算', '预算管理', '成本控制', '税务筹划'],
        color: '#f5a623',
        keyMetrics: [
          { label: '预算执行', value: '87%' },
          { label: '成本节约', value: '12.5%' },
          { label: '审计状态', value: '正常' }
        ]
      },
      {
        id: 'dept-hr', name: '人力资源部', code: 'HR', head: '刘洋', memberCount: 10,
        description: '负责人才招聘、培训发展、绩效管理与组织文化建设',
        coreResponsibilities: ['人才招聘', '培训发展', '绩效管理', '文化建设'],
        color: '#27ae60',
        keyMetrics: [
          { label: '在岗人数', value: 156 },
          { label: '招聘中', value: 18 },
          { label: '员工满意度', value: '4.2/5' }
        ]
      },
      {
        id: 'dept-ops', name: '运营部', code: 'OPS', head: '陈明', memberCount: 25,
        description: '负责日常运营管理、流程优化、供应链与客户服务',
        coreResponsibilities: ['运营管理', '流程优化', '供应链', '客户服务'],
        color: '#8e44ad',
        keyMetrics: [
          { label: '运营效率', value: '92%' },
          { label: '客户满意度', value: '96%' },
          { label: 'SLA达标', value: '99.5%' }
        ]
      },
      {
        id: 'dept-legal', name: '法务部', code: 'LEG', head: '赵雪', memberCount: 6,
        description: '公司法律事务、合同审查、合规管理与风险控制',
        coreResponsibilities: ['法律事务', '合同审查', '合规管理', '风险控制'],
        color: '#2c3e50',
        keyMetrics: [
          { label: '合同审查', value: 124 },
          { label: '合规事件', value: 0 },
          { label: '风险等级', value: '低' }
        ]
      }
    ];
  },

  // ========== 种子数据：日程 ==========
  seedSchedules() {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return formatDate(d); };

    return [
      {
        id: 'sch-001', title: 'Q3季度战略评审会', date: addDays(1), time: '09:00-11:30',
        department: 'dept-rd', type: 'meeting', priority: 'critical',
        description: '回顾Q3进展，评审Q4技术路线图，决策核心项目优先级',
        participants: ['张伟', '李娜', '陈明', '王强'], location: '总部A栋3楼大会议室'
      },
      {
        id: 'sch-002', title: '新产品V3.0发布日', date: addDays(5), time: '14:00-16:00',
        department: 'dept-mkt', type: 'event', priority: 'critical',
        description: '年度核心产品V3.0正式发布，全渠道同步上线',
        participants: ['李娜', '张伟', '陈明'], location: '发布厅 + 线上直播'
      },
      {
        id: 'sch-003', title: '年度财务审计启动', date: addDays(3), time: '09:00',
        department: 'dept-fin', type: 'deadline', priority: 'high',
        description: '启动年度外部审计，需各部门配合提交相关材料',
        participants: ['王强', '刘洋', '赵雪'], location: '财务部'
      },
      {
        id: 'sch-004', title: '秋季校园招聘启动', date: addDays(2), time: '10:00',
        department: 'dept-hr', type: 'event', priority: 'high',
        description: '启动2026届校招，覆盖10所重点高校',
        participants: ['刘洋'], location: '线上+线下'
      },
      {
        id: 'sch-005', title: '供应链优化方案评审', date: addDays(7), time: '13:30-15:00',
        department: 'dept-ops', type: 'meeting', priority: 'medium',
        description: '评审新供应链方案，预计降低15%物流成本',
        participants: ['陈明', '王强'], location: '运营部会议室'
      },
      {
        id: 'sch-006', title: '合规培训月度课程', date: addDays(4), time: '15:00-16:30',
        department: 'dept-legal', type: 'event', priority: 'medium',
        description: '数据合规与个人信息保护法专题培训',
        participants: ['赵雪', '全体部门负责人'], location: '线上培训'
      },
      {
        id: 'sch-007', title: '技术架构升级里程碑', date: addDays(10), time: '全天',
        department: 'dept-rd', type: 'deadline', priority: 'critical',
        description: '微服务架构2.0完成迁移，全量灰度上线',
        participants: ['张伟', '研发核心团队'], location: '研发中心'
      },
      {
        id: 'sch-008', title: '月度全员例会', date: addDays(0), time: '17:00-18:00',
        department: 'all', type: 'meeting', priority: 'medium',
        description: '月度业务回顾与跨部门协调',
        participants: ['全体部门负责人'], location: '总部大会议室'
      }
    ];
  },

  // ========== 种子数据：文档 ==========
  seedSamples: [
    {
      title: '2026年度公司战略规划白皮书', department: 'dept-rd', accessLevel: 'public',
      content: '2026年度公司战略规划白皮书。本年度公司战略核心方向为"AI驱动、产品领先"。技术战略：投入8000万元建设AI中台，完成核心产品V3.0微服务架构升级，性能提升40%，支撑千万级用户并发。市场战略：品牌升级计划，Q2启动全国渠道拓展，目标新增渠道合作伙伴200家。组织战略：推行OKR管理体系，强化跨部门协作机制，建立知识共享平台。关键里程碑：Q1完成AI中台规划，Q2发布V3.0公测，Q3实现核心业务全部上云，Q4达成年度营收目标20亿元。风险应对：建立数据安全合规体系，核心数据本地化存储。'
    },
    {
      title: '新产品V3.0产品需求文档', department: 'dept-rd', accessLevel: 'department',
      content: '新产品V3.0产品需求文档（PRD）。产品定位：企业级AI知识管理平台。核心功能模块：智能文档解析、知识图谱构建、AI问答助手、跨部门协作空间。目标用户：企业内部员工、部门管理者、知识管理者。核心指标：文档处理准确率≥95%，知识检索响应时间<500ms，用户月活≥8000人。技术架构：微服务架构，前端Vue3+TypeScript，后端Node.js微服务集群，AI引擎支持多模型调度。非功能需求：系统可用性99.9%，数据加密存储，权限分级管理。发布计划：2026年10月15日上线公测，11月1日全量发布。'
    },
    {
      title: 'Q4市场推广与品牌传播方案', department: 'dept-mkt', accessLevel: 'public',
      content: 'Q4市场推广与品牌传播方案。目标：新产品V3.0上市首月获得5万注册用户，品牌曝光量突破3亿。策略：1.发布会营销，10月15日举办线上发布会，联动5家主流媒体直播；2.KOL矩阵投放，签约20位科技领域KOL，覆盖抖音、B站、小红书平台；3.内容营销，产出50篇深度内容，包括产品评测、行业白皮书；4.社群运营，建立30个用户社群，举办线上训练营。预算：总投入500万元，其中发布会100万，KOL投放200万，内容制作100万，社群运营100万。预期效果：品牌搜索指数提升200%，注册转化率提升3倍。'
    },
    {
      title: '2026年财务预算执行与成本优化报告', department: 'dept-fin', accessLevel: 'public',
      content: '2026年财务预算执行与成本优化报告。年度总预算1.2亿元，截至Q3执行率82%，整体进度良好。重点分析：1.研发投入4800万元，执行率88%，AI中台项目超支8%；2.市场费用2500万元，执行率75%，Q4需追加发布会预算；3.运营成本3000万元，通过云资源优化节省15%；4.人力成本1700万元，执行率90%。成本优化建议：1.云资源按需付费改造，预计年省300万元；2.外包开发转内部团队，预计年省200万元；3.差旅费用数字化管控，预计年省80万元。Q4调整：申请追加预算350万元用于新产品发布。'
    },
    {
      title: '员工手册2026版 - 人事制度与福利体系', department: 'dept-hr', accessLevel: 'public',
      content: '员工手册2026版。第一章 总则：本手册适用于公司全体员工。第二章 招聘与入职：新员工入职需完成3天入职培训，试用期3个月。第三章 考勤制度：弹性工作制，核心办公时间10:00-16:00，每日工作时间8小时。第四章 薪酬福利：年度调薪窗口期每年3月和9月，绩效奖金与OKR考核挂钩；五险一金全额缴纳，补充商业医疗保险；年度体检、带薪年假、弹性福利积分。第五章 晋升通道：管理序列和技术序列双通道发展，每半年一次晋升评审。第六章 培训发展：每人每年培训预算5000元，鼓励内部讲师制度。'
    },
    {
      title: '供应链数字化转型项目方案', department: 'dept-ops', accessLevel: 'department',
      content: '供应链数字化转型项目方案。背景：现有供应链管理依赖人工，效率低、错误率高。目标：6个月内完成供应链数字化平台建设，实现采购、库存、物流全链路可视化。方案：1.采购管理系统，供应商管理、电子询比价、采购订单自动化，预计降低采购成本10%；2.智能库存管理，引入库存预测算法，库存周转率提升25%；3.物流追踪系统，对接3家主流物流商API，物流状态实时同步。预算：总投入800万元，其中系统开发500万，硬件改造200万，实施服务100万。预期收益：年节约成本1200万元，投资回收期8个月。'
    },
    {
      title: '数据合规与个人信息保护管理规范', department: 'dept-legal', accessLevel: 'public',
      content: '数据合规与个人信息保护管理规范。依据《中华人民共和国个人信息保护法》《数据安全法》制定。适用范围：公司所有业务系统及数据处理活动。核心要求：1.个人信息收集需取得用户明示同意，遵循最小必要原则；2.重要数据分级分类管理，核心数据加密存储；3.数据跨境传输需进行安全评估；4.建立数据安全事件应急响应机制，事件发生后24小时内上报。合规流程：新业务上线前需完成合规审查（PIA评估），每年开展数据合规审计。违规责任：违反本规范将依据公司制度追责，情节严重者移交司法机关。'
    },
    {
      title: '2026年9月管理层月度会议纪要', department: 'all', accessLevel: 'public',
      content: '2026年9月管理层月度会议纪要。参会人员：CEO、CTO、各部门负责人。会议要点：1.CEO宣布公司Q3业绩达成率96%，核心产品V3.0进展顺利，预计10月15日如期发布；2.CTO汇报AI中台建设进度，已完成技术选型和架构评审，12月底可投入生产；3.市场部汇报品牌升级计划，Q4将投入500万元推广预算；4.财务部提示Q4资金状况良好，建议各部门按期提交预算调整申请；5.人力资源部通报秋季校招进展，已签约30名应届生；6.决议：成立跨部门V3.0发布专项组，每周三同步进展。'
    },
    {
      title: 'AI知识中台建设技术方案', department: 'dept-rd', accessLevel: 'department',
      content: 'AI知识中台建设技术方案。建设目标：构建企业统一知识处理与问答平台，支持多部门知识接入。技术架构：1.数据层：多源数据接入（文档、数据库、API），统一数据湖存储；2.处理层：NLP预处理、文档解析、知识抽取、向量化；3.服务层：语义检索、知识图谱、RAG问答引擎；4.应用层：企业AI助手、知识门户、API开放平台。关键技术：采用向量数据库存储知识切片，混合检索策略（BM25+向量召回），大模型+领域规则融合问答。性能指标：知识入库延迟<10秒，检索P95<500ms，问答准确率≥90%。安全设计：数据隔离、权限控制、审计日志。'
    }
  ],

  seedDocuments() {
    const docs = [];
    this.seedSamples.forEach((s, idx) => {
      const aiResult = this.ai.processDocument(s.content, s.title, s.department);
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
        uploadDate: new Date(Date.now() - (this.seedSamples.length - idx) * 3600 * 1000 * 24).toISOString(),
        uploader: '系统初始化',
        accessLevel: s.accessLevel,
        aiProcessed: true,
        aiScore: aiResult.importanceScore
      };
      docs.push(doc);
    });
    this.ai.updateRelationships(docs);
    this.saveDocuments(docs);
  },

  // ========== API 路由（复刻后端接口） ==========
  async handle(url, options = {}) {
    const u = new URL(url, 'http://localhost/');
    const p = u.pathname.replace(/\/+$/, '');
    const q = u.searchParams;
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    let m;

    // --- 仪表盘 ---
    if (p === '/api/dashboard' && method === 'GET') {
      const docs = this.getDocuments();
      const schedules = this.getSchedules();
      const departments = this.getDepartments();
      const today = new Date().toISOString().split('T')[0];

      const upcomingSchedules = schedules
        .filter(s => s.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8);

      const docStats = {
        total: docs.length,
        byDepartment: {},
        byType: {},
        recentUploads: docs
          .slice()
          .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
          .slice(0, 5)
      };
      docs.forEach(d => {
        docStats.byDepartment[d.department || '未分类'] = (docStats.byDepartment[d.department || '未分类'] || 0) + 1;
        docStats.byType[d.type || 'other'] = (docStats.byType[d.type || 'other'] || 0) + 1;
      });

      return {
        docStats,
        upcomingSchedules,
        criticalSchedules: schedules.filter(s => s.priority === 'critical' && s.date >= today),
        departments,
        totalDepartments: departments.length,
        totalMembers: departments.reduce((sum, d) => sum + d.memberCount, 0),
        knowledgeNodes: docs.length,
        aiProcessed: docs.filter(d => d.aiProcessed).length
      };
    }

    // --- 部门列表（含文档数/日程数） ---
    if (p === '/api/departments' && method === 'GET') {
      const departments = this.getDepartments();
      const docs = this.getDocuments();
      const schedules = this.getSchedules();
      return departments.map(dept => ({
        ...dept,
        docCount: docs.filter(d => d.department === dept.id).length,
        scheduleCount: schedules.filter(s => s.department === dept.id).length,
        recentDocs: docs
          .filter(d => d.department === dept.id)
          .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
          .slice(0, 3)
          .map(d => ({ id: d.id, title: d.title, summary: d.summary, uploadDate: d.uploadDate }))
      }));
    }

    // --- 部门详情 ---
    if ((m = p.match(/^\/api\/departments\/([\w-]+)$/)) && method === 'GET') {
      const dept = this.getDepartments().find(d => d.id === m[1]);
      if (!dept) throw new Error('Department not found');
      const docs = this.getDocuments().filter(d => d.department === dept.id);
      const schedules = this.getSchedules().filter(s => s.department === dept.id || s.department === 'all');
      return { department: dept, documents: docs, schedules };
    }

    // --- 文档：文本创建（需在 id 匹配之前） ---
    if (p === '/api/documents/create' && method === 'POST') {
      const { title, content, department, type, uploader, accessLevel } = body;
      const docs = this.getDocuments();
      const aiResult = this.ai.processDocument(content || '', title, department);
      const doc = {
        id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: title || '未命名文档',
        originalName: title || '未命名文档',
        filePath: null,
        fileSize: (content || '').length,
        mimeType: 'text/plain',
        department: department || aiResult.suggestedDepartment,
        type: type || aiResult.type,
        tags: aiResult.tags,
        keywords: aiResult.keywords,
        summary: aiResult.summary,
        content: content || '',
        uploadDate: new Date().toISOString(),
        uploader: uploader || '系统管理员',
        accessLevel: accessLevel || 'department',
        aiProcessed: true,
        aiScore: aiResult.importanceScore
      };
      docs.push(doc);
      this.ai.updateRelationships(docs);
      this.saveDocuments(docs);
      return { success: true, document: doc };
    }

    // --- 文档列表 ---
    if (p === '/api/documents' && method === 'GET') {
      let docs = this.getDocuments();
      const { department, type, keyword, limit } = Object.fromEntries(q.entries());

      if (department && department !== 'all') {
        docs = docs.filter(d => d.department === department);
      }
      if (type && type !== 'all') {
        docs = docs.filter(d => d.type === type);
      }
      if (keyword) {
        const kw = keyword.toLowerCase(); // URLSearchParams 已自动解码
        docs = docs.filter(d =>
          (d.title && d.title.toLowerCase().includes(kw)) ||
          (d.summary && d.summary.toLowerCase().includes(kw)) ||
          (d.keywords && d.keywords.some(k => k.toLowerCase().includes(kw))) ||
          (d.tags && d.tags.some(t => t.toLowerCase().includes(kw)))
        );
      }
      docs = docs.slice().sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      if (limit) docs = docs.slice(0, parseInt(limit));
      return docs;
    }

    // --- 文档详情 / 删除 ---
    if ((m = p.match(/^\/api\/documents\/([^\/]+)$/))) {
      const id = m[1];
      if (method === 'DELETE') {
        const docs = this.getDocuments().filter(d => d.id !== id);
        this.saveDocuments(docs);
        return { success: true };
      }
      // GET 详情
      const docs = this.getDocuments();
      const doc = docs.find(d => d.id === id);
      if (!doc) throw new Error('Document not found');
      const related = (doc.relatedDocs || [])
        .map(rid => docs.find(d => d.id === rid))
        .filter(Boolean);
      return { document: doc, related };
    }

    // --- AI 问答 ---
    if (p === '/api/ai/chat' && method === 'POST') {
      const { message } = body;
      const history = this.getChatHistory();
      const response = this.ai.answerQuestion(message, this.getDocuments(), this.getSchedules(), this.getDepartments());

      history.push({ id: 'chat-' + Date.now(), role: 'user', content: message, timestamp: new Date().toISOString() });
      history.push({ id: 'chat-' + Date.now() + '-r', role: 'assistant', content: response.answer, sources: response.sources, timestamp: new Date().toISOString() });
      if (history.length > 100) history.splice(0, history.length - 100);
      this.saveChatHistory(history);
      return response;
    }

    // --- AI 历史记录 ---
    if (p === '/api/ai/history' && method === 'GET') {
      return this.getChatHistory();
    }

    // --- AI 深度摘要 ---
    if ((m = p.match(/^\/api\/ai\/summarize\/([^\/]+)$/)) && method === 'POST') {
      const doc = this.getDocuments().find(d => d.id === m[1]);
      if (!doc) throw new Error('Not found');
      return { summary: this.ai.generateDeepSummary(doc.content, doc.title) };
    }

    // --- 日程列表 / 创建 ---
    if (p === '/api/schedules') {
      let schedules = this.getSchedules();
      if (method === 'POST') {
        const newSchedule = { id: 'sch-' + Date.now(), ...body, createdAt: new Date().toISOString() };
        schedules.push(newSchedule);
        this.saveSchedules(schedules);
        return { success: true, schedule: newSchedule };
      }
      const { department, priority, type } = Object.fromEntries(q.entries());
      if (department && department !== 'all') {
        schedules = schedules.filter(s => s.department === department || s.department === 'all');
      }
      if (priority && priority !== 'all') {
        schedules = schedules.filter(s => s.priority === priority);
      }
      if (type && type !== 'all') {
        schedules = schedules.filter(s => s.type === type);
      }
      return schedules.slice().sort((a, b) => a.date.localeCompare(b.date));
    }

    // --- 日程删除 ---
    if ((m = p.match(/^\/api\/schedules\/([^\/]+)$/)) && method === 'DELETE') {
      this.saveSchedules(this.getSchedules().filter(s => s.id !== m[1]));
      return { success: true };
    }

    // --- 知识图谱 ---
    if (p === '/api/knowledge-graph' && method === 'GET') {
      const docs = this.getDocuments();
      const departments = this.getDepartments();
      const nodes = [];
      const links = [];

      departments.forEach(dept => {
        nodes.push({
          id: dept.id, label: dept.name, type: 'department', color: dept.color,
          size: 30 + docs.filter(d => d.department === dept.id).length * 5
        });
      });

      docs.forEach(doc => {
        nodes.push({
          id: doc.id, label: doc.title, type: 'document', color: '#666',
          size: 15 + (doc.aiScore || 5)
        });
        if (doc.department) links.push({ source: doc.department, target: doc.id, type: 'belongs' });
        (doc.relatedDocs || []).forEach(rid => links.push({ source: doc.id, target: rid, type: 'related' }));
      });

      for (let i = 0; i < docs.length; i++) {
        for (let j = i + 1; j < docs.length; j++) {
          const shared = (docs[i].keywords || []).filter(k => (docs[j].keywords || []).includes(k));
          if (shared.length >= 2 && !links.some(l =>
            (l.source === docs[i].id && l.target === docs[j].id) ||
            (l.source === docs[j].id && l.target === docs[i].id)
          )) {
            links.push({ source: docs[i].id, target: docs[j].id, type: 'keyword', strength: shared.length });
          }
        }
      }
      return { nodes, links };
    }

    // --- 全局搜索 ---
    if (p === '/api/search' && method === 'GET') {
      const qstr = (q.get('q') || '').trim();
      if (!qstr) return { documents: [], schedules: [], departments: [], totalResults: 0 };

      const query = qstr.toLowerCase();
      const docs = this.getDocuments();
      const schedules = this.getSchedules();
      const departments = this.getDepartments();

      const matchedDocs = docs.filter(d =>
        (d.title && d.title.toLowerCase().includes(query)) ||
        (d.summary && d.summary.toLowerCase().includes(query)) ||
        (d.keywords && d.keywords.some(k => k.toLowerCase().includes(query))) ||
        (d.content && d.content.toLowerCase().includes(query))
      ).map(d => ({
        id: d.id, title: d.title, summary: d.summary,
        department: d.department, type: d.type, uploadDate: d.uploadDate,
        score: this.ai.calculateRelevance(d, query)
      })).sort((a, b) => b.score - a.score);

      const matchedSchedules = schedules.filter(s =>
        (s.title && s.title.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query))
      );

      const matchedDepts = departments.filter(d =>
        (d.name && d.name.toLowerCase().includes(query)) ||
        (d.description && d.description.toLowerCase().includes(query))
      );

      return {
        documents: matchedDocs,
        schedules: matchedSchedules,
        departments: matchedDepts,
        totalResults: matchedDocs.length + matchedSchedules.length + matchedDepts.length
      };
    }

    throw new Error('未知接口: ' + method + ' ' + p);
  },

  // ========== 文件上传（浏览器端直接处理 File 对象） ==========
  async handleUpload(formData) {
    const files = formData.getAll('files') || [];
    const department = formData.get('department');
    const accessLevel = formData.get('accessLevel');
    const title = formData.get('title');
    const uploader = formData.get('uploader') || '系统管理员';

    const docs = this.getDocuments();
    const results = [];

    for (const file of files) {
      const content = await this.ai.extractContent(file);
      const aiResult = this.ai.processDocument(content, file.name, department);

      const doc = {
        id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        originalName: file.name,
        filePath: null,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        department: department || aiResult.suggestedDepartment,
        type: aiResult.type,
        tags: aiResult.tags,
        keywords: aiResult.keywords,
        summary: aiResult.summary,
        content: content.substring(0, 50000),
        uploadDate: new Date().toISOString(),
        uploader,
        accessLevel: accessLevel || 'department',
        aiProcessed: true,
        aiScore: aiResult.importanceScore
      };
      docs.push(doc);
      results.push(doc);
    }

    this.ai.updateRelationships(docs);
    this.saveDocuments(docs);
    return {
      success: true,
      message: '成功上传 ' + results.length + ' 个文件，AI已完成自动分类与知识整合',
      documents: results
    };
  },

  // ========== 数据管理（浏览器版独有） ==========
  exportData() {
    return JSON.stringify({
      documents: this.getDocuments(),
      schedules: this.getSchedules(),
      departments: this.getDepartments(),
      chatHistory: this.getChatHistory(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  importData(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (Array.isArray(data.documents)) this.saveDocuments(data.documents);
    if (Array.isArray(data.schedules)) this.saveSchedules(data.schedules);
    if (Array.isArray(data.departments)) this.save(this.KEYS.departments, data.departments);
    if (Array.isArray(data.chatHistory)) this.saveChatHistory(data.chatHistory);
    return true;
  },

  resetData() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    this.init();
  }
};

// 浏览器初始化；Node 测试环境下由调用方手动 init
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  LocalAPI.init();
  window.LocalAPI = LocalAPI;
}
if (typeof module !== 'undefined' && module.exports) module.exports = LocalAPI;
