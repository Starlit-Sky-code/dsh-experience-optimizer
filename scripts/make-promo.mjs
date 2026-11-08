#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(root, 'assets')
mkdirSync(assets, { recursive: true })

const icon = readFileSync(join(root, 'icon.png')).toString('base64')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const repo = (process.env.GITHUB_REPOSITORY || 'Starlit-Sky-code/dsh-experience-optimizer').replace(/^https?:\/\/github\.com\//, '')
const font = 'Noto Sans CJK SC, Noto Sans CJK JP, sans-serif'
const mono = 'JetBrains Maple Mono, monospace'

function shell(width, height) {
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#070b14"/>
        <stop offset="0.55" stop-color="#0d1424"/>
        <stop offset="1" stop-color="#141d31"/>
      </linearGradient>
      <radialGradient id="warm" cx="0.18" cy="0.2" r="0.65">
        <stop offset="0" stop-color="#f2a33a" stop-opacity="0.20"/>
        <stop offset="1" stop-color="#f2a33a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="cool" cx="0.88" cy="0.2" r="0.7">
        <stop offset="0" stop-color="#8fb7ff" stop-opacity="0.16"/>
        <stop offset="1" stop-color="#8fb7ff" stop-opacity="0"/>
      </radialGradient>
      <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1.1" fill="#ffffff" opacity="0.055"/>
      </pattern>
      <clipPath id="iconClip">
        <rect x="0" y="0" width="100%" height="100%" rx="30" ry="30"/>
      </clipPath>
      <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#f2a33a" stop-opacity="0.9"/>
        <stop offset="0.6" stop-color="#8fb7ff" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#8fb7ff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect width="${width}" height="${height}" fill="url(#dots)"/>
    <rect width="${width}" height="${height}" fill="url(#warm)"/>
    <rect width="${width}" height="${height}" fill="url(#cool)"/>
  `
}

function iconPanel(x, y, size) {
  const radius = 30
  const pad = 10
  return `
    <g transform="translate(${x} ${y})">
      <rect x="-${pad}" y="-${pad}" width="${size + pad * 2}" height="${size + pad * 2}" rx="${radius + 8}" fill="#ffffff" opacity="0.045"/>
      <rect x="-${pad}" y="-${pad}" width="${size + pad * 2}" height="${size + pad * 2}" rx="${radius + 8}" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1.5"/>
      <g clip-path="url(#iconClip)">
        <rect width="${size}" height="${size}" rx="${radius}" fill="#0b1020"/>
        <image href="data:image/png;base64,${icon}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/>
      </g>
      <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.5"/>
    </g>
  `
}

function sparkle(x, y, size, color = '#f2a33a', opacity = 0.9) {
  return `<path transform="translate(${x} ${y}) scale(${size / 24})" d="M12 0l2.6 7.2L22 10l-7.2 2.6L12 20l-2.6-7.2L2 10l7.2-2.6z" fill="${color}" opacity="${opacity}"/>`
}

function chip(x, y, label, color = '#f2a33a') {
  const width = Math.max(104, label.length * 21 + 34)
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="44" rx="22" fill="${color}" fill-opacity="0.10" stroke="${color}" stroke-opacity="0.45"/>
      <circle cx="21" cy="22" r="4" fill="${color}"/>
      <text x="34" y="29" font-family="${font}" font-size="18" fill="#e8eefb">${label}</text>
    </g>
  `
}

const promo = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${shell(1200, 630)}
  ${iconPanel(78, 155, 310)}
  ${sparkle(1050, 72, 34, '#f2a33a', 0.9)}
  ${sparkle(1100, 118, 18, '#f2a33a', 0.7)}
  <text x="450" y="176" font-family="${mono}" font-size="19" letter-spacing="2.4" fill="#f2a33a">DSH EXPERIENCE OPTIMIZER</text>
  <text x="450" y="253" font-family="${font}" font-size="48" font-weight="700" fill="#f4f7ff">DSH 体验优化套件</text>
  <text x="450" y="312" font-family="${font}" font-size="27" fill="#c7d2e5">少一点插件负担，多一点兼容确定性。</text>
  <text x="450" y="354" font-family="${font}" font-size="19" fill="#8fa3bd">插件减负 × 兼容性体检 × 工作流蓝图</text>
  ${chip(450, 395, '兼容性体检', '#f2a33a')}
  ${chip(610, 395, '插件减负', '#8fb7ff')}
  ${chip(740, 395, '工作流蓝图', '#9fe0c0')}
  <rect x="450" y="470" width="600" height="1" fill="url(#rule)"/>
  <text x="450" y="512" font-family="${mono}" font-size="20" fill="#cfd9ea">dsh-plugin-trim  ·  dsh-plugin-recipe</text>
  <text x="450" y="548" font-family="${mono}" font-size="17" fill="#7f92aa">github.com/${repo}</text>
  <text x="450" y="582" font-family="${mono}" font-size="15" fill="#5f728a">v${pkg.version}  ·  MIT  ·  DSH 0.2.2-rc.1</text>
</svg>`

const banner = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="500" viewBox="0 0 1600 500">
  ${shell(1600, 500)}
  ${iconPanel(76, 118, 260)}
  ${sparkle(1450, 62, 32, '#f2a33a', 0.9)}
  <text x="390" y="158" font-family="${mono}" font-size="18" letter-spacing="2.2" fill="#f2a33a">DSH EXPERIENCE OPTIMIZER</text>
  <text x="390" y="228" font-family="${font}" font-size="42" font-weight="700" fill="#f4f7ff">DSH 体验优化套件</text>
  <text x="390" y="282" font-family="${font}" font-size="24" fill="#c7d2e5">少一点插件负担，多一点兼容确定性。</text>
  ${chip(390, 320, '兼容性体检', '#f2a33a')}
  ${chip(550, 320, '插件减负', '#8fb7ff')}
  ${chip(680, 320, '工作流蓝图', '#9fe0c0')}
  <text x="390" y="424" font-family="${mono}" font-size="17" fill="#8fa3bd">dsh-plugin-trim  ·  dsh-plugin-recipe</text>
  <text x="390" y="454" font-family="${mono}" font-size="15" fill="#62758d">github.com/${repo}</text>
  <g transform="translate(1172 108)">
    <rect width="340" height="286" rx="22" fill="#ffffff" fill-opacity="0.035" stroke="#ffffff" stroke-opacity="0.12"/>
    <text x="24" y="42" font-family="${mono}" font-size="13" letter-spacing="1.8" fill="#7f92aa">COMPATIBILITY MATRIX</text>
    <g transform="translate(24 66)">
      <rect width="292" height="52" rx="10" fill="#f2a33a" fill-opacity="0.08" stroke="#f2a33a" stroke-opacity="0.35"/>
      <text x="16" y="32" font-family="${mono}" font-size="14" fill="#d9e2f2">runtime</text>
      <text x="196" y="32" font-family="${mono}" font-size="13" fill="#f2a33a">E:RT_ENGINE</text>
    </g>
    <g transform="translate(24 126)">
      <rect width="292" height="52" rx="10" fill="#8fb7ff" fill-opacity="0.08" stroke="#8fb7ff" stroke-opacity="0.35"/>
      <text x="16" y="32" font-family="${mono}" font-size="14" fill="#d9e2f2">plugin</text>
      <text x="188" y="32" font-family="${mono}" font-size="13" fill="#8fb7ff">W:PP_SERVICE</text>
    </g>
    <g transform="translate(24 186)">
      <rect width="292" height="52" rx="10" fill="#9fe0c0" fill-opacity="0.08" stroke="#9fe0c0" stroke-opacity="0.35"/>
      <text x="16" y="32" font-family="${mono}" font-size="14" fill="#d9e2f2">profile</text>
      <text x="172" y="32" font-family="${mono}" font-size="13" fill="#9fe0c0">I:PW_DRIFT</text>
    </g>
    <text x="24" y="266" font-family="${mono}" font-size="12" fill="#5f728a">E error · W warn · I info</text>
  </g>
</svg>`

writeFileSync(join(assets, 'promo.svg'), promo)
writeFileSync(join(assets, 'banner.svg'), banner)

const conversions = [
  ['promo.svg', 'promo.png'],
  ['banner.svg', 'banner.png'],
]
for (const [from, to] of conversions) {
  try {
    execFileSync('rsvg-convert', [join(assets, from), '-o', join(assets, to)], { stdio: 'inherit' })
    console.log(`wrote assets/${to}`)
  } catch {
    try {
      execFileSync('magick', [join(assets, from), join(assets, to)], { stdio: 'inherit' })
      console.log(`wrote assets/${to}`)
    } catch {
      console.warn(`could not rasterize assets/${from}; SVG remains available`)
    }
  }
}
console.log(`wrote assets/promo.svg and assets/banner.svg for ${repo}`)
