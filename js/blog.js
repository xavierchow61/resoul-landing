/* Resoul 照顧誌 — Shopify Blog（Storefront API）
 * 獸醫喺 Shopify 後台寫文章，呢度自動拉落嚟，唔使改 code。
 * 需要 Storefront app 權限：unauthenticated_read_content
 */
(function () {
  "use strict";

  var SHOP = {
    domain: "qs1nmv-b3.myshopify.com",
    token: "90f06d055534783ae5a7ad3f0f1e5004",
    version: "2026-01"
  };
  var ENDPOINT = "https://" + SHOP.domain + "/api/" + SHOP.version + "/graphql.json";

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtDate(iso) {
    if (!iso) return "";
    try {
      return new Intl.DateTimeFormat("zh-HK", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
    } catch (e) { return iso.slice(0, 10); }
  }

  function gql(query, variables) {
    return fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOP.token
      },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res.errors && res.errors.length) {
        throw new Error(res.errors.map(function (e) { return e.message; }).join("; "));
      }
      return res.data;
    });
  }

  var ARTICLES_Q =
    "query($n:Int!){ articles(first:$n, sortKey:PUBLISHED_AT, reverse:true){ edges{ node{" +
    " id handle title excerpt publishedAt contentHtml" +
    " image{ url altText } authorV2{ name } blog{ title handle }" +
    " } } } }";

  var state = { articles: [] };

  function renderList() {
    var grid = $("#blogGrid");
    var empty = $("#blogEmpty");
    grid.innerHTML = "";
    if (!state.articles.length) { empty.style.display = "block"; return; }
    empty.style.display = "none";
    state.articles.forEach(function (a) {
      var img = a.image ? a.image.url : "";
      var alt = a.image ? (a.image.altText || a.title) : a.title;
      var author = a.authorV2 ? a.authorV2.name : "";
      var meta = [author, fmtDate(a.publishedAt)].filter(Boolean).join("　·　");
      var card = document.createElement("article");
      card.className = "bcard";
      card.innerHTML =
        (img ? '<img class="bcard-img" src="' + esc(img) + '" alt="' + esc(alt) + '" loading="lazy">'
             : '<div class="bcard-img bcard-noimg" aria-hidden="true">🐾</div>') +
        '<div class="bcard-body">' +
        '<div class="bcard-title">' + esc(a.title) + "</div>" +
        (meta ? '<div class="bcard-meta">' + esc(meta) + "</div>" : "") +
        '<div class="bcard-excerpt">' + esc((a.excerpt || "").slice(0, 90)) + "</div>" +
        '<span class="bcard-more">閱讀全文 →</span>' +
        "</div>";
      card.addEventListener("click", function () { openArticle(a); });
      grid.appendChild(card);
    });
  }

  function openArticle(a) {
    var d = $("#blogArticle");
    var img = a.image ? a.image.url : "";
    var author = a.authorV2 ? a.authorV2.name : "";
    var meta = [author, fmtDate(a.publishedAt)].filter(Boolean).join("　·　");
    d.innerHTML =
      '<button class="detail-back" type="button" id="articleBack">← 返回所有文章</button>' +
      '<article class="article">' +
      '<h1 class="article-title">' + esc(a.title) + "</h1>" +
      (meta ? '<p class="article-meta">' + esc(meta) + "</p>" : "") +
      (img ? '<img class="article-cover" src="' + esc(img) + '" alt="' + esc(a.image.altText || a.title) + '">' : "") +
      '<div class="article-body">' + (a.contentHtml || "") + "</div>" +
      '<p class="article-note">本文僅供一般參考，個別情況請諮詢你的獸醫。</p>' +
      "</article>";
    $("#articleBack").addEventListener("click", closeArticle);
    $("#blogList").style.display = "none";
    d.style.display = "block";
    scrollToBlog();
  }
  function closeArticle() {
    $("#blogArticle").style.display = "none";
    $("#blogList").style.display = "block";
    scrollToBlog();
  }
  function scrollToBlog() {
    var target = document.querySelector(".blog-wrap");
    if (!target) return;
    var header = document.querySelector(".site-header");
    var offset = (header ? header.offsetHeight : 0) + 14;
    var y = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: y < 0 ? 0 : y, behavior: "smooth" });
  }

  function init() {
    gql(ARTICLES_Q, { n: 30 }).then(function (data) {
      state.articles = data.articles.edges.map(function (e) { return e.node; });
      renderList();
      $("#blogLoading").style.display = "none";
    }).catch(function (err) {
      $("#blogLoading").style.display = "none";
      $("#blogError").style.display = "block";
      console.error("articles load error:", err);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
