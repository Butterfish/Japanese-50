/**
 * 五十音图：学习模式（点击播放音频）+ 听写模式（整张表音频、提交后表格揭晓上色）
 * 音节音频：`Audio/` 下与 `.romaji` 同名的 mp3（小写 Hepburn），如 a.mp3、shi.mp3、wo.mp3。
 */
(function () {
  "use strict";

  var PRESS_MS = 140;
  var DEFAULT_VOLUME = 1;

  /** 与 index.html 同级的目录；文件名 = 格子内罗马音小写 + .mp3 */
  var AUDIO_DIR = "Audio/";

  var audioPlayer = new Audio();
  audioPlayer.preload = "auto";

  function stopSyllableAudio() {
    audioPlayer.pause();
    try {
      audioPlayer.currentTime = 0;
    } catch (e) {}
  }

  /**
   * 根据单元格内 `.romaji` 播放 `Audio/<slug>.mp3`（平/片假名共用一条音轨）
   * @param {HTMLElement} cell
   */
  function playSyllableFromCell(cell) {
    if (!cell) return;
    var r = cell.querySelector(".romaji");
    var slug = r && r.textContent ? r.textContent.trim().toLowerCase() : "";
    if (!slug) return;
    stopSyllableAudio();
    audioPlayer.volume = DEFAULT_VOLUME;
    audioPlayer.src = AUDIO_DIR + encodeURIComponent(slug) + ".mp3";
    var p = audioPlayer.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {});
    }
  }

  function flashPress(cell) {
    cell.classList.add("is-press");
    window.setTimeout(function () {
      cell.classList.remove("is-press");
    }, PRESS_MS);
  }

  function getLearnCells() {
    return Array.prototype.slice.call(
      document.querySelectorAll(".gojuon .cell:not(.cell--empty)")
    );
  }

  function normalizeAnswer(s) {
    if (!s) return "";
    try {
      return s.normalize("NFC").trim();
    } catch (e) {
      return String(s).trim();
    }
  }

  function shuffle(arr) {
    var a = arr.slice();
    var i = a.length;
    var j;
    var t;
    while (i > 1) {
      j = Math.floor(Math.random() * i);
      i -= 1;
      t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function getHiragana(cell) {
    if (!cell) return "";
    var el = cell.querySelector(".hiragana");
    return el && el.textContent ? el.textContent.trim() : "";
  }

  function getKatakana(cell) {
    if (!cell) return "";
    var el = cell.querySelector(".katakana");
    return el && el.textContent ? el.textContent.trim() : "";
  }

  function onLearnCellActivate(cell) {
    document.querySelectorAll(".gojuon .cell.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
    });
    cell.classList.add("is-selected");
    flashPress(cell);
    playSyllableFromCell(cell);
  }

  getLearnCells().forEach(function (cell) {
    cell.setAttribute("tabindex", "0");
    cell.setAttribute("role", "button");

    cell.addEventListener("click", function (e) {
      if (document.body.classList.contains("mode-quiz")) return;
      e.preventDefault();
      onLearnCellActivate(cell);
    });

    cell.addEventListener("keydown", function (e) {
      if (document.body.classList.contains("mode-quiz")) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onLearnCellActivate(cell);
      }
    });
  });

  /* —— 模式切换 & 听写（平假名 / 片假名整张表） —— */
  var body = document.body;
  var btnLearn = document.getElementById("mode-learn");
  var btnQuiz = document.getElementById("mode-quiz-btn");
  var quizPanel = document.getElementById("quiz-panel");
  var quizPlay = document.getElementById("quiz-play");
  var quizRestartHira = document.getElementById("quiz-restart-hira");
  var quizRestartKata = document.getElementById("quiz-restart-kata");
  var quizScriptHira = document.getElementById("quiz-script-hira");
  var quizScriptKata = document.getElementById("quiz-script-kata");
  var quizForm = document.getElementById("quiz-form");
  var quizInput = document.getElementById("quiz-input");
  var quizSubmit = document.getElementById("quiz-submit");
  var quizFeedback = document.getElementById("quiz-feedback");
  var quizProgress = document.getElementById("quiz-progress");
  var quizSummary = document.getElementById("quiz-summary");
  var quizHeading = document.getElementById("quiz-heading");
  var quizHint = document.getElementById("quiz-hint");
  var quizInputLabel = document.getElementById("quiz-input-label");

  var quizCells = getLearnCells();
  var quizOrder = [];
  var quizIndex = 0;
  var quizCurrentCell = null;
  var quizCorrect = 0;
  var quizWrong = 0;
  var quizWrongRows = [];
  var quizFinished = false;

  function getQuizScriptType() {
    if (quizScriptHira && quizScriptHira.checked) return "hira";
    return "kata";
  }

  function setQuizScriptType(type) {
    if (type === "hira") {
      if (quizScriptHira) quizScriptHira.checked = true;
    } else {
      if (quizScriptKata) quizScriptKata.checked = true;
    }
  }

  /** 当前听写模式应匹配的假名（与朗读内容一致） */
  function getQuizExpectedText(cell) {
    return getQuizScriptType() === "hira" ? getHiragana(cell) : getKatakana(cell);
  }

  function applyQuizTypeUI() {
    var hira = getQuizScriptType() === "hira";
    if (quizHeading) {
      quizHeading.textContent = hira ? "听写：平假名" : "听写：片假名";
    }
    if (quizHint) {
      quizHint.innerHTML = hira
        ? "清音<strong>平假名</strong>整张表，顺序随机。请点<strong>「播放读音」</strong>听音节（可多次点击），在输入框写出对应<strong>平假名</strong>；提交后假名表对应格<strong>揭晓并变色</strong>（绿对红错）。完成全部题目后显示结果。"
        : "清音<strong>片假名</strong>整张表，顺序随机。请点<strong>「播放读音」</strong>听音节（可多次点击），在输入框写出对应<strong>片假名</strong>；提交后假名表对应格<strong>揭晓并变色</strong>（绿对红错）。完成全部题目后显示结果。";
    }
    if (quizInputLabel) {
      quizInputLabel.textContent = hira ? "平假名" : "片假名";
    }
    if (quizInput) {
      quizInput.placeholder = hira ? "例如：あ" : "例如：ア";
    }
  }

  function clearQuizAnswerClasses() {
    quizCells.forEach(function (c) {
      c.classList.remove("quiz-answered-correct", "quiz-answered-wrong");
    });
  }

  function setQuizInputsEnabled(on) {
    if (quizInput) {
      quizInput.disabled = !on;
    }
    if (quizSubmit) {
      quizSubmit.disabled = !on;
    }
  }

  function setQuizFinishedUI(finished) {
    quizFinished = finished;
    if (quizPanel) {
      if (finished) quizPanel.classList.add("is-finished");
      else quizPanel.classList.remove("is-finished");
    }
    setQuizInputsEnabled(!finished);
  }

  function updateQuizProgress() {
    if (!quizProgress) return;
    if (!quizOrder.length) {
      quizProgress.textContent = "";
      return;
    }
    if (quizFinished) {
      quizProgress.textContent =
        "已完成 " + quizOrder.length + " / " + quizOrder.length + " 题";
      return;
    }
    quizProgress.textContent =
      "第 " + (quizIndex + 1) + " / 共 " + quizOrder.length + " 题";
  }

  function loadCurrentQuizQuestion() {
    quizCurrentCell = quizOrder[quizIndex] || null;
    if (quizFeedback) quizFeedback.textContent = "";
    if (quizInput) {
      quizInput.value = "";
      if (!quizFinished) quizInput.focus();
    }
    updateQuizProgress();
  }

  function hideQuizSummary() {
    if (quizSummary) {
      quizSummary.hidden = true;
      quizSummary.innerHTML = "";
    }
  }

  function showQuizSummary() {
    if (!quizSummary) return;
    var total = quizOrder.length;
    var pTitle = document.createElement("p");
    pTitle.className = "quiz-summary__title";
    pTitle.textContent = "本轮练习完成";

    var pStat = document.createElement("p");
    pStat.textContent =
      "共 " +
      total +
      " 题，正确 " +
      quizCorrect +
      "，错误 " +
      quizWrong +
      "。";

    quizSummary.innerHTML = "";
    quizSummary.appendChild(pTitle);
    quizSummary.appendChild(pStat);

    if (quizWrongRows.length > 0) {
      var ul = document.createElement("ul");
      ul.className = "quiz-summary__list";
      quizWrongRows.forEach(function (row) {
        var li = document.createElement("li");
        li.textContent =
          "正确「" + row.expected + "」→ 你写成「" + (row.got || "（空）") + "」";
        ul.appendChild(li);
      });
      quizSummary.appendChild(ul);
    }

    quizSummary.hidden = false;
    if (quizFeedback) {
      quizFeedback.textContent = "全部完成！下方为本轮结果。";
    }
    updateQuizProgress();
    setQuizFinishedUI(true);
  }

  function resetQuizSession() {
    applyQuizTypeUI();
    hideQuizSummary();
    clearQuizAnswerClasses();
    quizOrder = shuffle(quizCells);
    quizIndex = 0;
    quizCorrect = 0;
    quizWrong = 0;
    quizWrongRows = [];
    setQuizFinishedUI(false);
    if (quizFeedback) quizFeedback.textContent = "";
    loadCurrentQuizQuestion();
  }

  function setModeLearn() {
    body.classList.remove("mode-quiz");
    btnLearn.classList.add("is-active");
    btnLearn.setAttribute("aria-pressed", "true");
    btnQuiz.classList.remove("is-active");
    btnQuiz.setAttribute("aria-pressed", "false");
    if (quizPanel) quizPanel.hidden = true;
    stopSyllableAudio();
    quizCurrentCell = null;
    hideQuizSummary();
    clearQuizAnswerClasses();
    setQuizFinishedUI(false);
    if (quizFeedback) quizFeedback.textContent = "";
    if (quizInput) quizInput.value = "";
    if (quizProgress) quizProgress.textContent = "";
  }

  function setModeQuiz() {
    body.classList.add("mode-quiz");
    btnQuiz.classList.add("is-active");
    btnQuiz.setAttribute("aria-pressed", "true");
    btnLearn.classList.remove("is-active");
    btnLearn.setAttribute("aria-pressed", "false");
    if (quizPanel) quizPanel.hidden = false;

    document.querySelectorAll(".gojuon .cell.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
    });

    resetQuizSession();
  }

  if (btnLearn) {
    btnLearn.addEventListener("click", function () {
      setModeLearn();
    });
  }

  if (btnQuiz) {
    btnQuiz.addEventListener("click", function () {
      setModeQuiz();
    });
  }

  function bindRestart(btn, type) {
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (!body.classList.contains("mode-quiz")) return;
      setQuizScriptType(type);
      stopSyllableAudio();
      resetQuizSession();
    });
  }

  bindRestart(quizRestartHira, "hira");
  bindRestart(quizRestartKata, "kata");

  if (quizScriptHira) {
    quizScriptHira.addEventListener("change", function () {
      if (!quizScriptHira.checked) return;
      if (!body.classList.contains("mode-quiz")) return;
      stopSyllableAudio();
      resetQuizSession();
    });
  }
  if (quizScriptKata) {
    quizScriptKata.addEventListener("change", function () {
      if (!quizScriptKata.checked) return;
      if (!body.classList.contains("mode-quiz")) return;
      stopSyllableAudio();
      resetQuizSession();
    });
  }

  if (quizPlay) {
    quizPlay.addEventListener("click", function () {
      if (quizFinished) {
        if (quizFeedback) quizFeedback.textContent = "本轮已结束，请点击「重新开始」。";
        return;
      }
      if (!quizCurrentCell) return;
      playSyllableFromCell(quizCurrentCell);
    });
  }

  if (quizForm && quizInput && quizFeedback) {
    quizForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (quizFinished) return;
      if (!quizOrder.length || !quizCurrentCell) {
        quizFeedback.textContent = "无法开始题目，请点「听写练习」或「重新开始」。";
        return;
      }

      var cell = quizCurrentCell;
      var expected = normalizeAnswer(getQuizExpectedText(cell));
      var got = normalizeAnswer(quizInput.value);
      if (!got) {
        quizFeedback.textContent =
          getQuizScriptType() === "hira"
            ? "请输入平假名后再提交。"
            : "请输入片假名后再提交。";
        return;
      }

      var ok = got === expected;
      cell.classList.remove("quiz-answered-correct", "quiz-answered-wrong");
      if (ok) {
        cell.classList.add("quiz-answered-correct");
        quizCorrect += 1;
        quizFeedback.textContent = "正确。下一题…";
      } else {
        cell.classList.add("quiz-answered-wrong");
        quizWrong += 1;
        quizWrongRows.push({ expected: expected, got: got });
        quizFeedback.textContent = "不对。表格中已标红，正确为「" + expected + "」。进入下一题…";
      }

      var isLast = quizIndex >= quizOrder.length - 1;
      if (isLast) {
        quizFinished = true;
        if (quizSubmit) quizSubmit.disabled = true;
        if (quizInput) quizInput.disabled = true;
        window.setTimeout(function () {
          showQuizSummary();
        }, 450);
        return;
      }

      quizIndex += 1;
      window.setTimeout(function () {
        loadCurrentQuizQuestion();
      }, 380);
    });
  }
})();
