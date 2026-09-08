/**
 * SIMULATOR GRAPH - Interactive Canvas State Diagram & Monte Carlo Particle Walker
 */

class MarkovGraphSimulator {
  constructor() {
    this.canvas = document.getElementById("graphCanvas");
    this.ctx = this.canvas.getContext("2d");

    // State data
    this.currentPresetKey = "weather";
    this.labels = [];
    this.colors = [];
    this.nodes = [];
    this.matrix = [];
    this.initialDistribution = [];

    // Monte Carlo walker state
    this.currentState = 0;
    this.stepCount = 0;
    this.visitCounts = [];
    this.isAutoRunning = false;
    this.autoTimer = null;
    this.stepSpeedMs = 400;

    // Animation walker particle
    this.particle = null; // { fromState, toState, progress: 0..1 }

    // Mouse drag interaction
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };

    this.initDOM();
    this.loadPreset("weather");
    this.setupEventListeners();
    this.startRenderLoop();
  }

  initDOM() {
    this.simCurrentStateEl = document.getElementById("simCurrentState");
    this.simStepCountEl = document.getElementById("simStepCount");
    this.matrixEditorEl = document.getElementById("matrixEditor");
    this.initDistEditorEl = document.getElementById("initDistEditor");
    this.normalizeMuBtn = document.getElementById("normalizeMuBtn");
    this.freqBarsEl = document.getElementById("freqBars");
    this.simStepBtn = document.getElementById("simStepBtn");
    this.simAutoBtn = document.getElementById("simAutoBtn");
    this.simAutoText = document.getElementById("simAutoText");
    this.simAutoIcon = document.getElementById("simAutoIcon");
    this.simResetBtn = document.getElementById("simResetBtn");
    this.simSpeedInput = document.getElementById("simSpeed");
    this.speedValueEl = document.getElementById("speedValue");
  }

  loadPreset(key) {
    const data = MarkovCore.presets[key];
    if (!data) return;

    this.currentPresetKey = key;
    this.labels = [...data.labels];
    this.colors = [...data.colors];
    this.matrix = MarkovCore.cloneMatrix(data.matrix);

    const k = this.labels.length;
    // Default initial distribution: 100% on S0
    this.initialDistribution = new Array(k).fill(0);
    this.initialDistribution[0] = 1.0;

    // Initialize node positions
    this.nodes = data.positions.map((pos, idx) => ({
      id: idx,
      label: this.labels[idx],
      color: this.colors[idx] || "#6366f1",
      x: pos.x,
      y: pos.y,
      radius: 26
    }));

    this.renderInitialDistributionEditor();
    this.renderMatrixEditor();
    this.resetSimulation();
    this.updateStatsAndBars();
  }

  resetSimulation() {
    this.stopAutoRun();
    // Sample initial state from user-defined initial distribution mu0
    const sampledX0 = MarkovCore.sampleInitialState(this.initialDistribution);
    this.currentState = sampledX0;
    this.stepCount = 0;
    this.visitCounts = new Array(this.nodes.length).fill(0);
    this.visitCounts[sampledX0] = 1;
    this.particle = null;

    this.simCurrentStateEl.textContent = `${this.nodes[sampledX0].label} (S${sampledX0})`;
    this.simStepCountEl.textContent = "0 (X₀ sampled)";
    this.updateStatsAndBars();
  }

  step() {
    const nextState = MarkovCore.sampleNextState(this.matrix, this.currentState);

    // Launch walker animation
    this.particle = {
      fromState: this.currentState,
      toState: nextState,
      progress: 0
    };

    this.currentState = nextState;
    this.stepCount++;
    this.visitCounts[nextState]++;

    this.simCurrentStateEl.textContent = `${this.nodes[nextState].label} (S${nextState})`;
    this.simStepCountEl.textContent = this.stepCount;

    this.updateStatsAndBars();
  }

  toggleAutoRun() {
    if (this.isAutoRunning) {
      this.stopAutoRun();
    } else {
      this.startAutoRun();
    }
  }

  startAutoRun() {
    this.isAutoRunning = true;
    this.simAutoText.textContent = "Pause";
    this.simAutoBtn.classList.add("primary");
    this.simAutoBtn.classList.remove("secondary");
    this.simAutoIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;

    this.autoTimer = setInterval(() => {
      this.step();
    }, this.stepSpeedMs);
  }

  stopAutoRun() {
    this.isAutoRunning = false;
    if (this.autoTimer) clearInterval(this.autoTimer);
    if (this.simAutoText) {
      this.simAutoText.textContent = "Auto Run";
      this.simAutoBtn.classList.remove("primary");
      this.simAutoBtn.classList.add("secondary");
      this.simAutoIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    }
  }

  updateStatsAndBars() {
    if (!this.freqBarsEl) return;
    const totalSteps = Math.max(1, this.stepCount);
    const theoreticalPi = MarkovCore.computeStationaryDistribution(this.matrix);

    let html = "";
    this.nodes.forEach((node, i) => {
      const empiricalPct = ((this.visitCounts[i] / totalSteps) * 100).toFixed(1);
      const theoryPct = ((theoreticalPi[i] || 0) * 100).toFixed(1);

      html += `
        <div class="freq-row">
          <span class="freq-name">${node.label}:</span>
          <div class="freq-bar-bg" title="Empirical: ${empiricalPct}% | Theory: ${theoryPct}%">
            <div class="freq-bar-fill" style="width: ${empiricalPct}%; background: ${node.color};"></div>
          </div>
          <span class="freq-pct">${empiricalPct}% <span style="color:var(--text-dim);font-size:0.68rem;">(π:${theoryPct}%)</span></span>
        </div>
      `;
    });
    this.freqBarsEl.innerHTML = html;
  }

  renderInitialDistributionEditor() {
    if (!this.initDistEditorEl) return;
    const k = this.nodes.length;
    let html = `<div class="mu-vector-grid">`;
    for (let i = 0; i < k; i++) {
      const val = (this.initialDistribution[i] || 0).toFixed(2);
      const color = this.nodes[i].color || "#6366f1";
      html += `
        <div class="mu-cell">
          <label style="color: ${color};">P(X₀=S${i})</label>
          <input type="number" step="0.05" min="0" max="1" class="mu-cell-input" data-state="${i}" value="${val}">
        </div>
      `;
    }
    html += `</div>`;
    this.initDistEditorEl.innerHTML = html;

    // Attach change handlers to initial distribution inputs
    this.initDistEditorEl.querySelectorAll(".mu-cell-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const stateIdx = parseInt(e.target.dataset.state, 10);
        let val = parseFloat(e.target.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 1) val = 1;
        this.initialDistribution[stateIdx] = val;
        this.autoNormalizeInitialDistribution();
        this.resetSimulation();
      });
    });
  }

  autoNormalizeInitialDistribution() {
    const sum = this.initialDistribution.reduce((a, b) => a + b, 0);
    if (sum > 0 && Math.abs(sum - 1.0) > 1e-4) {
      for (let i = 0; i < this.initialDistribution.length; i++) {
        this.initialDistribution[i] = parseFloat((this.initialDistribution[i] / sum).toFixed(2));
      }
      const newSum = this.initialDistribution.reduce((a, b) => a + b, 0);
      this.initialDistribution[this.initialDistribution.length - 1] += parseFloat((1.0 - newSum).toFixed(2));
      this.renderInitialDistributionEditor();
    }
  }

  setInitialDistributionPreset(type) {
    const k = this.nodes.length;
    if (type === "s0") {
      this.initialDistribution = new Array(k).fill(0);
      this.initialDistribution[0] = 1.0;
    } else if (type === "uniform") {
      const unif = parseFloat((1.0 / k).toFixed(2));
      this.initialDistribution = new Array(k).fill(unif);
      const sum = this.initialDistribution.reduce((a, b) => a + b, 0);
      this.initialDistribution[k - 1] += parseFloat((1.0 - sum).toFixed(2));
    } else if (type === "random") {
      let rands = Array.from({ length: k }, () => Math.random() + 0.1);
      const sum = rands.reduce((a, b) => a + b, 0);
      this.initialDistribution = rands.map(r => parseFloat((r / sum).toFixed(2)));
      const newSum = this.initialDistribution.reduce((a, b) => a + b, 0);
      this.initialDistribution[k - 1] += parseFloat((1.0 - newSum).toFixed(2));
    }

    this.renderInitialDistributionEditor();
    this.resetSimulation();
  }

  renderMatrixEditor() {
    const k = this.nodes.length;
    let html = `<table class="matrix-table"><thead><tr><th>P</th>`;
    for (let j = 0; j < k; j++) {
      html += `<th>S${j}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let i = 0; i < k; i++) {
      html += `<tr><th>S${i}</th>`;
      for (let j = 0; j < k; j++) {
        const val = this.matrix[i][j].toFixed(2);
        html += `<td><input type="number" step="0.05" min="0" max="1" class="mat-cell-input" data-row="${i}" data-col="${j}" value="${val}"></td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    this.matrixEditorEl.innerHTML = html;

    // Attach input listeners
    this.matrixEditorEl.querySelectorAll(".mat-cell-input").forEach(input => {
      input.addEventListener("change", (e) => {
        const r = parseInt(e.target.dataset.row, 10);
        const c = parseInt(e.target.dataset.col, 10);
        let val = parseFloat(e.target.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 1) val = 1;
        this.matrix[r][c] = val;

        // Re-normalize row if necessary
        this.normalizeMatrixRow(r);
        this.updateStatsAndBars();
        if (window.updateMatrixPowerViewer) {
          window.updateMatrixPowerViewer(this.matrix, this.labels);
        }
      });
    });
  }

  normalizeMatrixRow(rowIndex) {
    const row = this.matrix[rowIndex];
    const sum = row.reduce((a, b) => a + b, 0);
    if (sum > 0 && Math.abs(sum - 1.0) > 1e-4) {
      for (let j = 0; j < row.length; j++) {
        row[j] = parseFloat((row[j] / sum).toFixed(2));
      }
      // Fix residual rounding error on last element
      const newSum = row.reduce((a, b) => a + b, 0);
      row[row.length - 1] += parseFloat((1.0 - newSum).toFixed(2));
      this.renderMatrixEditor();
    }
  }

  setupEventListeners() {
    // Presets (Scoped to Simulation 01)
    document.querySelectorAll("#simulator-section .btn-preset").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll("#simulator-section .btn-preset").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        if (btn.dataset.preset) {
          this.loadPreset(btn.dataset.preset);
        }
      });
    });

    // Initial Distribution Presets
    document.querySelectorAll(".btn-chip-sm[data-dist]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".btn-chip-sm[data-dist]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.setInitialDistributionPreset(btn.dataset.dist);
      });
    });

    // Normalize initial distribution button
    if (this.normalizeMuBtn) {
      this.normalizeMuBtn.addEventListener("click", () => {
        this.autoNormalizeInitialDistribution();
        this.resetSimulation();
      });
    }

    // Step, Auto, Reset
    this.simStepBtn.addEventListener("click", () => this.step());
    this.simAutoBtn.addEventListener("click", () => this.toggleAutoRun());
    this.simResetBtn.addEventListener("click", () => this.resetSimulation());

    // Speed Slider
    this.simSpeedInput.addEventListener("input", (e) => {
      this.stepSpeedMs = 1050 - parseInt(e.target.value, 10);
      this.speedValueEl.textContent = `${this.stepSpeedMs}ms`;
      if (this.isAutoRunning) {
        this.stopAutoRun();
        this.startAutoRun();
      }
    });

    // Canvas Dragging (Mouse & Touch)
    const getCanvasPos = (e) => {
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

    const handlePointerDown = (e) => {
      const pos = getCanvasPos(e);
      for (let node of this.nodes) {
        const dist = Math.hypot(pos.x - node.x, pos.y - node.y);
        if (dist <= node.radius + 8) {
          this.draggedNode = node;
          this.dragOffset = { x: pos.x - node.x, y: pos.y - node.y };
          break;
        }
      }
    };

    const handlePointerMove = (e) => {
      if (!this.draggedNode) return;
      const pos = getCanvasPos(e);
      this.draggedNode.x = Math.max(35, Math.min(this.canvas.width - 35, pos.x - this.dragOffset.x));
      this.draggedNode.y = Math.max(35, Math.min(this.canvas.height - 35, pos.y - this.dragOffset.y));
    };

    const handlePointerUp = () => {
      this.draggedNode = null;
    };

    this.canvas.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    this.canvas.addEventListener("touchstart", handlePointerDown, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("touchend", handlePointerUp);
  }

  startRenderLoop() {
    const render = () => {
      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // Subtle grid background
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw Edges (Transitions)
    const n = this.nodes.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const prob = this.matrix[i][j];
        if (prob > 0.001) {
          this.drawEdge(this.nodes[i], this.nodes[j], prob, i === j);
        }
      }
    }

    // Draw Active Walker Particle (if animating)
    if (this.particle) {
      this.drawParticle();
    }

    // Draw Nodes
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      const isCurrent = i === this.currentState;
      this.drawNode(node, isCurrent, i);
    }
  }

  drawEdge(from, to, prob, isSelfLoop) {
    const ctx = this.ctx;
    const probStr = prob.toFixed(2);

    if (isSelfLoop) {
      // Draw self loop arc
      ctx.save();
      ctx.beginPath();
      const loopRadius = 18;
      const cx = from.x;
      const cy = from.y - from.radius - loopRadius + 6;

      ctx.arc(cx, cy, loopRadius, 0.3 * Math.PI, 2.7 * Math.PI);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = Math.max(1.5, prob * 3.5);
      ctx.stroke();

      // Label
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = "11px 'Fira Code', monospace";
      ctx.textAlign = "center";
      ctx.fillText(probStr, cx, cy - loopRadius - 4);
      ctx.restore();
      return;
    }

    // Directed curved edge between two distinct nodes
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    // Normal offset for curvature
    const curvature = 28;
    const midX = (from.x + to.x) / 2 + (-dy / dist) * curvature;
    const midY = (from.y + to.y) / 2 + (dx / dist) * curvature;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(midX, midY, to.x, to.y);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = Math.max(1.2, prob * 3.5);
    ctx.stroke();

    // Arrow head
    const t = 0.65; // Position along curve
    const arrowX = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
    const arrowY = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * to.y;
    const tangentX = 2 * (1 - t) * (midX - from.x) + 2 * t * (to.x - midX);
    const tangentY = 2 * (1 - t) * (midY - from.y) + 2 * t * (to.y - midY);
    const angle = Math.atan2(tangentY, tangentX);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - 8 * Math.cos(angle - Math.PI / 6), arrowY - 8 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(arrowX - 8 * Math.cos(angle + Math.PI / 6), arrowY - 8 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Text Badge
    ctx.fillStyle = "rgba(10, 15, 28, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    const textW = 34;
    const textH = 16;
    ctx.fillRect(midX - textW / 2, midY - textH / 2, textW, textH);
    ctx.strokeRect(midX - textW / 2, midY - textH / 2, textW, textH);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "10px 'Fira Code', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(probStr, midX, midY);

    ctx.restore();
  }

  drawParticle() {
    const p = this.particle;
    p.progress += 0.08;
    if (p.progress >= 1) {
      this.particle = null;
      return;
    }

    const from = this.nodes[p.fromState];
    const to = this.nodes[p.toState];

    let px, py;
    if (p.fromState === p.toState) {
      // Loop orbit
      const angle = p.progress * Math.PI * 2;
      const loopR = 24;
      px = from.x + loopR * Math.cos(angle);
      py = from.y - from.radius - 8 + loopR * Math.sin(angle);
    } else {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy);
      const curvature = 28;
      const midX = (from.x + to.x) / 2 + (-dy / dist) * curvature;
      const midY = (from.y + to.y) / 2 + (dx / dist) * curvature;

      const t = p.progress;
      px = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
      py = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * to.y;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ec4899";
    ctx.shadowColor = "#ec4899";
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.restore();
  }

  drawNode(node, isCurrent, idx) {
    const ctx = this.ctx;

    ctx.save();
    // Halo if current
    if (isCurrent) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
      ctx.shadowColor = "#6366f1";
      ctx.shadowBlur = 20;
      ctx.fill();
    }

    // Node Body
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = isCurrent ? node.color : "#121828";
    ctx.strokeStyle = isCurrent ? "#ffffff" : node.color;
    ctx.lineWidth = isCurrent ? 3 : 2;
    ctx.fill();
    ctx.stroke();

    // Node Label / State
    ctx.fillStyle = isCurrent ? "#000000" : "#ffffff";
    ctx.font = "bold 12px 'Outfit', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`S${idx}`, node.x, node.y - 4);

    // Text Subname
    ctx.fillStyle = isCurrent ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.7)";
    ctx.font = "9px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(node.label.slice(0, 10), node.x, node.y + 8);

    ctx.restore();
  }
}

// Instantiate graph simulator once DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  window.markovGraph = new MarkovGraphSimulator();
});
