/* ================= BASE ================= */
const root = document.documentElement;

const htmlCode = document.getElementById("html");
const cssCode = document.getElementById("css");
const jsCode = document.getElementById("js");
const output = document.getElementById("output");

const consoleOutput = document.getElementById("consoleOutput");
const clearBtn = document.getElementById("clearConsole");
const toggleConsoleBtn = document.getElementById("toggleConsole");

const editorsRow = document.querySelector(".editors-row");
const rowResizer = document.querySelector(".row-resizer");
const consoleResizer = document.querySelector(".console-resizer");

/* ================= PREVIEW + CONSOLE ================= */
function updatePreview() {
  consoleOutput.innerHTML = "";

  const interceptor = `
    <script>
      (function () {
        function send(type, args) {
          parent.postMessage({
            source: "codepen-clone",
            type,
            message: args.map(a => {
              try { return JSON.stringify(a); }
              catch { return String(a); }
            }).join(" ")
          }, "*");
        }

        ["log","warn","error"].forEach(type => {
          const orig = console[type];
          console[type] = (...args) => {
            send(type, args);
            orig.apply(console, args);
          };
        });

        window.onerror = (m,u,l,c) =>
          send("error",[m+" ("+l+":"+c+")"]);
      })();
    <\/script>
  `;

  output.srcdoc = `
    <!DOCTYPE html>
    <html>
      <head><style>${cssCode.value}</style></head>
      <body>
        ${htmlCode.value}
        ${interceptor}
        <script>${jsCode.value}<\/script>
      </body>
    </html>
  `;

  localStorage.setItem("codepen-clone", JSON.stringify({
    html: htmlCode.value,
    css: cssCode.value,
    js: jsCode.value
  }));
}

/* ================= SAVE / RESTORE ================= */
function saveLayout() {
  const s = getComputedStyle(root);
  localStorage.setItem("layout", JSON.stringify({
    "--html-w": s.getPropertyValue("--html-w"),
    "--css-w": s.getPropertyValue("--css-w"),
    "--js-w": s.getPropertyValue("--js-w"),
    "--editors-h": s.getPropertyValue("--editors-h"),
    "--console-h": s.getPropertyValue("--console-h"),
    "--console-open": s.getPropertyValue("--console-open")
  }));
}

window.addEventListener("load", () => {
  const code = JSON.parse(localStorage.getItem("codepen-clone"));
  if (code) {
    htmlCode.value = code.html || "";
    cssCode.value = code.css || "";
    jsCode.value = code.js || "";
  }

  const layout = JSON.parse(localStorage.getItem("layout"));
  if (layout) {
    Object.entries(layout).forEach(([k, v]) =>
      root.style.setProperty(k, v)
    );
  }

  updatePreview();
});

[htmlCode, cssCode, jsCode].forEach(el =>
  el.addEventListener("input", updatePreview)
);

/* ================= RESIZE STATE ================= */
let colActive = null;
let colStartX = 0;
let colStartA = 0;
let colStartB = 0;

let rowActive = false;
let rowStartY = 0;
let rowStartH = 0;
let viewportH = 0;

let consoleActive = false;
let consoleStartY = 0;
let consoleStartH = 0;

/* ================= COLUMN RESIZE ================= */
document.querySelectorAll(".col-resizer").forEach((resizer, i) => {
  resizer.addEventListener("mousedown", e => {
    colActive = i;
    colStartX = e.clientX;

    colStartA = parseFloat(getComputedStyle(root)
      .getPropertyValue(i === 0 ? "--html-w" : "--css-w"));

    colStartB = parseFloat(getComputedStyle(root)
      .getPropertyValue(i === 0 ? "--css-w" : "--js-w"));

    document.body.classList.add("col-resizing");
  });
});

/* ================= ROW RESIZE ================= */
rowResizer.addEventListener("mousedown", e => {
  rowActive = true;
  rowStartY = e.clientY;
  viewportH = window.innerHeight;
  rowStartH = parseFloat(
    getComputedStyle(root).getPropertyValue("--editors-h")
  );
  document.body.classList.add("row-resizing");
});

/* ================= CONSOLE RESIZE ================= */
consoleResizer.addEventListener("mousedown", e => {
  consoleActive = true;
  consoleStartY = e.clientY;
  consoleStartH = parseFloat(
    getComputedStyle(root).getPropertyValue("--console-h")
  );
  document.body.classList.add("row-resizing");
});

/* ================= MOUSE MOVE ================= */
document.addEventListener("mousemove", e => {
  /* column resize */
  if (colActive !== null) {
    const delta =
      ((e.clientX - colStartX) / editorsRow.offsetWidth) * 100;

    const min = 2;
    const a = colStartA + delta;
    const b = colStartB - delta;

    if (a > min && b > min) {
      if (colActive === 0) {
        root.style.setProperty("--html-w", a + "%");
        root.style.setProperty("--css-w", b + "%");
      } else {
        root.style.setProperty("--css-w", a + "%");
        root.style.setProperty("--js-w", b + "%");
      }
    }
  }

  /* row resize */
  if (rowActive) {
    const delta = ((e.clientY - rowStartY) / viewportH) * 100;
    const nh = rowStartH + delta;
    if (nh > 10 && nh < 80) {
      root.style.setProperty("--editors-h", nh + "%");
    }
  }

  /* console resize */
  if (consoleActive) {
    const nh = consoleStartH + (consoleStartY - e.clientY);
    if (nh > 30) {
      root.style.setProperty("--console-h", nh + "px");
    }
  }
});

/* ================= MOUSE UP ================= */
document.addEventListener("mouseup", () => {
  if (colActive !== null || rowActive || consoleActive) {
    saveLayout();
  }

  colActive = null;
  rowActive = false;
  consoleActive = false;

  document.body.classList.remove("col-resizing", "row-resizing");
});

/* ================= CONSOLE ================= */
toggleConsoleBtn.addEventListener("click", () => {
  const open = getComputedStyle(root)
    .getPropertyValue("--console-open").trim();

  root.style.setProperty("--console-open", open === "1" ? "0" : "1");
  saveLayout();
});

window.addEventListener("message", e => {
  if (e.data?.source !== "codepen-clone") return;

  const line = document.createElement("div");
  line.className = "console-" + e.data.type;
  line.textContent = e.data.message;

  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
});

clearBtn.addEventListener("click", () => {
  consoleOutput.innerHTML = "";
});
