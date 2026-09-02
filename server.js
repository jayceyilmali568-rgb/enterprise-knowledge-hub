/**
 * 智汇中枢 - AI企业内部资料管理系统
 * Enterprise Knowledge Hub - Backend Server
 * 
 * 核心功能：
 * 1. 文档上传与智能分类
 * 2. AI知识问答助手
 * 3. 核心日程管理
 * 4. 部门信息中枢
 * 5. 知识图谱构建
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const AIEngine = require('./lib/ai-engine');
const RagService = require('./lib/rag-service');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 数据存储路径（云端部署时可用 EKH_DATA_DIR 指向挂载的持久化存储，如 /mnt/data）
const DATA_DIR = process.env.EKH_DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.txt', '.md', '.pdf', '.doc', '.docx', '.xlsx', '.xls', '.pptx', '.ppt', '.json', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('text/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, true); // Allow all, process what we can
    }
  }
});

// ========== 数据管理 ==========
class DataStore {
  constructor() {
    this.docsFile = path.join(DATA_DIR, 'documents.json');
    this.schedulesFile = path.join(DATA_DIR, 'schedules.json');
    this.departmentsFile = path.join(DATA_DIR, 'departments.json');
    this.chatFile = path.join(DATA_DIR, 'chat-history.json');
    this.initData();
  }

  initData() {
    // 初始化文档数据
    if (!fs.existsSync(this.docsFile)) {
      this.saveJSON(this.docsFile, []);
    }
    // 初始化日程数据
    if (!fs.existsSync(this.schedulesFile)) {
      this.saveJSON(this.schedulesFile, this.getSeedSchedules());
    }
    // 初始化部门数据
    if (!fs.existsSync(this.departmentsFile)) {
      this.saveJSON(this.departmentsFile, this.getSeedDepartments());
    }
    // 初始化聊天历史
    if (!fs.existsSync(this.chatFile)) {
      this.saveJSON(this.chatFile, []);
    }
  }

  readJSON(filepath) {
    try {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  saveJSON(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  }

  getDocuments() { return this.readJSON(this.docsFile); }
  saveDocuments(docs) { this.saveJSON(this.docsFile, docs); }
  getSchedules() { return this.readJSON(this.schedulesFile); }
  saveSchedules(schedules) { this.saveJSON(this.schedulesFile, schedules); }
  getDepartments() { return this.readJSON(this.departmentsFile); }
  saveDepartments(depts) { this.saveJSON(this.departmentsFile, depts); }
  getChatHistory() { return this.readJSON(this.chatFile); }
  saveChatHistory(history) { this.saveJSON(this.chatFile, history); }

  getSeedDepartments() {
    return [
      {
        id: 'dept-rd',
        name: '研发中心',
        code: 'R&D',
        head: '张伟',
        memberCount: 45,
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
        id: 'dept-mkt',
        name: '市场部',
        code: 'MKT',
        head: '李娜',
        memberCount: 20,
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
        id: 'dept-fin',
        name: '财务部',
        code: 'FIN',
        head: '王强',
        memberCount: 12,
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
        id: 'dept-hr',
        name: '人力资源部',
        code: 'HR',
        head: '刘洋',
        memberCount: 10,
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
        id: 'dept-ops',
        name: '运营部',
        code: 'OPS',
        head: '陈明',
        memberCount: 25,
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
        id: 'dept-legal',
        name: '法务部',
        code: 'LEG',
        head: '赵雪',
        memberCount: 6,
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
  }

  getSeedSchedules() {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return formatDate(d); };

    return [
      {
        id: 'sch-001',
        title: 'Q3季度战略评审会',
        date: addDays(1),
        time: '09:00-11:30',
        department: 'dept-rd',
        type: 'meeting',
        priority: 'critical',
        description: '回顾Q3进展，评审Q4技术路线图，决策核心项目优先级',
        participants: ['张伟', '李娜', '陈明', '王强'],
        location: '总部A栋3楼大会议室'
      },
      {
        id: 'sch-002',
        title: '新产品V3.0发布日',
        date: addDays(5),
        time: '14:00-16:00',
        department: 'dept-mkt',
        type: 'event',
        priority: 'critical',
        description: '年度核心产品V3.0正式发布，全渠道同步上线',
        participants: ['李娜', '张伟', '陈明'],
        location: '发布厅 + 线上直播'
      },
      {
        id: 'sch-003',
        title: '年度财务审计启动',
        date: addDays(3),
        time: '09:00',
        department: 'dept-fin',
        type: 'deadline',
        priority: 'high',
        description: '启动年度外部审计，需各部门配合提交相关材料',
        participants: ['王强', '刘洋', '赵雪'],
        location: '财务部'
      },
      {
        id: 'sch-004',
        title: '秋季校园招聘启动',
        date: addDays(2),
        time: '10:00',
        department: 'dept-hr',
        type: 'event',
        priority: 'high',
        description: '启动2026届校招，覆盖10所重点高校',
        participants: ['刘洋'],
        location: '线上+线下'
      },
      {
        id: 'sch-005',
        title: '供应链优化方案评审',
        date: addDays(7),
        time: '13:30-15:00',
        department: 'dept-ops',
        type: 'meeting',
        priority: 'medium',
        description: '评审新供应链方案，预计降低15%物流成本',
        participants: ['陈明', '王强'],
        location: '运营部会议室'
      },
      {
        id: 'sch-006',
        title: '合规培训月度课程',
        date: addDays(4),
        time: '15:00-16:30',
        department: 'dept-legal',
        type: 'event',
        priority: 'medium',
        description: '数据合规与个人信息保护法专题培训',
        participants: ['赵雪', '全体部门负责人'],
        location: '线上培训'
      },
      {
        id: 'sch-007',
        title: '技术架构升级里程碑',
        date: addDays(10),
        time: '全天',
        department: 'dept-rd',
        type: 'deadline',
        priority: 'critical',
        description: '微服务架构2.0完成迁移，全量灰度上线',
        participants: ['张伟', '研发核心团队'],
        location: '研发中心'
      },
      {
        id: 'sch-008',
        title: '月度全员例会',
        date: addDays(0),
        time: '17:00-18:00',
        department: 'all',
        type: 'meeting',
        priority: 'medium',
        description: '月度业务回顾与跨部门协调',
        participants: ['全体部门负责人'],
        location: '总部大会议室'
      }
    ];
  }
}

const store = new DataStore();
// 云端首启自动预置示例资料（EKH_AUTOSEED=1 且文档库为空时触发，本地默认关闭）
if (process.env.EKH_AUTOSEED === '1' && store.getDocuments().length === 0) {
  console.log('  [首启] 文档库为空，自动写入 9 份示例资料...');
  try {
    require('./lib/seed').run();
  } catch (e) {
    console.log('  [首启] 自动种子失败（可忽略）:', e.message);
  }
}
const aiEngine = new AIEngine(store);
// 大模型 RAG 服务：配置 DEEPSEEK_API_KEY 环境变量后自动启用 LLM 生成，否则降级规则引擎
const ragService = new RagService({ engine: aiEngine });
const ENGINE_MODE = ragService.enabled()
  ? `DeepSeek LLM + RAG (${ragService.model})`
  : '规则引擎（未配置 DEEPSEEK_API_KEY，可设置后启用大模型）';

// ========== API 路由 ==========

// --- 仪表盘概览 ---
app.get('/api/dashboard', (req, res) => {
  const docs = store.getDocuments();
  const schedules = store.getSchedules();
  const departments = store.getDepartments();
  const today = new Date().toISOString().split('T')[0];

  // 今日及未来7天核心日程
  const upcomingSchedules = schedules
    .filter(s => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  // 文档统计
  const docStats = {
    total: docs.length,
    byDepartment: {},
    byType: {},
    recentUploads: docs
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
      .slice(0, 5)
  };

  docs.forEach(d => {
    docStats.byDepartment[d.department || '未分类'] = (docStats.byDepartment[d.department || '未分类'] || 0) + 1;
    docStats.byType[d.type || 'other'] = (docStats.byType[d.type || 'other'] || 0) + 1;
  });

  // 关键日程统计
  const criticalSchedules = schedules.filter(s => s.priority === 'critical' && s.date >= today);

  res.json({
    docStats,
    upcomingSchedules,
    criticalSchedules,
    departments,
    totalDepartments: departments.length,
    totalMembers: departments.reduce((sum, d) => sum + d.memberCount, 0),
    knowledgeNodes: docs.length,
    aiProcessed: docs.filter(d => d.aiProcessed).length
  });
});

// --- 文档管理 ---
app.post('/api/documents/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || [];
    const docs = store.getDocuments();
    const results = [];

    for (const file of files) {
      // 提取文本内容
      const content = await aiEngine.extractContent(file);
      
      // AI处理：分类、关键词提取、摘要
      const aiResult = aiEngine.processDocument(content, file.originalname, req.body.department);

      const doc = {
        id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        title: req.body.title || file.originalname.replace(/\.[^/.]+$/, ''),
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        department: req.body.department || aiResult.suggestedDepartment,
        type: aiResult.type,
        tags: aiResult.tags,
        keywords: aiResult.keywords,
        summary: aiResult.summary,
        content: content.substring(0, 50000), // 限制存储大小
        uploadDate: new Date().toISOString(),
        uploader: req.body.uploader || '系统管理员',
        accessLevel: req.body.accessLevel || 'department',
        aiProcessed: true,
        aiScore: aiResult.importanceScore
      };

      docs.push(doc);
      results.push(doc);
    }

    // 重新计算文档关联关系
    aiEngine.updateRelationships(docs);
    store.saveDocuments(docs);

    res.json({
      success: true,
      message: `成功上传 ${results.length} 个文件，AI已完成自动分类与知识整合`,
      documents: results
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 手动创建文档（文本输入）
app.post('/api/documents/create', async (req, res) => {
  try {
    const { title, content, department, type, uploader, accessLevel } = req.body;
    const docs = store.getDocuments();
    const aiResult = aiEngine.processDocument(content || '', title, department);

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
    aiEngine.updateRelationships(docs);
    store.saveDocuments(docs);

    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/documents', (req, res) => {
  let docs = store.getDocuments();
  const { department, type, keyword, limit } = req.query;

  if (department && department !== 'all') {
    docs = docs.filter(d => d.department === department);
  }
  if (type && type !== 'all') {
    docs = docs.filter(d => d.type === type);
  }
  if (keyword) {
    const kw = keyword.toLowerCase();
    docs = docs.filter(d =>
      (d.title && d.title.toLowerCase().includes(kw)) ||
      (d.summary && d.summary.toLowerCase().includes(kw)) ||
      (d.keywords && d.keywords.some(k => k.toLowerCase().includes(kw))) ||
      (d.tags && d.tags.some(t => t.toLowerCase().includes(kw)))
    );
  }

  docs.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

  if (limit) docs = docs.slice(0, parseInt(limit));

  res.json(docs);
});

app.get('/api/documents/:id', (req, res) => {
  const docs = store.getDocuments();
  const doc = docs.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // 找出关联文档
  const related = (doc.relatedDocs || [])
    .map(id => docs.find(d => d.id === id))
    .filter(Boolean);

  res.json({ document: doc, related });
});

app.delete('/api/documents/:id', (req, res) => {
  let docs = store.getDocuments();
  const doc = docs.find(d => d.id === req.params.id);
  if (doc && doc.filePath && fs.existsSync(doc.filePath)) {
    try {
      fs.unlinkSync(doc.filePath);
    } catch (e) {
      console.error('File delete warning:', e.message);
      // 物理文件删除失败不影响元数据删除
    }
  }
  docs = docs.filter(d => d.id !== req.params.id);
  store.saveDocuments(docs);
  res.json({ success: true });
});

// --- AI 助手 ---
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const history = store.getChatHistory();

    const response = await ragService.chat(
      message,
      store.getDocuments(),
      store.getSchedules(),
      store.getDepartments()
    );

    history.push({
      id: 'chat-' + Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    history.push({
      id: 'chat-' + Date.now() + '-r',
      role: 'assistant',
      content: response.answer,
      sources: response.sources,
      engine: response.engine,
      timestamp: new Date().toISOString()
    });

    // 保留最近100条
    if (history.length > 100) history.splice(0, history.length - 100);
    store.saveChatHistory(history);

    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ai/history', (req, res) => {
  res.json(store.getChatHistory());
});

// AI 文档摘要
app.post('/api/ai/summarize/:id', async (req, res) => {
  try {
    const docs = store.getDocuments();
    const doc = docs.find((d) => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const result = await ragService.summarize(doc.content, doc.title);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- 日程管理 ---
app.get('/api/schedules', (req, res) => {
  let schedules = store.getSchedules();
  const { department, priority, type } = req.query;

  if (department && department !== 'all') {
    schedules = schedules.filter(s => s.department === department || s.department === 'all');
  }
  if (priority && priority !== 'all') {
    schedules = schedules.filter(s => s.priority === priority);
  }
  if (type && type !== 'all') {
    schedules = schedules.filter(s => s.type === type);
  }

  schedules.sort((a, b) => a.date.localeCompare(b.date));
  res.json(schedules);
});

app.post('/api/schedules', (req, res) => {
  const schedules = store.getSchedules();
  const newSchedule = {
    id: 'sch-' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  schedules.push(newSchedule);
  store.saveSchedules(schedules);
  res.json({ success: true, schedule: newSchedule });
});

app.delete('/api/schedules/:id', (req, res) => {
  let schedules = store.getSchedules();
  schedules = schedules.filter(s => s.id !== req.params.id);
  store.saveSchedules(schedules);
  res.json({ success: true });
});

// --- 部门信息 ---
app.get('/api/departments', (req, res) => {
  const departments = store.getDepartments();
  const docs = store.getDocuments();
  const schedules = store.getSchedules();

  // 为每个部门添加文档数和日程数
  const enriched = departments.map(dept => ({
    ...dept,
    docCount: docs.filter(d => d.department === dept.id).length,
    scheduleCount: schedules.filter(s => s.department === dept.id).length,
    recentDocs: docs
      .filter(d => d.department === dept.id)
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
      .slice(0, 3)
      .map(d => ({ id: d.id, title: d.title, summary: d.summary, uploadDate: d.uploadDate }))
  }));

  res.json(enriched);
});

app.get('/api/departments/:id', (req, res) => {
  const departments = store.getDepartments();
  const dept = departments.find(d => d.id === req.params.id);
  if (!dept) return res.status(404).json({ error: 'Not found' });

  const docs = store.getDocuments().filter(d => d.department === dept.id);
  const schedules = store.getSchedules().filter(s => s.department === dept.id || s.department === 'all');

  res.json({ department: dept, documents: docs, schedules });
});

// --- 知识图谱 ---
app.get('/api/knowledge-graph', (req, res) => {
  const docs = store.getDocuments();
  const departments = store.getDepartments();

  const nodes = [];
  const links = [];

  // 部门节点
  departments.forEach(dept => {
    nodes.push({
      id: dept.id,
      label: dept.name,
      type: 'department',
      color: dept.color,
      size: 30 + docs.filter(d => d.department === dept.id).length * 5
    });
  });

  // 文档节点
  docs.forEach(doc => {
    nodes.push({
      id: doc.id,
      label: doc.title,
      type: 'document',
      color: '#666',
      size: 15 + (doc.aiScore || 5)
    });

    // 文档到部门的链接
    if (doc.department) {
      links.push({ source: doc.department, target: doc.id, type: 'belongs' });
    }

    // 文档间的关联
    (doc.relatedDocs || []).forEach(relatedId => {
      links.push({ source: doc.id, target: relatedId, type: 'related' });
    });
  });

  // 共享关键词的文档连接
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

  res.json({ nodes, links });
});

// --- 全局搜索 ---
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json({ documents: [], schedules: [], departments: [] });

  const query = q.toLowerCase();
  const docs = store.getDocuments();
  const schedules = store.getSchedules();
  const departments = store.getDepartments();

  const matchedDocs = docs.filter(d =>
    (d.title && d.title.toLowerCase().includes(query)) ||
    (d.summary && d.summary.toLowerCase().includes(query)) ||
    (d.keywords && d.keywords.some(k => k.toLowerCase().includes(query))) ||
    (d.content && d.content.toLowerCase().includes(query))
  ).map(d => ({
    id: d.id, title: d.title, summary: d.summary,
    department: d.department, type: d.type, uploadDate: d.uploadDate,
    score: aiEngine.calculateRelevance(d, query)
  })).sort((a, b) => b.score - a.score);

  const matchedSchedules = schedules.filter(s =>
    (s.title && s.title.toLowerCase().includes(query)) ||
    (s.description && s.description.toLowerCase().includes(query))
  );

  const matchedDepts = departments.filter(d =>
    (d.name && d.name.toLowerCase().includes(query)) ||
    (d.description && d.description.toLowerCase().includes(query))
  );

  res.json({
    documents: matchedDocs,
    schedules: matchedSchedules,
    departments: matchedDepts,
    totalResults: matchedDocs.length + matchedSchedules.length + matchedDepts.length
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n  ========================================`);
  console.log(`  智汇中枢 - AI企业内部资料管理系统`);
  console.log(`  ========================================`);
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  数据目录: ${DATA_DIR}`);
  console.log(`  上传目录: ${UPLOAD_DIR}`);
  console.log(`  AI 引擎: ${ENGINE_MODE}`);
  console.log(`  ========================================\n`);
});
