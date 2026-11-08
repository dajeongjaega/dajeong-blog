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
  "summary": "목록에 보여질 한 줄 요약",
  "thumbnail": "posts/images/my-photo.jpg"
}
```

- `thumbnail`은 선택 항목입니다. 넣으면 목록에서 글 위에 사진이 보이고, 생략하면 기존처럼 텍스트만 보입니다.

- `slug`는 파일명(확장자 제외)과 반드시 같아야 합니다.
- 최신 글이 자동으로 위에 정렬됩니다 (날짜 기준).
3. (검색 노출을 위해) `sitemap.xml`에도 같은 `slug`로 `<url>` 항목을 한 줄 추가합니다.

## 구조

```
index.html     글 목록 페이지
post.html      글 상세 페이지
css/style.css  스타일 (다크 모드, 반응형 포함)
js/markdown.js 마크다운 → HTML 변환기
js/theme.js    다크 모드 토글
js/list.js     목록 페이지 로직
js/post.js     상세 페이지 로직
posts/         마크다운 글 + posts.json 인덱스
```
