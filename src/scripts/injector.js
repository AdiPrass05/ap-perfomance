// injector.js
(function() {
    // DOM References
    const powerInput = document.getElementById('powerInput');
    const cylCountSelect = document.getElementById('cylCountInjector');
    const fuelTypeSelect = document.getElementById('fuelTypeInjector');
    const afrInput = document.getElementById('afrInput');
    const bsfcInput = document.getElementById('bsfcInput');
    const dutyInput = document.getElementById('dutyInput');
    const ratedPressureInput = document.getElementById('ratedPressureInput');
    const actualPressureInput = document.getElementById('actualPressureInput');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const themeToggle = document.getElementById('themeToggle');
    const statusBadge = document.getElementById('statusBadge');
    const unitBadge = document.getElementById('unitBadge');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');
    const powerLabel = document.getElementById('powerLabel');
    const afrSuggestion = document.getElementById('afrSuggestion');
    const bsfcUnit = document.getElementById('bsfcUnit');
    const dutyBar = document.getElementById('dutyBar');
    const dutyPercent = document.getElementById('dutyPercent');

    // Result displays
    const injectorCC = document.getElementById('injectorCC');
    const injectorLB = document.getElementById('injectorLB');
    const injectorNote = document.getElementById('injectorNote');
    const totalFuelFlow = document.getElementById('totalFuelFlow');
    const totalFuelGal = document.getElementById('totalFuelGal');
    const hpPerInjector = document.getElementById('hpPerInjector');
    const hpSafetyNote = document.getElementById('hpSafetyNote');
    const bsfcResult = document.getElementById('bsfcResult');
    const stoichResult = document.getElementById('stoichResult');
    const fuelFlowPeak = document.getElementById('fuelFlowPeak');
    const pressureFactor = document.getElementById('pressureFactor');
    const recommendedInjector = document.getElementById('recommendedInjector');

    let unitSystem = 'metric'; // 'metric' or 'imperial'
    let lastResults = null;

    const defaults = {
        power: 0,
        cylCount: 1,
        fuelType: 'gasoline',
        afr: 12.5,
        bsfc: 0.50,
        duty: 80,
        ratedPressure: 3.0,
        actualPressure: 3.0,
    };

    // Fuel data: stoich ratio, BSFC (lb/HP·hr), density (g/cc)
    const fuelData = {
        gasoline: { stoich: 14.7, bsfc: 0.50, density: 0.745 },
        e85: { stoich: 9.8, bsfc: 0.70, density: 0.780 },
        methanol: { stoich: 6.4, bsfc: 1.10, density: 0.792 },
        diesel: { stoich: 14.5, bsfc: 0.38, density: 0.832 },
        e100: { stoich: 9.0, bsfc: 0.75, density: 0.789 },
        cng: { stoich: 17.2, bsfc: 0.35, density: 0.128 },
    };

    // Common injector sizes (cc/min)
    const commonSizes = [
        100, 150, 200, 240, 270, 310, 350, 390, 440,
        550, 650, 750, 850, 1000, 1200, 1600, 2000, 2200
    ];

    // Toast
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

    // Gather inputs
    function getInputValues() {
        const powerMode = document.querySelector('input[name="powerMode"]:checked').value;
        const rawPower = parseFloat(powerInput.value) || 0;
        const cylCount = parseInt(cylCountSelect.value) || 1;
        let totalPower = rawPower;
        if (powerMode === 'perCylinder') {
            totalPower = rawPower * cylCount;
        }
        const hpPerCyl = totalPower / cylCount;

        return {
            totalPower: totalPower,
            hpPerCyl: hpPerCyl,
            cylCount: cylCount,
            powerMode: powerMode,
            fuelType: fuelTypeSelect.value,
            afr: parseFloat(afrInput.value) || defaults.afr,
            bsfc: parseFloat(bsfcInput.value) || defaults.bsfc,
            duty: parseFloat(dutyInput.value) || defaults.duty,
            ratedPressure: parseFloat(ratedPressureInput.value) || defaults.ratedPressure,
            actualPressure: parseFloat(actualPressureInput.value) || defaults.actualPressure,
        };
    }

    // Main calculation
    function calculateInjector(inputs) {
        const hpPerCyl = inputs.hpPerCyl;
        const bsfc = inputs.bsfc;
        const duty = inputs.duty / 100;
        const ratedPressure = inputs.ratedPressure;
        const actualPressure = inputs.actualPressure;
        const fuel = fuelData[inputs.fuelType] || fuelData.gasoline;

        // Pressure correction factor
        const pressFactor = Math.sqrt(actualPressure / ratedPressure);

        // Injector flow (lb/hr) = (HP_per_cyl * BSFC) / duty
        const injectorLbHr = (hpPerCyl * bsfc) / duty;

        // Convert to cc/min: lb/hr * 10.5 * (densitas bensin / densitas fuel)
        const densityFactor = fuel.density / 0.745;
        const injectorCcMinRated = (injectorLbHr * 10.5) / densityFactor;

        // Actual flow at actual pressure (rated flow * pressFactor)
        const injectorCcMinActual = injectorCcMinRated * pressFactor;
        const injectorLbHrActual = injectorLbHr * pressFactor;

        // Total fuel flow (gal/hr) = (total lb/hr) / 6.0 (gasoline lb/gal)
        const totalFuelLbHr = injectorLbHrActual * inputs.cylCount;
        const totalFuelGalHr = totalFuelLbHr / 6.0;
        // Total fuel volume (L/hr) = gal/hr * 3.785
        const totalFuelLph = totalFuelGalHr * 3.785;

        // HP support per injector = (injector_cc * duty * densityFactor) / (bsfc * 10.5)
        const hpSupport = (injectorCcMinActual * duty * densityFactor) / (bsfc * 10.5);

        // Peak fuel flow per injector (cc/min at 100% duty)
        const peakFuelCc = injectorCcMinActual / duty;

        // Recommended injector size (next common size above 110% of calculated)
        let recommended = commonSizes[commonSizes.length - 1];
        for (let size of commonSizes) {
            if (size >= injectorCcMinActual * 1.1) {
                recommended = size;
                break;
            }
        }

        // Duty cycle of recommended injector
        const dutyRecommended = (injectorCcMinActual / recommended) * 100;

        return {
            injectorCcMin: Math.round(injectorCcMinRated * 10) / 10,
            injectorLbHr: Math.round(injectorLbHr * 10) / 10,
            injectorCcMinActual: Math.round(injectorCcMinActual * 10) / 10,
            injectorLbHrActual: Math.round(injectorLbHrActual * 10) / 10,
            totalFuelLbHr: Math.round(totalFuelLbHr * 10) / 10,
            totalFuelGalHr: Math.round(totalFuelGalHr * 10) / 10,
            totalFuelLph: Math.round(totalFuelLph * 10) / 10,
            hpSupport: Math.round(hpSupport * 10) / 10,
            peakFuelCc: Math.round(peakFuelCc * 10) / 10,
            pressFactor: Math.round(pressFactor * 100) / 100,
            recommended: recommended,
            dutyRecommended: Math.round(dutyRecommended * 10) / 10,
            stoich: fuel.stoich,
        };
    }

    // Update UI
    function updateUI(results, inputs) {
        const fuel = fuelData[inputs.fuelType] || fuelData.gasoline;

        // Main flow rates
        injectorCC.textContent = results.injectorCcMinActual;
        injectorLB.textContent = results.injectorLbHrActual;
        injectorNote.textContent = `Per injector · at ${inputs.actualPressure} bar pressure`;

        // Total fuel flow
        totalFuelFlow.textContent = results.totalFuelLph;
        totalFuelGal.textContent = results.totalFuelGalHr + ' GAL/HR';

        // HP per injector
        hpPerInjector.textContent = results.hpSupport;
        hpSafetyNote.textContent = `at ${inputs.duty}% duty cycle`;

        // Duty visual
        const dutyDisplay = Math.min(100, (results.injectorCcMinActual / results.recommended) * 100);
        dutyBar.style.width = dutyDisplay + '%';
        dutyPercent.textContent = Math.round(dutyDisplay) + '%';
        if (dutyDisplay > 85) {
            dutyBar.style.backgroundColor = '#ff4444';
        } else if (dutyDisplay > 75) {
            dutyBar.style.backgroundColor = '#f0a500';
        } else {
            dutyBar.style.backgroundColor = '#ff544b';
        }

        // Detail cards
        bsfcResult.innerHTML = inputs.bsfc.toFixed(2) + ' <span class="text-xs font-body-md text-tertiary">LB/HP·HR</span>';
        stoichResult.innerHTML = results.stoich + ' <span class="text-xs font-body-md text-tertiary">:1</span>';
        fuelFlowPeak.innerHTML = results.peakFuelCc + ' <span class="text-xs font-body-md text-tertiary">CC/INJ</span>';
        pressureFactor.innerHTML = results.pressFactor + ' <span class="text-xs font-body-md text-tertiary">x</span>';
        recommendedInjector.innerHTML = results.recommended + ' <span class="text-xs font-body-md text-tertiary">CC</span>';
    }

    // Update fuel-specific defaults
    function updateFuelDefaults(fuelType) {
        const fuel = fuelData[fuelType] || fuelData.gasoline;
        afrInput.value = (fuel.stoich * 0.85).toFixed(1); // target AFR ~ 85% of stoich for power
        bsfcInput.value = fuel.bsfc;
        afrSuggestion.textContent = 'STOICH: ' + fuel.stoich + ':1';
        if (unitSystem === 'imperial') {
            bsfcUnit.textContent = 'LB/HP·HR';
        } else {
            bsfcUnit.textContent = 'G/KW·H';
        }
    }

    // Unit toggle (metric/imperial placeholder)
    function toggleUnits() {
        unitSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
        if (unitSystem === 'metric') {
            unitBadge.textContent = 'UNITS: METRIC';
            powerLabel.textContent = 'Target HP';
            bsfcUnit.textContent = 'LB/HP·HR';
        } else {
            unitBadge.textContent = 'UNITS: IMPERIAL';
            powerLabel.textContent = 'Target kW';
            bsfcUnit.textContent = 'G/KW·H';
        }
        if (lastResults) {
            updateUI(lastResults, getInputValues());
        }
        showToast('Switched to ' + unitSystem.toUpperCase() + ' units', 'swap_horiz', 1500);
    }

    // Reset to defaults
    function resetAll() {
        powerInput.value = defaults.power;
        cylCountSelect.value = defaults.cylCount;
        fuelTypeSelect.value = defaults.fuelType;
        afrInput.value = defaults.afr;
        bsfcInput.value = defaults.bsfc;
        dutyInput.value = defaults.duty;
        ratedPressureInput.value = defaults.ratedPressure;
        actualPressureInput.value = defaults.actualPressure;
        document.querySelector('input[name="powerMode"][value="total"]').checked = true;
        updateFuelDefaults(defaults.fuelType);
        showToast('All values reset to defaults.', 'restart_alt', 2000);
        runCalculation();
    }

    // Main run
    function runCalculation() {
        const inputs = getInputValues();
        const results = calculateInjector(inputs);
        lastResults = results;
        updateUI(results, inputs);
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
            calculateBtn.innerHTML = `<span class="material-symbols-outlined">analytics</span> CALCULATE INJECTOR`;
            calculateBtn.disabled = false;
            const resultsPanel = document.getElementById('resultsPanel');
            if (resultsPanel) {
                resultsPanel.style.opacity = '0.4';
                resultsPanel.style.transform = 'scale(0.99)';
                setTimeout(() => {
                    resultsPanel.style.opacity = '1';
                    resultsPanel.style.transform = 'scale(1)';
                }, 100);
            }
        }, 500);
    });

    resetBtn.addEventListener('click', resetAll);

    themeToggle.addEventListener('click', toggleUnits);

    // Fuel type change
    fuelTypeSelect.addEventListener('change', () => {
        updateFuelDefaults(fuelTypeSelect.value);
        runCalculation();
    });

    // Radio button change
    const powerModeRadios = document.querySelectorAll('input[name="powerMode"]');
    powerModeRadios.forEach(radio => {
        radio.addEventListener('change', () => runCalculation());
    });

    // Debounced live update for number inputs
    let debounceTimeout;
    const allInputs = [
        powerInput, cylCountSelect, afrInput, bsfcInput,
        dutyInput, ratedPressureInput, actualPressureInput
    ];
    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                runCalculation();
                statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-accent-gold"></span> STATUS: LIVE';
                setTimeout(() => {
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> STATUS: READY';
                }, 800);
            }, 350);
        });
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            runCalculation();
            showToast('Calculation triggered (Ctrl+Enter)', 'keyboard', 1500);
        }
    });

    // Init
    function init() {
        updateFuelDefaults(defaults.fuelType);
        runCalculation();
    }
    init();
})();