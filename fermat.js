// Fermat's Principle of Least Time Simulation
class FermatSimulation {
    constructor() {
        this.canvas = document.getElementById('fermatCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.animationFrame = null;
        
        // Simulation state - refraction between two media
        this.source = { x: 150, y: 100 };
        this.target = { x: 650, y: 500 };
        this.refractionPoint = { x: 400, y: 300 }; // Point on the boundary
        this.boundaryY = 300; // Horizontal boundary between air and water
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Physics parameters
        this.n1 = 1.0; // Air refractive index
        this.n2 = 1.5; // Water refractive index (adjustable)
        this.speedOfLight = 299.792; // mm/ns
        this.v1 = this.speedOfLight / this.n1;
        this.v2 = this.speedOfLight / this.n2;
        
        this.showAllPaths = true;
        this.showWavefronts = false;
        this.time = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events for dragging refraction point
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

        // Control events
        document.getElementById('refractiveIndex').addEventListener('input', (e) => {
            this.n2 = parseFloat(e.target.value);
            this.v2 = this.speedOfLight / this.n2;
            document.getElementById('refractiveIndexValue').textContent = e.target.value;
        });

        document.getElementById('showAllPaths').addEventListener('change', (e) => {
            this.showAllPaths = e.target.checked;
        });

        document.getElementById('showWavefronts').addEventListener('change', (e) => {
            this.showWavefronts = e.target.checked;
        });
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if clicking on the refraction point OR anywhere near the boundary
        const distToPoint = Math.hypot(x - this.refractionPoint.x, y - this.boundaryY);
        const distToBoundary = Math.abs(y - this.boundaryY);
        
        if (distToPoint < 20 || (distToBoundary < 15 && x > 100 && x < 700)) {
            this.dragging = true;
            // If clicking on boundary but not on point, move point to that x position
            if (distToPoint >= 20) {
                this.refractionPoint.x = x;
            }
            this.dragOffset = {
                x: x - this.refractionPoint.x,
                y: 0 // Keep on boundary
            };
        }
    }

    onMouseMove(e) {
        if (this.dragging) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            // Keep refraction point on the boundary line
            this.refractionPoint.x = Math.max(100, Math.min(700, x - this.dragOffset.x));
            this.refractionPoint.y = this.boundaryY;
        } else {
            // Show cursor feedback when hovering over boundary
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const distToBoundary = Math.abs(y - this.boundaryY);
            
            if (distToBoundary < 15 && x > 100 && x < 700) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
        }
    }

    onMouseUp() {
        this.dragging = false;
    }

    calculateTravelTime(refractionX) {
        // Distance in medium 1 (air)
        const d1 = Math.hypot(refractionX - this.source.x, this.boundaryY - this.source.y);
        
        // Distance in medium 2 (water)
        const d2 = Math.hypot(this.target.x - refractionX, this.target.y - this.boundaryY);
        
        // Total travel time T(x) = d1/v1 + d2/v2
        const time = d1 / this.v1 + d2 / this.v2;
        return time;
    }

    findOptimalRefractionPoint() {
        // Find x that minimizes travel time (Snell's law)
        // Using numerical search
        let minTime = Infinity;
        let optimalX = this.refractionPoint.x;
        
        for (let x = 100; x <= 700; x += 0.5) {
            const time = this.calculateTravelTime(x);
            if (time < minTime) {
                minTime = time;
                optimalX = x;
            }
        }
        
        return { x: optimalX, y: this.boundaryY, time: minTime };
    }

    calculateAngles(refractionX) {
        // Angle of incidence (from normal)
        const dx1 = refractionX - this.source.x;
        const dy1 = this.boundaryY - this.source.y;
        const theta1 = Math.abs(Math.atan2(dx1, dy1)) * 180 / Math.PI;
        
        // Angle of refraction (from normal)
        const dx2 = this.target.x - refractionX;
        const dy2 = this.target.y - this.boundaryY;
        const theta2 = Math.abs(Math.atan2(dx2, dy2)) * 180 / Math.PI;
        
        return { theta1, theta2 };
    }

