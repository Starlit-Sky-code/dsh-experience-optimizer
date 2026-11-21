(() => {
  const KEY = 'dsh-experience-optimizer.site.locale'
  const zh = {
    skip: '跳到主要内容', navWhy: '为什么', navHow: '怎么工作', navFeatures: '功能', navInstall: '安装', navFaq: '问答', navAbout: '关于',
    eyebrow: 'DSH 插件套件 · AGPL-3.0',
    h1: '让插件成本可见，让减负可控。',
    lede: '插件减负 × 兼容性体检 × 工作流蓝图。看清常驻上下文，再用证据决定关掉什么。',
    ctaInstall: '开始安装', ctaHow: '看它怎么判断', micro: '省略版本号即取 latest · 两个插件可独立或同时使用',
    whyEyebrow: '问题', whyTitle: '你砍的是工具白名单，没量的是插件常驻上下文。',
    whyLede: '插件不像工具调用那样显眼。它们持续占用提示词、工具描述和重复段落，直到某一天你发现上下文里有一大块“看不见的成本”。',
    p1Title: '常驻成本不可见', p1Body: '每个插件包的提示词和工具描述都在持续消耗 token，但平时看不到占比。',
    p2Title: '兼容性变脆', p2Body: '插件与插件、插件与 DSH、配置集与工作区之间的冲突，往往在出问题后才被发现。',
    p3Title: '工作流难落地', p3Body: '知道要自动化什么，却不知道需要哪些工具、权限和人工确认点。',
    howEyebrow: '怎么工作', howTitle: '先看依据，再动插件。',
    howLede: '默认保守：描述匹配不单独构成“建议关闭”。定时/触发、已有调用、无账本、低置信度，都会进入人工复核。',
    step1Kicker: '测量', step1Title: '扫描常驻成本', step1Body: '插件清单显示每个插件包的上下文占比；未归属部分单独标出，不硬摊给某个插件。',
    step2Kicker: '解释', step2Title: '生成可解释方案', step2Body: '任务相关性、使用账本、周期语义和上下文成本共同决定保留、启用、复核或建议关闭。',
    step3Kicker: '确认', step3Title: '安全确认后应用', step3Body: 'confirm 只是提案标记；宿主审批返回 allowed-once 才写入。每次应用前先写还原点。',
    step4Kicker: '恢复', step4Title: '随时恢复', step4Body: '恢复同样需要安全确认。先小步验证，再扩大范围。',
    evidenceTitle: '“建议关闭”的硬条件',
    e1: '窗口内 0 调用', e2: '有可归属上下文成本', e3: '非定时/触发插件', e4: '当前任务高置信', e5: '描述低相关', eAnd: '以上同时成立，仍只是建议',
    featuresEyebrow: '功能', featuresTitle: '一个套件，两条路径。',
    trimTitle: '插件减负', trimBody: '上下文占比、兼容性检查、可解释的精简方案、安全确认、还原点与恢复。',
    trim1: '插件清单搜索 / 筛选 / 排序', trim2: '定时/触发与已用插件保护', trim3: 'Agent 工具路径与网页界面共用审批边界',
    recipeTitle: '工作流配方', recipeBody: '把业务目标翻译成可校验、可导出的工作流蓝图，每一步都标注审批级别。',
    recipe1: '步骤 / 能力 / 最小插件集', recipe2: '依赖与兼容性校验', recipe3: 'Markdown / JSON 运行手册',
    showEyebrow: '界面', showTitle: '在一个原生设置页里看清成本。', shotCaption: '设置 → 体验优化：插件清单、判断依据、安全确认与恢复。',
    safetyEyebrow: '边界', safetyTitle: '默认不自动改任何东西。',
    s1: '只读分析，不执行 !!js、不联网。', s2: '受保护 / 核心 / 预设 / 固定项永不改动。', s3: 'confirm 不是授权；安全确认才是。', s4: '定时/触发、已有调用、无账本只进入复核。',
    installEyebrow: '安装', installTitle: '最短路径，装最新版。', installLede: '省略版本号即取 latest。npm i 是 npm install 的官方别名。',
    copy: '复制', copyAll: '复制全部', installNote: '普通 npm 安装：npm i dsh-plugin-trim dsh-plugin-recipe',
    faqEyebrow: '问答', faqTitle: '你可能正想问。',
    q1: '为什么我几乎没有“建议关闭”？', a1: '默认保守：没有使用账本、任务置信度不够、带定时/触发语义，或已有调用记录时，只进入复核。',
    q2: '每月才用一次的插件会被误伤吗？', a2: '带“每月/每周/定时/提醒/日程/dream”等语义的插件会被硬保护；也可以加入 protect 列表。',
    q3: '应用后出问题怎么办？', a3: '每次应用前写入还原点。在界面点击“恢复最近”，或调用 trim_rollback_profile；恢复同样需要安全确认。',
    q4: '为什么还需要宿主审批？', a4: 'confirm: true 只是提案标记。宿主审批返回 allowed-once 才是授权；拒绝、取消或审批不可用时一律不写入。',
    aboutEyebrow: '关于 / 支持', aboutTitle: '一个本地优先的 DSH 插件套件。', aboutLede: 'AGPL-3.0 · 作者 Starlit Sky · 欢迎反馈与试用。',
    linksTitle: '项目链接', supportTitle: '交流与支持', qqLabel: 'QQ 群：', donateLabel: '捐赠方式：', pending: '待补充',
    supportNote: '当前也可以通过反馈、文档和插件试用来支持项目。', siteReadme: '站点说明',
  }
  const en = {
    skip: 'Skip to content', navWhy: 'Why', navHow: 'How', navFeatures: 'Features', navInstall: 'Install', navFaq: 'FAQ', navAbout: 'About',
    eyebrow: 'DSH PLUGIN SUITE · AGPL-3.0',
    h1: 'Make plugin cost visible. Make dieting controllable.',
    lede: 'Plugin diet × compatibility checks × workflow recipes. See resident context, then decide what to close with evidence.',
    ctaInstall: 'Install now', ctaHow: 'See how it decides', micro: 'No @version means latest · use either plugin, or both together',
    whyEyebrow: 'THE PROBLEM', whyTitle: 'You cut the tool allowlist. Nobody measured resident plugin context.',
    whyLede: 'Plugins are not as visible as tool calls. They keep consuming prompt text, tool descriptions, and repeated sections until a large “invisible cost” appears.',
    p1Title: 'Invisible resident cost', p1Body: 'Every bundle’s prompt and tool descriptions consume tokens, but the share is not visible day to day.',
    p2Title: 'Fragile compatibility', p2Body: 'Plugin ↔ plugin, plugin ↔ DSH, profile ↔ workspace conflicts often show up only after something breaks.',
    p3Title: 'Workflows stall', p3Body: 'You know what to automate, but not which tools, permissions, and human checkpoints are required.',
    howEyebrow: 'HOW IT WORKS', howTitle: 'Read the evidence. Then touch plugins.',
    howLede: 'Conservative by default: a description match never becomes a close suggestion by itself. Scheduled/trigger plugins, used plugins, an empty ledger, or low confidence all go to review.',
    step1Kicker: 'MEASURE', step1Title: 'Scan resident cost', step1Body: 'Inventory shows each bundle’s context share; unattributed context stays separate instead of being assigned to a plugin.',
    step2Kicker: 'EXPLAIN', step2Title: 'Build an explainable plan', step2Body: 'Task relevance, usage ledger, schedule hints, and context cost decide keep, enable, review, or close candidate.',
    step3Kicker: 'CONFIRM', step3Title: 'Apply after approval', step3Body: 'confirm is only a proposal marker; host approval returning allowed-once writes. A restore point is written first.',
    step4Kicker: 'RECOVER', step4Title: 'Recover anytime', step4Body: 'Rollback also needs safety confirmation. Start small, then expand.',
    evidenceTitle: 'Hard conditions for a close candidate',
    e1: 'Zero calls in window', e2: 'Non-zero attributable cost', e3: 'No schedule/trigger hint', e4: 'High task confidence', e5: 'Low description match', eAnd: 'All must hold — and it is still only a suggestion',
    featuresEyebrow: 'FEATURES', featuresTitle: 'One suite. Two paths.',
    trimTitle: 'Plugin diet', trimBody: 'Context share, compatibility checks, explainable slim plans, approval, restore points, and recovery.',
    trim1: 'Inventory search / filter / sort', trim2: 'Scheduled/trigger and used-plugin protection', trim3: 'Shared approval boundary for agents and UI',
    recipeTitle: 'Workflow recipe', recipeBody: 'Turn a business goal into a validated, exportable blueprint with approval level on every step.',
    recipe1: 'Steps / capabilities / minimum plugin set', recipe2: 'Dependency and compatibility checks', recipe3: 'Markdown / JSON runbook',
    showEyebrow: 'INTERFACE', showTitle: 'See cost in one native settings page.', shotCaption: 'Settings → Experience Optimizer: inventory, evidence, approval, and recovery.',
    safetyEyebrow: 'BOUNDARIES', safetyTitle: 'Nothing changes by default.',
    s1: 'Read-only analysis. No !!js. No network.', s2: 'Protected / core / preset / pinned items never change.', s3: 'confirm is not authorization; approval is.', s4: 'Scheduled/trigger, used, or no-ledger items only go to review.',
    installEyebrow: 'INSTALL', installTitle: 'Shortest path. Latest version.', installLede: 'No @version means latest. npm i is the official alias of npm install.',
    copy: 'Copy', copyAll: 'Copy all', installNote: 'Plain npm install: npm i dsh-plugin-trim dsh-plugin-recipe',
    faqEyebrow: 'FAQ', faqTitle: 'What you may be asking.',
    q1: 'Why do I see almost no close candidates?', a1: 'Conservative default: no ledger, low confidence, schedule/trigger hints, or existing calls route to review.',
    q2: 'Will a once-a-month plugin be hurt?', a2: 'Monthly/weekly/schedule/reminder/calendar/dream hints are hard-protected. Add it to the protect list for extra safety.',
    q3: 'What if something breaks after apply?', a3: 'A restore point is written before every apply. Use Restore latest, or trim_rollback_profile. Recovery also needs approval.',
    q4: 'Why is host approval still needed?', a4: 'confirm: true is only a proposal marker. Host approval returning allowed-once is the grant; rejection, cancellation, or unavailable approval never writes.',
    aboutEyebrow: 'ABOUT / SUPPORT', aboutTitle: 'A local-first DSH plugin suite.', aboutLede: 'AGPL-3.0 · by Starlit Sky · feedback and trial use welcome.',
    linksTitle: 'Project links', supportTitle: 'Community & support', qqLabel: 'QQ group: ', donateLabel: 'Donation: ', pending: 'To be added',
    supportNote: 'Feedback, docs, and trying the plugins are the best support today.', siteReadme: 'Site notes',
  }
  const dictionaries = { zh, en }
  let current = 'zh'
  function detect() {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === 'zh' || saved === 'en') return saved
    } catch {}
    return String(navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  function apply(locale) {
    current = locale
    const dict = dictionaries[locale] || zh
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n')
      if (key && dict[key]) el.textContent = dict[key]
    })
    const lang = document.getElementById('lang')
    if (lang) {
      lang.textContent = locale === 'zh' ? 'EN' : '中文'
      lang.setAttribute('aria-label', locale === 'zh' ? 'Switch to English' : '切换到中文')
    }
    document.title = locale === 'zh' ? 'DSH 体验优化器 · 插件减负与兼容性体检' : 'DSH Experience Optimizer · Plugin diet & compatibility'
    try { localStorage.setItem(KEY, locale) } catch {}
  }
  window.siteLocale = {
    get: () => current,
    toggle: () => apply(current === 'zh' ? 'en' : 'zh'),
    apply,
  }
  apply(detect())
})()
