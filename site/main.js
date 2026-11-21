(() => {
  const lang = document.getElementById('lang')
  if (lang) lang.addEventListener('click', () => window.siteLocale?.toggle())

  document.querySelectorAll('.copy').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button.dataset.copyEl
      const text = target ? document.getElementById(target)?.textContent : button.dataset.copy
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

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const targets = document.querySelectorAll('.section-head, .card, .step, .feature-card, .shot, .safety-points, .terminal, .faq details')
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('visible'))
  } else {
    targets.forEach((el) => el.classList.add('reveal'))
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('visible')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    targets.forEach((el) => observer.observe(el))
  }
})()
