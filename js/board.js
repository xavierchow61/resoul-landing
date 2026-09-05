/* 同路人留言板 — Supabase（可貼相、預先審核、危機偵測）
 * 資料表/權限/Storage 見 supabase/schema.sql；publishable key 為公開用途。
 */
(function () {
  "use strict";
  var EN = (document.documentElement.lang || "").slice(0, 2).toLowerCase() === "en";
  function L(zh, en) { return EN ? en : zh; }
  var SB_URL = "https://tkgxdzvsnmereaygddaz.supabase.co";
  var SB_KEY = "sb_publishable_bRZVm-air0obDK7QuRYaMw_b-mnVMA6";

  var list = document.getElementById("boardList");
  if (!list) return;
  var H = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function crisis(t) {
    return /想死|唔想活|自殺|傷害自己|撐唔住|頂唔住|想跟(佢|牠|你)去|活唔落去|結束生命|唔想生存|冇晒意思/.test(t);
  }
  function timeAgo(iso) {
    var h = Math.floor((Date.now() - new Date(iso)) / 3600000);
    if (h < 1) return L("剛剛", "just now");
    if (h < 24) return EN ? (h + (h === 1 ? " hour ago" : " hours ago")) : (h + " 小時前");
    var dd = Math.floor(h / 24);
    return EN ? (dd + (dd === 1 ? " day ago" : " days ago")) : (dd + " 天前");
  }
  function pubUrl(path) { return SB_URL + "/storage/v1/object/public/board-images/" + path; }

  var statusEl = document.getElementById("boardStatus");
  function setStatus(msg, ok) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = ok ? "var(--gold-deep)" : "var(--ink-faint)";
  }

  /* 讀取已顯示留言 */
  function load() {
    fetch(SB_URL + "/rest/v1/posts?select=id,name,body,image_path,created_at&status=eq.visible&context=eq.board&order=created_at.desc&limit=100", { headers: H })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) return;
        list.innerHTML = "";
        if (!rows.length) {
          list.innerHTML = '<div class="board-note" style="text-align:center;padding:20px 0;">' + L("還沒有留言。願意的話，成為第一個留下想念的人。", "No messages yet. If you'd like, be the first to leave a note of remembrance.") + "</div>";
          return;
        }
        rows.forEach(function (p) {
          var el = document.createElement("div");
          el.className = "bpost";
          el.innerHTML =
            (p.image_path ? '<img src="' + esc(pubUrl(p.image_path)) + '" alt="' + L("留言相片", "Message photo") + '" loading="lazy">' : "") +
            '<div class="bp-name">' + (p.name ? esc(p.name) : L("一位同路人", "A fellow traveller")) + "</div>" +
            '<div class="bp-msg">' + esc(p.body).replace(/\n/g, "<br>") + "</div>" +
            '<div class="bp-time">' + timeAgo(p.created_at) + "</div>";
          list.appendChild(el);
        });
      })
      .catch(function () { /* 靜默 */ });
  }

  /* 圖片：選擇後壓縮預覽 */
  var photoBlob = null;
  var photoInput = document.getElementById("boardPhoto");
  if (photoInput) {
    photoInput.addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var img = new Image();
      img.onload = function () {
        var mx = 1200, sc = Math.min(1, mx / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) {
          photoBlob = b;
          var pv = document.getElementById("boardPreview");
          if (pv) { pv.src = URL.createObjectURL(b); pv.style.display = "block"; }
        }, "image/jpeg", 0.82);
      };
      img.src = URL.createObjectURL(f);
    });
  }

  function uploadPhoto() {
    if (!photoBlob) return Promise.resolve(null);
    var name = "board/" + Date.now() + "-" + Math.random().toString(36).slice(2) + ".jpg";
    return fetch(SB_URL + "/storage/v1/object/board-images/" + name, {
      method: "POST",
      headers: Object.assign({}, H, { "Content-Type": "image/jpeg", "x-upsert": "false" }),
      body: photoBlob
    }).then(function (r) { if (!r.ok) throw new Error("upload"); return name; });
  }

  /* 提交 */
  var postBtn = document.getElementById("boardPost");
  if (postBtn) {
    postBtn.addEventListener("click", function () {
      var msg = (document.getElementById("boardMsg").value || "").trim();
      var nm = (document.getElementById("boardName").value || "").trim();
      if (!msg && !photoBlob) { setStatus(L("寫一句想念，或加一張相片吧。", "Write a note of remembrance, or add a photo.")); return; }
      if (crisis(msg)) { var sb = document.getElementById("supportBtn"); if (sb) sb.click(); }

      postBtn.disabled = true;
      setStatus(L("正在送出…", "Sending…"));
      uploadPhoto().then(function (path) {
        return fetch(SB_URL + "/rest/v1/posts", {
          method: "POST",
          headers: Object.assign({}, H, { "Content-Type": "application/json", "Prefer": "return=minimal" }),
          body: JSON.stringify({
            context: "board",
            name: nm || null,
            body: msg || L("（分享了一張相片）", "(shared a photo)"),
            image_path: path
          })
        });
      }).then(function (r) {
        if (!r.ok) throw new Error("insert");
        document.getElementById("boardMsg").value = "";
        document.getElementById("boardName").value = "";
        photoBlob = null;
        var pv = document.getElementById("boardPreview");
        if (pv) { pv.style.display = "none"; pv.src = ""; }
        setStatus(L("多謝你的留言 🤍 經審核後就會顯示。", "Thank you for your message 🤍 It will appear after review."), true);
      }).catch(function () {
        setStatus(L("送出失敗，請稍後再試。", "Failed to send, please try again later."));
      }).then(function () { postBtn.disabled = false; });
    });
  }

  load();
})();
