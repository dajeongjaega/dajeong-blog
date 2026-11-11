(function () {
  const listEl = document.getElementById("post-list");
  const countEl = document.getElementById("content-count");

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }

  // 카테고리별 기본 사진 (글에 직접 지정한 thumbnail이 없을 때 표시)
  // 실제 센터 현장 사진이 아니라 카테고리를 상징하는 일반 사진입니다. 현장 사진이 생기면 각 글의 posts.json에 "thumbnail"을 지정해 교체해 주세요.
  // 센터소개·운영준비·정책정보 모두 PAKUTASO(일본 무료 인물 사진, 상업적 이용 가능)
  const CATEGORY_IMAGES = {
    센터소개: "https://cdn.pakutaso.com/shared/img/thumb/roujinIMGL8123_TP_V.jpg",
    운영준비: "https://cdn.pakutaso.com/shared/img/thumb/SYU0I9A6789_1_TP_V.jpg",
    정책정보: "https://cdn.pakutaso.com/shared/img/thumb/syu-PAUI4956-e_TP_V.jpg",
  };
  const DEFAULT_IMAGE = CATEGORY_IMAGES.운영준비;

  function thumbMarkup(post) {
    const src = post.thumbnail || CATEGORY_IMAGES[post.category] || DEFAULT_IMAGE;
    return `<img class="post-card-thumb" src="${src}" alt="" loading="lazy">`;
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
        <a href="post-${encodeURIComponent(post.slug)}.html" class="post-card-thumb-link">${thumbMarkup(post)}</a>
        <div class="post-card-body">
          <h2 class="post-card-title"><a href="post-${encodeURIComponent(post.slug)}.html">${post.title}</a></h2>
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
