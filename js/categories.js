(function () {
  const listEl = document.getElementById("category-list");
  if (!listEl) return;

  const params = new URLSearchParams(window.location.search);
  const activeCategory = params.get("category");

  fetch("posts/posts.json")
    .then((res) => res.json())
    .then((posts) => {
      const counts = {};
      posts.forEach((p) => {
        const c = p.category || "기타";
        counts[c] = (counts[c] || 0) + 1;
      });
      const categories = Object.keys(counts).sort();

      const items = [
        `<li class="${!activeCategory ? "is-active" : ""}"><a href="index.html">전체보기 (${posts.length})</a></li>`,
        ...categories.map(
          (c) =>
            `<li class="${activeCategory === c ? "is-active" : ""}"><a href="index.html?category=${encodeURIComponent(c)}">${c} (${counts[c]})</a></li>`
        ),
      ];

      listEl.innerHTML = items.join("");
    })
    .catch(() => {
      listEl.innerHTML = "";
    });
})();
