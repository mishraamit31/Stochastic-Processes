/**
 * ADVANCED SIMULATORS & INTERACTIVE MODULES
 * Powers Matrix Power ($P^n$), Gambler's Ruin, MCMC Metropolis-Hastings,
 * Markov Text Generator, and the Knowledge Check Quiz.
 */

// =========================================================
// 1. MATRIX POWER (P^n) EXPLORER (MODULE 2)
// =========================================================
const MATRIX_POWER_PRESETS = {
  weather: {
    labels: ["Sunny", "Cloudy", "Rainy"],
    matrix: [
      [0.70, 0.20, 0.10],
      [0.30, 0.40, 0.30],
      [0.20, 0.30, 0.50]
    ]
  },
  landofoz: {
    labels: ["Rain", "Nice", "Snow"],
    matrix: [
      [0.50, 0.25, 0.25],
      [0.50, 0.00, 0.50],
      [0.25, 0.25, 0.50]
    ]
  },
  binary2: {
    labels: ["State 0", "State 1"],
    matrix: [
      [0.80, 0.20],
      [0.30, 0.70]
    ]
  }
};

let currentBaseMatrix = MarkovCore.cloneMatrix(MATRIX_POWER_PRESETS.weather.matrix);
let currentLabels = [...MATRIX_POWER_PRESETS.weather.labels];

