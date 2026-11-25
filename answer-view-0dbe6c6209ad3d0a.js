/* Format a complete model response using text nodes, never interpreted HTML. */
(() => {
  function inline(parent, text) {
    const marks = /(\*\*[^*\n]+?\*\*|\x60[^\x60\n]+\x60)/g;
    let end = 0;
    for (const hit of text.matchAll(marks)) {
      parent.append(document.createTextNode(text.slice(end, hit.index)));
      const strong = hit[0].startsWith("**");
      const tag = document.createElement(strong ? "strong" : "code");
      tag.textContent = hit[0].slice(strong ? 2 : 1, strong ? -2 : -1);
      parent.append(tag);
      end = hit.index + hit[0].length;
    }
    parent.append(document.createTextNode(text.slice(end)));
  }

  const cells = line => line.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  const separator = line => line.includes("|") && cells(line).every(c => /^:?-{3,}:?$/.test(c));
  const bullet = /^\s*([-*+]|\d{1,3}[.)])\s+(.+)$/;
  const heading = /^#{1,6}\s+(.+)$/;

  function renderCompletedAnswer(element) {
    const original = element.textContent;
    if (!original.trim()) return;
    const lines = original.replace(/\r\n?/g, "\n").split("\n");
    const output = document.createDocumentFragment();
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (/^\s*\x60{3}/.test(line)) {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        const content = [];
        for (i++; i < lines.length && !/^\s*\x60{3}\s*$/.test(lines[i]); i++) content.push(lines[i]);
        code.textContent = content.join("\n"); pre.append(code); output.append(pre);
        if (i < lines.length) i++;
        continue;
      }
      if (i + 1 < lines.length && line.includes("|") && separator(lines[i + 1]) && cells(line).length === cells(lines[i + 1]).length) {
        const box = document.createElement("div"); box.className = "scroll";
        const table = document.createElement("table");
        const head = table.createTHead().insertRow();
        const titles = cells(line);
        for (const title of titles) {
          const th = document.createElement("th"); th.scope = "col"; inline(th, title); head.append(th);
        }
        const body = table.createTBody(); i += 2;
        while (i < lines.length && lines[i].includes("|") && cells(lines[i]).length === titles.length) {
          const row = body.insertRow();
          for (const value of cells(lines[i++])) inline(row.insertCell(), value);
        }
        box.append(table); output.append(box); continue;
      }
      const title = line.match(heading);
      if (title) {
        const h = document.createElement("h4"); inline(h, title[1]); output.append(h); i++; continue;
      }
      const first = line.match(bullet);
      if (first) {
        const ordered = /^\d/.test(first[1]);
        const list = document.createElement(ordered ? "ol" : "ul");
        if (ordered) list.start = parseInt(first[1], 10);
        while (i < lines.length) {
          const item = lines[i].match(bullet);
          if (!item || /^\d/.test(item[1]) !== ordered) break;
          const li = document.createElement("li");
          if (ordered) li.value = parseInt(item[1], 10);
          inline(li, item[2]); list.append(li); i++;
        }
        output.append(list); continue;
      }
      const para = document.createElement("p");
      // Keep ordinary short prose intact. Break long unformatted lines only at sentence boundaries.
      if (line.length > 220 && !line.includes("|") && typeof Intl.Segmenter === "function") {
        const segmenter = new Intl.Segmenter("ko",{granularity:"sentence"});
        let paragraph = "";
        for (const {segment} of segmenter.segment(line)) {
          paragraph += segment;
          if (paragraph.length >= 150) {
            const block = document.createElement("p"); inline(block,paragraph); output.append(block); paragraph="";
          }
        }
        if (paragraph) { inline(para,paragraph); output.append(para); }
        i++; continue;
      }
      do {
        if (para.childNodes.length) para.append(document.createElement("br"));
        inline(para, lines[i++]);
      } while (i < lines.length && lines[i].trim() && !heading.test(lines[i]) && !bullet.test(lines[i])
               && !/^\s*\x60{3}/.test(lines[i]) && !(i+1 < lines.length && separator(lines[i+1])));
      output.append(para);
    }
    element.replaceChildren(output);
    element.classList.add("formatted");
  }

  function chatDeadline() {
    const controller = new AbortController();
    let reason = "";
    const expire = message => { reason = message; controller.abort(); };
    const first = setTimeout(() => expire("24초 안에 답변이 도착하지 않아 연결을 종료했습니다."), 24000);
    const total = setTimeout(() => expire("40초가 지나 응답 연결을 종료했습니다."), 40000);
    return {
      signal:controller.signal,
      get message() { return reason; },
      bodyStarted() { clearTimeout(first); },
      close() { clearTimeout(first); clearTimeout(total); controller.abort(); }
    };
  }

  window.renderCompletedAnswer = renderCompletedAnswer;
  window.chatDeadline = chatDeadline;
})();
