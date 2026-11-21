window.__ModuleLoader__.load({
  id: 'dsh-plugin-trim',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { useState, useEffect, useCallback, useMemo } = React
    const h = React.createElement

    const API = '/api/dsh-experience-optimizer'
    const RECIPE_API = API + '/recipe'
    const CSS_ID = 'dsh-experience-optimizer-ui'
    const TASK_TAGS = [
      ['unknown', '自动识别'],
      ['bugfix', '修复问题'],
      ['feature', '新功能'],
      ['review', '代码审查'],
      ['docs', '文档'],
      ['release', '发布'],
      ['report', '报告 / 周报'],
      ['research', '调研'],
    ]

    const LOCALE_KEY = 'dsh-experience-optimizer.locale'
    const ONBOARDING_KEY = 'dsh-experience-optimizer.onboarding.v2'
    const MAIN_GUIDE_KEY = 'dsh-experience-optimizer.main-guide.v2'
    const ABOUT_LINKS = {
      repo: 'https://github.com/Starlit-Sky-code/dsh-experience-optimizer',
      npmTrim: 'https://www.npmjs.com/package/dsh-plugin-trim',
      npmRecipe: 'https://www.npmjs.com/package/dsh-plugin-recipe',
      releases: 'https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases',
      issues: 'https://github.com/Starlit-Sky-code/dsh-experience-optimizer/issues',
      homepage: 'https://github.com/Starlit-Sky-code/dsh-experience-optimizer',
      qqGroup: '1134419871',
      qqLink: '',
      donate: [],
    }
    const COPYRIGHT = 'Copyright © 2026 Starlit Sky · AGPL-3.0-only'
    const TABS = [
      { id: 'trim', zh: '插件体检', en: 'Plugin checkup', icon: 'gauge' },
      { id: 'recipe', zh: '工作流配方', en: 'Workflow recipe', icon: 'recipe' },
      { id: 'tutorial', zh: '教程', en: 'Guide', icon: 'book' },
      { id: 'about', zh: '关于', en: 'About', icon: 'info' },
      { id: 'settings', zh: '设置', en: 'Settings', icon: 'settings' },
    ]
    const EN_TEXT = {
      '插件体检': 'Plugin checkup',
      '工作流配方': 'Workflow recipe',
      '教程': 'Guide',
      '关于': 'About',
      '设置': 'Settings',
      '体检与兼容': 'Checkup & compatibility',
      '可归属上下文': 'Attributable context',
      '启用插件': 'Enabled plugins',
      '兼容性': 'Compatibility',
      '写操作': 'Write access',
      '可应用': 'Ready',
      '只读': 'Read-only',
      '上下文成本': 'Context cost',
      '插件清单': 'Plugin inventory',
      '精简方案': 'Slim plan',
      '兼容性检查': 'Compatibility check',
      '搜索插件': 'Search plugins',
      '搜索兼容性': 'Search findings',
      '名称 / 描述': 'Name / description',
      '代码 / 标题 / 对象': 'Code / title / subject',
      '全部': 'All',
      '启用': 'Enabled',
      '禁用': 'Disabled',
      '受保护': 'Protected',
      '已启用': 'Enabled',
      '已禁用': 'Disabled',
      '正常': 'OK',
      '不兼容': 'Incompatible',
      '警告': 'Warning',
      '插件': 'Plugin',
      '状态': 'Status',
      '保护': 'Protected',
      '兼容状态': 'Compatibility',
      '上下文': 'Context',
      '占比': 'Share',
      '调用': 'Calls',
      '查看全部': 'Show all',
      '收起': 'Collapse',
      '刷新': 'Refresh',
      '读取中…': 'Loading…',
      '生成方案': 'Build plan',
      '生成中…': 'Building…',
      '任务类型': 'Task type',
      '任务目标（可选）': 'Goal (optional)',
      '自动识别': 'Auto-detect',
      '保留': 'Keep',
      '复核': 'Review',
      '建议关闭': 'Close candidate',
      '未用可关闭': 'Unused candidate',
      '人工复核': 'Review',
      '任务：': 'Task: ',
      '风险：': 'Risk: ',
      '评分': 'Score',
      '周期/触发器': 'Scheduled / trigger',
      '有调用记录': 'Used before',
      '窗口内 0 调用': 'No calls in window',
      '无使用账本': 'No usage ledger',
      '证据强': 'Strong evidence',
      '证据弱': 'Weak evidence',
      '证据不足': 'Insufficient evidence',
      '判断依据：描述匹配只说明“可能相关”；出现定时/触发语义、已有调用记录、无使用账本或任务置信度不足时，只进入人工复核。只有“窗口内 0 调用 + 有上下文成本 + 非周期 + 任务高置信”才会标为建议关闭，且仍需确认与安全确认。': 'Evidence rule: a description match only means “possibly relevant”. Scheduled/trigger plugins, plugins with calls, an empty usage ledger, or low task confidence go to review. A close candidate requires zero calls in the window, attributable context cost, no schedule/trigger hint, and high task confidence — and still needs confirmation and host approval.',
      '全选低风险': 'Select low-risk',
      '清空': 'Clear',
      '应用选中': 'Apply selected',
      '恢复最近': 'Restore latest',
      '显示信息': 'Show info',
      '隐藏信息': 'Hide info',
      '需要处理': 'Needs attention',
      '无阻断': 'No blockers',
      '没有匹配的兼容性问题。': 'No matching compatibility findings.',
      '没有匹配的插件。': 'No matching plugins.',
      '当前配置': 'Current profile',
      '兼容状态': 'Compatibility',
      '运行模式': 'Mode',
      '审批策略': 'Approval',
      '审批阈值': 'Approval threshold',
      '建议策略': 'Suggestion policy',
      '使用账本': 'Usage ledger',
      '账本保留': 'Ledger retention',
      '草稿/还原点上限': 'Draft/snapshot limit',
      '复制片段': 'Copy snippet',
      '配置片段': 'Configuration snippet',
      '说明': 'Notes',
      '项目信息': 'Project',
      '交流与支持': 'Community & support',
      '项目链接': 'Links',
      '版权': 'Copyright',
      '新手引导': 'First-run guide',
      '重新查看新手引导': 'Replay first-run guide',
      '开始使用': 'Get started',
      '查看完整教程': 'Open full guide',
      '跳过': 'Skip',
      '下一步': 'Next',
      '上一步': 'Back',
      '完成': 'Done',
      '待补充': 'To be added',
      '捐赠方式：待补充': 'Donation methods: to be added',
      'QQ 群：待补充': 'QQ group: to be added',
      '复制安装命令': 'Copy install command',
      '打开完整教程': 'Open full guide',
      '仅建议，先确认': 'Suggestion only — confirm first',
      '先量成本': 'Measure first',
      '再生成方案': 'Build a plan',
      '最后安全确认': 'Confirm safely',
    }
    let CURRENT_LOCALE = 'zh'
    function tr(zh, en) {
      return CURRENT_LOCALE === 'zh' ? zh : (en === undefined ? (EN_TEXT[zh] === undefined ? zh : EN_TEXT[zh]) : en)
    }
    function browserStorage() {
      try {
        return typeof window !== 'undefined' && window.localStorage ? window.localStorage : undefined
      } catch {
        return undefined
      }
    }
    function detectLocale() {
      const storage = browserStorage()
      try {
        const saved = storage && storage.getItem(LOCALE_KEY)
        if (saved === 'zh' || saved === 'en') return saved
      } catch {
        // localStorage may be unavailable
      }
      try {
        return String(navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
      } catch {
        return 'zh'
      }
    }
    function persistLocale(locale) {
      const storage = browserStorage()
      try { if (storage) storage.setItem(LOCALE_KEY, locale) } catch { /* ignore */ }
    }
    function readOnboarding() {
      const storage = browserStorage()
      try { return storage ? storage.getItem(ONBOARDING_KEY) === '1' : false } catch { return false }
    }
    function writeOnboarding() {
      const storage = browserStorage()
      try { if (storage) storage.setItem(ONBOARDING_KEY, '1') } catch { /* ignore */ }
    }
    function resetOnboarding() {
      const storage = browserStorage()
      try { if (storage) storage.removeItem(ONBOARDING_KEY) } catch { /* ignore */ }
    }
    function readPref(key, fallback) {
      const storage = browserStorage()
      try { return (storage && storage.getItem('dsh-experience-optimizer.' + key)) || fallback } catch { return fallback }
    }
    function writePref(key, value) {
      const storage = browserStorage()
      try { if (storage) storage.setItem('dsh-experience-optimizer.' + key, value) } catch { /* ignore */ }
    }

    const CSS = `
.eo-root{--eo-ease:cubic-bezier(.16,1,.3,1);--eo-primary:var(--dsw-alias-label-primary,#1a1a1a);--eo-secondary:var(--dsw-alias-label-secondary,#5f6b7a);--eo-tertiary:var(--dsw-alias-label-tertiary,#8b96a5);--eo-border:var(--dsw-alias-border-l2,rgba(127,127,127,.16));--eo-border-strong:var(--dsw-alias-border-l3,rgba(127,127,127,.24));--eo-card-bg:var(--dsw-alias-settings-card-fill,transparent);--eo-card-stroke:var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l2,rgba(127,127,127,.16)));--eo-hover:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06));--eo-error:var(--dsw-alias-state-error-primary,#c4314b);--eo-success:var(--dsw-alias-state-success-primary,#1a7f37);--eo-code:var(--ds-font-family-code,"JetBrains Maple Mono",ui-monospace,monospace);--eo-radius:var(--dsw-radius-lg,12px);max-width:760px;color:var(--eo-primary);font-size:13px;line-height:20px;display:flex;flex-direction:column;gap:14px}
.eo-root *{box-sizing:border-box}
.eo-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:0 0 2px}
.eo-hero-copy{min-width:0}
.eo-title{margin:0;font-size:18px;line-height:26px;font-weight:600;letter-spacing:-.01em}
.eo-sub{margin:4px 0 0;color:var(--eo-tertiary);font-size:13px;line-height:20px}
.eo-hero-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.eo-status{font:400 11px/1 var(--eo-code);color:var(--eo-tertiary);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.eo-tabs{display:flex;gap:18px;border-bottom:.5px solid var(--eo-border);margin:0;overflow-x:auto;scrollbar-width:none}
        .eo-tabs::-webkit-scrollbar{display:none}
.eo-tab{appearance:none;border:0;background:transparent;color:var(--eo-tertiary);font:inherit;font-size:13px;line-height:20px;padding:7px 1px 9px;cursor:pointer;position:relative;border-radius:0;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
        .eo-icon{flex:0 0 auto}
        .eo-progress-track{display:block;width:100%;min-width:40px;height:4px;border-radius:4px;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.1));overflow:hidden;margin-top:5px}
        .eo-progress-track i{display:block;height:100%;border-radius:4px;background:var(--eo-primary);opacity:.65;transition:width .2s ease;min-width:2px}
        .eo-severity-bar{display:flex;gap:3px;height:5px;margin:0 0 10px}
        .eo-severity-bar span{display:block;height:100%;border-radius:3px}
        .eo-severity-error{background:var(--eo-error)}
        .eo-severity-warn{background:var(--dsw-alias-state-warning-primary,#9a6700)}
        .eo-severity-info{background:var(--dsw-alias-state-business-primary,#4a7fd6)}
        .eo-severity-empty{background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.12));flex:1}
        .eo-progress-ok i{background:var(--eo-success)}
        .eo-progress-warn i{background:var(--dsw-alias-state-warning-primary,#9a6700)}
        .eo-progress-danger i{background:var(--eo-error)}
        .eo-progress-dots{display:flex;gap:6px;align-items:center;margin:12px 0 2px}
        .eo-progress-dot{width:6px;height:6px;border-radius:50%;background:var(--eo-border-strong)}
        .eo-progress-dot-active{width:18px;border-radius:4px;background:var(--eo-primary)}
        .eo-onboarding{width:min(560px,100%)}
        .eo-onboarding-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:10px}
        .eo-onboarding-icon{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.08));color:var(--eo-primary);flex:0 0 auto}
        .eo-onboarding-kicker{font:500 10px/16px var(--eo-code);letter-spacing:.12em;text-transform:uppercase;color:var(--eo-tertiary)}
        .eo-onboarding h3{margin:2px 0 0;font-size:18px;line-height:26px}
        .eo-about-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .eo-about-card{border:.5px solid var(--eo-border);border-radius:10px;padding:12px;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.03))}
        .eo-about-card h4{margin:0 0 6px;font-size:13px;line-height:20px;font-weight:500}
        .eo-about-card p,.eo-about-card li{font-size:12px;line-height:19px;color:var(--eo-tertiary)}
        .eo-link-list{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
        .eo-link-list a{color:var(--eo-primary);text-decoration:none;font-size:12px;line-height:19px;display:inline-flex;gap:6px;align-items:center;word-break:break-all}
        .eo-link-list a:hover{text-decoration:underline}
        .eo-about-icon{width:64px;height:64px;border-radius:18px;object-fit:cover;display:block;margin:0 auto}
        .eo-copyright{text-align:center;color:var(--eo-tertiary);font-size:11px;line-height:17px;margin-top:8px}
        .eo-install-command{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .eo-table-wrap{overflow-x:auto}
        .eo-share-cell{min-width:64px}
        @media(max-width:680px){.eo-col-secondary{display:none}.eo-about-grid{grid-template-columns:1fr}}
.eo-tab:hover{color:var(--eo-primary)}
.eo-tab-active{color:var(--eo-primary);font-weight:500}
.eo-tab-active:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1.5px;background:var(--eo-primary);border-radius:1px}
.eo-stack{display:flex;flex-direction:column;gap:14px}
.eo-stack>.eo-metrics{order:0}
.eo-stack>[data-section="draft"]{order:1}
.eo-stack>[data-section="inventory"]{order:2}
.eo-stack>[data-section="compat"]{order:3}
.eo-stack>[data-section="context"]{order:4}
.eo-stack>[data-section="result"]{order:5}
.eo-stack>[data-section="dedupe"]{order:6}
.eo-stack>[data-section="diagnostics"]{order:7}
.eo-grid{display:grid;gap:10px}
.eo-metrics{grid-template-columns:repeat(4,minmax(0,1fr));gap:0;border:.5px solid var(--eo-card-stroke);border-radius:var(--eo-radius);background:var(--eo-card-bg);overflow:hidden}
.eo-metric{padding:12px 14px;border-right:.5px solid var(--eo-border);min-width:0}
.eo-metric:last-child{border-right:0}
.eo-metric-label{font-size:11px;line-height:16px;color:var(--eo-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.eo-metric-value{font-size:18px;line-height:26px;font-weight:600;letter-spacing:-.02em;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.eo-metric-value[data-tone="danger"]{color:var(--eo-error)}
.eo-metric-value[data-tone="warn"]{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.eo-metric-value[data-tone="ok"]{color:var(--eo-success)}
.eo-metric-hint{font-size:11px;line-height:16px;color:var(--eo-tertiary);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.eo-card{padding:14px;border:.5px solid var(--eo-card-stroke);border-radius:var(--eo-radius);background:var(--eo-card-bg)}
.eo-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
        .eo-card-toggle{appearance:none;border:0;background:transparent;color:inherit;font:inherit;padding:0;margin:0;display:flex;align-items:flex-start;gap:7px;text-align:left;cursor:pointer;min-width:0}
        .eo-card-toggle:hover .eo-card-title{text-decoration:underline;text-underline-offset:3px}
        .eo-card-chevron{display:inline-flex;align-items:center;color:var(--eo-tertiary);margin-top:3px;transition:transform .15s ease}
        .eo-card-toggle[aria-expanded="false"] .eo-card-chevron{transform:rotate(-90deg)}
        .eo-card-body{min-width:0}
        .eo-viewbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 2px;padding:8px 10px;border:.5px solid var(--eo-border);border-radius:8px;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.03))}
        .eo-viewbar-label{font-size:11px;color:var(--eo-tertiary);white-space:nowrap}
        .eo-viewbar .eo-inline{gap:4px}
        .eo-viewbar .eo-btn{height:26px;font-size:11px;padding:0 8px;border-radius:6px}
        .eo-viewbar .eo-btn-active{border-color:var(--eo-primary);color:var(--eo-primary);background:var(--dsw-alias-bg-layer-1,rgba(127,127,127,.06))}
        .eo-density-compact .eo-card{padding:10px}
        .eo-density-compact .eo-stack,.eo-stack.eo-density-compact{gap:8px}
        .eo-density-compact .eo-item{padding:7px 0}
        .eo-density-compact .eo-metric{padding:9px 11px}
        .eo-layout-two .eo-findings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}
        .eo-layout-two .eo-finding{padding:8px 0}
        .eo-layout-two .eo-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}
        .eo-layout-two .eo-item{padding:8px 0}
        .eo-layout-two .eo-owner-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px}
        .eo-inventory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .eo-inventory-card{border:.5px solid var(--eo-border);border-radius:8px;padding:9px 10px;min-width:0}
        .eo-inventory-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
        .eo-inventory-card code{font:400 11px/16px var(--eo-code);word-break:break-all;color:var(--eo-secondary)}
        .eo-inventory-card-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;color:var(--eo-tertiary);font-size:11px}
        .eo-main-guide{position:fixed;right:24px;left:auto;bottom:24px;z-index:30;width:min(340px,calc(100vw - 32px));padding:14px 16px;border:.5px solid var(--dsw-alias-border-l4,rgba(127,127,127,.25));border-radius:14px;background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 14px 44px rgba(0,0,0,.2);color:var(--eo-primary);font-size:13px;line-height:20px}
        .eo-guide-beacon{position:fixed;left:18px;bottom:82px;z-index:31;display:flex;flex-direction:column;align-items:center;gap:1px;color:var(--eo-primary);pointer-events:none;font-size:10px;line-height:14px}
        .eo-guide-beacon span{padding:1px 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-1,#fff);border:.5px solid var(--eo-border-strong);box-shadow:0 4px 14px rgba(0,0,0,.12)}
        .eo-guide-beacon .eo-icon{color:var(--eo-primary);animation:eo-guide-bob 1.6s ease-in-out infinite}
        @keyframes eo-guide-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
        .eo-guide-arrow{position:absolute;left:-16px;top:-20px;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--dsw-alias-button-primary-fill,var(--eo-primary));color:var(--dsw-alias-label-primary-inverted,#fff);transform:rotate(-12deg);box-shadow:0 8px 20px rgba(0,0,0,.18)}
        .eo-guide-kicker{margin:0 0 3px;color:var(--eo-tertiary);font:500 10px/16px var(--eo-code);letter-spacing:.12em}
        .eo-main-guide h3{margin:0 0 8px;font-size:16px;line-height:23px}
        .eo-guide-path{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:0 0 8px;font-size:12px;font-weight:500}
        .eo-guide-path span{padding:2px 7px;border-radius:5px;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.08))}
        .eo-guide-path i{font-style:normal;color:var(--eo-tertiary)}
        .eo-guide-note{margin:0;color:var(--eo-tertiary);font-size:11px;line-height:17px}
        .eo-guide-steps{max-height:220px;overflow:auto;margin:10px 0 0;padding:0;list-style:none;border-top:.5px solid var(--eo-border)}
        .eo-guide-steps li{display:flex;gap:7px;align-items:flex-start;padding:7px 0;border-bottom:.5px solid var(--eo-border)}
        .eo-guide-steps b{font:500 10px/18px var(--eo-code);color:var(--eo-tertiary);flex:0 0 auto}
        .eo-guide-steps span{flex:0 0 auto;font-weight:500;font-size:12px}
        .eo-guide-steps small{color:var(--eo-tertiary);font-size:11px;line-height:17px}
        .eo-guide-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
        .eo-main-guide .eo-btn{height:28px;font-size:11px;padding:0 9px}
        @media(max-width:600px){.eo-main-guide{left:12px;right:12px;bottom:12px;width:auto}.eo-guide-beacon{position:fixed;left:18px;bottom:82px;z-index:31;display:flex;flex-direction:column;align-items:center;gap:1px;color:var(--eo-primary);pointer-events:none;font-size:10px;line-height:14px}
        .eo-guide-beacon span{padding:1px 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-1,#fff);border:.5px solid var(--eo-border-strong);box-shadow:0 4px 14px rgba(0,0,0,.12)}
        .eo-guide-beacon .eo-icon{color:var(--eo-primary);animation:eo-guide-bob 1.6s ease-in-out infinite}
        @keyframes eo-guide-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
        .eo-guide-arrow{display:none}}
        .eo-about-hero{display:block;width:100%;height:auto;border-radius:12px;background:#0b1422;margin:0 0 10px}
.eo-card-title{margin:0;font-size:14px;line-height:22px;font-weight:500;letter-spacing:0}
.eo-card-sub{margin:2px 0 0;font-size:12px;line-height:18px;color:var(--eo-tertiary)}
.eo-btn{appearance:none;height:32px;padding:0 12px;border:.5px solid var(--eo-border-strong);border-radius:var(--dsw-radius-md,8px);background:transparent;color:var(--eo-primary);font:inherit;font-size:13px;line-height:20px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;transition:background .14s ease,border-color .14s ease,opacity .14s ease}
.eo-btn:hover:not(:disabled){background:var(--eo-hover)}
.eo-btn:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#1a1a1a));outline-offset:2px}
.eo-btn:disabled{opacity:.4;cursor:not-allowed}
.eo-btn-accent{background:var(--dsw-alias-button-primary-fill,var(--eo-primary));border-color:var(--dsw-alias-button-primary-fill,var(--eo-primary));color:var(--dsw-alias-label-primary-inverted,#fff)}
.eo-btn-accent:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--eo-primary));border-color:var(--dsw-alias-button-primary-hover,var(--eo-primary));opacity:1}
.eo-btn-ghost{border-color:transparent;color:var(--eo-secondary);padding:0 8px}
.eo-btn-ghost:hover:not(:disabled){background:var(--eo-hover);color:var(--eo-primary)}
.eo-btn-danger{color:var(--eo-error);border-color:var(--dsw-alias-state-error-primary,var(--eo-error))}
.eo-badge{display:inline-flex;align-items:center;gap:4px;font:400 11px/16px var(--eo-code);padding:0 6px;border-radius:var(--dsw-radius-xs,4px);background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.08));color:var(--eo-secondary);border:0;white-space:nowrap}
.eo-badge-ok{color:var(--eo-success)}
.eo-badge-warn{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.eo-badge-danger{color:var(--eo-error)}
.eo-badge-info{color:var(--dsw-alias-state-business-primary,#1a5fb4)}
.eo-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex:0 0 auto}
.eo-dot-error{background:var(--eo-error)}
.eo-dot-warn{background:var(--dsw-alias-state-warning-primary,#c98a00)}
.eo-dot-info{background:var(--dsw-alias-state-business-primary,#4a7fd6)}
.eo-toolbar{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
.eo-toolbar .eo-field{min-width:140px;flex:1}
.eo-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.eo-field-label{font-size:12px;line-height:18px;font-weight:500;color:var(--eo-secondary)}
.eo-field-hint{font-size:11px;line-height:16px;color:var(--eo-tertiary)}
.eo-input,.eo-select,.eo-textarea{width:100%;height:36px;border:.5px solid var(--dsw-alias-border-l4,var(--eo-border-strong));border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--eo-primary);padding:0 10px;font:inherit;font-size:13px;line-height:20px;outline:none}
.eo-input::placeholder,.eo-textarea::placeholder{color:var(--eo-tertiary)}
.eo-input:focus,.eo-select:focus,.eo-textarea:focus{border-color:var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#1a1a1a));box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#1a1a1a)) 16%,transparent)}
.eo-textarea{height:auto;min-height:76px;padding:8px 10px;resize:vertical}
.eo-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.eo-form-grid .eo-wide{grid-column:1/-1}
.eo-summary{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
.eo-list{display:flex;flex-direction:column;gap:0}
.eo-item{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border:0;border-bottom:.5px solid var(--eo-border);border-radius:0;background:transparent}
.eo-item:first-child{padding-top:0}
.eo-item:last-child{border-bottom:0}
.eo-item:hover{background:transparent}
.eo-item input[type=checkbox]{margin-top:3px;accent-color:var(--eo-primary);width:14px;height:14px;cursor:pointer;flex:0 0 auto}
.eo-item-main{min-width:0;flex:1}
.eo-item-title{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.eo-item-name{font-size:13px;line-height:20px;font-weight:500;word-break:break-all}
.eo-item-reason{margin-top:2px;color:var(--eo-tertiary);font-size:12px;line-height:18px}
.eo-item-evidence{display:flex;flex-wrap:wrap;gap:8px;margin-top:3px}
.eo-evidence{font-size:11px;line-height:16px;color:var(--eo-tertiary);background:transparent;border:0;padding:0}
.eo-evidence:before{content:"·";margin-right:4px;color:var(--eo-tertiary)}
.eo-item-side{display:none}
.eo-lock{display:none}
.eo-applybar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:.5px solid var(--eo-border)}
.eo-applybar-text{font-size:12px;line-height:18px;color:var(--eo-tertiary)}
.eo-findings{display:flex;flex-direction:column;gap:0}
.eo-finding{display:flex;gap:8px;padding:10px 0;border-bottom:.5px solid var(--eo-border)}
.eo-finding:first-child{padding-top:0}
.eo-finding:last-child{border-bottom:0;padding-bottom:0}
.eo-finding-body{min-width:0;flex:1}
.eo-finding-title{font-size:13px;line-height:20px;font-weight:500}
.eo-finding-title code{font:400 11px/16px var(--eo-code);color:var(--eo-secondary);background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.08));border:0;padding:0 5px;border-radius:var(--dsw-radius-xs,4px);margin-right:6px}
.eo-finding-meta{font-size:12px;line-height:18px;color:var(--eo-tertiary);margin-top:1px;word-break:break-word}
.eo-finding-fix{font-size:12px;line-height:18px;color:var(--eo-tertiary);margin-top:2px}
.eo-empty{padding:16px;text-align:center;color:var(--eo-tertiary);font-size:12px;line-height:18px;border:.5px dashed var(--eo-border-strong);border-radius:var(--dsw-radius-md,8px)}
.eo-table{width:100%;border-collapse:collapse;font-size:12px;line-height:18px}
.eo-table th{text-align:left;font-weight:500;color:var(--eo-tertiary);font-size:11px;line-height:16px;padding:0 8px 7px 0;border-bottom:.5px solid var(--eo-border)}
.eo-table td{padding:7px 8px 7px 0;border-bottom:.5px solid var(--eo-border);vertical-align:top}
.eo-table tr:last-child td{border-bottom:0}
.eo-table code{font:400 11px/16px var(--eo-code);color:var(--eo-secondary)}
.eo-owner-list{display:flex;flex-direction:column;gap:7px}
.eo-owner-head{display:flex;justify-content:space-between;gap:10px;font-size:12px;line-height:18px;color:var(--eo-tertiary)}
.eo-owner-head span:first-child{font-family:var(--eo-code);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.eo-bar{height:3px;border-radius:3px;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.1));margin-top:4px;overflow:hidden}
.eo-bar i{display:block;height:100%;border-radius:3px;background:var(--eo-primary);opacity:.55}
.eo-issue{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:var(--dsw-radius-md,8px);font-size:12px;line-height:18px;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.06));border:.5px solid var(--eo-border)}
.eo-issue-error{border-color:color-mix(in srgb,var(--eo-error) 35%,transparent);color:var(--eo-error)}
.eo-issue-warn{border-color:color-mix(in srgb,var(--dsw-alias-state-warning-primary,#9a6700) 35%,transparent)}
.eo-issue code{font:400 11px/16px var(--eo-code);color:var(--eo-secondary);margin-right:4px}
.eo-modal-backdrop{position:fixed;inset:0;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.36));display:grid;place-items:center;z-index:80;padding:20px}
.eo-modal{width:min(520px,100%);max-height:80vh;overflow:auto;border-radius:var(--dsw-radius-xl,16px);background:var(--dsw-alias-bg-layer-1,#fff);border:.5px solid var(--eo-border-strong);box-shadow:0 16px 48px rgba(0,0,0,.18);padding:18px}
.eo-modal h3{margin:0 0 6px;font-size:16px;line-height:24px;font-weight:600}
.eo-modal p{color:var(--eo-tertiary);font-size:12px;line-height:18px;margin:0 0 10px}
.eo-modal-list{display:flex;flex-direction:column;gap:0;margin:8px 0 12px;max-height:34vh;overflow:auto}
.eo-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.eo-toast{position:fixed;right:20px;bottom:20px;z-index:90;max-width:360px;padding:9px 12px;border-radius:var(--dsw-radius-md,8px);font-size:12px;line-height:18px;background:var(--dsw-alias-bg-layer-1,#fff);border:.5px solid var(--eo-border-strong);box-shadow:0 8px 30px rgba(0,0,0,.16);animation:eo-in .16s ease}
.eo-toast-ok{border-color:color-mix(in srgb,var(--eo-success) 45%,transparent)}
.eo-toast-warn{border-color:color-mix(in srgb,var(--dsw-alias-state-warning-primary,#9a6700) 45%,transparent)}
.eo-toast-error{border-color:color-mix(in srgb,var(--eo-error) 45%,transparent)}
.eo-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:24px;color:var(--eo-tertiary);font-size:12px}
.eo-spinner{width:13px;height:13px;border-radius:50%;border:2px solid var(--eo-border-strong);border-top-color:var(--eo-primary);animation:eo-spin .8s linear infinite}
.eo-error{padding:10px 12px;border-radius:var(--dsw-radius-md,8px);background:color-mix(in srgb,var(--eo-error) 7%,transparent);border:.5px solid color-mix(in srgb,var(--eo-error) 35%,transparent);color:var(--eo-error);font-size:12px;line-height:18px;display:flex;gap:10px;align-items:center;justify-content:space-between}
.eo-muted{color:var(--eo-tertiary);font-size:12px;line-height:18px}
        .eo-note{padding:9px 12px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--eo-secondary);font-size:12px;line-height:19px}
.eo-code{font:400 11px/16px var(--eo-code);color:var(--eo-secondary);word-break:break-all}
        .eo-steps{margin:0;padding-left:20px;color:var(--eo-secondary);font-size:13px;line-height:22px}
        .eo-tutorial-flow{position:relative;display:flex;flex-direction:column;gap:0}
        .eo-tutorial-step{display:flex;gap:12px;position:relative;padding:0 0 14px}
        .eo-tutorial-step:before{content:"";position:absolute;left:16px;top:34px;bottom:0;width:1px;background:var(--eo-border)}
        .eo-tutorial-step:last-child:before{display:none}
        .eo-tutorial-num{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.08));border:1px solid var(--eo-border);color:var(--eo-secondary);font:500 10px/1 var(--eo-code)}
        .eo-tutorial-copy{min-width:0;padding-top:1px}
        .eo-tutorial-copy strong{display:block;font-size:13px;line-height:21px;color:var(--eo-primary)}
        .eo-tutorial-copy p{margin:1px 0 0;color:var(--eo-tertiary);font-size:12px;line-height:19px}
        .eo-steps li{margin:0 0 8px;padding-left:2px}
        .eo-steps strong{color:var(--eo-primary);font-weight:500}
        .eo-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px}
        .eo-settings-readonly{border-left:3px solid var(--eo-primary);background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.05))}
        .eo-settings-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:.5px solid var(--eo-border);font-size:13px;line-height:20px}
        .eo-settings-row:last-child{border-bottom:0}
        .eo-settings-row span:first-child{color:var(--eo-secondary);flex:0 0 auto}
        .eo-settings-row code{font:400 11px/16px var(--eo-code);color:var(--eo-primary);text-align:right;word-break:break-all}
        .eo-settings-control{width:190px;flex:0 1 190px;height:30px;font-size:12px;line-height:18px}
        .eo-settings-row-wide{flex-wrap:wrap}
        .eo-settings-row-wide .eo-settings-control{width:100%;flex:1 1 240px}
        .eo-check{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--eo-primary);cursor:pointer;min-height:30px}
        .eo-check input{width:14px;height:14px;accent-color:var(--eo-primary);cursor:pointer}
        @media(max-width:560px){.eo-settings-control{width:100%;flex:1 1 100%}}
        .eo-codeblock{margin:0;padding:12px;border:.5px solid var(--eo-border-strong);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.05));font:400 11px/18px var(--eo-code);color:var(--eo-secondary);white-space:pre-wrap;word-break:break-word}
        .eo-faq{border-bottom:.5px solid var(--eo-border);padding:8px 0}
        .eo-faq:last-child{border-bottom:0}
        .eo-faq summary{cursor:pointer;font-size:13px;line-height:20px;color:var(--eo-primary)}
        .eo-faq p{margin:5px 0 0;color:var(--eo-tertiary);font-size:12px;line-height:19px}
        @media(max-width:560px){.eo-settings-grid{grid-template-columns:1fr}}
.eo-inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.eo-spacer{height:0}

/* Conversation checkup bubble */
.eo-bubble-toast{display:inline-flex;align-items:center;gap:8px;max-width:min(360px,calc(100vw - 32px));padding:7px 8px 7px 10px;border:.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));border-radius:10px;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.8));color:var(--dsw-alias-label-secondary,#5f6b7a);box-shadow:0 8px 24px rgba(0,0,0,.1);animation:eo-bubble-in .45s var(--eo-ease,cubic-bezier(.16,1,.3,1)) both}
.eo-bubble-pulse{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#1a7f37);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-success-primary,#1a7f37) 16%,transparent);flex:0 0 auto;animation:eo-pulse 2.4s ease-in-out infinite}
.eo-bubble-copy{display:flex;flex-direction:column;min-width:0;gap:1px}
.eo-bubble-copy b{color:var(--dsw-alias-label-primary,#1a1a1a);font-size:11px;line-height:15px;font-weight:500}
.eo-bubble-copy span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#8b96a5);font-size:10.5px;line-height:15px}
.eo-bubble-close{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#8b96a5);font-size:16px;line-height:1;cursor:pointer;padding:0 1px;border-radius:4px;flex:0 0 auto}
.eo-bubble-close:hover{color:var(--dsw-alias-label-primary,#1a1a1a)}
.eo-bubble-close:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#1a5fb4);outline-offset:2px}

/* Thought-line checkup strip */
.eo-thought{min-width:0}
.eo-thought-note{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 8px;padding:5px 8px;border:.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.16));border-radius:6px;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.045));font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8b96a5);animation:eo-thought-in .4s var(--eo-ease,cubic-bezier(.16,1,.3,1)) both}
.eo-thought-pulse{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#1a7f37);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-success-primary,#1a7f37) 14%,transparent)}
.eo-thought.is-running .eo-thought-pulse{animation:eo-pulse 1.4s ease-in-out infinite}
.eo-thought-label{font-weight:500;color:var(--dsw-alias-label-secondary,#5f6b7a)}
.eo-thought-meta{font:10px/16px var(--ds-font-family-code,ui-monospace,monospace);color:var(--dsw-alias-label-tertiary,#8b96a5)}
.eo-thought-warn{padding:0 5px;border-radius:4px;background:color-mix(in srgb,var(--dsw-alias-state-warning-primary,#9a6700) 12%,transparent);color:var(--dsw-alias-state-warning-primary,#9a6700);font:10px/16px var(--ds-font-family-code,ui-monospace,monospace)}
.eo-thought-body{min-width:0}

/* Micro-interactions */
.eo-tab{transition:color .18s ease,background .18s ease}
.eo-tab-active:after{transform-origin:left;animation:eo-underline .22s var(--eo-ease,cubic-bezier(.16,1,.3,1)) both}
.eo-tab-panel{animation:eo-panel-in .38s var(--eo-ease,cubic-bezier(.16,1,.3,1)) both}
.eo-btn{transition:background .14s ease,border-color .14s ease,color .14s ease,opacity .14s ease,transform .12s ease}
.eo-btn:active:not(:disabled){transform:translateY(1px) scale(.985)}
.eo-card{transition:border-color .2s ease,background .2s ease}
.eo-item{transition:background .16s ease}
.eo-item:hover{background:var(--eo-hover)}
.eo-collapse{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows .32s var(--eo-ease,cubic-bezier(.16,1,.3,1)),opacity .24s ease}
.eo-collapse.is-collapsed{grid-template-rows:0fr;opacity:0;pointer-events:none}
.eo-collapse-inner{overflow:hidden;min-height:0}
.eo-modal-backdrop{animation:eo-fade-in .18s ease both}
.eo-modal{animation:eo-modal-in .32s var(--eo-ease,cubic-bezier(.16,1,.3,1)) both}
.eo-progress-track i,.eo-bar i{transition:width .4s var(--eo-ease,cubic-bezier(.16,1,.3,1))}
@keyframes eo-pulse{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1)}}
@keyframes eo-pop-in{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
@keyframes eo-panel-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@keyframes eo-underline{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes eo-fade-in{from{opacity:0}to{opacity:1}}
@keyframes eo-modal-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
@keyframes eo-thought-in{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
@keyframes eo-bubble-in{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}
.eo-activation{max-width:760px;padding:16px;border:.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);box-shadow:0 10px 30px rgba(0,0,0,.08);animation:eo-activation-in .4s var(--eo-ease,cubic-bezier(.16,1,.3,1)) both}
.eo-activation-head{display:flex;align-items:flex-start;gap:10px}
.eo-activation-icon{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex:0 0 auto;background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#1a7f37) 10%,transparent);color:var(--dsw-alias-state-success-primary,#1a7f37)}
.eo-activation h3{margin:0;color:var(--dsw-alias-label-primary,#1a1a1a);font-size:14px;line-height:21px;font-weight:600}
.eo-activation p{margin:3px 0 0;color:var(--dsw-alias-label-tertiary,#8b96a5);font-size:12px;line-height:18px}
.eo-activation-steps{list-style:none;margin:13px 0 0;padding:0;display:grid;gap:7px}
.eo-activation-steps li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;align-items:start}
.eo-activation-steps b{color:var(--dsw-alias-label-tertiary,#8b96a5);font:10px/18px var(--ds-font-family-code,ui-monospace,monospace)}
.eo-activation-steps strong{display:block;color:var(--dsw-alias-label-primary,#1a1a1a);font-size:12px;line-height:18px;font-weight:500}
.eo-activation-steps small{display:block;color:var(--dsw-alias-label-tertiary,#8b96a5);font-size:11px;line-height:17px}
.eo-activation-actions{display:flex;gap:7px;margin-top:14px}
.eo-activation-btn{appearance:none;height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.28));border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#5f6b7a);font:inherit;font-size:11px;cursor:pointer;transition:background .18s ease,color .18s ease,transform .14s ease}
.eo-activation-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08));color:var(--dsw-alias-label-primary,#1a1a1a)}
.eo-activation-btn:active{transform:translateY(1px)}
.eo-activation-primary{border-color:var(--dsw-alias-button-primary-fill,#1a1a1a);background:var(--dsw-alias-button-primary-fill,#1a1a1a);color:var(--dsw-alias-label-primary-inverted,#fff)}
.eo-activation-primary:hover{background:var(--dsw-alias-button-primary-hover,#333);color:var(--dsw-alias-label-primary-inverted,#fff)}
@keyframes eo-activation-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

@keyframes eo-spin{to{transform:rotate(360deg)}}
@keyframes eo-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media(max-width:820px){.eo-layout-two .eo-findings,.eo-layout-two .eo-list,.eo-layout-two .eo-owner-list,.eo-inventory-grid{grid-template-columns:1fr}.eo-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.eo-metric:nth-child(2){border-right:0}.eo-metric:nth-child(-n+2){border-bottom:.5px solid var(--eo-border)}.eo-form-grid{grid-template-columns:1fr}.eo-hero{flex-wrap:wrap}.eo-hero-actions{margin-left:0}}
@media(max-width:520px){.eo-metrics{grid-template-columns:1fr}.eo-metric{border-right:0;border-bottom:.5px solid var(--eo-border)}.eo-metric:last-child{border-bottom:0}}
@media(prefers-reduced-motion:reduce){.eo-bubble-toast,.eo-bubble-pulse,.eo-thought-pulse,.eo-tab-active:after,.eo-tab-panel,.eo-modal-backdrop,.eo-modal,.eo-toast,.eo-activation{animation:none}.eo-collapse,.eo-btn,.eo-bubble-close,.eo-tab{transition:none}.eo-btn:active:not(:disabled),.eo-bubble-close:active{transform:none}}
`


    function injectCss() {
      if (typeof document === 'undefined') return
      const existing = document.querySelector('style[data-plugin-css="' + CSS_ID + '"]')
      if (existing !== null) {
        existing.textContent = CSS
        return
      }
      const tag = document.createElement('style')
      tag.dataset.pluginCss = CSS_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    function Button({ children, onClick, variant = 'secondary', disabled = false, title, className = '' }) {
      return h(
        'button',
        {
          type: 'button',
          className: 'eo-btn eo-btn-' + variant + (className ? ' ' + className : ''),
          onClick,
          disabled,
          title,
        },
        children,
      )
    }

    function Badge({ children, tone = 'neutral' }) {
      return h('span', { className: 'eo-badge eo-badge-' + tone }, children)
    }

    function Metric({ label, value, hint, tone = 'neutral', progress, progressTone = 'neutral' }) {
      return h(
        'div',
        { className: 'eo-metric' },
        h('div', { className: 'eo-metric-label' }, label),
        h('div', { className: 'eo-metric-value', 'data-tone': tone }, value),
        hint ? h('div', { className: 'eo-metric-hint' }, hint) : null,
        progress !== undefined ? h(Progress, { value: progress, tone: progressTone, label: label }) : null,
      )
    }

    function Card({ title, subtitle, extra, children, className = '', section, collapsible = false, collapsed = false, onToggle }) {
      const heading = h(
        'div',
        null,
        title ? h('h3', { className: 'eo-card-title' }, title) : null,
        subtitle ? h('p', { className: 'eo-card-sub' }, subtitle) : null,
      )
      return h(
        'section',
        { className: 'eo-card ' + className, 'data-section': section },
        title || extra
          ? h(
              'div',
              { className: 'eo-card-head' },
              collapsible
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'eo-card-toggle',
                      'aria-expanded': !collapsed,
                      onClick: onToggle,
                    },
                    h('span', { className: 'eo-card-chevron' }, h(Icon, { name: 'chevron', size: 14 })),
                    heading,
                  )
                : heading,
              extra || null,
            )
          : null,
        h(
          'div',
          {
            className: 'eo-collapse' + (collapsible && collapsed ? ' is-collapsed' : ''),
            'aria-hidden': collapsible && collapsed ? 'true' : undefined,
            inert: collapsible && collapsed ? '' : undefined,
          },
          h('div', { className: 'eo-collapse-inner' }, children),
        ),
      )
    }

    function Field({ label, hint, children, className = '' }) {
      return h(
        'label',
        { className: 'eo-field ' + className },
        label ? h('span', { className: 'eo-field-label' }, label) : null,
        children,
        hint ? h('span', { className: 'eo-field-hint' }, hint) : null,
      )
    }

    function Dot({ severity }) {
      return h('span', { className: 'eo-dot eo-dot-' + severity, 'aria-hidden': 'true' })
    }

    function formatNumber(value) {
      return new Intl.NumberFormat('zh-CN').format(Number(value) || 0)
    }

    const trimOverviewStore = (() => {
      let state = { status: 'idle', data: null, error: '' }
      let promise = null
      const listeners = new Set()
      const emit = () => {
        listeners.forEach((listener) => listener(state))
      }
      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        ensure() {
          if (promise || state.status === 'ready') return
          state = { status: 'loading', data: null, error: '' }
          emit()
          promise = fetchJson(API + '/overview')
            .then((data) => {
              state = { status: 'ready', data, error: '' }
            })
            .catch((err) => {
              state = {
                status: 'error',
                data: null,
                error: err instanceof Error ? err.message : String(err),
              }
            })
            .finally(() => {
              promise = null
              emit()
            })
        },
      }
    })()

    function useTrimOverview() {
      const [snapshot, setSnapshot] = useState(trimOverviewStore.get())
      useEffect(() => {
        const unsubscribe = trimOverviewStore.subscribe(setSnapshot)
        trimOverviewStore.ensure()
        return unsubscribe
      }, [])
      return snapshot
    }

    function formatTokens(value) {
      const n = Number(value) || 0
      if (n >= 10000) return (n / 1000).toFixed(1) + 'k'
      return formatNumber(n)
    }

    function CheckupBubble({ sessionId }) {
      const dismissKey = 'dsh-experience-optimizer.bubble.' + (sessionId || 'default')
      const [visible, setVisible] = useState(false)
      const [dismissed, setDismissed] = useState(() => {
        try {
          return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(dismissKey) === '1'
        } catch {
          return false
        }
      })

      useEffect(() => {
        try {
          setDismissed(typeof sessionStorage !== 'undefined' && sessionStorage.getItem(dismissKey) === '1')
        } catch {
          setDismissed(false)
        }
      }, [dismissKey])

      useEffect(() => {
        if (dismissed) return undefined
        const timer = setTimeout(() => {
          setVisible(true)
          try {
            if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(dismissKey, '1')
          } catch {
            // Ignore storage failures; the reminder still shows once for this mount.
          }
        }, 1400)
        return () => clearTimeout(timer)
      }, [dismissed, dismissKey])

      useEffect(() => {
        if (!visible) return undefined
        const timer = setTimeout(() => setVisible(false), 7000)
        return () => clearTimeout(timer)
      }, [visible])

      if (!visible || dismissed) return null

      const close = () => {
        setVisible(false)
        setDismissed(true)
      }

      return h(
        'div',
        { className: 'eo-bubble-toast', role: 'status' },
        h('span', { className: 'eo-bubble-pulse', 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'eo-bubble-copy' },
          h('b', null, tr('插件体检', 'Plugin checkup')),
          h('span', null, tr('先量成本，再决定关什么。', 'Measure first, then decide what to close.')),
        ),
        h('button', { type: 'button', className: 'eo-bubble-close', onClick: close, 'aria-label': tr('关闭提醒', 'Dismiss') }, '×'),
      )
    }

    function ReasoningCheckup({ text, running, renderFactorySlot }) {
      const snapshot = useTrimOverview()
      const data = snapshot.data
      const content = typeof renderFactorySlot === 'function'
        ? renderFactorySlot('conversation.chat.reasoning.content', { text, running })
        : null
      const tokens = data ? formatTokens(data.context.totalTokens) : ''
      return h(
        'div',
        { className: 'eo-thought' + (running ? ' is-running' : '') },
        data
          ? h(
              'div',
              {
                className: 'eo-thought-note',
                title: tr('体检数据来自当前 profile；54% 是示例降幅，不是关闭目标。', 'Checkup data comes from the current profile; 54% is a sample reduction, not a close target.'),
              },
              h('span', { className: 'eo-thought-pulse', 'aria-hidden': 'true' }),
              h('span', { className: 'eo-thought-label' }, tr('插件体检', 'Plugin checkup')),
              h('span', { className: 'eo-thought-meta' }, tokens + ' tokens'),
            )
          : null,
        h('div', { className: 'eo-thought-body' }, content),
      )
    }

    function actionLabel(action) {
      const map = {
        keep: ['保留', 'Keep'],
        enable: ['建议启用', 'Enable candidate'],
        'suggest-disable': ['建议关闭', 'Close candidate'],
        'disable-if-unused': ['未用可关闭', 'Unused candidate'],
        review: ['人工复核', 'Review'],
      }
      const pair = map[action]
      return pair ? tr(pair[0], pair[1]) : action
    }

    function actionTone(action) {
      return (
        {
          keep: 'neutral',
          enable: 'ok',
          'suggest-disable': 'danger',
          'disable-if-unused': 'warn',
          review: 'info',
        }[action] || 'neutral'
      )
    }

    function riskTone(risk) {
      return { low: 'ok', medium: 'warn', high: 'danger' }[risk] || 'neutral'
    }

    function severityTone(severity) {
      return { error: 'danger', warn: 'warn', info: 'info' }[severity] || 'neutral'
    }

    function domainLabel(domain) {
      return (
        {
          'plugin-runtime': '插件 ↔ DSH',
          'plugin-plugin': '插件 ↔ 插件',
          profile: tr('当前配置', 'Current profile'),
          workspace: '工作区',
        }[domain] || domain
      )
    }

    function isEligible(item) {
      return (
        item.protected !== true &&
        item.risk === 'low' &&
        (item.action === 'suggest-disable' || item.action === 'enable')
      )
    }

    function taskLabel(tag) {
      const map = {
        bugfix: ['修复', 'Bugfix'],
        feature: ['新功能', 'Feature'],
        review: ['审查', 'Review'],
        docs: ['文档', 'Docs'],
        release: ['发布', 'Release'],
        report: ['报告', 'Report'],
        research: ['调研', 'Research'],
        unknown: ['未知', 'Unknown'],
      }
      const pair = map[tag]
      return pair ? tr(pair[0], pair[1]) : tag
    }

    function riskLabel(risk) {
      const pair = { low: ['低', 'Low'], medium: ['中', 'Medium'], high: ['高', 'High'] }[risk]
      return pair ? tr(pair[0], pair[1]) : risk
    }

    function guardLabel(status) {
      const pair = {
        ok: ['正常', 'OK'],
        protected: ['受保护', 'Protected'],
        incompatible: ['不兼容', 'Incompatible'],
        warn: ['警告', 'Warning'],
      }[status]
      return pair ? tr(pair[0], pair[1]) : status
    }

    function usageLabel(state) {
      return state === 'used'
        ? tr('有调用记录', 'Used before')
        : state === 'unused'
          ? tr('窗口内 0 调用', 'No calls in window')
          : tr('无使用账本', 'No usage ledger')
    }

    function evidenceLabel(level) {
      return level === 'strong'
        ? tr('证据强', 'Strong evidence')
        : level === 'weak'
          ? tr('证据弱', 'Weak evidence')
          : tr('证据不足', 'Insufficient evidence')
    }

    function splitList(value) {
      return String(value || '')
        .split(/[,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    }

    async function fetchJson(path, options) {
      const request = {
        ...options,
        headers: { ...(options && options.headers ? options.headers : {}) },
      }
      if (request.body !== undefined) request.headers['content-type'] = 'application/json'
      const response = await fetch(path, request)
      let body = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok || !body || body.ok !== true) {
        const message =
          body && body.error && body.error.message
            ? body.error.message
            : 'HTTP ' + response.status + ' ' + response.statusText
        throw new Error(message)
      }
      return body.data
    }

    const ICON_PATHS = {
      gauge: [
        ['path', { d: 'M4 15a8 8 0 1 1 16 0' }],
        ['path', { d: 'M12 15l4-5' }],
        ['circle', { cx: '12', cy: '15', r: '1.4', fill: 'currentColor', stroke: 'none' }],
      ],
      recipe: [
        ['path', { d: 'M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z' }],
        ['path', { d: 'M8 8h7M8 12h7M8 16h4' }],
      ],
      book: [
        ['path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22z' }],
        ['path', { d: 'M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22z' }],
      ],
      info: [
        ['circle', { cx: '12', cy: '12', r: '9' }],
        ['path', { d: 'M12 11v6M12 7.5h.01' }],
      ],
      settings: [
        ['circle', { cx: '12', cy: '12', r: '3' }],
        ['path', { d: 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.4 7 7.2 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z' }],
      ],
      shield: [
        ['path', { d: 'M12 3l7 3v5c0 4.5-3 7.7-7 10-4-2.3-7-5.5-7-10V6z' }],
        ['path', { d: 'M9 12l2 2 4-5' }],
      ],
      restore: [
        ['path', { d: 'M4 10a8 8 0 1 1 2 5.3' }],
        ['path', { d: 'M4 4v6h6' }],
      ],
      context: [
        ['path', { d: 'M12 3l9 5-9 5-9-5z' }],
        ['path', { d: 'M3 12l9 5 9-5M3 16l9 5 9-5' }],
      ],
      plugin: [
        ['rect', { x: '4', y: '4', width: '6', height: '6', rx: '1' }],
        ['rect', { x: '14', y: '4', width: '6', height: '6', rx: '1' }],
        ['rect', { x: '4', y: '14', width: '6', height: '6', rx: '1' }],
        ['rect', { x: '14', y: '14', width: '6', height: '6', rx: '1' }],
      ],
      chevron: [['path', { d: 'M6 9l6 6 6-6' }]],
      arrow: [['path', { d: 'M20 12H4M10 6l-6 6 6 6' }]],
      arrowDown: [['path', { d: 'M12 4v16M6 14l6 6 6-6' }]],
    }

    function Icon({ name, size = 16 }) {
      const paths = ICON_PATHS[name] || ICON_PATHS.info
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          className: 'eo-icon',
        },
        paths.map(([tag, props], index) => h(tag, { key: index, ...props })),
      )
    }

    function Progress({ value, tone = 'neutral', label }) {
      const pct = Math.max(0, Math.min(100, Number(value) || 0))
      return h(
        'div',
        {
          className: 'eo-progress-track eo-progress-' + tone,
          role: 'progressbar',
          'aria-valuenow': Math.round(pct),
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-label': label,
          title: label,
        },
        h('i', { style: { width: pct + '%' } }),
      )
    }

    function OnboardingModal({ step, setStep, onFinish, onTutorial, onClose }) {
      const steps = [
        {
          icon: 'gauge',
          zh: '先量成本',
          en: 'Measure first',
          zhBody: '插件清单会显示每个插件占用的上下文比例；未归属部分单独标出。你砍掉的不只是工具白名单。',
          enBody: 'The plugin inventory shows each plugin’s share of attributable context. Unattributed context is kept separate — the cost is not only the tool allowlist.',
        },
        {
          icon: 'recipe',
          zh: '再生成方案',
          en: 'Build a plan',
          zhBody: '选任务类型或写一句目标，点击“生成方案”。默认只生成草稿，不会改任何插件。',
          enBody: 'Pick a task or describe the goal, then build a plan. It is a draft by default and changes nothing.',
        },
        {
          icon: 'shield',
          zh: '最后安全确认',
          en: 'Confirm safely',
          zhBody: '只有依据充分才标建议关闭；定时/触发插件、有调用记录的插件只进入复核。应用前写入还原点，随时恢复。',
          enBody: 'Only strong evidence becomes a close candidate. Scheduled/trigger plugins and plugins with calls go to review. A restore point is written before any change.',
        },
      ]
      const current = steps[step] || steps[0]
      useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      return h(
        'div',
        {
          className: 'eo-modal-backdrop',
          onClick: onClose,
          role: 'presentation',
        },
        h(
          'div',
          {
            className: 'eo-modal eo-onboarding',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'eo-onboarding-title',
            onClick: (event) => event.stopPropagation(),
          },
          h(
            'div',
            { className: 'eo-onboarding-head' },
            h('span', { className: 'eo-onboarding-icon' }, h(Icon, { name: current.icon, size: 22 })),
            h(
              'div',
              null,
              h('div', { className: 'eo-onboarding-kicker' }, tr('新手引导', 'First-run guide')),
              h('h3', { id: 'eo-onboarding-title' }, tr(current.zh, current.en)),
            ),
          ),
          h('p', null, tr(current.zhBody, current.enBody)),
          h(
            'div',
            { className: 'eo-progress-dots', 'aria-label': tr('新手引导进度', 'Guide progress') },
            steps.map((item, index) =>
              h('span', {
                key: item.en,
                className: index === step ? 'eo-progress-dot eo-progress-dot-active' : 'eo-progress-dot',
              }),
            ),
          ),
          h(
            'div',
            { className: 'eo-modal-actions' },
            h(Button, { variant: 'ghost', onClick: onClose }, tr('跳过', 'Skip')),
            step > 0
              ? h(Button, { variant: 'ghost', onClick: () => setStep(step - 1) }, tr('上一步', 'Back'))
              : null,
            h(Button, { variant: 'ghost', onClick: onTutorial }, tr('查看完整教程', 'Open full guide')),
            step < steps.length - 1
              ? h(Button, { variant: 'accent', onClick: () => setStep(step + 1) }, tr('下一步', 'Next'))
              : h(Button, { variant: 'accent', onClick: () => onFinish() }, tr('开始使用', 'Get started')),
          ),
        ),
      )
    }

    function AboutHero() {
      return h(
        'svg',
        {
          viewBox: '0 0 1200 300',
          className: 'eo-about-hero',
          role: 'img',
          'aria-label': tr('DSH 插件体检', 'DSH Plugin Checkup'),
        },
        h('defs', null,
          h('linearGradient', { id: 'eo-about-bg', x1: '0', y1: '0', x2: '1', y2: '1' },
            h('stop', { offset: '0', stopColor: '#0a1220' }),
            h('stop', { offset: '1', stopColor: '#101f34' }),
          ),
        ),
        h('rect', { width: '1200', height: '300', rx: '18', fill: 'url(#eo-about-bg)' }),
        h('circle', { cx: '1010', cy: '150', r: '94', fill: 'none', stroke: '#2a405e' }),
        h('circle', { cx: '1010', cy: '150', r: '58', fill: 'none', stroke: '#355070' }),
        h('path', { d: 'M944 116 L1004 88 L1076 112 L1092 174 L1038 214 L962 190 Z', fill: 'none', stroke: '#45658a', strokeWidth: '1.4' }),
        h('path', { d: 'M944 116 L1038 214 M1004 88 L962 190 M1076 112 L944 116', stroke: '#334d6b' }),
        [[944,116],[1004,88],[1076,112],[1092,174],[1038,214],[962,190]].map(([cx,cy],i) =>
          h('circle', { key: i, cx, cy, r: 8, fill: '#0f1b2c', stroke: '#5eead4', strokeWidth: 1.5 }),
        ),
        h('circle', { cx: '1010', cy: '150', r: '34', fill: '#0c1728', stroke: '#fbbf24', strokeWidth: 1.5 }),
        h('path', { d: 'M1010 127 L1028 136 L1028 154 C1028 168 1019 177 1010 181 C1001 177 992 168 992 154 L992 136 Z', fill: 'none', stroke: '#fbbf24', strokeWidth: 1.8 }),
        h('path', { d: 'M1002 151 L1008 157 L1019 144', fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('text', { x: '64', y: '72', fill: '#5eead4', fontFamily: 'ui-monospace, monospace', fontSize: '13', letterSpacing: '2.4' }, 'DSH PLUGIN SUITE · AGPL-3.0'),
        h('text', { x: '62', y: '142', fill: '#f2f7ff', fontFamily: 'Noto Sans SC, sans-serif', fontSize: '44', fontWeight: '700' }, tr('DSH 插件体检', 'DSH Plugin Checkup')),
        h('text', { x: '64', y: '184', fill: '#c3d3e8', fontFamily: 'Noto Sans SC, sans-serif', fontSize: '20' }, tr('少一点插件负担，多一点兼容确定性。', 'Less plugin overhead, more compatibility certainty.')),
        h('g', { transform: 'translate(64 220)' },
          [tr('插件体检', 'Plugin checkup'), tr('兼容性', 'Compatibility'), tr('工作流配方', 'Workflow recipe')].map((label, i) =>
            h('g', { key: label, transform: `translate(${i * 150} 0)` },
              h('rect', { width: '138', height: '30', rx: '15', fill: 'rgba(94,234,212,.08)', stroke: 'rgba(94,234,212,.35)' }),
              h('circle', { cx: '16', cy: '15', r: '3', fill: ['#5eead4','#60a5fa','#fbbf24'][i] }),
              h('text', { x: '28', y: '20', fill: '#dce9f9', fontFamily: 'Noto Sans SC, sans-serif', fontSize: '13' }, label),
            ),
          ),
        ),
        h('text', { x: '64', y: '286', fill: '#7f93b0', fontFamily: 'ui-monospace, monospace', fontSize: '11', letterSpacing: '1.2' }, 'github.com/Starlit-Sky-code/dsh-experience-optimizer'),
      )
    }

    function MainGuide() {
      const [visible, setVisible] = useState(() => {
        const storage = browserStorage()
        try { return storage ? storage.getItem(MAIN_GUIDE_KEY) !== '1' : true } catch { return true }
      })
      const [stepsOpen, setStepsOpen] = useState(true)
      const dismiss = () => {
        const storage = browserStorage()
        try { if (storage) storage.setItem(MAIN_GUIDE_KEY, '1') } catch { /* ignore */ }
        setVisible(false)
      }
      if (!visible) return null
      const steps = [
        [tr('点击「更多」', 'Open “More”'), tr('在 DSH 主界面打开更多菜单。', 'Open the More menu on the DSH main screen.')],
        [tr('点击「设置」', 'Open “Settings”'), tr('进入设置页。', 'Open Settings.')],
        [tr('点击「插件体检」', 'Open “Plugin checkup”'), tr('在 Agent 预设下方或插件页签里找到插件体检。', 'Find it below Agent presets or in the plugins tab.')],
        [tr('生成体检方案', 'Build a checkup plan'), tr('选任务或写目标，先看依据，再决定是否应用。', 'Pick a task or goal, read the evidence, then decide.')],
        [tr('需要时看教程', 'Open the guide'), tr('教程、常见问题和关于都在同一页。', 'Guide, FAQ, and About live in the same panel.')],
      ]
      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'eo-guide-beacon', 'aria-hidden': 'true' },
          h('span', null, tr('更多', 'More')),
          h(Icon, { name: 'arrowDown', size: 18 }),
        ),
        h(
        'div',
        { className: 'eo-main-guide', role: 'dialog', 'aria-label': tr('初次使用路径', 'First-run path') },
        h('div', { className: 'eo-guide-arrow' }, h(Icon, { name: 'arrow', size: 22 })),
        h('p', { className: 'eo-guide-kicker' }, tr('初次使用', 'FIRST RUN')),
        h('h3', null, tr('从这里打开插件体检', 'Open Plugin checkup here')),
        h(
          'div',
          { className: 'eo-guide-path' },
          h('span', null, tr('更多', 'More')),
          h('i', null, '→'),
          h('span', null, tr('设置', 'Settings')),
          h('i', null, '→'),
          h('span', null, tr('插件体检', 'Plugin checkup')),
        ),
        h('p', { className: 'eo-guide-note' }, tr('打开后会先出现新手引导；「教程」页有完整 5 步。', 'First-run onboarding opens there; the Guide tab has the full five steps.')),
        stepsOpen
          ? h('ol', { className: 'eo-guide-steps' }, steps.map(([title, body], index) =>
              h('li', { key: title }, h('b', null, String(index + 1).padStart(2, '0')), h('span', null, title), h('small', null, body)),
            ))
          : null,
        h(
          'div',
          { className: 'eo-guide-actions' },
          h(Button, { variant: 'ghost', onClick: () => setStepsOpen((value) => !value) }, stepsOpen ? tr('收起步骤', 'Hide steps') : tr('查看 5 步教程', 'Show 5 steps')),
          h(Button, { variant: 'accent', onClick: dismiss }, tr('知道了', 'Got it')),
        ),
        ),
      )
    }

    function ActivationGuide({ onDismiss, onOpenDetails }) {
      const steps = [
        [tr('打开插件体检', 'Open Plugin checkup'), tr('设置 → 插件体检，或在插件页签里找到它。', 'Settings → Plugin checkup, or find it in the Plugins tab.')],
        [tr('先扫描', 'Scan first'), tr('看可归属上下文、兼容性和插件清单，不急着关任何东西。', 'Review attributable context, compatibility, and inventory before closing anything.')],
        [tr('生成体检方案', 'Build a checkup plan'), tr('选任务或写目标；默认只生成草稿。', 'Pick a task or write a goal; the default is a draft only.')],
        [tr('看依据再决定', 'Read the evidence'), tr('周期、已有调用、无账本都会先保护或复核。', 'Schedules, prior calls, or no ledger go to protection or review first.')],
        [tr('需要时看完整教程', 'Open the full guide'), tr('「教程」页有 5 分钟上手和常见问题。', 'The Guide tab has the five-minute walkthrough and FAQ.')],
      ]
      return h(
        'section',
        { className: 'eo-activation', role: 'dialog', 'aria-label': tr('插件体检初次使用', 'Plugin checkup first run') },
        h(
          'div',
          { className: 'eo-activation-head' },
          h('div', { className: 'eo-activation-icon' }, h(Icon, { name: 'gauge', size: 20 })),
          h('div', null,
            h('h3', null, tr('插件体检已启用', 'Plugin checkup is enabled')),
            h('p', null, tr('先量成本，再决定关什么。5 步上手：', 'Measure first, then decide what to close. Five steps:')),
          ),
        ),
        h(
          'ol',
          { className: 'eo-activation-steps' },
          steps.map(([title, body], index) =>
            h('li', { key: title },
              h('b', null, String(index + 1).padStart(2, '0')),
              h('span', null, h('strong', null, title), h('small', null, body)),
            ),
          ),
        ),
        h(
          'div',
          { className: 'eo-activation-actions' },
          h('button', { type: 'button', className: 'eo-activation-btn', onClick: onDismiss }, tr('开始使用', 'Start using it')),
          h('button', { type: 'button', className: 'eo-activation-btn eo-activation-primary', onClick: onOpenDetails }, tr('查看插件详情', 'Open plugin details')),
        ),
      )
    }

    function ExperiencePanel() {

      const [tab, setTab] = useState('trim')
      const [locale, setLocale] = useState(detectLocale)
      const [showOnboarding, setShowOnboarding] = useState(false)
      const [onboardingStep, setOnboardingStep] = useState(0)
      const [collapsedCards, setCollapsedCards] = useState({ context: true })
      const [layout, setLayout] = useState(() => readPref('layout', 'standard'))
      const [density, setDensity] = useState(() => readPref('density', 'comfortable'))
      const [overview, setOverview] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')
      const [toast, setToast] = useState(null)
      const [showInfo, setShowInfo] = useState(false)
      const [showAllFindings, setShowAllFindings] = useState(false)
      const [showContext, setShowContext] = useState(false)
      const [findingQuery, setFindingQuery] = useState('')
      const [findingSeverity, setFindingSeverity] = useState('all')
      const [bundleQuery, setBundleQuery] = useState('')
      const [bundleFilter, setBundleFilter] = useState('all')
      const [bundleSort, setBundleSort] = useState('tokens')
      const [showAllBundles, setShowAllBundles] = useState(false)
      const [taskTag, setTaskTag] = useState('unknown')
      const [goal, setGoal] = useState('')
      const [draft, setDraft] = useState(null)
      const [draftBusy, setDraftBusy] = useState(false)
      const [selected, setSelected] = useState({})
      const [confirmState, setConfirmState] = useState(null)
      const [applyResult, setApplyResult] = useState(null)
      const [rollbackToken, setRollbackToken] = useState('')
      const [recipeForm, setRecipeForm] = useState({
        goal: '我想每周自动整理项目周报，数据来自 Git log',
        scope: '当前工作区',
        frequency: '每周一 09:00',
        sources: 'Git log',
        outputFormat: 'Markdown',
        delivery: '对话内交付（present）',
        onFailure: '保留草稿并在对话中通知',
        acceptance: '时间范围正确, 输出内容可读, 失败可恢复',
      })
      const [recipeResult, setRecipeResult] = useState(null)
      const [recipeBusy, setRecipeBusy] = useState(false)
      const [settings, setSettings] = useState(null)
      const [settingsDraft, setSettingsDraft] = useState(null)
      const [settingsBusy, setSettingsBusy] = useState(false)
      const [settingsApplying, setSettingsApplying] = useState(false)
      const [settingsError, setSettingsError] = useState('')
      const [updateInfo, setUpdateInfo] = useState(null)
      const [updateBusy, setUpdateBusy] = useState(false)
      CURRENT_LOCALE = locale

      const notify = useCallback((message, kind) => {
        setToast({ message, kind: kind || 'ok', id: Date.now() })
      }, [])

      useEffect(() => {
        if (!toast) return undefined
        const timer = setTimeout(() => setToast(null), 4200)
        return () => clearTimeout(timer)
      }, [toast])

      const refresh = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
          const data = await fetchJson(API + '/overview')
          setOverview(data)
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err))
        } finally {
          setLoading(false)
        }
      }, [])

      useEffect(() => {
        void refresh()
      }, [refresh])

      useEffect(() => {
        if (typeof document !== 'undefined') document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
        persistLocale(locale)
      }, [locale])

      useEffect(() => {
        if (!readOnboarding()) setShowOnboarding(true)
      }, [])

      const switchLocale = useCallback((next) => {
        setLocale(next)
        persistLocale(next)
      }, [])

      const finishOnboarding = useCallback((destination) => {
        writeOnboarding()
        setShowOnboarding(false)
        setOnboardingStep(0)
        if (destination === 'tutorial') setTab('tutorial')
      }, [])

      const replayOnboarding = useCallback(() => {
        resetOnboarding()
        setOnboardingStep(0)
        setShowOnboarding(true)
      }, [])

      const toggleCard = useCallback((id) => {
        setCollapsedCards((current) => ({ ...current, [id]: !current[id] }))
      }, [])
      const collapseAllCards = useCallback(() => {
        setCollapsedCards({ draft: true, inventory: true, compat: true, context: true, result: true, dedupe: true, diagnostics: true })
      }, [])
      const expandAllCards = useCallback(() => setCollapsedCards({}), [])
      const changeLayout = useCallback((value) => {
        setLayout(value)
        writePref('layout', value)
      }, [])
      const changeDensity = useCallback((value) => {
        setDensity(value)
        writePref('density', value)
      }, [])

      const loadSettings = useCallback(async () => {
        setSettingsBusy(true)
        setSettingsError('')
        try {
          const data = await fetchJson(API + '/config')
          setSettings(data)
          setSettingsDraft(data)
        } catch (err) {
          setSettingsError(err instanceof Error ? err.message : String(err))
        } finally {
          setSettingsBusy(false)
        }
      }, [])

      const settingsChanged = useMemo(() => {
        if (!settings || !settingsDraft) return false
        const fields = ['mode', 'approvalMode', 'suggestionPolicy', 'approvalThreshold', 'trackUsage', 'usageRetentionDays', 'maxDrafts', 'protect', 'pinned']
        return JSON.stringify(fields.map((field) => settingsDraft[field])) !==
          JSON.stringify(fields.map((field) => settings[field]))
      }, [settings, settingsDraft])

      const updateSettingsField = useCallback((field, value) => {
        setSettingsDraft((current) => current ? { ...current, [field]: value } : current)
      }, [])

      const discardSettings = useCallback(() => {
        setSettingsDraft(settings ? { ...settings } : null)
        setSettingsError('')
      }, [settings])

      const applySettings = useCallback(async () => {
        if (!settingsDraft) return
        setSettingsApplying(true)
        setSettingsError('')
        try {
          const payload = {
            mode: settingsDraft.mode,
            approvalMode: settingsDraft.approvalMode,
            suggestionPolicy: settingsDraft.suggestionPolicy,
            approvalThreshold: settingsDraft.approvalThreshold,
            trackUsage: settingsDraft.trackUsage,
            usageRetentionDays: settingsDraft.usageRetentionDays,
            maxDrafts: settingsDraft.maxDrafts,
            protect: settingsDraft.protect,
            pinned: settingsDraft.pinned,
          }
          const data = await fetchJson(API + '/config', {
            method: 'POST',
            body: JSON.stringify(payload),
          })
          setSettings(data)
          setSettingsDraft(data)
          notify(tr('设置已应用，插件会重新加载', 'Settings applied; the plugin will reload'))
        } catch (err) {
          setSettingsError(err instanceof Error ? err.message : String(err))
        } finally {
          setSettingsApplying(false)
        }
      }, [settingsDraft, notify])

      const checkUpdate = useCallback(async () => {
        setUpdateBusy(true)
        try {
          setUpdateInfo(await fetchJson(API + '/update'))
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          setUpdateInfo({
            current: '0.3.8',
            latest: null,
            updateAvailable: false,
            error: /unknown endpoint/i.test(message)
              ? tr('当前安装版本不支持在线检查，请更新到最新版', 'This installed version does not support the online check; update to the latest version.')
              : message,
          })
        } finally {
          setUpdateBusy(false)
        }
      }, [])

      const findings = useMemo(() => {
        if (!overview) return []
        const query = findingQuery.trim().toLowerCase()
        return overview.findings.filter((finding) => {
          if (!showInfo && finding.severity === 'info') return false
          if (findingSeverity !== 'all' && finding.severity !== findingSeverity) return false
          if (query.length === 0) return true
          return [finding.code, finding.title, finding.domain, ...finding.subjects]
            .join(' ')
            .toLowerCase()
            .includes(query)
        })
      }, [overview, showInfo, findingSeverity, findingQuery])

      const filteredBundles = useMemo(() => {
        if (!overview) return []
        const query = bundleQuery.trim().toLowerCase()
        const rows = overview.bundles.filter((bundle) => {
          if (
            bundleFilter === 'enabled' && !bundle.enabled ||
            bundleFilter === 'disabled' && bundle.enabled ||
            bundleFilter === 'protected' && !bundle.protected
          ) {
            return false
          }
          if (query.length === 0) return true
          return (bundle.name + ' ' + (bundle.description ?? '')).toLowerCase().includes(query)
        })
        return rows.sort((left, right) => {
          if (bundleSort === 'name') return left.name.localeCompare(right.name)
          if (bundleSort === 'usage') {
            const a = (left.usage?.calls ?? 0) + (left.usage?.sessionCalls ?? 0)
            const b = (right.usage?.calls ?? 0) + (right.usage?.sessionCalls ?? 0)
            return b - a
          }
          return (right.contextTokens ?? 0) - (left.contextTokens ?? 0)
        })
      }, [overview, bundleQuery, bundleFilter, bundleSort])

      const enabledBundles = overview
        ? overview.bundles.filter((bundle) => bundle.enabled).length
        : 0
      const totalBundles = overview ? overview.bundles.length : 0
      const totalContextTokens = overview ? overview.context.totalTokens : 0
      const attributedContext = overview
        ? Math.max(0, overview.context.totalTokens - overview.context.unattributedTokens)
        : 0
      const contextPct = totalContextTokens > 0 ? (attributedContext / totalContextTokens) * 100 : 0
      const enabledPct = totalBundles > 0 ? (enabledBundles / totalBundles) * 100 : 0
      const compat = overview ? overview.compat : { error: 0, warn: 0, info: 0 }
      const compatPct = compat.error > 0 ? 0 : compat.warn > 0 ? 50 : 100
      const byOwner = overview ? overview.context.byOwner : []
      const maxOwner = Math.max(1, ...byOwner.map((owner) => owner.tokens))
      const selectedIds = Object.keys(selected).filter((id) => selected[id])
      const selectedCount = selectedIds.length
      const draftItems = draft ? draft.items : []
      const actionableDraftItems = draftItems.filter(
        (item) => item.action !== 'keep' && item.protected !== true,
      )
      const periodicDraftCount = draftItems.filter((item) => item.periodic === true).length
      const strongDraftCount = draftItems.filter((item) => item.evidenceLevel === 'strong').length

      const generateDraft = useCallback(async () => {
        setDraftBusy(true)
        setError('')
        try {
          const data = await fetchJson(API + '/suggest', {
            method: 'POST',
            body: JSON.stringify({
              taskTag: taskTag === 'unknown' ? undefined : taskTag,
              goal: goal.trim() || undefined,
              includeReview: true,
            }),
          })
          setDraft(data.profile)
          setApplyResult(null)
          const nextSelected = {}
          for (const item of data.profile.items) {
            if (isEligible(item)) nextSelected[item.id] = true
          }
          setSelected(nextSelected)
          notify(
            '已生成 ' +
              data.profile.items.length +
              ' 条建议，其中 ' +
              Object.keys(nextSelected).length +
              ' 条可应用',
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          setError(message)
          notify(message, 'error')
        } finally {
          setDraftBusy(false)
        }
      }, [goal, notify, taskTag])

      const toggleItem = useCallback((id) => {
        setSelected((previous) => ({ ...previous, [id]: !previous[id] }))
      }, [])

      const selectAll = useCallback(() => {
        const next = {}
        for (const item of draftItems) if (isEligible(item)) next[item.id] = true
        setSelected(next)
      }, [draftItems])

      const clearSelection = useCallback(() => setSelected({}), [])

      const openApply = useCallback(() => {
        if (selectedCount === 0) {
          notify('请先勾选要应用的低风险项', 'warn')
          return
        }
        setConfirmState({ type: 'apply', ids: selectedIds })
      }, [notify, selectedCount, selectedIds])

      const doApply = useCallback(async () => {
        if (!draft) return
        const ids = confirmState && confirmState.ids ? confirmState.ids : []
        setConfirmState(null)
        setDraftBusy(true)
        try {
          const result = await fetchJson(API + '/apply', {
            method: 'POST',
            body: JSON.stringify({ profileId: draft.id, confirm: true, items: ids }),
          })
          setApplyResult(result)
          if (result.token) setRollbackToken(result.token)
          notify(
            result.rolledBack
              ? '应用未完成，已自动恢复'
              : '已应用 ' +
                  result.items.filter((item) => item.status === 'applied').length +
                  ' 项',
            result.rolledBack ? 'warn' : 'ok',
          )
          await refresh()
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          notify(message, 'error')
        } finally {
          setDraftBusy(false)
        }
      }, [confirmState, draft, notify, refresh])

      const openRollback = useCallback(() => {
        setConfirmState({ type: 'rollback' })
      }, [])

      const doRollback = useCallback(async () => {
        setConfirmState(null)
        setDraftBusy(true)
        try {
          const result = await fetchJson(API + '/rollback', {
            method: 'POST',
            body: JSON.stringify({ token: rollbackToken || undefined }),
          })
          setApplyResult(null)
          setRollbackToken('')
          notify(
            '已恢复 ' +
              result.items.filter((item) => item.status === 'restored').length +
              ' 项',
          )
          await refresh()
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          notify(message, 'error')
        } finally {
          setDraftBusy(false)
        }
      }, [notify, refresh, rollbackToken])

      const generateRecipe = useCallback(async () => {
        if (!recipeForm.goal.trim()) {
          notify('请先填写业务目标', 'warn')
          return
        }
        setRecipeBusy(true)
        try {
          const data = await fetchJson(RECIPE_API + '/plan', {
            method: 'POST',
            body: JSON.stringify({
              goal: recipeForm.goal.trim(),
              forceBlueprint: true,
              answers: {
                scope: recipeForm.scope,
                frequency: recipeForm.frequency,
                sources: splitList(recipeForm.sources),
                outputFormat: recipeForm.outputFormat,
                delivery: recipeForm.delivery,
                onFailure: recipeForm.onFailure,
                acceptance: splitList(recipeForm.acceptance),
              },
            }),
          })
          setRecipeResult(data)
          notify('蓝图已生成：' + data.blueprint.steps.length + ' 个步骤')
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          notify(message, 'error')
        } finally {
          setRecipeBusy(false)
        }
      }, [notify, recipeForm])

      const exportRecipe = useCallback(async () => {
        if (!recipeResult) return
        try {
          const data = await fetchJson(RECIPE_API + '/export', {
            method: 'POST',
            body: JSON.stringify({ blueprint: recipeResult.blueprint, format: 'both' }),
          })
          notify('已导出运行手册：' + (data.markdownPath || data.jsonPath || ''))
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          notify(message, 'error')
        }
      }, [notify, recipeResult])

      const updateRecipe = useCallback((key, value) => {
        setRecipeForm((previous) => ({ ...previous, [key]: value }))
      }, [])

      return h(
        'div',
        { className: 'eo-root' },
        h(
          'div',
          { className: 'eo-hero' },
          h(
            'div',
            { className: 'eo-hero-copy' },
            h('h2', { className: 'eo-title' }, tr('插件体检', 'Plugin checkup')),
            h('p', { className: 'eo-sub' }, tr('先量常驻成本，再判断该不该关；兼容性与工作流一起看。', 'Measure resident cost first, then decide what to close. Compatibility and workflows included.')),
          ),
          h(
            'div',
            { className: 'eo-hero-actions' },
            h(
              'span',
              { className: 'eo-status', title: overview ? overview.profile.dir : '' },
              overview ? tr('当前配置：', 'Profile: ') + overview.profile.name : tr('读取中', 'Loading'),
            ),
            h(
              Button,
              {
                variant: 'ghost',
                onClick: () => switchLocale(locale === 'zh' ? 'en' : 'zh'),
                title: tr('切换语言', 'Switch language'),
              },
              locale === 'zh' ? 'EN' : '中文',
            ),
          ),
        ),
        h(
          'div',
          { className: 'eo-tabs', role: 'tablist' },
          TABS.map((item) =>
            h(
              'button',
              {
                key: item.id,
                type: 'button',
                role: 'tab',
                'aria-selected': tab === item.id,
                className: 'eo-tab' + (tab === item.id ? ' eo-tab-active' : ''),
                onClick: () => {
                  setTab(item.id)
                  if (item.id === 'settings' && settings === null && !settingsBusy) void loadSettings()
                },
              },
              h(Icon, { name: item.icon, size: 15 }),
              tr(item.zh, item.en),
            ),
          ),
        ),
        error
          ? h(
              'div',
              { className: 'eo-error' },
              h('span', null, error),
              h(Button, { onClick: refresh, variant: 'ghost' }, '重试'),
            )
          : null,
        loading && !overview
          ? h(
              'div',
              { className: 'eo-loading' },
              h('span', { className: 'eo-spinner' }),
              '正在读取插件画像与兼容性数据…',
            )
          : null,
        h(
          'div',
          { className: 'eo-tab-panel', key: tab },
          tab === 'tutorial'
            ? renderTutorial()
            : tab === 'settings'
              ? renderSettings()
              : tab === 'about'
                ? renderAbout()
                : overview
                  ? tab === 'trim'
                    ? renderTrim()
                    : renderRecipe()
                  : null,
        ),
        confirmState
          ? h(ConfirmModal, {
              state: confirmState,
              draft,
              busy: draftBusy,
              onCancel: () => setConfirmState(null),
              onConfirm: confirmState.type === 'apply' ? doApply : doRollback,
            })
          : null,
        toast
          ? h('div', { className: 'eo-toast eo-toast-' + toast.kind }, toast.message)
          : null,
        showOnboarding
          ? h(OnboardingModal, {
              step: onboardingStep,
              setStep: setOnboardingStep,
              onFinish: () => finishOnboarding(),
              onTutorial: () => finishOnboarding('tutorial'),
              onClose: () => finishOnboarding(),
            })
          : null,
      )

      function renderTutorial() {
        const quickStarts = [
          {
            zhLabel: '代码审查', enLabel: 'Code review',
            zhDesc: '先看兼容性，再生成审查任务的精简方案', enDesc: 'Check compatibility, then build a review plan',
            run: () => {
              setTaskTag('review')
              setGoal(tr('审查当前改动，指出风险、回归点和需要补测的地方', 'Review current changes: risks, regressions, and missing tests'))
              setTab('trim')
              notify(tr('已填入审查任务，点击“生成方案”继续', 'Review task filled; click “Build plan” to continue'))
            },
          },
          {
            zhLabel: '修复问题', enLabel: 'Fix an issue',
            zhDesc: '排除无关插件，保留调试与文件工具', enDesc: 'Drop unrelated plugins; keep debugging and file tools',
            run: () => {
              setTaskTag('bugfix')
              setGoal(tr('修复一个可复现的 bug，并验证没有回归', 'Fix a reproducible bug and verify no regressions'))
              setTab('trim')
              notify(tr('已填入修复任务，点击“生成方案”继续', 'Bugfix task filled; click “Build plan” to continue'))
            },
          },
          {
            zhLabel: '整理周报', enLabel: 'Weekly report',
            zhDesc: '进入工作流配方，生成可导出的周报蓝图', enDesc: 'Open the recipe builder for an exportable report blueprint',
            run: () => {
              setTab('recipe')
              notify(tr('已打开工作流配方，按表单确认范围与交付方式', 'Recipe builder opened; confirm scope and delivery'))
            },
          },
        ]
        const steps = [
          ['先扫描。', 'Scan first.', ' 打开「插件体检」，看可归属上下文、兼容性和插件清单；清单里的“占比”就是常驻成本的可见化。', ' Open Plugin checkup to see attributable context, compatibility, and inventory. The Share column makes resident cost visible.'],
          ['再生成方案。', 'Build a plan.', ' 选任务类型或写一句目标，点击“生成方案”。默认只生成草稿，不会改任何插件。', ' Pick a task or write a goal, then Build plan. It only creates a draft; no plugin is changed.'],
          ['看判断依据。', 'Read the evidence.', ' 只有“窗口内 0 调用 + 有上下文成本 + 非周期 + 任务高置信”才会标为建议关闭；其余进入人工复核。', ' Only zero calls in the window, attributable cost, no schedule/trigger hint, and high task confidence produce a close candidate. Everything else goes to review.'],
          ['确认后应用。', 'Confirm and apply.', ' 勾选低风险项，点击“应用选中”，核对弹窗后写入还原点并应用；需要时可一键恢复。', ' Select low-risk items, apply, review the dialog, then write a restore point and apply. Recover in one click if needed.'],
          ['需要工作流时。', 'Need a workflow?', ' 打开「工作流配方」，生成带审批级别的蓝图，导出 Markdown/JSON 运行手册。', ' Open Workflow recipe to generate a blueprint with approval levels and export Markdown/JSON.'],
        ]
        const faq = [
          [tr('为什么我几乎没有“建议关闭”？', 'Why do I see almost no close candidates?'), tr('这是默认的保守策略：没有使用账本、当前任务置信度不够、插件带周期/触发器语义，或已经有调用记录时，只会进入人工复核。', 'This is the conservative default: no usage ledger, low task confidence, schedule/trigger hints, or existing calls all route to review.')],
          [tr('每月才用一次的插件会被误伤吗？', 'Will a once-a-month plugin be hurt?'), tr('带“每月/每周/定时/提醒/日程/dream”等语义的插件会被硬保护。仍不放心时，把它加入配置的 protect 列表。', 'Plugins with monthly/weekly/schedule/reminder/calendar/dream hints are hard-protected. Add it to the protect list if you want extra safety.')],
          [tr('应用后出问题怎么办？', 'What if something breaks after apply?'), tr('每次应用前都会写入还原点；在精简方案底部点击“恢复最近”，或让 Agent 调用 trim_rollback_profile。恢复同样需要安全确认。', 'A restore point is written before every apply. Use Restore latest, or call trim_rollback_profile. Rollback also requires host approval.')],
          [tr('为什么应用还需要确认和审批？', 'Why do apply actions need confirmation and approval?'), tr('confirm: true 只是提案标记，真正授权来自安全确认返回 allowed-once；被拒绝、取消或审批服务不可用时一律不写入。', 'confirm: true is only a proposal marker. Host approval returning allowed-once is the real grant; rejection, cancellation, or unavailable approval never writes.')],
        ]
        return h(
          'div',
          { className: 'eo-stack' },
          h(
            Card,
            {
              title: tr('5 分钟上手', 'Five-minute guide'),
              subtitle: tr('从扫描到应用，每一步都可恢复', 'From scan to apply, every step is recoverable'),
              extra: h(Badge, { tone: 'info' }, tr('5 步', '5 steps')),
            },
            h(
              'div',
              { className: 'eo-tutorial-flow' },
              steps.map(([zhTitle, enTitle, zhBody, enBody], index) =>
                h(
                  'div',
                  { className: 'eo-tutorial-step', key: enTitle },
                  h('div', { className: 'eo-tutorial-num' }, String(index + 1).padStart(2, '0')),
                  h(
                    'div',
                    { className: 'eo-tutorial-copy' },
                    h('strong', null, tr(zhTitle, enTitle)),
                    h('p', null, tr(zhBody, enBody)),
                  ),
                ),
              ),
            ),
          ),
          h(
            Card,
            { title: tr('按任务快速开始', 'Quick start by task'), subtitle: tr('只是填入表单，不会直接修改插件', 'Only fills the form; changes nothing') },
            h(
              'div',
              { className: 'eo-inline' },
              quickStarts.map((item) =>
                h(
                  'div',
                  { key: item.enLabel, className: 'eo-issue', style: { flex: '1 1 180px', flexDirection: 'column', alignItems: 'flex-start' } },
                  h('strong', null, tr(item.zhLabel, item.enLabel)),
                  h('span', { className: 'eo-muted' }, tr(item.zhDesc, item.enDesc)),
                  h(Button, { variant: 'ghost', onClick: item.run }, tr('开始', 'Start')),
                ),
              ),
            ),
          ),
          h(
            Card,
            { title: tr('常见问题', 'FAQ'), subtitle: tr('先看依据，再做决定', 'Read the evidence first') },
            faq.map(([q, a]) =>
              h('details', { className: 'eo-faq', key: q },
                h('summary', null, q),
                h('p', null, a),
              ),
            ),
          ),
        )
      }

      function configPatch(data) {
        const lines = [
          '- id: dsh-plugin-trim',
          '  config:',
          '    mode: ' + data.mode,
          '    approvalMode: ' + data.approvalMode,
          '    suggestionPolicy: ' + data.suggestionPolicy,
          '    approvalThreshold: ' + data.approvalThreshold,
          '    trackUsage: ' + String(data.trackUsage),
          '    usageRetentionDays: ' + data.usageRetentionDays,
          '    maxDrafts: ' + data.maxDrafts,
        ]
        if (data.protect.length > 0) {
          lines.push('    protect:')
          for (const name of data.protect) lines.push('      - ' + name)
        }
        if (data.pinned.length > 0) {
          lines.push('    pinned:')
          for (const name of data.pinned) lines.push('      - ' + name)
        }
        return lines.join('\n')
      }

      async function copyConfig(data) {
        try {
          await navigator.clipboard.writeText(configPatch(data))
          notify(tr('配置片段已复制；写入配置补丁后生效', 'Snippet copied; apply it to the profile patch'))
        } catch {
          notify(tr('无法访问剪贴板，请手动复制配置片段', 'Clipboard unavailable; copy the snippet manually'), 'warn')
        }
      }

      function renderSettings() {
        if (settingsBusy && settings === null) {
          return h('div', { className: 'eo-loading' }, h('span', { className: 'eo-spinner' }), tr('正在读取当前生效设置…', 'Loading effective settings…'))
        }
        if (settingsError && settings === null) {
          return h('div', { className: 'eo-error' }, h('span', null, settingsError), h(Button, { variant: 'ghost', onClick: loadSettings }, tr('重试', 'Retry')))
        }
        if (!settings) return h('div', { className: 'eo-empty' }, tr('暂无设置数据。', 'No settings data.'))
        const form = settingsDraft || settings
        const dirty = settingsChanged
        const option = (labelZh, labelEn, value) => h('option', { key: value, value }, tr(labelZh, labelEn))
        const inputNumber = (field, min, max) => h('input', {
          className: 'eo-input eo-input-number',
          type: 'number',
          min,
          max,
          value: form[field],
          onChange: (event) => updateSettingsField(field, Number(event.target.value)),
        })
        return h(
          'div',
          { className: 'eo-stack' },
          h(
            Card,
            {
              className: 'eo-settings-readonly',
              title: tr('修改后点击应用', 'Review changes, then apply'),
              subtitle: tr('不会自动写入；应用会更新当前 profile', 'Nothing is written until you apply'),
            },
            h('div', { className: 'eo-muted' }, tr('这里的修改先保存在页面草稿中，点击应用才会写入当前 profile 并重载插件。审批与保护逻辑不会因为改设置而跳过。', 'Changes stay as a page draft until you apply. Applying writes the current profile and reloads the plugin; approval and protection are never skipped.')),
          ),
          h(
            Card,
            {
              title: tr('界面偏好', 'Interface preferences'),
              subtitle: tr('即时生效；偏好保存在本浏览器', 'Applied immediately; saved in this browser'),
            },
            h('div', { className: 'eo-settings-row' }, h('span', null, tr('内容排列', 'Content layout')),
              h('div', { className: 'eo-inline' },
                h(Button, { variant: 'ghost', className: layout === 'standard' ? 'eo-btn-active' : '', onClick: () => changeLayout('standard') }, tr('标准', 'Standard')),
                h(Button, { variant: 'ghost', className: layout === 'two' ? 'eo-btn-active' : '', onClick: () => changeLayout('two') }, tr('双列', 'Two-column')),
              ),
            ),
            h('div', { className: 'eo-settings-row' }, h('span', null, tr('密度', 'Density')),
              h('div', { className: 'eo-inline' },
                h(Button, { variant: 'ghost', className: density === 'comfortable' ? 'eo-btn-active' : '', onClick: () => changeDensity('comfortable') }, tr('舒适', 'Comfortable')),
                h(Button, { variant: 'ghost', className: density === 'compact' ? 'eo-btn-active' : '', onClick: () => changeDensity('compact') }, tr('紧凑', 'Compact')),
              ),
            ),
            h('div', { className: 'eo-settings-row' }, h('span', null, tr('卡片', 'Cards')),
              h('div', { className: 'eo-inline' },
                h(Button, { variant: 'ghost', onClick: collapseAllCards }, tr('全部折叠', 'Collapse all')),
                h(Button, { variant: 'ghost', onClick: expandAllCards }, tr('全部展开', 'Expand all')),
              ),
            ),
          ),
          h(
            Card,
            {
              title: tr('插件设置', 'Plugin settings'),
              subtitle: tr('改动后才会出现应用按钮；应用会重载插件', 'The apply button appears after changes; applying reloads the plugin'),
            },
            h(
              'div',
              { className: 'eo-settings-grid' },
              h('div', { className: 'eo-settings-row' }, h('span', null, tr('当前配置', 'Profile')), h('code', null, form.profile)),
              h('div', { className: 'eo-settings-row' }, h('span', null, tr('运行模式', 'Mode')),
                h('select', { className: 'eo-select eo-settings-control', value: form.mode, onChange: (event) => updateSettingsField('mode', event.target.value) },
                  option('建议模式', 'Advice mode', 'advise'),
                  option('自动安全（收窄建议）', 'Auto-safe (narrower)', 'auto-safe'),
                ),
              ),
              h('div', { className: 'eo-settings-row' }, h('span', null, tr('审批策略', 'Approval')),
                h('select', { className: 'eo-select eo-settings-control', value: form.approvalMode, onChange: (event) => updateSettingsField('approvalMode', event.target.value) },
                  option('每次工具写入都审批', 'Approve every tool write', 'always'),
                  option('仅超过阈值时审批', 'Approve only above threshold', 'risk-based'),
                ),
              ),
              h('div', { className: 'eo-settings-row' }, h('span', null, tr('审批阈值', 'Approval threshold')), inputNumber('approvalThreshold', 1, 100)),
              h('div', { className: 'eo-settings-row' }, h('span', null, tr('建议策略', 'Suggestion policy')),
                h('select', { className: 'eo-select eo-settings-control', value: form.suggestionPolicy, onChange: (event) => updateSettingsField('suggestionPolicy', event.target.value) },
                  option('证据优先（推荐）', 'Evidence-first (recommended)', 'conservative'),
                  option('旧评分（仍保护周期与已用插件）', 'Legacy score', 'balanced'),
                ),
              ),
              h('div', { className: 'eo-settings-row' }, h('span', null, tr('使用账本', 'Usage ledger')),
                h('label', { className: 'eo-check' },
                  h('input', { type: 'checkbox', checked: form.trackUsage, onChange: (event) => updateSettingsField('trackUsage', event.target.checked) }),
                  h('span', null, form.trackUsage ? tr('开启', 'On') : tr('关闭', 'Off')),
                ),
              ),
              h('div', { className: 'eo-settings-row' }, h('span', null, tr('账本保留', 'Ledger retention')), inputNumber('usageRetentionDays', 1, 365)),
              h('div', { className: 'eo-settings-row' }, h('span', null, tr('草稿/还原点上限', 'Draft/snapshot limit')), inputNumber('maxDrafts', 1, 200)),
              h('div', { className: 'eo-settings-row eo-settings-row-wide' }, h('span', null, tr('保护名单', 'Protect list')),
                h('input', { className: 'eo-input eo-settings-control', value: form.protect.join(', '), placeholder: tr('包名，用逗号分隔', 'Package names, comma separated'), onChange: (event) => updateSettingsField('protect', splitList(event.target.value)) }),
              ),
              h('div', { className: 'eo-settings-row eo-settings-row-wide' }, h('span', null, tr('固定名单', 'Pinned list')),
                h('input', { className: 'eo-input eo-settings-control', value: form.pinned.join(', '), placeholder: tr('包名，用逗号分隔', 'Package names, comma separated'), onChange: (event) => updateSettingsField('pinned', splitList(event.target.value)) }),
              ),
            ),
            h('div', { className: 'eo-muted', style: { marginTop: '10px' } }, tr('配置目录：', 'Config directory: ') + form.profileDir),
            settingsError ? h('div', { className: 'eo-error', style: { marginTop: '10px' } }, h('span', null, settingsError)) : null,
            dirty
              ? h('div', { className: 'eo-applybar' },
                  h('span', null, tr('有未应用的修改', 'Unapplied changes')),
                  h('div', { className: 'eo-inline' },
                    h(Button, { variant: 'ghost', onClick: discardSettings, disabled: settingsApplying }, tr('撤销', 'Discard')),
                    h(Button, { variant: 'accent', onClick: () => void applySettings(), disabled: settingsApplying }, settingsApplying ? tr('应用中…', 'Applying…') : tr('应用修改', 'Apply changes')),
                  ),
                )
              : h('div', { className: 'eo-muted', style: { marginTop: '10px' } }, tr('修改任意设置后，这里会出现「应用修改」。', 'The Apply button appears here after you change a setting.')),
          ),
          h(
            Card,
            { title: tr('更新与反馈', 'Updates & feedback'), subtitle: tr('检查 npm 最新版本；反馈请走 GitHub Issues', 'Check the latest npm version; feedback via GitHub Issues') },
            h('div', { className: 'eo-settings-row' }, h('span', null, tr('当前版本', 'Current version')), h('code', null, updateInfo?.current || '0.3.8')),
            h('div', { className: 'eo-settings-row' }, h('span', null, tr('最新版本', 'Latest version')), h('code', null, updateInfo ? (updateInfo.latest || tr('检查失败', 'Check failed')) : tr('未检查', 'Not checked'))),
            updateInfo && updateInfo.updateAvailable
              ? h('div', { className: 'eo-issue' }, h('span', null, tr('发现新版本：', 'New version available: ') + updateInfo.latest + ' · '), h('a', { href: updateInfo.url, target: '_blank', rel: 'noreferrer' }, tr('查看 npm', 'View npm')))
              : updateInfo && updateInfo.latest
                ? h('div', { className: 'eo-issue' }, h('span', null, tr('已是最新版本。', 'You are on the latest version.')))
                : updateInfo && updateInfo.error
                  ? h('div', { className: 'eo-issue eo-issue-warn' }, h('span', null, tr('检查失败：', 'Check failed: ') + updateInfo.error))
                  : null,
            h('div', { className: 'eo-inline', style: { marginTop: '10px' } },
              h(Button, { variant: 'accent', onClick: () => void checkUpdate(), disabled: updateBusy }, updateBusy ? tr('检查中…', 'Checking…') : tr('检查更新', 'Check for updates')),
              h('a', { className: 'eo-btn eo-btn-ghost', href: 'https://github.com/Starlit-Sky-code/dsh-experience-optimizer/issues/new/choose', target: '_blank', rel: 'noreferrer' }, tr('新建 Issue', 'New issue')),
              h('a', { className: 'eo-btn eo-btn-ghost', href: ABOUT_LINKS.issues, target: '_blank', rel: 'noreferrer' }, tr('问题列表', 'Issues')),
            ),
          ),
          h(
            Card,
            { title: tr('配置片段', 'Configuration snippet'), subtitle: tr('当前草稿的可复制片段', 'Copyable snippet for the current draft'), extra: h(Button, { variant: 'accent', onClick: () => void copyConfig(form) }, tr('复制片段', 'Copy snippet')) },
            h('pre', { className: 'eo-codeblock' }, configPatch(form)),
          ),
        )
      }

      async function copyInstall() {
        try {
          await navigator.clipboard.writeText('npm i dsh-plugin-trim\nnpm i dsh-plugin-recipe')
          notify(tr('安装命令已复制', 'Install commands copied'))
        } catch {
          notify(tr('无法访问剪贴板，请手动复制安装命令', 'Clipboard unavailable; copy the commands manually'), 'warn')
        }
      }

      function renderAbout() {
        const links = [
          ['GitHub', ABOUT_LINKS.repo],
          [tr('npm · 插件体检', 'npm · plugin checkup'), ABOUT_LINKS.npmTrim],
          [tr('npm · 工作流配方', 'npm · workflow recipe'), ABOUT_LINKS.npmRecipe],
          [tr('发布记录', 'Releases'), ABOUT_LINKS.releases],
          [tr('问题反馈', 'Issues'), ABOUT_LINKS.issues],
        ]
        return h(
          'div',
          { className: 'eo-stack' },
          h(
            Card,
            {
              title: tr('关于项目', 'About the project'),
              subtitle: tr('插件体检、兼容性检查与工作流蓝图', 'Plugin checkup, compatibility checks, and workflow recipes'),
              section: 'about',
            },
            h(AboutHero),
            h(
              'div',
              { className: 'eo-about-grid' },
              h(
                'div',
                { className: 'eo-about-card' },
                h('div', { className: 'eo-inline', style: { marginBottom: '8px' } }, h(Icon, { name: 'shield', size: 24 }), h('strong', null, 'DSH Plugin Checkup')),
                h('p', null, tr('少一点插件负担，多一点兼容确定性。', 'Less plugin overhead, more compatibility certainty.')),
                h('p', null, tr('版本：', 'Version: ') + '0.3.8 · AGPL-3.0-only'),
                h('p', null, tr('作者：Starlit Sky', 'Author: Starlit Sky')),
              ),
              h(
                'div',
                { className: 'eo-about-card' },
                h('h4', null, tr('项目链接', 'Project links')),
                h(
                  'ul',
                  { className: 'eo-link-list' },
                  links.map(([label, href]) =>
                    h('li', { key: label }, h('a', { href, target: '_blank', rel: 'noreferrer' }, label, ' ↗')),
                  ),
                ),
              ),
            ),
            h(
              'div',
              { className: 'eo-inline', style: { marginTop: '12px' } },
              h(Button, { variant: 'accent', onClick: () => void copyInstall() }, tr('复制安装命令', 'Copy install commands')),
              h(Button, { variant: 'ghost', onClick: () => setTab('tutorial') }, tr('打开完整教程', 'Open full guide')),
              h(Button, { variant: 'ghost', onClick: replayOnboarding }, tr('重新查看新手引导', 'Replay first-run guide')),
            ),
          ),
          h(
            Card,
            {
              title: tr('交流与支持', 'Community & support'),
              subtitle: tr('真实链接优先；未填写的内容明确标为待补充', 'Real links first; unset items are clearly marked'),
              section: 'about',
            },
            h(
              'div',
              { className: 'eo-about-grid' },
              h(
                'div',
                { className: 'eo-about-card' },
                h('h4', null, tr('交流群', 'Community')),
                h('p', null, tr('QQ 群：', 'QQ group: ') + (ABOUT_LINKS.qqGroup || tr('待补充', 'To be added'))),
                ABOUT_LINKS.qqLink
                  ? h('a', { href: ABOUT_LINKS.qqLink, target: '_blank', rel: 'noreferrer' }, tr('加入群聊', 'Join group'))
                  : h('span', { className: 'eo-muted' }, tr('群号/链接待补充', 'Group number/link to be added')),
              ),
              h(
                'div',
                { className: 'eo-about-card' },
                h('h4', null, tr('支持项目', 'Support the project')),
                ABOUT_LINKS.donate.length === 0
                  ? h('p', null, tr('捐赠方式：待补充。当前可通过反馈、文档和插件试用支持项目。', 'Donation methods: to be added. Feedback, docs, and trying the plugins are the best support today.'))
                  : ABOUT_LINKS.donate.map((item) =>
                      h('p', { key: item.label }, h('a', { href: item.href, target: '_blank', rel: 'noreferrer' }, item.label)),
                    ),
              ),
            ),
            h('p', { className: 'eo-copyright' }, COPYRIGHT),
          ),
          h(
            Card,
            {
              title: tr('隐私与边界', 'Privacy & boundaries'),
              subtitle: tr('本地优先，只读分析，写入需确认', 'Local-first, read-only analysis, confirmed writes'),
              section: 'about',
            },
            h(
              'ul',
              { className: 'eo-link-list' },
              h('li', null, tr('不执行 !!js、不 import 未加载插件、不联网分析。', 'No !!js execution, no importing unloaded plugins, no network analysis.')),
              h('li', null, tr('应用前写入还原点；恢复同样需要安全确认。', 'A restore point is written before apply; rollback also needs host approval.')),
              h('li', null, tr('定时/触发插件、已有调用记录、无使用账本项不会自动建议关闭。', 'Scheduled/trigger plugins, used plugins, and items without a ledger never become automatic close candidates.')),
              h('li', null, tr('Copyright © 2026 Starlit Sky · AGPL-3.0-only', 'Copyright © 2026 Starlit Sky · AGPL-3.0-only')),
            ),
          ),
        )
      }

      function renderTrim() {
        const renderInventoryCards = () =>
          h(
            'div',
            { className: 'eo-inventory-grid' },
            filteredBundles.slice(0, showAllBundles ? 200 : 12).map((bundle) =>
              h(
                'div',
                { className: 'eo-inventory-card', key: bundle.name },
                h(
                  'div',
                  { className: 'eo-inventory-card-head' },
                  h('code', null, bundle.name),
                  h(
                    Badge,
                    { tone: bundle.enabled ? 'ok' : 'neutral' },
                    bundle.enabled ? tr('已启用', 'Enabled') : tr('已禁用', 'Disabled'),
                  ),
                ),
                bundle.description ? h('div', { className: 'eo-muted' }, bundle.description) : null,
                h(
                  'div',
                  { className: 'eo-inventory-card-meta' },
                  h('span', null, tr('上下文', 'Context') + ' ' + formatNumber(bundle.contextTokens)),
                  h(
                    'span',
                    null,
                    tr('占比', 'Share') +
                      ' ' +
                      (totalContextTokens > 0
                        ? Math.round((bundle.contextTokens / totalContextTokens) * 100) + '%'
                        : '—'),
                  ),
                  h(
                    'span',
                    null,
                    tr('调用', 'Calls') +
                      ' ' +
                      formatNumber((bundle.usage?.calls ?? 0) + (bundle.usage?.sessionCalls ?? 0)),
                  ),
                  bundle.protected ? h('span', null, tr('受保护', 'Protected')) : null,
                  h('span', null, bundle.guardStatus ? guardLabel(bundle.guardStatus) : '—'),
                ),
              ),
            ),
          )
        return h(
          'div',
          {
            className:
              'eo-stack' +
              (layout === 'two' ? ' eo-layout-two' : '') +
              (density === 'compact' ? ' eo-density-compact' : ''),
          },
          h('div', { className: 'eo-grid eo-metrics' }, [
            h(Metric, {
              key: 'tokens',
              label: tr('可归属上下文', 'Attributable context'),
              value: formatTokens(overview.context.totalTokens),
              hint: tr('tokens · 不含未归属', 'tokens · excludes unattributed') + ' · ' + Math.round(contextPct) + '%',
              progress: contextPct,
              progressTone: 'ok',
            }),
            h(Metric, {
              key: 'bundles',
              label: tr('启用插件', 'Enabled plugins'),
              value: enabledBundles + ' / ' + totalBundles,
              hint: tr('已启用 / 全部插件', 'enabled / total plugins'),
              progress: enabledPct,
            }),
            h(Metric, {
              key: 'compat',
              label: tr('兼容性', 'Compatibility'),
              value: compat.error + tr(' 错 · ', ' err · ') + compat.warn + tr(' 警', ' warn'),
              hint: tr('错误 / 警告 · 信息 ', 'errors / warnings · info ') + compat.info,
              tone: compat.error > 0 ? 'danger' : compat.warn > 0 ? 'warn' : 'ok',
              progress: compatPct,
              progressTone: compat.error > 0 ? 'danger' : compat.warn > 0 ? 'warn' : 'ok',
            }),
            h(Metric, {
              key: 'manage',
              label: tr('写操作', 'Write access'),
              value: overview.managementAvailable ? tr('可应用', 'Ready') : tr('只读', 'Read-only'),
              hint: overview.managementAvailable ? tr('插件管理器可用', 'Plugin manager available') : tr('缺少插件管理器', 'Plugin manager unavailable'),
              tone: overview.managementAvailable ? 'ok' : 'danger',
            }),
          ]),
          h(
            Card,
            {
              title: tr('兼容性检查', 'Compatibility check'),
              subtitle: tr('插件 ↔ 插件 · 插件 ↔ DSH · 当前配置 / 工作区', 'Plugin ↔ plugin · plugin ↔ DSH · profile / workspace'),
              section: 'compat', collapsible: true, collapsed: collapsedCards.compat === true, onToggle: () => toggleCard('compat'),
              extra: h(
                'div',
                { className: 'eo-inline' },
                findings.length > 5
                  ? h(
                      Button,
                      {
                        variant: 'ghost',
                        onClick: () => setShowAllFindings((value) => !value),
                      },
                      showAllFindings ? tr('收起', 'Collapse') : tr('查看全部', 'Show all') + ' ' + findings.length,
                    )
                  : null,
                h(
                  Button,
                  {
                    variant: 'ghost',
                    onClick: () => setShowInfo((value) => !value),
                  },
                  showInfo ? tr('隐藏信息', 'Hide info') : tr('显示信息', 'Show info'),
                ),
                h(Badge, { tone: compat.error ? 'danger' : 'ok' }, compat.error ? tr('需要处理', 'Needs attention') : tr('无阻断', 'No blockers')),
              ),
            },
            h(
              'div',
              { className: 'eo-toolbar', style: { marginBottom: '10px' } },
              h(
                Field,
                { label: tr('搜索兼容性', 'Search findings') },
                h('input', {
                  className: 'eo-input',
                  placeholder: tr('代码 / 标题 / 对象', 'Code / title / subject'),
                  value: findingQuery,
                  onChange: (event) => setFindingQuery(event.target.value),
                }),
              ),
              h(
                Field,
                { label: tr('级别', 'Severity') },
                h(
                  'select',
                  {
                    className: 'eo-select',
                    value: findingSeverity,
                    onChange: (event) => setFindingSeverity(event.target.value),
                  },
                  h('option', { value: 'all' }, tr('全部', 'All')),
                  h('option', { value: 'error' }, tr('错误', 'Error')),
                  h('option', { value: 'warn' }, tr('警告', 'Warning')),
                  h('option', { value: 'info' }, tr('信息', 'Info')),
                ),
              ),
            ),
            h(
              'div',
              { className: 'eo-severity-bar', 'aria-label': tr('兼容性分布', 'Compatibility distribution') },
              compat.error + compat.warn + compat.info === 0
                ? h('span', { className: 'eo-severity-empty' })
                : [
                    compat.error > 0 ? h('span', { key: 'e', className: 'eo-severity-error', style: { flex: compat.error } }) : null,
                    compat.warn > 0 ? h('span', { key: 'w', className: 'eo-severity-warn', style: { flex: compat.warn } }) : null,
                    compat.info > 0 ? h('span', { key: 'i', className: 'eo-severity-info', style: { flex: compat.info } }) : null,
                  ],
            ),
            findings.length === 0
              ? h('div', { className: 'eo-empty' }, tr('没有匹配的兼容性问题。', 'No matching compatibility findings.'))
              : h(
                  'div',
                  { className: 'eo-findings' },
                  findings.slice(0, showAllFindings ? 60 : 5).map((finding, index) =>
                    h(
                      'div',
                      { className: 'eo-finding', key: finding.code + index },
                      h(Dot, { severity: finding.severity }),
                      h(
                        'div',
                        { className: 'eo-finding-body' },
                        h(
                          'div',
                          { className: 'eo-finding-title' },
                          h('code', null, finding.code),
                          finding.title,
                        ),
                        h(
                          'div',
                          { className: 'eo-finding-meta' },
                          domainLabel(finding.domain) +
                            ' · ' +
                            finding.confidence +
                            ' · ' +
                            finding.subjects.join(', '),
                        ),
                        finding.fix && finding.fix.summary
                          ? h(
                              'div',
                              { className: 'eo-finding-fix' },
                              '修复：' + finding.fix.summary,
                            )
                          : null,
                      ),
                    ),
                  ),
                ),
          ),
          h(
            Card,
            {
              title: tr('上下文成本', 'Context cost'),
              section: 'context', collapsible: true, collapsed: collapsedCards.context === true, onToggle: () => toggleCard('context'),
              subtitle:
                '总计 ' +
                formatNumber(overview.context.totalTokens) +
                ' tokens，未归属 ' +
                formatNumber(overview.context.unattributedTokens),
              extra: h(
                Button,
                { variant: 'ghost', onClick: () => setShowContext((value) => !value) },
                showContext ? tr('收起明细', 'Collapse details') : tr('查看明细', 'View details'),
              ),
            },
            h(
              'div',
              { className: 'eo-owner-list' },
              byOwner.slice(0, 7).map((owner) =>
                h(
                  'div',
                  { className: 'eo-owner', key: owner.owner },
                  h(
                    'div',
                    { className: 'eo-owner-head' },
                    h('span', null, owner.owner),
                    h('span', null, formatNumber(owner.tokens)),
                  ),
                  h(
                    'div',
                    { className: 'eo-bar' },
                    h('i', {
                      style: { width: Math.max(3, (owner.tokens / maxOwner) * 100) + '%' },
                    }),
                  ),
                ),
              ),
            ),
            showContext
              ? h(
              'table',
              { className: 'eo-table' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  h('th', null, 'Section / Tool'),
                  h('th', null, 'Owner'),
                  h('th', null, tr('上下文', 'Context')),
                ),
              ),
              h(
                'tbody',
                null,
                [
                  ...overview.context.topSections.map((section) => ({
                    name: section.name,
                    owner: section.owner,
                    tokens: section.tokens,
                    kind: section.source === 'context' ? 'context' : 'section',
                  })),
                  ...overview.context.topTools.map((tool) => ({
                    name: tool.name,
                    owner: tool.owner,
                    tokens: tool.tokens,
                    kind: 'tool',
                  })),
                ]
                  .sort((left, right) => right.tokens - left.tokens)
                  .slice(0, 10)
                  .map((row, index) =>
                    h(
                      'tr',
                      { key: row.kind + ':' + row.name + index },
                      h(
                        'td',
                        null,
                        h('code', null, row.kind + ' · ' + row.name),
                      ),
                      h('td', { className: 'eo-muted' }, row.owner || 'unattributed'),
                      h('td', null, formatNumber(row.tokens)),
                    ),
                  ),
              ),
            )
              : null,
          ),
          h(
            Card,
            {
              title: tr('插件清单', 'Plugin inventory'),
              subtitle: `${filteredBundles.length} / ${totalBundles} ` + tr('个匹配 · 只读', 'matched · read-only'),
              section: 'inventory', collapsible: true, collapsed: collapsedCards.inventory === true, onToggle: () => toggleCard('inventory'),
              extra: h(
                Button,
                { variant: 'ghost', onClick: () => setShowAllBundles((value) => !value) },
                showAllBundles ? '收起' : '查看全部',
              ),
            },
            h(
              'div',
              { className: 'eo-toolbar', style: { marginBottom: '10px' } },
              h(
                Field,
                { label: tr('搜索插件', 'Search plugins') },
                h('input', {
                  className: 'eo-input',
                  placeholder: '名称 / 描述',
                  value: bundleQuery,
                  onChange: (event) => setBundleQuery(event.target.value),
                }),
              ),
              h(
                Field,
                { label: tr('状态', 'Status') },
                h(
                  'select',
                  {
                    className: 'eo-select',
                    value: bundleFilter,
                    onChange: (event) => setBundleFilter(event.target.value),
                  },
                  h('option', { value: 'all' }, tr('全部', 'All')),
                  h('option', { value: 'enabled' }, tr('启用', 'Enabled')),
                  h('option', { value: 'disabled' }, tr('禁用', 'Disabled')),
                  h('option', { value: 'protected' }, tr('受保护', 'Protected')),
                ),
              ),
              h(
                Field,
                { label: tr('排序', 'Sort') },
                h(
                  'select',
                  {
                    className: 'eo-select',
                    value: bundleSort,
                    onChange: (event) => setBundleSort(event.target.value),
                  },
                  h('option', { value: 'tokens' }, tr('上下文 tokens', 'Context tokens')),
                  h('option', { value: 'usage' }, tr('调用次数', 'Call count')),
                  h('option', { value: 'name' }, tr('名称', 'Name')),
                ),
              ),
            ),
            filteredBundles.length === 0
              ? h('div', { className: 'eo-empty' }, tr('没有匹配的插件。', 'No matching plugins.'))
              : layout === 'two'
                ? renderInventoryCards()
                : h(
                  'div',
                  { className: 'eo-table-wrap' },
                  h(
                  'table',
                  { className: 'eo-table' },
                  h(
                    'thead',
                    null,
                    h(
                      'tr',
                      null,
                      h('th', null, tr('插件', 'Plugin')),
                      h('th', null, tr('状态', 'Status')),
                      h('th', { className: 'eo-col-secondary' }, tr('保护', 'Protected')),
                      h('th', { className: 'eo-col-secondary' }, tr('兼容状态', 'Compatibility')),
                      h('th', null, tr('上下文', 'Context')),
                      h('th', null, tr('占比', 'Share')),
                      h('th', null, tr('调用', 'Calls')),
                    ),
                  ),
                  h(
                    'tbody',
                    null,
                    filteredBundles.slice(0, showAllBundles ? 200 : 12).map((bundle) =>
                      h(
                        'tr',
                        { key: bundle.name },
                        h(
                          'td',
                          null,
                          h('code', null, bundle.name),
                          bundle.description
                            ? h('div', { className: 'eo-muted' }, bundle.description)
                            : null,
                        ),
                        h(
                          'td',
                          null,
                          h(
                            Badge,
                            { tone: bundle.enabled ? 'ok' : 'neutral' },
                            bundle.enabled ? tr('已启用', 'Enabled') : tr('已禁用', 'Disabled'),
                          ),
                        ),
                        h(
                          'td',
                          { className: 'eo-col-secondary' },
                          bundle.protected ? h(Badge, { tone: 'warn' }, tr('受保护', 'Protected')) : '—',
                        ),
                        h('td', { className: 'eo-muted eo-col-secondary' }, bundle.guardStatus ? guardLabel(bundle.guardStatus) : '—'),
                        h('td', null, formatNumber(bundle.contextTokens)),
                        h(
                          'td',
                          { className: 'eo-muted eo-share-cell', title: tr('占可归属上下文的比例', 'Share of attributable context') },
                          totalContextTokens > 0
                            ? Math.round((bundle.contextTokens / totalContextTokens) * 100) + '%'
                            : '—',
                        ),
                        h(
                          'td',
                          null,
                          formatNumber(
                            (bundle.usage?.calls ?? 0) + (bundle.usage?.sessionCalls ?? 0),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                ),
          ),
          h(
            Card,
            {
              title: tr('插件体检方案', 'Checkup plan'),
              subtitle: tr('先建议，后确认；受保护项永不改动', 'Suggest first, confirm later; protected items never change'),
              section: 'draft', collapsible: true, collapsed: collapsedCards.draft === true, onToggle: () => toggleCard('draft'),
            },
            h(
              'div',
              { className: 'eo-toolbar' },
              h(
                Field,
                { label: tr('任务类型', 'Task type') },
                h(
                  'select',
                  {
                    className: 'eo-select',
                    value: taskTag,
                    onChange: (event) => setTaskTag(event.target.value),
                  },
                  TASK_TAGS.map(([value]) =>
                    h('option', { value, key: value }, value === 'unknown' ? tr('自动识别', 'Auto-detect') : taskLabel(value)),
                  ),
                ),
              ),
              h(
                Field,
                { label: tr('任务目标（可选）', 'Goal (optional)') },
                h('input', {
                  className: 'eo-input',
                  value: goal,
                  placeholder: tr('例如：修复登录页崩溃', 'e.g. fix a login crash'),
                  onChange: (event) => setGoal(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') void generateDraft()
                  },
                }),
              ),
              h(
                Button,
                { variant: 'accent', onClick: generateDraft, disabled: draftBusy },
                draftBusy ? tr('生成中…', 'Building…') : tr('生成方案', 'Build plan'),
              ),
            ),
            draft
              ? h(
                  'div',
                  null,
                  h(
                    'div',
                    { className: 'eo-note' },
                    tr('判断依据：描述匹配只说明“可能相关”；出现定时/触发语义、已有调用记录、无使用账本或任务置信度不足时，只进入人工复核。只有“窗口内 0 调用 + 有上下文成本 + 非周期 + 任务高置信”才会标为建议关闭，且仍需确认与安全确认。', 'Evidence rule: a description match only means “possibly relevant”. Scheduled/trigger plugins, plugins with calls, an empty usage ledger, or low task confidence go to review. A close candidate requires zero calls in the window, attributable context cost, no schedule/trigger hint, and high task confidence — and still needs confirmation and host approval.'),
                  ),
                  h(
                    'div',
                    { className: 'eo-summary', style: { marginTop: '10px' } },
                    h(Badge, { tone: 'neutral' }, tr('保留', 'Keep') + ' ' + draft.summary.keep),
                    h(Badge, { tone: 'ok' }, tr('启用', 'Enable') + ' ' + draft.summary.enable),
                    h(Badge, { tone: 'danger' }, tr('建议关闭', 'Close') + ' ' + draft.summary.disable),
                    h(Badge, { tone: 'info' }, tr('复核', 'Review') + ' ' + draft.summary.review),
                    h(Badge, { tone: 'neutral' }, tr('受保护', 'Protected') + ' ' + draft.summary.protected),
                    h(Badge, { tone: 'warn' }, tr('周期保护', 'Scheduled') + ' ' + periodicDraftCount),
                    h(Badge, { tone: 'ok' }, tr('证据强', 'Strong evidence') + ' ' + strongDraftCount),
                    h(Badge, { tone: 'warn' }, tr('任务：', 'Task: ') + taskLabel(draft.task.tag)),
                  ),
                  actionableDraftItems.length === 0
                    ? h(
                        'div',
                        { className: 'eo-empty' },
                        tr('本轮没有强证据候选：周期/触发器、已有调用记录、无使用账本或低置信项只进入人工复核。', 'No strong candidates this round: scheduled/trigger plugins, used plugins, missing ledger, or low confidence all go to review.'),
                      )
                    : h(
                    'div',
                    { className: 'eo-list' },
                    actionableDraftItems
                      .slice(0, 60)
                      .map((item) =>
                        h(
                          'div',
                          {
                            className:
                              'eo-item' + (selected[item.id] ? ' eo-item-selected' : ''),
                            key: item.id,
                          },
                          isEligible(item)
                            ? h('input', {
                                type: 'checkbox',
                                checked: selected[item.id] === true,
                                onChange: () => toggleItem(item.id),
                                'aria-label': tr('选择 ', 'Select ') + item.name,
                              })
                            : h('span', { className: 'eo-lock', title: tr('受保护或非低风险', 'Protected or not low-risk') }),
                          h(
                            'div',
                            { className: 'eo-item-main' },
                            h(
                              'div',
                              { className: 'eo-item-title' },
                              h('span', { className: 'eo-item-name' }, item.name),
                              h(
                                Badge,
                                { tone: actionTone(item.action) },
                                actionLabel(item.action),
                              ),
                              h(Badge, { tone: riskTone(item.risk) }, tr('风险：', 'Risk: ') + riskLabel(item.risk)),
                              item.protected ? h(Badge, { tone: 'neutral' }, tr('受保护', 'Protected')) : null,
                              item.periodic ? h(Badge, { tone: 'warn' }, tr('周期/触发器', 'Scheduled / trigger')) : null,
                              item.usageState
                                ? h(
                                    Badge,
                                    {
                                      tone:
                                        item.usageState === 'used'
                                          ? 'ok'
                                          : item.usageState === 'unused'
                                            ? 'info'
                                            : 'neutral',
                                    },
                                    usageLabel(item.usageState),
                                  )
                                : null,
                              item.evidenceLevel === 'strong'
                                ? h(Badge, { tone: 'ok' }, tr('证据强', 'Strong evidence'))
                                : item.evidenceLevel === 'insufficient'
                                  ? h(Badge, { tone: 'neutral' }, tr('证据不足', 'Insufficient evidence'))
                                  : null,
                            ),
                            h('div', { className: 'eo-item-reason' }, item.reason),
                            h(
                              'div',
                              { className: 'eo-item-evidence' },
                              item.evidence.slice(0, 4).map((evidence, index) =>
                                h(
                                  'span',
                                  { className: 'eo-evidence', key: index },
                                  evidence.summary,
                                ),
                              ),
                            ),
                          ),
                          h(
                            'div',
                            { className: 'eo-item-side' },
                            h('span', null, Number(item.score).toFixed(2)),
                            h('small', null, tr('评分', 'Score')),
                          ),
                        ),
                      ),
                    ),
                  h(
                    'div',
                    { className: 'eo-applybar' },
                    h(
                      'span',
                      { className: 'eo-applybar-text' },
                      selectedCount + tr(' 个低风险项已选择 · 应用前会写入还原点', ' low-risk items selected · a restore point is written before apply'),
                    ),
                    h(
                      'div',
                      { className: 'eo-inline' },
                      h(Button, { variant: 'ghost', onClick: selectAll }, tr('全选低风险', 'Select low-risk')),
                      h(Button, { variant: 'ghost', onClick: clearSelection }, tr('清空', 'Clear')),
                      h(
                        Button,
                        {
                          variant: 'accent',
                          onClick: openApply,
                          disabled: selectedCount === 0 || draftBusy,
                        },
                        tr('应用选中', 'Apply selected'),
                      ),
                      h(
                        Button,
                        { variant: 'danger', onClick: openRollback, disabled: draftBusy },
                        tr('恢复最近', 'Restore latest'),
                      ),
                    ),
                  ),
                )
              : h(
                  'div',
                  { className: 'eo-empty' },
                  tr('生成方案后，这里会出现可解释的保留/启用/禁用建议。建议默认不会改动任何插件。', 'After building a plan, explainable keep/enable/disable suggestions appear here. Nothing changes by default.'),
                ),
          ),
          applyResult
            ? h(
                Card,
                {
                  title: tr('应用结果', 'Apply result'),
                  subtitle: applyResult.rolledBack ? tr('中途失败，已自动恢复', 'Failed midway; automatically restored') : tr('变更已写入当前配置', 'Changes written to the current profile'),
                  section: 'result', collapsible: true, collapsed: collapsedCards.result === true, onToggle: () => toggleCard('result'),
                  extra: h(
                    Badge,
                    { tone: applyResult.rolledBack ? 'warn' : 'ok' },
                    applyResult.rolledBack ? tr('已恢复', 'Restored') : tr('完成', 'Done'),
                  ),
                },
                h(
                  'table',
                  { className: 'eo-table' },
                  h(
                    'thead',
                    null,
                    h(
                      'tr',
                      null,
                      h('th', null, tr('项目', 'Item')),
                      h('th', null, tr('状态', 'Status')),
                      h('th', null, tr('应用方式', 'Application')),
                      h('th', null, tr('说明', 'Note')),
                    ),
                  ),
                  h(
                    'tbody',
                    null,
                    applyResult.items.map((item) =>
                      h(
                        'tr',
                        { key: item.id },
                        h('td', null, h('code', null, item.id)),
                        h(
                          'td',
                          null,
                          h(
                            Badge,
                            {
                              tone:
                                item.status === 'applied'
                                  ? 'ok'
                                  : item.status === 'failed'
                                    ? 'danger'
                                    : item.status === 'stale' ||
                                        item.status === 'blocked-by-compat'
                                      ? 'warn'
                                      : 'neutral',
                            },
                            item.status,
                          ),
                        ),
                        h('td', { className: 'eo-muted' }, item.application || '—'),
                        h('td', { className: 'eo-muted' }, item.error || item.fixKind || ''),
                      ),
                    ),
                  ),
                ),
                applyResult.token
                  ? h(
                      'div',
                      { className: 'eo-applybar' },
                      h(
                        'span',
                        { className: 'eo-code' },
                        'rollbackToken: ' + applyResult.token,
                      ),
                      h(
                        Button,
                        {
                          variant: 'ghost',
                          onClick: () => {
                            if (navigator.clipboard) {
                              void navigator.clipboard.writeText(applyResult.token)
                              notify(tr('还原点已复制', 'Restore point copied'))
                            }
                          },
                        },
                        '复制 token',
                      ),
                    )
                  : null,
                applyResult.restartRequired
                  ? h(
                      'div',
                      { className: 'eo-issue eo-issue-warn' },
                      h('span', null, '部分变更需要重启 DSH 后生效。'),
                    )
                  : null,
              )
            : null,
          draft && draft.dedupe && draft.dedupe.length > 0
            ? h(
                Card,
                { title: tr('跨插件提示词重复', 'Cross-plugin prompt duplication'), subtitle: tr('只建议，不修改第三方源码', 'Suggestion only; never edits third-party source'), section: 'dedupe', collapsible: true, collapsed: collapsedCards.dedupe === true, onToggle: () => toggleCard('dedupe') },
                h(
                  'div',
                  { className: 'eo-list' },
                  draft.dedupe.slice(0, 8).map((group) =>
                    h(
                      'div',
                      { className: 'eo-issue' + (group.conflict ? ' eo-issue-warn' : ''), key: group.fingerprint },
                      h(
                        'div',
                        null,
                        h('strong', null, '权威：' + group.authority),
                        h('div', { className: 'eo-muted' }, group.reason),
                        h(
                          'div',
                          { className: 'eo-muted' },
                          group.members
                            .filter((member) => member.section !== group.authority)
                            .map((member) => member.section)
                            .join(', '),
                        ),
                      ),
                    ),
                  ),
                ),
              )
            : null,
          overview.diagnostics && overview.diagnostics.length > 0
            ? h(
                'details',
                { className: 'eo-card', 'data-section': 'diagnostics' },
                h(
                  'summary',
                  { className: 'eo-card-title', style: { cursor: 'pointer' } },
                  '分析诊断（' + overview.diagnostics.length + '）',
                ),
                h(
                  'div',
                  { className: 'eo-list', style: { marginTop: '10px' } },
                  overview.diagnostics.slice(0, 10).map((diagnostic, index) =>
                    h('div', { className: 'eo-muted', key: index }, diagnostic),
                  ),
                ),
              )
            : null,
        )
      }

      function renderRecipe() {
        return h(
          'div',
          { className: 'eo-stack' },
          h(
            Card,
            {
              title: tr('工作流配方', 'Workflow recipe'),
              subtitle: tr('把业务目标翻译成可校验、可导出的工作流蓝图', 'Turn a business goal into a validated, exportable workflow blueprint'),
              extra: h(Badge, { tone: 'info' }, tr('最多 4 组追问', 'At most 4 question groups')),
            },
            h(
              'div',
              { className: 'eo-form-grid' },
              h(
                Field,
                { label: tr('业务目标', 'Goal'), className: 'eo-wide' },
                h('textarea', {
                  className: 'eo-textarea',
                  value: recipeForm.goal,
                  placeholder: tr('例如：我想每周自动整理项目周报，数据来自 Git log', 'e.g. a weekly project report from Git log'),
                  onChange: (event) => updateRecipe('goal', event.target.value),
                }),
              ),
              h(
                Field,
                { label: tr('项目 / 范围', 'Project / scope') },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.scope,
                  onChange: (event) => updateRecipe('scope', event.target.value),
                }),
              ),
              h(
                Field,
                { label: tr('频率', 'Frequency') },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.frequency,
                  onChange: (event) => updateRecipe('frequency', event.target.value),
                }),
              ),
              h(
                Field,
                { label: tr('数据来源', 'Sources'), hint: tr('逗号分隔', 'comma-separated') },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.sources,
                  onChange: (event) => updateRecipe('sources', event.target.value),
                }),
              ),
              h(
                Field,
                { label: tr('输出格式', 'Output format') },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.outputFormat,
                  onChange: (event) => updateRecipe('outputFormat', event.target.value),
                }),
              ),
              h(
                Field,
                { label: tr('交付方式', 'Delivery') },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.delivery,
                  onChange: (event) => updateRecipe('delivery', event.target.value),
                }),
              ),
              h(
                Field,
                { label: tr('失败处理', 'Failure handling') },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.onFailure,
                  onChange: (event) => updateRecipe('onFailure', event.target.value),
                }),
              ),
              h(
                Field,
                { label: tr('验收标准', 'Acceptance criteria'), hint: tr('逗号分隔', 'comma-separated'), className: 'eo-wide' },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.acceptance,
                  onChange: (event) => updateRecipe('acceptance', event.target.value),
                }),
              ),
            ),
            h(
              'div',
              { className: 'eo-applybar' },
              h(
                'span',
                { className: 'eo-muted' },
                tr('UI 预览按内置能力目录判断可用性；精确 agent-scope 校验以 recipe_plan_workflow 工具为准。', 'The UI preview uses the built-in capability catalog; exact agent-scope validation is provided by recipe_plan_workflow.'),
              ),
              h(
                Button,
                { variant: 'accent', onClick: generateRecipe, disabled: recipeBusy },
                recipeBusy ? tr('生成中…', 'Building…') : tr('生成工作流蓝图', 'Build workflow blueprint'),
              ),
            ),
          ),
          recipeResult
            ? renderRecipeResult(recipeResult)
            : h(
                'div',
                { className: 'eo-empty' },
                tr('填写目标后生成蓝图。这里只生成计划，不会创建 schedule，也不会修改插件。', 'Fill in a goal to generate a blueprint. This only plans; it creates no schedule and changes no plugin.'),
              ),
        )
      }

      function renderRecipeResult(result) {
        const blueprint = result.blueprint
        return h(
          'div',
          { className: 'eo-stack' },
          h(
            Card,
            {
              title: tr('蓝图预览', 'Blueprint preview'),
              subtitle:
                tr('模板 ', 'Template ') +
                blueprint.template +
                ' · ' +
                blueprint.steps.length +
                tr(' 个步骤 · ', ' steps · ') +
                blueprint.minPluginSet.length +
                tr(' 个最小插件', ' minimum plugins'),
              extra: h(
                'div',
                { className: 'eo-inline' },
                h(Button, { variant: 'ghost', onClick: exportRecipe }, tr('导出运行手册', 'Export runbook')),
              ),
            },
            h(
              'div',
              { className: 'eo-summary' },
              h(Badge, { tone: 'info' }, '模板：' + blueprint.template),
              h(Badge, { tone: 'neutral' }, '权限：' + blueprint.permissions.length),
              h(Badge, { tone: 'warn' }, '需审批：' + blueprint.steps.filter((step) => step.approvalLevel === 'required' || step.needsConfirm).length),
              h(Badge, { tone: 'neutral' }, '最小插件：' + blueprint.minPluginSet.length),
            ),
            h(
              'table',
              { className: 'eo-table' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  h('th', null, '#'),
                  h('th', null, '意图'),
                  h('th', null, '类型'),
                  h('th', null, '能力'),
                  h('th', null, '工具'),
                  h('th', null, '审批'),
                ),
              ),
              h(
                'tbody',
                null,
                blueprint.steps.map((step) =>
                  h(
                    'tr',
                    { key: step.id },
                    h('td', null, h('code', null, step.id)),
                    h('td', null, step.intent),
                    h('td', null, h(Badge, { tone: step.kind === 'schedule' ? 'warn' : 'neutral' }, step.kind)),
                    h('td', { className: 'eo-muted' }, step.capabilityId || '—'),
                    h('td', { className: 'eo-muted' }, step.toolNames.join(', ') || '—'),
                    h(
                      'td',
                      null,
                      h(
                        Badge,
                        {
                          tone:
                            (step.approvalLevel ?? (step.needsConfirm ? 'required' : 'none')) === 'required'
                              ? 'danger'
                              : (step.approvalLevel ?? 'none') === 'suggested'
                                ? 'warn'
                                : 'neutral',
                        },
                        step.approvalLevel ?? (step.needsConfirm ? 'required' : 'none'),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            h(
              'div',
              { className: 'eo-summary', style: { marginTop: '12px' } },
              blueprint.minPluginSet.map((plugin) =>
                h(Badge, { tone: 'info', key: plugin }, plugin),
              ),
            ),
            h(
              'div',
              { className: 'eo-list' },
              h(
                'div',
                { className: 'eo-issue' },
                h('span', null, h('strong', null, '失败策略：'), blueprint.failurePolicy),
              ),
              h(
                'div',
                { className: 'eo-issue' },
                h('span', null, h('strong', null, tr('恢复：', 'Restore: ')), blueprint.rollback),
              ),
            ),
            h(
              'div',
              { className: 'eo-spacer' },
            ),
            h(
              'div',
              { className: 'eo-field-label' },
              '验收清单',
            ),
            h(
              'div',
              { className: 'eo-list', style: { marginTop: '6px' } },
              blueprint.acceptance.map((item, index) =>
                h('div', { className: 'eo-muted', key: index }, '☐ ' + item),
              ),
            ),
          ),
          h(
            Card,
            {
              title: '校验与不确定性',
              subtitle:
                result.issues.filter((issue) => issue.level === 'error').length +
                ' error / ' +
                result.issues.filter((issue) => issue.level === 'warn').length +
                ' warn',
            },
            result.isWorkflow === false
              ? h(
                  'div',
                  { className: 'eo-issue eo-issue-warn' },
                  h('span', null, '这个目标看起来更像普通问答，蓝图可能不适用。'),
                )
              : null,
            h(
              'div',
              { className: 'eo-list' },
              result.issues.length === 0
                ? h('div', { className: 'eo-empty' }, '校验通过，未发现 error 或 warn。')
                : result.issues.slice(0, 20).map((issue, index) =>
                    h(
                      'div',
                      {
                        className:
                          'eo-issue ' + (issue.level === 'error' ? 'eo-issue-error' : 'eo-issue-warn'),
                        key: index,
                      },
                      h('code', null, issue.code),
                      h(
                        'span',
                        null,
                        issue.message + (issue.stepId ? '（' + issue.stepId + '）' : ''),
                      ),
                    ),
                  ),
            ),
            blueprint.uncertainties.length > 0
              ? h(
                  'div',
                  { style: { marginTop: '12px' } },
                  h('div', { className: 'eo-field-label' }, '不确定性'),
                  h(
                    'div',
                    { className: 'eo-list', style: { marginTop: '6px' } },
                    blueprint.uncertainties.map((item, index) =>
                      h('div', { className: 'eo-issue', key: index }, h('span', null, item)),
                    ),
                  ),
                )
              : null,
          ),
        )
      }
    }

    function ConfirmModal({ state, draft, busy, onCancel, onConfirm }) {
      const isApply = state.type === 'apply'
      const items =
        isApply && draft
          ? draft.items.filter((item) => state.ids.includes(item.id))
          : []
      return h(
        'div',
        { className: 'eo-modal-backdrop', onClick: onCancel },
        h(
          'div',
          { className: 'eo-modal', onClick: (event) => event.stopPropagation() },
          h('h3', null, isApply ? tr('确认应用精简方案', 'Confirm slim plan') : tr('确认恢复', 'Confirm restore')),
          h(
            'p',
            null,
            isApply
              ? tr('只会应用低风险项；受保护项不会被改动。应用前会写入还原点。', 'Only low-risk items are applied; protected items never change. A restore point is written first.')
              : tr('将恢复最近一次应用前的插件启用状态；已被外部改动的项会跳过。', 'Restores plugin state before the latest apply; externally changed items are skipped.'),
          ),
          isApply
            ? h(
                'div',
                { className: 'eo-modal-list' },
                items.map((item) =>
                  h(
                    'div',
                    { className: 'eo-item', key: item.id },
                    h(
                      'div',
                      { className: 'eo-item-main' },
                      h(
                        'div',
                        { className: 'eo-item-title' },
                        h('span', { className: 'eo-item-name' }, item.name),
                        h(Badge, { tone: actionTone(item.action) }, actionLabel(item.action)),
                        h(Badge, { tone: riskTone(item.risk) }, tr('风险：', 'Risk: ') + riskLabel(item.risk)),
                      ),
                      h('div', { className: 'eo-item-reason' }, item.reason),
                    ),
                  ),
                ),
              )
            : null,
          h(
            'div',
            { className: 'eo-modal-actions' },
            h(Button, { variant: 'ghost', onClick: onCancel, disabled: busy }, tr('取消', 'Cancel')),
            h(
              Button,
              { variant: isApply ? 'accent' : 'danger', onClick: onConfirm, disabled: busy },
              busy ? tr('处理中…', 'Working…') : isApply ? tr('确认应用', 'Confirm apply') : tr('确认恢复', 'Confirm restore'),
            ),
          ),
        ),
      )
    }

    function ExperienceOptimizerIcon({ size = 16, active = false }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: active ? 1.6 : 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('path', { d: 'M2.8 4h10.4' }),
        h('circle', { cx: 6, cy: 4, r: 1.45 }),
        h('path', { d: 'M2.8 8h10.4' }),
        h('circle', { cx: 10.2, cy: 8, r: 1.45 }),
        h('path', { d: 'M2.8 12h10.4' }),
        h('circle', { cx: 7.2, cy: 12, r: 1.45 }),
      )
    }

    function apply(ctx) {
      CURRENT_LOCALE = detectLocale()
      injectCss()
      ctx.slots.inject('conversation.composer.dock', () =>
        ctx.slots.register(
          {
            name: 'conversation.composer.dock',
            id: 'experience-optimizer-checkup',
            order: 20,
          },
          CheckupBubble,
        ),
      )
      ctx.slots.inject('conversation.chat.reasoning.body', () =>
        ctx.slots.register(
          {
            name: 'conversation.chat.reasoning.body',
            priority: 90,
          },
          ReasoningCheckup,
        ),
      )
      ctx.slots.inject('plugins.bundle.activation', () =>
        ctx.slots.register(
          {
            name: 'plugins.bundle.activation',
            key: 'dsh-plugin-trim',
          },
          ActivationGuide,
        ),
      )
      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'experience-optimizer-guide',
            order: 10,
          },
          MainGuide,
        ),
      )
      ctx.slots.inject('settings.plugins.tab', () =>
        ctx.slots.register(
          {
            name: 'settings.plugins.tab',
            id: 'experience-optimizer',
            order: 40,
            label: () => '插件体检',
          },
          ExperiencePanel,
        ),
      )
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register(
          {
            name: 'settings.section',
            id: 'experience-optimizer',
            order: 25,
            label: () => '插件体检',
          },
          ExperiencePanel,
        ),
      )
      ctx.slots.inject('settings.section.icon', () =>
        ctx.slots.register(
          {
            name: 'settings.section.icon',
            id: 'experience-optimizer',
          },
          ExperienceOptimizerIcon,
        ),
      )
    }

    exports.apply = apply
    exports.inject = ['slots']
    return module.exports
  },
})
