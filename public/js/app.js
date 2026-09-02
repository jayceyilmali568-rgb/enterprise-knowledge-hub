/**
 * 智汇中枢 - 前端应用主逻辑
 * Enterprise Knowledge Hub - Frontend Application
 */

const App = {
  currentPage: 'dashboard',
  departments: [],
  documents: [],
  schedules: [],
  selectedFiles: [],
  uploadTab: 'file',
  chatHistory: [],
  graphNodes: [],
  graphLinks: [],
  graphCanvas: null,
  graphCtx: null,
  graphAnimation: null,

  // ========== 初始化 ==========
  async init() {
    await this.loadDepartments();
    await this.loadDashboard();
    this.populateDepartmentSelects();
    this.bindEvents();
  },

  bindEvents() {
    // AI输入框回车发送
    document.getElementById('ai-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendAIMessage();
      }
    });
  },

  // ========== API 调用 ==========
  async api(url, options = {}) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      this.showToast('网络请求失败，请检查服务是否运行', 'error');
      return null;
    }
  },

  async apiUpload(url, formData) {
    try {
      const res = await fetch(url, { method: 'POST', body: formData });
      return await res.json();
    } catch (err) {
      console.error('Upload Error:', err);
      this.showToast('上传失败，请重试', 'error');
      return null;
    }
  },

  // ========== 数据加载 ==========
  async loadDepartments() {
    const data = await this.api('/api/departments');
    if (data) this.departments = data;
  },

  async loadDashboard() {
    const data = await this.api('/api/dashboard');
    if (!data) return;
    this.renderDashboard(data);
    // 更新徽章
    document.getElementById('doc-badge').textContent = data.docStats.total;
    const today = new Date().toISOString().split('T')[0];
    const urgent = data.upcomingSchedules.filter(s => s.priority === 'critical').length;
    document.getElementById('sch-badge').textContent = urgent;
  },

  // ========== 页面导航 ==========
  navigate(page) {
    this.currentPage = page;
    // 更新导航激活状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    // 更新标题
    const titles = {
      dashboard: '总览仪表盘',
      documents: '文档中心',
      assistant: 'AI知识助手',
      schedule: '核心日程',
      departments: '部门信息中枢',
      graph: '知识图谱',
      search: '全局搜索'
    };
    document.getElementById('page-title').textContent = titles[page] || '';

    // 渲染对应页面
    const container = document.getElementById('page-container');
    switch (page) {
      case 'dashboard': this.renderDashboardPage(); break;
      case 'documents': this.renderDocumentsPage(); break;
      case 'assistant': this.renderAssistantPage(); break;
      case 'schedule': this.renderSchedulePage(); break;
      case 'departments': this.renderDepartmentsPage(); break;
      case 'graph': this.renderGraphPage(); break;
      case 'search': this.renderSearchPage(); break;
    }

    // 关闭移动端侧边栏
    document.getElementById('sidebar').classList.remove('open');
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
  },

  // ========== 仪表盘页面 ==========
  async renderDashboardPage() {
    const data = await this.api('/api/dashboard');
    if (!data) return;
    this.renderDashboard(data);
  },

  renderDashboard(data) {
    const container = document.getElementById('page-container');
    if (!data) return;

    const { docStats, upcomingSchedules, criticalSchedules, departments, totalDepartments, totalMembers } = data;

    const deptName = (id) => departments.find(d => d.id === id)?.name || '全公司';
    const deptColor = (id) => departments.find(d => d.id === id)?.color || '#999';
    const priorityLabel = (p) => ({ critical: '关键', high: '重要', medium: '一般', low: '常规' }[p] || p);
    const priorityClass = (p) => ({ critical: 'critical', high: 'high', medium: 'medium', low: 'low' }[p] || 'low');

    const typeIcons = {
      meeting: '🎯', deadline: '⏰', event: '🎉', review: '📋'
    };

    container.innerHTML = `
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📁</div>
          <div class="stat-label">知识库文档</div>
          <div class="stat-value">${docStats.total}</div>
          <div class="stat-trend up">AI已处理 ${data.aiProcessed} 份</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-icon">🏢</div>
          <div class="stat-label">覆盖部门</div>
          <div class="stat-value">${totalDepartments}</div>
          <div class="stat-trend">总人数 ${totalMembers} 人</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon">📅</div>
          <div class="stat-label">核心日程</div>
          <div class="stat-value">${criticalSchedules.length}</div>
          <div class="stat-trend up">待办 ${upcomingSchedules.length} 项</div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">🧠</div>
          <div class="stat-label">知识节点</div>
          <div class="stat-value">${data.knowledgeNodes}</div>
          <div class="stat-trend">AI整合率 ${docStats.total > 0 ? Math.round(data.aiProcessed / docStats.total * 100) : 0}%</div>
        </div>
      </div>

      <!-- 核心日程 + 部门概览 -->
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title">🎯 核心日程看板</span>
            <button class="btn btn-sm btn-primary" onclick="App.openScheduleModal()">+ 新建日程</button>
          </div>
          <div class="card-body">
            ${upcomingSchedules.length > 0 ? `
              <div class="timeline">
                ${upcomingSchedules.map(s => `
                  <div class="timeline-item">
                    <div class="timeline-dot ${priorityClass(s.priority)}">${typeIcons[s.type] || '📌'}</div>
                    <div class="timeline-content">
                      <div class="timeline-title">${s.title}</div>
                      <div class="timeline-meta">
                        <span>📅 ${s.date}</span>
                        <span>⏰ ${s.time}</span>
                        <span>🏢 ${deptName(s.department)}</span>
                        <span class="schedule-priority-badge priority-${s.priority}">${priorityLabel(s.priority)}</span>
                      </div>
                      <div class="timeline-desc">${s.description}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-title">暂无日程</div>
                <div class="empty-state-desc">点击右上角创建新的核心日程</div>
              </div>
            `}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">📊 知识分布</span>
          </div>
          <div class="card-body">
            ${Object.keys(docStats.byDepartment).length > 0 ? `
              <div style="display:flex;flex-direction:column;gap:12px;">
                ${Object.entries(docStats.byDepartment).map(([deptId, count]) => {
                  const max = Math.max(...Object.values(docStats.byDepartment));
                  const pct = max > 0 ? (count / max * 100) : 0;
                  return `
                    <div>
                      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:13px;font-weight:600;color:var(--text-primary);">
                          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${deptColor(deptId)};margin-right:6px;"></span>
                          ${deptName(deptId)}
                        </span>
                        <span style="font-size:12px;color:var(--text-tertiary);">${count} 份</span>
                      </div>
                      <div style="height:6px;background:var(--bg-hover);border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${deptColor(deptId)};border-radius:3px;transition:width 0.5s;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-desc">上传文档后将显示分布</div></div>'}
          </div>
        </div>
      </div>

      <!-- 最近上传 + 部门快览 -->
      <div class="dashboard-row">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📥 最近上传</span>
            <span style="font-size:12px;color:var(--primary);cursor:pointer;font-weight:500;" onclick="App.navigate('documents')">查看全部 →</span>
          </div>
          <div class="card-body">
            ${docStats.recentUploads.length > 0 ? `
              <div class="doc-list">
                ${docStats.recentUploads.map(doc => `
                  <div class="doc-item" onclick="App.showDocDetail('${doc.id}')">
                    <div class="doc-icon">📄</div>
                    <div class="doc-info">
                      <div class="doc-title-row">
                        <span class="doc-title">${doc.title}</span>
                        <span class="doc-type-badge">${doc.type || 'other'}</span>
                      </div>
                      <div class="doc-summary">${doc.summary || '暂无摘要'}</div>
                      <div class="doc-meta">
                        <span>🏢 ${deptName(doc.department)}</span>
                        <span>📅 ${this.formatDate(doc.uploadDate)}</span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<div class="empty-state"><div class="empty-state-icon">📥</div><div class="empty-state-title">暂无文档</div><div class="empty-state-desc">上传企业资料，AI将自动整合</div></div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">🏢 部门快览</span>
          </div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              ${departments.map(d => `
                <div class="dept-card" style="padding:12px;border-top-color:${d.color};" onclick="App.navigate('departments')">
                  <div style="font-size:13px;font-weight:700;">${d.name}</div>
                  <div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;">${d.head} · ${d.memberCount}人</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ========== 文档中心页面 ==========
  async renderDocumentsPage() {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="doc-toolbar">
        <button class="btn btn-primary" onclick="App.openUploadModal()">📎 上传文档</button>
        <button class="btn btn-secondary" onclick="App.openUploadModal()">✍️ 文本录入</button>
        <select class="filter-select" id="doc-filter-dept" onchange="App.loadDocuments()">
          <option value="all">全部部门</option>
          ${this.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
        <select class="filter-select" id="doc-filter-type" onchange="App.loadDocuments()">
          <option value="all">全部类型</option>
          <option value="report">分析报告</option>
          <option value="policy">制度规范</option>
          <option value="plan">计划方案</option>
          <option value="contract">合同协议</option>
          <option value="manual">操作手册</option>
          <option value="meeting">会议纪要</option>
          <option value="training">培训资料</option>
          <option value="data">数据报表</option>
          <option value="other">其他</option>
        </select>
        <input type="text" class="filter-input" id="doc-search" placeholder="搜索文档标题、关键词..." onkeyup="App.loadDocuments()">
      </div>
      <div id="doc-list-container">
        <div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-desc">正在加载...</div></div>
      </div>
    `;
    await this.loadDocuments();
  },

  async loadDocuments() {
    const dept = document.getElementById('doc-filter-dept')?.value || 'all';
    const type = document.getElementById('doc-filter-type')?.value || 'all';
    const keyword = document.getElementById('doc-search')?.value || '';
    const docs = await this.api(`/api/documents?department=${dept}&type=${type}&keyword=${encodeURIComponent(keyword)}`);
    const container = document.getElementById('doc-list-container');

    if (!docs || docs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-title">暂无文档</div>
          <div class="empty-state-desc">上传企业资料，AI将自动分类、提取关键词并生成摘要</div>
        </div>
      `;
      return;
    }

    const deptName = (id) => this.departments.find(d => d.id === id)?.name || '未分类';
    const typeLabel = (t) => ({
      report: '分析报告', policy: '制度规范', plan: '计划方案', contract: '合同协议',
      manual: '操作手册', meeting: '会议纪要', training: '培训资料', data: '数据报表', other: '其他'
    }[t] || '其他');

    container.innerHTML = `
      <div class="doc-list">
        ${docs.map(doc => `
          <div class="doc-item" onclick="App.showDocDetail('${doc.id}')">
            <div class="doc-icon">${this.getFileIcon(doc.originalName)}</div>
            <div class="doc-info">
              <div class="doc-title-row">
                <span class="doc-title">${doc.title}</span>
                <span class="doc-type-badge">${typeLabel(doc.type)}</span>
                ${doc.tags && doc.tags.length > 0 ? doc.tags.slice(0, 3).map(t => `<span class="doc-keyword" style="background:var(--primary-light);color:var(--primary);">${t}</span>`).join('') : ''}
              </div>
              <div class="doc-summary">${doc.summary || '暂无摘要'}</div>
              <div class="doc-meta">
                <span>🏢 ${deptName(doc.department)}</span>
                <span>👤 ${doc.uploader}</span>
                <span>📅 ${this.formatDate(doc.uploadDate)}</span>
                <span>📊 ${(doc.fileSize / 1024).toFixed(1)}KB</span>
              </div>
              ${doc.keywords && doc.keywords.length > 0 ? `
                <div class="doc-keywords">
                  ${doc.keywords.slice(0, 8).map(k => `<span class="doc-keyword">${k}</span>`).join('')}
                </div>
              ` : ''}
            </div>
            <div class="doc-actions">
              <div class="doc-score">
                <span>重要性</span>
                <div class="score-bar"><div class="score-fill" style="width:${Math.min((doc.aiScore || 5) * 3.3, 100)}%"></div></div>
              </div>
              <button class="doc-action-btn" onclick="event.stopPropagation();App.showDocDetail('${doc.id}')">详情</button>
              <button class="doc-action-btn danger" onclick="event.stopPropagation();App.deleteDocument('${doc.id}')">删除</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  getFileIcon(name) {
    if (!name) return '📄';
    const ext = name.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
      ppt: '📙', pptx: '📙', txt: '📄', md: '📝', json: '⚙️', csv: '📊'
    };
    return icons[ext] || '📄';
  },

  async showDocDetail(id) {
    const data = await this.api(`/api/documents/${id}`);
    if (!data) return;
    const { document: doc, related } = data;

    document.getElementById('doc-detail-title').textContent = doc.title;
    const deptName = (id) => this.departments.find(d => d.id === id)?.name || '未分类';

    document.getElementById('doc-detail-body').innerHTML = `
      <div class="doc-detail-section">
        <div class="doc-detail-label">基本信息</div>
        <div class="doc-detail-content" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>📄 原始文件: ${doc.originalName}</div>
          <div>🏢 部门: ${deptName(doc.department)}</div>
          <div>👤 上传者: ${doc.uploader}</div>
          <div>📅 上传时间: ${this.formatDateTime(doc.uploadDate)}</div>
          <div>📊 文件大小: ${(doc.fileSize / 1024).toFixed(1)}KB</div>
          <div>🔒 访问级别: ${doc.accessLevel}</div>
        </div>
      </div>

      <div class="doc-detail-section">
        <div class="doc-detail-label">AI摘要</div>
        <div class="doc-detail-content" style="background:var(--bg);padding:12px;border-radius:8px;">
          ${doc.summary || '暂无摘要'}
        </div>
      </div>

      <div class="doc-detail-section">
        <div class="doc-detail-label">关键词</div>
        <div class="doc-detail-content">
          ${doc.keywords && doc.keywords.length > 0 ? doc.keywords.map(k => `<span class="doc-keyword" style="display:inline-block;margin:2px;">${k}</span>`).join('') : '无'}
        </div>
      </div>

      <div class="doc-detail-section">
        <div class="doc-detail-label">标签</div>
        <div class="doc-detail-content">
          ${doc.tags && doc.tags.length > 0 ? doc.tags.map(t => `<span class="doc-type-badge" style="display:inline-block;margin:2px;">${t}</span>`).join('') : '无'}
        </div>
      </div>

      <div class="doc-detail-section">
        <div class="doc-detail-label">文档内容</div>
        <div class="doc-detail-content">
          <pre>${(doc.content || '无内容').substring(0, 3000)}${doc.content && doc.content.length > 3000 ? '\n\n... (内容已截断，完整内容请查看原文件)' : ''}</pre>
        </div>
      </div>

      ${related && related.length > 0 ? `
        <div class="doc-detail-section">
          <div class="doc-detail-label">关联文档 (${related.length})</div>
          <div class="doc-detail-content">
            ${related.map(r => `
              <div class="doc-item" style="margin-bottom:8px;" onclick="App.showDocDetail('${r.id}')">
                <div class="doc-icon">${this.getFileIcon(r.originalName)}</div>
                <div class="doc-info">
                  <div class="doc-title">${r.title}</div>
                  <div class="doc-summary">${r.summary || ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" onclick="App.generateDeepSummary('${doc.id}')">🧠 生成深度摘要</button>
        <button class="btn btn-secondary" onclick="App.askAIAboutDoc('${doc.id}')">💬 问AI关于此文档</button>
      </div>
    `;
    this.openModal('doc-detail-modal');
  },

  async generateDeepSummary(id) {
    this.showToast('AI正在生成深度摘要...', 'info');
    const data = await this.api(`/api/ai/summarize/${id}`, { method: 'POST' });
    if (!data) return;
    const body = document.getElementById('doc-detail-body');
    const existing = body.querySelector('#deep-summary-section');
    if (existing) existing.remove();
    const section = document.createElement('div');
    section.id = 'deep-summary-section';
    section.className = 'doc-detail-section';
    section.innerHTML = `
      <div class="doc-detail-label">🧠 AI深度摘要</div>
      <div class="doc-detail-content" style="background:linear-gradient(135deg,var(--primary-light),#fff);padding:16px;border-radius:8px;border:1px solid var(--primary);">
        <pre style="white-space:pre-wrap;font-family:inherit;">${data.summary}</pre>
      </div>
    `;
    body.appendChild(section);
    this.showToast('深度摘要已生成', 'success');
  },

  askAIAboutDoc(id) {
    this.closeModal('doc-detail-modal');
    this.navigate('assistant');
    setTimeout(() => {
      const input = document.getElementById('ai-input');
      if (input) {
        input.value = `请详细介绍文档 ${id} 的核心内容`;
        input.focus();
      }
    }, 300);
  },

  async deleteDocument(id) {
    if (!confirm('确定删除此文档？此操作不可恢复。')) return;
    const data = await this.api(`/api/documents/${id}`, { method: 'DELETE' });
    if (data && data.success) {
      this.showToast('文档已删除', 'success');
      this.loadDocuments();
    }
  },

  // ========== AI助手页面 ==========
  renderAssistantPage() {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="ai-container">
        <div class="ai-header">
          <h2>🤖 智汇中枢 AI助手</h2>
          <p>基于企业内部知识库的智能问答 · 支持文档检索、日程查询、部门信息</p>
        </div>
        <div class="ai-messages" id="ai-messages">
          <div class="ai-message">
            <div class="ai-avatar bot">🧠</div>
            <div class="ai-bubble">
              您好！我是智汇中枢AI助手。我可以帮您：
              1. 查询公司核心日程（"近期有什么重要会议？"）
              2. 检索内部资料（"财务部的报告有哪些？"）
              3. 了解部门信息（"研发中心负责什么？"）
              4. 生成知识概览（"公司整体情况如何？"）

              请问有什么可以帮您？
              <div class="ai-suggestions">
                <span class="ai-suggestion" onclick="App.quickAsk('公司核心日程有哪些？')">📅 核心日程</span>
                <span class="ai-suggestion" onclick="App.quickAsk('各部门概览')">🏢 部门概览</span>
                <span class="ai-suggestion" onclick="App.quickAsk('公司知识库整体情况')">📊 知识概览</span>
              </div>
            </div>
          </div>
        </div>
        <div class="ai-input-area">
          <div class="ai-input-wrapper">
            <textarea class="ai-input" id="ai-input" placeholder="输入您的问题... (Enter发送，Shift+Enter换行)" rows="1"></textarea>
            <button class="ai-send-btn" onclick="App.sendAIMessage()">➤</button>
          </div>
        </div>
      </div>
    `;

    // 加载历史
    this.loadChatHistory();
    // 绑定输入框
    const input = document.getElementById('ai-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendAIMessage();
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  },

  async loadChatHistory() {
    const history = await this.api('/api/ai/history');
    if (!history || history.length === 0) return;
    const container = document.getElementById('ai-messages');
    // 保留欢迎消息
    const welcome = container.firstElementChild;
    container.innerHTML = '';
    container.appendChild(welcome);
    history.forEach(msg => {
      this.appendAIMessage(msg.role, msg.content, msg.sources);
    });
    container.scrollTop = container.scrollHeight;
  },

  appendAIMessage(role, content, sources) {
    const container = document.getElementById('ai-messages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = `ai-message ${role}`;
    const avatar = role === 'user' ? '👤' : '🧠';
    const sourcesHtml = sources && sources.length > 0 ? `
      <div class="ai-sources">
        <span style="font-size:11px;color:var(--text-tertiary);">来源:</span>
        ${sources.map(s => `<span class="ai-source-chip" onclick="App.openSource('${s.type}','${s.id}')">${s.title}</span>`).join('')}
      </div>
    ` : '';
    msg.innerHTML = `
      <div class="ai-avatar ${role === 'user' ? 'user' : 'bot'}">${avatar}</div>
      <div class="ai-bubble">${this.escapeHtml(content)}${sourcesHtml}</div>
    `;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  },

  async sendAIMessage() {
    const input = document.getElementById('ai-input');
    const message = input.value.trim();
    if (!message) return;

    this.appendAIMessage('user', message);
    input.value = '';
    input.style.height = 'auto';

    // 显示加载状态
    const container = document.getElementById('ai-messages');
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-message';
    loadingMsg.id = 'ai-loading';
    loadingMsg.innerHTML = `
      <div class="ai-avatar bot">🧠</div>
      <div class="ai-bubble"><span style="opacity:0.6;">正在检索知识库...</span></div>
    `;
    container.appendChild(loadingMsg);
    container.scrollTop = container.scrollHeight;

    const data = await this.api('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    loadingMsg.remove();
    if (data) {
      this.appendAIMessage('assistant', data.answer, data.sources);
    } else {
      this.appendAIMessage('assistant', '抱歉，处理您的问题时出现了错误，请稍后重试。', []);
    }
  },

  quickAsk(question) {
    const input = document.getElementById('ai-input');
    if (input) {
      input.value = question;
      this.sendAIMessage();
    }
  },

  openSource(type, id) {
    if (type === 'document') this.showDocDetail(id);
    else if (type === 'schedule') this.navigate('schedule');
    else if (type === 'department') this.navigate('departments');
  },

  // ========== 日程页面 ==========
  async renderSchedulePage() {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div class="schedule-header">
        <div class="schedule-filters">
          <select class="filter-select" id="sch-filter-dept" onchange="App.loadSchedules()">
            <option value="all">全部部门</option>
            ${this.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
          <select class="filter-select" id="sch-filter-priority" onchange="App.loadSchedules()">
            <option value="all">全部优先级</option>
            <option value="critical">关键</option>
            <option value="high">重要</option>
            <option value="medium">一般</option>
            <option value="low">常规</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="App.openScheduleModal()">+ 新建日程</button>
      </div>
      <div id="schedule-list-container"></div>
    `;
    await this.loadSchedules();
  },

  async loadSchedules() {
    const dept = document.getElementById('sch-filter-dept')?.value || 'all';
    const priority = document.getElementById('sch-filter-priority')?.value || 'all';
    const schedules = await this.api(`/api/schedules?department=${dept}&priority=${priority}`);
    const container = document.getElementById('schedule-list-container');

    if (!schedules || schedules.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <div class="empty-state-title">暂无日程</div>
          <div class="empty-state-desc">点击右上角创建新的核心日程安排</div>
        </div>
      `;
      return;
    }

    const deptName = (id) => this.departments.find(d => d.id === id)?.name || '全公司';
    const priorityLabel = (p) => ({ critical: '关键', high: '重要', medium: '一般', low: '常规' }[p] || p);
    const typeIcons = { meeting: '🎯', deadline: '⏰', event: '🎉', review: '📋' };

    container.innerHTML = `
      <div class="schedule-list">
        ${schedules.map(s => {
          const date = new Date(s.date);
          const day = date.getDate();
          const month = (date.getMonth() + 1) + '月';
          return `
            <div class="schedule-item">
              <div class="schedule-date">
                <div class="schedule-day">${day}</div>
                <div class="schedule-month">${month}</div>
              </div>
              <div class="schedule-content">
                <div class="schedule-title">
                  ${typeIcons[s.type] || '📌'} ${s.title}
                  <span class="schedule-priority-badge priority-${s.priority}">${priorityLabel(s.priority)}</span>
                </div>
                <div class="schedule-meta">
                  <span>⏰ ${s.time}</span>
                  <span>🏢 ${deptName(s.department)}</span>
                  <span>📍 ${s.location || '待定'}</span>
                </div>
                <div class="schedule-desc">${s.description}</div>
                ${s.participants ? `<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">👥 参与者: ${s.participants.join('、')}</div>` : ''}
              </div>
              <div class="doc-actions">
                <button class="doc-action-btn danger" onclick="App.deleteSchedule('${s.id}')">删除</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  async deleteSchedule(id) {
    if (!confirm('确定删除此日程？')) return;
    const data = await this.api(`/api/schedules/${id}`, { method: 'DELETE' });
    if (data && data.success) {
      this.showToast('日程已删除', 'success');
      this.loadSchedules();
    }
  },

  // ========== 部门页面 ==========
  async renderDepartmentsPage() {
    const container = document.getElementById('page-container');
    container.innerHTML = '<div id="dept-container"><div class="empty-state"><div class="empty-state-icon">⏳</div><div class="empty-state-desc">加载中...</div></div></div>';
    await this.loadDepartments();
    this.renderDepartments();
  },

  renderDepartments() {
    const container = document.getElementById('dept-container');
    if (!this.departments || this.departments.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏢</div><div class="empty-state-title">暂无部门数据</div></div>';
      return;
    }

    container.innerHTML = `
      <div class="dept-grid">
        ${this.departments.map(d => `
          <div class="dept-card" style="border-top-color:${d.color};" onclick="App.showDeptDetail('${d.id}')">
            <div class="dept-header">
              <span class="dept-name">${d.name}</span>
              <span class="dept-code" style="background:${d.color};">${d.code}</span>
            </div>
            <div class="dept-desc">${d.description}</div>
            <div class="dept-info">
              <span>👤 负责人: ${d.head}</span>
              <span>👥 ${d.memberCount}人</span>
              <span>📄 ${d.docCount || 0}份文档</span>
            </div>
            <div class="dept-metrics">
              ${d.keyMetrics.map(m => `
                <div class="dept-metric">
                  <div class="dept-metric-value" style="color:${d.color};">${m.value}</div>
                  <div class="dept-metric-label">${m.label}</div>
                </div>
              `).join('')}
            </div>
            <div class="dept-tags">
              ${d.coreResponsibilities.map(r => `<span class="dept-tag">${r}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async showDeptDetail(id) {
    const data = await this.api(`/api/departments/${id}`);
    if (!data) return;
    const { department: dept, documents: docs, schedules: schs } = data;

    document.getElementById('doc-detail-title').textContent = dept.name + ' - 部门详情';
    document.getElementById('doc-detail-body').innerHTML = `
      <div class="doc-detail-section">
        <div class="doc-detail-label">部门信息</div>
        <div class="doc-detail-content" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>🏢 部门: ${dept.name} (${dept.code})</div>
          <div>👤 负责人: ${dept.head}</div>
          <div>👥 团队规模: ${dept.memberCount}人</div>
          <div>📄 相关文档: ${docs.length}份</div>
        </div>
      </div>
      <div class="doc-detail-section">
        <div class="doc-detail-label">部门描述</div>
        <div class="doc-detail-content">${dept.description}</div>
      </div>
      <div class="doc-detail-section">
        <div class="doc-detail-label">核心职责</div>
        <div class="doc-detail-content">
          ${dept.coreResponsibilities.map(r => `<span class="dept-tag" style="display:inline-block;margin:2px;">${r}</span>`).join('')}
        </div>
      </div>
      <div class="doc-detail-section">
        <div class="doc-detail-label">关键指标</div>
        <div class="doc-detail-content" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          ${dept.keyMetrics.map(m => `
            <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;">
              <div style="font-size:20px;font-weight:700;color:${dept.color};">${m.value}</div>
              <div style="font-size:12px;color:var(--text-tertiary);">${m.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${docs.length > 0 ? `
        <div class="doc-detail-section">
          <div class="doc-detail-label">相关文档 (${docs.length})</div>
          <div class="doc-detail-content">
            ${docs.slice(0, 5).map(doc => `
              <div class="doc-item" style="margin-bottom:8px;" onclick="App.showDocDetail('${doc.id}')">
                <div class="doc-icon">${this.getFileIcon(doc.originalName)}</div>
                <div class="doc-info">
                  <div class="doc-title">${doc.title}</div>
                  <div class="doc-summary">${doc.summary || ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${schs.length > 0 ? `
        <div class="doc-detail-section">
          <div class="doc-detail-label">相关日程 (${schs.length})</div>
          <div class="doc-detail-content">
            ${schs.map(s => `<div style="padding:8px 0;border-bottom:1px solid var(--border-light);">📅 ${s.date} ${s.time} - ${s.title}</div>`).join('')}
          </div>
        </div>
      ` : ''}
    `;
    this.openModal('doc-detail-modal');
  },

  // ========== 知识图谱页面 ==========
  async renderGraphPage() {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <p style="font-size:13px;color:var(--text-tertiary);">企业知识关联图谱 · 节点大小反映文档重要性，连线代表关联关系</p>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-sm btn-secondary" onclick="App.refreshGraph()">🔄 刷新</button>
        </div>
      </div>
      <div class="graph-container">
        <canvas class="graph-canvas" id="graph-canvas"></canvas>
        <div class="graph-legend">
          <div class="legend-item"><div class="legend-dot" style="background:var(--primary);"></div>部门节点</div>
          <div class="legend-item"><div class="legend-dot" style="background:#666;"></div>文档节点</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--accent);width:20px;height:2px;border-radius:0;"></div>关键词关联</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--success);width:20px;height:2px;border-radius:0;"></div>部门归属</div>
        </div>
        <div class="graph-tooltip" id="graph-tooltip"></div>
      </div>
    `;
    await this.loadAndRenderGraph();
  },

  async loadAndRenderGraph() {
    const data = await this.api('/api/knowledge-graph');
    if (!data) return;
    this.graphNodes = data.nodes;
    this.graphLinks = data.links;
    this.renderGraphCanvas();
  },

  refreshGraph() {
    this.loadAndRenderGraph();
  },

  renderGraphCanvas() {
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // 力导向布局简化版
    const nodes = this.graphNodes.map((n, i) => {
      const angle = (i / this.graphNodes.length) * Math.PI * 2;
      const radius = n.type === 'department' ? 150 : 250 + Math.random() * 100;
      return {
        ...n,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      };
    });

    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    // 力导向迭代
    const runForceLayout = (iterations) => {
      for (let iter = 0; iter < iterations; iter++) {
        // 排斥力
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            const force = 500 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }

        // 吸引力（连线）
        this.graphLinks.forEach(link => {
          const s = nodeMap[link.source];
          const t = nodeMap[link.target];
          if (!s || !t) return;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const force = (dist - 100) * 0.01;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        });

        // 中心引力
        nodes.forEach(n => {
          const dx = cx - n.x;
          const dy = cy - n.y;
          n.vx += dx * 0.001;
          n.vy += dy * 0.001;
        });

        // 更新位置
        nodes.forEach(n => {
          n.x += n.vx * 0.1;
          n.y += n.vy * 0.1;
          n.vx *= 0.9;
          n.vy *= 0.9;
          // 边界
          n.x = Math.max(30, Math.min(canvas.width - 30, n.x));
          n.y = Math.max(30, Math.min(canvas.height - 30, n.y));
        });
      }
    };

    runForceLayout(200);

    // 绘制
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制连线
      this.graphLinks.forEach(link => {
        const s = nodeMap[link.source];
        const t = nodeMap[link.target];
        if (!s || !t) return;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (link.type === 'keyword') {
          ctx.strokeStyle = 'rgba(232, 93, 117, 0.3)';
          ctx.lineWidth = 1;
        } else if (link.type === 'belongs') {
          ctx.strokeStyle = 'rgba(39, 174, 96, 0.4)';
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(79, 124, 255, 0.2)';
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      });

      // 绘制节点
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(n.size || 15, 8), 0, Math.PI * 2);
        ctx.fillStyle = n.color || '#666';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 标签
        ctx.fillStyle = '#333';
        ctx.font = n.type === 'department' ? 'bold 13px sans-serif' : '11px sans-serif';
        ctx.textAlign = 'center';
        const label = n.label.length > 10 ? n.label.substring(0, 10) + '...' : n.label;
        ctx.fillText(label, n.x, n.y + (n.size || 15) + 15);
      });
    };

    draw();

    // 鼠标交互
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const tooltip = document.getElementById('graph-tooltip');

      let hovered = null;
      for (const n of nodes) {
        const dx = mx - n.x;
        const dy = my - n.y;
        if (Math.sqrt(dx * dx + dy * dy) < (n.size || 15) + 5) {
          hovered = n;
          break;
        }
      }

      if (hovered) {
        canvas.style.cursor = 'pointer';
        tooltip.style.display = 'block';
        tooltip.style.left = (mx + 15) + 'px';
        tooltip.style.top = (my + 15) + 'px';
        tooltip.innerHTML = `<strong>${hovered.label}</strong><br>类型: ${hovered.type === 'department' ? '部门' : '文档'}`;
      } else {
        canvas.style.cursor = 'default';
        tooltip.style.display = 'none';
      }
    };

    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const n of nodes) {
        const dx = mx - n.x;
        const dy = my - n.y;
        if (Math.sqrt(dx * dx + dy * dy) < (n.size || 15) + 5) {
          if (n.type === 'department') this.showDeptDetail(n.id);
          else this.showDocDetail(n.id);
          break;
        }
      }
    };

    // 持续轻微动画
    let frame = 0;
    const animate = () => {
      frame++;
      if (frame % 3 === 0) {
        runForceLayout(1);
        draw();
      }
      this.graphAnimation = requestAnimationFrame(animate);
    };
    // animate(); // 取消注释启用持续动画
  },

  // ========== 搜索页面 ==========
  renderSearchPage() {
    const container = document.getElementById('page-container');
    const query = document.getElementById('global-search-input')?.value || '';
    container.innerHTML = `
      <div style="margin-bottom:16px;">
        <input type="text" class="filter-input" id="search-input" placeholder="搜索文档、日程、部门..." value="${this.escapeHtml(query)}" onkeyup="App.handleSearch(event)" style="font-size:16px;padding:12px 20px;">
      </div>
      <div id="search-results-container">
        ${query ? '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-desc">正在搜索...</div></div>' : `
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">全局搜索</div>
            <div class="empty-state-desc">输入关键词，同时搜索文档、日程和部门信息</div>
          </div>
        `}
      </div>
    `;
    if (query) this.performSearch(query);
    document.getElementById('search-input')?.focus();
  },

  handleSearch(e) {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query) this.performSearch(query);
    }
  },

  handleGlobalSearch(e) {
    if (e.key === 'Enter') {
      this.navigate('search');
    }
  },

  async performSearch(query) {
    const data = await this.api(`/api/search?q=${encodeURIComponent(query)}`);
    const container = document.getElementById('search-results-container');
    if (!data) return;

    const deptName = (id) => this.departments.find(d => d.id === id)?.name || '未分类';
    const highlight = (text) => {
      if (!text) return '';
      const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
      return this.escapeHtml(text).replace(regex, '<span class="search-highlight">$1</span>');
    };

    if (data.totalResults === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">未找到相关结果</div>
          <div class="empty-state-desc">没有找到与"${this.escapeHtml(query)}"相关的内容</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="search-results">
        <div style="font-size:13px;color:var(--text-tertiary);margin-bottom:8px;">找到 ${data.totalResults} 条结果</div>

        ${data.documents.length > 0 ? `
          <div class="search-section">
            <div class="search-section-header">📄 文档 (${data.documents.length})</div>
            <div class="search-section-body">
              ${data.documents.map(doc => `
                <div class="search-result-item" onclick="App.showDocDetail('${doc.id}')">
                  <div style="font-weight:600;margin-bottom:4px;">${highlight(doc.title)}</div>
                  <div style="font-size:13px;color:var(--text-secondary);">${highlight(doc.summary)}</div>
                  <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">🏢 ${deptName(doc.department)} · 📅 ${this.formatDate(doc.uploadDate)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${data.schedules.length > 0 ? `
          <div class="search-section">
            <div class="search-section-header">📅 日程 (${data.schedules.length})</div>
            <div class="search-section-body">
              ${data.schedules.map(s => `
                <div class="search-result-item" onclick="App.navigate('schedule')">
                  <div style="font-weight:600;margin-bottom:4px;">${highlight(s.title)}</div>
                  <div style="font-size:13px;color:var(--text-secondary);">${highlight(s.description)}</div>
                  <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">📅 ${s.date} ${s.time} · 🏢 ${deptName(s.department)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${data.departments.length > 0 ? `
          <div class="search-section">
            <div class="search-section-header">🏢 部门 (${data.departments.length})</div>
            <div class="search-section-body">
              ${data.departments.map(d => `
                <div class="search-result-item" onclick="App.showDeptDetail('${d.id}')">
                  <div style="font-weight:600;margin-bottom:4px;">${highlight(d.name)} (${d.code})</div>
                  <div style="font-size:13px;color:var(--text-secondary);">${highlight(d.description)}</div>
                  <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">👤 ${d.head} · 👥 ${d.memberCount}人</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  // ========== 上传相关 ==========
  openUploadModal() {
    this.selectedFiles = [];
    this.uploadTab = 'file';
    document.getElementById('file-upload-panel').classList.add('active');
    document.getElementById('text-upload-panel').classList.remove('active');
    document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.upload-tab').classList.add('active');
    document.getElementById('selected-files').innerHTML = '';
    this.openModal('upload-modal');
  },

  switchUploadTab(tab) {
    this.uploadTab = tab;
    document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('file-upload-panel').classList.toggle('active', tab === 'file');
    document.getElementById('text-upload-panel').classList.toggle('active', tab === 'text');
  },

  handleDragOver(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.add('dragover');
  },

  handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('dragover');
  },

  handleDrop(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    files.forEach(f => this.selectedFiles.push(f));
    this.renderSelectedFiles();
  },

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    files.forEach(f => this.selectedFiles.push(f));
    this.renderSelectedFiles();
  },

  renderSelectedFiles() {
    const container = document.getElementById('selected-files');
    container.innerHTML = this.selectedFiles.map((f, i) => `
      <div class="selected-file">
        <span>${this.getFileIcon(f.name)}</span>
        <span style="flex:1;">${f.name}</span>
        <span style="color:var(--text-tertiary);">${(f.size / 1024).toFixed(1)}KB</span>
        <button class="remove-file" onclick="App.removeFile(${i})">✕</button>
      </div>
    `).join('');
  },

  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.renderSelectedFiles();
  },

  async submitUpload() {
    const department = document.getElementById('upload-department').value;
    const accessLevel = document.getElementById('upload-access').value;

    if (this.uploadTab === 'file') {
      if (this.selectedFiles.length === 0) {
        this.showToast('请先选择文件', 'warning');
        return;
      }

      this.closeModal('upload-modal');
      this.showProcessing();

      const formData = new FormData();
      this.selectedFiles.forEach(f => formData.append('files', f));
      formData.append('department', department);
      formData.append('accessLevel', accessLevel);

      const data = await this.apiUpload('/api/documents/upload', formData);
      this.closeProcessing();

      if (data && data.success) {
        this.showToast(`成功上传 ${data.documents.length} 个文件，AI已完成分类与知识整合`, 'success');
        this.loadDashboard();
        if (this.currentPage === 'documents') this.loadDocuments();
      } else {
        this.showToast('上传失败', 'error');
      }
    } else {
      const title = document.getElementById('text-title').value.trim();
      const content = document.getElementById('text-content').value.trim();
      if (!title || !content) {
        this.showToast('请填写标题和内容', 'warning');
        return;
      }

      this.closeModal('upload-modal');
      this.showToast('AI正在处理文档...', 'info');

      const data = await this.api('/api/documents/create', {
        method: 'POST',
        body: JSON.stringify({ title, content, department, accessLevel, uploader: '系统管理员' })
      });

      if (data && data.success) {
        this.showToast('文档已创建，AI完成自动分类与摘要', 'success');
        this.loadDashboard();
        if (this.currentPage === 'documents') this.loadDocuments();
        // 清空输入
        document.getElementById('text-title').value = '';
        document.getElementById('text-content').value = '';
      } else {
        this.showToast('创建失败', 'error');
      }
    }
  },

  showProcessing() {
    const steps = ['正在提取文本内容...', '正在进行智能分类...', '正在提取关键词...', '正在生成摘要...', '正在构建知识关联...'];
    const stepsContainer = document.getElementById('processing-steps');
    stepsContainer.innerHTML = '';

    this.openModal('processing-modal');

    let i = 0;
    const showStep = () => {
      if (i < steps.length) {
        document.getElementById('processing-step').textContent = steps[i];
        const stepDiv = document.createElement('div');
        stepDiv.className = 'processing-step';
        stepDiv.textContent = `✓ ${steps[i]}`;
        stepsContainer.appendChild(stepDiv);
        i++;
        setTimeout(showStep, 600);
      }
    };
    setTimeout(showStep, 300);
  },

  closeProcessing() {
    this.closeModal('processing-modal');
  },

  // ========== 日程弹窗 ==========
  openScheduleModal() {
    document.getElementById('sch-title').value = '';
    document.getElementById('sch-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('sch-time').value = '';
    document.getElementById('sch-location').value = '';
    document.getElementById('sch-description').value = '';
    this.openModal('schedule-modal');
  },

  async submitSchedule() {
    const data = {
      title: document.getElementById('sch-title').value.trim(),
      date: document.getElementById('sch-date').value,
      time: document.getElementById('sch-time').value.trim() || '全天',
      department: document.getElementById('sch-department').value,
      priority: document.getElementById('sch-priority').value,
      type: document.getElementById('sch-type').value,
      location: document.getElementById('sch-location').value.trim(),
      description: document.getElementById('sch-description').value.trim(),
      participants: []
    };

    if (!data.title || !data.date) {
      this.showToast('请填写标题和日期', 'warning');
      return;
    }

    const res = await this.api('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (res && res.success) {
      this.showToast('日程已创建', 'success');
      this.closeModal('schedule-modal');
      this.loadSchedules();
      this.loadDashboard();
    }
  },

  // ========== 工具方法 ==========
  populateDepartmentSelects() {
    const selects = ['upload-department', 'sch-department'];
    selects.forEach(id => {
      const sel = document.getElementById(id);
      if (sel) {
        sel.innerHTML = this.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      }
    });
  },

  openModal(id) {
    document.getElementById(id).style.display = 'flex';
  },

  closeModal(id) {
    document.getElementById(id).style.display = 'none';
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    if (diff < 1) return '今天';
    if (diff < 2) return '昨天';
    if (diff < 7) return `${Math.floor(diff)}天前`;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  formatDateTime(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => App.init());
