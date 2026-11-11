# 블로그

마크다운으로 글을 쓰고, 프레임워크 없이 순수 HTML/CSS/JavaScript로 보여주는 정적 블로그입니다.

## 로컬에서 실행하기

`fetch`로 마크다운 파일을 읽어오기 때문에 `index.html`을 더블클릭해서 바로 열면(`file://`) 동작하지 않습니다. 반드시 로컬 서버로 실행해 주세요.

```bash
python -m http.server 8000
```

실행 후 브라우저에서 `http://localhost:8000` 접속.

## 새 글 추가하는 방법

1. `posts/` 폴더에 마크다운 파일을 추가합니다. 예: `posts/my-new-post.md`
2. `posts/posts.json`에 아래 형식으로 한 줄 추가합니다.

```json
{
  "slug": "my-new-post",
  "title": "글 제목",
  "date": "2026-12-01",
  "category": "센터소식",
  "summary": "목록에 보여질 한 줄 요약",
  "thumbnail": "posts/images/my-photo.jpg"
}
```

- `category`는 사이드바 카테고리 목록에 자동으로 집계됩니다. 기존 카테고리(센터소개/정책정보/운영준비)를 그대로 쓰거나 새 이름을 적으면 새 카테고리가 생깁니다.
- `thumbnail`은 선택 항목입니다. 넣으면 목록 카드에 사진이 보이고, 생략하면 카테고리 첫 글자가 들어간 플레이스홀더가 보입니다.
- `slug`는 파일명(확장자 제외)과 반드시 같아야 합니다.
- 최신 글이 자동으로 위에 정렬됩니다 (날짜 기준).

3. 터미널에서 `node build.js`를 실행합니다. (의존성 없음, Node만 있으면 됩니다)
   - `index.html`의 글 목록, 글마다의 정적 페이지(`post-<slug>.html`), `sitemap.xml`이 전부 새로 생성됩니다.
   - 검색엔진(특히 네이버)은 자바스크립트를 실행하지 않고도 글 목록·본문을 읽을 수 있어야 색인이 되므로, 이 빌드 단계를 거쳐 내용이 HTML에 미리 박혀 있는 상태로 커밋·배포해야 합니다.
   - 바뀐 파일(`index.html`, `post-<slug>.html`, `sitemap.xml`)을 그대로 커밋하면 끝입니다.

## 구조

```
index.html        글 목록 페이지 (build.js가 생성 — 직접 수정하지 말 것)
post-<slug>.html   글 상세 페이지 (build.js가 글마다 생성 — 직접 수정하지 말 것)
build.js           posts.json + posts/*.md → index.html / post-<slug>.html / sitemap.xml 생성 스크립트
post.html          (레거시) ?slug= 쿼리로 글을 보여주던 구버전 방식. 더 이상 새로 만들지 않지만 기존 링크 호환을 위해 남겨둠
css/style.css     스타일 (배너/사이드바/그리드, 다크 모드, 반응형 포함)
js/markdown.js    마크다운 → HTML 변환기 (브라우저용 · build.js 안에도 동일한 로직이 내장되어 있음)
js/theme.js       다크 모드 토글
js/categories.js  사이드바 카테고리 목록 렌더링
js/list.js        index.html의 카테고리 필터(?category=) 클릭 시 목록을 다시 그려주는 용도. 최초 로딩 시 보이는 글 목록 자체는 build.js가 HTML에 미리 넣어둔 것
js/post.js        레거시 post.html 전용 로직
posts/            마크다운 글 + posts.json 인덱스
```
