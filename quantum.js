// Quantum Double-Slit: Sum Over Paths Simulation
class QuantumSimulation {
    constructor() {
        this.canvas = document.getElementById('quantumCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.animationFrame = null;
        
        // Simulation state
        this.source = { x: 100, y: 300 };
        this.slitSeparation = 0.5; // mm
        this.wavelength = 550; // nm (green light)
        this.screenDistance = 500; // mm (in canvas units, scaled)
        this.detectorY = 300; // Current detector position
        this.showPaths = true;
        this.showArrows = true;
        this.time = 0;
        
        // Slit positions
        this.slit1 = { x: 350, y: 250 };
        this.slit2 = { x: 350, y: 350 };
        
        this.setupEventListeners();
        this.intensityPattern = this.calculateInterferencePattern();
    }

    setupEventListeners() {
        // Mouse events for moving detector
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;
            this.detectorY = Math.max(50, Math.min(550, y));
        });

        // Control events
        document.getElementById('slitSeparation').addEventListener('input', (e) => {
            this.slitSeparation = parseFloat(e.target.value);
            document.getElementById('slitSeparationValue').textContent = e.target.value;
            this.updateSlitPositions();
            this.intensityPattern = this.calculateInterferencePattern();
        });

        document.getElementById('wavelength').addEventListener('input', (e) => {
            this.wavelength = parseFloat(e.target.value);
            document.getElementById('wavelengthValue').textContent = e.target.value;
            this.intensityPattern = this.calculateInterferencePattern();
        });

        document.getElementById('showPaths').addEventListener('change', (e) => {
            this.showPaths = e.target.checked;
        });

