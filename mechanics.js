// Classical Mechanics: Least Action Trajectory Simulation
// Following basketball.md specifications
class MechanicsSimulation {
    constructor() {
        this.canvas = document.getElementById('mechanicsCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.animationFrame = null;
        
        // Simulation state
        this.startPoint = { x: 100, y: 500 };
        this.target = { x: 700, y: 300 };
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Physics parameters
        this.gravity = 9.8;
        this.mass = 0.6; // kg
    this.totalTime = 1.2; // seconds, recalculated from geometry each update
    this.phaseScale = 1; // Action spread scaling for phasor visualization
        this.numSegments = 50; // Path discretization
        this.pixelScale = 50; // pixels per meter for physics conversions
        
        // Visualization modes
        this.mode = 'spray'; // 'spray', 'neighborhood', or 'heatmap'
        this.numPaths = 30;
        this.showActionLabels = false;
        this.showPhasors = true;
        this.showClassicalPath = true;
        this.showAllTrajectories = true;
        
        // Generated paths
        this.paths = [];
        this.classicalPath = null;
        
        // Animation
        this.running = false;
        this.time = 0;
        this.ballAnimTime = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events for dragging target
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

        // Control events - check if elements exist before adding listeners
        const gravityEl = document.getElementById('gravity');
        if (gravityEl) {
            gravityEl.addEventListener('input', (e) => {
                this.gravity = parseFloat(e.target.value);
                document.getElementById('gravityValue').textContent = e.target.value;
                this.generatePaths();
            });
        }

        const numPathsEl = document.getElementById('numPaths');
        if (numPathsEl) {
            numPathsEl.addEventListener('input', (e) => {
                this.numPaths = parseInt(e.target.value);
                document.getElementById('numPathsValue').textContent = e.target.value;
                this.generatePaths();
            });
        }

        const pathModeEl = document.getElementById('pathMode');
        if (pathModeEl) {
            pathModeEl.addEventListener('change', (e) => {
                this.mode = e.target.value;
                this.generatePaths();
            });
        }

        const showAllTrajectoriesEl = document.getElementById('showAllTrajectories');
        if (showAllTrajectoriesEl) {
            showAllTrajectoriesEl.addEventListener('change', (e) => {
                this.showAllTrajectories = e.target.checked;
            });
        }

        const showPhasorsEl = document.getElementById('showPhasors');
        if (showPhasorsEl) {
            showPhasorsEl.addEventListener('change', (e) => {
                this.showPhasors = e.target.checked;
            });
        }

        const showClassicalPathEl = document.getElementById('showClassicalPath');
        if (showClassicalPathEl) {
            showClassicalPathEl.addEventListener('change', (e) => {
                this.showClassicalPath = e.target.checked;
            });
        }

        const showActionLabelsEl = document.getElementById('showActionLabels');
        if (showActionLabelsEl) {
            showActionLabelsEl.addEventListener('change', (e) => {
                this.showActionLabels = e.target.checked;
            });
        }
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dist = Math.hypot(x - this.target.x, y - this.target.y);
        if (dist < 25) {
            this.dragging = true;
            this.dragOffset = {
                x: x - this.target.x,
                y: y - this.target.y
            };
        }
    }

    onMouseMove(e) {
        if (this.dragging) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.target.x = Math.max(300, Math.min(750, x - this.dragOffset.x));
            this.target.y = Math.max(50, Math.min(500, y - this.dragOffset.y));
            
            // Regenerate paths
            this.generatePaths();
            this.ballAnimTime = 0;
        }
    }

    onMouseUp() {
        this.dragging = false;
    }

    // Generate Bézier curve points
    cubicBezier(p0, c1, c2, p1, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        return {
            x: mt3 * p0.x + 3 * mt2 * t * c1.x + 3 * mt * t2 * c2.x + t3 * p1.x,
            y: mt3 * p0.y + 3 * mt2 * t * c1.y + 3 * mt * t2 * c2.y + t3 * p1.y
        };
    }

