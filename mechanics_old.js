// Classical Mechanics: Least Action Trajectory Simulation
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
        
        // Generated paths
        this.paths = [];
        this.classicalPath = null;
        
        // Animation
        this.time = 0;
        this.animatingBall = null;
        this.ballAnimTime = 0;
        
        this.setupEventListeners();
        this.generatePaths();
    }

    setupEventListeners() {
        // Mouse events for dragging target
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

        // Control events
        document.getElementById('gravity').addEventListener('input', (e) => {
            this.gravity = parseFloat(e.target.value);
            document.getElementById('gravityValue').textContent = e.target.value;
            this.generatePaths();
        });

        document.getElementById('totalTime').addEventListener('input', (e) => {
            this.totalTime = parseFloat(e.target.value);
            document.getElementById('totalTimeValue').textContent = e.target.value;
            this.generatePaths();
        });

        document.getElementById('hbarEff').addEventListener('input', (e) => {
            this.hbarEff = parseFloat(e.target.value);
            document.getElementById('hbarEffValue').textContent = e.target.value;
        });

        document.getElementById('numPaths').addEventListener('input', (e) => {
            this.numPaths = parseInt(e.target.value);
            document.getElementById('numPathsValue').textContent = e.target.value;
            this.generatePaths();
        });

        document.getElementById('pathMode').addEventListener('change', (e) => {
            this.mode = e.target.value;
            this.generatePaths();
        });

        document.getElementById('showAllTrajectories').addEventListener('change', (e) => {
            this.showAllTrajectories = e.target.checked;
        });

        document.getElementById('showPhasors').addEventListener('change', (e) => {
            this.showPhasors = e.target.checked;
        });

        document.getElementById('showClassicalPath').addEventListener('change', (e) => {
            this.showClassicalPath = e.target.checked;
        });

        document.getElementById('showActionLabels').addEventListener('change', (e) => {
            this.showActionLabels = e.target.checked;
        });
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

    calculateTrajectory(v0, angle, steps = 100) {
        const angleRad = angle * Math.PI / 180;
        const vx = v0 * Math.cos(angleRad);
        const vy = v0 * Math.sin(angleRad);
        
        const points = [];
        const dt = 0.02;
        
        for (let i = 0; i <= steps; i++) {
            const t = i * dt;
            const x = this.start.x + vx * t * 50; // Scale for visualization
            const y = this.start.y - (vy * t - 0.5 * this.gravity * t * t) * 50;
            
            points.push({ x, y, t });
            
            // Stop if trajectory goes below ground or off screen
            if (y > this.canvas.height || x > this.canvas.width) break;
        }
        
        return points;
    }

    findOptimalTrajectory() {
        // Calculate initial velocity and angle needed to reach target
        const dx = this.target.x - this.start.x;
        const dy = this.start.y - this.target.y; // Inverted y-axis
        
        // Using kinematic equations for projectile motion
        // Multiple solutions possible, we choose the lower arc
        const g = this.gravity;
        
        // Simplified calculation for demonstration
        const v0Squared = (g * dx * dx) / (2 * (dx * Math.tan(45 * Math.PI / 180) - dy));
        const v0 = Math.sqrt(Math.abs(v0Squared)) * 2.5; // Scale factor for visualization
        
        // Calculate launch angle
        let angle = Math.atan2(dy * 2, dx) * 180 / Math.PI;
        if (angle < 0) angle += 90;
        
        // Find best trajectory through iteration
        let bestTrajectory = null;
        let minError = Infinity;
        
        for (let testAngle = 20; testAngle <= 80; testAngle += 0.5) {
            const trajectory = this.calculateTrajectory(v0, testAngle);
            
            // Find closest point to target
            for (const point of trajectory) {
                const error = Math.hypot(point.x - this.target.x, point.y - this.target.y);
                if (error < minError) {
                    minError = error;
                    bestTrajectory = { trajectory, angle: testAngle, v0 };
                }
            }
        }
        
        return bestTrajectory;
    }

    calculateAction(trajectory) {
        // Action S = ∫(T - V)dt where T is kinetic energy and V is potential energy
        // For projectile: S = ∫(½mv² - mgy)dt
        // Simplified calculation for demonstration
        let action = 0;
        const m = 1; // mass = 1 kg
        
        for (let i = 1; i < trajectory.length; i++) {
            const p1 = trajectory[i - 1];
            const p2 = trajectory[i];
            const dt = p2.t - p1.t;
            
            // Kinetic energy (approximate from position change)
            const vx = (p2.x - p1.x) / dt / 50;
            const vy = (p1.y - p2.y) / dt / 50; // Inverted y
            const T = 0.5 * m * (vx * vx + vy * vy);
            
            // Potential energy
            const y = (this.canvas.height - p2.y) / 50; // Convert to meters
            const V = m * this.gravity * y;
            
            action += (T - V) * dt;
        }
        
        return action;
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);
        
        // Draw ground
        ctx.fillStyle = '#8bc34a';
        ctx.fillRect(0, 520, width, 80);
        
        // Find optimal trajectory
        const optimal = this.findOptimalTrajectory();
        
        if (!optimal) return;
        
        // Draw alternative trajectories if enabled
        if (this.showAllTrajectories) {
            for (let angleOffset = -30; angleOffset <= 30; angleOffset += 10) {
                if (angleOffset === 0) continue;
                
                const testAngle = optimal.angle + angleOffset;
                const trajectory = this.calculateTrajectory(optimal.v0, testAngle);
                const action = this.calculateAction(trajectory);
                
                ctx.strokeStyle = 'rgba(200, 100, 100, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                
                for (let i = 0; i < trajectory.length; i++) {
                    const p = trajectory[i];
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
                
                // Draw phasor if enabled
                if (this.showPhasors && trajectory.length > 0) {
                    const endPoint = trajectory[trajectory.length - 1];
                    const phase = action * 0.1; // Scaled phase
                    const arrowLen = 30;
                    const arrowX = endPoint.x + arrowLen * Math.cos(phase);
                    const arrowY = endPoint.y + arrowLen * Math.sin(phase);
                    
                    ctx.strokeStyle = 'rgba(200, 100, 100, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(endPoint.x, endPoint.y);
                    ctx.lineTo(arrowX, arrowY);
                    ctx.stroke();
                    
                    // Arrowhead
                    const angle = Math.atan2(arrowY - endPoint.y, arrowX - endPoint.x);
                    ctx.beginPath();
                    ctx.moveTo(arrowX, arrowY);
                    ctx.lineTo(arrowX - 8 * Math.cos(angle - 0.3), arrowY - 8 * Math.sin(angle - 0.3));
                    ctx.lineTo(arrowX - 8 * Math.cos(angle + 0.3), arrowY - 8 * Math.sin(angle + 0.3));
                    ctx.closePath();
                    ctx.fillStyle = 'rgba(200, 100, 100, 0.4)';
                    ctx.fill();
                }
            }
        }
        
        // Draw optimal trajectory
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let i = 0; i < optimal.trajectory.length; i++) {
            const p = optimal.trajectory[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        
        // Draw optimal phasor
        if (this.showPhasors && optimal.trajectory.length > 0) {
            const action = this.calculateAction(optimal.trajectory);
            const endPoint = optimal.trajectory[optimal.trajectory.length - 1];
            const phase = action * 0.1;
            const arrowLen = 40;
            const arrowX = endPoint.x + arrowLen * Math.cos(phase);
            const arrowY = endPoint.y + arrowLen * Math.sin(phase);
            
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(endPoint.x, endPoint.y);
            ctx.lineTo(arrowX, arrowY);
            ctx.stroke();
            
            const angle = Math.atan2(arrowY - endPoint.y, arrowX - endPoint.x);
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - 10 * Math.cos(angle - 0.3), arrowY - 10 * Math.sin(angle - 0.3));
            ctx.lineTo(arrowX - 10 * Math.cos(angle + 0.3), arrowY - 10 * Math.sin(angle + 0.3));
            ctx.closePath();
            ctx.fillStyle = '#667eea';
            ctx.fill();
        }
        
        // Animate ball along optimal trajectory
        this.animationDuration = optimal.trajectory[optimal.trajectory.length - 1].t;
        const progress = (this.animationTime % (this.animationDuration + 1)) / this.animationDuration;
        const ballIndex = Math.floor(progress * (optimal.trajectory.length - 1));
        
        if (ballIndex < optimal.trajectory.length) {
            this.ballPosition = optimal.trajectory[ballIndex];
            
            // Draw ball
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(this.ballPosition.x, this.ballPosition.y, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw start point (shooter)
        ctx.fillStyle = '#333';
        ctx.fillRect(this.start.x - 15, this.start.y - 40, 10, 40);
        ctx.fillRect(this.start.x - 20, this.start.y - 50, 20, 15);
        
        // Draw target (hoop)
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.target.x, this.target.y - 20);
        ctx.lineTo(this.target.x, this.target.y + 40);
        ctx.stroke();
        
        // Update stats
        const action = this.calculateAction(optimal.trajectory);
        document.getElementById('optimalAction').textContent = action.toFixed(2);
        document.getElementById('flightTime').textContent = this.animationDuration.toFixed(2);
        document.getElementById('launchAngle').textContent = optimal.angle.toFixed(1);
    }

    start() {
        this.running = true;
        this.animationTime = 0;
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
        
        this.animationTime += 0.02;
        this.draw();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
}
