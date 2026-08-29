/* Resoul 紀念品店 — Shopify Storefront API 前端
 * 只讀公開 token，安全放前端；結帳交由 Shopify 托管。
 * 產品／價格／庫存全部由 Shopify 後台管理，改咗即刻反映，唔使改呢個檔。
 */
(function () {
  "use strict";

  /* ===== 設定（公開只讀，安全）===== */
  var SHOP = {
    domain: "qs1nmv-b3.myshopify.com",
    token: "90f06d055534783ae5a7ad3f0f1e5004",
    version: "2026-01"
  };
  var ENDPOINT = "https://" + SHOP.domain + "/api/" + SHOP.version + "/graphql.json";
  var CART_KEY = "resoul-cart-id";

  /* ===== 小工具 ===== */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function money(amount, code) {
    var n = Number(amount);
    try {
      return new Intl.NumberFormat("zh-HK", {
        style: "currency", currency: code || "HKD",
        minimumFractionDigits: (n % 1 === 0 ? 0 : 2), maximumFractionDigits: 2
      }).format(n);
    } catch (e) {
      return (code || "HKD") + " " + n.toLocaleString();
    }
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ===== GraphQL ===== */
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

  /* ===== 產品查詢 ===== */
  var PRODUCTS_Q =
    "query($n:Int!){ products(first:$n, sortKey:CREATED_AT, reverse:true){ edges{ node{" +
    " id title description handle" +
    " featuredImage{ url altText }" +
    " images(first:6){ edges{ node{ url altText } } }" +
    " options{ name values }" +
    " priceRange{ minVariantPrice{ amount currencyCode } }" +
    " variants(first:100){ edges{ node{ id title availableForSale" +
    " price{ amount currencyCode } selectedOptions{ name value } image{ url altText } } } }" +
    " } } } }";

  /* ===== 購物車 mutations ===== */
  var CART_FIELDS =
    " id checkoutUrl totalQuantity" +
    " cost{ subtotalAmount{ amount currencyCode } }" +
    " lines(first:100){ edges{ node{ id quantity" +
    " merchandise{ ... on ProductVariant { id title image{ url altText }" +
    " price{ amount currencyCode } product{ title } selectedOptions{ name value } } } } } }";

  function cartCreate(merchandiseId, qty) {
    var q = "mutation($lines:[CartLineInput!]){ cartCreate(input:{lines:$lines}){ cart{" + CART_FIELDS + "} userErrors{ message } } }";
    return gql(q, { lines: [{ merchandiseId: merchandiseId, quantity: qty }] })
      .then(function (d) { return d.cartCreate.cart; });
  }
  function cartGet(id) {
    var q = "query($id:ID!){ cart(id:$id){" + CART_FIELDS + "} }";
    return gql(q, { id: id }).then(function (d) { return d.cart; });
  }
  function cartAdd(id, merchandiseId, qty) {
    var q = "mutation($id:ID!,$lines:[CartLineInput!]!){ cartLinesAdd(cartId:$id, lines:$lines){ cart{" + CART_FIELDS + "} userErrors{ message } } }";
    return gql(q, { id: id, lines: [{ merchandiseId: merchandiseId, quantity: qty }] })
      .then(function (d) { return d.cartLinesAdd.cart; });
  }
  function cartUpdate(id, lineId, qty) {
    var q = "mutation($id:ID!,$lines:[CartLineUpdateInput!]!){ cartLinesUpdate(cartId:$id, lines:$lines){ cart{" + CART_FIELDS + "} userErrors{ message } } }";
    return gql(q, { id: id, lines: [{ id: lineId, quantity: qty }] })
      .then(function (d) { return d.cartLinesUpdate.cart; });
  }
  function cartRemove(id, lineId) {
    var q = "mutation($id:ID!,$ids:[ID!]!){ cartLinesRemove(cartId:$id, lineIds:$ids){ cart{" + CART_FIELDS + "} userErrors{ message } } }";
    return gql(q, { id: id, ids: [lineId] }).then(function (d) { return d.cartLinesRemove.cart; });
  }

  /* ===== 狀態 ===== */
  var state = { products: [], cart: null, current: null, qty: 1, sel: {} };

  /* ===== 購物車：確保存在 ===== */
  function ensureCartThen(mid, qty) {
    var id = null;
    try { id = localStorage.getItem(CART_KEY); } catch (e) {}
    if (id) {
      return cartAdd(id, mid, qty).catch(function () {
        // 舊 cart 失效 → 重新建立
        return cartCreate(mid, qty).then(function (c) { saveCartId(c); return c; });
      });
    }
    return cartCreate(mid, qty).then(function (c) { saveCartId(c); return c; });
  }
  function saveCartId(cart) {
    try { if (cart && cart.id) localStorage.setItem(CART_KEY, cart.id); } catch (e) {}
  }

  /* ===== 渲染：產品列表 ===== */
  function renderGrid() {
    var grid = $("#shopGrid");
    var empty = $("#shopEmpty");
    grid.innerHTML = "";
    if (!state.products.length) { empty.style.display = "block"; return; }
    empty.style.display = "none";
    state.products.forEach(function (p) {
      var img = p.featuredImage ? p.featuredImage.url : "";
      var alt = p.featuredImage ? (p.featuredImage.altText || p.title) : p.title;
      var price = p.priceRange.minVariantPrice;
      var multi = p.variants.length > 1;
      var card = el("div", "pcard");
      card.innerHTML =
        (img ? '<img class="pcard-img" src="' + esc(img) + '" alt="' + esc(alt) + '" loading="lazy">'
             : '<div class="pcard-img pcard-noimg" aria-hidden="true">🕊️</div>') +
        '<div class="pcard-body">' +
        '<div class="pcard-name">' + esc(p.title) + "</div>" +
        '<div class="pcard-desc">' + esc((p.description || "").slice(0, 60)) + "</div>" +
        '<div class="pcard-foot"><div class="price">' + money(price.amount, price.currencyCode) +
        (multi ? ' <small>起</small>' : "") + "</div>" +
        '<button class="btn" type="button">查看</button></div></div>';
      card.addEventListener("click", function () { openDetail(p); });
      grid.appendChild(card);
    });
  }

  /* ===== 渲染：產品詳情 ===== */
  function variantMatch(p) {
    // 根據已揀選項搵對應 variant
    return p.variants.find(function (v) {
      return v.selectedOptions.every(function (o) { return state.sel[o.name] === o.value; });
    }) || p.variants[0];
  }
  function openDetail(p) {
    state.current = p; state.qty = 1; state.sel = {};
    p.options.forEach(function (o) { state.sel[o.name] = o.values[0]; });

    var v = variantMatch(p);
    var imgs = p.images.length ? p.images : (p.featuredImage ? [p.featuredImage] : []);
    var d = $("#shopDetail");
    var optsHtml = "";
    // 只有真正有選項（唔係預設單一 "Title/Default Title"）先顯示
    var realOpts = p.options.filter(function (o) {
      return !(o.values.length === 1 && (o.values[0] === "Default Title" || o.name === "Title"));
    });
    realOpts.forEach(function (o) {
      optsHtml += '<div class="opt-label">' + esc(o.name) + "</div><div class=\"opts\" data-opt=\"" + esc(o.name) + "\">";
      o.values.forEach(function (val) {
        optsHtml += '<button type="button" class="opt' + (state.sel[o.name] === val ? " sel" : "") +
          '" data-val="' + esc(val) + '">' + esc(val) + "</button>";
      });
      optsHtml += "</div>";
    });

    d.innerHTML =
      '<button class="detail-back" type="button" id="detailBack">← 返回所有紀念品</button>' +
      '<div class="pdp">' +
      '<div class="pdp-media">' +
      (imgs.length ? '<img id="pdpImg" src="' + esc(imgs[0].url) + '" alt="' + esc(imgs[0].altText || p.title) + '">'
                   : '<div class="pdp-noimg">🕊️</div>') +
      (imgs.length > 1 ? '<div class="pdp-thumbs">' + imgs.map(function (im) {
        return '<img src="' + esc(im.url) + '" alt="" data-src="' + esc(im.url) + '">';
      }).join("") + "</div>" : "") +
      "</div>" +
      '<div class="pdp-info">' +
      '<h1 class="pdp-name">' + esc(p.title) + "</h1>" +
      '<div class="pdp-price" id="pdpPrice">' + money(v.price.amount, v.price.currencyCode) + "</div>" +
      '<div class="pdp-avail" id="pdpAvail"></div>' +
      optsHtml +
      '<div class="opt-label">數量</div>' +
      '<div class="qty"><button type="button" data-q="-1">−</button><span id="pdpQ">1</span><button type="button" data-q="1">+</button></div>' +
      '<div class="pdp-cta"><button class="btn lg" type="button" id="addBtn">加入購物車</button>' +
      '<button class="btn lg ghost" type="button" id="buyBtn">立即結帳</button></div>' +
      (p.description ? '<div class="pdp-desc">' + esc(p.description) + "</div>" : "") +
      '<div class="trust">' +
      '<div><b>🕊️ 專人跟進</b>　由具善終經驗的團隊，全程溫柔處理</div>' +
      '<div><b>🔒 安全結帳</b>　付款由 Shopify 托管，資料受保護</div>' +
      "</div>" +
      "</div></div>";

    // 事件
    $("#detailBack").addEventListener("click", closeDetail);
    d.querySelectorAll(".pdp-thumbs img").forEach(function (t) {
      t.addEventListener("click", function () { $("#pdpImg").src = t.getAttribute("data-src"); });
    });
    d.querySelectorAll(".opts").forEach(function (g) {
      g.addEventListener("click", function (e) {
        var b = e.target.closest(".opt"); if (!b) return;
        var name = g.getAttribute("data-opt");
        state.sel[name] = b.getAttribute("data-val");
        g.querySelectorAll(".opt").forEach(function (o) { o.classList.toggle("sel", o === b); });
        refreshVariant();
      });
    });
    d.querySelectorAll(".qty button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.qty = Math.max(1, state.qty + parseInt(b.getAttribute("data-q"), 10));
        $("#pdpQ").textContent = state.qty;
      });
    });
    $("#addBtn").addEventListener("click", function () { addCurrent(false); });
    $("#buyBtn").addEventListener("click", function () { addCurrent(true); });

    refreshVariant();
    $("#shopList").style.display = "none";
    d.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function refreshVariant() {
    var p = state.current; if (!p) return;
    var v = variantMatch(p);
    $("#pdpPrice").textContent = money(v.price.amount, v.price.currencyCode);
    var av = $("#pdpAvail"), add = $("#addBtn"), buy = $("#buyBtn");
    if (v.image) $("#pdpImg").src = v.image.url;
    if (v.availableForSale) {
      av.textContent = ""; av.className = "pdp-avail";
      if (add) { add.disabled = false; buy.disabled = false; }
    } else {
      av.textContent = "此選項暫時缺貨"; av.className = "pdp-avail out";
      if (add) { add.disabled = true; buy.disabled = true; }
    }
  }
  function closeDetail() {
    $("#shopDetail").style.display = "none";
    $("#shopList").style.display = "block";
    state.current = null;
  }

  /* ===== 加入購物車 ===== */
  function addCurrent(checkout) {
    var p = state.current; if (!p) return;
    var v = variantMatch(p);
    if (!v || !v.availableForSale) { toast("此選項暫時缺貨"); return; }
    var btns = [$("#addBtn"), $("#buyBtn")];
    btns.forEach(function (b) { if (b) b.disabled = true; });
    ensureCartThen(v.id, state.qty).then(function (cart) {
      state.cart = cart; saveCartId(cart); renderCart();
      if (checkout) {
        if (cart.checkoutUrl) window.location.href = cart.checkoutUrl;
      } else {
        toast("已加入購物車"); openCart();
      }
    }).catch(function (err) {
      toast("加入失敗，請稍後再試");
      console.error("cart add error:", err);
    }).then(function () {
      btns.forEach(function (b) { if (b) b.disabled = false; });
    });
  }

  /* ===== 渲染：購物車 ===== */
  function renderCart() {
    var cart = state.cart;
    var n = cart ? cart.totalQuantity : 0;
    var cc = $("#cartCount");
    cc.textContent = n; cc.style.display = n ? "flex" : "none";
    var body = $("#cartBody");
    var lines = cart && cart.lines ? cart.lines.edges.map(function (e) { return e.node; }) : [];
    if (!lines.length) {
      body.innerHTML = '<div class="cart-empty">購物車暫時是空的。<br>慢慢看，不急。</div>';
      $("#cartSub").textContent = money(0, "HKD");
      return;
    }
    body.innerHTML = "";
    lines.forEach(function (ln) {
      var m = ln.merchandise;
      var opt = (m.selectedOptions || []).filter(function (o) {
        return o.value !== "Default Title";
      }).map(function (o) { return o.value; }).join(" · ");
      var img = m.image ? m.image.url : "";
      var line = el("div", "line");
      line.innerHTML =
        (img ? '<img src="' + esc(img) + '" alt="">' : '<div class="line-noimg">🕊️</div>') +
        '<div class="line-info">' +
        '<div class="line-name">' + esc(m.product.title) + "</div>" +
        (opt ? '<div class="line-opt">' + esc(opt) + "</div>" : "") +
        '<div class="line-row"><span class="line-qty">' +
        '<button type="button" data-a="-1">−</button><span>' + ln.quantity + "</span>" +
        '<button type="button" data-a="1">+</button></span>' +
        '<span class="line-price">' + money(m.price.amount * ln.quantity, m.price.currencyCode) + "</span></div>" +
        '<button class="line-rm" type="button">移除</button></div>';
      line.querySelectorAll(".line-qty button").forEach(function (b) {
        b.addEventListener("click", function () {
          var q = ln.quantity + parseInt(b.getAttribute("data-a"), 10);
          changeLine(ln.id, q);
        });
      });
      line.querySelector(".line-rm").addEventListener("click", function () { changeLine(ln.id, 0); });
      body.appendChild(line);
    });
    var sub = cart.cost.subtotalAmount;
    $("#cartSub").textContent = money(sub.amount, sub.currencyCode);
  }
  function changeLine(lineId, qty) {
    var id = state.cart.id;
    var p = qty <= 0 ? cartRemove(id, lineId) : cartUpdate(id, lineId, qty);
    p.then(function (cart) { state.cart = cart; renderCart(); })
     .catch(function (err) { console.error("cart update error:", err); });
  }

  /* ===== 抽屜／提示 ===== */
  function openCart() { $("#cart").classList.add("open"); $("#shopOverlay").classList.add("open"); document.body.classList.add("cart-open"); }
  function closeCart() { $("#cart").classList.remove("open"); $("#shopOverlay").classList.remove("open"); document.body.classList.remove("cart-open"); }
  var toastTimer;
  function toast(msg) {
    var t = $("#shopToast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1600);
  }

  /* ===== 結帳 ===== */
  function checkout() {
    if (state.cart && state.cart.checkoutUrl) {
      window.location.href = state.cart.checkoutUrl;
    } else {
      toast("購物車是空的");
    }
  }

  /* ===== 啟動 ===== */
  function init() {
    $("#cartBtn").addEventListener("click", openCart);
    $("#cartClose").addEventListener("click", closeCart);
    $("#shopOverlay").addEventListener("click", closeCart);
    $("#checkoutBtn").addEventListener("click", checkout);

    // 載入產品
    gql(PRODUCTS_Q, { n: 30 }).then(function (data) {
      state.products = data.products.edges.map(function (e) {
        var n = e.node;
        n.images = n.images.edges.map(function (x) { return x.node; });
        n.variants = n.variants.edges.map(function (x) { return x.node; });
        return n;
      });
      renderGrid();
      $("#shopLoading").style.display = "none";
    }).catch(function (err) {
      $("#shopLoading").style.display = "none";
      $("#shopError").style.display = "block";
      console.error("products load error:", err);
    });

    // 還原已存在的購物車
    var id = null;
    try { id = localStorage.getItem(CART_KEY); } catch (e) {}
    if (id) {
      cartGet(id).then(function (cart) {
        if (cart) { state.cart = cart; renderCart(); }
        else { try { localStorage.removeItem(CART_KEY); } catch (e) {} }
      }).catch(function () {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
