/**
 * RagService - 大模型 + RAG 问答服务（DeepSeek）
 *
 * 为智汇中枢接入真实的「检索增强生成」链路：
 *   1. 召回（Retrieval）：n-gram 关键词加权做文档粗筛，再对文档正文做滑动窗口切段、
 *      按命中数精排，选出 Top-K 段落作为上下文；日程/部门类问题额外附加结构化企业信息。
 *   2. 生成（Generation）：把检索段落 + 员工问题拼进 Prompt，调用 DeepSeek chat
 *      completions 生成式回答，要求句末标注 [来源：《文档标题》]。
 *
 * 设计要点：
 *   - 未配置 DEEPSEEK_API_KEY 时自动降级到规则引擎（answerQuestion / generateDeepSummary），
 *     保证系统无外部依赖也能完整运行；
 *   - LLM 调用异常时同样降级并附带 fallbackReason，前端无需感知。
 *   - 纯 Node 原生 fetch，无新增 npm 依赖。
 */

const API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

class RagService {
  constructor({ engine, apiKey, model } = {}) {
    this.engine = engine;
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.model = model || process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
  }

  enabled() {
    return !!this.apiKey;
  }

  // ========== 召回层 ==========

  // 滑动窗口切段：window 320 字 / overlap 80 字，优先在句末标点处断开
  splitIntoPassages(content, maxLen = 320, overlap = 80) {
    const text = (content || '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    if (text.length <= maxLen) return [text];
    const passages = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + maxLen, text.length);
      const slice = text.slice(start, end);
      const cut = Math.max(
        slice.lastIndexOf('。'),
        slice.lastIndexOf('！'),
        slice.lastIndexOf('？'),
        slice.lastIndexOf('；')
      );
      if (cut > maxLen * 0.5) end = start + cut + 1;
      passages.push(text.slice(start, end));
      start = end - overlap;
      if (start >= text.length) break;
    }
    return passages.slice(0, 30);
  }

  // 文档级粗筛 -> 段落级精排
  retrievePassages(question, docs, topDocs = 4, perDoc = 2) {
    const terms = this.engine.extractKeywords(question, 8).map((t) => t.toLowerCase());
    const empty = { passages: [], hits: [] };

    // 文档级粗筛
    const scoredDocs = docs
      .map((doc) => {
        const title = (doc.title || '').toLowerCase();
        const summary = (doc.summary || '').toLowerCase();
        const content = (doc.content || '').toLowerCase();
        const keywords = (doc.keywords || []).map((k) => k.toLowerCase());
        let score = 0;
        terms.forEach((term) => {
          if (title.includes(term)) score += 10;
          if (keywords.includes(term)) score += 8;
          if (summary.includes(term)) score += 4;
          if (content.includes(term)) score += 1;
        });
        return { doc, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topDocs);

    if (scoredDocs.length === 0) return empty;

    // 段落级精排（每个文档最多保留 perDoc 段，保证来源多样性）
    const candidates = [];
    scoredDocs.forEach(({ doc }) => {
      const source = doc.content || doc.summary || '';
      const passages = this.splitIntoPassages(source);
      (passages.length ? passages : [source]).forEach((text, idx) => {
        const low = text.toLowerCase();
        let ps = 0;
        terms.forEach((term) => {
          if (low.includes(term)) ps += 2;
        });
        if (idx === 0 && doc.summary) ps += 3; // 起始段通常含概述，额外加权
        if (ps > 0) {
          candidates.push({
            text,
            score: ps,
            doc: { id: doc.id, title: doc.title, department: doc.department }
          });
        }
      });
    });

    const perDocCount = {};
    const picked = candidates
      .sort((a, b) => b.score - a.score)
      .filter((c) => {
        const n = perDocCount[c.doc.id] || 0;
        if (n < perDoc) {
          perDocCount[c.doc.id] = n + 1;
          return true;
        }
        return false;
      })
      .slice(0, topDocs * perDoc);

    return {
      passages: picked,
      hits: scoredDocs.map((s) => ({ type: 'document', id: s.doc.id, title: s.doc.title }))
    };
  }

  // 组装上下文：文档段落 + （按需）日程/部门结构化信息
  buildContext(question, docs, schedules, departments) {
    const sources = [];
    const blocks = [];
    const { passages, hits } = this.retrievePassages(question, docs);
    sources.push(...hits);

    passages.forEach((p, i) => {
      const dept = departments.find((d) => d.id === p.doc.department);
      blocks.push(`[资料${i + 1}]《${p.doc.title}》${dept ? '(' + dept.name + ')' : ''}`);
      blocks.push(p.text);
    });

    // 日程类问题：附加未来日程
    if (/日程|安排|计划|会议|什么时候|几点|日期|deadline|截止|到期/.test(question)) {
      const today = new Date().toISOString().split('T')[0];
      const upcoming = schedules
        .filter((s) => s.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);
      if (upcoming.length) {
        blocks.push('[企业日程]');
        upcoming.forEach((s) => {
          const dept = departments.find((d) => d.id === s.department);
          const pri = this.engine.priorityLabel ? this.engine.priorityLabel(s.priority) : s.priority;
          blocks.push(`- ${s.date} ${s.time} ${s.title}(${dept ? dept.name : '全公司'}，${pri})：${s.description}`);
          sources.push({ type: 'schedule', id: s.id, title: s.title });
        });
      }
    }

    // 部门类问题：附加目标部门或部门概览
    if (/部门|团队|谁负责|哪个部门|负责人|组织/.test(question)) {
      let target = null;
      departments.forEach((d) => {
        if (question.includes(d.name) || question.includes(d.code)) target = d;
      });
      if (target) {
        blocks.push('[部门信息]');
        blocks.push(`- ${target.name}(${target.code})：负责人 ${target.head}，团队 ${target.memberCount} 人`);
        blocks.push(`- 核心职责：${target.coreResponsibilities.join('、')}`);
        if (target.keyMetrics && target.keyMetrics.length) {
          blocks.push(`- 关键指标：${target.keyMetrics.map((m) => m.label + ' ' + m.value).join('；')}`);
        }
        sources.push({ type: 'department', id: target.id, title: target.name });
      } else {
        blocks.push('[部门概览]');
        departments.forEach((d) => {
          blocks.push(`- ${d.name}(${d.code})：${d.memberCount}人，负责人 ${d.head}`);
        });
      }
    }

    return { text: blocks.join('\n') || '(资料库中暂无可用内容)', sources };
  }

  // ========== 生成层 ==========

  async callLLM(systemPrompt, userPrompt) {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.apiKey
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        stream: false
      }),
      signal: AbortSignal.timeout(90000)
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw new Error('LLM API ' + resp.status + ': ' + detail.slice(0, 200));
    }
    const data = await resp.json();
    const text =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    if (!text) throw new Error('LLM 返回空内容');
    return text.trim();
  }

  // RAG 问答（LLM 优先，异常/未配置自动降级规则引擎）
  async chat(question, docs, schedules, departments) {
    if (!this.enabled()) {
      const r = this.engine.answerQuestion(question, docs, schedules, departments);
      return Object.assign({}, r, { engine: 'rule' });
    }
    try {
      const ctx = this.buildContext(question, docs, schedules, departments);
      const system =
        '你是"智汇中枢"，一家企业的内部知识管理 AI 助手。请只依据下方提供的企业资料回答员工的问题。' +
        '规则：1) 严格基于资料，不得编造资料中不存在的信息；' +
        '2) 资料不足以回答时，明确说明"资料库中未找到相关信息"，并给出可补充资料的部门建议；' +
        '3) 使用简体中文，条理清晰、适当分点；' +
        '4) 引用资料内容时在对应句末标注 [来源：《文档标题》]。';
      const userMsg = '【企业资料】\n' + ctx.text + '\n\n【员工问题】\n' + question;
      const answer = await this.callLLM(system, userMsg);
      return {
        answer,
        sources: ctx.sources,
        type: 'llm-rag',
        engine: 'llm',
        model: this.model
      };
    } catch (err) {
      const r = this.engine.answerQuestion(question, docs, schedules, departments);
      return Object.assign({}, r, { engine: 'rule-fallback', fallbackReason: err.message });
    }
  }

  // 深度摘要（LLM 优先，异常/未配置降级规则引擎）
  async summarize(content, title) {
    if (!this.enabled()) {
      return { summary: this.engine.generateDeepSummary(content, title), engine: 'rule' };
    }
    try {
      const text = (content || '').slice(0, 12000);
      const system =
        '你是企业内部知识库的资深分析师。请对文档做结构化深度摘要，使用简体中文，400 字以内，分点输出：' +
        '核心内容、关键数据、重要结论、行动建议。不得编造文档中不存在的信息。';
      const userMsg = '【文档标题】' + (title || '未命名') + '\n【文档正文】\n' + text;
      const summary = await this.callLLM(system, userMsg);
      return { summary, engine: 'llm', model: this.model };
    } catch (err) {
      return {
        summary: this.engine.generateDeepSummary(content, title),
        engine: 'rule-fallback',
        fallbackReason: err.message
      };
    }
  }
}

module.exports = RagService;
