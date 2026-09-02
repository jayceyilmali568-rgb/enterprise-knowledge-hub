/**
 * AI 知识处理引擎
 * Enterprise Knowledge AI Engine
 * 
 * 核心能力：
 * 1. 文档内容提取
 * 2. 智能分类与标签
 * 3. 关键词提取 (TF-IDF inspired)
 * 4. 摘要生成 (Extractive Summarization)
 * 5. 知识关联图谱构建
 * 6. 问答检索 (Knowledge Q&A)
 */

const fs = require('fs');
const path = require('path');

// 部门关键词映射
const DEPT_KEYWORDS = {
  'dept-rd': ['技术', '研发', '架构', '代码', '系统', 'API', '接口', '数据库', '算法', '服务器', '部署', '微服务', '前端', '后端', 'AI', '机器学习', '深度学习', '模型', '框架', '测试', 'CI/CD', 'DevOps', '云原生', '容器', 'Kubernetes', 'Docker', '性能', '优化', '重构', '技术债', 'SDK', '协议', '加密', '安全', '漏洞'],
  'dept-mkt': ['市场', '品牌', '营销', '推广', '用户', '增长', '渠道', '投放', '转化', 'ROI', 'GMV', '流量', '获客', '留存', '活跃', 'DAU', 'MAU', 'KOL', '内容', '短视频', '直播', '社群', '私域', '公域', 'SEO', 'SEM', '广告', '活动', '策划', '传播', '口碑', '裂变'],
  'dept-fin': ['财务', '预算', '成本', '收入', '利润', '报表', '审计', '税务', '发票', '报销', '现金流', '资产', '负债', '核算', '凭证', '账目', 'ERP', '财务分析', '成本控制', '资金', '投资', '融资', '估值', '折旧', '摊销'],
  'dept-hr': ['招聘', '培训', '绩效', '薪酬', '员工', '人才', '组织', '文化', '入职', '离职', '考勤', '晋升', '面试', '简历', '猎头', 'OKR', 'KPI', '360', '人才盘点', '继任', '梯队', '团队建设', '团建', '福利', '社保', '公积金'],
  'dept-ops': ['运营', '流程', '供应链', '物流', '客户', '服务', 'SLA', '效率', '优化', 'SOP', '标准化', '质量', '交付', '库存', '采购', '供应商', '仓储', '配送', '售后', '工单', 'NPS', '满意度', '运营策略', '增长运营', '数据运营'],
  'dept-legal': ['法律', '合同', '合规', '风险', '诉讼', '仲裁', '知识产权', '专利', '商标', '版权', '保密', '协议', '条款', '法规', '政策', '审查', '尽职调查', '数据合规', '个人信息保护', '反垄断', '劳动法', '公司法']
};

// 文档类型分类规则
const DOC_TYPE_RULES = {
  report: { keywords: ['报告', '分析', '总结', 'review', '月报', '季报', '年报', '调研', '研究', '白皮书'], label: '分析报告' },
  policy: { keywords: ['制度', '规定', '办法', '规范', '政策', '手册', '指引', '准则', '章程', '条例'], label: '制度规范' },
  plan: { keywords: ['计划', '方案', '规划', '策略', 'roadmap', '里程碑', '目标', 'OKR', '计划书', '策划', '提案', '立项'], label: '计划方案' },
  contract: { keywords: ['合同', '协议', '意向书', '备忘录', '订单', '采购单', '框架协议'], label: '合同协议' },
  manual: { keywords: ['手册', '指南', '教程', '说明', '文档', 'README', '操作', '使用', 'SOP'], label: '操作手册' },
  meeting: { keywords: ['会议', '纪要', '记录', '决议', '议题', '会议记录', 'meeting'], label: '会议纪要' },
  training: { keywords: ['培训', '课件', '课程', '教学', '学习', '教程', '讲座'], label: '培训资料' },
  data: { keywords: ['数据', '统计', '报表', '指标', 'dashboard', '看板', '分析报告'], label: '数据报表' },
  other: { keywords: [], label: '其他文档' }
};

