/**
 * MARKOV CORE ENGINE - Linear Algebra & Stochastic Analysis Library
 * Provides robust matrix operations, power iteration, stationary solvers,
 * and fundamental matrix decomposition for absorbing Markov chains.
 */

const MarkovCore = {
  // Preset Configurations for the Interactive Graph Simulator
  presets: {
    weather: {
      name: "3-State Weather Model",
      labels: ["Sunny", "Cloudy", "Rainy"],
      colors: ["#f59e0b", "#94a3b8", "#38bdf8"],
      positions: [
        { x: 150, y: 120 },
        { x: 450, y: 120 },
        { x: 300, y: 280 }
      ],
      matrix: [
        [0.7, 0.2, 0.1],
        [0.3, 0.4, 0.3],
        [0.2, 0.3, 0.5]
      ]
    },
    pagerank4: {
      name: "4-Node Web Graph (PageRank)",
      labels: ["Page A", "Page B", "Page C", "Page D"],
      colors: ["#6366f1", "#ec4899", "#10b981", "#06b6d4"],
      positions: [
        { x: 150, y: 110 },
        { x: 450, y: 110 },
        { x: 450, y: 290 },
        { x: 150, y: 290 }
      ],
      matrix: [
        [0.0, 0.5, 0.5, 0.0],
        [0.0, 0.0, 1.0, 0.0],
        [0.33, 0.33, 0.0, 0.34],
        [1.0, 0.0, 0.0, 0.0]
      ]
    },
    absorbing: {
      name: "Absorbing Chain (Gambler's Ruin)",
      labels: ["Ruin ($0)", "$1 Capital", "$2 Capital", "Goal ($3)"],
      colors: ["#ef4444", "#a855f7", "#6366f1", "#10b981"],
      positions: [
        { x: 100, y: 200 },
        { x: 230, y: 200 },
        { x: 370, y: 200 },
        { x: 500, y: 200 }
      ],
      matrix: [
        [1.0, 0.0, 0.0, 0.0],
        [0.5, 0.0, 0.5, 0.0],
        [0.0, 0.5, 0.0, 0.5],
        [0.0, 0.0, 0.0, 1.0]
      ]
    },
    periodic: {
      name: "Periodic 3-State Clock (Period d=3)",
      labels: ["State 0", "State 1", "State 2"],
      colors: ["#8b5cf6", "#ec4899", "#06b6d4"],
      positions: [
        { x: 300, y: 90 },
        { x: 460, y: 270 },
        { x: 140, y: 270 }
      ],
      matrix: [
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
        [1.0, 0.0, 0.0]
      ]
    }
  },

  /**
   * Clone a 2D matrix
   */
  cloneMatrix(M) {
    return M.map(row => [...row]);
  },

  /**
   * Matrix multiplication C = A * B
   */
  multiply(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    if (colsA !== rowsB) {
      throw new Error(`Matrix dimension mismatch: (${rowsA}x${colsA}) * (${rowsB}x${colsB})`);
    }

    const C = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
    for (let i = 0; i < rowsA; i++) {
      for (let k = 0; k < colsA; k++) {
        for (let j = 0; j < colsB; j++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return C;
  },

  /**
   * Compute Matrix Power M^n via binary exponentiation
   */
  matrixPower(M, n) {
    const size = M.length;
    if (n === 0) {
      // Identity matrix
      return Array.from({ length: size }, (_, i) =>
        Array.from({ length: size }, (_, j) => (i === j ? 1 : 0))
      );
    }
    if (n === 1) return this.cloneMatrix(M);

    let result = Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => (i === j ? 1 : 0))
    );
    let base = this.cloneMatrix(M);
    let exp = n;

    while (exp > 0) {
      if (exp % 2 === 1) {
        result = this.multiply(result, base);
      }
      base = this.multiply(base, base);
      exp = Math.floor(exp / 2);
    }
    return result;
  },

  /**
   * Calculate exact or approximate Stationary Distribution pi = pi * P, sum(pi) = 1
   * Uses high-precision power iteration with fallback to normalized solve.
   */
  computeStationaryDistribution(P, maxIter = 500, tol = 1e-9) {
    const k = P.length;
    let pi = new Array(k).fill(1 / k);

    for (let iter = 0; iter < maxIter; iter++) {
      const nextPi = new Array(k).fill(0);
      for (let j = 0; j < k; j++) {
        for (let i = 0; i < k; i++) {
          nextPi[j] += pi[i] * P[i][j];
        }
      }

      // Check convergence L1 norm
      let diff = 0;
      for (let i = 0; i < k; i++) {
        diff += Math.abs(nextPi[i] - pi[i]);
      }

      pi = nextPi;
      if (diff < tol) break;
    }

    // Normalize
    const sum = pi.reduce((a, b) => a + b, 0);
    return pi.map(v => (sum > 0 ? v / sum : 1 / k));
  },

  /**
   * Invert a square matrix using Gauss-Jordan Elimination
   */
  invertMatrix(A) {
    const n = A.length;
    // Create augmented matrix [A | I]
    const M = A.map((row, i) => [
      ...row,
      ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    ]);

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
          maxRow = k;
        }
      }

      if (Math.abs(M[maxRow][i]) < 1e-12) {
        throw new Error("Matrix is singular and cannot be inverted.");
      }

      // Swap rows
      [M[i], M[maxRow]] = [M[maxRow], M[i]];

      // Normalize pivot row
      const pivot = M[i][i];
      for (let j = 0; j < 2 * n; j++) {
        M[i][j] /= pivot;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = M[k][i];
          for (let j = 0; j < 2 * n; j++) {
            M[k][j] -= factor * M[i][j];
          }
        }
      }
    }

    // Extract right half
    return M.map(row => row.slice(n));
  },

  /**
   * Analyze Absorbing Markov Chain:
   * Returns { transientStates, absorbingStates, Q, R, N, absorptionProbabilities, expectedSteps }
   */
  analyzeAbsorbingChain(P) {
    const n = P.length;
    const absorbing = [];
    const transient = [];

    for (let i = 0; i < n; i++) {
      if (Math.abs(P[i][i] - 1.0) < 1e-5 && P[i].filter(v => v > 0).length === 1) {
        absorbing.push(i);
      } else {
        transient.push(i);
      }
    }

    if (absorbing.length === 0 || transient.length === 0) {
      return null; // Not an absorbing chain structure
    }

    const t = transient.length;
    const r = absorbing.length;

    // Extract Q (transient to transient)
    const Q = Array.from({ length: t }, (_, i) =>
      Array.from({ length: t }, (_, j) => P[transient[i]][transient[j]])
    );

    // Extract R (transient to absorbing)
    const R = Array.from({ length: t }, (_, i) =>
      Array.from({ length: r }, (_, j) => P[transient[i]][absorbing[j]])
    );

    // Compute (I - Q)
    const ImQ = Array.from({ length: t }, (_, i) =>
      Array.from({ length: t }, (_, j) => (i === j ? 1 : 0) - Q[i][j])
    );

    try {
      // Fundamental Matrix N = (I - Q)^(-1)
      const N = this.invertMatrix(ImQ);

      // Expected steps to absorption t = N * 1
      const expectedSteps = N.map(row => row.reduce((a, b) => a + b, 0));

      // Absorption probabilities B = N * R
      const B = this.multiply(N, R);

      return {
        transient,
        absorbing,
        Q,
        R,
        N,
        expectedSteps,
        absorptionProbabilities: B
      };
    } catch (e) {
      console.warn("Could not invert (I-Q):", e);
      return null;
    }
  },

  /**
   * Sample initial state X0 ~ mu0
   */
  sampleInitialState(mu0) {
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < mu0.length; i++) {
      cumulative += mu0[i];
      if (rand <= cumulative || i === mu0.length - 1) {
        return i;
      }
    }
    return 0;
  },

  /**
   * Sample next state according to row probabilities P[currentState]
   */
  sampleNextState(P, currentState) {
    const row = P[currentState];
    const rand = Math.random();
    let cumulative = 0;

    for (let j = 0; j < row.length; j++) {
      cumulative += row[j];
      if (rand <= cumulative || j === row.length - 1) {
        return j;
      }
    }
    return currentState;
  }
};
