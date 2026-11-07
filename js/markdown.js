/**
 * 아주 가벼운 마크다운 → HTML 변환기.
 * 지원 문법: # 제목, 문단, **굵게**, *기울임*, `인라인 코드`,
 * ```코드블록```, > 인용, -/* 목록, [텍스트](url), --- 구분선
 */
function markdownToHtml(markdown) {
  const escapeHtml = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

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
  let listBuffer = null; // { type: 'ul' | 'ol', items: [] }

  const flushList = () => {
    if (!listBuffer) return;
    const tag = listBuffer.type;
    html.push(`<${tag}>`);
    for (const item of listBuffer.items) {
      html.push(`<li>${applyInline(item)}</li>`);
    }
    html.push(`</${tag}>`);
    listBuffer = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // 코드 블록
    if (/^```/.test(line.trim())) {
      flushList();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 닫는 ``` 건너뛰기
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    // 원본 HTML 블록 (<로 시작하는 줄부터 다음 빈 줄까지 그대로 삽입)
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

    // 제목
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${applyInline(headingMatch[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // 수평선
    if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) {
      flushList();
      html.push("<hr>");
      i++;
      continue;
    }

    // 인용
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

    // 목록 (비순서/순서)
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

    // 빈 줄
    if (line.trim() === "") {
      flushList();
      i++;
      continue;
    }

    // 일반 문단 (다음 빈 줄/블록 전까지 이어붙이기)
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
