"use strict";
const studentSite = JSON.parse(document.getElementById("student-site").textContent);

function studentApi(path, options = {}) {
  if (!["/api/chat", "/api/audit", "/api/health", "/source.pdf", "/university-source.pdf"].includes(path)) {
    throw new Error("지원하지 않는 요청입니다.");
  }
  const headers = new Headers(options.headers);
  headers.set("ngrok-skip-browser-warning", "student-client");
  return fetch(new URL(path, studentSite.api), {
    ...options, headers, credentials: "omit", referrerPolicy: "no-referrer"
  });
}

function studentSource(documentId, page) {
  const full = documentId === "university-2026";
  const physical = Number(full ? page : studentSite.excerpt[page]);
  if (studentSite.document && Number.isSafeInteger(physical) && physical > 0) {
    return studentSite.document + "#page=" + physical;
  }
  const target = new URL("./source.html", document.baseURI);
  target.searchParams.set("document", full ? "full" : "excerpt");
  target.hash = "page=" + (Number.isSafeInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1);
  return target.href;
}