        document.getElementById('showArrows').addEventListener('change', (e) => {
            this.showArrows = e.target.checked;
        });
    }

    updateSlitPositions() {
        const centerY = 300;
        const separation = this.slitSeparation * 100; // Scale to canvas units
        this.slit1.y = centerY - separation / 2;
        this.slit2.y = centerY + separation / 2;
    }

    calculatePathLength(from, to) {
        return Math.hypot(to.x - from.x, to.y - from.y);
    }

    calculatePhase(pathLength) {
        // Phase = 2π * pathLength / wavelength
        // Scale wavelength to canvas units (nm to canvas pixels)
        const wavelengthScaled = this.wavelength / 1000; // Convert to micrometers, then scale
        return (2 * Math.PI * pathLength) / wavelengthScaled;
    }

    calculateAmplitude(screenY) {
        const screenX = 700;
        const screenPoint = { x: screenX, y: screenY };
        
        // Path through slit 1
        const path1Length = this.calculatePathLength(this.source, this.slit1) + 
                           this.calculatePathLength(this.slit1, screenPoint);
        const phase1 = this.calculatePhase(path1Length);
        
        // Path through slit 2
        const path2Length = this.calculatePathLength(this.source, this.slit2) + 
                           this.calculatePathLength(this.slit2, screenPoint);
        const phase2 = this.calculatePhase(path2Length);
        
        // Complex amplitude (as vectors)
        const amp1 = { x: Math.cos(phase1), y: Math.sin(phase1) };
        const amp2 = { x: Math.cos(phase2), y: Math.sin(phase2) };
        
        // Sum of amplitudes
        const totalAmp = {
            x: amp1.x + amp2.x,
            y: amp1.y + amp2.y
        };
        
        // Intensity = |amplitude|²
        const intensity = totalAmp.x * totalAmp.x + totalAmp.y * totalAmp.y;
        
        return { amp1, amp2, totalAmp, intensity, phase1, phase2 };
    }

    calculateInterferencePattern() {
        const pattern = [];
        for (let y = 50; y < 550; y += 2) {
            const result = this.calculateAmplitude(y);
            pattern.push({ y, intensity: result.intensity });
        }
        return pattern;
    }

    drawArrow(ctx, fromX, fromY, length, angle, color, label) {
        const toX = fromX + length * Math.cos(angle);
        const toY = fromY + length * Math.sin(angle);
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        
        // Arrow shaft
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // Arrowhead
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), 
                   toY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), 
                   toY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        
        // Label
        if (label) {
            ctx.font = '12px Arial';
            ctx.fillText(label, toX + 10, toY);
        }
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);
        
        // Draw intensity pattern on screen
        const screenX = 700;
        for (const point of this.intensityPattern) {
            const brightness = point.intensity / 4; // Normalize
            const alpha = Math.min(brightness, 1);
            ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
            ctx.fillRect(screenX, point.y, 50, 2);
        }
        
        // Draw screen
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX, 50);
        ctx.lineTo(screenX, 550);
        ctx.stroke();
        
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.fillText('Screen', screenX + 5, 30);
        
        // Draw barrier with slits
        const barrierX = 350;
        ctx.fillStyle = '#333';
        ctx.fillRect(barrierX - 5, 50, 10, this.slit1.y - 60);
        ctx.fillRect(barrierX - 5, this.slit1.y + 10, 10, this.slit2.y - this.slit1.y - 20);
        ctx.fillRect(barrierX - 5, this.slit2.y + 10, 10, 540 - this.slit2.y);
        
        // Draw slit labels
        ctx.fillStyle = '#667eea';
        ctx.font = '12px Arial';
        ctx.fillText('A', barrierX + 15, this.slit1.y + 5);
        ctx.fillText('B', barrierX + 15, this.slit2.y + 5);
        
        // Draw paths if enabled
        if (this.showPaths) {
            const screenPoint = { x: screenX, y: this.detectorY };
            
            // Sample additional paths (slight variations)
            const numSamplePaths = 3;
            
            // Paths through slit 1
            for (let i = 0; i < numSamplePaths; i++) {
                const offset = (i - 1) * 10;
                const slitPoint = { x: barrierX, y: this.slit1.y + offset };
                
                ctx.strokeStyle = `rgba(255, 100, 100, ${0.3 - i * 0.08})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.source.x, this.source.y);
                ctx.lineTo(slitPoint.x, slitPoint.y);
                ctx.lineTo(screenPoint.x, screenPoint.y);
                ctx.stroke();
            }
            
            // Paths through slit 2
            for (let i = 0; i < numSamplePaths; i++) {
                const offset = (i - 1) * 10;
                const slitPoint = { x: barrierX, y: this.slit2.y + offset };
                
                ctx.strokeStyle = `rgba(100, 100, 255, ${0.3 - i * 0.08})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.source.x, this.source.y);
                ctx.lineTo(slitPoint.x, slitPoint.y);
                ctx.lineTo(screenPoint.x, screenPoint.y);
                ctx.stroke();
            }
            
            // Main paths
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.source.x, this.source.y);
            ctx.lineTo(this.slit1.x, this.slit1.y);
            ctx.lineTo(screenPoint.x, screenPoint.y);
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(100, 100, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(this.source.x, this.source.y);
            ctx.lineTo(this.slit2.x, this.slit2.y);
            ctx.lineTo(screenPoint.x, screenPoint.y);
            ctx.stroke();
        }
        
        // Draw phase arrows if enabled
        if (this.showArrows) {
            const result = this.calculateAmplitude(this.detectorY);
            const arrowBaseX = 600;
            const arrowBaseY = 100;
            const arrowScale = 40;
            
            // Draw arrow diagram panel
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 2;
            ctx.fillRect(arrowBaseX - 60, arrowBaseY - 60, 180, 150);
            ctx.strokeRect(arrowBaseX - 60, arrowBaseY - 60, 180, 150);
            
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('Phase Arrows', arrowBaseX - 50, arrowBaseY - 45);
            
            // Draw reference axes
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(arrowBaseX - 50, arrowBaseY);
            ctx.lineTo(arrowBaseX + 100, arrowBaseY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(arrowBaseX, arrowBaseY - 50);
            ctx.lineTo(arrowBaseX, arrowBaseY + 60);
            ctx.stroke();
            
            // Draw amplitude arrows
            this.drawArrow(ctx, arrowBaseX, arrowBaseY, arrowScale, result.phase1, 
                          'rgba(255, 100, 100, 0.8)', 'A');
            
            const end1X = arrowBaseX + arrowScale * Math.cos(result.phase1);
            const end1Y = arrowBaseY + arrowScale * Math.sin(result.phase1);
            
            this.drawArrow(ctx, end1X, end1Y, arrowScale, result.phase2, 
                          'rgba(100, 100, 255, 0.8)', 'B');
            
            // Draw resultant
            const totalLength = arrowScale * Math.sqrt(result.intensity) / Math.sqrt(2);
            const totalPhase = Math.atan2(result.totalAmp.y, result.totalAmp.x);
            this.drawArrow(ctx, arrowBaseX, arrowBaseY, totalLength, totalPhase, 
                          '#4ecdc4', 'Sum');
        }
        
        // Draw source
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(this.source.x, this.source.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('S', this.source.x, this.source.y + 5);
        
        // Draw detector
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.moveTo(screenX, this.detectorY - 10);
        ctx.lineTo(screenX + 15, this.detectorY);
        ctx.lineTo(screenX, this.detectorY + 10);
        ctx.closePath();
        ctx.fill();
        
        // Draw wave animation from source
        const numWaves = 8;
        for (let i = 0; i < numWaves; i++) {
            const phase = (this.time * 0.05 + i * 0.3) % 1;
            const radius = phase * 250;
            const alpha = 0.3 * (1 - phase);
            
            ctx.strokeStyle = `rgba(100, 150, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.source.x, this.source.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Update stats
        const result = this.calculateAmplitude(this.detectorY);
        const pathDiff = Math.abs(
            (this.calculatePathLength(this.source, this.slit1) + 
             this.calculatePathLength(this.slit1, { x: 700, y: this.detectorY })) -
            (this.calculatePathLength(this.source, this.slit2) + 
             this.calculatePathLength(this.slit2, { x: 700, y: this.detectorY }))
        );
        
        document.getElementById('detectorPos').textContent = 
            ((this.detectorY - 300) * 0.01).toFixed(2);
        document.getElementById('pathDiff').textContent = 
            (pathDiff * 10).toFixed(1);
        document.getElementById('intensity').textContent = 
            result.intensity.toFixed(2);
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
