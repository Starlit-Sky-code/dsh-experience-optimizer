(() => {
  const KEY = 'dsh-experience-optimizer.site.locale'
  const zh = {
    skip: '跳到主要内容', navWhy: '为什么', navHow: '怎么工作', navFeatures: '功能', navInstall: '安装', navFaq: '问答', navAbout: '关于', navCta: '安装',
    heroEyebrow: 'DSH · CONTEXT OBSERVATORY',
    heroLine1: '插件在偷偷', heroLine2: '吃上下文。', heroLine3: '现在，把它拖到光下。',
    heroLede: 'DSH 体验优化器把插件常驻成本、兼容性检查和减负方案放进一个可观察的界面。少一点插件负担，多一点兼容确定性。',
    ctaInstall: '安装最新版', ctaHow: '看判断依据', copy: '复制',
    heroMicro: '省略版本号即最新版 · 两个插件可独立或同时使用',
    instrumentTop: 'TOPOLOGY / 14 NODES', instrumentLive: 'LIVE',
    hudLabel: '示例 profile · 常驻上下文', hudBefore: '应用前 2,417', hudAfter: '应用后 1,105 · −54%',
    instrumentFootLeft: '未归属 1,312 tokens', instrumentFootRight: '示例数据',
    heroFoot: '不是工具白名单，是插件常驻上下文。', scroll: '向下看',
    posterKicker: 'INTERLUDE 01 / POSTER', posterTitle: '先看一张海报。',
    posterBody: '这是宣传片封面，也是一张真实产品界面的缩影：轻一点，走得更远。',
    posterCaption: '宣传片封面 · 示例 profile · AGPL-3.0',
    problemKicker: '看不见的成本',
    problemTitle: '你砍掉了工具白名单，却没量过插件的常驻上下文。',
    problemBody: '工具调用看得见，插件的提示词和工具描述却一直在后台占位。先量出来，再决定关掉什么。',
    statLabel: '示例 profile 的常驻上下文降幅', statNote: '示例数据，不是你的 profile。',
    costBefore: '应用前', costAfter: '应用后', costDelta: '−1,312 tokens · 少 54%',
    evidenceKicker: '02 / EVIDENCE CHAIN', evidenceTitle: '先过闸门，再谈建议关闭。',
    evidenceBody: '描述匹配只说明“可能相关”。强证据要同时穿过任务、账本、周期和成本四道门。',
    legendReview: '进入人工复核', legendClose: '才可能成为候选',
    gate1Kicker: '任务相关', gate1Title: '描述匹配，只算相关', gate1Body: '关键词命中不单独构成“用不上”。', gateWeak: '弱证据',
    gate2Kicker: '使用账本', gate2Title: '有调用记录，直接复核', gate2Body: '历史或本会话调用过，就不自动建议关闭。', gateGuard: '保护',
    gate3Kicker: '定时 / 触发', gate3Title: '每月才用一次，也不能误伤', gate3Body: 'schedule、cron、提醒、dream 等语义硬保护。',
    gate4Kicker: '上下文成本', gate4Title: '成本 > 0，才值得优化', gate4Body: '没有可归属成本的插件，进入复核而不是候选。',
    gateResultKicker: 'RESULT', gateResultTitle: '强证据 → 候选；其余 → 复核',
    gateResultBody: '即使成为候选，也仍然需要确认与 host 审批 allowed-once。',
    productKicker: '一个套件，两条路径',
    trimTitle: '插件减负', trimBody: '扫描上下文占比与兼容性，生成可解释的保留/启用/关闭方案；低风险项经确认与安全审批后应用。',
    trim1: '插件清单搜索 / 筛选 / 排序', trim2: '定时/触发与已用插件保护', trim3: '还原点、恢复与逐项解释', trimLink: '查看 npm 包 ↗',
    recipeTitle: '工作流配方', recipeBody: '把业务目标翻译成可校验、可导出的工作流蓝图，每一步都标注审批级别。',
    recipe1: '步骤 / 能力 / 最小插件集', recipe2: '依赖与兼容性校验', recipe3: 'Markdown / JSON 运行手册', recipeLink: '查看 npm 包 ↗',
    consoleLabel: '设置 → 体验优化',
    safetyKicker: '04 / SAFETY IS A VERB', safetyTitle: '安全不是弹窗，是每一步都能回头。',
    safetyBody: '只读分析、低风险、安全确认、还原点。没有任何一步靠“相信模型”。', sealNote: 'host approval',
    safety1Title: '只读扫描', safety1Body: '不执行 !!js、不联网分析。',
    safety2Title: '受保护项不动', safety2Body: '核心 / 预设 / 固定项永不改动。',
    safety3Title: '写入前有还原点', safety3Body: '恢复同样需要安全确认。',
    safety4Title: '宿主批准才写入', safety4Body: 'confirm 只是提案，allowed-once 才是授权。',
    installKicker: '安装', installTitle: '最短路径，装最新版。',
    installBody: '省略版本号即 latest。npm i 是 npm install 的官方别名。',
    copyAll: '复制全部', installNote: '普通 npm 安装：npm i dsh-plugin-trim dsh-plugin-recipe',
    npmCta: '打开 npm', releaseCta: 'GitHub Release ↗',
    faqKicker: '问答', faqTitle: '你可能正想问。',
    q1: '为什么我几乎没有“建议关闭”？', a1: '默认保守：没有使用账本、任务置信度不够、带定时/触发语义，或已有调用记录时，只进入复核。',
    q2: '每月才用一次的插件会被误伤吗？', a2: '带“每月/每周/定时/提醒/日程/dream”等语义的插件会被硬保护；也可以加入 protect 列表。',
    q3: '应用后出问题怎么办？', a3: '每次应用前写入还原点。在界面点击“恢复最近”，或调用 trim_rollback_profile；恢复同样需要安全确认。',
    q4: '为什么还需要宿主审批？', a4: 'confirm: true 只是提案标记。宿主审批返回 allowed-once 才是授权；拒绝、取消或审批不可用时一律不写入。',
    aboutKicker: '关于 / 支持', aboutTitle: '一个本地优先的 DSH 插件套件。',
    aboutBody: 'AGPL-3.0 · 作者 Starlit Sky · 欢迎反馈、试用和一起把插件生态做轻。',
    qqTitle: '交流群', qqLabel: 'QQ 群：', donateTitle: '支持项目',
    donateBody: '捐赠方式：待补充。当前也可以通过反馈、文档和插件试用来支持。',
    licenseTitle: '许可证', siteReadme: '站点说明',
  }
  const en = {
    skip: 'Skip to content', navWhy: 'Why', navHow: 'How', navFeatures: 'Features', navInstall: 'Install', navFaq: 'FAQ', navAbout: 'About', navCta: 'Install',
    heroEyebrow: 'DSH · CONTEXT OBSERVATORY',
    heroLine1: 'Plugins quietly eat', heroLine2: 'your context.', heroLine3: 'Now drag it into the light.',
    heroLede: 'DSH Experience Optimizer puts resident plugin cost, compatibility checks, and slim plans into one observable interface. Less plugin overhead, more compatibility certainty.',
    ctaInstall: 'Install latest', ctaHow: 'See the evidence', copy: 'Copy',
    heroMicro: 'No @version means latest · use either plugin, or both together',
    instrumentTop: 'TOPOLOGY / 14 NODES', instrumentLive: 'LIVE',
    hudLabel: 'Sample profile · resident context', hudBefore: 'Before 2,417', hudAfter: 'After 1,105 · −54%',
    instrumentFootLeft: 'Unattributed 1,312 tokens', instrumentFootRight: 'Sample data',
    heroFoot: 'Not a tool allowlist — resident plugin context.', scroll: 'Scroll',
    posterKicker: 'INTERLUDE 01 / POSTER', posterTitle: 'Start with a poster.',
    posterBody: 'This is the promo cover and a glimpse of the real interface: lighter, further.',
    posterCaption: 'Promo cover · sample profile · AGPL-3.0',
    problemKicker: 'Invisible cost',
    problemTitle: 'You cut the tool allowlist. Nobody measured resident plugin context.',
    problemBody: 'Tool calls are visible; plugin prompts and tool descriptions keep occupying space in the background. Measure first, then decide what to close.',
    statLabel: 'Resident context reduction in the sample profile', statNote: 'Sample data, not your profile.',
    costBefore: 'Before', costAfter: 'After', costDelta: '−1,312 tokens · 54% less',
    evidenceKicker: '02 / EVIDENCE CHAIN', evidenceTitle: 'Pass the gates. Then talk about closing.',
    evidenceBody: 'A description match only means “possibly relevant”. Strong evidence must pass task, ledger, schedule, and cost gates together.',
    legendReview: 'Goes to human review', legendClose: 'May become a candidate',
    gate1Kicker: 'Task relevance', gate1Title: 'A description match is only relevance', gate1Body: 'A keyword hit alone never proves “unused”.', gateWeak: 'Weak evidence',
    gate2Kicker: 'Usage ledger', gate2Title: 'Used before? Review it', gate2Body: 'Any historical or session calls block an automatic close suggestion.', gateGuard: 'Guarded',
    gate3Kicker: 'Schedules / triggers', gate3Title: 'Once a month is still a real use', gate3Body: 'schedule, cron, reminders, and dream hints are hard-protected.',
    gate4Kicker: 'Context cost', gate4Title: 'Cost > 0 makes it worth optimizing', gate4Body: 'Without attributable cost, an item goes to review, not a candidate.',
    gateResultKicker: 'RESULT', gateResultTitle: 'Strong evidence → candidate; everything else → review',
    gateResultBody: 'Even a candidate still needs confirmation and host approval returning allowed-once.',
    productKicker: 'One suite, two paths',
    trimTitle: 'Plugin diet', trimBody: 'Scan context share and compatibility, then build an explainable keep/enable/close plan. Low-risk items apply only after confirmation and safety approval.',
    trim1: 'Inventory search / filter / sort', trim2: 'Scheduled/trigger and used-plugin protection', trim3: 'Restore points, recovery, and item-level reasons', trimLink: 'View npm package ↗',
    recipeTitle: 'Workflow recipe', recipeBody: 'Turn a business goal into a validated, exportable workflow blueprint with approval levels on every step.',
    recipe1: 'Steps / capabilities / minimum plugin set', recipe2: 'Dependency and compatibility checks', recipe3: 'Markdown / JSON runbook', recipeLink: 'View npm package ↗',
    consoleLabel: 'Settings → Experience Optimizer',
    safetyKicker: '04 / SAFETY IS A VERB', safetyTitle: 'Safety is not a popup. It is a way back.',
    safetyBody: 'Read-only analysis, low risk, safety approval, restore point. Nothing relies on “trust the model”.', sealNote: 'host approval',
    safety1Title: 'Read-only scan', safety1Body: 'No !!js, no network analysis.',
    safety2Title: 'Protected stays protected', safety2Body: 'Core / preset / pinned items never change.',
    safety3Title: 'Restore point before write', safety3Body: 'Recovery also needs safety approval.',
    safety4Title: 'Host approval before write', safety4Body: 'confirm is a proposal; allowed-once is the grant.',
    installKicker: 'Install', installTitle: 'Shortest path. Latest version.',
    installBody: 'No @version means latest. npm i is the official alias of npm install.',
    copyAll: 'Copy all', installNote: 'Plain npm install: npm i dsh-plugin-trim dsh-plugin-recipe',
    npmCta: 'Open npm', releaseCta: 'GitHub Release ↗',
    faqKicker: 'FAQ', faqTitle: 'What you may be asking.',
    q1: 'Why do I see almost no close candidates?', a1: 'Conservative by default: no ledger, low confidence, schedule/trigger hints, or existing calls all go to review.',
    q2: 'Will a once-a-month plugin be hurt?', a2: 'Monthly/weekly/schedule/reminder/calendar/dream hints are hard-protected. Add it to protect for extra safety.',
    q3: 'What if something breaks after apply?', a3: 'A restore point is written before every apply. Use Restore latest or trim_rollback_profile; recovery also needs safety approval.',
    q4: 'Why is host approval still needed?', a4: 'confirm: true is only a proposal marker. Host approval returning allowed-once is the grant; rejection, cancellation, or unavailable approval never writes.',
    aboutKicker: 'About / support', aboutTitle: 'A local-first DSH plugin suite.',
    aboutBody: 'AGPL-3.0 · by Starlit Sky · feedback, trial use, and help making the plugin ecosystem lighter are welcome.',
    qqTitle: 'Community', qqLabel: 'QQ group: ', donateTitle: 'Support',
    donateBody: 'Donation methods: to be added. Feedback, docs, and trying the plugins are the best support today.',
    licenseTitle: 'License', siteReadme: 'Site notes',
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
    current = dictionaries[locale] ? locale : 'zh'
    const dict = dictionaries[current]
    document.documentElement.lang = current === 'zh' ? 'zh-CN' : 'en'
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n')
      if (key && Object.prototype.hasOwnProperty.call(dict, key)) element.textContent = dict[key]
    })
    const lang = document.getElementById('lang')
    if (lang) {
      lang.textContent = current === 'zh' ? 'EN' : '中文'
      lang.setAttribute('aria-label', current === 'zh' ? 'Switch to English' : '切换到中文')
    }
    document.title = current === 'zh' ? 'DSH 体验优化器 · Context Observatory' : 'DSH Experience Optimizer · Context Observatory'
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', current === 'zh'
      ? 'DSH 体验优化器：让插件常驻上下文可见，让减负按证据发生。'
      : 'DSH Experience Optimizer: make resident plugin context visible and reduce it with evidence.')
    try { localStorage.setItem(KEY, current) } catch {}
  }
  window.siteLocale = { get: () => current, toggle: () => apply(current === 'zh' ? 'en' : 'zh'), apply }
  apply(detect())
})()