function renderMatrixTable(matrix, labels, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const k = matrix.length;
  let html = "<table><tbody>";
  for (let i = 0; i < k; i++) {
    html += "<tr>";
    for (let j = 0; j < k; j++) {
      const val = matrix[i][j].toFixed(4);
      html += `<td>${val}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  container.innerHTML = html;
}

function updateStationaryLimitDisplay(matrix) {
  const targetValEl = document.getElementById("targetPiVal");
  if (!targetValEl) return;
  const pi = MarkovCore.computeStationaryDistribution(matrix);
  const formatted = pi.map(v => v.toFixed(4)).join(", ");
  targetValEl.textContent = `π = [ ${formatted} ]`;
}

window.updateMatrixPowerViewer = function (matrix, labels) {
  currentBaseMatrix = MarkovCore.cloneMatrix(matrix);
  currentLabels = [...labels];

  renderMatrixTable(currentBaseMatrix, currentLabels, "baseMatrixView");
  const stepN = parseInt(document.getElementById("stepNSlider").value, 10) || 1;
  const powered = MarkovCore.matrixPower(currentBaseMatrix, stepN);
  renderMatrixTable(powered, currentLabels, "poweredMatrixView");
  updateStationaryLimitDisplay(currentBaseMatrix);
};

function initMatrixPowerControls() {
  const slider = document.getElementById("stepNSlider");
  const labelVal = document.getElementById("stepNVal");
  const expLabel = document.getElementById("matExponentLabel");

  if (!slider) return;

  const updatePower = (n) => {
    slider.value = n;
    labelVal.textContent = n;
    expLabel.textContent = n;
    const powered = MarkovCore.matrixPower(currentBaseMatrix, n);
    renderMatrixTable(powered, currentLabels, "poweredMatrixView");
  };

  slider.addEventListener("input", (e) => {
    updatePower(parseInt(e.target.value, 10));
  });

  document.querySelectorAll(".btn-chip[data-setn]").forEach(btn => {
    btn.addEventListener("click", () => {
      updatePower(parseInt(btn.dataset.setn, 10));
    });
  });

  // Module 2 Presets Buttons
  document.querySelectorAll(".btn-preset[data-m2preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-preset[data-m2preset]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const presetKey = btn.dataset.m2preset;
      if (presetKey === "sync" && window.markovGraph) {
        window.updateMatrixPowerViewer(window.markovGraph.matrix, window.markovGraph.labels);
      } else if (MATRIX_POWER_PRESETS[presetKey]) {
        const p = MATRIX_POWER_PRESETS[presetKey];
        window.updateMatrixPowerViewer(p.matrix, p.labels);
      }
    });
  });

  // Initial render with the clean Weather model matrix
  window.updateMatrixPowerViewer(currentBaseMatrix, currentLabels);
}

// =========================================================
// 2. GAMBLER'S RUIN / ABSORBING LATTICE (MODULE 5)
// =========================================================
function initGamblersRuin() {
  const probInput = document.getElementById("ruinProbP");
  const probVal = document.getElementById("ruinPVal");
  const targetKInput = document.getElementById("ruinTargetK");
  const startCapitalInput = document.getElementById("ruinStartCapital");
  const latticeView = document.getElementById("ruinLatticeView");

  // Tab Elements
  const tabBtns = document.querySelectorAll(".btn-tab[data-ruintab]");
  const tabStepwise = document.getElementById("ruinTabStepwise");
  const tabBatch = document.getElementById("ruinTabBatch");

  // Step-wise Controls & Displays
  const stepBtn = document.getElementById("ruinStepBtn");
  const autoBtn = document.getElementById("ruinAutoBtn");
  const autoText = document.getElementById("ruinAutoText");
  const autoIcon = document.getElementById("ruinAutoIcon");
  const resetWalkBtn = document.getElementById("ruinResetWalkBtn");
  const speedInput = document.getElementById("ruinSpeed");
  const speedValEl = document.getElementById("ruinSpeedVal");

  const capitalValEl = document.getElementById("stepwiseCapitalVal");
  const stepValEl = document.getElementById("stepwiseStepVal");
  const lastCoinEl = document.getElementById("stepwiseLastCoin");
  const statusBadgeEl = document.getElementById("stepwiseStatusBadge");
  const trailEl = document.getElementById("stepwiseTrail");

  // Batch Elements
  const runBatchBtn = document.getElementById("runRuinSimBtn");
  const theoryWinEl = document.getElementById("theoryWinProb");
  const empiricalWinEl = document.getElementById("empiricalWinProb");
  const theoryStepsEl = document.getElementById("theorySteps");
  const empiricalStepsEl = document.getElementById("empiricalAvgSteps");

  if (!probInput || !latticeView) return;

  // Step-wise State
  let walkX = 3;
  let walkSteps = 0;
  let isWalkAbsorbed = false;
  let isAutoWalking = false;
  let autoWalkTimer = null;
  let walkSpeedMs = 350;
  let walkHistory = [];

  function computeTheoreticalRuin(p, K, i) {
    const q = 1 - p;
    let winProb = 0;
    let expectedSteps = 0;

    if (Math.abs(p - 0.5) < 1e-6) {
      // Fair coin
      winProb = i / K;
      expectedSteps = i * (K - i);
    } else {
      // Biased coin
      const ratio = q / p;
      winProb = (1 - Math.pow(ratio, i)) / (1 - Math.pow(ratio, K));
      expectedSteps = (i / (q - p)) - (K / (q - p)) * ((1 - Math.pow(ratio, i)) / (1 - Math.pow(ratio, K)));
    }

    return { winProb: Math.max(0, Math.min(1, winProb)), expectedSteps: Math.max(0, expectedSteps) };
  }

  function renderLattice(K, currentX) {
    let html = "";
    for (let i = 0; i <= K; i++) {
      let extraClass = "";
      let label = `$${i}`;
      if (i === 0) {
        extraClass = "absorbing-ruin";
        label = "Ruin $0";
      } else if (i === K) {
        extraClass = "absorbing-goal";
        label = `Goal $${K}`;
      }

      if (i === currentX) {
        extraClass += " current-capital";
      }

      html += `<div class="lattice-node ${extraClass}" title="State ${i}: ${label}">${i}</div>`;
    }
    latticeView.innerHTML = html;
  }

  function updateTrajectoryTrail() {
    if (!trailEl) return;
    let html = "";
    walkHistory.forEach((pos, idx) => {
      const isLatest = idx === walkHistory.length - 1;
      let stepClass = isLatest ? "trail-step active" : "trail-step";
      if (pos === 0) stepClass += " ruin";
      if (pos === parseInt(targetKInput.value, 10)) stepClass += " goal";

      html += `<span class="${stepClass}">$${pos}</span>`;
      if (idx < walkHistory.length - 1) {
        html += `<span class="trail-arrow">&rarr;</span>`;
      }
    });
    trailEl.innerHTML = html;
    trailEl.scrollLeft = trailEl.scrollWidth;
  }

  function resetStepwiseWalk() {
    stopAutoWalk();
    const K = parseInt(targetKInput.value, 10);
    let X0 = parseInt(startCapitalInput.value, 10);
    if (X0 >= K) X0 = K - 1;
    if (X0 <= 0) X0 = 1;

    walkX = X0;
    walkSteps = 0;
    isWalkAbsorbed = false;
    walkHistory = [X0];

    capitalValEl.textContent = `$${walkX}`;
    stepValEl.textContent = "0";
    lastCoinEl.textContent = "—";
    lastCoinEl.className = "coin-badge";
    statusBadgeEl.textContent = "Active Walk";
    statusBadgeEl.className = "walk-status-badge in-progress";

    renderLattice(K, walkX);
    updateTrajectoryTrail();
  }

  function singleStep() {
    const K = parseInt(targetKInput.value, 10);
    const p = parseFloat(probInput.value);

    if (isWalkAbsorbed) {
      resetStepwiseWalk();
      return;
    }

    walkSteps++;
    const isWin = Math.random() < p;
    const prevX = walkX;

    if (isWin) {
      walkX++;
      lastCoinEl.textContent = `Heads (+1, p=${p.toFixed(2)})`;
      lastCoinEl.className = "coin-badge heads";
    } else {
      walkX--;
      lastCoinEl.textContent = `Tails (-1, q=${(1 - p).toFixed(2)})`;
      lastCoinEl.className = "coin-badge tails";
    }

    walkHistory.push(walkX);
    capitalValEl.textContent = `$${walkX}`;
    stepValEl.textContent = walkSteps;

    // Check absorption
    if (walkX === 0) {
      isWalkAbsorbed = true;
      stopAutoWalk();
      statusBadgeEl.textContent = "💀 Absorbed in Ruin ($0)";
      statusBadgeEl.className = "walk-status-badge lost";
    } else if (walkX === K) {
      isWalkAbsorbed = true;
      stopAutoWalk();
      statusBadgeEl.textContent = `🎉 Absorbed at Goal ($${K})`;
      statusBadgeEl.className = "walk-status-badge won";
    } else {
      statusBadgeEl.textContent = `Step ${walkSteps}: Active`;
      statusBadgeEl.className = "walk-status-badge in-progress";
    }

    renderLattice(K, walkX);
    updateTrajectoryTrail();
  }

  function startAutoWalk() {
    if (isWalkAbsorbed) {
      resetStepwiseWalk();
    }
    isAutoWalking = true;
    autoText.textContent = "Pause";
    autoBtn.classList.add("primary");
    autoBtn.classList.remove("secondary");
    autoIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;

    autoWalkTimer = setInterval(() => {
      if (isWalkAbsorbed) {
        stopAutoWalk();
      } else {
        singleStep();
      }
    }, walkSpeedMs);
  }

  function stopAutoWalk() {
    isAutoWalking = false;
    if (autoWalkTimer) clearInterval(autoWalkTimer);
    if (autoText) {
      autoText.textContent = "Auto Walk";
      autoBtn.classList.remove("primary");
      autoBtn.classList.add("secondary");
      autoIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    }
  }

  function toggleAutoWalk() {
    if (isAutoWalking) {
      stopAutoWalk();
    } else {
      startAutoWalk();
    }
  }

  function computeAndRenderAbsorbingMatrices(p, K, X0) {
    const matrixNEl = document.getElementById("matrixNContainer");
    const matrixBEl = document.getElementById("matrixBContainer");
    const matrixTEl = document.getElementById("matrixTContainer");
    if (!matrixNEl || !matrixBEl || !matrixTEl) return;

    const t = K - 1; // Number of transient states ($1 to $K-1)
    const q = 1 - p;

    // 1. Construct Q (size t x t)
    const Q = Array.from({ length: t }, () => new Array(t).fill(0));
    for (let i = 0; i < t; i++) {
      if (i + 1 < t) Q[i][i + 1] = p; // Right transition (+1)
      if (i - 1 >= 0) Q[i][i - 1] = q; // Left transition (-1)
    }

    // 2. Construct (I - Q)
    const ImQ = Array.from({ length: t }, (_, i) =>
      Array.from({ length: t }, (_, j) => (i === j ? 1 : 0) - Q[i][j])
    );

    // 3. Compute Fundamental Matrix N = (I - Q)^(-1)
    let N;
    try {
      N = MarkovCore.invertMatrix(ImQ);
    } catch (e) {
      console.warn("Could not invert (I-Q):", e);
      return;
    }

    // 4. Compute Expected Absorption Time Vector t = N * 1
    const tVec = N.map(row => row.reduce((a, b) => a + b, 0));

    // 5. Compute Absorption Probabilities B = N * R
    // R has 2 columns: Col 0 = Ruin ($0), Col 1 = Goal ($K)
    const B = Array.from({ length: t }, (_, i) => [
      N[i][0] * q,
      N[i][t - 1] * p
    ]);

    // Render Matrix N Table
    let htmlN = `<table class="matrix-table-analytical"><thead><tr><th>X₀ \\ j</th>`;
    for (let j = 1; j <= t; j++) {
      htmlN += `<th>$${j}</th>`;
    }
    htmlN += `</tr></thead><tbody>`;
    for (let i = 0; i < t; i++) {
      const state = i + 1;
      const isSelected = state === X0;
      htmlN += `<tr class="${isSelected ? 'highlight-active-row' : ''}"><th>$${state}</th>`;
      for (let j = 0; j < t; j++) {
        htmlN += `<td>${N[i][j].toFixed(3)}</td>`;
      }
      htmlN += `</tr>`;
    }
    htmlN += `</tbody></table>`;
    matrixNEl.innerHTML = htmlN;

    // Render Matrix B Table
    let htmlB = `<table class="matrix-table-analytical"><thead><tr><th>X₀</th><th class="col-ruin">Ruin ($0)</th><th class="col-goal">Goal ($${K})</th></tr></thead><tbody>`;
    for (let i = 0; i < t; i++) {
      const state = i + 1;
      const isSelected = state === X0;
      htmlB += `<tr class="${isSelected ? 'highlight-active-row' : ''}"><th>$${state}</th>`;
      htmlB += `<td class="col-ruin">${B[i][0].toFixed(4)}</td>`;
      htmlB += `<td class="col-goal">${B[i][1].toFixed(4)}</td>`;
      htmlB += `</tr>`;
    }
    htmlB += `</tbody></table>`;
    matrixBEl.innerHTML = htmlB;

    // Render Vector t Table
    let htmlT = `<table class="matrix-table-analytical"><thead><tr><th>X₀</th><th>Expected Steps (tᵢ)</th></tr></thead><tbody>`;
    for (let i = 0; i < t; i++) {
      const state = i + 1;
      const isSelected = state === X0;
      htmlT += `<tr class="${isSelected ? 'highlight-active-row' : ''}"><th>$${state}</th>`;
      htmlT += `<td class="val-steps">${tVec[i].toFixed(2)} steps</td>`;
      htmlT += `</tr>`;
    }
    htmlT += `</tbody></table>`;
    matrixTEl.innerHTML = htmlT;
  }

  function updateParameters() {
    const p = parseFloat(probInput.value);
    const K = parseInt(targetKInput.value, 10);
    let X0 = parseInt(startCapitalInput.value, 10);

    if (X0 >= K) X0 = K - 1;
    if (X0 <= 0) X0 = 1;
    startCapitalInput.value = X0;

    probVal.textContent = p === 0.5 ? "0.50 (Fair)" : `${p.toFixed(2)} (${p > 0.5 ? 'Favorable' : 'Unfavorable'})`;

    const theory = computeTheoreticalRuin(p, K, X0);
    theoryWinEl.textContent = theory.winProb.toFixed(4);
    theoryStepsEl.textContent = `${theory.expectedSteps.toFixed(2)} steps`;

    computeAndRenderAbsorbingMatrices(p, K, X0);
    resetStepwiseWalk();
  }

  // Event Attachments
  probInput.addEventListener("input", updateParameters);
  targetKInput.addEventListener("change", updateParameters);
  startCapitalInput.addEventListener("change", updateParameters);

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const mode = btn.dataset.ruintab;
      if (mode === "stepwise") {
        tabStepwise.classList.add("active");
        tabBatch.classList.remove("active");
      } else {
        tabBatch.classList.add("active");
        tabStepwise.classList.remove("active");
        stopAutoWalk();
      }
    });
  });

  // Step-wise buttons
  stepBtn.addEventListener("click", singleStep);
  autoBtn.addEventListener("click", toggleAutoWalk);
  resetWalkBtn.addEventListener("click", resetStepwiseWalk);

  speedInput.addEventListener("input", (e) => {
    walkSpeedMs = 850 - parseInt(e.target.value, 10);
    speedValEl.textContent = `${walkSpeedMs}ms`;
    if (isAutoWalking) {
      stopAutoWalk();
      startAutoWalk();
    }
  });

  // Batch 200 simulation button
  runBatchBtn.addEventListener("click", () => {
    const p = parseFloat(probInput.value);
    const K = parseInt(targetKInput.value, 10);
    const X0 = parseInt(startCapitalInput.value, 10);

    const numSimulations = 200;
    let wins = 0;
    let totalSteps = 0;

    for (let sim = 0; sim < numSimulations; sim++) {
      let state = X0;
      let steps = 0;
      while (state > 0 && state < K && steps < 10000) {
        steps++;
        if (Math.random() < p) {
          state++;
        } else {
          state--;
        }
      }
      if (state === K) wins++;
      totalSteps += steps;
    }

    empiricalWinEl.textContent = (wins / numSimulations).toFixed(4);
    empiricalStepsEl.textContent = `${(totalSteps / numSimulations).toFixed(2)} steps`;
  });

  // Initialize
  updateParameters();
}

// =========================================================
// 3. MCMC METROPOLIS-HASTINGS VISUALIZER (MODULE 7)
// =========================================================
class MCMCSimulator {
  constructor() {
    this.canvas = document.getElementById("mcmcCanvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.runBtn = document.getElementById("mcmcRunBtn");
    this.resetBtn = document.getElementById("mcmcResetBtn");
    this.sigmaInput = document.getElementById("mcmcSigma");
    this.sigmaVal = document.getElementById("mcmcSigmaVal");
    this.sampleCountEl = document.getElementById("mcmcSampleCount");
    this.acceptRateEl = document.getElementById("mcmcAcceptRate");

    this.isRunning = false;
    this.timer = null;
    this.samples = [];
    this.totalProposed = 0;
    this.totalAccepted = 0;
    this.currentX = 0;
    this.sigmaProp = 0.8;

    this.binCount = 60;
    this.xMin = -6;
    this.xMax = 6;

    this.setupEvents();
    this.draw();
  }

  // Target Distribution: Bimodal Mixture of 2 Gaussians (Unnormalized p_tilde)
  targetDensity(x) {
    const g1 = 0.5 * Math.exp(-0.5 * Math.pow((x + 2.0) / 0.7, 2));
    const g2 = 0.5 * Math.exp(-0.5 * Math.pow((x - 2.5) / 1.0, 2));
    return g1 + g2;
  }

  setupEvents() {
    this.sigmaInput.addEventListener("input", (e) => {
      this.sigmaProp = parseFloat(e.target.value);
      this.sigmaVal.textContent = this.sigmaProp.toFixed(2);
    });

    this.runBtn.addEventListener("click", () => {
      if (this.isRunning) {
        this.stop();
      } else {
        this.start();
      }
    });

    this.resetBtn.addEventListener("click", () => {
      this.reset();
    });
  }

  start() {
    this.isRunning = true;
    this.runBtn.textContent = "Pause Sampler";
    this.runBtn.classList.add("secondary");
    this.runBtn.classList.remove("primary");

    this.timer = setInterval(() => {
      // Draw 5 samples per tick for responsive animation
      for (let i = 0; i < 5; i++) {
        this.stepMCMC();
      }
      this.draw();
    }, 40);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.runBtn.textContent = "Start MCMC Sampler";
    this.runBtn.classList.remove("secondary");
    this.runBtn.classList.add("primary");
  }

  reset() {
    this.stop();
    this.samples = [];
    this.totalProposed = 0;
    this.totalAccepted = 0;
    this.currentX = 0;
    this.sampleCountEl.textContent = "0";
    this.acceptRateEl.textContent = "0.0%";
    this.draw();
  }

  // Box-Muller standard normal generator
  sampleNormal(mean, std) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z * std;
  }

  stepMCMC() {
    // 1. Propose candidate x_prime ~ N(currentX, sigmaProp^2)
    const xPrime = this.sampleNormal(this.currentX, this.sigmaProp);

    // 2. Acceptance probability alpha = min(1, p(xPrime)/p(currentX))
    const pCurrent = this.targetDensity(this.currentX);
    const pPrime = this.targetDensity(xPrime);
    const alpha = Math.min(1, pPrime / (pCurrent + 1e-12));

    this.totalProposed++;

    // 3. Accept or reject
    if (Math.random() <= alpha) {
      this.currentX = xPrime;
      this.totalAccepted++;
    }

    this.samples.push(this.currentX);

    this.sampleCountEl.textContent = this.samples.length;
    const rate = ((this.totalAccepted / this.totalProposed) * 100).toFixed(1);
    this.acceptRateEl.textContent = `${rate}%`;
  }

  toCanvasX(x) {
    return ((x - this.xMin) / (this.xMax - this.xMin)) * this.canvas.width;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const padBottom = 30;
    const plotH = h - padBottom - 20;

    // Draw Histogram of samples
    if (this.samples.length > 0) {
      const bins = new Array(this.binCount).fill(0);
      const binWidth = (this.xMax - this.xMin) / this.binCount;

      for (let s of this.samples) {
        if (s >= this.xMin && s <= this.xMax) {
          const idx = Math.floor((s - this.xMin) / binWidth);
          if (idx >= 0 && idx < this.binCount) bins[idx]++;
        }
      }

      const maxBin = Math.max(...bins, 1);
      ctx.fillStyle = "rgba(99, 102, 241, 0.4)";
      ctx.strokeStyle = "rgba(99, 102, 241, 0.8)";
      ctx.lineWidth = 1;

      for (let i = 0; i < this.binCount; i++) {
        const xLeft = this.toCanvasX(this.xMin + i * binWidth);
        const barW = (w / this.binCount) - 1;
        const barH = (bins[i] / maxBin) * plotH * 0.85;
        const yTop = h - padBottom - barH;

        ctx.fillRect(xLeft, yTop, barW, barH);
        ctx.strokeRect(xLeft, yTop, barW, barH);
      }
    }

    // Draw True Target Density Curve (Normalized for display)
    ctx.beginPath();
    ctx.strokeStyle = "#ec4899";
    ctx.lineWidth = 3;
    const maxDensity = 0.5; // Approx peak

    for (let px = 0; px <= w; px += 3) {
      const x = this.xMin + (px / w) * (this.xMax - this.xMin);
      const density = this.targetDensity(x);
      const py = h - padBottom - (density / maxDensity) * plotH * 0.85;
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Axis line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - padBottom);
    ctx.lineTo(w, h - padBottom);
    ctx.stroke();

    // Draw Current State Particle
    const curXCanvas = this.toCanvasX(this.currentX);
    ctx.beginPath();
    ctx.arc(curXCanvas, h - padBottom, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Legend
    ctx.fillStyle = "#ec4899";
    ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("— True Target p(x)", 20, 24);

    ctx.fillStyle = "#818cf8";
    ctx.fillText("■ Empirical MCMC Histogram", 150, 24);

    ctx.fillStyle = "#38bdf8";
    ctx.fillText("● Current State x_t", 330, 24);
  }
}

// =========================================================
// 4. MARKOV TEXT GENERATOR & PROBABILISTIC LANGUAGE ENGINE (MODULE 8)
// =========================================================
function initMarkovTextGenerator() {
  const textInput = document.getElementById("textGenInput");
  const orderSelect = document.getElementById("ngramOrderSelect");
  const tempSlider = document.getElementById("ngramTempSlider");
  const tempValEl = document.getElementById("ngramTempVal");
  const genBtn = document.getElementById("generateTextBtn");
  const stepBtn = document.getElementById("stepTextBtn");
  const resetBtn = document.getElementById("resetTextBtn");
  const outputEl = document.getElementById("genTextOutput");
  const tokenCountEl = document.getElementById("ngramTokenCount");
  const activeStateBadge = document.getElementById("ngramActiveStateBadge");
  const candidatesListEl = document.getElementById("ngramCandidatesList");
  const presetButtons = document.querySelectorAll("#simMarkovTextSection .btn-preset");

  if (!genBtn || !textInput) return;

  const PRESETS = {
    markov: `Probability is the branch of mathematics concerning numerical descriptions of how likely an event is to occur. Probability theory is utilized in statistics, mathematics, science, finance, and artificial intelligence to model stochastic processes and Markov chains. A discrete-time Markov chain is a sequence of random variables with the Markov property, where the conditional probability distribution of the next state depends only upon the current state and not on the preceding sequence of events. Ergodic Markov chains possess a unique stationary distribution that describes the long-term equilibrium behavior of the stochastic system.`,
    shakespeare: `To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles and by opposing end them. To die—to sleep, no more; and by a sleep to say we end the heart-ache and the thousand natural shocks that flesh is heir to: 'tis a consummation devoutly to be wish'd. To die, to sleep; to sleep, perchance to dream—ay, there's the rub: for in that sleep of death what dreams may come.`,
    alice: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversations?' So she was considering in her own mind whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.`
  };

  let generatedTokens = [];
  let currentPrefix = [];
  let modelTransitions = {};
  let startPrefixes = [];

  // Preset Buttons (Scoped to Markov Text Generator)
  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      presetButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.getAttribute("data-preset");
      if (PRESETS[key]) {
        textInput.value = PRESETS[key];
        resetGeneration();
      }
    });
  });

  if (tempSlider) {
    tempSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (tempValEl) tempValEl.textContent = val.toFixed(2);
    });
  }

  if (orderSelect) {
    orderSelect.addEventListener("change", () => {
      resetGeneration();
    });
  }

  function trainModel() {
    const rawText = textInput.value.trim();
    if (!rawText) return null;

    const k = parseInt(orderSelect ? orderSelect.value : 2, 10);
    const rawTokens = rawText.match(/[\w'-]+|[.,!?;]/g) || rawText.split(/\s+/);
    if (rawTokens.length <= k) return null;

    const transitions = {};
    const starts = [];

    for (let i = 0; i <= rawTokens.length - k - 1; i++) {
      const prefix = rawTokens.slice(i, i + k).join(" ");
      const nextWord = rawTokens[i + k];

      if (!transitions[prefix]) transitions[prefix] = {};
      transitions[prefix][nextWord] = (transitions[prefix][nextWord] || 0) + 1;

      if (i === 0 || /^[A-Z]/.test(rawTokens[i])) {
        starts.push(rawTokens.slice(i, i + k));
      }
    }

    modelTransitions = transitions;
    startPrefixes = starts.length > 0 ? starts : [rawTokens.slice(0, k)];
    return { transitions, starts: startPrefixes };
  }

  function sampleNextWord(prefixKey, temp = 1.0) {
    const nextCandidates = modelTransitions[prefixKey];
    if (!nextCandidates) return null;

    const words = Object.keys(nextCandidates);
    if (words.length === 0) return null;

    let totalScore = 0;
    const scores = words.map(w => {
      const count = nextCandidates[w];
      const score = Math.pow(count, 1 / Math.max(0.05, temp));
      totalScore += score;
      return score;
    });

    let rand = Math.random() * totalScore;
    for (let i = 0; i < words.length; i++) {
      rand -= scores[i];
      if (rand <= 0) return { word: words[i], candidates: nextCandidates, totalScore };
    }
    return { word: words[words.length - 1], candidates: nextCandidates, totalScore };
  }

  function renderCandidates(prefixKey) {
    if (!candidatesListEl) return;
    const nextCandidates = modelTransitions[prefixKey];

    if (activeStateBadge) {
      activeStateBadge.textContent = `State: [ ${prefixKey || "None"} ]`;
    }

    if (!nextCandidates || Object.keys(nextCandidates).length === 0) {
      candidatesListEl.innerHTML = `<div class="empty-candidates-hint">Terminal State / End of path. No further transitions.</div>`;
      return;
    }

    const words = Object.keys(nextCandidates);
    let totalCount = 0;
    words.forEach(w => totalCount += nextCandidates[w]);

    const sorted = words.map(w => ({
      word: w,
      count: nextCandidates[w],
      prob: (nextCandidates[w] / totalCount)
    })).sort((a, b) => b.prob - a.prob);

    let html = "";
    sorted.forEach(item => {
      const pct = (item.prob * 100).toFixed(1);
      html += `
        <div class="candidate-row">
          <div class="cand-info">
            <span class="cand-word">"${item.word}"</span>
            <span class="cand-pct">${pct}% (${item.count}/${totalCount})</span>
          </div>
          <div class="cand-bar-bg">
            <div class="cand-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    });

    candidatesListEl.innerHTML = html;
  }

  function formatOutputText(tokens) {
    let text = "";
    tokens.forEach((tok, idx) => {
      if (idx === 0 || /^[.,!?;:]$/.test(tok)) {
        text += tok;
      } else {
        text += " " + tok;
      }
    });
    return text;
  }

  function stepOneWord() {
    trainModel();
    const k = parseInt(orderSelect ? orderSelect.value : 2, 10);
    const temp = parseFloat(tempSlider ? tempSlider.value : 1.0);

    if (generatedTokens.length === 0) {
      const start = startPrefixes[Math.floor(Math.random() * startPrefixes.length)];
      generatedTokens = [...start];
      currentPrefix = [...start];
    }

    const prefixKey = currentPrefix.slice(-k).join(" ");
    renderCandidates(prefixKey);

    const sample = sampleNextWord(prefixKey, temp);
    if (!sample) {
      outputEl.innerHTML = `<strong>Stream:</strong> ${formatOutputText(generatedTokens)} <span style="color: var(--accent-amber); font-style: italic;">(End of sequence)</span>`;
      return;
    }

    generatedTokens.push(sample.word);
    currentPrefix.push(sample.word);
    if (currentPrefix.length > k) currentPrefix.shift();

    outputEl.innerHTML = `<strong>Stream:</strong> ${formatOutputText(generatedTokens)}`;
    if (tokenCountEl) tokenCountEl.textContent = `${generatedTokens.length} tokens generated`;

    const nextPrefixKey = currentPrefix.slice(-k).join(" ");
    renderCandidates(nextPrefixKey);
  }

  function generateFullStream() {
    trainModel();
    const k = parseInt(orderSelect ? orderSelect.value : 2, 10);
    const temp = parseFloat(tempSlider ? tempSlider.value : 1.0);

    const start = startPrefixes[Math.floor(Math.random() * startPrefixes.length)];
    generatedTokens = [...start];
    currentPrefix = [...start];

    const maxTokens = 55;
    for (let step = 0; step < maxTokens; step++) {
      const prefixKey = currentPrefix.slice(-k).join(" ");
      const sample = sampleNextWord(prefixKey, temp);
      if (!sample) break;

      generatedTokens.push(sample.word);
      currentPrefix.push(sample.word);
      if (currentPrefix.length > k) currentPrefix.shift();

      if (/[.!?]$/.test(sample.word) && generatedTokens.length >= 25) break;
    }

    outputEl.innerHTML = `<strong>Stream:</strong> ${formatOutputText(generatedTokens)}`;
    if (tokenCountEl) tokenCountEl.textContent = `${generatedTokens.length} tokens generated`;

    const lastPrefixKey = currentPrefix.slice(-k).join(" ");
    renderCandidates(lastPrefixKey);
  }

  function resetGeneration() {
    generatedTokens = [];
    currentPrefix = [];
    if (outputEl) outputEl.innerHTML = `<em>Click "Generate Full Stream" or "Step 1 Word" to begin Markov text generation...</em>`;
    if (tokenCountEl) tokenCountEl.textContent = `0 tokens generated`;
    if (activeStateBadge) activeStateBadge.textContent = `State: [None]`;
    if (candidatesListEl) candidatesListEl.innerHTML = `<div class="empty-candidates-hint">Start stepping to view live candidate transition probabilities.</div>`;
  }

  if (stepBtn) stepBtn.addEventListener("click", stepOneWord);
  if (genBtn) genBtn.addEventListener("click", generateFullStream);
  if (resetBtn) resetBtn.addEventListener("click", resetGeneration);
}

// =========================================================
// 5. INTERACTIVE KNOWLEDGE CHECK / QUIZ (20-QUESTION MASTERY ASSESSMENT)
// =========================================================
const QUIZ_QUESTIONS = [
  // --- MODULE 01 ---
  {
    tag: "Module 01 • Foundations & Markov Property",
    q: "1. What is the defining condition of the first-order Markov Property for a discrete-time stochastic process $\{X_n : n \\ge 0\}$ on state space $\\mathcal{S}$?",
    options: [
      "The future state depends only on the present state and is conditionally independent of past history: $P(X_{n+1}=j \\mid X_n=i, X_{n-1}=i_{n-1}, \\dots, X_0=i_0) = P(X_{n+1}=j \\mid X_n=i)$.",
      "The probability of transitioning to state $j$ is constant over all time and independent of current state $X_n$.",
      "The process is strictly deterministic such that $X_{n+1} = f(X_n)$ with zero stochastic variance.",
      "All states in $\\mathcal{S}$ are equally likely to be visited at any step $n$: $P(X_n=j) = 1/|\\mathcal{S}|Count$."
    ],
    correct: 0,
    explanation: "The first-order Markov property encapsulates memorylessness: given the present state $X_n$, the conditional probability distribution of future state $X_{n+1}$ is independent of the past trajectory $X_0, X_1, \\dots, X_{n-1}$."
  },
  {
    tag: "Module 01 • Stochastic Matrices & Distributions",
    q: "2. For a Markov chain with transition matrix $P = [P_{ij}]$ and initial probability distribution row vector $p^{(0)}$, how is the probability distribution $p^{(n)}$ after $n$ steps computed?",
    options: [
      "$p^{(n)} = P^n (p^{(0)})^T$",
      "$p^{(n)} = p^{(0)} P^n$",
      "$p^{(n)} = p^{(0)} + n P$",
      "$p^{(n)} = (p^{(0)} P)^n$"
    ],
    correct: 1,
    explanation: "Because $p_j^{(1)} = \\sum_i p_i^{(0)} P_{ij} = (p^{(0)} P)_j$, iterating $n$ times yields $p^{(n)} = p^{(0)} P^n$. Row stochasticity guarantees conservation of total probability $\\sum_j p_j^{(n)} = 1$ for all $n$."
  },

  // --- MODULE 02 ---
  {
    tag: "Module 02 • Multi-Step Dynamics & Chapman-Kolmogorov",
    q: "3. What is the probabilistic meaning of the Chapman-Kolmogorov equation $P_{ij}^{(m+n)} = \\sum_{k \\in \\mathcal{S}} P_{ik}^{(m)} P_{kj}^{(n)}$?",
    options: [
      "It represents the arithmetic mean of transition probabilities at steps $m$ and $n$.",
      "It selects the single maximum probability path through intermediate states: $\\max_k P_{ik}^{(m)} P_{kj}^{(n)}$.",
      "It sums probabilities over all mutually exclusive intermediate states $k$ at step $m$, which is algebraically identical to matrix multiplication $P^{(m+n)} = P^m P^n$.",
      "It proves that the transition matrix $P$ must be symmetric."
    ],
    correct: 2,
    explanation: "By the law of total probability and the Markov property: $P_{ij}^{(m+n)} = \\sum_k P(X_{m+n}=j, X_m=k \\mid X_0=i) = \\sum_k P_{ik}^{(m)} P_{kj}^{(n)}$, matching the matrix product $(P^m P^n)_{ij}$."
  },
  {
    tag: "Module 02 • Spectral Decomposition & Eigendecomposition",
    q: "4. If a transition matrix $P$ is diagonalizable with eigendecomposition $P = V \\Lambda V^{-1}$, how can the $n$-step matrix power $P^n$ be expressed?",
    options: [
      "$P^n = V \\Lambda^n V^{-1} = \\sum_{i=1}^N \\lambda_i^n \\mathbf{v}_i \\mathbf{w}_i^T$, where dominant eigenvalue $\\lambda_1 = 1$ and all other $|\\lambda_i| \\le 1$.",
      "$P^n = V^n \\Lambda (V^{-1})^n$",
      "$P^n = \\Lambda^n \\text{Tr}(P)$",
      "$P^n = I + n(P - I)$"
    ],
    correct: 0,
    explanation: "Because $P^n = (V \\Lambda V^{-1})^n = V \\Lambda^n V^{-1}$, each transient spectral mode decays as $\\lambda_i^n$. Non-dominant modes with $|\\lambda_i| < 1$ decay exponentially to zero as $n \\to \\infty$."
  },

  // --- MODULE 03 ---
  {
    tag: "Module 03 • Classification of States & Periodicity",
    q: "5. A state $i$ has period $d = \\gcd\\{n \\ge 1 : P_{ii}^{(n)} > 0\\}$. Which condition guarantees that state $i$ is aperiodic ($d = 1$)?",
    options: [
      "The state is transient.",
      "The state has a self-loop with positive probability ($P_{ii} > 0$).",
      "The state has no incoming transitions from other states.",
      "The state belongs to a bipartite graph."
    ],
    correct: 1,
    explanation: "If $P_{ii} > 0$, then $1 \\in \\{n \\ge 1 : P_{ii}^{(n)} > 0\\}$. Since $\\gcd(1, k) = 1$ for any integer $k$, the state must be aperiodic ($d = 1$)."
  },
  {
    tag: "Module 03 • Lattice Random Walks & Pólya's Theorem",
    q: "6. According to Pólya's Recurrence Theorem for simple symmetric random walks on the $d$-dimensional integer lattice $\\mathbb{Z}^d$, what is the qualitative difference between dimensions?",
    options: [
      "The walk is transient in $d=1, 2$ but recurrent in $d \\ge 3$.",
      "The walk is periodic with period 3 only in $\\mathbb{Z}^3$.",
      "The walk is recurrent in $d=1$ and $d=2$ (returns to origin with probability 1), but transient in $d \\ge 3$ (return probability $\\gamma_3 \\approx 34.05\\%$ in 3D).",
      "The walk has finite expected return time in all dimensions $d \\ge 1$."
    ],
    correct: 2,
    explanation: "Pólya (1921) proved that $\\sum_{n=0}^\\infty P_{00}^{(2n)} = \\infty$ for $d=1, 2$ (recurrent with probability 1), whereas the return integral converges in $d=3$, giving return probability $\\gamma_3 \\approx 0.3405373$ (transient) — 'A drunk man will find his way home, but a drunk bird may get lost forever.'"
  },

  // --- MODULE 04 ---
  {
    tag: "Module 04 • Stationary Distributions",
    q: "7. A probability vector $\\pi$ is the stationary distribution of transition matrix $P$ if and only if:",
    options: [
      "$\\pi P = \\pi$ subject to $\\sum_i \\pi_i = 1$ and $\\pi_i \\ge 0$ (meaning $\\pi$ is a normalized left eigenvector with eigenvalue $\\lambda = 1$).",
      "$P \\pi^T = \\pi^T$ with $\\det(P) = 0$.",
      "$\\pi = \\mathbf{1}^T P^{-1}$ for any invertible matrix.",
      "$\\pi_i = P_{ii}$ for all diagonal entries."
    ],
    correct: 0,
    explanation: "Stationarity means the distribution is invariant over time: $p^{(n+1)} = \\pi P = \\pi$. In linear algebra, this is precisely the normalized left eigenvector of $P$ associated with dominant eigenvalue $\\lambda = 1$."
  },
  {
    tag: "Module 04 • Spectral Gap & Mixing Time",
    q: "8. For an ergodic finite Markov chain with spectral gap $\\gamma = 1 - |\\lambda_2| > 0$, how does the chain converge to stationary distribution $\\pi$?",
    options: [
      "Convergence is strictly linear with rate $O(1/n)$ regardless of eigenvalues.",
      "The total variation distance decays exponentially as $\\|p^{(n)} - \\pi\\|_{TV} \\le C |\\lambda_2|^n$, and mixing time scales as $t_{\\text{mix}}(\\epsilon) \\approx \\frac{1}{\\gamma} \\ln(1/\\epsilon)$.",
      "The chain never converges if there are complex eigenvalues.",
      "A smaller spectral gap $\\gamma \\to 0$ leads to faster convergence."
    ],
    correct: 1,
    explanation: "The second eigenvalue magnitude $|\\lambda_2|$ controls the slowest decaying transient mode. The spectral gap $\\gamma = 1 - |\\lambda_2|$ dictates the geometric decay rate towards stationary measure $\\pi$."
  },

  // --- MODULE 05 ---
  {
    tag: "Module 05 • Absorbing Chains & Fundamental Matrix",
    q: "9. In an absorbing Markov chain in canonical form $P = \\begin{pmatrix} Q & R \\\\ 0 & I \\end{pmatrix}$, what does the Fundamental Matrix $N = (I - Q)^{-1} = \\sum_{k=0}^\\infty Q^k$ represent?",
    options: [
      "The transition probabilities between absorbing states.",
      "The stationary distribution vector of the chain.",
      "The eigenvalues of the transient submatrix $Q$.",
      "Entry $N_{ij}$ is the expected cumulative number of visits to transient state $j$ starting from transient state $i$ prior to absorption."
    ],
    correct: 3,
    explanation: "Since $Q^k$ represents the probability of being in transient state $j$ at step $k$, summing $\\sum_{k=0}^\\infty Q^k = (I - Q)^{-1} = N$ gives the total expected sojourn time spent in state $j$ before hitting an absorbing state."
  },
  {
    tag: "Module 05 • Gambler's Ruin & Hitting Times",
    q: "10. In the symmetric Gambler's Ruin with fortune $k$, absorbing boundaries at $0$ (ruin) and $N$ (wealth), and $p = q = 1/2$, what is the exact ruin probability $P_{\\text{ruin}}(k)$ and expected duration $T_k$?",
    options: [
      "$P_{\\text{ruin}}(k) = 1 - \\frac{k}{N}$, and expected game duration is $T_k = k(N - k)$ steps.",
      "$P_{\\text{ruin}}(k) = (1/2)^k$, and expected duration is $T_k = N^2$.",
      "$P_{\\text{ruin}}(k) = \\frac{k}{N}$, and expected duration is $T_k = 2k$.",
      "$P_{\\text{ruin}}(k) = 1/N$, and expected duration is $T_k = N!$."
    ],
    correct: 0,
    explanation: "Solving the difference equation with boundary conditions $P(0)=1, P(N)=0$ yields $P_{\\text{ruin}}(k) = 1 - k/N$. The expected duration solves $T_k = 1 + \\frac{1}{2}T_{k+1} + \\frac{1}{2}T_{k-1}$, giving $T_k = k(N - k)$."
  },

  // --- MODULE 06 ---
  {
    tag: "Module 06 • Time-Reversibility & Detailed Balance",
    q: "11. A Markov chain with transition matrix $P$ and stationary distribution $\\pi$ is time-reversible if and only if:",
    options: [
      "$P = P^T$ (symmetric transition matrix).",
      "$\\sum_i \\pi_i P_{ij} = \\pi_j$ (global balance only).",
      "It satisfies Detailed Balance: $\\pi_i P_{ij} = \\pi_j P_{ji}$ for all pairs of states $i, j \\in \\mathcal{S}$.",
      "$\\pi_i P_{ij} = \\pi_i P_{ji}$ for all $i, j$."
    ],
    correct: 2,
    explanation: "Detailed balance states that the probability flux from $i \\to j$ ($\\pi_i P_{ij}$) equals the reverse flux $j \\to i$ ($\\pi_j P_{ji}$), meaning the stochastic process statistically looks identical forward and backward in time."
  },
  {
    tag: "Module 06 • Random Walks on Undirected Graphs",
    q: "12. For a simple random walk on an undirected, connected graph $G = (V, E)$ with $P_{uv} = \\frac{1}{\\deg(u)}$, what is the unique stationary distribution $\\pi_u$?",
    options: [
      "$\\pi_u = \\frac{1}{|V|}$ uniformly for all nodes.",
      "$\\pi_u = \\frac{\\deg(u)}{2|E|}$, satisfying detailed balance $\\pi_u P_{uv} = \\pi_v P_{vu} = \\frac{1}{2|E|}$ across every edge.",
      "$\\pi_u = \\frac{1}{\\deg(u)}$, because probability concentrates at low-degree nodes.",
      "$\\pi_u = \\frac{\\deg(u)^2}{|E|^2}$."
    ],
    correct: 1,
    explanation: "Substituting $\\pi_u = \\frac{\\deg(u)}{2|E|}$ gives $\\pi_u P_{uv} = \\left(\\frac{\\deg(u)}{2|E|}\\right)\\left(\\frac{1}{\\deg(u)}\\right) = \\frac{1}{2|E|}$, which is symmetric in $u, v$. Summing $\\sum_u \\deg(u) = 2|E|$ confirms $\\sum \\pi_u = 1$."
  },
  {
    tag: "Module 06 • Kolmogorov's Cycle Criterion",
    q: "13. What does Kolmogorov's Cycle Criterion state regarding the reversibility of a stationary Markov chain?",
    options: [
      "A chain is reversible if and only if for every closed cycle $i_1 \\to i_2 \\to \\dots \\to i_k \\to i_1$, the clockwise product of transition probabilities equals the counter-clockwise product: $P_{i_1 i_2} P_{i_2 i_3} \\cdots P_{i_k i_1} = P_{i_1 i_k} \\cdots P_{i_3 i_2} P_{i_2 i_1}$.",
      "A chain is reversible if and only if all cycles contain an even number of states.",
      "A chain is reversible if and only if there are no directed cycles in the graph.",
      "A chain is reversible if the product of eigenvalues around any cycle equals 1."
    ],
    correct: 0,
    explanation: "Kolmogorov's cycle criterion provides a necessary and sufficient condition for reversibility without needing to solve for stationary distribution $\\pi$ beforehand, checking loop probability symmetry directly on $P$."
  },

  // --- MODULE 07 ---
  {
    tag: "Module 07 • Metropolis-Hastings MCMC Sampler",
    q: "14. In the Metropolis-Hastings algorithm targeting an unnormalized distribution $\\tilde{p}(x)$ with partition function $Z$ ($p(x) = \\tilde{p}(x)/Z$), why is the normalizing constant $Z$ unnecessary?",
    options: [
      "Because $Z = 1$ in all probability distributions.",
      "Because proposal distributions are always uniform.",
      "Because MCMC chains never reach stationary equilibrium.",
      "Because the acceptance ratio $\\alpha(x, x') = \\min\\left(1, \\frac{\\tilde{p}(x') q(x \\mid x')}{\\tilde{p}(x) q(x' \\mid x)}\\right)$ divides $\\tilde{p}(x')$ by $\\tilde{p}(x)$, causing the constant $Z$ to cancel out completely."
    ],
    correct: 3,
    explanation: "The ratio $\\frac{p(x') q(x \\mid x')}{p(x) q(x' \\mid x)} = \\frac{[\\tilde{p}(x')/Z] q(x \\mid x')}{[\\tilde{p}(x)/Z] q(x' \\mid x)} = \\frac{\\tilde{p}(x') q(x \\mid x')}{\\tilde{p}(x) q(x' \\mid x)}$ eliminates $Z$, making MCMC sampling feasible even when $Z$ is analytically intractable."
  },
  {
    tag: "Module 07 • Symmetric Proposals & Random Walks",
    q: "15. When using a symmetric proposal density (e.g. Gaussian random walk $q(x' \\mid x) = \\mathcal{N}(x' \\mid x, \\sigma_{\\text{prop}}^2) = q(x \\mid x')$), how does the Metropolis-Hastings algorithm simplify?",
    options: [
      "It rejects all moves that decrease target probability.",
      "It reduces to the original Metropolis (1953) rule: $\\alpha(x, x') = \\min\\left(1, \\frac{\\tilde{p}(x')}{\\tilde{p}(x)}\\right)$, accepting uphill moves ($\\tilde{p}(x') \\ge \\tilde{p}(x)$) with probability 1 and downhill moves with probability $\\frac{\\tilde{p}(x')}{\\tilde{p}(x)}$.",
      "It becomes a deterministic gradient ascent algorithm.",
      "It generates samples without satisfying detailed balance."
    ],
    correct: 1,
    explanation: "Symmetry $q(x \\mid x') = q(x' \\mid x)$ cancels the proposal density ratio to 1, reducing the algorithm to the standard Metropolis sampler where transitions to higher density are always accepted."
  },

  // --- MODULE 08 ---
  {
    tag: "Module 08 • Google's PageRank & Damping Factor",
    q: "16. Why does Google's PageRank construct the Google Matrix $G = d P^* + (1-d)\\frac{1}{N}\\mathbf{1}\\mathbf{1}^T$ with damping factor $d \\approx 0.85$, and how does it guarantee fast convergence?",
    options: [
      "It makes the web graph undirected so that detailed balance holds.",
      "It normalizes all webpage authority scores to 1.0 simultaneously.",
      "It resolves spider traps and dangling nodes, making $G$ strictly positive and primitive; by Perron-Frobenius, this guarantees a spectral gap $\\gamma = 1 - d = 0.15$ and geometric power iteration convergence $O(d^k)$.",
      "It eliminates the need for power iteration by computing matrix inversion in $O(1)$."
    ],
    correct: 2,
    explanation: "The teleportation perturbation $(1-d)\\frac{1}{N}\\mathbf{1}\\mathbf{1}^T$ ensures all entries $G_{ij} \\ge \\frac{1-d}{N} > 0$. Perron-Frobenius guarantees a unique positive stationary vector $\\pi$, and the second eigenvalue $|\\lambda_2| \\le d = 0.85$ ensures exponential power iteration convergence."
  },
  {
    tag: "Module 08 • N-Gram Language Models & Temperature",
    q: "17. In a $k$-th order Markov language model with temperature-scaled transition sampling $P_\\tau(w \\mid h) \\propto [P(w \\mid h)]^{1/\\tau}$, what is the effect of changing temperature $\\tau$?",
    options: [
      "As $\\tau \\to 0^+$, the distribution collapses to deterministic greedy argmax selection; as $\\tau \\to \\infty$, the distribution flattens toward maximum-entropy uniform randomness over all vocabulary tokens.",
      "High temperature $\\tau > 1$ makes the model choose only the single most frequent word in the corpus.",
      "Temperature $\\tau$ changes the history context length from $k$ to $k/\\tau$.",
      "Temperature $\\tau$ only modifies the training loss and has no effect during generation."
    ],
    correct: 0,
    explanation: "Temperature $\\tau$ scales logits: for $\\tau < 1$, probability mass concentrates heavily on highest-probability tokens (more deterministic text); for $\\tau > 1$, probability differences are smoothed out, increasing lexical diversity."
  },
  {
    tag: "Module 08 • Hidden Markov Models (HMM)",
    q: "18. What is the fundamental algorithmic difference between the Forward Algorithm and the Viterbi Algorithm in Hidden Markov Models?",
    options: [
      "Forward is an exponential brute-force search $O(N^T)$, while Viterbi is a greedy approximation.",
      "The Forward Algorithm uses dynamic programming summation ($\\sum$) to compute total observation marginal likelihood $P(Y_{1:T} \\mid \\lambda)$, whereas the Viterbi Algorithm uses maximization ($\\max$) with backpointers to identify the single most probable latent state sequence $X^* = \\arg\\max_X P(X \\mid Y, \\lambda)$.",
      "Forward estimates the emission matrix $B$, while Viterbi estimates initial vector $\\pi$.",
      "Viterbi works only on continuous observations, whereas Forward works only on discrete symbols."
    ],
    correct: 1,
    explanation: "The Forward algorithm computes $\\alpha_t(j) = \\left[\\sum_i \\alpha_{t-1}(i) a_{ij}\\right] b_j(Y_t)$ in $O(N^2 T)$. The Viterbi algorithm replaces the summation with maximization $\\delta_t(j) = \\left[\\max_i \\delta_{t-1}(i) a_{ij}\\right] b_j(Y_t)$ and maintains backpointers $\\psi_t(j)$ to reconstruct the optimal hidden state sequence $X^*$."
  },

  // --- MODULE 09 ---
  {
    tag: "Module 09 • Continuous-Time Markov Chains (CTMC)",
    q: "19. In a Continuous-Time Markov Chain (CTMC) with infinitesimal generator matrix $Q = [q_{ij}]$, what mathematical conditions must $Q$ satisfy, and how are holding times distributed?",
    options: [
      "All entries $q_{ij} \\in [0, 1]$ and all columns sum to 1; holding times are uniformly distributed.",
      "$Q$ must be a symmetric matrix with negative determinant, and holding times are deterministic integers.",
      "Off-diagonal transition rates $q_{ij} \\ge 0$, diagonal entries $q_{ii} = -\\sum_{j \\ne i} q_{ij} \\le 0$ (yielding zero row sums $Q \\mathbf{1} = \\mathbf{0}$), and state holding times are memoryless exponential random variables $\\tau_i \\sim \\text{Exp}(-q_{ii})$ with mean $\\mathbb{E}[\\tau_i] = \\frac{1}{-q_{ii}}$.",
      "The eigenvalues of $Q$ must all be strictly positive real numbers."
    ],
    correct: 2,
    explanation: "Conservation of probability $\\sum_j P_{ij}(t) = 1$ implies that the derivative at $t=0$ satisfies $\\sum_j q_{ij} = 0 \\implies q_{ii} = -\\sum_{j \\ne i} q_{ij}$. Due to the continuous Markov memoryless property, the sojourn time spent in state $i$ is exponentially distributed with rate parameter $q_i = -q_{ii}$."
  },
  {
    tag: "Module 09 • Kolmogorov ODEs & Global Balance",
    q: "20. How does the continuous transition probability matrix $P(t)$ evolve over time $t \\ge 0$, and what differential equation characterizes the stationary distribution $\\pi$ in a CTMC?",
    options: [
      "$P(t) = e^{t Q} = \\sum_{k=0}^\\infty \\frac{(t Q)^k}{k!}$ (satisfying Kolmogorov's Forward/Backward ODEs $\\frac{d}{dt}P(t) = P(t)Q = QP(t)$), and the stationary distribution satisfies the differential balance $\\pi Q = \\mathbf{0}$ subject to $\\sum \\pi_i = 1$.",
      "$P(t) = t Q$, and stationary distribution satisfies $\\pi Q = \\mathbf{1}$.",
      "$P(t) = Q^t$ for non-integer $t$, and stationary distribution satisfies $\\pi P(t) = \\mathbf{0}$.",
      "$P(t)$ is constant over time, and $\\pi$ is the eigenvector corresponding to the maximum eigenvalue of $Q$."
    ],
    correct: 0,
    explanation: "The differential equation $\\frac{d}{dt}P(t) = QP(t)$ with $P(0)=I$ has the unique matrix exponential solution $P(t) = e^{tQ}$. In equilibrium, state probability changes vanish: $\\frac{d}{dt}p(t) = \\mathbf{0} \\implies \\pi Q = \\mathbf{0}$, which is the global balance condition equating total rate of probability flow entering state $j$ to the rate exiting state $j$."
  }
];

function initQuiz() {
  const container = document.getElementById("quizContainer");
  const submitBtn = document.getElementById("submitQuizBtn");
  const scoreText = document.getElementById("quizScoreText");

  if (!container || !submitBtn) return;

  let html = "";
  QUIZ_QUESTIONS.forEach((item, qIdx) => {
    html += `
      <div class="quiz-question-card" id="qCard_${qIdx}">
        <span class="quiz-topic-tag">${item.tag}</span>
        <p class="quiz-q-text">${item.q}</p>
        <div class="quiz-options">
          ${item.options.map((opt, optIdx) => `
            <label class="quiz-option-label" id="optLabel_${qIdx}_${optIdx}">
              <input type="radio" name="question_${qIdx}" value="${optIdx}">
              <span>${opt}</span>
            </label>
          `).join("")}
        </div>
        <div class="quiz-explanation" id="exp_${qIdx}">${item.explanation}</div>
      </div>
    `;
  });
  container.innerHTML = html;

  // Render KaTeX for newly injected quiz questions and options
  if (typeof window.renderAllMath === "function") {
    window.renderAllMath(container);
  } else if (window.renderMathInElement) {
    window.renderMathInElement(container, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ],
      throwOnError: false
    });
  }

  submitBtn.addEventListener("click", () => {
    let score = 0;
    QUIZ_QUESTIONS.forEach((item, qIdx) => {
      const selected = document.querySelector(`input[name="question_${qIdx}"]:checked`);
      const expEl = document.getElementById(`exp_${qIdx}`);
      expEl.classList.add("show");

      item.options.forEach((_, optIdx) => {
        const label = document.getElementById(`optLabel_${qIdx}_${optIdx}`);
        label.classList.remove("correct", "incorrect");
        if (optIdx === item.correct) {
          label.classList.add("correct");
        }
      });

      if (selected) {
        const userChoice = parseInt(selected.value, 10);
        if (userChoice === item.correct) {
          score++;
        } else {
          document.getElementById(`optLabel_${qIdx}_${userChoice}`).classList.add("incorrect");
        }
      }
    });

    const pct = ((score / QUIZ_QUESTIONS.length) * 100).toFixed(0);
    scoreText.innerHTML = `Score: <strong style="color: ${score >= 16 ? 'var(--accent-green)' : (score >= 10 ? 'var(--accent-amber)' : 'var(--accent-pink)')};">${score} / ${QUIZ_QUESTIONS.length} (${pct}%)</strong>`;

    // Re-render KaTeX on explanations if needed
    if (typeof window.renderAllMath === "function") {
      window.renderAllMath(container);
    } else if (window.renderMathInElement) {
      window.renderMathInElement(container, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    }
  });

  const resetBtn = document.getElementById("resetQuizBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      // 1. Uncheck all radio options
      const radios = container.querySelectorAll('input[type="radio"]');
      radios.forEach(r => { r.checked = false; });

      // 2. Remove correct/incorrect highlight classes
      const labels = container.querySelectorAll(".quiz-option-label");
      labels.forEach(l => { l.classList.remove("correct", "incorrect"); });

      // 3. Hide all explanation boxes
      const explanations = container.querySelectorAll(".quiz-explanation");
      explanations.forEach(exp => { exp.classList.remove("show"); });

      // 4. Reset score text
      scoreText.innerHTML = `Score: - / ${QUIZ_QUESTIONS.length}`;

      // 5. Smooth scroll back to top of the assessment
      const quizSection = document.getElementById("module-quiz");
      if (quizSection) {
        quizSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
}

// =========================================================
// 6. DYNAMIC SCROLLSPY & SYLLABUS TRACKER
// =========================================================
function initScrollSpy() {
  const navItems = document.querySelectorAll(".syllabus-nav .nav-item");
  const sections = Array.from(document.querySelectorAll("section.module-card, section.hero-banner"));
  const progressText = document.getElementById("syllabusProgressText");
  const progressBar = document.getElementById("sidebarProgressBar");
  const sidebar = document.getElementById("sidebar");

  if (navItems.length === 0 || sections.length === 0) return;

  const moduleNames = {
    "module-1": "Module 1 of 9 • Foundations",
    "module-2": "Module 2 of 9 • Multi-Step Dynamics",
    "module-3": "Module 3 of 9 • Classification of States",
    "module-4": "Module 4 of 9 • Ergodicity & Mixing",
    "module-5": "Module 5 of 9 • Absorbing Chains",
    "module-6": "Module 6 of 9 • Reversibility",
    "module-7": "Module 7 of 9 • MCMC Sampling",
    "module-8": "Module 8 of 9 • Advanced Applications",
    "module-9": "Module 9 of 9 • Continuous-Time Markov Chains",
    "module-quiz": "Knowledge Check • Assessment"
  };

  const modulePercentages = {
    "module-1": 11,
    "module-2": 22,
    "module-3": 33,
    "module-4": 44,
    "module-5": 55,
    "module-6": 66,
    "module-7": 77,
    "module-8": 88,
    "module-9": 96,
    "module-quiz": 100
  };

  let isClickScrolling = false;

  // Smooth click navigation with top offset clearance
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = item.getAttribute("href").replace("#", "");
      const targetSec = document.getElementById(targetId);
      if (!targetSec) return;

      isClickScrolling = true;

      // Update active class immediately
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      // Update progress header
      if (progressText && moduleNames[targetId]) {
        progressText.textContent = moduleNames[targetId];
      }
      if (progressBar && modulePercentages[targetId]) {
        progressBar.style.width = `${modulePercentages[targetId]}%`;
      }

      // Scroll main window with top navbar clearance
      const navOffset = 75;
      const targetTop = targetSec.getBoundingClientRect().top + window.pageYOffset - navOffset;
      window.scrollTo({ top: targetTop, behavior: "smooth" });

      // Scroll active sidebar link into view inside the sidebar
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });

      setTimeout(() => {
        isClickScrolling = false;
      }, 700);
    });
  });

  // Dynamic Scroll Listener
  function onScroll() {
    if (isClickScrolling) return;

    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const viewportOffset = 180; // Offset below top nav

    let currentSectionId = "";

    // Find the section currently in view
    for (let i = sections.length - 1; i >= 0; i--) {
      const sec = sections[i];
      const top = sec.getBoundingClientRect().top + scrollY - viewportOffset;
      if (scrollY >= top) {
        currentSectionId = sec.getAttribute("id");
        break;
      }
    }

    if (!currentSectionId) {
      currentSectionId = "module-1";
    }

    // Update active class
    let activeItem = null;
    navItems.forEach(item => {
      const hrefId = item.getAttribute("href").replace("#", "");
      if (hrefId === currentSectionId) {
        item.classList.add("active");
        activeItem = item;
      } else {
        item.classList.remove("active");
      }
    });

    // Update progress tracker
    if (progressText && moduleNames[currentSectionId]) {
      progressText.textContent = moduleNames[currentSectionId];
    }
    if (progressBar && modulePercentages[currentSectionId]) {
      progressBar.style.width = `${modulePercentages[currentSectionId]}%`;
    }

    // Auto-scroll sidebar if the active item moves out of view
    if (activeItem && sidebar) {
      const itemRect = activeItem.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      if (itemRect.top < sidebarRect.top || itemRect.bottom > sidebarRect.bottom) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // Initialize on page load
}

// =========================================================
// 7. 3D LATTICE RANDOM WALK SIMULATOR (PÓLYA'S THEOREM)
// =========================================================
class Lattice3DSimulator {
  constructor() {
    this.canvas = document.getElementById("lattice3dCanvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // UI elements
    this.stepBtn = document.getElementById("walk3dStepBtn");
    this.autoBtn = document.getElementById("walk3dAutoBtn");
    this.autoIcon = document.getElementById("walk3dAutoIcon");
    this.autoText = document.getElementById("walk3dAutoText");
    this.resetBtn = document.getElementById("walk3dResetBtn");
    this.batchBtn = document.getElementById("walk3dBatchBtn");
    this.speedInput = document.getElementById("walk3dSpeed");
    this.speedValEl = document.getElementById("walk3dSpeedVal");

    this.coordsEl = document.getElementById("val3dCoords");
    this.distEl = document.getElementById("val3dDist");
    this.stepsEl = document.getElementById("val3dSteps");
    this.returnsEl = document.getElementById("val3dReturns");
    this.lastMoveEl = document.getElementById("val3dLastMove");
    this.empiricalEl = document.getElementById("val3dEmpiricalReturn");
    this.batchStatusEl = document.getElementById("val3dBatchStatus");

    // Walk State
    this.currentPos = { x: 0, y: 0, z: 0 };
    this.trajectory = [{ x: 0, y: 0, z: 0 }];
    this.stepCount = 0;
    this.returnCount = 0;
    this.lastDirection = "—";
    this.isAutoWalking = false;
    this.autoTimer = null;
    this.speedMs = 120;

    // 3D Camera Angles
    this.theta = Math.PI / 4.5; // Yaw
    this.phi = Math.PI / 6.5;   // Pitch
    this.scale = 16;            // Lattice step size in pixels
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    this.initEvents();
    this.draw();
  }

  initEvents() {
    // Canvas Mouse Interaction for 3D Orbit Dragging
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.theta += dx * 0.01;
      this.phi += dy * 0.01;
      this.phi = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.phi));
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.draw();
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    // Touch support for mobile/tablet orbit
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastMouse.x;
      const dy = e.touches[0].clientY - this.lastMouse.y;
      this.theta += dx * 0.01;
      this.phi += dy * 0.01;
      this.phi = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.phi));
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.draw();
    }, { passive: true });

    window.addEventListener("touchend", () => {
      this.isDragging = false;
    });

    // Buttons
    if (this.stepBtn) {
      this.stepBtn.addEventListener("click", () => {
        this.step();
      });
    }

    if (this.autoBtn) {
      this.autoBtn.addEventListener("click", () => {
        if (this.isAutoWalking) {
          this.stopAuto();
        } else {
          this.startAuto();
        }
      });
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => {
        this.reset();
      });
    }

    if (this.batchBtn) {
      this.batchBtn.addEventListener("click", () => {
        this.runBatchMonteCarlo(100);
      });
    }

    if (this.speedInput) {
      this.speedInput.addEventListener("input", (e) => {
        this.speedMs = parseInt(e.target.value, 10);
        if (this.speedValEl) this.speedValEl.textContent = `${this.speedMs}ms`;
        if (this.isAutoWalking) {
          this.startAuto();
        }
      });
    }
  }

  step() {
    // 6 possible moves with probability 1/6
    const moves = [
      { dx: 1, dy: 0, dz: 0, name: "+X (Right)", color: "#ec4899" },
      { dx: -1, dy: 0, dz: 0, name: "-X (Left)", color: "#ec4899" },
      { dx: 0, dy: 1, dz: 0, name: "+Y (Up)", color: "#10b981" },
      { dx: 0, dy: -1, dz: 0, name: "-Y (Down)", color: "#10b981" },
      { dx: 0, dy: 0, dz: 1, name: "+Z (Forward)", color: "#06b6d4" },
      { dx: 0, dy: 0, dz: -1, name: "-Z (Backward)", color: "#06b6d4" }
    ];

    const chosen = moves[Math.floor(Math.random() * 6)];
    this.currentPos = {
      x: this.currentPos.x + chosen.dx,
      y: this.currentPos.y + chosen.dy,
      z: this.currentPos.z + chosen.dz
    };
    this.trajectory.push({ ...this.currentPos });
    this.stepCount++;
    this.lastDirection = chosen;

    if (this.currentPos.x === 0 && this.currentPos.y === 0 && this.currentPos.z === 0) {
      this.returnCount++;
    }

    this.updateUI();
    this.draw();
  }

  startAuto() {
    this.isAutoWalking = true;
    if (this.autoTimer) clearInterval(this.autoTimer);
    if (this.autoIcon) this.autoIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    if (this.autoText) this.autoText.textContent = "Pause";
    if (this.autoBtn) {
      this.autoBtn.classList.remove("secondary");
      this.autoBtn.classList.add("primary");
    }

    this.autoTimer = setInterval(() => {
      this.step();
    }, this.speedMs);
  }

  stopAuto() {
    this.isAutoWalking = false;
    if (this.autoTimer) clearInterval(this.autoTimer);
    if (this.autoIcon) this.autoIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    if (this.autoText) this.autoText.textContent = "Auto Walk";
    if (this.autoBtn) {
      this.autoBtn.classList.add("secondary");
      this.autoBtn.classList.remove("primary");
    }
  }

  reset() {
    this.stopAuto();
    this.currentPos = { x: 0, y: 0, z: 0 };
    this.trajectory = [{ x: 0, y: 0, z: 0 }];
    this.stepCount = 0;
    this.returnCount = 0;
    this.lastDirection = null;
    this.updateUI();
    this.draw();
  }

  runBatchMonteCarlo(numWalks = 100, maxStepsPerWalk = 1500) {
    this.stopAuto();
    if (this.batchStatusEl) this.batchStatusEl.textContent = "Simulating 100 walks (up to 1,500 steps each)...";

    setTimeout(() => {
      let returns = 0;
      for (let w = 0; w < numWalks; w++) {
        let x = 0, y = 0, z = 0;
        let returned = false;
        for (let s = 1; s <= maxStepsPerWalk; s++) {
          const moveIdx = Math.floor(Math.random() * 6);
          if (moveIdx === 0) x++;
          else if (moveIdx === 1) x--;
          else if (moveIdx === 2) y++;
          else if (moveIdx === 3) y--;
          else if (moveIdx === 4) z++;
          else if (moveIdx === 5) z--;

          if (x === 0 && y === 0 && z === 0) {
            returned = true;
            break;
          }
        }
        if (returned) returns++;
      }

      const empiricalRate = (returns / numWalks) * 100;
      if (this.empiricalEl) this.empiricalEl.textContent = `${empiricalRate.toFixed(1)}% (${returns}/${numWalks})`;
      if (this.batchStatusEl) this.batchStatusEl.textContent = `Completed! Theory is 34.05% (finite step truncation cutoff = ${maxStepsPerWalk})`;
    }, 40);
  }

  updateUI() {
    const { x, y, z } = this.currentPos;
    const dist = Math.sqrt(x * x + y * y + z * z);

    if (this.coordsEl) this.coordsEl.textContent = `(${x}, ${y}, ${z})`;
    if (this.distEl) this.distEl.textContent = dist.toFixed(2);
    if (this.stepsEl) this.stepsEl.textContent = this.stepCount;
    if (this.returnsEl) this.returnsEl.textContent = this.returnCount;

    const overlayMoveEl = document.getElementById("val3dOverlayLastMove");

    if (this.lastDirection && typeof this.lastDirection === "object") {
      if (this.lastMoveEl) {
        this.lastMoveEl.innerHTML = `<span class="move-dir-badge" style="color: ${this.lastDirection.color}; border: 1px solid ${this.lastDirection.color}60; background: ${this.lastDirection.color}20;">${this.lastDirection.name}</span>`;
      }
      if (overlayMoveEl) {
        overlayMoveEl.textContent = this.lastDirection.name;
        overlayMoveEl.style.color = this.lastDirection.color;
      }
    } else {
      if (this.lastMoveEl) {
        this.lastMoveEl.innerHTML = `<span style="color: var(--text-dim);">— (Ready)</span>`;
      }
      if (overlayMoveEl) {
        overlayMoveEl.textContent = "—";
        overlayMoveEl.style.color = "var(--text-dim)";
      }
    }
  }

  project(x, y, z, cx, cy) {
    const cosT = Math.cos(this.theta);
    const sinT = Math.sin(this.theta);
    const x1 = x * cosT + z * sinT;
    const z1 = -x * sinT + z * cosT;

    const cosP = Math.cos(this.phi);
    const sinP = Math.sin(this.phi);
    const y2 = y * cosP - z1 * sinP;
    const z2 = y * sinP + z1 * cosP;

    const fov = 450;
    const depth = fov / (fov + z2 * this.scale * 0.4 + 200);
    const screenX = cx + x1 * this.scale * depth;
    const screenY = cy - y2 * this.scale * depth;

    return { x: screenX, y: screenY, depth, z: z2 };
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 380);
    bgGrad.addColorStop(0, "rgba(20, 28, 48, 0.9)");
    bgGrad.addColorStop(1, "rgba(8, 12, 22, 0.98)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 1. Draw 3D Bounding Lattice Box / Reference Grid (-8 to +8)
    const gridSize = 8;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;

    // Base grid at Y = -gridSize
    for (let i = -gridSize; i <= gridSize; i += 2) {
      const p1 = this.project(i, -gridSize, -gridSize, cx, cy);
      const p2 = this.project(i, -gridSize, gridSize, cx, cy);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const p3 = this.project(-gridSize, -gridSize, i, cx, cy);
      const p4 = this.project(gridSize, -gridSize, i, cx, cy);
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    // 2. Draw Coordinate Axes with Glowing Colors
    const axisLen = 10;
    const originP = this.project(0, 0, 0, cx, cy);

    // X Axis (Red/Pink)
    const px = this.project(axisLen, 0, 0, cx, cy);
    ctx.strokeStyle = "#ec4899";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originP.x, originP.y);
    ctx.lineTo(px.x, px.y);
    ctx.stroke();
    ctx.fillStyle = "#ec4899";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("+X", px.x + 4, px.y);

    // Y Axis (Green)
    const py = this.project(0, axisLen, 0, cx, cy);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originP.x, originP.y);
    ctx.lineTo(py.x, py.y);
    ctx.stroke();
    ctx.fillStyle = "#10b981";
    ctx.fillText("+Y", py.x + 4, py.y - 4);

    // Z Axis (Cyan/Blue)
    const pz = this.project(0, 0, axisLen, cx, cy);
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originP.x, originP.y);
    ctx.lineTo(pz.x, pz.y);
    ctx.stroke();
    ctx.fillStyle = "#06b6d4";
    ctx.fillText("+Z", pz.x + 4, pz.y);

    // 3. Draw Origin (0,0,0) Sphere
    ctx.beginPath();
    ctx.arc(originP.x, originP.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#6366f1";
    ctx.shadowColor = "#6366f1";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Draw Trajectory Path Ribbon
    if (this.trajectory.length > 1) {
      const totalSteps = this.trajectory.length;
      for (let i = 1; i < totalSteps; i++) {
        const pt1 = this.project(this.trajectory[i - 1].x, this.trajectory[i - 1].y, this.trajectory[i - 1].z, cx, cy);
        const pt2 = this.project(this.trajectory[i].x, this.trajectory[i].y, this.trajectory[i].z, cx, cy);

        const progress = i / totalSteps;
        ctx.strokeStyle = `hsla(${200 + progress * 140}, 90%, 65%, ${0.3 + progress * 0.6})`;
        ctx.lineWidth = 2.2;

        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      }
    }

    // 5. Draw Current Walker Position Marker
    const currP = this.project(this.currentPos.x, this.currentPos.y, this.currentPos.z, cx, cy);
    ctx.beginPath();
    ctx.arc(currP.x, currP.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// =========================================================
// 8. UNDIRECTED GRAPH RANDOM WALK SIMULATOR (MODULE 6)
// =========================================================
class UndirectedGraphWalkSimulator {
  constructor() {
    this.canvas = document.getElementById("graphWalkCanvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // UI elements
    this.stepBtn = document.getElementById("walkGraphStepBtn");
    this.autoBtn = document.getElementById("walkGraphAutoBtn");
    this.autoIcon = document.getElementById("walkGraphAutoIcon");
    this.autoText = document.getElementById("walkGraphAutoText");
    this.fastBtn = document.getElementById("walkGraphFastBtn");
    this.resetBtn = document.getElementById("walkGraphResetBtn");
    this.speedInput = document.getElementById("walkGraphSpeed");
    this.speedValEl = document.getElementById("walkGraphSpeedVal");

    this.currentNodeEl = document.getElementById("valGraphCurrentNode");
    this.totalStepsEl = document.getElementById("valGraphTotalSteps");
    this.tableBodyEl = document.getElementById("graphWalkTableBody");
    this.tvErrorEl = document.getElementById("valGraphTvError");
    this.flux13El = document.getElementById("valGraphFlux13");

    // Graph Network Definition (5 Nodes: 1, 2, 3 (hub), 4, 5)
    this.nodes = [
      { id: 0, label: "1", x: 120, y: 85,  degree: 2, theory: 2/12, radius: 22, color: "#818cf8" },
      { id: 1, label: "2", x: 85,  y: 235, degree: 2, theory: 2/12, radius: 22, color: "#818cf8" },
      { id: 2, label: "3", x: 260, y: 160, degree: 4, theory: 4/12, radius: 28, color: "#f59e0b" }, // Central hub
      { id: 3, label: "4", x: 420, y: 85,  degree: 2, theory: 2/12, radius: 22, color: "#06b6d4" },
      { id: 4, label: "5", x: 445, y: 235, degree: 2, theory: 2/12, radius: 22, color: "#06b6d4" }
    ];

    // Adjacency List
    this.adj = {
      0: [1, 2],       // 1 connected to 2, 3
      1: [0, 2],       // 2 connected to 1, 3
      2: [0, 1, 3, 4], // 3 connected to 1, 2, 4, 5
      3: [2, 4],       // 4 connected to 3, 5
      4: [2, 3]        // 5 connected to 3, 4
    };

    // Edges list
    this.edges = [
      [0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4]
    ];

    // Simulation State
    this.currentNode = 0; // Starts at Node 1
    this.totalSteps = 0;
    this.visitCounts = [0, 0, 0, 0, 0];
    this.flux_1_to_3 = 0;
    this.flux_3_to_1 = 0;

    this.isAutoWalking = false;
    this.autoTimer = null;
    this.speedMs = 150;

    // Draggable Nodes State
    this.draggedNode = null;
    this.isDragging = false;

    this.initEvents();
    this.updateUI();
    this.draw();
  }

  initEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const onDown = (e) => {
      const pos = getPos(e);
      for (const node of this.nodes) {
        const dx = pos.x - node.x;
        const dy = pos.y - node.y;
        if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 8) {
          this.draggedNode = node;
          this.isDragging = true;
          break;
        }
      }
    };

    const onMove = (e) => {
      if (!this.isDragging || !this.draggedNode) return;
      const pos = getPos(e);
      this.draggedNode.x = Math.max(30, Math.min(this.canvas.width - 30, pos.x));
      this.draggedNode.y = Math.max(30, Math.min(this.canvas.height - 30, pos.y));
      this.draw();
    };

    const onUp = () => {
      this.isDragging = false;
      this.draggedNode = null;
    };

    this.canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    this.canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    // Buttons
    if (this.stepBtn) {
      this.stepBtn.addEventListener("click", () => this.step());
    }

    if (this.autoBtn) {
      this.autoBtn.addEventListener("click", () => {
        if (this.isAutoWalking) this.stopAuto();
        else this.startAuto();
      });
    }

    if (this.fastBtn) {
      this.fastBtn.addEventListener("click", () => this.fastForward(1000));
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => this.reset());
    }

    if (this.speedInput) {
      this.speedInput.addEventListener("input", (e) => {
        this.speedMs = parseInt(e.target.value, 10);
        if (this.speedValEl) this.speedValEl.textContent = `${this.speedMs}ms`;
        if (this.isAutoWalking) this.startAuto();
      });
    }
  }

  step() {
    const neighbors = this.adj[this.currentNode];
    const nextNode = neighbors[Math.floor(Math.random() * neighbors.length)];

    if (this.currentNode === 0 && nextNode === 2) this.flux_1_to_3++;
    if (this.currentNode === 2 && nextNode === 0) this.flux_3_to_1++;

    this.currentNode = nextNode;
    this.totalSteps++;
    this.visitCounts[this.currentNode]++;

    this.updateUI();
    this.draw();
  }

  fastForward(steps = 1000) {
    this.stopAuto();
    for (let s = 0; s < steps; s++) {
      const neighbors = this.adj[this.currentNode];
      const nextNode = neighbors[Math.floor(Math.random() * neighbors.length)];

      if (this.currentNode === 0 && nextNode === 2) this.flux_1_to_3++;
      if (this.currentNode === 2 && nextNode === 0) this.flux_3_to_1++;

      this.currentNode = nextNode;
      this.totalSteps++;
      this.visitCounts[this.currentNode]++;
    }
    this.updateUI();
    this.draw();
  }

  startAuto() {
    this.isAutoWalking = true;
    if (this.autoTimer) clearInterval(this.autoTimer);
    if (this.autoIcon) this.autoIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    if (this.autoText) this.autoText.textContent = "Pause";
    if (this.autoBtn) {
      this.autoBtn.classList.remove("secondary");
      this.autoBtn.classList.add("primary");
    }

    this.autoTimer = setInterval(() => {
      this.step();
    }, this.speedMs);
  }

  stopAuto() {
    this.isAutoWalking = false;
    if (this.autoTimer) clearInterval(this.autoTimer);
    if (this.autoIcon) this.autoIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    if (this.autoText) this.autoText.textContent = "Auto Walk";
    if (this.autoBtn) {
      this.autoBtn.classList.add("secondary");
      this.autoBtn.classList.remove("primary");
    }
  }

  reset() {
    this.stopAuto();
    this.currentNode = 0;
    this.totalSteps = 0;
    this.visitCounts = [0, 0, 0, 0, 0];
    this.flux_1_to_3 = 0;
    this.flux_3_to_1 = 0;
    this.updateUI();
    this.draw();
  }

  updateUI() {
    if (this.currentNodeEl) {
      this.currentNodeEl.textContent = `Node ${this.nodes[this.currentNode].label}`;
    }
    if (this.totalStepsEl) {
      this.totalStepsEl.textContent = this.totalSteps.toLocaleString();
    }

    if (this.tableBodyEl) {
      let html = "";
      let totalVariation = 0;

      this.nodes.forEach((node, idx) => {
        const empProb = this.totalSteps > 0 ? this.visitCounts[idx] / this.totalSteps : 0;
        const theoryProb = node.theory;
        totalVariation += Math.abs(empProb - theoryProb);

        const isCurrent = idx === this.currentNode;
        html += `
          <tr class="${isCurrent ? 'highlight-active-row' : ''}">
            <th style="color: ${node.color}; font-weight: 700;">Node ${node.label}</th>
            <td>d = ${node.degree}</td>
            <td style="font-weight: 600;">${(theoryProb * 100).toFixed(2)}%</td>
            <td style="color: var(--accent-cyan); font-weight: 700;">${this.totalSteps > 0 ? (empProb * 100).toFixed(2) + '%' : '—'}</td>
            <td>${this.visitCounts[idx].toLocaleString()}</td>
          </tr>
        `;
      });

      this.tableBodyEl.innerHTML = html;

      if (this.tvErrorEl) {
        const tv = this.totalSteps > 0 ? 0.5 * totalVariation : 0;
        this.tvErrorEl.textContent = this.totalSteps > 0 ? tv.toFixed(4) : "0.0000";
      }

      if (this.flux13El) {
        if (this.totalSteps > 0) {
          const rate13 = ((this.flux_1_to_3 / this.totalSteps) * 100).toFixed(2);
          const rate31 = ((this.flux_3_to_1 / this.totalSteps) * 100).toFixed(2);
          this.flux13El.textContent = `${this.flux_1_to_3} (${rate13}%) vs ${this.flux_3_to_1} (${rate31}%)`;
        } else {
          this.flux13El.textContent = "0 vs 0 (Balanced)";
        }
      }
    }
  }

  drawEdgeBadge(ctx, x, y, text, isActive, activeText) {
    ctx.save();
    ctx.font = isActive ? "bold 11px 'Fira Code', monospace" : "10px 'Fira Code', monospace";
    const textToDraw = isActive ? activeText : text;
    const paddingX = 8;
    const textWidth = ctx.measureText(textToDraw).width;
    const boxW = textWidth + paddingX * 2;
    const boxH = 19;
    const boxX = x - boxW / 2;
    const boxY = y - boxH / 2;

    // Draw Pill Background
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(boxX, boxY, boxW, boxH, 9);
    } else {
      ctx.rect(boxX, boxY, boxW, boxH);
    }
    ctx.fillStyle = isActive ? "rgba(245, 158, 11, 0.22)" : "rgba(10, 15, 26, 0.88)";
    ctx.fill();

    ctx.strokeStyle = isActive ? "#f59e0b" : "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = isActive ? 1.8 : 1;
    ctx.stroke();

    // Text
    ctx.fillStyle = isActive ? "#fbbf24" : "#e2e8f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(textToDraw, x, y);
    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "rgba(18, 24, 40, 0.95)");
    bgGrad.addColorStop(1, "rgba(10, 15, 26, 0.98)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 1. Draw Edges with Active Outgoing Highlights & Probability Badges
    this.edges.forEach(([u, v]) => {
      const nodeU = this.nodes[u];
      const nodeV = this.nodes[v];

      const isCurrentU = u === this.currentNode;
      const isCurrentV = v === this.currentNode;
      const isActiveEdge = isCurrentU || isCurrentV;

      // Edge Line
      ctx.beginPath();
      ctx.moveTo(nodeU.x, nodeU.y);
      ctx.lineTo(nodeV.x, nodeV.y);
      ctx.strokeStyle = isActiveEdge ? "rgba(245, 158, 11, 0.85)" : "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = isActiveEdge ? 3.5 : 2;
      if (isActiveEdge) {
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 10;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Calculate Midpoint for Edge Probability Badge
      const mx = (nodeU.x + nodeV.x) / 2;
      const my = (nodeU.y + nodeV.y) / 2;

      // Probabilities P(u -> v) = 1/d(u), P(v -> u) = 1/d(v)
      const fracU = nodeU.degree === 4 ? "¼" : "½";
      const fracV = nodeV.degree === 4 ? "¼" : "½";
      const defaultText = `${fracU} ⇄ ${fracV}`;

      let activeText = defaultText;
      if (isCurrentU) {
        activeText = `P(${nodeU.label}→${nodeV.label}) = ${fracU}`;
      } else if (isCurrentV) {
        activeText = `P(${nodeV.label}→${nodeU.label}) = ${fracV}`;
      }

      this.drawEdgeBadge(ctx, mx, my, defaultText, isActiveEdge, activeText);
    });

    // 2. Draw Nodes
    this.nodes.forEach((node, idx) => {
      const isCurrent = idx === this.currentNode;

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? "rgba(245, 158, 11, 0.25)" : "rgba(24, 34, 56, 0.9)";
      ctx.fill();

      ctx.strokeStyle = isCurrent ? "#f59e0b" : node.color;
      ctx.lineWidth = isCurrent ? 3.5 : 2.5;
      if (isCurrent) {
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 18;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Node Label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px 'Outfit', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, node.x, node.y - 3);

      // Degree Badge
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "9px 'Fira Code', monospace";
      ctx.fillText(`d=${node.degree}`, node.x, node.y + 11);
    });

    // 3. Draw Active Walker Glow Ring on Current Node
    const currNode = this.nodes[this.currentNode];
    ctx.beginPath();
    ctx.arc(currNode.x, currNode.y, currNode.radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(245, 158, 11, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// =========================================================
// 9. PAGERANK POWER ITERATION SIMULATOR (MODULE 8)
// =========================================================
class PageRankSimulator {
  constructor() {
    this.canvas = document.getElementById("pagerankCanvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // UI elements
    this.dampingInput = document.getElementById("prDamping");
    this.dampingVal = document.getElementById("prDampingVal");
    this.stepBtn = document.getElementById("prStepBtn");
    this.runBtn = document.getElementById("prRunBtn");
    this.resetBtn = document.getElementById("prResetBtn");

    this.iterationEl = document.getElementById("valPrIteration");
    this.deltaEl = document.getElementById("valPrDelta");
    this.statusEl = document.getElementById("valPrStatus");
    this.lambda2El = document.getElementById("valPrLambda2");
    this.tableBodyEl = document.getElementById("pagerankTableBody");

    // Web Graph Definition (4 Pages: A, B, C, D)
    this.nodes = [
      { id: 0, label: "Page A", x: 130, y: 90, inDeg: 1, outDeg: 2, color: "#818cf8" },
      { id: 1, label: "Page B", x: 390, y: 80, inDeg: 1, outDeg: 1, color: "#818cf8" },
      { id: 2, label: "Page C", x: 370, y: 230, inDeg: 3, outDeg: 1, color: "#f59e0b" },
      { id: 3, label: "Page D", x: 130, y: 230, inDeg: 0, outDeg: 1, color: "#64748b" }
    ];

    // Directed Links: [source, target]
    this.links = [
      [0, 1], // A -> B
      [0, 2], // A -> C
      [1, 2], // B -> C
      [2, 0], // C -> A
      [3, 2]  // D -> C
    ];

    // Raw stochastic matrix P (4x4)
    this.rawP = [
      [0, 0.5, 0.5, 0],
      [0, 0, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 1, 0]
    ];

    this.damping = 0.85;
    this.iteration = 0;
    this.pi = [0.25, 0.25, 0.25, 0.25]; // Initial uniform state
    this.maxDelta = 0.0;
    this.isConverged = false;
    this.isRunning = false;
    this.timer = null;

    // Draggable Nodes State
    this.draggedNode = null;
    this.isDragging = false;

    this.initEvents();
    this.updateUI();
    this.draw();
  }

  initEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const onDown = (e) => {
      const pos = getPos(e);
      for (const node of this.nodes) {
        const dx = pos.x - node.x;
        const dy = pos.y - node.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 32) {
          this.draggedNode = node;
          this.isDragging = true;
          break;
        }
      }
    };

    const onMove = (e) => {
      if (!this.isDragging || !this.draggedNode) return;
      const pos = getPos(e);
      this.draggedNode.x = Math.max(35, Math.min(this.canvas.width - 35, pos.x));
      this.draggedNode.y = Math.max(35, Math.min(this.canvas.height - 35, pos.y));
      this.draw();
    };

    const onUp = () => {
      this.isDragging = false;
      this.draggedNode = null;
    };

    this.canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    this.canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    // Controls
    if (this.dampingInput) {
      this.dampingInput.addEventListener("input", (e) => {
        this.damping = parseFloat(e.target.value);
        if (this.dampingVal) this.dampingVal.textContent = this.damping.toFixed(2);
        if (this.lambda2El) this.lambda2El.textContent = this.damping.toFixed(4);
        this.reset();
      });
    }

    if (this.stepBtn) {
      this.stepBtn.addEventListener("click", () => this.step());
    }

    if (this.runBtn) {
      this.runBtn.addEventListener("click", () => {
        if (this.isRunning) this.stopAuto();
        else this.runToConvergence();
      });
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => this.reset());
    }
  }

  computeGoogleMatrix() {
    const N = 4;
    const d = this.damping;
    const G = [];
    for (let i = 0; i < N; i++) {
      const row = [];
      for (let j = 0; j < N; j++) {
        row.push(d * this.rawP[i][j] + (1 - d) / N);
      }
      G.push(row);
    }
    return G;
  }

  step() {
    const G = this.computeGoogleMatrix();
    const N = 4;
    const nextPi = [0, 0, 0, 0];

    // pi^(k+1) = pi^(k) * G
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        nextPi[j] += this.pi[i] * G[i][j];
      }
    }

    let delta = 0;
    for (let i = 0; i < N; i++) {
      delta += Math.abs(nextPi[i] - this.pi[i]);
    }

    this.pi = nextPi;
    this.iteration++;
    this.maxDelta = delta;

    if (delta < 1e-5) {
      this.isConverged = true;
      this.stopAuto();
    }

    this.updateUI();
    this.draw();
  }

  runToConvergence() {
    this.isRunning = true;
    if (this.runBtn) this.runBtn.textContent = "Pause Iteration";

    this.timer = setInterval(() => {
      if (this.isConverged || this.iteration >= 150) {
        this.stopAuto();
        return;
      }
      this.step();
    }, 80);
  }

  stopAuto() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    if (this.runBtn) this.runBtn.textContent = "Run to Convergence";
  }

  reset() {
    this.stopAuto();
    this.iteration = 0;
    this.pi = [0.25, 0.25, 0.25, 0.25];
    this.maxDelta = 0.0;
    this.isConverged = false;
    this.updateUI();
    this.draw();
  }

  updateUI() {
    if (this.iterationEl) this.iterationEl.textContent = this.iteration;
    if (this.deltaEl) this.deltaEl.textContent = this.maxDelta.toFixed(5);
    if (this.statusEl) {
      this.statusEl.textContent = this.isConverged ? "Converged (Tolerance < 10⁻⁵)" : (this.iteration > 0 ? "Iterating..." : "Ready (Uniform π⁽⁰⁾)");
      this.statusEl.style.color = this.isConverged ? "var(--accent-green)" : "var(--accent-cyan)";
    }

    if (this.tableBodyEl) {
      const ranked = this.nodes.map((node, idx) => ({
        ...node,
        score: this.pi[idx],
        origIdx: idx
      })).sort((a, b) => b.score - a.score);

      let html = "";
      ranked.forEach((item, rIdx) => {
        html += `
          <tr>
            <td style="font-weight: 700; color: ${rIdx === 0 ? '#f59e0b' : '#fff'};">#${rIdx + 1}</td>
            <th style="color: ${item.color}; font-weight: 700;">${item.label}</th>
            <td>${item.inDeg} in / ${item.outDeg} out</td>
            <td style="font-family: 'Fira Code', monospace; font-weight: 700; color: ${rIdx === 0 ? '#f59e0b' : 'var(--accent-cyan)'};">
              ${(item.score * 100).toFixed(2)}%
            </td>
          </tr>
        `;
      });
      this.tableBodyEl.innerHTML = html;
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "rgba(18, 24, 40, 0.95)");
    bgGrad.addColorStop(1, "rgba(10, 15, 26, 0.98)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 1. Draw Directed Hyperlinks with Arrows
    this.links.forEach(([u, v]) => {
      const nodeU = this.nodes[u];
      const nodeV = this.nodes[v];

      const dx = nodeV.x - nodeU.x;
      const dy = nodeV.y - nodeU.y;
      const angle = Math.atan2(dy, dx);

      const radU = 16 + this.pi[u] * 35;
      const radV = 16 + this.pi[v] * 35;

      const startX = nodeU.x + Math.cos(angle) * radU;
      const startY = nodeU.y + Math.sin(angle) * radU;
      const endX = nodeV.x - Math.cos(angle) * (radV + 5);
      const endY = nodeV.y - Math.sin(angle) * (radV + 5);

      ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const headLen = 9;
      ctx.fillStyle = "#818cf8";
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    });

    // 2. Draw Nodes with dynamic radii
    this.nodes.forEach((node, idx) => {
      const score = this.pi[idx];
      const radius = 16 + score * 35;
      const isTop = idx === 2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isTop ? "rgba(245, 158, 11, 0.25)" : "rgba(24, 34, 56, 0.9)";
      ctx.fill();

      ctx.strokeStyle = isTop ? "#f59e0b" : node.color;
      ctx.lineWidth = isTop ? 3.5 : 2.5;
      if (isTop) {
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 15;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px 'Outfit', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label.replace("Page ", ""), node.x, node.y - 3);

      ctx.fillStyle = isTop ? "#f59e0b" : "var(--accent-cyan)";
      ctx.font = "bold 10px 'Fira Code', monospace";
      ctx.fillText(`${(score * 100).toFixed(1)}%`, node.x, node.y + radius + 13);
    });
  }
}

// =========================================================
// 10. HIDDEN MARKOV MODEL & VITERBI DECODER (MODULE 8)
// =========================================================
class HMMSimulator {
  constructor() {
    this.canvas = document.getElementById("hmmTrellisCanvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // UI elements
    this.obsInput = document.getElementById("hmmObsInput");
    this.randomSeqBtn = document.getElementById("hmmRandomSeqBtn");
    this.decodeBtn = document.getElementById("hmmDecodeBtn");
    this.stepBtn = document.getElementById("hmmStepBtn");
    this.resetBtn = document.getElementById("hmmResetBtn");

    this.stepStatEl = document.getElementById("valHmmStep");
    this.logLikelihoodEl = document.getElementById("valHmmLogLikelihood");
    this.currentStateEl = document.getElementById("valHmmCurrentState");
    this.maxProbEl = document.getElementById("valHmmMaxProb");
    this.pathBadgeEl = document.getElementById("valHmmPathBadge");
    this.pathRibbonEl = document.getElementById("hmmPathRibbon");
    this.posteriorListEl = document.getElementById("hmmPosteriorList");
    this.posteriorTimeEl = document.getElementById("valHmmPosteriorTime");

    this.presetButtons = document.querySelectorAll(".preset-pills-row [data-hmm]");

    // Models Definition
    this.models = {
      casino: {
        name: "Dishonest Casino",
        states: ["Fair (F)", "Loaded (L)"],
        stateColors: ["#06b6d4", "#f59e0b"],
        vocab: ["1", "2", "3", "4", "5", "6"],
        pi: [0.5, 0.5],
        A: [
          [0.95, 0.05],
          [0.10, 0.90]
        ],
        B: [
          { "1": 1/6, "2": 1/6, "3": 1/6, "4": 1/6, "5": 1/6, "6": 1/6 },
          { "1": 0.10, "2": 0.10, "3": 0.10, "4": 0.10, "5": 0.10, "6": 0.50 }
        ],
        defaultSeq: ["6", "6", "6", "2", "6", "6", "1", "3", "6", "6"]
      },
      weather: {
        name: "Weather & Activity",
        states: ["Rainy (R)", "Sunny (S)"],
        stateColors: ["#818cf8", "#f59e0b"],
        vocab: ["Walk", "Shop", "Clean"],
        pi: [0.6, 0.4],
        A: [
          [0.7, 0.3],
          [0.4, 0.6]
        ],
        B: [
          { "Walk": 0.1, "Shop": 0.4, "Clean": 0.5 },
          { "Walk": 0.6, "Shop": 0.3, "Clean": 0.1 }
        ],
        defaultSeq: ["Walk", "Walk", "Shop", "Clean", "Clean", "Walk", "Shop", "Walk"]
      },
      cpg: {
        name: "DNA CpG Islands",
        states: ["Non-CpG (-)", "CpG Island (+)"],
        stateColors: ["#64748b", "#10b981"],
        vocab: ["A", "C", "G", "T"],
        pi: [0.5, 0.5],
        A: [
          [0.85, 0.15],
          [0.20, 0.80]
        ],
        B: [
          { "A": 0.30, "C": 0.20, "G": 0.20, "T": 0.30 },
          { "A": 0.15, "C": 0.35, "G": 0.35, "T": 0.15 }
        ],
        defaultSeq: ["A", "T", "C", "G", "C", "G", "G", "C", "A", "T"]
      }
    };

    this.currentModelKey = "casino";
    this.currentStep = 0;
    this.observations = [];
    this.trellis = [];
    this.viterbiPath = [];
    this.forwardAlphas = [];
    this.backwardBetas = [];
    this.posteriors = [];

    this.initEvents();
    this.loadPreset("casino");
  }

  initEvents() {
    this.presetButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        this.presetButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const key = btn.getAttribute("data-hmm");
        this.loadPreset(key);
      });
    });

    if (this.randomSeqBtn) {
      this.randomSeqBtn.addEventListener("click", () => this.generateRandomSequence());
    }

    if (this.decodeBtn) {
      this.decodeBtn.addEventListener("click", () => this.decodeFull());
    }

    if (this.stepBtn) {
      this.stepBtn.addEventListener("click", () => this.stepForward());
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => this.reset());
    }

    if (this.obsInput) {
      this.obsInput.addEventListener("change", () => this.parseObservations());
    }
  }

  loadPreset(key) {
    if (!this.models[key]) return;
    this.currentModelKey = key;
    const model = this.models[key];
    if (this.obsInput) {
      this.obsInput.value = model.defaultSeq.join(", ");
    }
    this.parseObservations();
  }

  parseObservations() {
    if (!this.obsInput) return;
    const model = this.models[this.currentModelKey];
    const raw = this.obsInput.value.split(/[,;\s]+/).filter(Boolean);

    const filtered = raw.filter(token => model.vocab.includes(token));
    this.observations = filtered.length > 0 ? filtered : [...model.defaultSeq];
    this.reset();
  }

  generateRandomSequence() {
    const model = this.models[this.currentModelKey];
    const T = 10;
    const seq = [];
    let state = Math.random() < model.pi[0] ? 0 : 1;

    for (let t = 0; t < T; t++) {
      const emitDict = model.B[state];
      let r = Math.random();
      for (const token of model.vocab) {
        r -= emitDict[token];
        if (r <= 0) {
          seq.push(token);
          break;
        }
      }
      state = Math.random() < model.A[state][0] ? 0 : 1;
    }

    this.obsInput.value = seq.join(", ");
    this.observations = seq;
    this.reset();
  }

  computeViterbiAndForward() {
    const model = this.models[this.currentModelKey];
    const N = model.states.length;
    const T = this.observations.length;

    this.trellis = [];
    this.forwardAlphas = [];
    this.backwardBetas = [];
    this.posteriors = [];

    // 1. Viterbi Initialization (t = 0)
    const obs0 = this.observations[0];
    const delta0 = [];
    const psi0 = [];
    const alpha0 = [];

    for (let i = 0; i < N; i++) {
      const emitProb = model.B[i][obs0] || 1e-6;
      delta0.push(model.pi[i] * emitProb);
      psi0.push(0);
      alpha0.push(model.pi[i] * emitProb);
    }

    this.trellis.push({ delta: delta0, psi: psi0 });
    this.forwardAlphas.push(alpha0);

    // 2. Forward & Viterbi Induction (t = 1 ... T-1)
    for (let t = 1; t < T; t++) {
      const obs = this.observations[t];
      const deltaT = [];
      const psiT = [];
      const alphaT = [];

      for (let j = 0; j < N; j++) {
        const emitProb = model.B[j][obs] || 1e-6;

        let maxVal = -1;
        let maxIdx = 0;
        for (let i = 0; i < N; i++) {
          const val = this.trellis[t - 1].delta[i] * model.A[i][j];
          if (val > maxVal) {
            maxVal = val;
            maxIdx = i;
          }
        }
        deltaT.push(maxVal * emitProb);
        psiT.push(maxIdx);

        let sumVal = 0;
        for (let i = 0; i < N; i++) {
          sumVal += this.forwardAlphas[t - 1][i] * model.A[i][j];
        }
        alphaT.push(sumVal * emitProb);
      }

      this.trellis.push({ delta: deltaT, psi: psiT });
      this.forwardAlphas.push(alphaT);
    }

    // 3. Backward Induction
    for (let t = 0; t < T; t++) {
      this.backwardBetas.push(new Array(N).fill(0));
    }
    for (let i = 0; i < N; i++) {
      this.backwardBetas[T - 1][i] = 1.0;
    }
    for (let t = T - 2; t >= 0; t--) {
      const nextObs = this.observations[t + 1];
      for (let i = 0; i < N; i++) {
        let sum = 0;
        for (let j = 0; j < N; j++) {
          sum += model.A[i][j] * (model.B[j][nextObs] || 1e-6) * this.backwardBetas[t + 1][j];
        }
        this.backwardBetas[t][i] = sum;
      }
    }

    // 4. Posteriors gamma_t(i) = alpha_t(i) * beta_t(i) / P(Y)
    for (let t = 0; t < T; t++) {
      const postT = [];
      let stepSum = 0;
      for (let i = 0; i < N; i++) {
        const val = this.forwardAlphas[t][i] * this.backwardBetas[t][i];
        postT.push(val);
        stepSum += val;
      }
      this.posteriors.push(postT.map(v => (stepSum > 0 ? v / stepSum : 1 / N)));
    }

    // 5. Viterbi Backtracking
    this.viterbiPath = new Array(T);
    let bestFinalIdx = 0;
    let maxFinalDelta = -1;
    for (let i = 0; i < N; i++) {
      if (this.trellis[T - 1].delta[i] > maxFinalDelta) {
        maxFinalDelta = this.trellis[T - 1].delta[i];
        bestFinalIdx = i;
      }
    }
    this.viterbiPath[T - 1] = bestFinalIdx;

    for (let t = T - 2; t >= 0; t--) {
      this.viterbiPath[t] = this.trellis[t + 1].psi[this.viterbiPath[t + 1]];
    }
  }

  stepForward() {
    if (this.trellis.length === 0) {
      this.computeViterbiAndForward();
    }
    if (this.currentStep < this.observations.length) {
      this.currentStep++;
      this.updateUI();
      this.draw();
    }
  }

  decodeFull() {
    this.computeViterbiAndForward();
    this.currentStep = this.observations.length;
    this.updateUI();
    this.draw();
  }

  reset() {
    this.currentStep = 0;
    this.trellis = [];
    this.viterbiPath = [];
    this.forwardAlphas = [];
    this.backwardBetas = [];
    this.posteriors = [];
    this.updateUI();
    this.draw();
  }

  updateUI() {
    const T = this.observations.length;
    const model = this.models[this.currentModelKey];

    if (this.stepStatEl) {
      this.stepStatEl.textContent = `${this.currentStep} / ${T}`;
    }

    if (this.currentStep === 0) {
      if (this.logLikelihoodEl) this.logLikelihoodEl.textContent = "—";
      if (this.currentStateEl) this.currentStateEl.textContent = "—";
      if (this.maxProbEl) this.maxProbEl.textContent = "—";
      if (this.pathBadgeEl) this.pathBadgeEl.textContent = "Status: Ready";
      if (this.pathRibbonEl) this.pathRibbonEl.innerHTML = `<em>Click "Decode Optimal Viterbi Path" or "Step Trellis Forward" to begin...</em>`;
      if (this.posteriorListEl) this.posteriorListEl.innerHTML = `<div class="empty-candidates-hint">Run decoder to see state posterior probabilities.</div>`;
      if (this.posteriorTimeEl) this.posteriorTimeEl.textContent = "Time: Step 1";
      return;
    }

    if (this.logLikelihoodEl && this.forwardAlphas.length >= this.currentStep) {
      const totalLikelihood = this.forwardAlphas[this.currentStep - 1].reduce((a, b) => a + b, 0);
      const logL = Math.log10(Math.max(1e-30, totalLikelihood)).toFixed(2);
      this.logLikelihoodEl.textContent = `10^(${logL}) (${totalLikelihood.toExponential(2)})`;
    }

    if (this.currentStateEl && this.viterbiPath.length >= this.currentStep) {
      const currStateIdx = this.viterbiPath[this.currentStep - 1];
      this.currentStateEl.textContent = model.states[currStateIdx];
      this.currentStateEl.style.color = model.stateColors[currStateIdx];
    }

    if (this.maxProbEl && this.trellis.length >= this.currentStep) {
      const maxDelta = Math.max(...this.trellis[this.currentStep - 1].delta);
      this.maxProbEl.textContent = maxDelta.toExponential(2);
    }

    if (this.pathBadgeEl) {
      this.pathBadgeEl.textContent = this.currentStep === T ? "Status: Decoded Complete ✓" : `Status: Step ${this.currentStep}`;
    }

    if (this.pathRibbonEl && this.viterbiPath.length >= this.currentStep) {
      let html = "";
      for (let t = 0; t < this.currentStep; t++) {
        const stateIdx = this.viterbiPath[t];
        const stateName = model.states[stateIdx];
        const stateColor = model.stateColors[stateIdx];
        const obs = this.observations[t];

        html += `
          <div class="hmm-step-chip" style="border-color: ${stateColor};">
            <span class="chip-time">t=${t + 1}</span>
            <span class="chip-obs">Y="${obs}"</span>
            <strong class="chip-state" style="color: ${stateColor};">${stateName}</strong>
          </div>
        `;
      }
      this.pathRibbonEl.innerHTML = html;
    }

    if (this.posteriorListEl && this.posteriors.length >= this.currentStep) {
      const t = this.currentStep - 1;
      if (this.posteriorTimeEl) this.posteriorTimeEl.textContent = `Time: t=${t + 1} (Obs: "${this.observations[t]}")`;

      let html = "";
      model.states.forEach((stateName, idx) => {
        const prob = this.posteriors[t][idx];
        const pct = (prob * 100).toFixed(1);
        const color = model.stateColors[idx];

        html += `
          <div class="candidate-row">
            <div class="cand-info">
              <span class="cand-word" style="color: ${color};">${stateName}</span>
              <span class="cand-pct" style="color: ${color};">${pct}%</span>
            </div>
            <div class="cand-bar-bg">
              <div class="cand-bar-fill" style="width: ${pct}%; background: ${color};"></div>
            </div>
          </div>
        `;
      });
      this.posteriorListEl.innerHTML = html;
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "rgba(18, 24, 40, 0.95)");
    bgGrad.addColorStop(1, "rgba(10, 15, 26, 0.98)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const model = this.models[this.currentModelKey];
    const N = model.states.length;
    const T = this.observations.length;

    const padLeft = 95;
    const padRight = 45;
    const padTop = 40;
    const padBottom = 45;

    const colWidth = (w - padLeft - padRight) / Math.max(1, T - 1);
    const rowHeight = (h - padTop - padBottom) / Math.max(1, N - 1);

    // Draw Observation Labels at top
    for (let t = 0; t < T; t++) {
      const x = padLeft + t * colWidth;
      ctx.fillStyle = t < this.currentStep ? "#f59e0b" : "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 11px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Y${t + 1}=${this.observations[t]}`, x, 22);
    }

    // Draw State Row Labels on left
    model.states.forEach((name, i) => {
      const y = padTop + i * rowHeight;
      ctx.fillStyle = model.stateColors[i];
      ctx.font = "bold 12px 'Outfit', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(name, padLeft - 16, y + 4);
    });

    // 1. Draw Trellis Transition Edges
    for (let t = 0; t < T - 1; t++) {
      const x1 = padLeft + t * colWidth;
      const x2 = padLeft + (t + 1) * colWidth;

      for (let i = 0; i < N; i++) {
        const y1 = padTop + i * rowHeight;
        for (let j = 0; j < N; j++) {
          const y2 = padTop + j * rowHeight;

          const isStepActive = t < this.currentStep - 1;
          const isViterbiEdge = this.viterbiPath.length >= this.currentStep &&
                                this.viterbiPath[t] === i &&
                                this.viterbiPath[t + 1] === j &&
                                t < this.currentStep - 1;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);

          if (isViterbiEdge) {
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 3.5;
            ctx.shadowColor = "#f59e0b";
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            ctx.strokeStyle = isStepActive ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

    // 2. Draw Trellis Nodes
    for (let t = 0; t < T; t++) {
      const x = padLeft + t * colWidth;
      const isReached = t < this.currentStep;

      for (let i = 0; i < N; i++) {
        const y = padTop + i * rowHeight;
        const isViterbiNode = this.viterbiPath.length >= this.currentStep &&
                              this.viterbiPath[t] === i &&
                              t < this.currentStep;

        ctx.beginPath();
        ctx.arc(x, y, isViterbiNode ? 16 : 11, 0, Math.PI * 2);
        ctx.fillStyle = isViterbiNode
          ? "rgba(245, 158, 11, 0.3)"
          : (isReached ? "rgba(24, 34, 56, 0.9)" : "rgba(10, 15, 26, 0.8)");
        ctx.fill();

        ctx.strokeStyle = isViterbiNode ? "#f59e0b" : (isReached ? model.stateColors[i] : "rgba(255, 255, 255, 0.15)");
        ctx.lineWidth = isViterbiNode ? 3.5 : 2;
        if (isViterbiNode) {
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 15;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (isReached && this.trellis.length > t) {
          const deltaVal = this.trellis[t].delta[i];
          const expText = deltaVal > 0 ? `10^${Math.round(Math.log10(deltaVal))}` : "0";
          ctx.fillStyle = isViterbiNode ? "#f59e0b" : "#94a3b8";
          ctx.font = "8px 'Fira Code', monospace";
          ctx.textAlign = "center";
          ctx.fillText(expText, x, y + 23);
        }
      }
    }
  }
}

// =========================================================
// 11. CONTINUOUS-TIME MARKOV CHAIN ENGINE (MODULE 9)
// =========================================================
class CTMCSimulator {
  constructor() {
    this.canvas = document.getElementById("ctmcCanvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // UI elements
    this.presetButtons = document.querySelectorAll(".preset-pills-row [data-ctmc]");
    this.modeOdeBtn = document.getElementById("ctmcModeOde");
    this.modeGillespieBtn = document.getElementById("ctmcModeGillespie");
    this.ratesContainer = document.getElementById("ctmcRatesContainer");
    this.runBtn = document.getElementById("ctmcRunBtn");
    this.stepGillespieBtn = document.getElementById("ctmcStepGillespieBtn");
    this.resetBtn = document.getElementById("ctmcResetBtn");
    this.timeSlider = document.getElementById("ctmcTimeSlider");
    this.timeValEl = document.getElementById("ctmcTimeVal");

    this.currentTimeEl = document.getElementById("valCtmcCurrentTime");
    this.modeStatusEl = document.getElementById("valCtmcModeStatus");
    this.tableBodyEl = document.getElementById("ctmcTableBody");
    this.residualEl = document.getElementById("valCtmcResidual");
    this.canvasHintEl = document.getElementById("ctmcCanvasHint");

    // Models Definition
    this.models = {
      chemical: {
        name: "3-State Chemical Reaction Network",
        states: ["State A", "State B", "State C"],
        stateColors: ["#06b6d4", "#818cf8", "#f59e0b"],
        p0: [1.0, 0.0, 0.0],
        rates: { q_AB: 2.0, q_AC: 1.0, q_BA: 1.0, q_BC: 3.0, q_CA: 2.0, q_CB: 2.0 },
        rateDefs: [
          { key: "q_AB", label: "Rate A→B:", min: 0.2, max: 5.0, step: 0.2 },
          { key: "q_AC", label: "Rate A→C:", min: 0.2, max: 5.0, step: 0.2 },
          { key: "q_BA", label: "Rate B→A:", min: 0.2, max: 5.0, step: 0.2 },
          { key: "q_BC", label: "Rate B→C:", min: 0.2, max: 5.0, step: 0.2 },
          { key: "q_CA", label: "Rate C→A:", min: 0.2, max: 5.0, step: 0.2 },
          { key: "q_CB", label: "Rate C→B:", min: 0.2, max: 5.0, step: 0.2 }
        ]
      },
      queue: {
        name: "M/M/1/3 Queue (Buffer K=3)",
        states: ["0 in queue", "1 in queue", "2 in queue", "3 (Full)"],
        stateColors: ["#10b981", "#06b6d4", "#f59e0b", "#ec4899"],
        p0: [1.0, 0.0, 0.0, 0.0],
        rates: { lambda: 2.0, mu: 3.0 },
        rateDefs: [
          { key: "lambda", label: "Arrival Rate λ (Birth):", min: 0.5, max: 5.0, step: 0.2 },
          { key: "mu", label: "Service Rate μ (Death):", min: 0.5, max: 5.0, step: 0.2 }
        ]
      },
      telegraph: {
        name: "2-State Telegraph Noise / Ion Channel",
        states: ["Open (1)", "Closed (0)"],
        stateColors: ["#10b981", "#ef4444"],
        p0: [1.0, 0.0],
        rates: { alpha: 1.5, beta: 2.5 },
        rateDefs: [
          { key: "alpha", label: "Opening Rate α (0→1):", min: 0.2, max: 5.0, step: 0.2 },
          { key: "beta", label: "Closing Rate β (1→0):", min: 0.2, max: 5.0, step: 0.2 }
        ]
      }
    };

    this.currentModelKey = "chemical";
    this.mode = "ode";
    this.tMax = 5.0;
    this.currentTime = 1.5;
    this.isAnimating = false;
    this.animTimer = null;

    this.gillespieEvents = [];
    this.gillespieCurrentState = 0;
    this.gillespieCurrentTime = 0.0;

    this.initEvents();
    this.loadPreset("chemical");
  }

  initEvents() {
    this.presetButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        this.presetButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const key = btn.getAttribute("data-ctmc");
        this.loadPreset(key);
      });
    });

    if (this.modeOdeBtn) {
      this.modeOdeBtn.addEventListener("click", () => this.setMode("ode"));
    }
    if (this.modeGillespieBtn) {
      this.modeGillespieBtn.addEventListener("click", () => this.setMode("gillespie"));
    }

    if (this.timeSlider) {
      this.timeSlider.addEventListener("input", (e) => {
        this.currentTime = parseFloat(e.target.value);
        if (this.timeValEl) this.timeValEl.textContent = `${this.currentTime.toFixed(2)}s`;
        if (this.currentTimeEl) this.currentTimeEl.textContent = `t = ${this.currentTime.toFixed(2)}s`;
        this.updateUI();
        this.draw();
      });
    }

    if (this.runBtn) {
      this.runBtn.addEventListener("click", () => {
        if (this.isAnimating) this.stopAnimation();
        else this.startAnimation();
      });
    }

    if (this.stepGillespieBtn) {
      this.stepGillespieBtn.addEventListener("click", () => {
        this.setMode("gillespie");
        this.stepGillespie();
      });
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => this.reset());
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (this.modeOdeBtn) this.modeOdeBtn.classList.toggle("active", mode === "ode");
    if (this.modeGillespieBtn) this.modeGillespieBtn.classList.toggle("active", mode === "gillespie");
    if (this.modeStatusEl) {
      this.modeStatusEl.textContent = mode === "ode" ? "Continuous ODE (P(t)=eᵗᑫ)" : "Gillespie SSA (Exact Jumps)";
      this.modeStatusEl.style.color = mode === "ode" ? "var(--accent-cyan)" : "var(--accent-amber)";
    }
    if (this.canvasHintEl) {
      this.canvasHintEl.textContent = mode === "ode" ? "Continuous Kolmogorov Probability Curves p(t)" : "Gillespie Discrete Event Sample Path X(t)";
    }
    this.draw();
  }

  loadPreset(key) {
    if (!this.models[key]) return;
    this.currentModelKey = key;
    this.renderRateControls();
    this.reset();
  }

  renderRateControls() {
    if (!this.ratesContainer) return;
    const model = this.models[this.currentModelKey];
    let html = "";

    model.rateDefs.forEach(def => {
      const val = model.rates[def.key];
      html += `
        <div class="mcmc-input-group rate-slider-item">
          <label for="rate_${def.key}">${def.label}</label>
          <input type="range" id="rate_${def.key}" min="${def.min}" max="${def.max}" step="${def.step}" value="${val}">
          <span id="rateVal_${def.key}">${val.toFixed(1)}</span>
        </div>
      `;
    });

    this.ratesContainer.innerHTML = html;

    model.rateDefs.forEach(def => {
      const input = document.getElementById(`rate_${def.key}`);
      const valSpan = document.getElementById(`rateVal_${def.key}`);
      if (input) {
        input.addEventListener("input", (e) => {
          const v = parseFloat(e.target.value);
          model.rates[def.key] = v;
          if (valSpan) valSpan.textContent = v.toFixed(1);
          if (this.mode === "gillespie") this.initGillespie();
          this.updateUI();
          this.draw();
        });
      }
    });
  }

  getGeneratorMatrix() {
    const model = this.models[this.currentModelKey];
    const key = this.currentModelKey;

    if (key === "chemical") {
      const r = model.rates;
      const qA = r.q_AB + r.q_AC;
      const qB = r.q_BA + r.q_BC;
      const qC = r.q_CA + r.q_CB;
      return [
        [-qA, r.q_AB, r.q_AC],
        [r.q_BA, -qB, r.q_BC],
        [r.q_CA, r.q_CB, -qC]
      ];
    } else if (key === "queue") {
      const lam = model.rates.lambda;
      const mu = model.rates.mu;
      return [
        [-lam, lam, 0, 0],
        [mu, -(lam + mu), lam, 0],
        [0, mu, -(lam + mu), lam],
        [0, 0, mu, -mu]
      ];
    } else if (key === "telegraph") {
      const a = model.rates.alpha;
      const b = model.rates.beta;
      return [
        [-b, b],
        [a, -a]
      ];
    }
  }

  matrixExp(Q, t) {
    const N = Q.length;
    let result = [];
    let term = [];

    for (let i = 0; i < N; i++) {
      result.push(new Array(N).fill(0));
      term.push(new Array(N).fill(0));
      result[i][i] = 1.0;
      term[i][i] = 1.0;
    }

    const tQ = [];
    for (let i = 0; i < N; i++) {
      tQ.push(new Array(N).fill(0));
      for (let j = 0; j < N; j++) {
        tQ[i][j] = Q[i][j] * t;
      }
    }

    for (let k = 1; k <= 35; k++) {
      const nextTerm = [];
      for (let i = 0; i < N; i++) {
        nextTerm.push(new Array(N).fill(0));
        for (let j = 0; j < N; j++) {
          let sum = 0;
          for (let m = 0; m < N; m++) {
            sum += term[i][m] * tQ[m][j];
          }
          nextTerm[i][j] = sum / k;
          result[i][j] += nextTerm[i][j];
        }
      }
      term = nextTerm;
    }

    return result;
  }

  computeStationary(Q) {
    const N = Q.length;
    const M = [];
    for (let i = 0; i < N; i++) {
      M.push(new Array(N).fill(0));
      for (let j = 0; j < N; j++) {
        M[i][j] = Q[j][i];
      }
    }
    for (let j = 0; j < N; j++) {
      M[N - 1][j] = 1.0;
    }

    const b = new Array(N).fill(0);
    b[N - 1] = 1.0;

    const invM = MarkovCore.invertMatrix(M);
    if (!invM) return new Array(N).fill(1 / N);

    const pi = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        pi[i] += invM[i][j] * b[j];
      }
    }
    return pi;
  }

  initGillespie() {
    this.gillespieCurrentTime = 0.0;
    this.gillespieCurrentState = 0;
    this.gillespieEvents = [{ t: 0.0, state: 0, dt: 0.0 }];
  }

  stepGillespie() {
    if (this.gillespieEvents.length === 0) this.initGillespie();

    const Q = this.getGeneratorMatrix();
    const N = Q.length;
    const currState = this.gillespieCurrentState;
    const qi = -Q[currState][currState];

    if (qi <= 1e-9) return;

    const tau = -Math.log(Math.max(1e-9, Math.random())) / qi;
    this.gillespieCurrentTime += tau;

    let r = Math.random() * qi;
    let nextState = currState;
    for (let j = 0; j < N; j++) {
      if (j !== currState) {
        r -= Q[currState][j];
        if (r <= 0) {
          nextState = j;
          break;
        }
      }
    }

    this.gillespieCurrentState = nextState;
    this.gillespieEvents.push({
      t: this.gillespieCurrentTime,
      state: nextState,
      dt: tau
    });

    this.currentTime = Math.min(this.tMax, this.gillespieCurrentTime);
    if (this.timeSlider) this.timeSlider.value = this.currentTime;
    if (this.timeValEl) this.timeValEl.textContent = `${this.currentTime.toFixed(2)}s`;
    if (this.currentTimeEl) this.currentTimeEl.textContent = `t = ${this.currentTime.toFixed(2)}s`;

    this.updateUI();
    this.draw();
  }

  startAnimation() {
    this.isAnimating = true;
    if (this.runBtn) {
      this.runBtn.textContent = "Pause Animation";
      this.runBtn.classList.remove("primary");
      this.runBtn.classList.add("secondary");
    }

    const dt = 0.04;
    this.animTimer = setInterval(() => {
      if (this.mode === "ode") {
        this.currentTime += dt;
        if (this.currentTime >= this.tMax) {
          this.currentTime = this.tMax;
          this.stopAnimation();
        }
        if (this.timeSlider) this.timeSlider.value = this.currentTime;
        if (this.timeValEl) this.timeValEl.textContent = `${this.currentTime.toFixed(2)}s`;
        if (this.currentTimeEl) this.currentTimeEl.textContent = `t = ${this.currentTime.toFixed(2)}s`;
        this.updateUI();
        this.draw();
      } else {
        this.stepGillespie();
        if (this.gillespieCurrentTime >= this.tMax) {
          this.stopAnimation();
        }
      }
    }, 40);
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animTimer) clearInterval(this.animTimer);
    if (this.runBtn) {
      this.runBtn.textContent = "Animate Time Flow";
      this.runBtn.classList.remove("secondary");
      this.runBtn.classList.add("primary");
    }
  }

  reset() {
    this.stopAnimation();
    this.currentTime = 1.5;
    if (this.timeSlider) this.timeSlider.value = 1.5;
    if (this.timeValEl) this.timeValEl.textContent = "1.50s";
    if (this.currentTimeEl) this.currentTimeEl.textContent = "t = 1.50s";
    this.initGillespie();
    this.updateUI();
    this.draw();
  }

  updateUI() {
    const model = this.models[this.currentModelKey];
    const Q = this.getGeneratorMatrix();
    const N = Q.length;

    const Pt = this.matrixExp(Q, this.currentTime);
    const p0 = model.p0;
    const pt = new Array(N).fill(0);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        pt[j] += p0[i] * Pt[i][j];
      }
    }

    const pi = this.computeStationary(Q);

    let maxResidual = 0;
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let i = 0; i < N; i++) {
        sum += pi[i] * Q[i][j];
      }
      maxResidual = Math.max(maxResidual, Math.abs(sum));
    }
    if (this.residualEl) this.residualEl.textContent = maxResidual.toFixed(5);

    if (this.tableBodyEl) {
      let html = "";
      model.states.forEach((name, i) => {
        const qi = -Q[i][i];
        const sojourn = qi > 0 ? (1 / qi).toFixed(2) + "s" : "∞ (Absorbing)";
        const liveProb = (pt[i] * 100).toFixed(1) + "%";
        const statProb = (pi[i] * 100).toFixed(1) + "%";
        const color = model.stateColors[i];

        html += `
          <tr>
            <th style="color: ${color}; font-weight: 700;">${name}</th>
            <td style="font-family: 'Fira Code', monospace;">q = ${qi.toFixed(1)}</td>
            <td style="font-family: 'Fira Code', monospace; color: var(--text-dim);">${sojourn}</td>
            <td style="font-family: 'Fira Code', monospace; font-weight: 700; color: ${color};">${liveProb}</td>
            <td style="font-family: 'Fira Code', monospace; color: var(--accent-cyan); font-weight: 700;">${statProb}</td>
          </tr>
        `;
      });
      this.tableBodyEl.innerHTML = html;
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "rgba(18, 24, 40, 0.95)");
    bgGrad.addColorStop(1, "rgba(10, 15, 26, 0.98)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const model = this.models[this.currentModelKey];
    const Q = this.getGeneratorMatrix();
    const N = Q.length;

    const padLeft = 45;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 35;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    if (this.mode === "ode") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 1;
      for (let yVal = 0.25; yVal <= 1.0; yVal += 0.25) {
        const y = padTop + plotH * (1 - yVal);
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "9px 'Fira Code', monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${(yVal * 100).toFixed(0)}%`, padLeft - 6, y + 3);
      }

      for (let t = 0; t <= this.tMax; t += 1.0) {
        const x = padLeft + (t / this.tMax) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, padTop + plotH);
        ctx.lineTo(x, padTop + plotH + 5);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "9px 'Fira Code', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${t.toFixed(0)}s`, x, padTop + plotH + 16);
      }

      const numSamples = 60;
      const traj = [];
      for (let i = 0; i < N; i++) traj.push([]);

      for (let s = 0; s <= numSamples; s++) {
        const t = (s / numSamples) * this.tMax;
        const Pt = this.matrixExp(Q, t);
        for (let j = 0; j < N; j++) {
          let prob = 0;
          for (let i = 0; i < N; i++) {
            prob += model.p0[i] * Pt[i][j];
          }
          traj[j].push({ t, prob });
        }
      }

      traj.forEach((pts, j) => {
        ctx.beginPath();
        ctx.strokeStyle = model.stateColors[j];
        ctx.lineWidth = 2.5;

        pts.forEach((pt, idx) => {
          const x = padLeft + (pt.t / this.tMax) * plotW;
          const y = padTop + plotH * (1 - pt.prob);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });

      const needleX = padLeft + (this.currentTime / this.tMax) * plotW;
      ctx.beginPath();
      ctx.moveTo(needleX, padTop);
      ctx.lineTo(needleX, padTop + plotH);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      const currPt = this.matrixExp(Q, this.currentTime);
      for (let j = 0; j < N; j++) {
        let prob = 0;
        for (let i = 0; i < N; i++) prob += model.p0[i] * currPt[i][j];

        const y = padTop + plotH * (1 - prob);
        ctx.beginPath();
        ctx.arc(needleX, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = model.stateColors[j];
        ctx.shadowColor = model.stateColors[j];
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 1;

      model.states.forEach((name, i) => {
        const y = padTop + (i / Math.max(1, N - 1)) * plotH;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.fillStyle = model.stateColors[i];
        ctx.font = "bold 10px 'Outfit', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(name.split(" ")[0], padLeft - 6, y + 4);
      });

      if (this.gillespieEvents.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3;

        let prevX = padLeft;
        let prevY = padTop + (this.gillespieEvents[0].state / Math.max(1, N - 1)) * plotH;
        ctx.moveTo(prevX, prevY);

        for (let i = 1; i < this.gillespieEvents.length; i++) {
          const ev = this.gillespieEvents[i];
          const currX = padLeft + Math.min(1.0, ev.t / this.tMax) * plotW;
          const currY = padTop + (ev.state / Math.max(1, N - 1)) * plotH;

          ctx.lineTo(currX, prevY);
          ctx.lineTo(currX, currY);

          prevX = currX;
          prevY = currY;
        }

        const endX = padLeft + Math.min(1.0, this.currentTime / this.tMax) * plotW;
        ctx.lineTo(endX, prevY);
        ctx.stroke();
      }
    }
  }
}

// Initial Boot of advanced simulators
window.addEventListener("DOMContentLoaded", () => {
  initMatrixPowerControls();
  initGamblersRuin();
  window.mcmcSim = new MCMCSimulator();
  window.lattice3dSim = new Lattice3DSimulator();
  window.graphWalkSim = new UndirectedGraphWalkSimulator();
  window.pageRankSim = new PageRankSimulator();
  window.hmmSim = new HMMSimulator();
  window.ctmcSim = new CTMCSimulator();
  initMarkovTextGenerator();
  initQuiz();
  initScrollSpy();
});
