/**
 * MARKOVLAB PRESENTER / SLIDESHOW ENGINE
 * Comprehensive granular sub-slide presentation deck with laser pointer,
 * high-contrast KaTeX formula cards, live simulator embedding, and TOC drawer.
 */

(function() {
  let presenterSlides = [];
  let currentSlideIdx = 0;
  let isPresenterActive = false;
  let isLaserActive = false;

  // Laser pointer coordinates & trail
  let laserX = -100;
  let laserY = -100;
  let laserTrail = [];
  let laserCanvas = null;
  let laserCtx = null;
  let laserAnimId = null;

  function buildMarkovLabSlideDeck() {
    const deck = [];

    // ==========================================
    // MODULE 1: FOUNDATIONS & MARKOV PROPERTY
    // ==========================================
    deck.push({
      id: "m1-def",
      moduleNum: "01",
      moduleName: "Module 01: Foundations",
      title: "Definition: The Markov Property (Memorylessness)",
      badge: "Definition",
      contentHtml: `
        <p>A stochastic process $\\{X_n : n \\in \\mathbb{N}_0\\}$ taking values in a countable state space $\\mathcal{S}$ satisfies the <strong>Markov Property</strong> if the conditional probability distribution of future states depends <em>only</em> on the present state, and not on the preceding sequence of historical events:</p>
        <div class="presenter-slide-formula">
          $$P(X_{n+1} = j \\mid X_n = i, X_{n-1} = i_{n-1}, \\dots, X_0 = i_0) = P(X_{n+1} = j \\mid X_n = i)$$
        </div>
        <p style="color:#94a3b8; font-size:15px; border-left:3px solid #38bdf8; padding-left:14px; line-height:1.7;">
          For all time steps $n \\ge 0$ and all states $i, j, i_0, \\dots, i_{n-1} \\in \\mathcal{S}$. In continuous state spaces, this corresponds to conditional independence: $\\sigma(X_{n+1}) \\perp \\sigma(X_0, \\dots, X_{n-1}) \\mid X_n$.
        </p>
      `
    });

    deck.push({
      id: "m1-matrix",
      moduleNum: "01",
      moduleName: "Module 01: Foundations",
      title: "Transition Probabilities & Stochastic Matrices",
      badge: "Core Matrix",
      contentHtml: `
        <p>When the transition probabilities are independent of the time index $n$, the Markov chain is called <strong>time-homogeneous</strong>. The single-step transition probability from state $i$ to $j$ is denoted:</p>
        <div class="presenter-slide-formula">
          $$P_{ij} = P(X_{n+1} = j \\mid X_n = i)$$
        </div>
        <p>Arranged in a square transition matrix $P = [P_{ij}] \\in \\mathbb{R}^{|\\mathcal{S}| \\times |\\mathcal{S}|}$, every row constitutes a valid probability vector over $\\mathcal{S}$:</p>
        <div class="presenter-slide-formula">
          $$P = \\begin{bmatrix} P_{11} & P_{12} & \\cdots & P_{1k} \\\\ P_{21} & P_{22} & \\cdots & P_{2k} \\\\ \\vdots & \\vdots & \\ddots & \\vdots \\\\ P_{k1} & P_{k2} & \\cdots & P_{kk} \\end{bmatrix}$$
        </div>
      `
    });

    deck.push({
      id: "m1-properties",
      moduleNum: "01",
      moduleName: "Module 01: Foundations",
      title: "Fundamental Properties of Stochastic Matrix P",
      badge: "Theorem",
      contentHtml: `
        <p>Every row-stochastic transition matrix $P$ satisfies three foundational linear algebraic properties:</p>
        <ul style="margin:16px 0; padding-left:24px; line-height:2;">
          <li><strong style="color:#38bdf8;">Non-negativity:</strong> $P_{ij} \\ge 0 \\quad \\forall i, j \\in \\mathcal{S}$.</li>
          <li><strong style="color:#34d399;">Row Sum to Unity:</strong> $\\sum_{j \\in \\mathcal{S}} P_{ij} = 1 \\quad \\forall i \\in \\mathcal{S} \\iff P \\mathbf{1} = \\mathbf{1}$, where $\\mathbf{1} = [1, 1, \\dots, 1]^T$.</li>
          <li><strong style="color:#fbbf24;">Gershgorin Eigenvalue Bound:</strong> Every stochastic matrix has $\\lambda_1 = 1$ as an eigenvalue, and all other eigenvalues satisfy $|\\lambda_i| \\le 1$ in the complex plane.</li>
        </ul>
      `
    });

    deck.push({
      id: "m1-sim",
      moduleNum: "01",
      moduleName: "Module 01: Foundations",
      title: "🎮 Interactive Simulation: State Transition Graph & Particle Walker",
      badge: "Live Simulator",
      targetDomId: "simulator-section"
    });

    // ==========================================
    // MODULE 2: MULTI-STEP DYNAMICS & P^n
    // ==========================================
    deck.push({
      id: "m2-chapman",
      moduleNum: "02",
      moduleName: "Module 02: Multi-Step Dynamics",
      title: "Chapman-Kolmogorov Equations",
      badge: "Theorem",
      contentHtml: `
        <p>For any intermediate time step $r$ such that $0 < r < n$, the $n$-step transition probability $P_{ij}^{(n)} = P(X_n = j \\mid X_0 = i)$ satisfies the <strong>Chapman-Kolmogorov Equation</strong>:</p>
        <div class="presenter-slide-formula">
          $$P_{ij}^{(n)} = \\sum_{k \\in \\mathcal{S}} P_{ik}^{(r)} P_{kj}^{(n-r)} \\quad \\iff \\quad P^{(n)} = P^r \\cdot P^{n-r} = P^n$$
        </div>
        <p style="color:#cbd5e1; font-size:15px; line-height:1.7;">
          By the law of total probability, the probability of reaching state $j$ from $i$ in $n$ steps is obtained by summing over all possible intermediate positions $k$ at step $r$. In matrix notation, this corresponds directly to <strong>matrix multiplication</strong>: $P^{(n)} = P^n$.
        </p>
      `
    });

    deck.push({
      id: "m2-evolution",
      moduleNum: "02",
      moduleName: "Module 02: Multi-Step Dynamics",
      title: "Probability Distribution Evolution over Time",
      badge: "Evolution",
      contentHtml: `
        <p>Let $\\mathbf{p}^{(0)} = [p_1^{(0)}, p_2^{(0)}, \\dots, p_k^{(0)}]$ denote the initial probability distribution row vector. The unconditional probability distribution at step $n$ is obtained by vector-matrix multiplication:</p>
        <div class="presenter-slide-formula">
          $$\\mathbf{p}^{(n)} = \\mathbf{p}^{(0)} P^n \\quad \\text{where} \\quad p_j^{(n)} = \\sum_{i \\in \\mathcal{S}} p_i^{(0)} P_{ij}^{(n)}$$
        </div>
        <p style="color:#94a3b8; font-size:14.5px;">
          As $n \\to \\infty$, if the chain is ergodic, $P^n$ converges to a rank-1 matrix where every row is identical to the unique stationary distribution $\\boldsymbol{\\pi}$.
        </p>
      `
    });

    deck.push({
      id: "m2-sim",
      moduleNum: "02",
      moduleName: "Module 02: Multi-Step Dynamics",
      title: "🎮 Interactive Matrix Powers (P^n) Explorer",
      badge: "Live Simulator",
      targetDomId: "matrixPowerSimulator"
    });

    // ==========================================
    // MODULE 3: CLASSIFICATION OF STATES
    // ==========================================
    deck.push({
      id: "m3-classes",
      moduleNum: "03",
      moduleName: "Module 03: State Classification",
      title: "Communication, Accessibility & Irreducibility",
      badge: "Decomposition",
      contentHtml: `
        <ul style="line-height:1.9; padding-left:20px;">
          <li><strong style="color:#38bdf8;">Accessibility ($i \\to j$):</strong> State $j$ is accessible from $i$ if there exists $n \\ge 0$ such that $P_{ij}^{(n)} > 0$.</li>
          <li><strong style="color:#34d399;">Communication ($i \\leftrightarrow j$):</strong> If $i \\to j$ and $j \\to i$, the states communicate. Communication is an equivalence relation (Reflexive, Symmetric, Transitive).</li>
          <li><strong style="color:#fbbf24;">Communicating Classes:</strong> The state space partitions into disjoint equivalence classes $\\mathcal{S} = C_1 \\cup C_2 \\cup \\dots \\cup C_m$.</li>
          <li><strong style="color:#f43f5e;">Irreducibility:</strong> A Markov chain is <em>irreducible</em> if all states communicate with each other (i.e., there is only 1 communicating class).</li>
        </ul>
      `
    });

    deck.push({
      id: "m3-periodicity",
      moduleNum: "03",
      moduleName: "Module 03: State Classification",
      title: "Periodicity of States",
      badge: "Periodicity",
      contentHtml: `
        <p>The <strong>period</strong> $d(i)$ of state $i$ is defined as the greatest common divisor (gcd) of all return times:</p>
        <div class="presenter-slide-formula">
          $$d(i) = \\gcd \\{n \\ge 1 : P_{ii}^{(n)} > 0\\}$$
        </div>
        <p>If $d(i) = 1$, the state is called <strong>aperiodic</strong>. Periodicity is a <em>class property</em>: if $i \\leftrightarrow j$, then $d(i) = d(j)$. A self-loop ($P_{ii} > 0$) guarantees aperiodicity ($d=1$).</p>
      `
    });

    deck.push({
      id: "m3-recurrence",
      moduleNum: "03",
      moduleName: "Module 03: State Classification",
      title: "Recurrence vs Transience",
      badge: "Classification",
      contentHtml: `
        <p>Let $f_{ii} = P(\\text{ever return to } i \\mid X_0 = i) = \\sum_{n=1}^\\infty f_{ii}^{(n)}$.</p>
        <div class="presenter-slide-formula">
          $$\\begin{cases} f_{ii} = 1 \\iff \\sum_{n=0}^\\infty P_{ii}^{(n)} = \\infty & \\implies \\text{State } i \\text{ is \\textbf{Recurrent}} \\\\ f_{ii} < 1 \\iff \\sum_{n=0}^\\infty P_{ii}^{(n)} < \\infty & \\implies \\text{State } i \\text{ is \\textbf{Transient}} \\end{cases}$$
        </div>
        <p>For recurrent states, the mean recurrence time is $\\mu_i = \\sum_{n=1}^\\infty n f_{ii}^{(n)}$. If $\\mu_i < \\infty$, the state is <strong>positive recurrent</strong>; if $\\mu_i = \\infty$, it is <strong>null recurrent</strong>.</p>
      `
    });

    // ==========================================
    // MODULE 4: STATIONARY DISTRIBUTIONS & ERGODICITY
    // ==========================================
    deck.push({
      id: "m4-stationary-def",
      moduleNum: "04",
      moduleName: "Module 04: Stationary Distributions",
      title: "Definition & Invariance of Stationary Measure",
      badge: "Definition",
      contentHtml: `
        <p>A probability distribution vector $\\boldsymbol{\\pi} = [\\pi_1, \\pi_2, \\dots, \\pi_k]$ is called a <strong>stationary distribution</strong> (or invariant measure) if it satisfies:</p>
        <div class="presenter-slide-formula">
          $$\\boldsymbol{\\pi} P = \\boldsymbol{\\pi} \\quad \\text{and} \\quad \\sum_{i \\in \\mathcal{S}} \\pi_i = 1, \\quad \\pi_i \\ge 0$$
        </div>
        <p>Linear algebraically, $\\boldsymbol{\\pi}$ is a <strong>normalized left eigenvector</strong> of matrix $P$ corresponding to the Perron eigenvalue $\\lambda = 1$.</p>
      `
    });

    deck.push({
      id: "m4-ergodic-thm",
      moduleNum: "04",
      moduleName: "Module 04: Stationary Distributions",
      title: "The Ergodic Theorem & Convergence to Equilibrium",
      badge: "Fundamental Theorem",
      contentHtml: `
        <p>For any <strong>irreducible, aperiodic, and positive recurrent</strong> Markov chain (Ergodic Chain):</p>
        <div class="presenter-slide-formula">
          $$\\lim_{n \\to \\infty} P_{ij}^{(n)} = \\pi_j = \\frac{1}{\\mu_j} \\quad \\forall i, j \\in \\mathcal{S}$$
        </div>
        <p style="color:#cbd5e1; font-size:15px; line-height:1.7;">
          The limiting probability of being in state $j$ is strictly positive, independent of the starting state $i$, and equals the reciprocal of the mean recurrence time $\\mu_j$. Furthermore, time averages converge almost surely to state averages (Ergodicity).
        </p>
      `
    });

    deck.push({
      id: "m4-spectral",
      moduleNum: "04",
      moduleName: "Module 04: Stationary Distributions",
      title: "Spectral Gap & Total Variation Mixing Time",
      badge: "Spectral Theory",
      contentHtml: `
        <p>The speed at which a Markov chain converges to stationarity is governed by the <strong>spectral gap</strong> $\\gamma = 1 - |\\lambda_2|$, where $\\lambda_2$ is the second largest eigenvalue of $P$:</p>
        <div class="presenter-slide-formula">
          $$\\|p^{(n)} - \\boldsymbol{\\pi}\\|_{TV} = \\frac{1}{2} \\sum_{i \\in \\mathcal{S}} |p_i^{(n)} - \\pi_i| \\le C \\cdot |\\lambda_2|^n = C \\cdot (1 - \\gamma)^n$$
        </div>
        <p>The mixing time $t_{\\text{mix}}(\\varepsilon)$ is the smallest step count $n$ such that $\\max_x \\|P^n(x, \\cdot) - \\boldsymbol{\\pi}\\|_{TV} \\le \\varepsilon$. A larger spectral gap $\\gamma$ ensures exponentially faster mixing.</p>
      `
    });

    // ==========================================
    // MODULE 5: ABSORBING CHAINS & HITTING TIMES
    // ==========================================
    deck.push({
      id: "m5-canonical",
      moduleNum: "05",
      moduleName: "Module 05: Absorbing Chains",
      title: "Canonical Partition & Fundamental Matrix N",
      badge: "Absorbing Chains",
      contentHtml: `
        <p>Reordering states into $t$ transient states followed by $r$ absorbing states yields the <strong>Canonical Form</strong>:</p>
        <div class="presenter-slide-formula">
          $$P = \\begin{bmatrix} Q & R \\\\ \\mathbf{0} & I_r \\end{bmatrix}$$
        </div>
        <p>The <strong>Fundamental Matrix</strong> $N = (I_t - Q)^{-1} = I + Q + Q^2 + \\dots$ gives the expected number of visits to transient state $j$ starting from $i$ before absorption:</p>
        <div class="presenter-slide-formula">
          $$N = (I_t - Q)^{-1} \\in \\mathbb{R}^{t \\times t}$$
        </div>
      `
    });

    deck.push({
      id: "m5-absorption",
      moduleNum: "05",
      moduleName: "Module 05: Absorbing Chains",
      title: "Expected Time to Absorption & Absorption Probabilities",
      badge: "Closed-Form",
      contentHtml: `
        <p>Using the fundamental matrix $N$, all absorption statistics have closed-form linear algebraic solutions:</p>
        <div class="presenter-slide-formula">
          $$\\begin{aligned} \\mathbf{t} &= N \\mathbf{1} \\quad &&\\text{(Vector of expected steps to absorption from each transient state)} \\\\ B &= N R \\quad &&\\text{(Matrix of absorption probabilities into each absorbing state)} \\end{aligned}$$
        </div>
        <p style="color:#34d399; font-size:15px;">
          Row $i$ of $B$ sums to 1: $\\sum_k B_{ik} = 1$, guaranteeing that absorption occurs in finite expected time with probability 1.
        </p>
      `
    });

    deck.push({
      id: "m5-sim",
      moduleNum: "05",
      moduleName: "Module 05: Absorbing Chains",
      title: "🎮 Interactive Gambler's Ruin & Fundamental Matrix Lab",
      badge: "Live Simulator",
      targetDomId: "ruinSimulator"
    });

    // ==========================================
    // MODULE 6: REVERSIBILITY & DETAILED BALANCE
    // ==========================================
    deck.push({
      id: "m6-detailed-balance",
      moduleNum: "06",
      moduleName: "Module 06: Reversibility",
      title: "Detailed Balance Condition & Reversibility",
      badge: "Theorem",
      contentHtml: `
        <p>A Markov chain is called <strong>reversible</strong> with respect to stationary distribution $\\boldsymbol{\\pi}$ if it satisfies the <strong>Detailed Balance Equations</strong>:</p>
        <div class="presenter-slide-formula">
          $$\\pi_i P_{ij} = \\pi_j P_{ji} \\quad \\forall i, j \\in \\mathcal{S}$$
        </div>
        <p>Detailed balance implies that in equilibrium, the probability flux from state $i$ to $j$ equals the reverse flux from $j$ to $i$. Summing over $i$ confirms that detailed balance is a <em>sufficient condition</em> for stationarity: $\\sum_i \\pi_i P_{ij} = \\pi_j \\sum_i P_{ji} = \\pi_j$.</p>
      `
    });

    deck.push({
      id: "m6-kolmogorov",
      moduleNum: "06",
      moduleName: "Module 06: Reversibility",
      title: "Kolmogorov's Cycle Criterion",
      badge: "Cycle Criterion",
      contentHtml: `
        <p>An irreducible Markov chain is reversible <strong>if and only if</strong> for every closed cycle of states $i_1, i_2, \\dots, i_n, i_1$, the product of transition probabilities in the forward direction equals the reverse direction:</p>
        <div class="presenter-slide-formula">
          $$P_{i_1 i_2} P_{i_2 i_3} \\dots P_{i_{n-1} i_n} P_{i_n i_1} = P_{i_1 i_n} P_{i_n i_{n-1}} \\dots P_{i_3 i_2} P_{i_2 i_1}$$
        </div>
        <p style="color:#cbd5e1; font-size:14.5px;">
          This criterion provides a test for reversibility without needing to know the stationary distribution $\\boldsymbol{\\pi}$ beforehand.
        </p>
      `
    });

    // ==========================================
    // MODULE 7: MCMC & METROPOLIS-HASTINGS
    // ==========================================
    deck.push({
      id: "m7-mcmc-concept",
      moduleNum: "07",
      moduleName: "Module 07: MCMC",
      title: "The MCMC Paradigm & Intractable Posteriors",
      badge: "Computational Math",
      contentHtml: `
        <p>In Bayesian inference and statistical physics, target distributions $\\pi(x) = \\frac{\\tilde{\\pi}(x)}{Z}$ have intractable normalizing constants $Z = \\int \\tilde{\\pi}(x) dx$.</p>
        <div class="presenter-slide-formula">
          $$\\text{Goal: Construct an ergodic Markov chain whose stationary distribution is exactly } \\pi(x).$$
        </div>
        <p>By simulating long sample paths of this chain, empirical averages $\\frac{1}{N} \\sum_{t=1}^N f(X_t)$ converge to the true expectation $\\mathbb{E}_\\pi[f(X)]$ by the Ergodic Theorem without ever computing $Z$.</p>
      `
    });

    deck.push({
      id: "m7-metropolis",
      moduleNum: "07",
      moduleName: "Module 07: MCMC",
      title: "Metropolis-Hastings Acceptance Probability",
      badge: "Algorithm",
      contentHtml: `
        <p>Given current state $x$ and proposal $y \\sim q(y \\mid x)$, the move is accepted with probability $\\alpha(x, y)$:</p>
        <div class="presenter-slide-formula">
          $$\\alpha(x, y) = \\min\\left(1, \\frac{\\pi(y) q(x \\mid y)}{\\pi(x) q(y \\mid x)}\\right) = \\min\\left(1, \\frac{\\tilde{\\pi}(y) q(x \\mid y)}{\\tilde{\\pi}(x) q(y \\mid x)}\\right)$$
        </div>
        <p style="color:#34d399; font-size:15px;">
          Notice that the unknown normalizing constant $Z$ cancels out perfectly! For symmetric proposals $q(x \\mid y) = q(y \\mid x)$, this simplifies to the original Metropolis ratio: $\\alpha(x,y) = \\min(1, \\tilde{\\pi}(y)/\\tilde{\\pi}(x))$.
        </p>
      `
    });

    deck.push({
      id: "m7-sim",
      moduleNum: "07",
      moduleName: "Module 07: MCMC",
      title: "🎮 Interactive 2D Metropolis-Hastings MCMC Sampler",
      badge: "Live Simulator",
      targetDomId: "mcmcSimulatorSection"
    });

    // ==========================================
    // MODULE 8: APPLICATIONS & ADVANCED FRONTIERS
    // ==========================================
    deck.push({
      id: "m8-pagerank",
      moduleNum: "08",
      moduleName: "Module 08: Applications",
      title: "Google PageRank & The Random Surfer Model",
      badge: "Algorithm",
      contentHtml: `
        <p>PageRank models web surfing as a random walk on directed graphs with damping factor $d \\approx 0.85$ to ensure irreducibility and aperiodicity:</p>
        <div class="presenter-slide-formula">
          $$G = d P + \\frac{1-d}{N} \\mathbf{E}, \\quad \\mathbf{E} = \\mathbf{1}\\mathbf{1}^T$$
        </div>
        <p>The Google Matrix $G$ is strictly positive ($G_{ij} > 0$), guaranteeing a unique positive stationary distribution $\\mathbf{r} = \\mathbf{r} G$ by the Perron-Frobenius Theorem, computed via the Power Iteration algorithm.</p>
      `
    });

    deck.push({
      id: "m8-sim",
      moduleNum: "08",
      moduleName: "Module 08: Applications",
      title: "🎮 Interactive PageRank Power Iteration & Random Surfer Lab",
      badge: "Live Simulator",
      targetDomId: "simPageRankSection"
    });

    // ==========================================
    // MODULE 9: CONTINUOUS-TIME MARKOV CHAINS
    // ==========================================
    deck.push({
      id: "m9-generator",
      moduleNum: "09",
      moduleName: "Module 09: Continuous Time",
      title: "Infinitesimal Generator Matrix Q",
      badge: "CTMC",
      contentHtml: `
        <p>In continuous time, transitions occur at exponential rates $q_{ij} \\ge 0$ ($i \\neq j$). The <strong>Generator Matrix</strong> $Q$ is defined as the time derivative at $t=0$:</p>
        <div class="presenter-slide-formula">
          $$Q = \\lim_{h \\downarrow 0} \\frac{P(h) - I}{h}, \\quad q_{ii} = -\\sum_{j \\neq i} q_{ij} = -q_i \\iff Q \\mathbf{1} = \\mathbf{0}$$
        </div>
        <p>The process spends an exponentially distributed <strong>sojourn time</strong> $\\tau_i \\sim \\text{Exp}(q_i)$ with mean $\\mathbb{E}[\\tau_i] = 1/q_i$ in state $i$ before jumping to state $j$ with embedded probability $p_{ij} = q_{ij}/q_i$.</p>
      `
    });

    deck.push({
      id: "m9-kolmogorov-diff",
      moduleNum: "09",
      moduleName: "Module 09: Continuous Time",
      title: "Kolmogorov Differential Equations & Matrix Exponential",
      badge: "ODE Solution",
      contentHtml: `
        <p>The time-dependent transition matrix $P(t) = [P_{ij}(t)]$ satisfies the <strong>Kolmogorov Forward & Backward Equations</strong>:</p>
        <div class="presenter-slide-formula">
          $$\\frac{d}{dt} P(t) = P(t) Q = Q P(t) \\quad \\implies \\quad P(t) = e^{Qt} = \\sum_{k=0}^\\infty \\frac{(Qt)^k}{k!}$$
        </div>
        <p>The continuous-time stationary distribution satisfies $\\boldsymbol{\\pi} Q = \\mathbf{0}$ subject to $\\sum \\pi_i = 1$.</p>
      `
    });

    deck.push({
      id: "m9-sim",
      moduleNum: "09",
      moduleName: "Module 09: Continuous Time",
      title: "🎮 Interactive Continuous-Time Kolmogorov Curves & Gillespie Lab",
      badge: "Live Simulator",
      targetDomId: "simCtmcSection"
    });

    // ==========================================
    // MODULE 10: EXPLOSIVE CTMC & FELLER-REUTER
    // ==========================================
    deck.push({
      id: "m10-motivation",
      moduleNum: "10",
      moduleName: "Module 10: Explosive CTMC",
      title: "Real-World Motivation: Why Study Explosive Processes?",
      badge: "Real-Life Applications",
      contentHtml: `
        <p>In standard probability, processes are assumed to run indefinitely without escaping the state space ($\zeta = \infty$). However, critical physical, industrial, and biological networks feature <strong>accelerating feedback dynamics</strong> where each event speeds up the next:</p>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 14px;">
          <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 10px; padding: 14px;">
            <div style="font-size: 20px; margin-bottom: 6px;">🔋</div>
            <strong style="color: #fb7185; font-size: 14px; display:block; margin-bottom: 6px;">1. Battery Flashover</strong>
            <p style="font-size: 12.5px; color: #cbd5e1; line-height: 1.5;">In Li-ion batteries and reactors, Arrhenius kinetics cause rates to scale super-linearly $\\lambda_n \\propto c n^2$. Predicting $\\mathbb{E}[\\zeta] = \\frac{\\pi^2}{6c}$ allows designing automated cooling tripwires.</p>
          </div>
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 14px;">
            <div style="font-size: 20px; margin-bottom: 6px;">⚡</div>
            <strong style="color: #fbbf24; font-size: 14px; display:block; margin-bottom: 6px;">2. Power Grid Blackouts</strong>
            <p style="font-size: 12.5px; color: #cbd5e1; line-height: 1.5;">Line failures redistribute electrical load, causing successive trips to accelerate from hours down to milliseconds: $\\lambda_n \\propto (N-n)^{-\\alpha}$. Enables optimal grid islanding before total blackout.</p>
          </div>
          <div style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 10px; padding: 14px;">
            <div style="font-size: 20px; margin-bottom: 6px;">🧬</div>
            <strong style="color: #c084fc; font-size: 14px; display:block; margin-bottom: 6px;">3. Gelation & Clotting</strong>
            <p style="font-size: 12.5px; color: #cbd5e1; line-height: 1.5;">During polymer crosslinking or blood thrombosis, cluster fusion rates scale with cluster sizes $K(j, k) \\propto (j \\cdot k)^\\gamma$. At $t_{\\text{gel}} = \\zeta < \\infty$, an infinite gel/clot network forms.</p>
          </div>
        </div>
      `
    });

    deck.push({
      id: "m10-def",
      moduleNum: "10",
      moduleName: "Module 10: Explosive CTMC",
      title: "Explosion Epoch ζ & Honest vs Dishonest CTMC",
      badge: "Definition",
      contentHtml: `
        <p>For jump times $J_0 = 0 < J_1 < J_2 < \\dots$ with holding times $\\tau_n \\sim \\text{Exp}(q_{X(J_{n-1})})$, the <strong>explosion epoch (lifetime)</strong> $\\zeta$ is:</p>
        <div class="presenter-slide-formula">
          $$\\zeta = \\lim_{n \\to \\infty} J_n = \\sum_{n=1}^\\infty \\tau_n \\in (0, \\infty]$$
        </div>
        <p><strong>Honest (Non-Explosive):</strong> $P_i(\\zeta = \\infty) = 1$ for all $i \\in \\mathcal{S}$. Finitely many jumps in any finite window.</p>
        <p><strong>Dishonest (Explosive):</strong> $P_i(\\zeta < \\infty) > 0$. Infinitely many transitions occur in finite time, escaping to cemetery $\\Delta$.</p>
      `
    });

    deck.push({
      id: "m10-feller",
      moduleNum: "10",
      moduleName: "Module 10: Explosive CTMC",
      title: "Feller's Pure Birth Explosion Criterion",
      badge: "Feller Theorem",
      contentHtml: `
        <p>For a pure birth process with rates $\\lambda_n > 0$, explosion occurs almost surely ($P_0(\\zeta < \\infty) = 1$) <strong>if and only if</strong>:</p>
        <div class="presenter-slide-formula">
          $$\\sum_{n=0}^\\infty \\frac{1}{\\lambda_n} < \\infty \\iff \\mathbb{E}_0[\\zeta] = \\sum_{n=0}^\\infty \\frac{1}{\\lambda_n} < \\infty$$
        </div>
        <p style="color:#34d399; font-size:15px;">
          For $\\lambda_n = c(n+1)^p$: Honest for $p \\le 1$ (Linear / Yule). Explodes for $p > 1$ (Quadratic $\\lambda_n = c(n+1)^2 \\implies \\mathbb{E}[\\zeta] = \\frac{\\pi^2}{6c}$).
        </p>
      `
    });

    deck.push({
      id: "m10-reuter",
      moduleNum: "10",
      moduleName: "Module 10: Explosive CTMC",
      title: "Reuter's Harmonic Resolvent Criterion",
      badge: "Reuter Theorem",
      contentHtml: `
        <p>For any conservative $Q$-matrix, the minimal transition function is non-explosive <strong>if and only if</strong> for $\\lambda > 0$, the only bounded solution to:</p>
        <div class="presenter-slide-formula">
          $$(\\lambda I - Q) u = 0, \\quad 0 \\le u_i \\le 1 \\; \\forall i \\in \\mathcal{S}$$
        </div>
        <p>is the trivial solution $u = \\mathbf{0}$. If a non-trivial bounded solution exists, $u_i = \\mathbb{E}_i[e^{-\\lambda \\zeta}]$ directly gives the Laplace transform of the explosion time.</p>
      `
    });

    deck.push({
      id: "m10-defect",
      moduleNum: "10",
      moduleName: "Module 10: Explosive CTMC",
      title: "Kolmogorov Probability Defect & Cemetery State Δ",
      badge: "Probability Defect",
      contentHtml: `
        <p>In explosive Markov chains, probability mass escapes to the point at infinity $\\Delta$:</p>
        <div class="presenter-slide-formula">
          $$\\sum_{j \\in \\mathcal{S}} p_{ij}(t) = P_i(\\zeta > t) = 1 - P_i(\\zeta \\le t) < 1 \\quad (\\text{Defect } = P_i(\\zeta \\le t))$$
        </div>
        <p><strong>Uniform Boundedness:</strong> If $\\sup_{i} q_i < \\infty$, the CTMC is stochastically dominated by a Poisson process $\\implies$ strictly non-explosive. Every finite state space ($|\\mathcal{S}| < \\infty$) is non-explosive.</p>
      `
    });

    // ==========================================
    // MODULE 11: INTERACTIVE MASTERY ASSESSMENT
    // ==========================================
    deck.push({
      id: "m11-quiz",
      moduleNum: "Quiz",
      moduleName: "Module 11: Assessment",
      title: "Interactive Knowledge Check & Mastery Quiz",
      badge: "Assessment",
      targetDomId: "module-quiz"
    });

    return deck;
  }

  let currentlyPortedElement = null;
  let currentPlaceholder = null;

  function restorePortedElement() {
    if (currentlyPortedElement && currentPlaceholder && currentPlaceholder.parentNode) {
      currentPlaceholder.parentNode.replaceChild(currentlyPortedElement, currentPlaceholder);
      currentlyPortedElement = null;
      currentPlaceholder = null;
    }
  }

  function renderSlide(slide) {
    const slideContentEl = document.getElementById("presenter-slide-content");
    if (!slideContentEl) return;

    restorePortedElement();

    if (slide.targetDomId) {
      // Embed live simulator or interactive DOM element via dynamic porting
      const targetEl = document.getElementById(slide.targetDomId);
      slideContentEl.innerHTML = `
        <div class="presenter-slide-header">
          <div>
            <div class="presenter-slide-module-tag">${slide.moduleName}</div>
            <div class="presenter-slide-title">${slide.title}</div>
          </div>
          <span class="presenter-badge">${slide.badge}</span>
        </div>
        <div id="presenter-interactive-host" style="margin-top:16px;"></div>
      `;

      if (targetEl && targetEl.parentNode) {
        const host = document.getElementById("presenter-interactive-host");
        if (host) {
          currentPlaceholder = document.createElement("div");
          currentPlaceholder.id = "presenter-dom-placeholder-" + slide.targetDomId;
          currentPlaceholder.style.display = "none";
          targetEl.parentNode.insertBefore(currentPlaceholder, targetEl);

          host.appendChild(targetEl);
          currentlyPortedElement = targetEl;

          // Trigger simulated resize and canvas redraws for simulator
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
            if (window.markovGraph && typeof window.markovGraph.draw === 'function') {
              window.markovGraph.draw();
            }
          }, 60);
        }
      }
    } else {
      // Render clean mathematical slide
      slideContentEl.innerHTML = `
        <div class="presenter-slide-header">
          <div>
            <div class="presenter-slide-module-tag">${slide.moduleName}</div>
            <div class="presenter-slide-title">${slide.title}</div>
          </div>
          <span class="presenter-badge">${slide.badge}</span>
        </div>

        <div class="presenter-slide-body">
          ${slide.contentHtml}
        </div>
      `;
    }

    if (window.renderAllMath) {
      window.renderAllMath(slideContentEl);
    }
  }

  function renderTocGrid() {
    const tocGrid = document.getElementById("presenter-toc-grid");
    const tocTotalBadge = document.getElementById("presenter-toc-total-badge");
    if (!tocGrid) return;

    if (tocTotalBadge) tocTotalBadge.textContent = `${presenterSlides.length} Slides`;

    tocGrid.innerHTML = presenterSlides.map((s, idx) => `
      <div class="presenter-toc-item ${idx === currentSlideIdx ? 'active' : ''}" onclick="window.goToMarkovPresenterSlide(${idx})">
        <div class="presenter-toc-item-top">
          <span class="presenter-toc-item-num">SLIDE ${idx + 1}</span>
          <span class="presenter-badge" style="font-size:10px; padding:2px 6px;">${s.badge}</span>
        </div>
        <div class="presenter-toc-item-title">${s.title}</div>
        <div style="font-size:11px; color:#94a3b8;">${s.moduleName}</div>
      </div>
    `).join('');
  }

  window.goToMarkovPresenterSlide = function(idx) {
    goToSlide(idx);
    closeToc();
  };

  function openToc() {
    renderTocGrid();
    const tocModal = document.getElementById("presenter-toc-modal");
    if (tocModal) tocModal.classList.add("open");
  }

  function closeToc() {
    const tocModal = document.getElementById("presenter-toc-modal");
    if (tocModal) tocModal.classList.remove("open");
  }

  function toggleToc() {
    const tocModal = document.getElementById("presenter-toc-modal");
    if (tocModal && tocModal.classList.contains("open")) closeToc();
    else openToc();
  }

  function goToSlide(idx) {
    if (presenterSlides.length === 0) presenterSlides = buildMarkovLabSlideDeck();
    if (idx < 0) idx = 0;
    if (idx >= presenterSlides.length) idx = presenterSlides.length - 1;
    currentSlideIdx = idx;

    const slide = presenterSlides[currentSlideIdx];
    renderSlide(slide);

    const stageEl = document.getElementById("presenter-stage");
    if (stageEl) stageEl.scrollTo({ top: 0, behavior: "smooth" });

    updatePresenterUI();
  }

  function updatePresenterUI() {
    const slidePill = document.getElementById("presenter-slide-indicator");
    const titlePill = document.getElementById("presenter-slide-title");
    const prevBtn = document.getElementById("presenter-btn-prev");
    const nextBtn = document.getElementById("presenter-btn-next");

    if (slidePill && presenterSlides[currentSlideIdx]) {
      slidePill.textContent = `Slide ${currentSlideIdx + 1} / ${presenterSlides.length}`;
    }
    if (titlePill && presenterSlides[currentSlideIdx]) {
      titlePill.textContent = presenterSlides[currentSlideIdx].title;
    }
    if (prevBtn) {
      prevBtn.disabled = (currentSlideIdx === 0);
      prevBtn.style.opacity = (currentSlideIdx === 0) ? "0.4" : "1";
    }
    if (nextBtn) {
      nextBtn.disabled = (currentSlideIdx === presenterSlides.length - 1);
      nextBtn.style.opacity = (currentSlideIdx === presenterSlides.length - 1) ? "0.4" : "1";
    }
  }

  function togglePresenterMode() {
    if (isPresenterActive) exitPresenterMode();
    else enterPresenterMode();
  }

  function enterPresenterMode() {
    presenterSlides = buildMarkovLabSlideDeck();
    isPresenterActive = true;
    document.body.classList.add("presenter-mode");
    goToSlide(currentSlideIdx);
  }

  function exitPresenterMode() {
    isPresenterActive = false;
    closeToc();
    restorePortedElement();
    document.body.classList.remove("presenter-mode");
    document.body.classList.remove('laser-active');
    isLaserActive = false;
    if (laserAnimId) cancelAnimationFrame(laserAnimId);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function toggleLaserPointer() {
    isLaserActive = !isLaserActive;
    document.body.classList.toggle("laser-active", isLaserActive);
    const laserBtn = document.getElementById("presenter-btn-laser");
    if (laserBtn) {
      laserBtn.classList.toggle("active", isLaserActive);
      laserBtn.textContent = isLaserActive ? "🔴 Laser ON" : "🔴 Laser";
    }
    if (isLaserActive) {
      resizeLaserCanvas();
      renderLaserLoop();
    } else {
      if (laserAnimId) cancelAnimationFrame(laserAnimId);
      if (laserCtx && laserCanvas) laserCtx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
    }
  }

  function resizeLaserCanvas() {
    if (!laserCanvas) return;
    laserCanvas.width = window.innerWidth;
    laserCanvas.height = window.innerHeight;
    laserCtx = laserCanvas.getContext("2d");
  }

  function handleLaserMouseMove(e) {
    if (!isPresenterActive || !isLaserActive) return;
    laserX = e.clientX;
    laserY = e.clientY;
    laserTrail.push({ x: laserX, y: laserY, life: 1.0 });
    if (laserTrail.length > 10) laserTrail.shift();
  }

  function renderLaserLoop() {
    if (!isLaserActive || !laserCtx || !laserCanvas) return;

    laserCtx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);

    for (let i = 0; i < laserTrail.length; i++) {
      const pt = laserTrail[i];
      pt.life -= 0.08;
      if (pt.life > 0) {
        laserCtx.fillStyle = `rgba(244, 63, 94, ${pt.life * 0.35})`;
        laserCtx.beginPath();
        laserCtx.arc(pt.x, pt.y, 4 * pt.life, 0, Math.PI * 2);
        laserCtx.fill();
      }
    }
    laserTrail = laserTrail.filter(pt => pt.life > 0);

    if (laserX > 0 && laserY > 0) {
      const grad = laserCtx.createRadialGradient(laserX, laserY, 1, laserX, laserY, 16);
      grad.addColorStop(0, "rgba(255, 0, 80, 0.85)");
      grad.addColorStop(0.4, "rgba(255, 0, 80, 0.35)");
      grad.addColorStop(1, "rgba(255, 0, 80, 0)");
      laserCtx.fillStyle = grad;
      laserCtx.beginPath();
      laserCtx.arc(laserX, laserY, 16, 0, Math.PI * 2);
      laserCtx.fill();

      laserCtx.fillStyle = "#ffffff";
      laserCtx.beginPath();
      laserCtx.arc(laserX, laserY, 3.5, 0, Math.PI * 2);
      laserCtx.fill();
    }

    laserAnimId = requestAnimationFrame(renderLaserLoop);
  }

  function handleKeyNav(e) {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

    if ((e.key === "p" || e.key === "P" || e.key === "f" || e.key === "F") && !e.ctrlKey && !e.altKey && !e.metaKey) {
      togglePresenterMode();
      return;
    }

    if (!isPresenterActive) return;

    const tocModal = document.getElementById("presenter-toc-modal");
    if (e.key === "Escape") {
      if (tocModal && tocModal.classList.contains("open")) closeToc();
      else exitPresenterMode();
    } else if (e.key === "o" || e.key === "O") {
      toggleToc();
    } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      goToSlide(currentSlideIdx + 1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      goToSlide(currentSlideIdx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      goToSlide(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goToSlide(presenterSlides.length - 1);
    } else if (e.key === "l" || e.key === "L") {
      toggleLaserPointer();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    laserCanvas = document.getElementById("laser-pointer-canvas");
    const btnPresenter = document.getElementById("btn-presenter-mode");
    const btnPrev = document.getElementById("presenter-btn-prev");
    const btnNext = document.getElementById("presenter-btn-next");
    const btnExit = document.getElementById("presenter-btn-exit");
    const btnFullscreen = document.getElementById("presenter-btn-fullscreen");
    const btnLaser = document.getElementById("presenter-btn-laser");
    const btnToc = document.getElementById("presenter-btn-toc");
    const slidePill = document.getElementById("presenter-slide-indicator");
    const tocClose = document.getElementById("presenter-toc-close");
    const tocBackdrop = document.getElementById("presenter-toc-backdrop");

    if (btnPresenter) btnPresenter.addEventListener("click", togglePresenterMode);
    if (btnPrev) btnPrev.addEventListener("click", () => goToSlide(currentSlideIdx - 1));
    if (btnNext) btnNext.addEventListener("click", () => goToSlide(currentSlideIdx + 1));
    if (btnExit) btnExit.addEventListener("click", exitPresenterMode);
    if (btnFullscreen) btnFullscreen.addEventListener("click", toggleFullscreen);
    if (btnLaser) btnLaser.addEventListener("click", toggleLaserPointer);
    if (btnToc) btnToc.addEventListener("click", toggleToc);
    if (slidePill) slidePill.addEventListener("click", toggleToc);
    if (tocClose) tocClose.addEventListener("click", closeToc);
    if (tocBackdrop) tocBackdrop.addEventListener("click", closeToc);

    document.addEventListener("keydown", handleKeyNav);
    window.addEventListener("mousemove", handleLaserMouseMove);
    window.addEventListener("resize", resizeLaserCanvas);
  });
})();
