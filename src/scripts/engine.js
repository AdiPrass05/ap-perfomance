// engine.js
(function() {
    // DOM References
    const boreInput = document.getElementById('boreInput');
    const strokeInput = document.getElementById('strokeInput');
    const cylCountSelect = document.getElementById('cylCount');
    const cycleTypeSelect = document.getElementById('cycleType');
    const fuelTypeSelect = document.getElementById('fuelType');
    const compRatioInput = document.getElementById('compRatioInput');
    const rodLengthInput = document.getElementById('rodLengthInput');
    const inValveInput = document.getElementById('inValveInput');
    const exValveInput = document.getElementById('exValveInput');
    const inSeatInput = document.getElementById('inSeatInput');
    const exSeatInput = document.getElementById('exSeatInput');
    const gasSpeedInput = document.getElementById('gasSpeedInput');
    const veInput = document.getElementById('veInput');
    const valveCountSelect = document.getElementById('valveCountSelect');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const quickCompareBtn = document.getElementById('quickCompareBtn');
    const exportBtn = document.getElementById('exportBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const themeToggle = document.getElementById('themeToggle');
    const dynoChartCanvas = document.getElementById('dynoChart');
    const chartOverlay = document.getElementById('chartOverlay');
    const historyList = document.getElementById('historyList');
    const noHistoryMsg = document.getElementById('noHistoryMsg');
    const statusBadge = document.getElementById('statusBadge');
    const unitBadge = document.getElementById('unitBadge');
    const flowMeter = document.getElementById('flowMeter');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');
    const boreLabel = document.getElementById('boreLabel');
    const strokeLabel = document.getElementById('strokeLabel');
    const boreRange = document.getElementById('boreRange');
    const strokeRange = document.getElementById('strokeRange');
    const maxInValveLabel = document.getElementById('maxInValveLabel');
    const maxExValveLabel = document.getElementById('maxExValveLabel');
    const maxInSeatLabel = document.getElementById('maxInSeatLabel');
    const maxExSeatLabel = document.getElementById('maxExSeatLabel');

    // Output displays
    const dispValue = document.getElementById('dispValue');
    const dispUnit = document.getElementById('dispUnit');
    const dispCID = document.getElementById('dispCID');
    const powerValue = document.getElementById('powerValue');
    const powerUnit = document.getElementById('powerUnit');
    const powerRpm = document.getElementById('powerRpm');
    const cfmValue = document.getElementById('cfmValue');
    const torqueValue = document.getElementById('torqueValue');
    const torqueUnit = document.getElementById('torqueUnit');
    const torqueNm = document.getElementById('torqueNm');
    const bmepValue = document.getElementById('bmepValue');
    const pistonSpeedValue = document.getElementById('pistonSpeedValue');
    const rodRatioValue = document.getElementById('rodRatioValue');
    const airVelValue = document.getElementById('airVelValue');
    const jettingValue = document.getElementById('jettingValue');
    const specOutputValue = document.getElementById('specOutputValue');

    let unitSystem = 'metric';
    let simulationHistory = [];
    let lastResults = null;
    let compareData = null;
    const MAX_HISTORY = 15;

    const defaults = {
        bore: 0,
        stroke: 0,
        cylCount: 1,
        cycleType: '4',
        fuelType: 'gasoline',
        compRatio: 11,
        rodLength: 0,
        inValve: 0,
        exValve: 0,
        inSeat: 0,
        exSeat: 0,
        gasSpeed: 105,
        ve: 90,
        valveCount: 2,
    };

    // Toast notification
    let toastTimeout;
    function showToast(message, icon = 'check_circle', duration = 2500) {
        clearTimeout(toastTimeout);
        toastMsg.textContent = message;
        toastIcon.textContent = icon;
        toast.classList.remove('translate-y-20', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        toastTimeout = setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        }, duration);
    }

    // Gather all input values
    function getInputValues() {
        return {
            bore: parseFloat(boreInput.value) || 0,
            stroke: parseFloat(strokeInput.value) || 0,
            cylCount: parseInt(cylCountSelect.value) || 1,
            cycleType: cycleTypeSelect.value,
            fuelType: fuelTypeSelect.value,
            compRatio: parseFloat(compRatioInput.value) || 0,
            rodLength: parseFloat(rodLengthInput.value) || 0,
            inValve: parseFloat(inValveInput.value) || 0,
            exValve: parseFloat(exValveInput.value) || 0,
            inSeat: parseFloat(inSeatInput.value) || 0,
            exSeat: parseFloat(exSeatInput.value) || 0,
            gasSpeed: parseFloat(gasSpeedInput.value) || 0,
            ve: parseFloat(veInput.value) || 0,
            valveCount: parseInt(valveCountSelect.value) || 2,
        };
    }

    // Main calculation - Graham Bell based
    function calculatePerformance(inputs) {
        const bore = inputs.bore;
        const stroke = inputs.stroke;
        const cylCount = inputs.cylCount;
        const cycleType = inputs.cycleType;
        const ve = inputs.ve / 100;
        const rodLength = inputs.rodLength;
        const inSeat = inputs.inSeat;
        const gasSpeed = inputs.gasSpeed;
        const compRatio = inputs.compRatio;
        const fuelType = inputs.fuelType;
        const inValve = inputs.inValve;
        const valveCount = inputs.valveCount;

        // Displacement
        const displacementCC = (Math.PI / 4) * Math.pow(bore, 2) * stroke * cylCount / 1000;
        const displacementL = displacementCC / 1000;
        const displacementCID = displacementCC * 0.0610237;

        // --- Graham Bell: Target RPM based on intake seat diameter and gas speed ---
        // Formula: RPM = (GasSpeed_mps * 30000 * SeatArea_mm2) / (Bore_mm^2 * Stroke_mm)
        // Untuk 4 valve, effective area dikalikan 1.35 (karena dua katup intake)
        let targetRpm = 0;
        if (bore > 0 && stroke > 0 && inSeat > 0 && gasSpeed > 0) {
            const valveAreaFactor = (valveCount === 4) ? 1.35 : 1.0;
            // Gunakan diameter kuadrat seperti rumus Graham Bell (disederhanakan)
            targetRpm = (gasSpeed * 30000 * Math.pow(inSeat, 2) * valveAreaFactor) / (Math.pow(bore, 2) * stroke);
            targetRpm = Math.min(targetRpm, 15000);
        } else {
            // fallback
            targetRpm = (valveCount === 4) ? 7500 : 6000;
        }

        // Max RPM from piston speed limit (25 m/s race, 22 m/s street)
        let maxRpm = 0;
        if (stroke > 0) {
            const pistonSpeedLimit = (targetRpm > 7000) ? 25 : 22;
            maxRpm = (pistonSpeedLimit * 30000) / stroke;
        }

        // --- Air flow (CFM) ---
        const strokesPerCycle = (cycleType === '4') ? 2 : 1;
        let cfm = 0;
        if (targetRpm > 0 && displacementCID > 0) {
            cfm = (displacementCID * targetRpm * ve) / (3456 * strokesPerCycle);
        } else {
            cfm = displacementL * 80;
        }

        // --- BMEP estimation based on Graham Bell ---
        const fuelFactors = { gasoline: 1.0, e85: 0.95, methanol: 1.05, diesel: 1.15 };
        const fuelFactor = fuelFactors[fuelType] || 1.0;
        const compFactor = 1 + (compRatio - 9) * 0.08;
        // Valve count factor: 4 valve memiliki potensi BMEP 12% lebih tinggi
        const valveFactorBMEP = (valveCount === 4) ? 1.12 : 1.0;
        let bmepBar = 10.5 * ve * compFactor * fuelFactor * valveFactorBMEP;
        bmepBar = Math.max(7, Math.min(16, bmepBar));

        // --- Power (HP) ---
        let powerHP = 0;
        if (targetRpm > 0 && displacementL > 0) {
            powerHP = (bmepBar * displacementL * targetRpm) / (2 * 60) * 100 * 0.00134102;
        } else {
            const hpPerLiter = (valveCount === 4) ? 110 : 95;
            powerHP = displacementL * hpPerLiter;
        }
        const powerKW = powerHP * 0.7457;

        // --- Torque (lb-ft) ---
        let torqueLbFt = 0;
        if (targetRpm > 0 && powerHP > 0) {
            torqueLbFt = (powerHP * 5252) / targetRpm;
        } else {
            torqueLbFt = displacementL * 75;
        }
        const torqueNm = torqueLbFt * 1.35582;

        // Specific output (HP/L)
        const specificOutput = (displacementL > 0) ? powerHP / displacementL : 0;

        // Piston speed at max RPM
        const pistonSpeedMax = (2 * stroke / 1000 * maxRpm) / 60;

        // Rod ratio
        const rodRatio = (rodLength > 0 && stroke > 0) ? rodLength / stroke : 0;

        // Air velocity at seat (calculated)
        const pistonAreaCm2 = (Math.PI / 4) * Math.pow(bore / 10, 2);
        const inSeatAreaCm2 = (Math.PI / 4) * Math.pow(inSeat / 10, 2);
        let calculatedGasSpeed = 0;
        if (inSeatAreaCm2 > 0 && targetRpm > 0) {
            const pistonSpeedMps = (2 * stroke / 1000 * targetRpm) / 60;
            calculatedGasSpeed = (pistonAreaCm2 * pistonSpeedMps) / inSeatAreaCm2;
        }
        const avgGasSpeed = (calculatedGasSpeed + gasSpeed) / 2;

        // Jetting estimation
        const jetSize = Math.round(100 + (displacementCC * 0.2) + (targetRpm / 1000) * 3 + (compRatio - 9) * 5);

        return {
            displacementCC: Math.round(displacementCC * 10) / 10,
            displacementL: Math.round(displacementL * 1000) / 1000,
            displacementCID: Math.round(displacementCID * 10) / 10,
            targetRpm: Math.round(targetRpm),
            maxRpm: Math.round(maxRpm),
            cfm: Math.round(cfm * 10) / 10,
            bmepBar: Math.round(bmepBar * 10) / 10,
            powerHP: Math.round(powerHP * 10) / 10,
            powerKW: Math.round(powerKW * 10) / 10,
            torqueLbFt: isNaN(torqueLbFt) ? 0 : Math.round(torqueLbFt * 10) / 10,
            torqueNm: isNaN(torqueNm) ? 0 : Math.round(torqueNm * 10) / 10,
            specificOutput: Math.round(specificOutput * 10) / 10,
            pistonSpeedMax: Math.round(pistonSpeedMax * 10) / 10,
            rodRatio: isNaN(rodRatio) ? 0 : Math.round(rodRatio * 100) / 100,
            avgGasSpeed: Math.round(avgGasSpeed * 10) / 10,
            jetSize: jetSize,
            valveCount: valveCount,
        };
    }

    // Update dynamic labels for max valve diameter based on bore and valve count
    function updateMaxValveLabels(bore, valveCount) {
        let maxIn, maxEx;
        if (valveCount === 4) {
            maxIn = (bore * 0.38).toFixed(1);
            maxEx = (bore * 0.3339).toFixed(1);
        } else {
            maxIn = (bore * 0.55).toFixed(1);
            maxEx = (bore * 0.467).toFixed(1);
        }
        if (maxInValveLabel) maxInValveLabel.textContent = `MAX DIA: ${maxIn} MM`;
        if (maxExValveLabel) maxExValveLabel.textContent = `MAX DIA: ${maxEx} MM`;
    }

    function updateMaxSeatLabels(inValve, exValve) {
        const maxInSeat = (inValve - 2.5).toFixed(1);
        const maxExSeat = (exValve - 3.0).toFixed(1);
        if (maxInSeatLabel) maxInSeatLabel.textContent = `MAX DIA: ${maxInSeat} MM`;
        if (maxExSeatLabel) maxExSeatLabel.textContent = `MAX DIA: ${maxExSeat} MM`;
    }

    // Update the flow meter bar
    function updateFlowMeter(cfm) {
        const maxCfm = 200;
        const segments = 10;
        const activeSegments = Math.min(segments, Math.round((cfm / maxCfm) * segments));
        let html = '';
        for (let i = 0; i < segments; i++) {
            let cls = 'progress-segment';
            if (i < activeSegments) {
                if (i >= 8) cls += ' danger';
                else if (i >= 6) cls += ' warning';
                else cls += ' active';
            }
            html += `<div class="${cls}"></div>`;
        }
        flowMeter.innerHTML = html;
    }

    // Update all output UI elements
    function updateUI(results, inputs) {
        // Displacement
        if (unitSystem === 'metric') {
            dispValue.textContent = results.displacementCC;
            dispUnit.textContent = 'CC';
            dispCID.textContent = results.displacementCID + ' CID';
        } else {
            dispValue.textContent = results.displacementCID;
            dispUnit.textContent = 'CID';
            dispCID.textContent = results.displacementCC + ' CC';
        }

        // Power
        if (unitSystem === 'metric') {
            powerValue.textContent = results.powerHP;
            powerUnit.textContent = 'HP';
        } else {
            powerValue.textContent = results.powerKW;
            powerUnit.textContent = 'kW';
        }
        powerRpm.textContent = '@ ' + results.targetRpm.toLocaleString() + ' RPM';

        // Torque
        if (unitSystem === 'metric') {
            torqueValue.textContent = results.torqueLbFt;
            torqueUnit.textContent = 'LB.FT';
            torqueNm.textContent = results.torqueNm + ' Nm';
        } else {
            torqueValue.textContent = results.torqueNm;
            torqueUnit.textContent = 'Nm';
            torqueNm.textContent = results.torqueLbFt + ' LB.FT';
        }

        // Air flow
        cfmValue.textContent = results.cfm;

        // BMEP
        bmepValue.innerHTML = results.bmepBar + ' <span class="text-xs font-body-md text-tertiary">BAR</span>';

        // Piston speed
        pistonSpeedValue.innerHTML = results.pistonSpeedMax + ' <span class="text-xs font-body-md text-tertiary">M/S</span> @ ' + results.maxRpm.toLocaleString() + ' RPM';

        // Rod ratio
        rodRatioValue.innerHTML = results.rodRatio + ' <span class="text-xs font-body-md text-tertiary">:1</span>';
        if (results.rodRatio > 0) {
            if (results.rodRatio < 1.6) {
                rodRatioValue.style.color = '#ff4444';
            } else if (results.rodRatio > 2.0) {
                rodRatioValue.style.color = '#00b4d8';
            } else {
                rodRatioValue.style.color = '#f0a500';
            }
        } else {
            rodRatioValue.style.color = '';
        }

        // Air velocity
        airVelValue.innerHTML = results.avgGasSpeed + ' <span class="text-xs font-body-md text-tertiary">M/S</span>';

        // Jetting
        jettingValue.innerHTML = '#' + results.jetSize + ' <span class="text-xs font-body-md text-tertiary">MAIN</span>';

        // Specific output
        specOutputValue.innerHTML = results.specificOutput + ' <span class="text-xs font-body-md text-tertiary">HP/L</span>';

        // Piston speed color warning
        if (results.pistonSpeedMax > 25) {
            pistonSpeedValue.style.color = '#ff4444';
        } else if (results.pistonSpeedMax > 22) {
            pistonSpeedValue.style.color = '#f0a500';
        } else {
            pistonSpeedValue.style.color = '';
        }

        updateFlowMeter(results.cfm);
        updateMaxValveLabels(inputs.bore, inputs.valveCount);
        updateMaxSeatLabels(inputs.inValve, inputs.exValve);
    }

    // Draw dyno chart
    function drawDynoChart(results, inputs) {
        const canvas = dynoChartCanvas;
        if (!canvas) return;
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const padding = { top: 30, right: 40, bottom: 35, left: 50 };
        const plotW = w - padding.left - padding.right;
        const plotH = h - padding.top - padding.bottom;

        // Grid
        ctx.strokeStyle = 'rgba(127,131,134,0.15)';
        ctx.lineWidth = 0.5;
        const gridLinesY = 6;
        const gridLinesX = 8;
        for (let i = 0; i <= gridLinesY; i++) {
            const y = padding.top + (plotH / gridLinesY) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
        }
        for (let i = 0; i <= gridLinesX; i++) {
            const x = padding.left + (plotW / gridLinesX) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, h - padding.bottom);
            ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = 'rgba(200,200,200,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, h - padding.bottom);
        ctx.lineTo(w - padding.right, h - padding.bottom);
        ctx.stroke();

        const peakRpm = results.targetRpm || 1000;
        const maxRpm = results.maxRpm || peakRpm * 1.5;
        const rpmMin = Math.max(1000, peakRpm * 0.35);
        const rpmMax = maxRpm;
        const rpmRange = rpmMax - rpmMin;
        const points = 80;
        const rpmData = [];
        const hpData = [];
        const tqData = [];

        const peakHP = results.powerHP;
        const peakTQ = results.torqueLbFt;

        for (let i = 0; i <= points; i++) {
            const rpm = rpmMin + (rpmRange / points) * i;
            const rpmFrac = (rpm - rpmMin) / rpmRange;
            const tqPeakFrac = 0.55;
            let tqFactor;
            if (rpmFrac <= tqPeakFrac) {
                tqFactor = Math.pow(rpmFrac / tqPeakFrac, 0.7) * 0.95 + 0.05;
            } else {
                const decay = (rpmFrac - tqPeakFrac) / (1 - tqPeakFrac);
                tqFactor = 1.0 - Math.pow(decay, 1.6) * 0.55;
            }
            tqFactor = Math.max(0.3, Math.min(1.05, tqFactor));
            const tq = peakTQ * tqFactor;
            const hp = (tq * rpm) / 5252;
            rpmData.push(rpm);
            hpData.push(hp);
            tqData.push(tq);
        }

        const maxHP = Math.max(...hpData) * 1.1;
        const maxTQ = Math.max(...tqData) * 1.1;
        const yMax = Math.max(maxHP, maxTQ * 1.3);

        function toX(rpm) { return padding.left + ((rpm - rpmMin) / rpmRange) * plotW; }
        function toY(val) { return padding.top + plotH - (val / yMax) * plotH; }

        ctx.fillStyle = 'rgba(200,200,200,0.7)';
        ctx.font = '9px "JetBrains Mono"';
        ctx.textAlign = 'right';
        for (let i = 0; i <= gridLinesY; i++) {
            const val = (yMax / gridLinesY) * i;
            const y = toY(val);
            ctx.fillText(Math.round(val), padding.left - 8, y + 4);
        }

        ctx.textAlign = 'center';
        const xLabels = 5;
        for (let i = 0; i <= xLabels; i++) {
            const rpm = rpmMin + (rpmRange / xLabels) * i;
            const x = toX(rpm);
            ctx.fillText(Math.round(rpm / 1000) + 'k', x, h - padding.bottom + 16);
        }
        ctx.fillText('RPM', w - padding.right + 10, h - padding.bottom + 6);

        // Torque curve
        ctx.strokeStyle = '#00b4d8';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.shadowColor = 'rgba(0,180,216,0.5)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let i = 0; i < tqData.length; i++) {
            const x = toX(rpmData[i]);
            const y = toY(tqData[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Power curve
        ctx.strokeStyle = '#ff544b';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(255,84,75,0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < hpData.length; i++) {
            const x = toX(rpmData[i]);
            const y = toY(hpData[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Peak markers
        const peakHpIdx = hpData.indexOf(Math.max(...hpData));
        const peakTqIdx = tqData.indexOf(Math.max(...tqData));

        const hpPeakX = toX(rpmData[peakHpIdx]);
        const hpPeakY = toY(hpData[peakHpIdx]);
        ctx.fillStyle = '#ff544b';
        ctx.shadowColor = 'rgba(255,84,75,0.9)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(hpPeakX, hpPeakY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        const tqPeakX = toX(rpmData[peakTqIdx]);
        const tqPeakY = toY(tqData[peakTqIdx]);
        ctx.fillStyle = '#00b4d8';
        ctx.shadowColor = 'rgba(0,180,216,0.9)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(tqPeakX, tqPeakY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffb4ab';
        ctx.font = 'bold 10px "JetBrains Mono"';
        ctx.textAlign = 'left';
        ctx.fillText(Math.round(hpData[peakHpIdx]) + ' HP', hpPeakX + 8, hpPeakY - 4);

        ctx.fillStyle = '#00b4d8';
        ctx.fillText(Math.round(tqData[peakTqIdx]) + ' LB.FT', tqPeakX + 8, tqPeakY + 14);

        chartOverlay.style.opacity = '0';
        setTimeout(() => { chartOverlay.style.pointerEvents = 'none'; }, 300);
    }

    // History management
    function loadHistory() {
        try {
            const stored = localStorage.getItem('ap_performance_history');
            if (stored) simulationHistory = JSON.parse(stored);
        } catch (e) { simulationHistory = []; }
        renderHistory();
    }

    function saveHistory() {
        try {
            localStorage.setItem('ap_performance_history', JSON.stringify(simulationHistory));
        } catch (e) {
            showToast('Storage full. Clearing old entries.', 'warning', 3000);
            simulationHistory = simulationHistory.slice(-5);
            localStorage.setItem('ap_performance_history', JSON.stringify(simulationHistory));
        }
        renderHistory();
    }

    function addToHistory(inputs, results) {
        const entry = {
            id: Date.now(),
            name: 'Setup_' + inputs.bore + 'mm_C' + inputs.cylCount,
            bore: inputs.bore,
            stroke: inputs.stroke,
            cylCount: inputs.cylCount,
            targetRpm: results.targetRpm,
            powerHP: results.powerHP,
            torqueLbFt: results.torqueLbFt,
            displacementCC: results.displacementCC,
            timestamp: new Date().toISOString(),
        };
        simulationHistory.unshift(entry);
        if (simulationHistory.length > MAX_HISTORY) simulationHistory = simulationHistory.slice(0, MAX_HISTORY);
        saveHistory();
    }

    function renderHistory() {
        if (simulationHistory.length === 0) {
            historyList.innerHTML = '';
            noHistoryMsg.classList.remove('hidden');
            return;
        }
        noHistoryMsg.classList.add('hidden');
        historyList.innerHTML = simulationHistory.map((entry, index) => `
            <div class="flex items-center justify-between p-base bg-surface-container-lowest rounded border-l-2 ${index === 0 ? 'border-primary/40' : 'border-outline-variant/20'} cursor-pointer hover:bg-surface-container-high transition-all group slide-in"
                 data-id="${entry.id}" onclick="window._restoreSetup(${entry.id})">
                <div class="flex flex-col">
                    <span class="font-body-md text-on-surface group-hover:text-primary transition-colors">${entry.name}</span>
                    <span class="text-[9px] font-label-mono text-tertiary">${new Date(entry.timestamp).toLocaleDateString()} · ${entry.displacementCC}cc · C${entry.cylCount}</span>
                </div>
                <div class="flex gap-md font-label-mono text-xs items-center">
                    <span class="text-primary font-bold">${entry.powerHP} HP</span>
                    <span class="text-secondary">@${(entry.targetRpm/1000).toFixed(1)}K</span>
                    <span class="material-symbols-outlined text-sm text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                </div>
            </div>
        `).join('');
    }

    function clearHistory() {
        simulationHistory = [];
        saveHistory();
        showToast('History cleared.', 'delete', 2000);
    }

    window._restoreSetup = function(id) {
        const entry = simulationHistory.find(e => e.id === id);
        if (!entry) return;
        boreInput.value = entry.bore;
        strokeInput.value = entry.stroke;
        cylCountSelect.value = entry.cylCount;
        showToast('Setup restored: ' + entry.name, 'history', 2000);
        runCalculation();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function exportReport() {
        if (!lastResults) { showToast('Run a calculation first.', 'warning', 2000); return; }
        const inputs = getInputValues();
        const results = lastResults;
        const report = `
========================================
AP PERFORMANCE - ENGINE SIMULATION REPORT
========================================
Date: ${new Date().toLocaleString()}
Version: 1.0-STABLE (Graham Bell Method)

--- ENGINE SPECS ---
Bore: ${inputs.bore} mm
Stroke: ${inputs.stroke} mm
Cylinders: ${inputs.cylCount}
Cycle: ${inputs.cycleType}-Stroke
Fuel: ${inputs.fuelType}
Compression Ratio: ${inputs.compRatio}:1
Rod Length: ${inputs.rodLength} mm
Rod Ratio: ${results.rodRatio}:1
Valves per Cylinder: ${inputs.valveCount}
Intake Valve: ${inputs.inValve} mm
Exhaust Valve: ${inputs.exValve} mm
Intake Seat ID: ${inputs.inSeat} mm
Exhaust Seat ID: ${inputs.exSeat} mm

--- RPM TARGETS ---
Peak Power RPM: ${results.targetRpm} RPM
Max Safe RPM (piston speed limit): ${results.maxRpm} RPM

--- PERFORMANCE ---
Displacement: ${results.displacementCC} CC (${results.displacementCID} CID)
Peak Power: ${results.powerHP} HP @ ${results.targetRpm} RPM
Peak Torque: ${results.torqueLbFt} LB.FT (${results.torqueNm} Nm)
BMEP: ${results.bmepBar} BAR
Air Flow: ${results.cfm} CFM
Volumetric Efficiency: ${inputs.ve}%
Piston Speed @Max RPM: ${results.pistonSpeedMax} m/s
Specific Output: ${results.specificOutput} HP/L
Estimated Main Jet: #${results.jetSize}

--- EFFICIENCY ---
Gas Speed @Seat: ${results.avgGasSpeed} m/s
Target Gas Speed: ${inputs.gasSpeed} m/s

========================================
Generated by AP Performance Calculator
© 2026 Adi Prass
========================================
        `.trim().replace(/^        /gm, '');
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'AP_Report_' + new Date().toISOString().slice(0, 10) + '.txt';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Report exported!', 'download', 2000);
    }

    function quickCompare() {
        if (!lastResults) { showToast('Run a calculation first.', 'warning', 2000); return; }
        if (!compareData) {
            compareData = { inputs: getInputValues(), results: lastResults };
            showToast('Baseline saved. Modify values & run again to compare.', 'compare_arrows', 3000);
        } else {
            const currentResults = lastResults;
            const prevResults = compareData.results;
            const hpDiff = currentResults.powerHP - prevResults.powerHP;
            const tqDiff = currentResults.torqueLbFt - prevResults.torqueLbFt;
            const sign = hpDiff >= 0 ? '+' : '';
            showToast(`Compare: ${sign}${hpDiff.toFixed(1)} HP | ${sign}${tqDiff.toFixed(1)} LB.FT vs baseline`, 'compare_arrows', 4000);
            compareData = null;
        }
    }

    function toggleUnits() {
        unitSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
        if (unitSystem === 'metric') {
            unitBadge.textContent = 'UNITS: METRIC';
            boreLabel.textContent = 'Bore (mm)';
            strokeLabel.textContent = 'Stroke (mm)';
            boreRange.textContent = 'RANGE: 47-102 MM';
            strokeRange.textContent = 'RANGE: 41-90 MM';
        } else {
            unitBadge.textContent = 'UNITS: IMPERIAL';
            boreLabel.textContent = 'Bore (in)';
            strokeLabel.textContent = 'Stroke (in)';
            boreRange.textContent = 'RANGE: 1.85-4.02 IN';
            strokeRange.textContent = 'RANGE: 1.61-3.54 IN';
        }
        if (lastResults) {
            updateUI(lastResults, getInputValues());
            drawDynoChart(lastResults, getInputValues());
        }
        showToast('Switched to ' + unitSystem.toUpperCase() + ' units', 'swap_horiz', 1500);
    }

    function resetAll() {
        boreInput.value = defaults.bore;
        strokeInput.value = defaults.stroke;
        cylCountSelect.value = defaults.cylCount;
        cycleTypeSelect.value = defaults.cycleType;
        fuelTypeSelect.value = defaults.fuelType;
        compRatioInput.value = defaults.compRatio;
        rodLengthInput.value = defaults.rodLength;
        inValveInput.value = defaults.inValve;
        exValveInput.value = defaults.exValve;
        inSeatInput.value = defaults.inSeat;
        exSeatInput.value = defaults.exSeat;
        gasSpeedInput.value = defaults.gasSpeed;
        veInput.value = defaults.ve;
        valveCountSelect.value = defaults.valveCount;
        compareData = null;
        showToast('All values reset to 0.', 'restart_alt', 2000);
        runCalculation();
    }

    function runCalculation() {
        const inputs = getInputValues();
        const results = calculatePerformance(inputs);
        lastResults = results;
        updateUI(results, inputs);
        drawDynoChart(results, inputs);
        addToHistory(inputs, results);
        statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> STATUS: CALCULATED';
        setTimeout(() => {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> STATUS: READY';
        }, 1500);
    }

    // Event listeners
    calculateBtn.addEventListener('click', () => {
        calculateBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">refresh</span> COMPUTING...`;
        calculateBtn.disabled = true;
        setTimeout(() => {
            runCalculation();
            calculateBtn.innerHTML = `<span class="material-symbols-outlined">analytics</span> CALCULATE SIMULATION`;
            calculateBtn.disabled = false;
            const resultsPanel = document.getElementById('resultsPanel');
            resultsPanel.style.opacity = '0.4';
            resultsPanel.style.transform = 'scale(0.99)';
            setTimeout(() => {
                resultsPanel.style.opacity = '1';
                resultsPanel.style.transform = 'scale(1)';
            }, 100);
        }, 600);
    });

    resetBtn.addEventListener('click', resetAll);
    quickCompareBtn.addEventListener('click', quickCompare);
    exportBtn.addEventListener('click', exportReport);
    clearHistoryBtn.addEventListener('click', clearHistory);
    themeToggle.addEventListener('click', toggleUnits);

    let debounceTimeout;
    const allInputs = [
        boreInput, strokeInput, cylCountSelect, cycleTypeSelect, fuelTypeSelect,
        compRatioInput, rodLengthInput, inValveInput, exValveInput, inSeatInput,
        exSeatInput, gasSpeedInput, veInput, valveCountSelect
    ];

    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const inputs = getInputValues();
                const results = calculatePerformance(inputs);
                lastResults = results;
                updateUI(results, inputs);
                drawDynoChart(results, inputs);
                statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-accent-gold"></span> STATUS: LIVE';
                setTimeout(() => {
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> STATUS: READY';
                }, 800);
            }, 350);
        });
        input.addEventListener('focus', () => {
            input.parentElement.style.transition = 'transform 0.2s ease';
            input.parentElement.style.transform = 'scale(1.02)';
        });
        input.addEventListener('blur', () => {
            input.parentElement.style.transform = 'scale(1)';
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            runCalculation();
            showToast('Calculation triggered (Ctrl+Enter)', 'keyboard', 1500);
        }
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (lastResults) drawDynoChart(lastResults, getInputValues());
        }, 300);
    });

    function init() {
        loadHistory();
        runCalculation();
        chartOverlay.style.opacity = '0';
        chartOverlay.style.pointerEvents = 'none';
    }
    init();
})();