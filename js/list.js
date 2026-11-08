(function () {
  const listEl = document.getElementById("post-list");
  const countEl = document.getElementById("content-count");

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }

  function thumbMarkup(post) {
    if (post.thumbnail) {
      return `<img class="post-card-thumb" src="${post.thumbnail}" alt="">`;
    }
    return `<span class="post-card-thumb post-card-thumb-placeholder" aria-hidden="true">${(post.category || post.title || "다정").charAt(0)}</span>`;
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
