(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    new URLSearchParams(location.search).get('motion') === 'off'
  document.documentElement.classList.add('js')
  if (reduce) document.documentElement.classList.add('motion-off')

  const lang = document.getElementById('lang')
  if (lang) lang.addEventListener('click', () => window.siteLocale?.toggle())

  const header = document.getElementById('site-header')
  const scrollFloat = document.querySelector('.scroll-float')
  const onScroll = () => {
    header?.classList.toggle('scrolled', window.scrollY > 24)
    scrollFloat?.classList.toggle('is-hidden', window.scrollY > 60)
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  const progressBar = document.getElementById('progress')
  let progressRaf = 0
  const updateProgress = () => {
    progressRaf = 0
    if (!progressBar) return
    const max = document.documentElement.scrollHeight - window.innerHeight
    progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
  }
  const requestProgress = () => { if (!progressRaf) progressRaf = requestAnimationFrame(updateProgress) }
  updateProgress()
  window.addEventListener('scroll', requestProgress, { passive: true })
  window.addEventListener('resize', requestProgress)

  // Copy controls
  document.querySelectorAll('.copy').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button.dataset.copyEl
      const text = button.dataset.copy || (target ? document.getElementById(target)?.textContent : '')
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
        const previous = button.textContent
        button.textContent = window.siteLocale?.get() === 'zh' ? '已复制' : 'Copied'
        setTimeout(() => { button.textContent = previous }, 1400)
      } catch {
        button.textContent = window.siteLocale?.get() === 'zh' ? '复制失败' : 'Copy failed'
      }
    })
  })

  // Opening sequence
  const hero = document.querySelector('.hero')
  const intro = document.getElementById('intro')
  const introSkip = document.getElementById('intro-skip')
  const introCount = document.getElementById('intro-count')
  const introToken = document.getElementById('intro-token')
  const introCost = document.getElementById('intro-cost')
  const introProgress = document.querySelector('.intro-progress i')
  const introStepLabel = document.getElementById('intro-step-label')
  const introScenes = [...document.querySelectorAll('.intro-scene')]
  const introRail = [...document.querySelectorAll('.intro-rail [data-step]')]
  const introOff = !intro || reduce || new URLSearchParams(location.search).get('intro') === 'off'
  const pageRegions = [document.querySelector('.site-header'), document.querySelector('main'), document.querySelector('.site-footer')]
  const scenePlan = [
    { key: 'boot', label: 'BOOT / 01', duration: 2400 },
    { key: 'cost', label: 'COST / 02', duration: 2600 },
    { key: 'evidence', label: 'EVIDENCE / 03', duration: 2700 },
    { key: 'recipe', label: 'RECIPE / 04', duration: 2500 },
    { key: 'close', label: 'READY / 05', duration: 1800 },
  ]
  const introTotal = scenePlan.reduce((sum, scene) => sum + scene.duration, 0)
  let heroStarted = false
  let introDone = false
  let sceneIndex = -1
  let sceneTimer = 0
  let progressFrame = 0
  let costFrame = 0
  let introStartedAt = 0

  const setPageInert = (on) => {
    pageRegions.forEach((region) => {
      if (!region) return
      if (on) region.setAttribute('inert', '')
      else region.removeAttribute('inert')
    })
  }

  const startHero = () => {
    if (heroStarted) return
    heroStarted = true
    hero?.classList.add('is-ready')
    document.dispatchEvent(new CustomEvent('dsh:hero-start'))
  }

  const cancelIntroFrames = () => {
    window.clearTimeout(sceneTimer)
    if (progressFrame) cancelAnimationFrame(progressFrame)
    if (costFrame) cancelAnimationFrame(costFrame)
    progressFrame = 0
    costFrame = 0
  }

  const finishIntro = (immediate = false) => {
    if (introDone) return
    introDone = true
    cancelIntroFrames()
    document.body.classList.remove('intro-active')
    setPageInert(false)
    if (introProgress) introProgress.style.width = '100%'
    if (!intro) { startHero(); return }
    if (immediate || reduce) {
      intro.style.display = 'none'
      startHero()
      return
    }
    intro.classList.add('is-out')
    startHero()
    window.setTimeout(() => { intro.style.display = 'none' }, 650)
  }

  const setScene = (index) => {
    sceneIndex = index
    introScenes.forEach((scene, i) => {
      scene.classList.toggle('is-active', i === index)
      scene.classList.toggle('is-past', i < index)
    })
    introRail.forEach((step, i) => step.classList.toggle('is-on', i === index))
    if (introStepLabel) introStepLabel.textContent = scenePlan[index]?.label || ''
    if (scenePlan[index]?.key === 'cost') animateCost()
  }

  const animateCost = () => {
    if (!introCost) return
    if (reduce) { introCost.textContent = '1,105'; return }
    if (costFrame) cancelAnimationFrame(costFrame)
    const start = performance.now()
    const from = 2417
    const to = 1105
    const tick = (now) => {
      if (introDone || sceneIndex !== 1) return
      const progress = Math.min(1, (now - start) / 1700)
      const eased = 1 - Math.pow(1 - progress, 3)
      introCost.textContent = Math.round(from + (to - from) * eased).toLocaleString('en-US')
      if (progress < 1) costFrame = requestAnimationFrame(tick)
    }
    costFrame = requestAnimationFrame(tick)
  }

  const runScenes = (index) => {
    if (introDone) return
    if (index >= scenePlan.length) { finishIntro(false); return }
    setScene(index)
    sceneTimer = window.setTimeout(() => runScenes(index + 1), scenePlan[index].duration)
  }

  const tickProgress = (now) => {
    if (introDone) return
    const progress = Math.min(1, (now - introStartedAt) / introTotal)
    if (introProgress) introProgress.style.width = (progress * 100) + '%'
    if (progress < 1) progressFrame = requestAnimationFrame(tickProgress)
  }

  const animateBootCounts = () => {
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / 950)
      const eased = 1 - Math.pow(1 - progress, 3)
      if (introCount) introCount.textContent = String(Math.round(14 * eased)).padStart(2, '0')
      if (introToken) introToken.textContent = Math.round(2417 * eased).toLocaleString('en-US')
      if (progress < 1 && !introDone) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  if (introOff) {
    finishIntro(true)
  } else {
    document.body.classList.add('intro-active')
    setPageInert(true)
    setScene(0)
    requestAnimationFrame(() => { if (!introDone) intro.classList.add('is-live') })
    introStartedAt = performance.now()
    progressFrame = requestAnimationFrame(tickProgress)
    animateBootCounts()
    runScenes(0)
    introSkip?.addEventListener('click', () => finishIntro(false))
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !introDone) finishIntro(false)
    })
  }

  if (hero && !reduce && window.matchMedia('(pointer: fine)').matches) {
    let glowRaf = 0
    let glowX = 72
    let glowY = 28
    const paintGlow = () => {
      glowRaf = 0
      hero.style.setProperty('--mx', glowX + '%')
      hero.style.setProperty('--my', glowY + '%')
    }
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect()
      glowX = ((event.clientX - rect.left) / rect.width) * 100
      glowY = ((event.clientY - rect.top) / rect.height) * 100
      if (!glowRaf) glowRaf = requestAnimationFrame(paintGlow)
    }, { passive: true })
    hero.addEventListener('pointerleave', () => {
      glowX = 72
      glowY = 28
      if (!glowRaf) glowRaf = requestAnimationFrame(paintGlow)
    })
  }

  // Counters and bars
  const animateCounter = (element, target, duration = 900) => {
    if (reduce) { element.textContent = String(target); return }
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      element.textContent = String(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.querySelectorAll('[data-count-to]').forEach((element) => {
        if (element.dataset.done === '1') return
        element.dataset.done = '1'
        animateCounter(element, Number(element.dataset.countTo) || 0)
      })
      counterObserver.unobserve(entry.target)
    })
  }, { threshold: .35 })
  document.querySelectorAll('.problem, .stat-block').forEach((element) => counterObserver.observe(element))

  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.querySelectorAll('[data-bar-to]').forEach((bar) => {
        if (bar.dataset.done === '1') return
        bar.dataset.done = '1'
        bar.style.width = (Number(bar.dataset.barTo) || 0) + '%'
      })
      barObserver.unobserve(entry.target)
    })
  }, { threshold: .35 })
  document.querySelectorAll('.problem, .cost-compare').forEach((element) => barObserver.observe(element))

  // HUD number: sample 2,417 -> 1,105 / 46%
  const instrument = document.getElementById('instrument')
  const costValue = document.getElementById('cost-value')
  const costBar = document.getElementById('cost-bar')
  if (instrument && costValue) {
    const runHud = () => {
      if (instrument.dataset.hud === '1') return
      instrument.dataset.hud = '1'
      instrument.classList.add('is-scanning')
      if (reduce) {
        costValue.textContent = '1,105'
        if (costBar) costBar.style.width = '46%'
        return
      }
      const start = performance.now()
      const from = 2417
      const to = 1105
      const duration = 1500
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - progress, 3)
        costValue.textContent = Math.round(from + (to - from) * eased).toLocaleString('en-US')
        if (costBar) costBar.style.width = (100 - 54 * eased) + '%'
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    const armHud = () => {
      const hudObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) { runHud(); hudObserver.disconnect() } })
      }, { threshold: .45 })
      hudObserver.observe(instrument)
      if (reduce) runHud()
    }
    if (document.body.classList.contains('intro-active') && !reduce) {
      document.addEventListener('dsh:hero-start', armHud, { once: true })
    } else {
      armHud()
    }
  }

  if (instrument && !reduce && window.matchMedia('(pointer: fine)').matches) {
    let tiltRaf = 0
    let tiltX = 0
    let tiltY = 0
    const applyTilt = () => {
      tiltRaf = 0
      instrument.style.transform = tiltX || tiltY
        ? `perspective(1100px) rotateX(${tiltY}deg) rotateY(${tiltX}deg)`
        : ''
    }
    instrument.addEventListener('pointermove', (event) => {
      const rect = instrument.getBoundingClientRect()
      tiltX = ((event.clientX - rect.left) / rect.width - .5) * 2.4
      tiltY = ((event.clientY - rect.top) / rect.height - .5) * -2.4
      if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt)
    }, { passive: true })
    instrument.addEventListener('pointerleave', () => {
      tiltX = 0
      tiltY = 0
      if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt)
    })
  }

  // Generic reveal
  const revealTargets = document.querySelectorAll(
    '.section-label, .problem-copy, .stat-block, .cost-compare, .product-card, .console, .safety-copy, .seal, .safety-list li, .install-head, .terminal, .install-footer, .faq .display-2, .faq-list, .about-grid'
  )
  document.querySelectorAll('.safety-list li').forEach((element, index) => {
    element.style.setProperty('--reveal-delay', `${index * .06}s`)
  })
  if (reduce) {
    revealTargets.forEach((element) => element.classList.add('is-visible'))
  } else {
    revealTargets.forEach((element) => element.classList.add('reveal'))
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        revealObserver.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 })
    revealTargets.forEach((element) => revealObserver.observe(element))
  }

  // Evidence gates
  const gates = document.querySelectorAll('.gate')
  gates.forEach((gate, index) => gate.style.setProperty('--reveal-delay', `${index * .06}s`))
  if (!reduce && 'IntersectionObserver' in window) {
    const gateObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        gateObserver.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -12% 0px', threshold: .2 })
    gates.forEach((gate) => gateObserver.observe(gate))
  } else {
    gates.forEach((gate) => gate.classList.add('is-visible'))
  }

  // Poster parallax
  const poster = document.querySelector('.poster-frame img')
  if (poster && !reduce && window.matchMedia('(pointer: fine)').matches) {
    let raf = 0
    const updatePoster = () => {
      raf = 0
      const rect = poster.parentElement?.getBoundingClientRect()
      if (!rect) return
      const offset = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * .035
      poster.style.transform = `translate3d(0, ${Math.max(-22, Math.min(22, offset))}px, 0) scale(1.02)`
    }
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(updatePoster) }, { passive: true })
    updatePoster()
  }

  // Terminal typing
  const terminal = document.getElementById('terminal')
  const terminalText = document.getElementById('terminal-text')
  const command = 'npm i dsh-plugin-trim\nnpm i dsh-plugin-recipe'
  if (terminal && terminalText) {
    const runTerminal = () => {
      if (terminal.dataset.done === '1') return
      terminal.dataset.done = '1'
      if (reduce) { terminalText.textContent = command; return }
      let index = 0
      const tick = () => {
        terminalText.textContent = command.slice(0, index)
        index += 1
        if (index <= command.length) setTimeout(tick, command[index - 1] === '\n' ? 160 : 18)
      }
      tick()
    }
    const terminalObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { runTerminal(); terminalObserver.disconnect() } })
    }, { threshold: .35 })
    terminalObserver.observe(terminal)
    if (reduce) runTerminal()
  }

  // Constellation canvas
  const canvas = document.getElementById('constellation')
  if (canvas) {
    if (document.body.classList.contains('intro-active') && !reduce) {
      document.addEventListener('dsh:hero-start', () => initConstellation(canvas, reduce), { once: true })
    } else {
      initConstellation(canvas, reduce)
    }
  }
  function initConstellation(canvas, reduce) {
    const ctx = canvas.getContext('2d')
    const tip = document.getElementById('node-tip')
    const host = canvas.parentElement
    if (!ctx || !host) return
    const labels = [
      'dsh-base', 'web-app', 'whale-widget', 'notify-ding', 'voice-input',
      'plugin-recipe', 'plugin-trim', 'forge', 'recommend', 'terminal',
      'session-titles', 'badge-skill', 'prompt-cache', 'tool-git',
    ]
    const nodes = labels.map((label, index) => ({
      label,
      angle: (index / labels.length) * Math.PI * 2 - .6,
      radius: 88 + (index % 4) * 28,
      size: 3.2 + (index % 3) * .8,
      pct: 4 + (index * 7) % 14,
      speed: .000018 + (index % 5) * .000006,
    }))
    let width = 0, height = 0, dpr = 1
    let frame = 0, active = true, start = 0
    let pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let positions = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (reduce) draw(0, 1)
    }

    const draw = (now, forcedScan) => {
      ctx.clearRect(0, 0, width, height)
      const centerX = width / 2 + pointer.x
      const centerY = height / 2 + pointer.y
      const t = reduce ? 0 : now
      const scan = forcedScan !== undefined ? forcedScan : Math.min(1, (t - start) / 1700)
      const scanX = -width * .1 + scan * width * 1.2

      // radial rings
      ctx.lineWidth = 1
      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, 66 * ring, 44 * ring, -.12, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(112,142,178,${.12 - ring * .018})`
        ctx.stroke()
      }

      positions = nodes.map((node, index) => {
        const angle = node.angle + (reduce ? 0 : t * node.speed)
        const x = centerX + Math.cos(angle) * node.radius * 1.55
        const y = centerY + Math.sin(angle) * node.radius * .9
        return { x, y, node }
      })

      // links
      for (let i = 0; i < positions.length; i++) {
        const a = positions[i]
        const b = positions[(i + 3) % positions.length]
        const nearScan = Math.abs(a.x - scanX) < 70
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = nearScan ? 'rgba(94,234,212,.32)' : 'rgba(95,122,153,.11)'
        ctx.lineWidth = nearScan ? 1.1 : .7
        ctx.stroke()
      }

      // scan beam
      if (scan < 1.02 && !reduce) {
        const gradient = ctx.createLinearGradient(scanX - 40, 0, scanX + 40, 0)
        gradient.addColorStop(0, 'rgba(94,234,212,0)')
        gradient.addColorStop(.5, 'rgba(94,234,212,.6)')
        gradient.addColorStop(1, 'rgba(94,234,212,0)')
        ctx.fillStyle = gradient
        ctx.fillRect(scanX - 40, 0, 80, height)
      }

      positions.forEach(({ x, y, node }, index) => {
        const lit = scan >= 1 || Math.abs(x - scanX) < 60 || reduce
        ctx.beginPath()
        ctx.arc(x, y, node.size + (lit ? 1.7 : 0), 0, Math.PI * 2)
        ctx.fillStyle = lit ? (index % 5 === 0 ? '#fbbf24' : '#5eead4') : '#36536e'
        ctx.fill()
        if (lit) {
          ctx.beginPath()
          ctx.arc(x, y, node.size + 5, 0, Math.PI * 2)
          ctx.strokeStyle = index % 5 === 0 ? 'rgba(251,191,36,.25)' : 'rgba(94,234,212,.22)'
          ctx.lineWidth = 1
          ctx.stroke()
        }
        if (lit && index % 4 === 0) {
          ctx.font = '9px "JetBrains Maple Mono", monospace'
          ctx.fillStyle = 'rgba(190,225,240,.62)'
          ctx.fillText(node.label, x + 10, y - 7)
        }
      })

      // center mark
      ctx.beginPath()
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(7,16,29,.74)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(251,191,36,.65)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.font = '8px "JetBrains Maple Mono", monospace'
      ctx.fillStyle = 'rgba(251,191,36,.9)'
      ctx.textAlign = 'center'
      ctx.fillText('CTX', centerX, centerY + 3)
    }

    const loop = (now) => {
      if (!active) return
      pointer.x += (pointer.tx - pointer.x) * .055
      pointer.y += (pointer.ty - pointer.y) * .055
      draw(now)
      frame = requestAnimationFrame(loop)
    }

    resize()
    start = performance.now()
    if (reduce) {
      draw(0, 1)
    } else {
      frame = requestAnimationFrame(loop)
      const visibility = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          active = entry.isIntersecting && !document.hidden
          if (active && !frame) frame = requestAnimationFrame(loop)
          if (!active && frame) { cancelAnimationFrame(frame); frame = 0 }
        })
      }, { threshold: .05 })
      visibility.observe(canvas)
    }

    const pointerMove = (event) => {
      const rect = host.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      pointer.tx = (x / rect.width - .5) * 16
      pointer.ty = (y / rect.height - .5) * 12
      if (!tip) return
      const hit = positions.find(({ x: nx, y: ny }) => (nx - x) ** 2 + (ny - y) ** 2 < 190)
      if (hit) {
        tip.hidden = false
        tip.textContent = `${hit.node.label} · ${hit.node.pct}%`
        tip.style.left = x + 'px'
        tip.style.top = y + 'px'
      } else {
        tip.hidden = true
      }
    }
    const pointerLeave = () => { pointer.tx = 0; pointer.ty = 0; if (tip) tip.hidden = true }
    host.addEventListener('mousemove', pointerMove)
    host.addEventListener('mouseleave', pointerLeave)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0 }
      else if (active && !reduce && !frame) frame = requestAnimationFrame(loop)
    })
  }

})()
