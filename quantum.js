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
        
        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Draw intensity pattern on screen with better contrast
        const screenX = 700;
        const maxIntensity = 4; // Theoretical max for two equal amplitudes
        
        for (const point of this.intensityPattern) {
            const normalizedIntensity = point.intensity / maxIntensity;
            // Use a more visible color gradient
            const brightness = Math.floor(normalizedIntensity * 255);
            const alpha = 0.6 + normalizedIntensity * 0.4; // More opaque
            ctx.fillStyle = `rgba(50, 100, ${brightness}, ${alpha})`;
            ctx.fillRect(screenX, point.y, 80, 3); // Wider and taller bars
        }
        
        // Draw screen
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(screenX, 50);
        ctx.lineTo(screenX, 550);
        ctx.stroke();
        
        ctx.fillStyle = '#222';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Detection Screen', screenX + 10, 35);
        
        // Draw barrier with slits - make it more prominent
        const barrierX = 350;
        ctx.fillStyle = '#444';
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.fillRect(barrierX - 8, 50, 16, this.slit1.y - 60);
        ctx.fillRect(barrierX - 8, this.slit1.y + 10, 16, this.slit2.y - this.slit1.y - 20);
        ctx.fillRect(barrierX - 8, this.slit2.y + 10, 16, 540 - this.slit2.y);
        ctx.shadowBlur = 0;
        
        // Highlight the slits
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(barrierX - 8, this.slit1.y - 5, 16, 15);
        ctx.fillRect(barrierX - 8, this.slit2.y - 5, 16, 15);
        
        // Draw slit labels with background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(barrierX + 12, this.slit1.y - 12, 30, 20);
        ctx.fillRect(barrierX + 12, this.slit2.y - 12, 30, 20);
        
        ctx.fillStyle = '#d32f2f';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('A', barrierX + 20, this.slit1.y + 3);
        ctx.fillStyle = '#1976d2';
        ctx.fillText('B', barrierX + 20, this.slit2.y + 3);
        
        // Draw paths if enabled - show MORE paths
        if (this.showPaths) {
            const screenPoint = { x: screenX, y: this.detectorY };
            
            // Show many more sample paths through each slit
            const numSamplePaths = 8;
            
            // Paths through slit 1 (red/orange)
            for (let i = 0; i < numSamplePaths; i++) {
                const offset = (i - numSamplePaths/2) * 4;
                const slitPoint = { x: barrierX, y: this.slit1.y + offset };
                
                const alpha = 0.15 + 0.1 / (Math.abs(i - numSamplePaths/2) + 1);
                ctx.strokeStyle = `rgba(211, 47, 47, ${alpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.source.x, this.source.y);
                ctx.lineTo(slitPoint.x, slitPoint.y);
                ctx.lineTo(screenPoint.x, screenPoint.y);
                ctx.stroke();
            }
            
            // Paths through slit 2 (blue)
            for (let i = 0; i < numSamplePaths; i++) {
                const offset = (i - numSamplePaths/2) * 4;
                const slitPoint = { x: barrierX, y: this.slit2.y + offset };
                
                const alpha = 0.15 + 0.1 / (Math.abs(i - numSamplePaths/2) + 1);
                ctx.strokeStyle = `rgba(25, 118, 210, ${alpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.source.x, this.source.y);
                ctx.lineTo(slitPoint.x, slitPoint.y);
                ctx.lineTo(screenPoint.x, screenPoint.y);
                ctx.stroke();
            }
            
            // Main central paths (thicker)
            ctx.strokeStyle = 'rgba(211, 47, 47, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.source.x, this.source.y);
            ctx.lineTo(this.slit1.x, this.slit1.y);
            ctx.lineTo(screenPoint.x, screenPoint.y);
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(25, 118, 210, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.source.x, this.source.y);
            ctx.lineTo(this.slit2.x, this.slit2.y);
            ctx.lineTo(screenPoint.x, screenPoint.y);
            ctx.stroke();
        }
        
        // Draw phase arrows if enabled
        if (this.showArrows) {
            const result = this.calculateAmplitude(this.detectorY);
            const arrowBaseX = 580;
            const arrowBaseY = 120;
            const arrowScale = 50;
            
            // Draw arrow diagram panel with better styling
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.fillRect(arrowBaseX - 80, arrowBaseY - 80, 200, 180);
            ctx.strokeRect(arrowBaseX - 80, arrowBaseY - 80, 200, 180);
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#333';
            ctx.font = 'bold 13px Arial';
            ctx.fillText('Phasor Addition', arrowBaseX - 65, arrowBaseY - 60);
            
            // Draw reference axes
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(arrowBaseX - 70, arrowBaseY);
            ctx.lineTo(arrowBaseX + 110, arrowBaseY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(arrowBaseX, arrowBaseY - 70);
            ctx.lineTo(arrowBaseX, arrowBaseY + 80);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Labels for axes
            ctx.fillStyle = '#888';
            ctx.font = '11px Arial';
            ctx.fillText('Re', arrowBaseX + 95, arrowBaseY + 15);
            ctx.fillText('Im', arrowBaseX - 10, arrowBaseY - 55);
            
            // Draw amplitude arrows with better styling
            this.drawArrow(ctx, arrowBaseX, arrowBaseY, arrowScale, result.phase1, 
                          'rgba(211, 47, 47, 0.9)', '');
            
            const end1X = arrowBaseX + arrowScale * Math.cos(result.phase1);
            const end1Y = arrowBaseY + arrowScale * Math.sin(result.phase1);
            
            this.drawArrow(ctx, end1X, end1Y, arrowScale, result.phase2, 
                          'rgba(25, 118, 210, 0.9)', '');
            
            // Label the individual arrows
            ctx.fillStyle = '#d32f2f';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('ψ_A', arrowBaseX + 25 * Math.cos(result.phase1) - 5, 
                         arrowBaseY + 25 * Math.sin(result.phase1) + 15);
            
            ctx.fillStyle = '#1976d2';
            ctx.fillText('ψ_B', end1X + 25 * Math.cos(result.phase2) - 5, 
                         end1Y + 25 * Math.sin(result.phase2) + 15);
            
            // Draw resultant with dashed line from origin
            const totalLength = arrowScale * Math.sqrt(result.intensity) / Math.sqrt(2);
            const totalPhase = Math.atan2(result.totalAmp.y, result.totalAmp.x);
            
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(arrowBaseX, arrowBaseY);
            ctx.lineTo(end1X + arrowScale * Math.cos(result.phase2), 
                       end1Y + arrowScale * Math.sin(result.phase2));
            ctx.stroke();
            ctx.setLineDash([]);
            
            this.drawArrow(ctx, arrowBaseX, arrowBaseY, totalLength, totalPhase, 
                          '#4caf50', '');
            
            // Label the sum
            ctx.fillStyle = '#2e7d32';
            ctx.font = 'bold 13px Arial';
            ctx.fillText('ψ_total', arrowBaseX + totalLength * Math.cos(totalPhase) * 0.5 - 15, 
                         arrowBaseY + totalLength * Math.sin(totalPhase) * 0.5 - 8);
            
            // Show intensity value
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.fillText(`I = |ψ|² = ${result.intensity.toFixed(2)}`, arrowBaseX - 65, arrowBaseY + 70);
        }
        
        // Draw source with better styling
        ctx.fillStyle = '#ff6b6b';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 107, 107, 0.5)';
        ctx.beginPath();
        ctx.arc(this.source.x, this.source.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('S', this.source.x, this.source.y + 6);
        ctx.textAlign = 'left';
        
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('Source', this.source.x - 20, this.source.y + 30);
        
        // Draw detector pointer with better visibility
        ctx.fillStyle = '#4ecdc4';
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(78, 205, 196, 0.6)';
        ctx.beginPath();
        ctx.moveTo(screenX, this.detectorY - 12);
        ctx.lineTo(screenX + 20, this.detectorY);
        ctx.lineTo(screenX, this.detectorY + 12);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#2c9e94';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw wave animation from source
        const numWaves = 6;
        for (let i = 0; i < numWaves; i++) {
            const phase = (this.time * 0.03 + i * 0.25) % 1;
            const radius = phase * 280;
            const alpha = 0.25 * (1 - phase);
            
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
