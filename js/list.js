(function () {
  const listEl = document.getElementById("post-list");

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }

  function renderPosts(posts) {
    if (!posts.length) {
      listEl.innerHTML = '<p class="empty-state">아직 작성된 글이 없습니다.</p>';
      return;
    }

    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));

    listEl.innerHTML = sorted
      .map(
        (post) => `
      <li class="post-card">
        <h2 class="post-card-title"><a href="post.html?slug=${encodeURIComponent(post.slug)}">${post.title}</a></h2>
        <p class="post-card-meta">${formatDate(post.date)}</p>
        <p class="post-card-summary">${post.summary || ""}</p>
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