    // Resample Bézier curve to uniform time steps
    resampleBezierPath(p0, c1, c2, p1, numSegments) {
        const points = [];
        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;
            points.push(this.cubicBezier(p0, c1, c2, p1, t));
        }
        return points;
    }

    estimateFlightTime(x0, y0, xT, yT) {
        const dx = xT - x0;
        const dy = yT - y0;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < 1e-6) {
            return 0.8;
        }

        const rawTime = Math.pow((4 * distanceSq) / (this.gravity * this.gravity), 0.25);
        const clampedTime = Math.min(Math.max(rawTime, 0.6), 2.5);
        return clampedTime;
    }

    // Calculate action for a given path
    calculateAction(points) {
        const dt = this.totalTime / (points.length - 1);
        const scale = this.pixelScale;
        const canvasHeight = this.canvas.height;
        let action = 0;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            // Convert to physical meters (y measured upward from ground)
            const x1 = p1.x / scale;
            const y1 = (canvasHeight - p1.y) / scale;
            const x2 = p2.x / scale;
            const y2 = (canvasHeight - p2.y) / scale;

            const vx = (x2 - x1) / dt;
            const vy = (y2 - y1) / dt;
            const v2 = vx * vx + vy * vy;

            const ybar = (y1 + y2) * 0.5;

            // Lagrangian: L = T - V = ½mv² - mgy
            const L = 0.5 * this.mass * v2 - this.mass * this.gravity * ybar;

            action += L * dt;
        }

        return action;
    }

    // Find classical path using parabola
    findClassicalPath() {
    const scale = this.pixelScale;
    const canvasHeight = this.canvas.height;

        // Convert endpoints to physical coordinates (meters)
        const x0 = this.startPoint.x / scale;
        const y0 = (canvasHeight - this.startPoint.y) / scale;
        const xT = this.target.x / scale;
        const yT = (canvasHeight - this.target.y) / scale;

    // Choose the flight time that minimizes launch speed for the given geometry
    const T = this.estimateFlightTime(x0, y0, xT, yT);
    this.totalTime = T;

        // Solve constant-acceleration equations for fixed time T
        const vx0 = (xT - x0) / T;
        const vy0 = (yT - y0 + 0.5 * this.gravity * T * T) / T;

        const points = [];
        for (let i = 0; i <= this.numSegments; i++) {
            const t = (i / this.numSegments) * T;
            const xPhys = x0 + vx0 * t;
            const yPhys = y0 + vy0 * t - 0.5 * this.gravity * t * t;
            points.push({
                x: xPhys * scale,
                y: canvasHeight - yPhys * scale
            });
        }

        const action = this.calculateAction(points);
        return {
            points,
            action,
            phase: 0,
            isClassical: true
        };
    }

    // Generate random control points for Bézier paths
    generateRandomControlPoints() {
        const dx = this.target.x - this.startPoint.x;
        
        // Control point 1
        const c1 = {
            x: this.startPoint.x + dx * (0.2 + Math.random() * 0.3),
            y: this.startPoint.y - 50 - Math.random() * 300
        };
        
        // Control point 2
        const c2 = {
            x: this.startPoint.x + dx * (0.5 + Math.random() * 0.3),
            y: this.startPoint.y - 50 - Math.random() * 300
        };
        
        return { c1, c2 };
    }

    // Generate control points near classical path
    generateNearbyControlPoints(sigma = 30) {
        // Start from classical control points (approximate parabola)
        const dx = this.target.x - this.startPoint.x;
        const dy = this.startPoint.y - this.target.y;
        
        const classicalC1 = {
            x: this.startPoint.x + dx * 0.33,
            y: this.startPoint.y - dy * 0.8 - 100
        };
        
        const classicalC2 = {
            x: this.startPoint.x + dx * 0.67,
            y: this.startPoint.y - dy * 0.8 - 100
        };
        
        // Add Gaussian noise
        const c1 = {
            x: classicalC1.x + (Math.random() - 0.5) * sigma * 2,
            y: classicalC1.y + (Math.random() - 0.5) * sigma
        };
        
        const c2 = {
            x: classicalC2.x + (Math.random() - 0.5) * sigma * 2,
            y: classicalC2.y + (Math.random() - 0.5) * sigma
        };
        
        return { c1, c2 };
    }

    // Generate paths based on current mode
    generatePaths() {
        this.paths = [];
        
        // Always calculate classical path
        this.classicalPath = this.findClassicalPath();
        
        if (this.mode === 'spray') {
            // Generate diverse random paths
            for (let i = 0; i < this.numPaths; i++) {
                const { c1, c2 } = this.generateRandomControlPoints();
                const points = this.resampleBezierPath(this.startPoint, c1, c2, this.target, this.numSegments);
                const action = this.calculateAction(points);
                
                this.paths.push({ points, action, c1, c2 });
            }
        } else if (this.mode === 'neighborhood') {
            // Generate paths near classical path
            for (let i = 0; i < this.numPaths; i++) {
                const sigma = 20 + i * 3; // Increasing deviation
                const { c1, c2 } = this.generateNearbyControlPoints(sigma);
                const points = this.resampleBezierPath(this.startPoint, c1, c2, this.target, this.numSegments);
                const action = this.calculateAction(points);
                
                this.paths.push({ points, action, c1, c2, deviation: sigma });
            }
        } else if (this.mode === 'heatmap') {
            // Generate grid of paths
            const gridSize = Math.floor(Math.sqrt(this.numPaths));
            const dx = this.target.x - this.startPoint.x;
            
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    const c1 = {
                        x: this.startPoint.x + dx * (0.15 + i / gridSize * 0.4),
                        y: this.startPoint.y - 50 - j / gridSize * 300
                    };
                    
                    const c2 = {
                        x: this.startPoint.x + dx * (0.45 + i / gridSize * 0.4),
                        y: this.startPoint.y - 50 - j / gridSize * 300
                    };
                    
                    const points = this.resampleBezierPath(this.startPoint, c1, c2, this.target, this.numSegments);
                    const action = this.calculateAction(points);
                    
                    this.paths.push({ points, action, c1, c2, gridI: i, gridJ: j });
                }
            }
        }
        
        // Sort by action for easier identification
        this.paths.sort((a, b) => a.action - b.action);

        // Scale phases based on action spread so phasor diagram remains informative
        if (this.classicalPath) {
            const classicalAction = this.classicalPath.action;
            let minAction = classicalAction;
            let maxAction = classicalAction;

            for (const path of this.paths) {
                minAction = Math.min(minAction, path.action);
                maxAction = Math.max(maxAction, path.action);
            }

            const spread = maxAction - minAction;
            this.phaseScale = spread > 0 ? spread / (Math.PI * 1.5) : 1;
            if (!isFinite(this.phaseScale) || this.phaseScale === 0) {
                this.phaseScale = 1;
            }

            for (const path of this.paths) {
                path.phase = (path.action - classicalAction) / this.phaseScale;
            }

            this.classicalPath.phase = 0;
        } else {
            this.phaseScale = 1;
        }
    }

    // Calculate phasor sum
    calculatePhasorSum() {
        let re = 0, im = 0;
        
        for (const path of this.paths) {
            re += Math.cos(path.phase);
            im += Math.sin(path.phase);
        }
        
        // Include classical path
        if (this.classicalPath) {
            re += Math.cos(this.classicalPath.phase);
            im += Math.sin(this.classicalPath.phase);
        }
        
        return {
            re,
            im,
            magnitude: Math.hypot(re, im),
            angle: Math.atan2(im, re)
        };
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas with gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#f8f9fc');
        gradient.addColorStop(1, '#ffffff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw court/background with better styling
        ctx.fillStyle = 'rgba(139, 195, 74, 0.08)';
        ctx.fillRect(0, height - 100, width, 100);
        
        // Draw ground line
        ctx.strokeStyle = '#8bc34a';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, height - 100);
        ctx.lineTo(width, height - 100);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Find min/max actions for color scaling
        let minAction = this.classicalPath ? this.classicalPath.action : Infinity;
        let maxAction = -Infinity;
        
        for (const path of this.paths) {
            minAction = Math.min(minAction, path.action);
            maxAction = Math.max(maxAction, path.action);
        }
        
        // Draw alternative paths if enabled
        if (this.showAllTrajectories && this.paths.length > 0) {
            for (const path of this.paths) {
                // Color based on action (cooler = lower S, warmer = higher S)
                const actionRatio = (path.action - minAction) / (maxAction - minAction + 0.1);
                const hue = 220 - actionRatio * 100; // Blue to orange
                const alpha = 0.25;
                
                ctx.strokeStyle = `hsla(${hue}, 65%, 55%, ${alpha})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                
                for (let i = 0; i < path.points.length; i++) {
                    const p = path.points[i];
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
            }
        }
        
        // Draw classical path with better visibility
        if (this.showClassicalPath && this.classicalPath) {
            // Draw white outline first for contrast
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 6;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            
            for (let i = 0; i < this.classicalPath.points.length; i++) {
                const p = this.classicalPath.points[i];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            
            // Draw colored path on top
            ctx.strokeStyle = '#2e7d32';
            ctx.lineWidth = 3.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(76, 175, 80, 0.6)';
            ctx.beginPath();
            
            for (let i = 0; i < this.classicalPath.points.length; i++) {
                const p = this.classicalPath.points[i];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
        }
        
        // Draw phasors if enabled
        if (this.showPhasors) {
            this.drawPhasorDiagram(ctx);
        }
        
        // Animate ball along classical path
        if (this.classicalPath) {
            const progress = (this.ballAnimTime % (this.totalTime + 0.5)) / this.totalTime;
            if (progress <= 1) {
                const ballIndex = Math.floor(progress * (this.classicalPath.points.length - 1));
                const ballPos = this.classicalPath.points[Math.min(ballIndex, this.classicalPath.points.length - 1)];
                
                // Draw ball
                ctx.fillStyle = '#ff6b6b';
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(255, 107, 107, 0.6)';
                ctx.beginPath();
                ctx.arc(ballPos.x, ballPos.y, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Ball outline
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        
        // Draw start point (shooter) with better styling
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.startPoint.x, this.startPoint.y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.startPoint.x, this.startPoint.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#555';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Start', this.startPoint.x, this.startPoint.y + 28);
        ctx.textAlign = 'left';
        
        // Draw target (hoop) with better styling
        // Backboard
        ctx.fillStyle = 'rgba(255, 152, 0, 0.1)';
        ctx.fillRect(this.target.x - 3, this.target.y - 35, 6, 50);
        
        ctx.strokeStyle = '#e65100';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.target.x - 3, this.target.y - 35, 6, 50);
        
        // Hoop rim
        ctx.strokeStyle = '#ff6f00';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(255, 152, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Inner circle
        ctx.strokeStyle = '#ff8f00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        
        // Net suggestion
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(this.target.x + 18 * Math.cos(angle), this.target.y + 18 * Math.sin(angle));
            ctx.lineTo(this.target.x, this.target.y + 35);
            ctx.stroke();
        }
        
        ctx.fillStyle = '#e65100';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Hoop', this.target.x, this.target.y + 55);
        ctx.textAlign = 'left';
        
        // Update stats
        const phasorSum = this.calculatePhasorSum();
        document.getElementById('optimalAction').textContent = this.classicalPath ? this.classicalPath.action.toFixed(2) : '0.00';
        document.getElementById('flightTime').textContent = this.totalTime.toFixed(2);
        document.getElementById('phasorMagnitude').textContent = phasorSum.magnitude.toFixed(2);
    }

    drawPhasorDiagram(ctx) {
        const phasorX = 660;
        const phasorY = 90;
        const phasorRadius = 55;
        
        // Background panel with better styling
        ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(phasorX - 75, phasorY - 75, 150, 190);
        ctx.strokeRect(phasorX - 75, phasorY - 75, 150, 190);
        ctx.shadowBlur = 0;
        
        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Phasor Diagram', phasorX, phasorY - 58);
        ctx.textAlign = 'left';
        
        // Draw circle
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(phasorX, phasorY, phasorRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw axes
        ctx.strokeStyle = '#e0e0e0';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(phasorX - phasorRadius - 10, phasorY);
        ctx.lineTo(phasorX + phasorRadius + 10, phasorY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(phasorX, phasorY - phasorRadius - 10);
        ctx.lineTo(phasorX, phasorY + phasorRadius + 10);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw individual phasors (sample some to avoid clutter)
        const sampleSize = Math.min(12, this.paths.length);
        const step = sampleSize > 0 ? Math.max(1, Math.floor(this.paths.length / sampleSize)) : 1;
        
        let re = 0, im = 0;
        
        if (sampleSize > 0) {
            for (let i = 0; i < this.paths.length; i += step) {
                const path = this.paths[i];
                const arrowLen = 12;
                
                ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(phasorX + re * 12, phasorY + im * 12);
                ctx.lineTo(phasorX + re * 12 + arrowLen * Math.cos(path.phase), 
                           phasorY + im * 12 + arrowLen * Math.sin(path.phase));
                ctx.stroke();
                
                re += Math.cos(path.phase);
                im += Math.sin(path.phase);
            }
        }

        if (this.classicalPath) {
            re += Math.cos(this.classicalPath.phase);
            im += Math.sin(this.classicalPath.phase);
        }
        
        // Draw sum vector with prominence
        const sumLen = Math.hypot(re, im);
        const sumAngle = Math.atan2(im, re);
        const scale = Math.min(1, phasorRadius / (sumLen * 1.2));
        
        // Shadow for depth
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.2)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(phasorX, phasorY);
        ctx.lineTo(phasorX + re * 12 * scale + 1, phasorY + im * 12 * scale + 1);
        ctx.stroke();
        
        // Main arrow
        ctx.strokeStyle = '#4caf50';
        ctx.fillStyle = '#4caf50';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(phasorX, phasorY);
        ctx.lineTo(phasorX + re * 12 * scale, phasorY + im * 12 * scale);
        ctx.stroke();
        
        // Arrowhead
        const headLen = 10;
        const headAngle = sumAngle;
        ctx.beginPath();
        ctx.moveTo(phasorX + re * 12 * scale, phasorY + im * 12 * scale);
        ctx.lineTo(phasorX + re * 12 * scale - headLen * Math.cos(headAngle - 0.4),
                   phasorY + im * 12 * scale - headLen * Math.sin(headAngle - 0.4));
        ctx.lineTo(phasorX + re * 12 * scale - headLen * Math.cos(headAngle + 0.4),
                   phasorY + im * 12 * scale - headLen * Math.sin(headAngle + 0.4));
        ctx.closePath();
        ctx.fill();
        
        // Label below
        ctx.fillStyle = '#2e7d32';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sum', phasorX, phasorY + 80);
        ctx.fillText(`|Σ| = ${sumLen.toFixed(1)}`, phasorX, phasorY + 95);
        ctx.textAlign = 'left';
    }

    start() {
        this.running = true;
        this.ballAnimTime = 0;
        this.generatePaths();
        this.animate();
    }

    stop() {
        this.running = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    animate() {
        if (!this.running) return;
        
        this.time += 0.016;
        this.ballAnimTime += 0.016;
        this.draw();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
}