// 停用词表
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '与', '及', '或', '但', '从', '中', '可', '以', '对', '为', '等', '被', '让', '把', '将', '向', '于', '之', '其', '此', '所', '者', '们', '地', '得', '吗', '呢', '吧', '啊', '嗯', '哦', '它', '他', '她', '们', '该', '些', '什么', '怎么', '如何', '为什么', '哪里', '哪个', '哪些', '可以', '需要', '应该', '可能', '或者', '以及', '因为', '所以', '如果', '虽然', '但是', '然后', '接着', '首先', '其次', '最后', '另外', '此外', '同时',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how'
]);

class AIEngine {
  constructor(store) {
    this.store = store;
  }

  // ========== 内容提取 ==========
  async extractContent(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const filePath = file.path;

    try {
      if (ext === '.txt' || ext === '.md' || ext === '.json' || ext === '.csv') {
        return fs.readFileSync(filePath, 'utf-8');
      } else if (ext === '.pdf') {
        // 简化的PDF处理 - 读取二进制并提取可读文本
        const buffer = fs.readFileSync(filePath);
        return this.extractTextFromPDF(buffer);
      } else if (['.doc', '.docx', '.pptx', '.ppt', '.xlsx', '.xls'].includes(ext)) {
        // Office文件 - 提取XML中的文本
        const buffer = fs.readFileSync(filePath);
        return this.extractTextFromOffice(buffer, ext);
      } else {
        // 尝试作为文本读取
        try {
          return fs.readFileSync(filePath, 'utf-8');
        } catch {
          return `[二进制文件: ${file.originalname}, 大小: ${file.size}字节]`;
        }
      }
    } catch (error) {
      console.error('Content extraction error:', error);
      return `[文件解析失败: ${file.originalname}]`;
    }
  }

