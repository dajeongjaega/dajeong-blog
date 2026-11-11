#!/usr/bin/env node
/**
 * 정적 글 페이지(prerender) 빌드 스크립트.
 *
 * 왜 필요한가:
 *   index.html / post.html은 원래 자바스크립트가 posts.json과 마크다운 파일을
 *   브라우저에서 fetch 해와서 화면을 채우는 구조였습니다. 사람 눈에는 멀쩡해
 *   보이지만, 네이버 등 자바스크립트를 실행하지 않는(또는 제한적으로만 실행하는)
 *   검색엔진 크롤러에게는 글 목록/본문이 빈 페이지로 보였습니다.
 *
 *   이 스크립트는 posts/posts.json + posts/*.md 를 읽어서:
 *     1) 글 목록(각 글의 제목·날짜·요약)이 이미 채워진 index.html을 생성하고
 *     2) 글마다 본문이 이미 채워진 정적 페이지(post-<slug>.html)를 생성하고
 *     3) sitemap.xml을 그 정적 페이지 주소 기준으로 다시 생성합니다.
 *
 *   실행 방법: node build.js  (저장소 루트에서 실행, 의존성 없음)
 *
 *   새 글을 추가할 때: posts/*.md 와 posts/posts.json을 기존 방식대로 수정한 뒤
 *   이 스크립트를 다시 실행하면 index.html / post-<slug>.html / sitemap.xml이
 *   전부 최신 내용으로 다시 생성됩니다.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SITE_URL = "https://dajeongjaega.github.io/dajeong-blog";

// ---------------------------------------------------------------------------
// js/markdown.js 와 동일한 가벼운 마크다운 → HTML 변환기 (Node 환경용 복사본)
// ---------------------------------------------------------------------------
function markdownToHtml(markdown) {
  const escapeHtml = (str) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const applyInline = (text) => {
    let result = escapeHtml(text);
    result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
    result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return result;
  };

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  let listBuffer = null;

  const flushList = () => {
    if (!listBuffer) return;
    const tag = listBuffer.type;
    html.push(`<${tag}>`);
    for (const item of listBuffer.items) html.push(`<li>${applyInline(item)}</li>`);
    html.push(`</${tag}>`);
    listBuffer = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      flushList();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^</.test(line.trim())) {
      flushList();
      const htmlLines = [];
      while (i < lines.length && lines[i].trim() !== "") {
        htmlLines.push(lines[i]);
        i++;
      }
      html.push(htmlLines.join("\n"));
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${applyInline(headingMatch[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) {
      flushList();
      html.push("<hr>");
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote><p>${applyInline(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const type = ulMatch ? "ul" : "ol";
      const content = ulMatch ? ulMatch[1] : olMatch[1];
      if (!listBuffer || listBuffer.type !== type) {
        flushList();
        listBuffer = { type, items: [] };
      }
      listBuffer.items.push(content);
      i++;
      continue;
    }

    if (line.trim() === "") {
      flushList();
      i++;
      continue;
    }

    flushList();
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^```/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(---|\*\*\*|___)\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    html.push(`<p>${applyInline(paraLines.join(" "))}</p>`);
  }

  flushList();
  return html.join("\n");
}

function formatDateKo(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function escapeAttr(str) {
  return String(str || "").replace(/"/g, "&quot;");
}

const CATEGORY_IMAGES = {
  센터소개: "https://cdn.pakutaso.com/shared/img/thumb/roujinIMGL8123_TP_V.jpg",
  운영준비: "https://cdn.pakutaso.com/shared/img/thumb/SYU0I9A6789_1_TP_V.jpg",
  정책정보: "https://cdn.pakutaso.com/shared/img/thumb/syu-PAUI4956-e_TP_V.jpg",
};
const DEFAULT_IMAGE = CATEGORY_IMAGES.운영준비;

const HEADER = `  <div class="bg-decor" aria-hidden="true"></div>

  <header class="hero-banner">
    <div class="hero-banner-inner">
      <div class="hero-top">
        <a class="site-title" href="index.html">
          <svg class="site-logo" width="30" height="30" viewBox="0 0 120 120" role="img" aria-label="하트를 반씩 나눈 두 사람">
            <circle cx="36" cy="20" r="9" fill="#E8735A"/>
            <circle cx="84" cy="20" r="9" fill="#F2A97A"/>
            <path d="M58 106 L58 58 C54 46 46 40 36 40 C20 40 14 58 22 72 C28 84 42 96 58 106Z" fill="#E8735A"/>
            <path d="M62 106 L62 58 C66 46 74 40 84 40 C100 40 106 58 98 72 C92 84 78 96 62 106Z" fill="#F2A97A"/>
          </svg>
          <span>다정재가복지센터</span>
        </a>
        <button class="theme-toggle" data-theme-toggle aria-label="다크 모드로 전환">🌙</button>
      </div>
      <p class="hero-eyebrow">어르신 1:1 맞춤 돌봄서비스 전문</p>
      <div class="hero-tags">
        <span class="hero-tag">방문간호</span>
        <span class="hero-tag">방문요양</span>
        <span class="hero-tag">방문목욕</span>
      </div>
      <p class="hero-tagline">내 부모, 내 가족처럼 한결같은 마음으로 모시겠습니다.</p>
      <p class="hero-status">경상남도 밀양시 · 장기요양기관 지정 신청 절차 진행 중</p>
    </div>
  </header>`;

const SIDEBAR = `    <aside class="sidebar">
      <div class="profile-card">
        <svg class="profile-logo" width="48" height="48" viewBox="0 0 120 120" role="img" aria-label="하트를 반씩 나눈 두 사람">
          <circle cx="36" cy="20" r="9" fill="#E8735A"/>
          <circle cx="84" cy="20" r="9" fill="#F2A97A"/>
          <path d="M58 106 L58 58 C54 46 46 40 36 40 C20 40 14 58 22 72 C28 84 42 96 58 106Z" fill="#E8735A"/>
          <path d="M62 106 L62 58 C66 46 74 40 84 40 C100 40 106 58 98 72 C92 84 78 96 62 106Z" fill="#F2A97A"/>
        </svg>
        <p class="profile-name">다정재가복지센터</p>
        <p class="profile-bio">경상남도 밀양시에서 준비 중인 재가노인복지시설입니다. 방문요양·방문목욕·방문간호를 1:1 맞춤으로 제공할 예정입니다.</p>
      </div>
      <nav class="category-nav" aria-label="카테고리">
        <h2 class="sidebar-heading">카테고리</h2>
        <ul id="category-list"></ul>
      </nav>
    </aside>`;

const FOOTER = `  <footer class="site-footer">
    <p>마크다운으로 쓰고, 프레임워크 없이 보여줍니다.</p>
  </footer>`;

function renderPostCard(post) {
  const thumb = post.thumbnail || CATEGORY_IMAGES[post.category] || DEFAULT_IMAGE;
  const href = `post-${post.slug}.html`;
  return `      <li class="post-card">
        <a href="${href}" class="post-card-thumb-link"><img class="post-card-thumb" src="${thumb}" alt="" loading="lazy"></a>
        <div class="post-card-body">
          <h2 class="post-card-title"><a href="${href}">${post.title}</a></h2>
          <p class="post-card-meta">${formatDateKo(post.date)}${post.category ? " · " + post.category : ""}</p>
          <p class="post-card-summary">${post.summary || ""}</p>
        </div>
      </li>`;
}

function buildIndexHtml(posts) {
  const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const cardsHtml = sorted.map(renderPostCard).join("\n");
  const description = "경상남도 밀양시 다정재가복지센터 블로그 - 방문요양·방문목욕·방문간호 서비스 안내와 센터 개설 준비 소식.";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${escapeAttr(description)}">
<meta name="naver-site-verification" content="782ce97cec782007a6b8e9a073f89175bdb69049" />
<link rel="canonical" href="${SITE_URL}/">
<title>다정재가복지센터</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap">
<link rel="stylesheet" href="css/style.css">
<script src="js/theme.js"></script>
</head>
<body>
${HEADER}

  <div class="layout">
${SIDEBAR}

    <main class="content">
      <p class="content-count" id="content-count">전체 글 ${sorted.length}개</p>
      <ul class="post-grid" id="post-list">
${cardsHtml}
      </ul>
    </main>
  </div>

  <section class="apps-section">
    <div class="apps-section-inner">
      <h2 class="apps-heading">미니 웹앱</h2>
      <ul class="apps-grid">
        <li class="app-card">
          <a class="app-card-link" href="apps/2048/index.html">
            <div class="app-card-preview" aria-hidden="true">
              <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="2048 타일 미리보기">
                <rect x="4" y="4" width="112" height="112" rx="10" fill="#bbada0"/>
                <rect x="12" y="12" width="48" height="48" rx="6" fill="#eee4da"/>
                <text x="36" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#776e65">2</text>
                <rect x="64" y="12" width="44" height="48" rx="6" fill="#f2b179"/>
                <text x="86" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#fff">8</text>
                <rect x="12" y="64" width="44" height="44" rx="6" fill="#edcf72"/>
                <text x="34" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#fff">128</text>
                <rect x="60" y="64" width="48" height="44" rx="6" fill="#edc22e"/>
                <text x="84" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#fff">2048</text>
              </svg>
            </div>
            <div class="app-card-body">
              <h3 class="app-card-title">2048</h3>
              <p class="app-card-desc">방향키(또는 스와이프)로 숫자 타일을 밀어 합치는 퍼즐 게임. 점수판과 다크모드를 지원합니다.</p>
            </div>
          </a>
        </li>
      </ul>
    </div>
  </section>

${FOOTER}

  <script src="js/categories.js"></script>
  <script src="js/list.js"></script>
</body>
</html>
`;
}

function buildPostHtml(post, bodyHtml) {
  const description = post.summary || post.title;
  const url = `${SITE_URL}/post-${post.slug}.html`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${escapeAttr(description)}">
<link rel="canonical" href="${url}">
<title>${post.title} - 다정재가복지센터</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap">
<link rel="stylesheet" href="css/style.css">
<script src="js/theme.js"></script>
</head>
<body>
${HEADER}

  <div class="layout">
${SIDEBAR}

    <main class="content">
      <a class="back-link" href="index.html">&larr; 목록으로</a>
      <article>
        <header class="post-header">
          <h1 class="post-title" id="post-title">${post.title}</h1>
          <p class="post-meta" id="post-meta">${formatDateKo(post.date)}${post.category ? " · " + post.category : ""}</p>
        </header>
        <div class="post-content" id="post-content">
${bodyHtml}
        </div>
      </article>
    </main>
  </div>

${FOOTER}

  <script src="js/categories.js"></script>
</body>
</html>
`;
}

function main() {
  const posts = JSON.parse(fs.readFileSync(path.join(ROOT, "posts", "posts.json"), "utf8"));

  // 1) index.html
  fs.writeFileSync(path.join(ROOT, "index.html"), buildIndexHtml(posts));
  console.log("생성: index.html");

  // 2) post-<slug>.html (글마다 정적 페이지)
  for (const post of posts) {
    const mdPath = path.join(ROOT, "posts", `${post.slug}.md`);
    if (!fs.existsSync(mdPath)) {
      console.warn(`경고: ${mdPath} 파일이 없어 건너뜀`);
      continue;
    }
    const raw = fs.readFileSync(mdPath, "utf8");
    const withoutLeadingTitle = raw.replace(/^\s*#\s+.*\n+/, "");
    const bodyHtml = markdownToHtml(withoutLeadingTitle);
    const outPath = path.join(ROOT, `post-${post.slug}.html`);
    fs.writeFileSync(outPath, buildPostHtml(post, bodyHtml));
    console.log(`생성: post-${post.slug}.html`);
  }

  // 3) sitemap.xml
  const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const today = sorted[0] ? sorted[0].date : new Date().toISOString().slice(0, 10);
  const urls = [
    `  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    ...sorted.map(
      (post) =>
        `  <url>\n    <loc>${SITE_URL}/post-${post.slug}.html</loc>\n    <lastmod>${post.date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    ),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);
  console.log("생성: sitemap.xml");
}

main();