    drawWavefronts(ctx, optimal) {
        const numWavefronts = 8;
        const maxRadius = 400;
        
        for (let i = 0; i < numWavefronts; i++) {
            const phase = (this.time * 0.015 + i * 0.125) % 1;
            const radius = phase * maxRadius;
            const alpha = 0.3 * (1 - phase * 0.6);
            
            // Circular wavefront expanding from source in medium 1 (air)
            if (radius < Math.abs(this.boundaryY - this.source.y) + 50) {
                ctx.strokeStyle = `rgba(66, 135, 245, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.source.x, this.source.y, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Refracted wavefronts in medium 2 (water) - slower speed
            const distToBoundary = Math.abs(this.boundaryY - this.source.y);
            if (radius > distToBoundary) {
                // Wavefront has crossed boundary, now traveling slower
                const radiusInAir = distToBoundary;
                const timeInWater = (radius - radiusInAir) / this.v1;
                const radiusInWater = timeInWater * this.v2; // Slower in water
                
                // Draw refracted wavefront (elliptical due to speed change)
                ctx.strokeStyle = `rgba(30, 100, 255, ${alpha * 0.9})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(this.source.x, this.boundaryY, 
                           radiusInWater * (this.v2/this.v1), radiusInWater,
                           0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Show pulse when wavefront reaches target
        const pulsePhase = (this.time * 0.015) % 1;
        if (pulsePhase > 0.75 && pulsePhase < 0.95) {
            const glowPhase = (pulsePhase - 0.75) / 0.2;
            ctx.fillStyle = `rgba(100, 255, 100, ${0.4 * (1 - glowPhase)})`;
            ctx.beginPath();
            ctx.arc(this.target.x, this.target.y, 25 * glowPhase, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawAngleArcs(ctx) {
        const angles = this.calculateAngles(this.refractionPoint.x);
        const arcRadius = 35;
        
        // Angle of incidence (θ₁) - in air
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const startAngle1 = -Math.PI / 2; // From normal (pointing up)
        const angle1Rad = angles.theta1 * Math.PI / 180;
        const endAngle1 = startAngle1 + (this.refractionPoint.x > this.source.x ? angle1Rad : -angle1Rad);
        ctx.arc(this.refractionPoint.x, this.boundaryY, arcRadius, startAngle1, endAngle1);
        ctx.stroke();
        
        // Label for θ₁
        const labelOffset1 = this.refractionPoint.x > this.source.x ? -70 : 10;
        ctx.fillStyle = 'rgba(200, 50, 50, 0.95)';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`θ₁=${angles.theta1.toFixed(1)}°`, this.refractionPoint.x + labelOffset1, this.boundaryY - arcRadius - 8);
        
        // Angle of refraction (θ₂) - in water
        ctx.strokeStyle = 'rgba(30, 100, 255, 0.7)';
        ctx.beginPath();
        const startAngle2 = Math.PI / 2; // From normal (pointing down)
        const angle2Rad = angles.theta2 * Math.PI / 180;
        const endAngle2 = startAngle2 - (this.target.x > this.refractionPoint.x ? angle2Rad : -angle2Rad);
        ctx.arc(this.refractionPoint.x, this.boundaryY, arcRadius, startAngle2, endAngle2, true);
        ctx.stroke();
        
        // Label for θ₂
        const labelOffset2 = this.target.x > this.refractionPoint.x ? 10 : -70;
        ctx.fillStyle = 'rgba(30, 100, 200, 0.95)';
        ctx.fillText(`θ₂=${angles.theta2.toFixed(1)}°`, this.refractionPoint.x + labelOffset2, this.boundaryY + arcRadius + 18);
        
        // Show Snell's Law verification
        const snellLeft = this.n1 * Math.sin(angle1Rad);
        const snellRight = this.n2 * Math.sin(angle2Rad);
        const snellDiff = Math.abs(snellLeft - snellRight);
        
        if (snellDiff < 0.05) {
            ctx.fillStyle = 'rgba(50, 180, 50, 1)';
            ctx.font = 'bold 12px Arial';
            const checkX = this.refractionPoint.x < 400 ? this.refractionPoint.x + 60 : this.refractionPoint.x - 180;
            ctx.fillText('✓ Snell\'s Law satisfied!', checkX, this.boundaryY);
        }
    }

    drawTravelTimeGraph(ctx, optimal) {
        const graphX = 450;
        const graphY = 510;
        const graphWidth = 320;
        const graphHeight = 70;
        
        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(graphX, graphY, graphWidth, graphHeight);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(graphX, graphY, graphWidth, graphHeight);
        
        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('Travel Time vs. Position', graphX + 5, graphY + 12);
        
        // Plot travel time curve
        const samples = 100;
        let minTime = Infinity;
        let maxTime = -Infinity;
        const times = [];
        
        for (let i = 0; i <= samples; i++) {
            const x = 100 + (600 / samples) * i;
            const time = this.calculateTravelTime(x);
            times.push({ x, time });
            minTime = Math.min(minTime, time);
            maxTime = Math.max(maxTime, time);
        }
        
        ctx.beginPath();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        
        times.forEach((point, i) => {
            const plotX = graphX + 10 + (graphWidth - 20) * ((point.x - 100) / 600);
            const plotY = graphY + graphHeight - 10 - ((point.time - minTime) / (maxTime - minTime)) * (graphHeight - 20);
            
            if (i === 0) ctx.moveTo(plotX, plotY);
            else ctx.lineTo(plotX, plotY);
        });
        ctx.stroke();
        
        // Mark optimal point
        const optimalPlotX = graphX + 10 + (graphWidth - 20) * ((optimal.x - 100) / 600);
        const optimalPlotY = graphY + graphHeight - 10 - ((optimal.time - minTime) / (maxTime - minTime)) * (graphHeight - 20);
        
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.arc(optimalPlotX, optimalPlotY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Mark current point
        const currentPlotX = graphX + 10 + (graphWidth - 20) * ((this.refractionPoint.x - 100) / 600);
        const currentTime = this.calculateTravelTime(this.refractionPoint.x);
        const currentPlotY = graphY + graphHeight - 10 - ((currentTime - minTime) / (maxTime - minTime)) * (graphHeight - 20);
        
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(currentPlotX, currentPlotY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#f0f7ff');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, '#e3f2fd');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw two media regions with better styling
        // Medium 1 (Air) - top region
        ctx.fillStyle = 'rgba(135, 206, 250, 0.08)';
        ctx.fillRect(0, 0, width, this.boundaryY);
        
        // Medium 2 (Water) - bottom region
        ctx.fillStyle = 'rgba(30, 144, 255, 0.15)';
        ctx.fillRect(0, this.boundaryY, width, height - this.boundaryY);
        
        // Draw boundary line
        ctx.strokeStyle = '#455a64';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.moveTo(0, this.boundaryY);
        ctx.lineTo(width, this.boundaryY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Medium labels with backgrounds - no overlap
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(15, 15, 140, 28);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(15, 15, 140, 28);
        
        ctx.fillStyle = '#263238';
        ctx.font = 'bold 15px Arial';
        ctx.fillText(`Air (n₁ = ${this.n1.toFixed(1)})`, 22, 35);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(15, this.boundaryY + 10, 160, 28);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(15, this.boundaryY + 10, 160, 28);
        
        ctx.fillStyle = '#263238';
        ctx.font = 'bold 15px Arial';
        ctx.fillText(`Water (n₂ = ${this.n2.toFixed(1)})`, 22, this.boundaryY + 28);
        
        // Find optimal path
        const optimal = this.findOptimalRefractionPoint();
        
        // Draw alternative paths if enabled - cleaner
        if (this.showAllPaths) {
            for (let i = 0; i < 12; i++) {
                const testX = 180 + i * 45;
                const time = this.calculateTravelTime(testX);
                
                // Color based on how far from optimal
                const timeDiff = time - optimal.time;
                const colorIntensity = Math.min(timeDiff * 50, 1);
                const alpha = 0.2;
                
                ctx.strokeStyle = `rgba(${170 + colorIntensity * 70}, ${110 - colorIntensity * 90}, ${100 - colorIntensity * 50}, ${alpha})`;
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.moveTo(this.source.x, this.source.y);
                ctx.lineTo(testX, this.boundaryY);
                ctx.lineTo(this.target.x, this.target.y);
                ctx.stroke();
            }
        }
        
        // Draw optimal path with better visibility
        const optimalTime = optimal.time;
        
        // White outline first
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 7;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(this.source.x, this.source.y);
        ctx.lineTo(optimal.x, this.boundaryY);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Colored path on top
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(76, 175, 80, 0.6)';
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(this.source.x, this.source.y);
        ctx.lineTo(optimal.x, this.boundaryY);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        
        // Label optimal path
        ctx.fillStyle = 'rgba(50, 200, 50, 0.95)';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`Optimal: ${optimalTime.toFixed(3)}ns`, optimal.x - 40, this.boundaryY - 20);
        
        // Draw current path (user-controlled)
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.source.x, this.source.y);
        ctx.lineTo(this.refractionPoint.x, this.boundaryY);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.stroke();
        
        // Draw wavefronts if enabled (Huygens' principle)
        if (this.showWavefronts) {
            this.drawWavefronts(ctx, optimal);
        }
        
        // Draw normal line at refraction point
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.refractionPoint.x, this.boundaryY - 70);
        ctx.lineTo(this.refractionPoint.x, this.boundaryY + 70);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Label "Normal" at top
        ctx.fillStyle = '#777';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Normal', this.refractionPoint.x, this.boundaryY - 75);
        ctx.textAlign = 'left';
        
        // Draw angle arcs
        this.drawAngleArcs(ctx);
        
        // Draw source
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(this.source.x, this.source.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('S', this.source.x, this.source.y + 5);
        
        // Draw target
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillText('T', this.target.x, this.target.y + 5);
        
        // Draw refraction point with glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.dragging ? 'rgba(255, 215, 0, 0.8)' : 'rgba(102, 126, 234, 0.6)';
        ctx.fillStyle = this.dragging ? '#ffd700' : '#667eea';
        ctx.beginPath();
        ctx.arc(this.refractionPoint.x, this.boundaryY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Add drag instruction if not dragging
        if (!this.dragging) {
            ctx.fillStyle = 'rgba(102, 126, 234, 0.9)';
            ctx.font = '11px Arial';
            ctx.fillText('← Drag me! →', this.refractionPoint.x - 35, this.boundaryY - 15);
        }
        
        // Draw travel time graph at bottom
        this.drawTravelTimeGraph(ctx, optimal);
        
        // Update stats
        const currentTime = this.calculateTravelTime(this.refractionPoint.x);
        const angles = this.calculateAngles(this.refractionPoint.x);
        
        document.getElementById('optimalTime').textContent = currentTime.toFixed(3);
        document.getElementById('angleIncidence').textContent = angles.theta1.toFixed(1);
        document.getElementById('angleReflection').textContent = angles.theta2.toFixed(1);
    }

    start() {
        this.running = true;
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
        
        this.time++;
        this.draw();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
}
