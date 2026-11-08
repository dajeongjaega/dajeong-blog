(function () {
  const listEl = document.getElementById("post-list");
  const countEl = document.getElementById("content-count");

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }

  // 카테고리별 플레이스홀더 아이콘 (사진이 없는 글에 표시)
  const CATEGORY_ICONS = {
    센터소개: `<svg viewBox="0 0 120 120" role="img" aria-label="다정재가복지센터 로고">
      <circle cx="36" cy="20" r="9" fill="#E8735A"/>
      <circle cx="84" cy="20" r="9" fill="#F2A97A"/>
      <path d="M58 106 L58 58 C54 46 46 40 36 40 C20 40 14 58 22 72 C28 84 42 96 58 106Z" fill="#E8735A"/>
      <path d="M62 106 L62 58 C66 46 74 40 84 40 C100 40 106 58 98 72 C92 84 78 96 62 106Z" fill="#F2A97A"/>
    </svg>`,
    운영준비: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="체크리스트">
      <rect x="5" y="4" width="14" height="17" rx="2"/>
      <rect x="9" y="2.3" width="6" height="3" rx="1"/>
      <path d="M8.3 11.2l1.4 1.4 2.6-2.8"/>
      <path d="M8.3 17h7.4"/>
    </svg>`,
    정책정보: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="통계 그래프">
      <path d="M4 20V10"/>
      <path d="M10 20V4"/>
      <path d="M16 20v-7"/>
      <path d="M20 20H4"/>
    </svg>`,
  };
  const DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="글">
    <path d="M6 3h9l4 4v14H6z"/>
    <path d="M15 3v5h5"/>
  </svg>`;

  function thumbMarkup(post) {
    if (post.thumbnail) {
      return `<img class="post-card-thumb" src="${post.thumbnail}" alt="">`;
    }
    const icon = CATEGORY_ICONS[post.category] || DEFAULT_ICON;
    return `<span class="post-card-thumb post-card-thumb-placeholder" aria-hidden="true">${icon}</span>`;
  }

  function renderPosts(posts) {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    const filtered = category ? posts.filter((p) => p.category === category) : posts;

    if (countEl) {
      countEl.textContent = category
        ? `${category} 카테고리 글 ${filtered.length}개`
        : `전체 글 ${filtered.length}개`;
    }

    if (!filtered.length) {
      listEl.innerHTML = '<p class="empty-state">아직 작성된 글이 없습니다.</p>';
      return;
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    listEl.innerHTML = sorted
      .map(
        (post) => `
      <li class="post-card">
        <a href="post.html?slug=${encodeURIComponent(post.slug)}" class="post-card-thumb-link">${thumbMarkup(post)}</a>
        <div class="post-card-body">
          <h2 class="post-card-title"><a href="post.html?slug=${encodeURIComponent(post.slug)}">${post.title}</a></h2>
          <p class="post-card-meta">${formatDate(post.date)}${post.category ? " · " + post.category : ""}</p>
          <p class="post-card-summary">${post.summary || ""}</p>
        </div>
      </li>`
      )
      .join("");
  }

  fetch("posts/posts.json")
    .then((res) => {
      if (!res.ok) throw new Error("posts.json을 불러올 수 없습니다.");
      return res.json();
    })
    .then(renderPosts)
    .catch((err) => {
      listEl.innerHTML = `<p class="error-state">글 목록을 불러오지 못했습니다. 로컬 서버로 실행했는지 확인해 주세요. (${err.message})</p>`;
    });
})();
