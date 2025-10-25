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

        this.baseWidth = this.canvas.width;
        this.baseHeight = this.canvas.height;
        this.displayWidth = this.baseWidth;
        this.displayHeight = this.baseHeight;
        this.scaleX = 1;
        this.scaleY = 1;
        this.pixelRatio = window.devicePixelRatio || 1;

        this.resizeObserver = new ResizeObserver(() => this.updateCanvasMetrics());
        this.resizeObserver.observe(this.canvas);
        this.updateCanvasMetrics();
    }

    setupEventListeners() {
        // Mouse events for moving detector
        this.canvas.addEventListener('mousemove', (e) => {
            const { y } = this.toBaseCoordinates(e);
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

    updateCanvasMetrics() {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        this.displayWidth = rect.width;
        this.displayHeight = rect.height;
        this.scaleX = rect.width / this.baseWidth;
        this.scaleY = rect.height / this.baseHeight;

        const targetWidth = Math.round(rect.width * dpr);
        const targetHeight = Math.round(rect.height * dpr);

        if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
            this.canvas.width = targetWidth;
            this.canvas.height = targetHeight;
        }

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.scaleX * dpr, this.scaleY * dpr);
        this.pixelRatio = dpr;
    }

    toBaseCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return { x: 0, y: 0 };
        }

        return {
            x: ((event.clientX - rect.left) * this.baseWidth) / rect.width,
            y: ((event.clientY - rect.top) * this.baseHeight) / rect.height
        };
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

    drawFloatingLabel(text, centerX, centerY, color) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = '600 13px "Inter", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(text);
        const paddingX = 6;
        const paddingY = 4;
        const ascent = metrics.actualBoundingBoxAscent || 10;
        const descent = metrics.actualBoundingBoxDescent || 4;
        const boxWidth = metrics.width + paddingX * 2;
        const boxHeight = ascent + descent + paddingY * 2;
        const boxX = centerX - boxWidth / 2;
        const boxY = centerY - boxHeight / 2;

        ctx.fillStyle = 'rgba(12, 16, 21, 0.85)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        ctx.fillStyle = color;
        ctx.fillText(text, centerX, centerY);
        ctx.restore();
    }

    draw() {
        const ctx = this.ctx;
        this.updateCanvasMetrics();
        const width = this.baseWidth;
        const height = this.baseHeight;
        
        // Clear canvas with gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#fafbfc');
        gradient.addColorStop(1, '#f5f7fa');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw intensity pattern on screen with better contrast
        const screenX = 700;
        const maxIntensity = 4; // Theoretical max for two equal amplitudes
        
        for (const point of this.intensityPattern) {
            const normalizedIntensity = point.intensity / maxIntensity;
            // Beautiful gradient based on intensity
            const brightness = Math.floor(normalizedIntensity * 200);
            const alpha = 0.5 + normalizedIntensity * 0.5;
            ctx.fillStyle = `rgba(30, 90, ${100 + brightness}, ${alpha})`;
            ctx.fillRect(screenX + 2, point.y - 1, 90, 4);
        }
        
        // Draw screen with better styling
        ctx.strokeStyle = '#37474f';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.moveTo(screenX, 50);
        ctx.lineTo(screenX, 550);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Screen label with background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(screenX + 5, 20, 100, 22);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX + 5, 20, 100, 22);
        
        ctx.fillStyle = '#263238';
        ctx.font = 'bold 13px Arial';
        ctx.fillText('Screen', screenX + 15, 35);
        
        // Draw barrier with slits - make it more prominent
        const barrierX = 350;
        ctx.fillStyle = '#455a64';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.fillRect(barrierX - 10, 50, 20, this.slit1.y - 60);
        ctx.fillRect(barrierX - 10, this.slit1.y + 10, 20, this.slit2.y - this.slit1.y - 20);
        ctx.fillRect(barrierX - 10, this.slit2.y + 10, 20, 540 - this.slit2.y);
        ctx.shadowBlur = 0;
        
        // Highlight the slits with glow
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(0, 188, 212, 0.6)';
        ctx.fillStyle = '#00bcd4';
        ctx.fillRect(barrierX - 10, this.slit1.y - 5, 20, 15);
        ctx.fillRect(barrierX - 10, this.slit2.y - 5, 20, 15);
        ctx.shadowBlur = 0;
        
        // Draw slit labels with clear backgrounds - no overlap
        const labelX = barrierX + 25;
        
        // Label A
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(labelX - 5, this.slit1.y - 14, 28, 22);
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 2;
        ctx.strokeRect(labelX - 5, this.slit1.y - 14, 28, 22);
        
        ctx.fillStyle = '#d32f2f';
        ctx.font = 'bold 15px Arial';
        ctx.fillText('A', labelX, this.slit1.y + 2);
        
        // Label B
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(labelX - 5, this.slit2.y - 14, 28, 22);
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        ctx.strokeRect(labelX - 5, this.slit2.y - 14, 28, 22);
        
        ctx.fillStyle = '#1976d2';
        ctx.font = 'bold 15px Arial';
        ctx.fillText('B', labelX, this.slit2.y + 2);
        
        // Draw paths if enabled - show MORE paths
        if (this.showPaths) {
            const screenPoint = { x: screenX, y: this.detectorY };
            
            // Show many more sample paths through each slit
            const numSamplePaths = 10;
            
            // Paths through slit 1 (red/orange)
            for (let i = 0; i < numSamplePaths; i++) {
                const offset = (i - numSamplePaths/2) * 3.5;
                const slitPoint = { x: barrierX, y: this.slit1.y + offset };
                
                const alpha = 0.12 + 0.08 / (Math.abs(i - numSamplePaths/2) + 1);
                ctx.strokeStyle = `rgba(211, 47, 47, ${alpha})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(this.source.x, this.source.y);
                ctx.lineTo(slitPoint.x, slitPoint.y);
                ctx.lineTo(screenPoint.x, screenPoint.y);
                ctx.stroke();
            }
            
            // Paths through slit 2 (blue)
            for (let i = 0; i < numSamplePaths; i++) {
                const offset = (i - numSamplePaths/2) * 3.5;
                const slitPoint = { x: barrierX, y: this.slit2.y + offset };
                
                const alpha = 0.12 + 0.08 / (Math.abs(i - numSamplePaths/2) + 1);
                ctx.strokeStyle = `rgba(25, 118, 210, ${alpha})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(this.source.x, this.source.y);
                ctx.lineTo(slitPoint.x, slitPoint.y);
                ctx.lineTo(screenPoint.x, screenPoint.y);
                ctx.stroke();
            }
            
            // Main central paths (thicker and more visible)
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(211, 47, 47, 0.3)';
            ctx.strokeStyle = '#d32f2f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.source.x, this.source.y);
            ctx.lineTo(this.slit1.x, this.slit1.y);
            ctx.lineTo(screenPoint.x, screenPoint.y);
            ctx.stroke();
            
            ctx.shadowColor = 'rgba(25, 118, 210, 0.3)';
            ctx.strokeStyle = '#1976d2';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.source.x, this.source.y);
            ctx.lineTo(this.slit2.x, this.slit2.y);
            ctx.lineTo(screenPoint.x, screenPoint.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Draw phase arrows if enabled
        if (this.showArrows) {
            const result = this.calculateAmplitude(this.detectorY);
            const arrowBaseX = 430;
            const arrowBaseY = 130;
            const arrowScale = 50;
            
            // Draw arrow diagram panel with better styling
            ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.fillRect(arrowBaseX - 80, arrowBaseY - 80, 210, 200);
            ctx.strokeRect(arrowBaseX - 80, arrowBaseY - 80, 210, 200);
            ctx.shadowBlur = 0;
            
            // Title with no overlap
            ctx.fillStyle = '#263238';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Phasor Addition', arrowBaseX, arrowBaseY - 60);
            ctx.textAlign = 'left';
            
            // Draw reference axes
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(arrowBaseX - 70, arrowBaseY);
            ctx.lineTo(arrowBaseX + 115, arrowBaseY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(arrowBaseX, arrowBaseY - 70);
            ctx.lineTo(arrowBaseX, arrowBaseY + 90);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Labels for axes - positioned to avoid overlap
            ctx.fillStyle = '#999';
            ctx.font = '11px Arial';
            ctx.fillText('Re', arrowBaseX + 100, arrowBaseY - 5);
            ctx.fillText('Im', arrowBaseX + 5, arrowBaseY - 55);
            
            // Draw amplitude arrows with better styling
            // Arrow A
            ctx.shadowBlur = 3;
            ctx.shadowColor = 'rgba(211, 47, 47, 0.3)';
            this.drawArrow(ctx, arrowBaseX, arrowBaseY, arrowScale, result.phase1, 
                          '#d32f2f', '');
            ctx.shadowBlur = 0;
            
            const end1X = arrowBaseX + arrowScale * Math.cos(result.phase1);
            const end1Y = arrowBaseY + arrowScale * Math.sin(result.phase1);
            
            // Arrow B
            ctx.shadowBlur = 3;
            ctx.shadowColor = 'rgba(25, 118, 210, 0.3)';
            this.drawArrow(ctx, end1X, end1Y, arrowScale, result.phase2, 
                          '#1976d2', '');
            ctx.shadowBlur = 0;
            
            // Label the individual arrows - carefully positioned
            const labelOffset1X = 28 * Math.cos(result.phase1);
            const labelOffset1Y = 28 * Math.sin(result.phase1);
            this.drawFloatingLabel('ψ_A', arrowBaseX + labelOffset1X, arrowBaseY + labelOffset1Y, '#ff8a80');

            const labelOffset2X = 28 * Math.cos(result.phase2);
            const labelOffset2Y = 28 * Math.sin(result.phase2);
            this.drawFloatingLabel('ψ_B', end1X + labelOffset2X, end1Y + labelOffset2Y, '#82b1ff');
            
            // Draw dashed line showing resultant path
            const finalX = end1X + arrowScale * Math.cos(result.phase2);
            const finalY = end1Y + arrowScale * Math.sin(result.phase2);
            
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(arrowBaseX, arrowBaseY);
            ctx.lineTo(finalX, finalY);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw resultant with prominence
            const totalLength = arrowScale * Math.sqrt(result.intensity) / Math.sqrt(2);
            const totalPhase = Math.atan2(result.totalAmp.y, result.totalAmp.x);
            
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'rgba(76, 175, 80, 0.4)';
            this.drawArrow(ctx, arrowBaseX, arrowBaseY, totalLength, totalPhase, 
                          '#4caf50', '');
            ctx.shadowBlur = 0;
            
            // Label the sum - positioned clearly
            const sumLabelX = totalLength * Math.cos(totalPhase) * 0.6;
            const sumLabelY = totalLength * Math.sin(totalPhase) * 0.6;
            this.drawFloatingLabel('ψ_tot', arrowBaseX + sumLabelX, arrowBaseY + sumLabelY, '#7ed957');
            
            // Show intensity value below - no overlap
            ctx.fillStyle = '#37474f';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`I = |ψ|² = ${result.intensity.toFixed(2)}`, arrowBaseX, arrowBaseY + 80);
            ctx.textAlign = 'left';
        }
        
        // Draw source with better styling
        ctx.fillStyle = '#ff6b6b';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 107, 107, 0.6)';
        ctx.beginPath();
        ctx.arc(this.source.x, this.source.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('S', this.source.x, this.source.y + 6);
        ctx.textAlign = 'left';
        
        // Source label with background - no overlap
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(this.source.x - 28, this.source.y + 22, 56, 20);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.source.x - 28, this.source.y + 22, 56, 20);
        
        ctx.fillStyle = '#37474f';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Source', this.source.x, this.source.y + 36);
        ctx.textAlign = 'left';
        
        // Draw detector pointer with better visibility
        ctx.fillStyle = '#00bcd4';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(0, 188, 212, 0.6)';
        ctx.beginPath();
        ctx.moveTo(screenX, this.detectorY - 14);
        ctx.lineTo(screenX + 24, this.detectorY);
        ctx.lineTo(screenX, this.detectorY + 14);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#0097a7';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw wave animation from source - more subtle
        const numWaves = 5;
        for (let i = 0; i < numWaves; i++) {
            const phase = (this.time * 0.025 + i * 0.28) % 1;
            const radius = phase * 260;
            const alpha = 0.18 * (1 - phase);
            
            ctx.strokeStyle = `rgba(120, 160, 255, ${alpha})`;
            ctx.lineWidth = 1.5;
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
