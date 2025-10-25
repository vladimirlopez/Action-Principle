// Classical Mechanics: Least Action Trajectory Simulation
// Following basketball.md specifications
class MechanicsSimulation {
    constructor() {
        this.canvas = document.getElementById('mechanicsCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.animationFrame = null;
        
        // Simulation state
        this.start = { x: 100, y: 500 };
        this.target = { x: 700, y: 300 };
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Physics parameters
        this.gravity = 9.8;
        this.mass = 0.6; // kg
        this.totalTime = 1.2; // seconds (fixed duration - Hamilton's principle)
        this.hbarEff = 0.5; // Effective ℏ for phase scaling
        this.numSegments = 50; // Path discretization
        
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

        const totalTimeEl = document.getElementById('totalTime');
        if (totalTimeEl) {
            totalTimeEl.addEventListener('input', (e) => {
                this.totalTime = parseFloat(e.target.value);
                document.getElementById('totalTimeValue').textContent = e.target.value;
                this.generatePaths();
            });
        }

        const hbarEffEl = document.getElementById('hbarEff');
        if (hbarEffEl) {
            hbarEffEl.addEventListener('input', (e) => {
                this.hbarEff = parseFloat(e.target.value);
                document.getElementById('hbarEffValue').textContent = e.target.value;
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

    // Calculate action for a given path
    calculateAction(points) {
        const dt = this.totalTime / (points.length - 1);
        let action = 0;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Velocity (in canvas units/s - scale appropriately)
            const vx = (p2.x - p1.x) / dt;
            const vy = (p1.y - p2.y) / dt; // Inverted y-axis
            const v2 = vx * vx + vy * vy;
            
            // Average height (convert canvas y to physical height)
            const ybar = ((this.canvas.height - p1.y) + (this.canvas.height - p2.y)) / 2 / 50; // Scale to meters
            
            // Lagrangian: L = T - V = (1/2)mv² - mgy
            const L = 0.5 * this.mass * (v2 / 2500) - this.mass * this.gravity * ybar;
            
            action += L * dt;
        }
        
        return action;
    }

    // Find classical path using parabola
    findClassicalPath() {
        const dx = this.target.x - this.start.x;
        const dy = this.start.y - this.target.y;
        const T = this.totalTime;
        
        // Initial velocity components for parabolic trajectory
        const vx0 = dx / T;
        const vy0 = (dy + 0.5 * this.gravity * T * T) / T;
        
        const points = [];
        for (let i = 0; i <= this.numSegments; i++) {
            const t = (i / this.numSegments) * T;
            const x = this.start.x + vx0 * t;
            const y = this.start.y - (vy0 * t - 0.5 * this.gravity * t * t);
            points.push({ x, y });
        }
        
        return {
            points,
            action: this.calculateAction(points),
            phase: this.calculateAction(points) / this.hbarEff,
            isClassical: true
        };
    }

    // Generate random control points for Bézier paths
    generateRandomControlPoints() {
        const dx = this.target.x - this.start.x;
        
        // Control point 1
        const c1 = {
            x: this.start.x + dx * (0.2 + Math.random() * 0.3),
            y: this.start.y - 50 - Math.random() * 300
        };
        
        // Control point 2
        const c2 = {
            x: this.start.x + dx * (0.5 + Math.random() * 0.3),
            y: this.start.y - 50 - Math.random() * 300
        };
        
        return { c1, c2 };
    }

    // Generate control points near classical path
    generateNearbyControlPoints(sigma = 30) {
        // Start from classical control points (approximate parabola)
        const dx = this.target.x - this.start.x;
        const dy = this.start.y - this.target.y;
        
        const classicalC1 = {
            x: this.start.x + dx * 0.33,
            y: this.start.y - dy * 0.8 - 100
        };
        
        const classicalC2 = {
            x: this.start.x + dx * 0.67,
            y: this.start.y - dy * 0.8 - 100
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
                const points = this.resampleBezierPath(this.start, c1, c2, this.target, this.numSegments);
                const action = this.calculateAction(points);
                const phase = action / this.hbarEff;
                
                this.paths.push({ points, action, phase, c1, c2 });
            }
        } else if (this.mode === 'neighborhood') {
            // Generate paths near classical path
            for (let i = 0; i < this.numPaths; i++) {
                const sigma = 20 + i * 3; // Increasing deviation
                const { c1, c2 } = this.generateNearbyControlPoints(sigma);
                const points = this.resampleBezierPath(this.start, c1, c2, this.target, this.numSegments);
                const action = this.calculateAction(points);
                const phase = action / this.hbarEff;
                
                this.paths.push({ points, action, phase, c1, c2, deviation: sigma });
            }
        } else if (this.mode === 'heatmap') {
            // Generate grid of paths
            const gridSize = Math.floor(Math.sqrt(this.numPaths));
            const dx = this.target.x - this.start.x;
            
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    const c1 = {
                        x: this.start.x + dx * (0.15 + i / gridSize * 0.4),
                        y: this.start.y - 50 - j / gridSize * 300
                    };
                    
                    const c2 = {
                        x: this.start.x + dx * (0.45 + i / gridSize * 0.4),
                        y: this.start.y - 50 - j / gridSize * 300
                    };
                    
                    const points = this.resampleBezierPath(this.start, c1, c2, this.target, this.numSegments);
                    const action = this.calculateAction(points);
                    const phase = action / this.hbarEff;
                    
                    this.paths.push({ points, action, phase, c1, c2, gridI: i, gridJ: j });
                }
            }
        }
        
        // Sort by action for easier identification
        this.paths.sort((a, b) => a.action - b.action);
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
        
        // Clear canvas
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        
        // Draw court/background
        ctx.fillStyle = 'rgba(139, 195, 74, 0.1)';
        ctx.fillRect(0, height - 100, width, 100);
        
        // Draw ground line
        ctx.strokeStyle = '#8bc34a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, height - 100);
        ctx.lineTo(width, height - 100);
        ctx.stroke();
        
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
                const hue = 240 - actionRatio * 120; // Blue to red
                const alpha = 0.3;
                
                ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${alpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                
                for (let i = 0; i < path.points.length; i++) {
                    const p = path.points[i];
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
                
                // Show action labels if enabled
                if (this.showActionLabels && path.points.length > 0) {
                    const midPoint = path.points[Math.floor(path.points.length / 2)];
                    ctx.fillStyle = `hsla(${hue}, 70%, 40%, 0.8)`;
                    ctx.font = '9px Arial';
                    ctx.fillText(`S=${path.action.toFixed(1)}`, midPoint.x - 20, midPoint.y - 5);
                }
            }
        }
        
        // Draw classical path
        if (this.showClassicalPath && this.classicalPath) {
            ctx.strokeStyle = '#4caf50';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(76, 175, 80, 0.5)';
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            
            for (let i = 0; i < this.classicalPath.points.length; i++) {
                const p = this.classicalPath.points[i];
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            
            // Label
            const midPoint = this.classicalPath.points[Math.floor(this.classicalPath.points.length / 2)];
            ctx.fillStyle = '#2e7d32';
            ctx.font = 'bold 11px Arial';
            ctx.fillText(`Classical: S=${this.classicalPath.action.toFixed(1)}`, midPoint.x - 50, midPoint.y - 15);
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
        
        // Draw start point (shooter)
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.start.x, this.start.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#666';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Shooter', this.start.x - 25, this.start.y + 25);
        
        // Draw target (hoop)
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.target.x, this.target.y - 20);
        ctx.lineTo(this.target.x, this.target.y + 30);
        ctx.stroke();
        
        ctx.fillStyle = '#e65100';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Hoop', this.target.x - 15, this.target.y + 45);
        
        // Update stats
        const phasorSum = this.calculatePhasorSum();
        document.getElementById('optimalAction').textContent = this.classicalPath ? this.classicalPath.action.toFixed(2) : '0.00';
        document.getElementById('flightTime').textContent = this.totalTime.toFixed(2);
        document.getElementById('phasorMagnitude').textContent = phasorSum.magnitude.toFixed(2);
    }

    drawPhasorDiagram(ctx) {
        const phasorX = 650;
        const phasorY = 80;
        const phasorRadius = 60;
        
        // Background panel
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.fillRect(phasorX - 70, phasorY - 70, 140, 180);
        ctx.strokeRect(phasorX - 70, phasorY - 70, 140, 180);
        
        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('Phase Diagram', phasorX - 60, phasorY - 55);
        
        // Draw circle
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(phasorX, phasorY, phasorRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw axes
        ctx.strokeStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(phasorX - phasorRadius - 5, phasorY);
        ctx.lineTo(phasorX + phasorRadius + 5, phasorY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(phasorX, phasorY - phasorRadius - 5);
        ctx.lineTo(phasorX, phasorY + phasorRadius + 5);
        ctx.stroke();
        
        // Draw individual phasors (sample some to avoid clutter)
        const sampleSize = Math.min(15, this.paths.length);
        const step = Math.max(1, Math.floor(this.paths.length / sampleSize));
        
        let re = 0, im = 0;
        
        for (let i = 0; i < this.paths.length; i += step) {
            const path = this.paths[i];
            const arrowLen = 15;
            const arrowX = phasorX + arrowLen * Math.cos(path.phase);
            const arrowY = phasorY + arrowLen * Math.sin(path.phase);
            
            ctx.strokeStyle = 'rgba(200, 100, 100, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(phasorX + re * 15, phasorY + im * 15);
            ctx.lineTo(phasorX + re * 15 + arrowLen * Math.cos(path.phase), 
                       phasorY + im * 15 + arrowLen * Math.sin(path.phase));
            ctx.stroke();
            
            re += Math.cos(path.phase);
            im += Math.sin(path.phase);
        }
        
        // Draw sum vector
        const sumLen = Math.hypot(re, im);
        const sumAngle = Math.atan2(im, re);
        const scale = Math.min(1, phasorRadius / (sumLen * 1.5));
        
        ctx.strokeStyle = '#4caf50';
        ctx.fillStyle = '#4caf50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(phasorX, phasorY);
        ctx.lineTo(phasorX + re * 15 * scale, phasorY + im * 15 * scale);
        ctx.stroke();
        
        // Arrowhead
        const headLen = 8;
        const headAngle = sumAngle;
        ctx.beginPath();
        ctx.moveTo(phasorX + re * 15 * scale, phasorY + im * 15 * scale);
        ctx.lineTo(phasorX + re * 15 * scale - headLen * Math.cos(headAngle - 0.3),
                   phasorY + im * 15 * scale - headLen * Math.sin(headAngle - 0.3));
        ctx.lineTo(phasorX + re * 15 * scale - headLen * Math.cos(headAngle + 0.3),
                   phasorY + im * 15 * scale - headLen * Math.sin(headAngle + 0.3));
        ctx.closePath();
        ctx.fill();
        
        // Label
        ctx.fillStyle = '#2e7d32';
        ctx.font = '10px Arial';
        ctx.fillText('∑ e^(iS/ℏ)', phasorX - 30, phasorY + 80);
        ctx.fillText(`|Σ| = ${sumLen.toFixed(1)}`, phasorX - 30, phasorY + 95);
    }

    start() {
        console.log('MechanicsSimulation.start() called');
        this.running = true;
        this.ballAnimTime = 0;
        this.generatePaths();
        console.log('Paths generated:', this.paths.length);
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