  extractTextFromPDF(buffer) {
    // 简化的PDF文本提取
    let text = '';
    try {
      const str = buffer.toString('latin1');
      // 提取括号内的文本流
      const regex = /\(([^)]+)\)/g;
      let match;
      while ((match = regex.exec(str)) !== null) {
        const chunk = match[1];
        // 过滤不可打印字符
        if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(chunk)) {
          text += chunk + ' ';
        }
      }
      // 也尝试提取 BT...ET 块中的文本
      const btRegex = /BT\s+(.*?)\s+ET/gs;
      while ((match = btRegex.exec(str)) !== null) {
        const tjs = match[1].match(/\(([^)]+)\)/g);
        if (tjs) {
          tjs.forEach(tj => {
            const content = tj.replace(/[()]/g, '');
            if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(content)) {
              text += content + ' ';
            }
          });
        }
      }
    } catch (e) {
      // 忽略错误
    }
    return text.trim() || `[PDF文件, 大小: ${buffer.length}字节, 无法提取文本]`;
  }

  extractTextFromOffice(buffer, ext) {
    // 简化的Office文件文本提取
    let text = '';
    try {
      const str = buffer.toString('utf-8');
      // 提取XML标签中的文本
      const regex = /<(?:w:t|a:t|s:t|.*?:t)[^>]*>([^<]+)<\/(?:w:t|a:t|s:t|.*?:t)>/g;
      let match;
      while ((match = regex.exec(str)) !== null) {
        if (match[1] && match[1].trim()) {
          text += match[1] + ' ';
        }
      }
      // 也尝试提取 <text:p> 等标签
      const pRegex = /<(?:text:p|p)[^>]*>([^<]+)<\/(?:text:p|p)>/g;
      while ((match = pRegex.exec(str)) !== null) {
        if (match[1] && match[1].trim()) {
          text += match[1] + ' ';
        }
      }
    } catch (e) {
      // 忽略错误
    }
    return text.trim() || `[Office文件 ${ext}, 大小: ${buffer.length}字节]`;
  }

  // ========== 文档处理 ==========
  processDocument(content, title, department) {
    const fullText = (title + ' ' + content).trim();

    // 1. 分类
    const type = this.classifyDocument(fullText, title);

    // 2. 关键词提取
    const keywords = this.extractKeywords(fullText, 15);

    // 3. 标签生成
    const tags = this.generateTags(fullText, type, keywords);

    // 4. 摘要生成
    const summary = this.generateSummary(content, title, 200);

    // 5. 部门建议
    const suggestedDepartment = department || this.suggestDepartment(fullText);

    // 6. 重要性评分
    const importanceScore = this.calculateImportance(fullText, keywords, type);

    return {
      type,
      keywords,
      tags,
      summary,
      suggestedDepartment,
      importanceScore
    };
  }

  // 文档分类
  classifyDocument(text, title) {
    const lowerText = text.toLowerCase();
    const lowerTitle = (title || '').toLowerCase();

    let bestType = 'other';
    let bestScore = 0;

    for (const [type, rule] of Object.entries(DOC_TYPE_RULES)) {
      let score = 0;
      for (const kw of rule.keywords) {
        const lowerKw = kw.toLowerCase();
        if (lowerTitle.includes(lowerKw)) score += 3;
        if (lowerText.includes(lowerKw)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    return bestType;
  }

  // 关键词提取 (n-gram + 频率 + 长度加权)
  extractKeywords(text, limit = 15) {
    if (!text || text.length < 2) return [];

    // 提取连续中文块
    const chineseBlocks = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];

    // 从中文块生成 n-gram (2-4字)
    const grams = [];
    chineseBlocks.forEach(block => {
      const len = block.length;
      const maxGram = Math.min(4, len);
      for (let size = 2; size <= maxGram; size++) {
        for (let i = 0; i + size <= len; i++) {
          const gram = block.substring(i, i + size);
          if (!this.isStopPhrase(gram) && !this.isBadGram(gram)) {
            grams.push({ word: gram, size });
          }
        }
      }
    });

    // 英文单词提取
    const englishRegex = /[a-zA-Z]{2,}/g;
    let match;
    while ((match = englishRegex.exec(text)) !== null) {
      const word = match[0].toLowerCase();
      if (!STOP_WORDS.has(word) && word.length >= 3) {
        grams.push({ word, size: 99 }); // 英文词视为完整
      }
    }

    // 计算加权频率
    const freq = {};
    grams.forEach(({ word, size }) => {
      if (!freq[word]) freq[word] = { count: 0, size: 0 };
      freq[word].count++;
      freq[word].size = Math.max(freq[word].size, size);
    });

    // 已知领域词表（增强权重）
    const domainTerms = new Set();
    Object.values(DEPT_KEYWORDS).forEach(kws => kws.forEach(k => domainTerms.add(k.toLowerCase())));

    // 评分排序：频率 × 长度权重 + 领域词加成
    const scored = Object.entries(freq).map(([word, { count, size }]) => {
      let score = count * (size >= 4 ? 1.5 : size === 3 ? 1.2 : 1.0);
      const lower = word.toLowerCase();
      if (domainTerms.has(lower)) score += 3;
      if (/[\u4e00-\u9fa5]/.test(word) && size === 4) score += 1; // 4字中文短语信息量高
      if (/[a-zA-Z]/.test(word)) score += 1.5; // 英文术语
      return { word, score };
    });

    // 去重：若3/4字短语包含高频2字词且独立出现少，保留长短语
    const sorted = scored.sort((a, b) => b.score - a.score);

    // 过滤包含关系：保留更长的短语，删除被长短语包含且分数低的短词
    const result = [];
    for (const { word, score } of sorted) {
      if (result.length >= limit) break;
      // 检查是否被已选中的更长短语包含
      const subsumed = result.some(r =>
        word !== r && r.includes(word) && r.length >= word.length + 2
      );
      if (!subsumed) {
        result.push(word);
      }
    }

    return result;
  }

  isBadGram(gram) {
    // 过滤以常见虚词开头/结尾的无意义短语
    const badPrefix = ['本', '这', '那', '我', '你', '他', '她', '它', '们', '在', '了', '是', '的', '与', '及', '或', '但', '而', '为', '以', '其', '该', '个'];
    const badSuffix = ['的', '了', '是', '在', '与', '及', '或', '等', '们', '个', '中', '上', '下', '来', '去'];
    // 4字短语结尾为"粘着字"的多为中间截断词（如"度财务预"）
    const badMidSuffix4 = ['预', '方', '设', '阶', '项', '部', '阶'];
    if (badPrefix.includes(gram[0])) return true;
    if (badSuffix.includes(gram[gram.length - 1])) return true;
    if (gram.length >= 4 && badMidSuffix4.includes(gram[gram.length - 1])) return true;
    // 全虚词
    if (/^[的了是在与及或但而为以其该个中上下来去所以如果因为]$/.test(gram)) return true;
    return false;
  }

  isStopPhrase(word) {
    // 常见无意义短语
    const stopPhrases = ['我们', '你们', '他们', '这个', '那个', '一个', '可以', '需要', '进行', '通过', '根据', '按照', '基于', '由于', '因为', '所以', '但是', '如果', '虽然', '然后', '首先', '其次', '最后', '另外', '此外', '同时', '目前', '现在', '已经', '正在', '将要', '即将', '应该', '可能', '或者', '以及', '并且', '而且', '不过', '其实', '确实', '当然', '也许', '大概', '可能', '的话'];
    return stopPhrases.includes(word);
  }

  // 标签生成
  generateTags(text, type, keywords) {
    const tags = new Set();

    // 从类型生成标签
    if (DOC_TYPE_RULES[type]) {
      tags.add(DOC_TYPE_RULES[type].label);
    }

    // 从关键词中选取有意义的作为标签
    keywords.slice(0, 5).forEach(kw => tags.add(kw));

    // 检测特殊标签
    const specialTags = {
      '机密': /机密|绝密|秘密|confidential/i,
      '紧急': /紧急|加急|urgent|ASAP/i,
      '核心': /核心|关键|战略|critical|strategic/i,
      '创新': /创新|突破|首创|innovative|breakthrough/i,
      '里程碑': /里程碑|milestone|阶段|节点/i,
      '风险': /风险|隐患|危险|risk|hazard/i
    };

    for (const [tag, regex] of Object.entries(specialTags)) {
      if (regex.test(text)) tags.add(tag);
    }

    return Array.from(tags);
  }

  // 摘要生成 (抽取式)
  generateSummary(content, title, maxLength = 200) {
    if (!content || content.trim().length < 10) {
      return title ? `本文档标题为"${title}"，内容较少，暂无详细摘要。` : '暂无可生成摘要的内容。';
    }

    // 按句子分割
    const sentences = this.splitSentences(content);
    if (sentences.length === 0) {
      return content.substring(0, maxLength) + '...';
    }

    // 计算句子得分：基于关键词密度、位置、长度
    const keywords = this.extractKeywords(content, 10);
    const sentenceScores = sentences.map((sentence, index) => {
      let score = 0;

      // 关键词密度
      keywords.forEach(kw => {
        if (sentence.includes(kw)) score += 2;
      });

      // 位置权重：前几句更重要
      if (index < 3) score += 3;
      else if (index < 6) score += 2;
      else if (index < 10) score += 1;

      // 长度适中加分
      if (sentence.length > 15 && sentence.length < 100) score += 1;

      // 包含数字加分（通常有具体信息）
      if (/\d/.test(sentence)) score += 1;

      // 包含标题中的词
      if (title) {
        const titleWords = title.split(/[\s,，、。]+/);
        titleWords.forEach(w => {
          if (w.length > 1 && sentence.includes(w)) score += 2;
        });
      }

      return { sentence, score, index };
    });

    // 选取得分最高的句子
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => a.index - b.index)
      .map(s => s.sentence);

    let summary = topSentences.join('。');
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength) + '...';
    }

    return summary || content.substring(0, maxLength) + '...';
  }

  splitSentences(text) {
    // 保护小数、缩写和序号列表（V3.0, U.S.A, 1.市场部）
    const safeText = text.replace(
      /(\d\.\d)|([A-Za-z]\.)(?=[A-Za-z])|(\d\.)(?=[\u4e00-\u9fa5A-Za-z])/g,
      (m, d1, d2, d3) => {
        if (d1) return d1.replace('.', '\u0001');
        if (d2) return d2.replace('.', '\u0001');
        if (d3) return d3.replace('.', '\u0001');
        return m;
      }
    );

    const sentences = safeText
      .split(/[。！？\n.!?]+/)
      .map(s => s.trim().replace(/\u0001/g, '.'))
      .filter(s => s.length > 5);

    return sentences;
  }

  // 部门建议
  suggestDepartment(text) {
    const lowerText = text.toLowerCase();
    let bestDept = 'dept-ops';
    let bestScore = 0;

    for (const [deptId, keywords] of Object.entries(DEPT_KEYWORDS)) {
      let score = 0;
      keywords.forEach(kw => {
        if (lowerText.includes(kw.toLowerCase())) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        bestDept = deptId;
      }
    }

    return bestDept;
  }

  // 重要性评分
  calculateImportance(text, keywords, type) {
    let score = 5; // 基础分

    // 关键词多说明信息密度高
    score += Math.min(keywords.length, 10);

    // 特殊类型加分
    if (['report', 'policy', 'plan', 'contract'].includes(type)) {
      score += 5;
    }

    // 包含关键标志词
    const importanceMarkers = ['核心', '关键', '战略', '重要', '紧急', '里程碑', '年度', '季度', '重大', '突破'];
    importanceMarkers.forEach(marker => {
      if (text.includes(marker)) score += 2;
    });

    // 包含数字/数据
    if (/\d{4,}/.test(text)) score += 3; // 大数字
    if (/[%％]/.test(text)) score += 2; // 百分比

    // 文本长度
    if (text.length > 5000) score += 3;
    else if (text.length > 2000) score += 2;
    else if (text.length > 500) score += 1;

    return Math.min(score, 30); // 上限30
  }

  // 更新文档关联关系
  updateRelationships(docs) {
    for (let i = 0; i < docs.length; i++) {
      const related = new Set();
      for (let j = 0; j < docs.length; j++) {
        if (i === j) continue;
        // 同部门
        if (docs[i].department && docs[i].department === docs[j].department) {
          related.add(docs[j].id);
        }
        // 共享关键词 (2个以上)
        const shared = (docs[i].keywords || []).filter(k => (docs[j].keywords || []).includes(k));
        if (shared.length >= 2) {
          related.add(docs[j].id);
        }
      }
      docs[i].relatedDocs = Array.from(related).slice(0, 10); // 最多10个关联
    }
  }

  // ========== 问答系统 ==========
  answerQuestion(question, docs, schedules, departments) {
    const lowerQ = question.toLowerCase();
    const results = {
      answer: '',
      sources: [],
      type: 'general'
    };

    // 检测问题类型
    const isScheduleQ = /日程|安排|计划|会议|什么时候|几点|日期|deadline|截止|到期/.test(question);
    const isDocQ = /文档|资料|文件|报告|手册|制度|规范|规定/.test(question);
    const isDeptQ = /部门|团队|谁负责|哪个部门|负责人/.test(question);
    const isSummaryQ = /总结|概览|概述|梳理|概况|整体/.test(question);

    let answerParts = [];
    let sources = [];

    // === 日程相关问答 ===
    if (isScheduleQ) {
      results.type = 'schedule';
      const today = new Date().toISOString().split('T')[0];
      const upcoming = schedules
        .filter(s => s.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (/核心|关键|重要/.test(question)) {
        const critical = upcoming.filter(s => s.priority === 'critical' || s.priority === 'high');
        if (critical.length > 0) {
          answerParts.push('以下是公司核心日程安排：');
          critical.slice(0, 5).forEach(s => {
            const dept = departments.find(d => d.id === s.department);
            answerParts.push(`  - ${s.date} ${s.time} | ${s.title}（${dept ? dept.name : '全公司'}）- ${s.description}`);
            sources.push({ type: 'schedule', id: s.id, title: s.title });
          });
        }
      } else {
        const next = upcoming.slice(0, 5);
        if (next.length > 0) {
          answerParts.push('近期日程安排如下：');
          next.forEach(s => {
            const dept = departments.find(d => d.id === s.department);
            answerParts.push(`  - ${s.date} ${s.time} | ${s.title}（${dept ? dept.name : '全公司'}，${this.priorityLabel(s.priority)}）`);
            sources.push({ type: 'schedule', id: s.id, title: s.title });
          });
        }
      }
    }

    // === 部门相关问答 ===
    if (isDeptQ) {
      results.type = 'department';
      // 查找特定部门
      let matchedDept = null;
      for (const dept of departments) {
        if (question.includes(dept.name) || question.includes(dept.code)) {
          matchedDept = dept;
          break;
        }
      }

      if (matchedDept) {
        const deptDocs = docs.filter(d => d.department === matchedDept.id);
        const deptSchedules = schedules.filter(s => s.department === matchedDept.id);
        answerParts.push(`${matchedDept.name}信息：`);
        answerParts.push(`  - 负责人：${matchedDept.head}`);
        answerParts.push(`  - 团队规模：${matchedDept.memberCount}人`);
        answerParts.push(`  - 核心职责：${matchedDept.coreResponsibilities.join('、')}`);
        answerParts.push(`  - 相关文档：${deptDocs.length}份`);
        answerParts.push(`  - 近期日程：${deptSchedules.length}项`);
        sources.push({ type: 'department', id: matchedDept.id, title: matchedDept.name });
      } else {
        answerParts.push('公司各部门概览：');
        departments.forEach(d => {
          const docCount = docs.filter(doc => doc.department === d.id).length;
          answerParts.push(`  - ${d.name}（${d.code}）：${d.memberCount}人，负责人${d.head}，${d.coreResponsibilities.join('、')}，相关文档${docCount}份`);
          sources.push({ type: 'department', id: d.id, title: d.name });
        });
      }
    }

    // === 文档/知识检索 ===
    if (isDocQ || (!isScheduleQ && !isDeptQ && !isSummaryQ)) {
      results.type = results.type === 'general' ? 'document' : results.type;

      // 从问题中提取搜索词
      const searchTerms = this.extractKeywords(question, 5);
      const matched = docs.map(doc => {
        let score = 0;
        const lowerTitle = (doc.title || '').toLowerCase();
        const lowerSummary = (doc.summary || '').toLowerCase();
        const lowerContent = (doc.content || '').toLowerCase();

        searchTerms.forEach(term => {
          const lowerTerm = term.toLowerCase();
          if (lowerTitle.includes(lowerTerm)) score += 10;
          if (lowerSummary.includes(lowerTerm)) score += 5;
          if (lowerContent.includes(lowerTerm)) score += 2;
          if (doc.keywords && doc.keywords.includes(term)) score += 8;
        });

        // 直接匹配问题中的词
        if (lowerTitle.includes(lowerQ.substring(0, 4)) && lowerQ.length > 4) score += 5;

        return { doc, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

      if (matched.length > 0) {
        if (!isScheduleQ && !isDeptQ) {
          answerParts.push(`根据您的问题，找到以下${matched.length}份相关资料：`);
        }
        matched.forEach(({ doc }) => {
          const dept = departments.find(d => d.id === doc.department);
          answerParts.push(`  - 《${doc.title}》${dept ? '(' + dept.name + ')' : ''}：${doc.summary}`);
          sources.push({ type: 'document', id: doc.id, title: doc.title });
        });
      } else if (!isScheduleQ && !isDeptQ) {
        answerParts.push('未找到与您问题直接相关的资料。您可以尝试：');
        answerParts.push('  1. 使用更具体的关键词');
        answerParts.push('  2. 检查是否已上传相关文档');
        answerParts.push('  3. 查看知识图谱了解已有资料分布');
      }
    }

    // === 总结概览 ===
    if (isSummaryQ && !isScheduleQ && !isDeptQ) {
      answerParts.push('公司知识库概览：');
      answerParts.push(`  - 文档总数：${docs.length}份`);
      answerParts.push(`  - 部门数量：${departments.length}个`);
      answerParts.push(`  - 日程总数：${schedules.length}项`);
      departments.forEach(d => {
        const docCount = docs.filter(doc => doc.department === d.id).length;
        answerParts.push(`  - ${d.name}：${docCount}份文档`);
      });
    }

    // 如果没有任何匹配
    if (answerParts.length === 0) {
      answerParts.push('我是智汇中枢AI助手，可以帮您：');
      answerParts.push('  - 查询公司核心日程安排（如"近期有什么重要会议"）');
      answerParts.push('  - 检索企业内部资料（如"财务部的报告有哪些"）');
      answerParts.push('  - 了解各部门信息（如"研发中心负责什么"）');
      answerParts.push('  - 生成知识概览（如"公司整体情况"）');
      answerParts.push('  - 搜索特定关键词相关内容');
      answerParts.push('');
      answerParts.push(`当前知识库共有${docs.length}份文档，${schedules.length}项日程，覆盖${departments.length}个部门。`);
    }

    results.answer = answerParts.join('\n');
    results.sources = sources;
    return results;
  }

  priorityLabel(priority) {
    const labels = { critical: '关键', high: '重要', medium: '一般', low: '常规' };
    return labels[priority] || priority;
  }

  // 深度摘要
  generateDeepSummary(content, title) {
    if (!content) return '暂无内容可生成摘要。';

    const summary = this.generateSummary(content, title, 300);
    const keywords = this.extractKeywords(content, 10);
    const sentences = this.splitSentences(content);

    let deepSummary = `【智能摘要】\n${summary}\n\n`;
    deepSummary += `【核心关键词】\n${keywords.join('、')}\n\n`;
    deepSummary += `【文档特征】\n`;
    deepSummary += `  - 总字数：约${content.length}字\n`;
    deepSummary += `  - 句子数：${sentences.length}句\n`;
    deepSummary += `  - 信息密度：${keywords.length > 8 ? '高' : keywords.length > 4 ? '中' : '低'}\n`;

    // 提取关键数据
    const numbers = content.match(/\d+\.?\d*[%％]?/g);
    if (numbers && numbers.length > 0) {
      const uniqueNumbers = [...new Set(numbers)].slice(0, 10);
      deepSummary += `【关键数据】\n${uniqueNumbers.join('、')}\n`;
    }

    // 提取日期
    const dates = content.match(/\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?/g);
    if (dates && dates.length > 0) {
      deepSummary += `【提及日期】\n${[...new Set(dates)].slice(0, 5).join('、')}\n`;
    }

    return deepSummary;
  }

  // 相关度计算
  calculateRelevance(doc, query) {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    if (doc.title && doc.title.toLowerCase().includes(lowerQuery)) score += 10;
    if (doc.summary && doc.summary.toLowerCase().includes(lowerQuery)) score += 5;
    if (doc.keywords && doc.keywords.some(k => k.toLowerCase().includes(lowerQuery))) score += 8;
    if (doc.content && doc.content.toLowerCase().includes(lowerQuery)) score += 2;
    return score;
  }
}

module.exports = AIEngine;
