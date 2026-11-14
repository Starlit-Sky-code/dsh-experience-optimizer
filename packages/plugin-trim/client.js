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
      ['bugfix', '修 Bug'],
      ['feature', '新功能'],
      ['review', '代码审查'],
      ['docs', '文档'],
      ['release', '发布'],
      ['report', '报告 / 周报'],
      ['research', '调研'],
    ]

    const CSS = `
.eo-root{--eo-primary:var(--dsw-alias-label-primary,#1a1a1a);--eo-secondary:var(--dsw-alias-label-secondary,#5f6b7a);--eo-tertiary:var(--dsw-alias-label-tertiary,#8b96a5);--eo-border:var(--dsw-alias-border-l2,rgba(127,127,127,.16));--eo-border-strong:var(--dsw-alias-border-l3,rgba(127,127,127,.24));--eo-card-bg:var(--dsw-alias-settings-card-fill,transparent);--eo-card-stroke:var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l2,rgba(127,127,127,.16)));--eo-hover:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06));--eo-error:var(--dsw-alias-state-error-primary,#c4314b);--eo-success:var(--dsw-alias-state-success-primary,#1a7f37);--eo-code:var(--ds-font-family-code,"JetBrains Maple Mono",ui-monospace,monospace);--eo-radius:var(--dsw-radius-lg,12px);max-width:760px;color:var(--eo-primary);font-size:13px;line-height:20px;display:flex;flex-direction:column;gap:14px}
.eo-root *{box-sizing:border-box}
.eo-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:0 0 2px}
.eo-hero-copy{min-width:0}
.eo-title{margin:0;font-size:18px;line-height:26px;font-weight:600;letter-spacing:-.01em}
.eo-sub{margin:4px 0 0;color:var(--eo-tertiary);font-size:13px;line-height:20px}
.eo-hero-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.eo-status{font:400 11px/1 var(--eo-code);color:var(--eo-tertiary);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.eo-tabs{display:flex;gap:18px;border-bottom:.5px solid var(--eo-border);margin:0}
.eo-tab{appearance:none;border:0;background:transparent;color:var(--eo-tertiary);font:inherit;font-size:13px;line-height:20px;padding:7px 1px 9px;cursor:pointer;position:relative;border-radius:0}
.eo-tab:hover{color:var(--eo-primary)}
.eo-tab-active{color:var(--eo-primary);font-weight:500}
.eo-tab-active:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1.5px;background:var(--eo-primary);border-radius:1px}
.eo-stack{display:flex;flex-direction:column;gap:14px}
.eo-stack>.eo-metrics{order:0}
.eo-stack>[data-section="draft"]{order:1}
.eo-stack>[data-section="compat"]{order:2}
.eo-stack>[data-section="context"]{order:3}
.eo-stack>[data-section="result"]{order:4}
.eo-stack>[data-section="dedupe"]{order:5}
.eo-stack>[data-section="diagnostics"]{order:6}
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
.eo-code{font:400 11px/16px var(--eo-code);color:var(--eo-secondary);word-break:break-all}
.eo-inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.eo-spacer{height:0}
@keyframes eo-spin{to{transform:rotate(360deg)}}
@keyframes eo-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media(max-width:820px){.eo-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.eo-metric:nth-child(2){border-right:0}.eo-metric:nth-child(-n+2){border-bottom:.5px solid var(--eo-border)}.eo-form-grid{grid-template-columns:1fr}.eo-hero{flex-wrap:wrap}.eo-hero-actions{margin-left:0}}
@media(max-width:520px){.eo-metrics{grid-template-columns:1fr}.eo-metric{border-right:0;border-bottom:.5px solid var(--eo-border)}.eo-metric:last-child{border-bottom:0}}
`


    function injectCss() {
      if (typeof document === 'undefined') return
      if (document.querySelector('style[data-plugin-css="' + CSS_ID + '"]')) return
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

    function Metric({ label, value, hint, tone = 'neutral' }) {
      return h(
        'div',
        { className: 'eo-metric' },
        h('div', { className: 'eo-metric-label' }, label),
        h('div', { className: 'eo-metric-value', 'data-tone': tone }, value),
        hint ? h('div', { className: 'eo-metric-hint' }, hint) : null,
      )
    }

    function Card({ title, subtitle, extra, children, className = '', section }) {
      return h(
        'section',
        { className: 'eo-card ' + className, 'data-section': section },
        title || extra
          ? h(
              'div',
              { className: 'eo-card-head' },
              h(
                'div',
                null,
                title ? h('h3', { className: 'eo-card-title' }, title) : null,
                subtitle ? h('p', { className: 'eo-card-sub' }, subtitle) : null,
              ),
              extra || null,
            )
          : null,
        children,
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

    function formatTokens(value) {
      const n = Number(value) || 0
      if (n >= 10000) return (n / 1000).toFixed(1) + 'k'
      return formatNumber(n)
    }

    function actionLabel(action) {
      return (
        {
          keep: '保留',
          enable: '建议启用',
          'suggest-disable': '建议禁用',
          'disable-if-unused': '未用可禁用',
          review: '人工复核',
        }[action] || action
      )
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
          profile: 'Profile',
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

    function ExperiencePanel() {
      const [tab, setTab] = useState('trim')
      const [overview, setOverview] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')
      const [toast, setToast] = useState(null)
      const [showInfo, setShowInfo] = useState(false)
      const [showAllFindings, setShowAllFindings] = useState(false)
      const [showContext, setShowContext] = useState(false)
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

      const findings = useMemo(() => {
        if (!overview) return []
        return overview.findings.filter((finding) => showInfo || finding.severity !== 'info')
      }, [overview, showInfo])

      const enabledBundles = overview
        ? overview.bundles.filter((bundle) => bundle.enabled).length
        : 0
      const totalBundles = overview ? overview.bundles.length : 0
      const compat = overview ? overview.compat : { error: 0, warn: 0, info: 0 }
      const byOwner = overview ? overview.context.byOwner : []
      const maxOwner = Math.max(1, ...byOwner.map((owner) => owner.tokens))
      const selectedIds = Object.keys(selected).filter((id) => selected[id])
      const selectedCount = selectedIds.length
      const draftItems = draft ? draft.items : []
      const actionableDraftItems = draftItems.filter(
        (item) => item.action !== 'keep' && item.protected !== true,
      )

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
              ? '应用未完成，已自动回滚'
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
            '已回滚 ' +
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
            h('h2', { className: 'eo-title' }, '体验优化'),
            h('p', { className: 'eo-sub' }, '插件减负、兼容性体检与工作流蓝图。'),
          ),
          h(
            'div',
            { className: 'eo-hero-actions' },
            h(
              'span',
              { className: 'eo-status', title: overview ? overview.profile.dir : '' },
              overview ? 'profile: ' + overview.profile.name : '读取中',
            ),
            h(
              Button,
              { onClick: refresh, disabled: loading, variant: 'ghost' },
              loading ? '刷新中…' : '刷新',
            ),
          ),
        ),
        h(
          'div',
          { className: 'eo-tabs' },
          h(
            'button',
            {
              type: 'button',
              className: 'eo-tab' + (tab === 'trim' ? ' eo-tab-active' : ''),
              onClick: () => setTab('trim'),
            },
            '减负与兼容',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'eo-tab' + (tab === 'recipe' ? ' eo-tab-active' : ''),
              onClick: () => setTab('recipe'),
            },
            '工作流配方',
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
        overview
          ? tab === 'trim'
            ? renderTrim()
            : renderRecipe()
          : null,
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
      )

      function renderTrim() {
        return h(
          'div',
          { className: 'eo-stack' },
          h('div', { className: 'eo-grid eo-metrics' }, [
            h(Metric, {
              key: 'tokens',
              label: '可归属上下文',
              value: formatTokens(overview.context.totalTokens),
              hint: 'tokens · 不含未归属部分',
            }),
            h(Metric, {
              key: 'bundles',
              label: '启用插件',
              value: enabledBundles + ' / ' + totalBundles,
              hint: 'enabled / total bundles',
            }),
            h(Metric, {
              key: 'compat',
              label: '兼容性',
              value: compat.error + 'E · ' + compat.warn + 'W',
              hint: 'error / warn · info ' + compat.info,
              tone: compat.error > 0 ? 'danger' : compat.warn > 0 ? 'warn' : 'ok',
            }),
            h(Metric, {
              key: 'manage',
              label: '写操作',
              value: overview.managementAvailable ? '可应用' : '只读',
              hint: overview.managementAvailable ? 'pluginManager 可用' : '缺少 pluginManager',
              tone: overview.managementAvailable ? 'ok' : 'danger',
            }),
          ]),
          h(
            Card,
            {
              title: '兼容性矩阵',
              subtitle: '插件 ↔ 插件 · 插件 ↔ DSH · Profile / 工作区',
              section: 'compat',
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
                      showAllFindings ? '收起' : '查看全部 ' + findings.length,
                    )
                  : null,
                h(
                  Button,
                  {
                    variant: 'ghost',
                    onClick: () => setShowInfo((value) => !value),
                  },
                  showInfo ? '隐藏 info' : '显示 info',
                ),
                h(Badge, { tone: compat.error ? 'danger' : 'ok' }, compat.error ? '需要处理' : '无阻断'),
              ),
            },
            findings.length === 0
              ? h('div', { className: 'eo-empty' }, '未发现需要处理的兼容性问题。')
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
              title: '上下文成本',
              section: 'context',
              subtitle:
                '总计 ' +
                formatNumber(overview.context.totalTokens) +
                ' tokens，未归属 ' +
                formatNumber(overview.context.unattributedTokens),
              extra: h(
                Button,
                { variant: 'ghost', onClick: () => setShowContext((value) => !value) },
                showContext ? '收起明细' : '查看明细',
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
                  h('th', null, 'Tokens'),
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
              title: '精简方案',
              subtitle: '先建议，后确认；受保护项永不改动',
              section: 'draft',
            },
            h(
              'div',
              { className: 'eo-toolbar' },
              h(
                Field,
                { label: '任务类型' },
                h(
                  'select',
                  {
                    className: 'eo-select',
                    value: taskTag,
                    onChange: (event) => setTaskTag(event.target.value),
                  },
                  TASK_TAGS.map(([value, label]) =>
                    h('option', { value, key: value }, label),
                  ),
                ),
              ),
              h(
                Field,
                { label: '任务目标（可选）' },
                h('input', {
                  className: 'eo-input',
                  value: goal,
                  placeholder: '例如：修复登录页崩溃',
                  onChange: (event) => setGoal(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') void generateDraft()
                  },
                }),
              ),
              h(
                Button,
                { variant: 'accent', onClick: generateDraft, disabled: draftBusy },
                draftBusy ? '生成中…' : '生成方案',
              ),
            ),
            draft
              ? h(
                  'div',
                  null,
                  h(
                    'div',
                    { className: 'eo-summary' },
                    h(Badge, { tone: 'neutral' }, '保留 ' + draft.summary.keep),
                    h(Badge, { tone: 'ok' }, '启用 ' + draft.summary.enable),
                    h(Badge, { tone: 'danger' }, '禁用 ' + draft.summary.disable),
                    h(Badge, { tone: 'info' }, '复核 ' + draft.summary.review),
                    h(Badge, { tone: 'neutral' }, '受保护 ' + draft.summary.protected),
                    h(Badge, { tone: 'warn' }, 'task: ' + draft.task.tag),
                  ),
                  actionableDraftItems.length === 0
                    ? h(
                        'div',
                        { className: 'eo-empty' },
                        '当前没有可裁剪项：所有插件均受保护，或与当前任务匹配。',
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
                                'aria-label': '选择 ' + item.name,
                              })
                            : h('span', { className: 'eo-lock', title: '受保护或非低风险' }),
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
                              h(Badge, { tone: riskTone(item.risk) }, 'risk: ' + item.risk),
                              item.protected ? h(Badge, { tone: 'neutral' }, '受保护') : null,
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
                            h('small', null, 'score'),
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
                      selectedCount + ' 个低风险项已选择 · 应用前会写入回滚快照',
                    ),
                    h(
                      'div',
                      { className: 'eo-inline' },
                      h(Button, { variant: 'ghost', onClick: selectAll }, '全选低风险'),
                      h(Button, { variant: 'ghost', onClick: clearSelection }, '清空'),
                      h(
                        Button,
                        {
                          variant: 'accent',
                          onClick: openApply,
                          disabled: selectedCount === 0 || draftBusy,
                        },
                        '应用选中',
                      ),
                      h(
                        Button,
                        { variant: 'danger', onClick: openRollback, disabled: draftBusy },
                        '回滚最近',
                      ),
                    ),
                  ),
                )
              : h(
                  'div',
                  { className: 'eo-empty' },
                  '生成方案后，这里会出现可解释的保留/启用/禁用建议。建议默认不会改动任何插件。',
                ),
          ),
          applyResult
            ? h(
                Card,
                {
                  title: '应用结果',
                  subtitle: applyResult.rolledBack ? '中途失败，已自动回滚' : '变更已写入 profile',
                  section: 'result',
                  extra: h(
                    Badge,
                    { tone: applyResult.rolledBack ? 'warn' : 'ok' },
                    applyResult.rolledBack ? '已回滚' : '完成',
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
                      h('th', null, 'Item'),
                      h('th', null, 'Status'),
                      h('th', null, 'Application'),
                      h('th', null, 'Note'),
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
                              notify('token 已复制')
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
                { title: '跨插件 prompt 重复', subtitle: '只建议，不修改第三方源码', section: 'dedupe' },
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
              title: '工作流配方',
              subtitle: '把业务目标翻译成可校验、可导出的工作流蓝图',
              extra: h(Badge, { tone: 'info' }, '最多 4 组追问'),
            },
            h(
              'div',
              { className: 'eo-form-grid' },
              h(
                Field,
                { label: '业务目标', className: 'eo-wide' },
                h('textarea', {
                  className: 'eo-textarea',
                  value: recipeForm.goal,
                  placeholder: '例如：我想每周自动整理项目周报，数据来自 Git log',
                  onChange: (event) => updateRecipe('goal', event.target.value),
                }),
              ),
              h(
                Field,
                { label: '项目 / 范围' },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.scope,
                  onChange: (event) => updateRecipe('scope', event.target.value),
                }),
              ),
              h(
                Field,
                { label: '频率' },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.frequency,
                  onChange: (event) => updateRecipe('frequency', event.target.value),
                }),
              ),
              h(
                Field,
                { label: '数据来源', hint: '逗号分隔' },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.sources,
                  onChange: (event) => updateRecipe('sources', event.target.value),
                }),
              ),
              h(
                Field,
                { label: '输出格式' },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.outputFormat,
                  onChange: (event) => updateRecipe('outputFormat', event.target.value),
                }),
              ),
              h(
                Field,
                { label: '交付方式' },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.delivery,
                  onChange: (event) => updateRecipe('delivery', event.target.value),
                }),
              ),
              h(
                Field,
                { label: '失败处理' },
                h('input', {
                  className: 'eo-input',
                  value: recipeForm.onFailure,
                  onChange: (event) => updateRecipe('onFailure', event.target.value),
                }),
              ),
              h(
                Field,
                { label: '验收标准', hint: '逗号分隔', className: 'eo-wide' },
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
                'UI 预览按内置能力目录判断可用性；精确 agent-scope 校验以 recipe_plan_workflow 工具为准。',
              ),
              h(
                Button,
                { variant: 'accent', onClick: generateRecipe, disabled: recipeBusy },
                recipeBusy ? '生成中…' : '生成工作流蓝图',
              ),
            ),
          ),
          recipeResult
            ? renderRecipeResult(recipeResult)
            : h(
                'div',
                { className: 'eo-empty' },
                '填写目标后生成蓝图。这里只生成计划，不会创建 schedule，也不会修改插件。',
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
              title: '蓝图预览',
              subtitle:
                '模板 ' +
                blueprint.template +
                ' · ' +
                blueprint.steps.length +
                ' 个步骤 · ' +
                blueprint.minPluginSet.length +
                ' 个最小插件',
              extra: h(
                'div',
                { className: 'eo-inline' },
                h(Button, { variant: 'ghost', onClick: exportRecipe }, '导出运行手册'),
              ),
            },
            h(
              'div',
              { className: 'eo-summary' },
              h(Badge, { tone: 'info' }, 'template: ' + blueprint.template),
              h(Badge, { tone: 'neutral' }, 'permissions: ' + blueprint.permissions.length),
              h(Badge, { tone: 'neutral' }, 'confirm: ' + blueprint.steps.filter((step) => step.needsConfirm).length),
              h(Badge, { tone: 'neutral' }, 'min plugins: ' + blueprint.minPluginSet.length),
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
                  h('th', null, '确认'),
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
                        { tone: step.needsConfirm ? 'warn' : 'neutral' },
                        step.needsConfirm ? 'yes' : 'no',
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
                h('span', null, h('strong', null, '回滚：'), blueprint.rollback),
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
          h('h3', null, isApply ? '确认应用精简方案' : '确认回滚'),
          h(
            'p',
            null,
            isApply
              ? '只会应用低风险项；受保护项不会被改动。应用前会写入可回滚快照。'
              : '将恢复最近一次应用前的插件启用状态；已被外部改动的项会跳过。',
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
                        h(Badge, { tone: riskTone(item.risk) }, 'risk: ' + item.risk),
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
            h(Button, { variant: 'ghost', onClick: onCancel, disabled: busy }, '取消'),
            h(
              Button,
              { variant: isApply ? 'accent' : 'danger', onClick: onConfirm, disabled: busy },
              busy ? '处理中…' : isApply ? '确认应用' : '确认回滚',
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
      injectCss()
      ctx.slots.inject('settings.plugins.tab', () =>
        ctx.slots.register(
          {
            name: 'settings.plugins.tab',
            id: 'experience-optimizer',
            order: 40,
            label: () => '体验优化',
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
            label: () => '体验优化',
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
