(function () {
  "use strict";

  var SIZE = 4;
  var BEST_KEY = "game2048-best";
  var THEME_KEY = "game2048-theme";
  var SWIPE_THRESHOLD = 25; // px

  // ---------------------------------------------------------------------
  // 상태
  // ---------------------------------------------------------------------
  var board = [];        // 4x4 2차원 배열, 0 = 빈 칸
  var score = 0;
  var bestScore = 0;
  var isGameOver = false;
  var isWon = false;
  var keepPlayingAfterWin = false;

  // ---------------------------------------------------------------------
  // DOM 참조
  // ---------------------------------------------------------------------
  var boardEl, gridCellsEl, tileContainerEl;
  var scoreValueEl, bestValueEl;
  var gameOverOverlayEl, winOverlayEl, finalScoreTextEl;
  var themeToggleEl;

  document.addEventListener("DOMContentLoaded", function () {
    boardEl = document.getElementById("board");
    gridCellsEl = document.getElementById("gridCells");
    tileContainerEl = document.getElementById("tileContainer");
    scoreValueEl = document.getElementById("scoreValue");
    bestValueEl = document.getElementById("bestValue");
    gameOverOverlayEl = document.getElementById("gameOverOverlay");
    winOverlayEl = document.getElementById("winOverlay");
    finalScoreTextEl = document.getElementById("finalScoreText");
    themeToggleEl = document.getElementById("themeToggle");

    createGridCells();
    setupTheme();
    setupControls();
    initGame();

    window.addEventListener("resize", debounce(function () {
      renderTiles([], null); // 리사이즈 시 타일 위치만 재계산
    }, 100));
  });

  // ---------------------------------------------------------------------
  // 초기화
  // ---------------------------------------------------------------------
  function initGame() {
    board = makeEmptyBoard();
    score = 0;
    isGameOver = false;
    isWon = false;
    keepPlayingAfterWin = false;
    bestScore = loadBestScore();

    hideOverlay(gameOverOverlayEl);
    hideOverlay(winOverlayEl);

    var first = addRandomTile();
    var second = addRandomTile();

    updateScoreboard(false);
    renderTiles([], second || first);
  }

  function makeEmptyBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      b.push([0, 0, 0, 0]);
    }
    return b;
  }

  function createGridCells() {
    gridCellsEl.innerHTML = "";
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var cell = document.createElement("div");
        cell.className = "grid-cell";
        gridCellsEl.appendChild(cell);
      }
    }
  }

  // ---------------------------------------------------------------------
  // 랜덤 타일 생성
  // ---------------------------------------------------------------------
  function addRandomTile() {
    var empty = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) empty.push({ row: r, col: c });
      }
    }
    if (empty.length === 0) return null;
    var pick = empty[Math.floor(Math.random() * empty.length)];
    board[pick.row][pick.col] = Math.random() < 0.9 ? 2 : 4;
    return pick;
  }

  // ---------------------------------------------------------------------
  // 이동/병합 핵심 로직
  // ---------------------------------------------------------------------

  // 길이 4의 1차원 배열(line)을 압축 + 병합한다. position 0 쪽이 압축 방향.
  function slideAndMergeLine(line) {
    var filtered = [];
    for (var i = 0; i < line.length; i++) {
      if (line[i] !== 0) filtered.push(line[i]);
    }

    var values = [];
    var merged = [];
    var gained = 0;
    var i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        var mergedValue = filtered[i] * 2;
        values.push(mergedValue);
        merged.push(true);
        gained += mergedValue;
        i += 2;
      } else {
        values.push(filtered[i]);
        merged.push(false);
        i += 1;
      }
    }
    while (values.length < SIZE) {
      values.push(0);
      merged.push(false);
    }
    return { values: values, merged: merged, gained: gained };
  }

  // 방향(direction)과 줄 번호(index)에 대해, 압축 방향이 index 0이 되도록
  // 보드 좌표(row, col) 목록을 반환한다.
  function getLineCoords(direction, index) {
    var coords = [];
    for (var k = 0; k < SIZE; k++) {
      if (direction === "left") coords.push([index, k]);
      else if (direction === "right") coords.push([index, SIZE - 1 - k]);
      else if (direction === "up") coords.push([k, index]);
      else if (direction === "down") coords.push([SIZE - 1 - k, index]);
    }
    return coords;
  }

  // 현재 board를 변경하지 않고, 지정한 방향으로 이동했을 때의 결과를 계산한다.
  function simulateMove(sourceBoard, direction) {
    var newBoard = sourceBoard.map(function (row) { return row.slice(); });
    var mergedCells = [];
    var totalGained = 0;
    var maxMergedValue = 0;

    for (var index = 0; index < SIZE; index++) {
      var coords = getLineCoords(direction, index);
      var line = coords.map(function (rc) { return sourceBoard[rc[0]][rc[1]]; });
      var result = slideAndMergeLine(line);
      totalGained += result.gained;

      for (var i = 0; i < coords.length; i++) {
        var r = coords[i][0];
        var c = coords[i][1];
        newBoard[r][c] = result.values[i];
        if (result.merged[i]) {
          mergedCells.push({ row: r, col: c, value: result.values[i] });
          if (result.values[i] > maxMergedValue) maxMergedValue = result.values[i];
        }
      }
    }

    var changed = !boardsEqual(sourceBoard, newBoard);
    return {
      board: newBoard,
      changed: changed,
      gained: totalGained,
      mergedCells: mergedCells,
      maxMergedValue: maxMergedValue
    };
  }

  function boardsEqual(a, b) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  function move(direction) {
    if (isGameOver) return;

    var result = simulateMove(board, direction);
    if (!result.changed) return;

    board = result.board;
    score += result.gained;

    var bestUpdated = false;
    if (score > bestScore) {
      bestScore = score;
      saveBestScore(bestScore);
      bestUpdated = true;
    }

    var newTile = addRandomTile();

    renderTiles(result.mergedCells, newTile);
    updateScoreboard(result.gained > 0, bestUpdated);

    if (!isWon && result.maxMergedValue >= 2048) {
      isWon = true;
      showOverlay(winOverlayEl);
    }

    if (checkGameOver()) {
      isGameOver = true;
      finalScoreTextEl.textContent = "최종 점수: " + score;
      showOverlay(gameOverOverlayEl);
    }
  }

  function checkGameOver() {
    var directions = ["left", "up", "right", "down"];
    for (var i = 0; i < directions.length; i++) {
      if (simulateMove(board, directions[i]).changed) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------
  // 렌더링
  // ---------------------------------------------------------------------
  function getCellMetrics() {
    var size = boardEl.clientWidth;
    var gapStr = getComputedStyle(boardEl).getPropertyValue("--board-gap");
    var gap = parseFloat(gapStr) || 12;
    var inner = size - gap * 2;
    var cell = (inner - gap * (SIZE - 1)) / SIZE;
    return { cell: cell, gap: gap, padding: gap };
  }

  function renderTiles(mergedCells, newTile) {
    mergedCells = mergedCells || [];
    tileContainerEl.innerHTML = "";
    var metrics = getCellMetrics();

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var value = board[r][c];
        if (!value) continue;

        var tile = document.createElement("div");
        tile.className = "tile tile-" + value;
        if (value > 2048) tile.classList.add("tile-super");

        var digits = String(value).length;
        if (digits >= 4) tile.classList.add("tile-4digit");
        else if (digits === 3) tile.classList.add("tile-3digit");

        var isNewTile = !!(newTile && newTile.row === r && newTile.col === c);
        var isMergedTile = mergedCells.some(function (m) { return m.row === r && m.col === c; });

        if (isNewTile) tile.classList.add("tile-new");
        if (isMergedTile) tile.classList.add("tile-merged");

        var x = metrics.padding + c * (metrics.cell + metrics.gap);
        var y = metrics.padding + r * (metrics.cell + metrics.gap);
        tile.style.width = metrics.cell + "px";
        tile.style.height = metrics.cell + "px";
        tile.style.transform = "translate(" + x + "px, " + y + "px)";

        var face = document.createElement("div");
        face.className = "tile-face";
        face.textContent = String(value);
        tile.appendChild(face);

        tileContainerEl.appendChild(tile);
      }
    }
  }

  function updateScoreboard(scoreChanged, bestUpdated) {
    scoreValueEl.textContent = String(score);
    bestValueEl.textContent = String(bestScore);

    if (scoreChanged) {
      triggerPop(scoreValueEl);
    }
    if (bestUpdated) {
      triggerPop(bestValueEl);
    }
  }

  function triggerPop(el) {
    el.classList.remove("score-pop");
    // reflow를 강제해 애니메이션을 재시작
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.classList.add("score-pop");
  }

  function showOverlay(el) {
    el.hidden = false;
  }

  function hideOverlay(el) {
    el.hidden = true;
  }

  // ---------------------------------------------------------------------
  // localStorage
  // ---------------------------------------------------------------------
  function loadBestScore() {
    try {
      var stored = localStorage.getItem(BEST_KEY);
      var parsed = parseInt(stored, 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch (e) {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch (e) {
      /* localStorage 사용 불가 시 무시 (세션 내에서만 유지) */
    }
  }

  // ---------------------------------------------------------------------
  // 다크모드 토글 (블로그 js/theme.js와 독립적으로 재구현)
  // ---------------------------------------------------------------------
  function setupTheme() {
    var root = document.documentElement;

    function getStoredTheme() {
      try {
        return localStorage.getItem(THEME_KEY);
      } catch (e) {
        return null;
      }
    }

    function getPreferredTheme() {
      var stored = getStoredTheme();
      if (stored === "light" || stored === "dark") return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function applyTheme(theme) {
      root.setAttribute("data-theme", theme);
      if (themeToggleEl) {
        themeToggleEl.textContent = theme === "dark" ? "☀️" : "🌙";
        themeToggleEl.setAttribute("aria-label", theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
      }
    }

    function setTheme(theme) {
      applyTheme(theme);
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (e) {
        /* 무시 */
      }
    }

    applyTheme(getPreferredTheme());

    if (themeToggleEl) {
      themeToggleEl.addEventListener("click", function () {
        var current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
        setTheme(current === "dark" ? "light" : "dark");
      });
    }
  }

  // ---------------------------------------------------------------------
  // 입력 처리 (키보드 / 터치 / 버튼)
  // ---------------------------------------------------------------------
  function setupControls() {
    document.addEventListener("keydown", function (e) {
      var dir = null;
      if (e.key === "ArrowLeft") dir = "left";
      else if (e.key === "ArrowUp") dir = "up";
      else if (e.key === "ArrowRight") dir = "right";
      else if (e.key === "ArrowDown") dir = "down";

      if (dir) {
        e.preventDefault();
        move(dir);
      }
    });

    var newGameBtn = document.getElementById("newGameBtn");
    var restartBtn = document.getElementById("restartBtn");
    var keepPlayingBtn = document.getElementById("keepPlayingBtn");
    var winNewGameBtn = document.getElementById("winNewGameBtn");

    if (newGameBtn) newGameBtn.addEventListener("click", initGame);
    if (restartBtn) restartBtn.addEventListener("click", initGame);
    if (winNewGameBtn) winNewGameBtn.addEventListener("click", initGame);

    if (keepPlayingBtn) {
      keepPlayingBtn.addEventListener("click", function () {
        keepPlayingAfterWin = true;
        hideOverlay(winOverlayEl);
      });
    }

    setupSwipe();
  }

  function setupSwipe() {
    var startX = 0;
    var startY = 0;
    var tracking = false;

    boardEl.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    boardEl.addEventListener("touchmove", function (e) {
      if (!tracking) return;
      e.preventDefault(); // 보드 영역 내 스크롤/바운스 방지
    }, { passive: false });

    boardEl.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;

      var touch = e.changedTouches[0];
      var deltaX = touch.clientX - startX;
      var deltaY = touch.clientY - startY;

      var absX = Math.abs(deltaX);
      var absY = Math.abs(deltaY);

      if (Math.max(absX, absY) < SWIPE_THRESHOLD) return;

      var dir;
      if (absX > absY) {
        dir = deltaX > 0 ? "right" : "left";
      } else {
        dir = deltaY > 0 ? "down" : "up";
      }
      move(dir);
    }, { passive: true });
  }

  // ---------------------------------------------------------------------
  // 유틸
  // ---------------------------------------------------------------------
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }
})();
