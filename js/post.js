(function () {
  const titleEl = document.getElementById("post-title");
  const metaEl = document.getElementById("post-meta");
  const contentEl = document.getElementById("post-content");

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }

  function showError(message) {
    titleEl.textContent = "글을 찾을 수 없습니다";
    metaEl.textContent = "";
    contentEl.innerHTML = `<p class="error-state">${message}</p>`;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    showError("잘못된 주소입니다. 글 목록으로 돌아가 다시 시도해 주세요.");
    return;
  }

  fetch("posts/posts.json")
    .then((res) => res.json())
    .then((posts) => {
      const post = posts.find((p) => p.slug === slug);
      if (!post) {
        showError("해당 글을 찾을 수 없습니다.");
        return;
      }

      document.title = post.title;
      titleEl.textContent = post.title;
      metaEl.textContent = formatDate(post.date);

      return fetch(`posts/${post.slug}.md`)
        .then((res) => {
          if (!res.ok) throw new Error("마크다운 파일을 불러올 수 없습니다.");
          return res.text();
        })
        .then((markdown) => {
          // 본문 첫 줄이 # 제목이면 상단에 이미 표시된 제목과 중복되므로 제거
          const withoutLeadingTitle = markdown.replace(/^\s*#\s+.*\n+/, "");
          contentEl.innerHTML = markdownToHtml(withoutLeadingTitle);
        });
    })
    .catch((err) => {
      showError(`글을 불러오는 중 오류가 발생했습니다. 로컬 서버로 실행했는지 확인해 주세요. (${err.message})`);
    });
})();
