(() => {
  const KEY = 'dsh-experience-optimizer.site.locale'
  const zh = {
    skip: '跳到主要内容', navWhy: '为什么', navHow: '怎么工作', navFeatures: '功能', navInstall: '安装', navFaq: '问答', navAbout: '关于', navCta: '安装',
    heroEyebrow: 'DSH · PLUGIN CHECKUP',
    heroLine1: '插件在偷偷', heroLine2: '吃上下文。', heroLine3: '现在，', heroLine4: '把它拖到光下。',
    heroLede: 'DSH 插件体检把插件常驻成本、兼容性、压缩链路和能力面放进一次四维体检：先看结论，应用后还能实测省了多少。',
    ctaInstall: '安装最新版', ctaHow: '看判断依据', copy: '复制',
    heroMicro: '省略版本号即最新版 · 只需安装 dsh-plugin-trim',
    instrumentTop: 'TOPOLOGY / 14 NODES', instrumentLive: 'LIVE',
    hudLabel: '示例 profile · 常驻上下文', hudBefore: '应用前 2,417', hudAfter: '应用后 1,105 · −54%',
    instrumentFootLeft: '未归属 1,312 tokens', instrumentFootRight: '示例数据',
    heroFoot: '不是工具白名单，是插件常驻上下文。', scroll: '向下看',
    scrollCue: '向下滑动', scrollHint: 'SCROLL TO INSPECT',
    posterKicker: 'INTERLUDE 01 / POSTER', posterTitle: '先看一张海报。',
    posterBody: '这是宣传片封面，也是一张真实产品界面的缩影：轻一点，走得更远。',
    posterCaption: '宣传片封面 · 示例 profile · AGPL-3.0',
    problemKicker: '看不见的成本',
    problemTitle1: '你砍掉了工具白名单，', problemTitle2: '却没量过插件的常驻上下文。',
    problemBody: '工具调用看得见，插件的提示词和工具描述却一直在后台占位。先量出来，再决定关掉什么。',
    statLabel: '示例降幅，不是关闭目标', statNote: '54% 是示例数据，不是你的 profile；关错了比开着更贵。',
    costBefore: '应用前', costAfter: '应用后', costDelta: '−1,312 tokens · 示例降幅 54%',
    judgeNote: '判断不是只看词像不像：先看本任务/会话是否调用，再看账本、周期与成本；任一不确定只进入复核。',
    quietNote: '平时不吭声、关键时刻才出手的插件最容易被误关；周期/触发、已有调用、无账本都会先保护或复核。',
    evidenceKicker: '02 / EVIDENCE CHAIN', evidenceTitle1: '先过闸门，', evidenceTitle2: '再谈建议关闭。',
    evidenceBody: '先看本任务/会话有没有调用，再看账本、周期和成本。词像不像只是弱信号，不能单独判“用不上”。',
    legendReview: '进入人工复核', legendClose: '才可能成为候选',
    gate1Kicker: '任务相关', gate1Title: '描述匹配，只算相关', gate1Body: '关键词命中不单独构成“用不上”。', gateWeak: '弱证据',
    gate2Kicker: '使用账本', gate2Title: '有调用记录，直接复核', gate2Body: '历史或本会话调用过，就不自动建议关闭。', gateGuard: '保护',
    gate3Kicker: '定时 / 触发', gate3Title: '每月才用一次，也不能误伤', gate3Body: 'schedule、cron、提醒、dream 等语义硬保护。',
    gate4Kicker: '上下文成本', gate4Title: '成本 > 0，才值得优化', gate4Body: '没有可归属成本的插件，进入复核而不是候选。',
    gateResultKicker: 'RESULT', gateResultTitle: '强证据 → 候选；其余 → 复核',
    gateResultBody: '即使成为候选，也仍然需要确认与 host 审批 allowed-once。',
    dualKicker: 'INTERLUDE 02 / TWO LENSES',
    dualTitle1: '一边是成本，', dualTitle2: '一边是证据。',
    dualBody: '成本告诉你去哪里看；证据决定你能不能关。',
    dualCostTitle: '先看见钱花在哪。',
    dualCostBody: '常驻 token、可归属与未归属，只说明成本，不是关闭理由。',
    dualCostNote: '2,417 → 1,105 · 示例 profile',
    dualEvidenceTitle: '再确认它是否真的没用。',
    dualEvidenceBody: '调用、周期、账本与置信度，缺一项就进入复核。',
    dualEvidenceNote: '强证据 → 候选',
    backToTop: '回到顶部',
    productKicker: '主推插件体检 · 配方已冻结',
    trimTitle: '插件体检', trimBody: '四维结论先给判断，再给出可解释的保留/启用/关闭建议；应用后实测收益，并用真实快照看“谁变贵了”。',
    trim1: '四维结论：加载 / 兼容 / 上下文 / 压缩链路', trim2: '压缩双引擎、缺失后端与阈值冲突', trim3: '体检趋势、应用后实测收益与还原点', trimLink: '查看 npm 包 ↗',
    recipeStatus: '暂时废弃', recipeTitle: '工作流配方（已冻结）', recipeBody: '站点已停止推广：不再提供安装入口。已经安装的用户可以继续使用现有版本；产品没有删除，是否恢复另行通知。',
    recipe1: '不再推荐新装，也不提供安装链接', recipe2: '现有用户可以继续使用已装版本', recipe3: '状态：暂时废弃 / 冻结',
    consoleLabel: '设置 → 插件体检',
    safetyKicker: '04 / SAFETY IS A VERB', safetyTitle1: '安全不是弹窗，', safetyTitle2: '是每一步都能回头。',
    safetyBody: '只读分析、低风险、安全确认、还原点。没有任何一步靠“相信模型”。', sealNote: 'host approval',
    safety1Title: '只读扫描', safety1Body: '不执行 !!js、不联网分析。',
    safety2Title: '受保护项不动', safety2Body: '核心 / 预设 / 固定项永不改动。',
    safety3Title: '写入前有还原点', safety3Body: '恢复同样需要安全确认。',
    safety4Title: '宿主批准才写入', safety4Body: 'confirm 只是提案，allowed-once 才是授权。',
    installKicker: '安装', installTitle: '最短路径，装最新版。',
    installBody: '省略版本号即 latest。只需安装 dsh-plugin-trim。',
    copyAll: '复制命令', installNote: 'dsh-plugin-recipe 已暂时废弃，不再推荐新装；现有用户可继续使用已装版本。',
    npmCta: '打开 npm', releaseCta: 'GitHub Release ↗',
    faqKicker: '问答', faqTitle: '你可能正想问。',
    q1: '为什么我几乎没有“建议关闭”？', a1: '默认保守：没有使用账本、任务置信度不够、带定时/触发语义，或已有调用记录时，只进入复核。',
    q2: '每月才用一次的插件会被误伤吗？', a2: '带“每月/每周/定时/提醒/日程/dream”等语义的插件会被硬保护；也可以加入 protect 列表。',
    q3: '应用后出问题怎么办？', a3: '每次应用前写入还原点。在界面点击“恢复最近”，或调用 trim_rollback_profile；恢复同样需要安全确认。',
    q4: '为什么还需要宿主审批？', a4: 'confirm: true 只是提案标记。宿主审批返回 allowed-once 才是授权；拒绝、取消或审批不可用时一律不写入。',
    aboutKicker: '关于 / 支持', aboutTitle1: '一个本地优先的', aboutTitle2: 'DSH 插件套件。',
    aboutBody: 'AGPL-3.0 · 作者 Starlit Sky · 先体检，再决定关什么。',
    qqTitle: '交流群', qqLabel: 'QQ 群：', donateTitle: '支持项目',
    donateBody: '捐赠方式：待补充。当前也可以通过反馈、文档和插件试用来支持。',
    licenseTitle: '许可证', siteReadme: '站点说明',
  }
  const en = {
    skip: 'Skip to content', navWhy: 'Why', navHow: 'How', navFeatures: 'Features', navInstall: 'Install', navFaq: 'FAQ', navAbout: 'About', navCta: 'Install',
    heroEyebrow: 'DSH · PLUGIN CHECKUP',
    heroLine1: 'Plugins quietly', heroLine2: 'eat your context.', heroLine3: 'Now', heroLine4: 'drag it into the light.',
    heroLede: 'DSH Plugin Checkup combines resident cost, compatibility, compaction, and capability into one verdict: see the conclusion, then measure what the apply actually saved.',
    ctaInstall: 'Install latest', ctaHow: 'See the evidence', copy: 'Copy',
    heroMicro: 'No @version means latest · only dsh-plugin-trim is recommended',
    instrumentTop: 'TOPOLOGY / 14 NODES', instrumentLive: 'LIVE',
    hudLabel: 'Sample profile · resident context', hudBefore: 'Before 2,417', hudAfter: 'After 1,105 · −54%',
    instrumentFootLeft: 'Unattributed 1,312 tokens', instrumentFootRight: 'Sample data',
    heroFoot: 'Not a tool allowlist — resident plugin context.', scroll: 'Scroll',
    scrollCue: 'Scroll to inspect', scrollHint: 'KEEP GOING',
    posterKicker: 'INTERLUDE 01 / POSTER', posterTitle: 'Start with a poster.',
    posterBody: 'This is the promo cover and a glimpse of the real interface: lighter, further.',
    posterCaption: 'Promo cover · sample profile · AGPL-3.0',
    problemKicker: 'Invisible cost',
    problemTitle1: 'You cut the tool allowlist.', problemTitle2: 'Nobody measured resident plugin context.',
    problemBody: 'Tool calls are visible; plugin prompts and tool descriptions keep occupying space in the background. Measure first, then decide what to close.',
    statLabel: 'Sample reduction — not a close target', statNote: '54% is sample data, not your profile. A wrong close costs more than keeping it on.',
    costBefore: 'Before', costAfter: 'After', costDelta: '−1,312 tokens · sample 54% reduction',
    judgeNote: 'This is not a keyword-match decision. First check whether this task/session used it, then the ledger, schedule, and cost. Any uncertainty goes to review.',
    quietNote: 'Quiet plugins that only wake up at the right moment are the easiest to close by mistake. Schedules, prior calls, or no ledger keep them protected or in review.',
    evidenceKicker: '02 / EVIDENCE CHAIN', evidenceTitle1: 'Pass the gates.', evidenceTitle2: 'Then talk about closing.',
    evidenceBody: 'First check whether this task/session used it, then the ledger, schedule, and cost. A keyword match is only a weak signal; it can never prove “unused”.',
    legendReview: 'Goes to human review', legendClose: 'May become a candidate',
    gate1Kicker: 'Task relevance', gate1Title: 'A description match is only relevance', gate1Body: 'A keyword hit alone never proves “unused”.', gateWeak: 'Weak evidence',
    gate2Kicker: 'Usage ledger', gate2Title: 'Used before? Review it', gate2Body: 'Any historical or session calls block an automatic close suggestion.', gateGuard: 'Guarded',
    gate3Kicker: 'Schedules / triggers', gate3Title: 'Once a month is still a real use', gate3Body: 'schedule, cron, reminders, and dream hints are hard-protected.',
    gate4Kicker: 'Context cost', gate4Title: 'Cost > 0 makes it worth optimizing', gate4Body: 'Without attributable cost, an item goes to review, not a candidate.',
    gateResultKicker: 'RESULT', gateResultTitle: 'Strong evidence → candidate; everything else → review',
    gateResultBody: 'Even a candidate still needs confirmation and host approval returning allowed-once.',
    dualKicker: 'INTERLUDE 02 / TWO LENSES',
    dualTitle1: 'One side is cost.', dualTitle2: 'The other is evidence.',
    dualBody: 'Cost tells you where to look; evidence decides whether you can close it.',
    dualCostTitle: 'See where the money goes.',
    dualCostBody: 'Resident tokens, attributable and unattributed, only describe cost. They are not a reason to close.',
    dualCostNote: '2,417 → 1,105 · sample profile',
    dualEvidenceTitle: 'Then confirm it is really unused.',
    dualEvidenceBody: 'Calls, schedule, ledger, and confidence: miss one and it goes to review.',
    dualEvidenceNote: 'strong evidence → candidate',
    backToTop: 'Back to top',
    productKicker: 'Plugin checkup first · recipe frozen',
    trimTitle: 'Plugin checkup', trimBody: 'A four-check verdict comes first, then an explainable keep/enable/close plan. The next checkup measures the actual change and a real sparkline shows what got more expensive.',
    trim1: 'Four checks: load / compatibility / context / compaction', trim2: 'Duplicate backends, missing backends, threshold conflicts', trim3: 'Checkup trend, measured apply result, and restore points', trimLink: 'View npm package ↗',
    recipeStatus: 'Deprecated', recipeTitle: 'Workflow recipe (frozen)', recipeBody: 'This site has stopped promoting it and offers no install entry. Existing users can keep running the version they already have; the product is not deleted, and any revival will be announced separately.',
    recipe1: 'No new-install recommendation, no install link', recipe2: 'Existing users keep their installed version', recipe3: 'Status: temporarily deprecated / frozen',
    consoleLabel: 'Settings → Plugin checkup',
    safetyKicker: '04 / SAFETY IS A VERB', safetyTitle1: 'Safety is not a popup.', safetyTitle2: 'It is a way back.',
    safetyBody: 'Read-only analysis, low risk, safety approval, restore point. Nothing relies on “trust the model”.', sealNote: 'host approval',
    safety1Title: 'Read-only scan', safety1Body: 'No !!js, no network analysis.',
    safety2Title: 'Protected stays protected', safety2Body: 'Core / preset / pinned items never change.',
    safety3Title: 'Restore point before write', safety3Body: 'Recovery also needs safety approval.',
    safety4Title: 'Host approval before write', safety4Body: 'confirm is a proposal; allowed-once is the grant.',
    installKicker: 'Install', installTitle: 'Shortest path. Latest version.',
    installBody: 'No @version means latest. Only dsh-plugin-trim is recommended.',
    copyAll: 'Copy command', installNote: 'dsh-plugin-recipe is temporarily frozen and no longer recommended for new installs. Existing users can keep their installed version.',
    npmCta: 'Open npm', releaseCta: 'GitHub Release ↗',
    faqKicker: 'FAQ', faqTitle: 'What you may be asking.',
    q1: 'Why do I see almost no close candidates?', a1: 'Conservative by default: no ledger, low confidence, schedule/trigger hints, or existing calls all go to review.',
    q2: 'Will a once-a-month plugin be hurt?', a2: 'Monthly/weekly/schedule/reminder/calendar/dream hints are hard-protected. Add it to protect for extra safety.',
    q3: 'What if something breaks after apply?', a3: 'A restore point is written before every apply. Use Restore latest or trim_rollback_profile; recovery also needs safety approval.',
    q4: 'Why is host approval still needed?', a4: 'confirm: true is only a proposal marker. Host approval returning allowed-once is the grant; rejection, cancellation, or unavailable approval never writes.',
    aboutKicker: 'About / support', aboutTitle1: 'A local-first', aboutTitle2: 'DSH plugin suite.',
    aboutBody: 'AGPL-3.0 · by Starlit Sky · check first, then decide what to close.',
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
    document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
      const key = element.getAttribute('data-i18n-aria')
      if (key && Object.prototype.hasOwnProperty.call(dict, key)) element.setAttribute('aria-label', dict[key])
    })
    const lang = document.getElementById('lang')
    if (lang) {
      lang.textContent = current === 'zh' ? 'EN' : '中文'
      lang.setAttribute('aria-label', current === 'zh' ? 'Switch to English' : '切换到中文')
    }
    document.title = current === 'zh' ? 'DSH 插件体检 · Context Observatory' : 'DSH Plugin Checkup · Context Observatory'
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', current === 'zh'
      ? 'DSH 插件体检：先量插件常驻上下文，再按证据决定关不关。'
      : 'DSH Plugin Checkup: measure resident plugin context first, then decide with evidence.')
    try { localStorage.setItem(KEY, current) } catch {}
  }
  window.siteLocale = { get: () => current, toggle: () => apply(current === 'zh' ? 'en' : 'zh'), apply }
  apply(detect())
})()
