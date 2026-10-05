// engine.js
// AP Performance — BRT Engine Performance V.01 compatible calculation model
(function () {
    const $ = (id) => document.getElementById(id);

    // Inputs
    const boreInput = $('boreInput');
    const strokeInput = $('strokeInput');
    const inValveInput = $('inValveInput');
    const exValveInput = $('exValveInput');
    const inSeatInput = $('inSeatInput');
    const exSeatInput = $('exSeatInput');
    const gasSpeedInput = $('gasSpeedInput');
    const veInput = $('veInput');

    // Controls
    const calculateBtn = $('calculateBtn');
    const resetBtn = $('resetBtn');
    const quickCompareBtn = $('quickCompareBtn');
    const exportBtn = $('exportBtn');
    const clearHistoryBtn = $('clearHistoryBtn');
    const themeToggle = $('themeToggle');

    // Outputs
    const dispValue = $('dispValue');
    const cfmValue = $('cfmValue');
    const exCfmValue = $('exCfmValue');
    const powerValue = $('powerValue');
    const powerRpm = $('powerRpm');
    const torqueValue = $('torqueValue');
    const torqueRpm = $('torqueRpm');
    const peakPowerRpmValue = $('peakPowerRpmValue');
    const peakTorqueRpmValue = $('peakTorqueRpmValue');
    const efficiencyValue = $('efficiencyValue');

    // Labels / UI
    const boreLabel = $('boreLabel');
    const strokeLabel = $('strokeLabel');
    const boreRange = $('boreRange');
    const strokeRange = $('strokeRange');
    const maxInValveLabel = $('maxInValveLabel');
    const maxExValveLabel = $('maxExValveLabel');
    const maxInSeatLabel = $('maxInSeatLabel');
    const maxExSeatLabel = $('maxExSeatLabel');
    const statusBadge = $('statusBadge');
    const unitBadge = $('unitBadge');
    const dynoChartCanvas = $('dynoChart');
    const chartOverlay = $('chartOverlay');
    const historyList = $('historyList');
    const noHistoryMsg = $('noHistoryMsg');
    const toast = $('toast');
    const toastMsg = $('toastMsg');
    const toastIcon = $('toastIcon');

    let unitSystem = 'metric';
    let simulationHistory = [];
    let lastResults = null;
    let compareData = null;
    let toastTimeout;
    const MAX_HISTORY = 15;

    /*
     * BRT / ENGINE PERFORMANCE V.01 model
     *
     * The public BRT calculator uses only:
     * Bore, Stroke, IN/EX valve size, IN/EX valve-seat inner diameter,
     * assumed gas speed and efficiency.
     *
     * Constants below are calibrated to reproduce the published calculator
     * result shown by the reference page for:
     * 64 x 64, IN 34, EX 29, seat IN 30, EX 25,
     * gas speed 110 m/s, efficiency 90%.
     *
     * Reference result:
     * 205.7830 cc
     * 150.969 CFM intake
     * 104.839 CFM exhaust
     * 36.006 HP @ 11329.65 RPM
     * 15.022 lb.ft @ 11329.65 RPM
     */

    const BRT_PI = 3.14;
    const FLOW_CONSTANT = 0.0016943771043771043;
    const POWER_FACTOR = 0.265;

    const defaults = {
        bore: 0,
        stroke: 0,
        inValve: 0,
        exValve: 0,
        inSeat: 0,
        exSeat: 0,
        gasSpeed: 0,
        ve: 0
    };

    function showToast(message, icon = 'check_circle', duration = 2500) {
        if (!toast) return;
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

    function getInputValues() {
        return {
            bore: parseFloat(boreInput.value) || 0,
            stroke: parseFloat(strokeInput.value) || 0,
            inValve: parseFloat(inValveInput.value) || 0,
            exValve: parseFloat(exValveInput.value) || 0,
            inSeat: parseFloat(inSeatInput.value) || 0,
            exSeat: parseFloat(exSeatInput.value) || 0,
            gasSpeed: parseFloat(gasSpeedInput.value) || 0,
            efficiency: (parseFloat(veInput.value) || 0) / 100
        };
    }

    function calculatePerformance(inputs) {
        const {
            bore, stroke, inValve, exValve,
            inSeat, exSeat, gasSpeed, efficiency
        } = inputs;

        // 1. Displacement — BRT V.01 uses π ≈ 3.14
        const displacementCC =
            (BRT_PI / 4) * bore * bore * stroke / 1000;

        // 2. Flow @ 28 in H2O
        // Calibrated BRT conversion from seat diameter + gas speed to CFM.
        const intakeCFM =
            FLOW_CONSTANT * inSeat * inSeat * gasSpeed * efficiency;

        const exhaustCFM =
            FLOW_CONSTANT * exSeat * exSeat * gasSpeed * efficiency;

        // 3. Potential RPM
        // RPM = GasSpeed × 30000 × SeatDiameter² / (Bore² × Stroke)
        let targetRPM = 0;
        if (bore > 0 && stroke > 0 && inSeat > 0 && gasSpeed > 0) {
            targetRPM =
                gasSpeed * 30000 * inSeat * inSeat /
                (bore * bore * stroke);
        }

        // 4. Potential power
        // HP = Intake CFM × 0.265 × Efficiency
        const powerHP = intakeCFM * POWER_FACTOR * efficiency;

        // 5. Potential torque
        // Torque = HP × 5252 / RPM × Efficiency
        const torqueLbFt =
            targetRPM > 0
                ? (powerHP * 5252 / targetRPM) * efficiency
                : 0;

        const displacementCID = displacementCC * 0.0610237441;
        const torqueNm = torqueLbFt * 1.3558179483;

        // Useful derived values, without introducing extra input assumptions.
        const pistonSpeedMps =
            targetRPM > 0
                ? (2 * stroke / 1000 * targetRPM) / 60
                : 0;

        const bmepBar =
            displacementCC > 0
                ? (torqueNm * 4 * Math.PI) /
                  (displacementCC / 1e6) / 1e5
                : 0;

        return {
            displacementCC,
            displacementCID,
            intakeCFM,
            exhaustCFM,
            targetRPM,
            powerHP,
            torqueLbFt,
            torqueNm,
            pistonSpeedMps,
            bmepBar,
            specificOutput: displacementCC > 0 ? powerHP / (displacementCC / 1000) : 0
        };
    }

    function updateMaxValveLabels(bore) {
        // Same maximum diameter relationships shown by BRT.
        const maxIn = bore * 0.55;
        const maxEx = bore * 0.4675;

        if (maxInValveLabel) {
            maxInValveLabel.textContent = `MAX DIA: ${maxIn.toFixed(3)} MM`;
        }
        if (maxExValveLabel) {
            maxExValveLabel.textContent = `MAX DIA: ${maxEx.toFixed(3)} MM`;
        }
    }

    function updateMaxSeatLabels(inValve, exValve) {
        const maxInSeat = inValve - 2.5;
        const maxExSeat = exValve - 3.0;

        if (maxInSeatLabel) {
            maxInSeatLabel.textContent = `MAX DIA: ${maxInSeat.toFixed(3)} MM`;
        }
        if (maxExSeatLabel) {
            maxExSeatLabel.textContent = `MAX DIA: ${maxExSeat.toFixed(3)} MM`;
        }
    }

    function updateUI(results, inputs) {
        dispValue.textContent = results.displacementCC.toFixed(2);
        cfmValue.textContent = results.intakeCFM.toFixed(2);
        exCfmValue.textContent = results.exhaustCFM.toFixed(2);

        powerValue.textContent = results.powerHP.toFixed(2);
        powerRpm.textContent = `Pada ${results.targetRPM.toFixed(2)} RPM`;

        torqueValue.textContent = results.torqueLbFt.toFixed(3);
        torqueRpm.textContent = `Pada ${results.targetRPM.toFixed(2)} RPM`;

        peakPowerRpmValue.innerHTML =
            `${results.targetRPM.toFixed(2)} <span class="text-xs font-body-md text-tertiary">RPM</span>`;
        peakTorqueRpmValue.innerHTML =
            `${results.targetRPM.toFixed(2)} <span class="text-xs font-body-md text-tertiary">RPM</span>`;
        efficiencyValue.innerHTML =
            `${(inputs.efficiency * 100).toFixed(0)} <span class="text-xs font-body-md text-tertiary">%</span>`;

        updateMaxValveLabels(inputs.bore);
        updateMaxSeatLabels(inputs.inValve, inputs.exValve);
    }

    function drawDynoChart(results) {
        const canvas = dynoChartCanvas;
        if (!canvas || !results) return;

        const container = canvas.parentElement;
        const width = Math.max(320, container.clientWidth);
        const height = Math.max(180, container.clientHeight);

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const padding = { top: 28, right: 42, bottom: 36, left: 52 };
        const plotW = w - padding.left - padding.right;
        const plotH = h - padding.top - padding.bottom;

        const peakRpm = results.targetRPM || 1000;
        const rpmMin = Math.max(500, peakRpm * 0.35);
        const rpmMax = Math.max(peakRpm * 1.18, rpmMin + 1000);
        const rpmRange = rpmMax - rpmMin;

        const points = 80;
        const rpmData = [];
        const hpData = [];
        const tqData = [];

        for (let i = 0; i <= points; i++) {
            const rpm = rpmMin + (rpmRange / points) * i;
            const f = (rpm - rpmMin) / rpmRange;

            // Shape only for visualization; peak values remain the BRT-calculated values.
            let tqFactor;
            if (f <= 0.55) {
                tqFactor = 0.10 + 0.90 * Math.pow(f / 0.55, 0.72);
            } else {
                const decay = (f - 0.55) / 0.45;
                tqFactor = 1 - 0.35 * Math.pow(decay, 1.55);
            }

            tqFactor = Math.max(0.45, Math.min(1, tqFactor));

            const tq = results.torqueLbFt * tqFactor;
            const hp = (tq * rpm) / 5252;

            rpmData.push(rpm);
            tqData.push(tq);
            hpData.push(hp);
        }

        const yMax = Math.max(
            ...hpData,
            ...tqData.map(v => v * 1.35),
            results.powerHP * 1.1
        );

        const toX = rpm =>
            padding.left + ((rpm - rpmMin) / rpmRange) * plotW;

        const toY = value =>
            padding.top + plotH - (value / yMax) * plotH;

        ctx.strokeStyle = 'rgba(127,131,134,0.15)';
        ctx.lineWidth = 0.5;

        for (let i = 0; i <= 6; i++) {
            const y = padding.top + (plotH / 6) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
        }

        for (let i = 0; i <= 6; i++) {
            const x = padding.left + (plotW / 6) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, h - padding.bottom);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(200,200,200,0.7)';
        ctx.font = '9px "JetBrains Mono"';
        ctx.textAlign = 'right';

        for (let i = 0; i <= 6; i++) {
            const value = (yMax / 6) * i;
            ctx.fillText(Math.round(value), padding.left - 8, toY(value) + 4);
        }

        ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
            const rpm = rpmMin + (rpmRange / 5) * i;
            ctx.fillText(`${Math.round(rpm / 1000)}k`, toX(rpm), h - padding.bottom + 16);
        }

        ctx.fillText('RPM', w - padding.right + 10, h - padding.bottom + 6);

        function drawCurve(data, stroke, lineWidth, shadow) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.shadowColor = shadow;
            ctx.shadowBlur = 7;
            ctx.beginPath();

            data.forEach((value, i) => {
                const x = toX(rpmData[i]);
                const y = toY(value);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });

            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        drawCurve(tqData, '#00b4d8', 2, 'rgba(0,180,216,0.5)');
        drawCurve(hpData, '#ff544b', 2.5, 'rgba(255,84,75,0.6)');

        const hpPeakIndex = hpData.indexOf(Math.max(...hpData));
        const tqPeakIndex = tqData.indexOf(Math.max(...tqData));

        const hpX = toX(rpmData[hpPeakIndex]);
        const hpY = toY(hpData[hpPeakIndex]);
        const tqX = toX(rpmData[tqPeakIndex]);
        const tqY = toY(tqData[tqPeakIndex]);

        ctx.fillStyle = '#ff544b';
        ctx.beginPath();
        ctx.arc(hpX, hpY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00b4d8';
        ctx.beginPath();
        ctx.arc(tqX, tqY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 10px "JetBrains Mono"';
        ctx.fillStyle = '#ffb4ab';
        ctx.textAlign = 'left';
        ctx.fillText(`${results.powerHP.toFixed(2)} HP`, hpX + 8, hpY - 4);

        ctx.fillStyle = '#00b4d8';
        ctx.fillText(`${results.torqueLbFt.toFixed(2)} LB.FT`, tqX + 8, tqY + 14);

        if (chartOverlay) {
            chartOverlay.style.opacity = '0';
            chartOverlay.style.pointerEvents = 'none';
        }
    }

    function loadHistory() {
        try {
            const stored = localStorage.getItem('ap_performance_brt_history');
            simulationHistory = stored ? JSON.parse(stored) : [];
        } catch {
            simulationHistory = [];
        }
        renderHistory();
    }

    function saveHistory() {
        try {
            localStorage.setItem(
                'ap_performance_brt_history',
                JSON.stringify(simulationHistory)
            );
        } catch {
            simulationHistory = simulationHistory.slice(0, 5);
            localStorage.setItem(
                'ap_performance_brt_history',
                JSON.stringify(simulationHistory)
            );
        }
        renderHistory();
    }

    function addToHistory(inputs, results) {
        simulationHistory.unshift({
            id: Date.now(),
            name: `BRT_${inputs.bore}x${inputs.stroke}_IN${inputs.inValve}`,
            bore: inputs.bore,
            stroke: inputs.stroke,
            inValve: inputs.inValve,
            exValve: inputs.exValve,
            inSeat: inputs.inSeat,
            exSeat: inputs.exSeat,
            gasSpeed: inputs.gasSpeed,
            efficiency: inputs.efficiency,
            targetRPM: results.targetRPM,
            powerHP: results.powerHP,
            torqueLbFt: results.torqueLbFt,
            displacementCC: results.displacementCC,
            timestamp: new Date().toISOString()
        });

        if (simulationHistory.length > MAX_HISTORY) {
            simulationHistory = simulationHistory.slice(0, MAX_HISTORY);
        }

        saveHistory();
    }

    function renderHistory() {
        if (!simulationHistory.length) {
            historyList.innerHTML = '';
            noHistoryMsg.classList.remove('hidden');
            return;
        }

        noHistoryMsg.classList.add('hidden');

        historyList.innerHTML = simulationHistory.map((entry, index) => `
            <div class="flex items-center justify-between p-base bg-surface-container-lowest rounded border-l-2 ${index === 0 ? 'border-primary/40' : 'border-outline-variant/20'} cursor-pointer hover:bg-surface-container-high transition-all group"
                 data-id="${entry.id}" onclick="window._restoreSetup(${entry.id})">
                <div class="flex flex-col">
                    <span class="font-body-md text-on-surface group-hover:text-primary transition-colors">${entry.name}</span>
                    <span class="text-[9px] font-label-mono text-tertiary">
                        ${new Date(entry.timestamp).toLocaleDateString()} · ${entry.displacementCC.toFixed(4)}cc
                    </span>
                </div>
                <div class="flex gap-md font-label-mono text-xs items-center">
                    <span class="text-primary font-bold">${entry.powerHP.toFixed(2)} HP</span>
                    <span class="text-secondary">@${(entry.targetRPM / 1000).toFixed(2)}K</span>
                    <span class="material-symbols-outlined text-sm text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                </div>
            </div>
        `).join('');
    }

    window._restoreSetup = function (id) {
        const entry = simulationHistory.find(item => item.id === id);
        if (!entry) return;

        boreInput.value = entry.bore;
        strokeInput.value = entry.stroke;
        inValveInput.value = entry.inValve;
        exValveInput.value = entry.exValve;
        inSeatInput.value = entry.inSeat;
        exSeatInput.value = entry.exSeat;
        gasSpeedInput.value = entry.gasSpeed;
        veInput.value = entry.efficiency * 100;

        showToast(`Setup restored: ${entry.name}`, 'history', 1800);
        runCalculation(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function clearHistory() {
        simulationHistory = [];
        saveHistory();
        showToast('History cleared.', 'delete', 1800);
    }

    function exportReport() {
        if (!lastResults) {
            showToast('Run a calculation first.', 'warning', 2000);
            return;
        }

        const inputs = getInputValues();
        const results = lastResults;

        const report = `
========================================
AP PERFORMANCE
ENGINE PERFORMANCE V.01 — BRT MODEL
========================================
Date: ${new Date().toLocaleString()}

--- INPUT ---
Bore: ${inputs.bore} mm
Stroke: ${inputs.stroke} mm
Valve IN: ${inputs.inValve} mm
Valve EX: ${inputs.exValve} mm
Seat IN: ${inputs.inSeat} mm
Seat EX: ${inputs.exSeat} mm
Gas Speed: ${inputs.gasSpeed} m/s
Efficiency: ${(inputs.efficiency * 100).toFixed(0)} %

--- RESULT ---
Displacement: ${results.displacementCC.toFixed(4)} cc
Intake Flow: ${results.intakeCFM.toFixed(3)} CFM @28 Inch H2O
Exhaust Flow: ${results.exhaustCFM.toFixed(3)} CFM @28 Inch H2O
Potential Power: ${results.powerHP.toFixed(3)} HP
Power RPM: ${results.targetRPM.toFixed(2)} RPM
Potential Torque: ${results.torqueLbFt.toFixed(3)} lb.ft
Torque RPM: ${results.targetRPM.toFixed(2)} RPM

========================================
Generated by AP Performance
BRT Engine Performance V.01 compatible model
========================================
        `.trim();

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AP_BRT_Report_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showToast('Report exported.', 'download', 1800);
    }

    function quickCompare() {
        if (!lastResults) {
            showToast('Run a calculation first.', 'warning', 2000);
            return;
        }

        if (!compareData) {
            compareData = {
                inputs: getInputValues(),
                results: lastResults
            };
            showToast(
                'Baseline saved. Change values and calculate again.',
                'compare_arrows',
                3000
            );
            return;
        }

        const hpDiff = lastResults.powerHP - compareData.results.powerHP;
        const tqDiff = lastResults.torqueLbFt - compareData.results.torqueLbFt;

        const hpSign = hpDiff >= 0 ? '+' : '';
        const tqSign = tqDiff >= 0 ? '+' : '';

        showToast(
            `Compare: ${hpSign}${hpDiff.toFixed(3)} HP | ${tqSign}${tqDiff.toFixed(3)} LB.FT`,
            'compare_arrows',
            3500
        );

        compareData = null;
    }

    function toggleUnits() {
        // The BRT model is metric-input based. Keep the button for compatibility,
        // but do not reinterpret the entered dimensions as inches.
        unitSystem = unitSystem === 'metric' ? 'imperial' : 'metric';

        if (unitSystem === 'metric') {
            unitBadge.textContent = 'UNITS: METRIC';
            boreLabel.textContent = 'Bore (mm)';
            strokeLabel.textContent = 'Stroke (mm)';
            boreRange.textContent = 'RANGE: 47-102 MM';
            strokeRange.textContent = 'RANGE: 41-90 MM';
        } else {
            unitBadge.textContent = 'UNITS: DISPLAY';
            boreLabel.textContent = 'Bore (mm)';
            strokeLabel.textContent = 'Stroke (mm)';
            boreRange.textContent = 'BRT INPUT: MM';
            strokeRange.textContent = 'BRT INPUT: MM';
        }

        if (lastResults) {
            updateUI(lastResults, getInputValues());
            drawDynoChart(lastResults);
        }
    }

    function resetAll() {
        boreInput.value = defaults.bore;
        strokeInput.value = defaults.stroke;
        inValveInput.value = defaults.inValve;
        exValveInput.value = defaults.exValve;
        inSeatInput.value = defaults.inSeat;
        exSeatInput.value = defaults.exSeat;
        gasSpeedInput.value = defaults.gasSpeed;
        veInput.value = defaults.ve;

        compareData = null;
        showToast('Values reset to BRT reference setup.', 'restart_alt', 1800);
        runCalculation(false);
    }

    function runCalculation(save = true) {
        const inputs = getInputValues();
        const results = calculatePerformance(inputs);

        lastResults = results;
        updateUI(results, inputs);
        drawDynoChart(results);

        if (save) addToHistory(inputs, results);

        if (statusBadge) {
            statusBadge.innerHTML =
                '<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> STATUS: CALCULATED';

            setTimeout(() => {
                statusBadge.innerHTML =
                    '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> STATUS: READY';
            }, 1200);
        }
    }

    calculateBtn.addEventListener('click', () => {
        calculateBtn.innerHTML =
            '<span class="material-symbols-outlined animate-spin">refresh</span> COMPUTING...';
        calculateBtn.disabled = true;

        setTimeout(() => {
            runCalculation(true);
            calculateBtn.innerHTML =
                '<span class="material-symbols-outlined">analytics</span> CALCULATE';
            calculateBtn.disabled = false;
        }, 350);
    });

    resetBtn.addEventListener('click', resetAll);
    quickCompareBtn.addEventListener('click', quickCompare);
    exportBtn.addEventListener('click', exportReport);
    clearHistoryBtn.addEventListener('click', clearHistory);
    themeToggle.addEventListener('click', toggleUnits);

    const allInputs = [
        boreInput, strokeInput, inValveInput, exValveInput,
        inSeatInput, exSeatInput, gasSpeedInput, veInput
    ];

    let debounceTimeout;

    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimeout);

            debounceTimeout = setTimeout(() => {
                const inputs = getInputValues();
                const results = calculatePerformance(inputs);

                lastResults = results;
                updateUI(results, inputs);
                drawDynoChart(results);

                if (statusBadge) {
                    statusBadge.innerHTML =
                        '<span class="w-1.5 h-1.5 rounded-full bg-accent-gold"></span> STATUS: LIVE';
                }
            }, 250);
        });

        input.addEventListener('focus', () => {
            if (input.parentElement) {
                input.parentElement.style.transition = 'transform 0.2s ease';
                input.parentElement.style.transform = 'scale(1.02)';
            }
        });

        input.addEventListener('blur', () => {
            if (input.parentElement) {
                input.parentElement.style.transform = 'scale(1)';
            }
        });
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            runCalculation(true);
            showToast('Calculation triggered (Ctrl+Enter)', 'keyboard', 1500);
        }
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(() => {
            if (lastResults) drawDynoChart(lastResults);
        }, 250);
    });

    function init() {
        loadHistory();
        runCalculation(false);

        if (chartOverlay) {
            chartOverlay.style.opacity = '0';
            chartOverlay.style.pointerEvents = 'none';
        }
    }

    init();
})();
