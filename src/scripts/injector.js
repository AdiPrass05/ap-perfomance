(function() {
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
            const saveSetupBtn = document.getElementById('saveSetupBtn');
            const clearHistoryBtn = document.getElementById('clearHistoryBtn');
            const themeToggle = document.getElementById('themeToggle');
            const historyList = document.getElementById('historyList');
            const noHistoryMsg = document.getElementById('noHistoryMsg');
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

            let unitSystem = 'metric';
            let calcHistory = [];
            let lastResults = null;
            const MAX_HISTORY = 15;

            const fuelData = {
                gasoline: { stoich: 14.7, bsfc: 0.50, density: 0.745 },
                e85: { stoich: 9.8, bsfc: 0.70, density: 0.780 },
                methanol: { stoich: 6.4, bsfc: 1.10, density: 0.792 },
                diesel: { stoich: 14.5, bsfc: 0.38, density: 0.832 },
                e100: { stoich: 9.0, bsfc: 0.75, density: 0.789 },
                cng: { stoich: 17.2, bsfc: 0.35, density: 0.128 },
            };

            const defaults = {
                power: 0,
                cylCount: 4,
                fuelType: 'gasoline',
                afr: 12.5,
                bsfc: 0.50,
                duty: 80,
                ratedPressure: 3.0,
                actualPressure: 3.0,
            };

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

            function getInputValues() {
                const powerMode = document.querySelector('input[name="powerMode"]:checked').value;
                const rawPower = parseFloat(powerInput.value) || 0;
                const cylCount = parseInt(cylCountSelect.value) || 4;
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
                    afr: parseFloat(afrInput.value) || 12.5,
                    bsfc: parseFloat(bsfcInput.value) || 0.50,
                    duty: parseFloat(dutyInput.value) || 80,
                    ratedPressure: parseFloat(ratedPressureInput.value) || 3.0,
                    actualPressure: parseFloat(actualPressureInput.value) || 3.0,
                };
            }

            function calculateInjector(inputs) {
                const hpPerCyl = inputs.hpPerCyl;
                const bsfc = inputs.bsfc;
                const duty = inputs.duty / 100;
                const ratedPressure = inputs.ratedPressure;
                const actualPressure = inputs.actualPressure;
                const fuel = fuelData[inputs.fuelType] || fuelData.gasoline;

                // Pressure correction factor
                const pressFactor = Math.sqrt(actualPressure / ratedPressure);

                // Injector flow in lb/hr
                const injectorLbHr = (hpPerCyl * bsfc) / duty;
                // Convert to cc/min (1 lb/hr ≈ 10.5 cc/min for gasoline, adjust for density)
                const densityFactor = fuel.density / 0.745;
                const injectorCcMin = (injectorLbHr * 10.5) / densityFactor;

                // Pressure-adjusted flow
                const injectorCcMinActual = injectorCcMin / pressFactor;
                const injectorLbHrActual = injectorLbHr / pressFactor;

                // Total fuel flow
                const totalFuelLbHr = injectorLbHrActual * inputs.cylCount;
                const totalFuelGalHr = totalFuelLbHr / 6.0;

                // HP per injector at this size
                const hpSupport = (injectorCcMinActual * duty * densityFactor) / (bsfc * 10.5);

                // Peak fuel flow per injector (cc/min at 100% duty)
                const peakFuelCc = injectorCcMinActual / duty;

                // Recommended injector size (round up to common sizes)
                const commonSizes = [
                    100, 150, 200, 240, 270, 310, 350, 390, 440,
                    550, 650, 750, 850, 1000, 1200, 1600, 2000, 2200
                ];
                let recommended = commonSizes[0];
                for (const size of commonSizes) {
                    if (size >= injectorCcMinActual * 1.1) {
                        recommended = size;
                        break;
                    }
                    recommended = size;
                }

                return {
                    injectorCcMin: Math.round(injectorCcMin * 10) / 10,
                    injectorLbHr: Math.round(injectorLbHr * 10) / 10,
                    injectorCcMinActual: Math.round(injectorCcMinActual * 10) / 10,
                    injectorLbHrActual: Math.round(injectorLbHrActual * 10) / 10,
                    totalFuelLbHr: Math.round(totalFuelLbHr * 10) / 10,
                    totalFuelGalHr: Math.round(totalFuelGalHr * 10) / 10,
                    hpSupport: Math.round(hpSupport * 10) / 10,
                    peakFuelCc: Math.round(peakFuelCc * 10) / 10,
                    pressFactor: Math.round(pressFactor * 100) / 100,
                    recommended: recommended,
                    stoich: fuel.stoich,
                    bsfc: bsfc,
                };
            }

            function updateUI(results, inputs) {
                const duty = inputs.duty;

                injectorCC.textContent = results.injectorCcMinActual;
                injectorLB.textContent = results.injectorLbHrActual;
                injectorNote.textContent = 'Per injector · at ' + inputs.actualPressure + ' bar pressure';

                totalFuelFlow.textContent = (results.totalFuelLbHr * 0.454 / (fuelData[inputs.fuelType]?.density || 0.745)).toFixed(1);
                totalFuelGal.textContent = results.totalFuelGalHr + ' GAL/HR';

                hpPerInjector.textContent = results.hpSupport;
                hpSafetyNote.textContent = 'at ' + duty + '% duty cycle';

                // Duty bar
                const dutyDisplay = Math.min(100, (results.injectorCcMinActual / results.recommended) * duty);
                dutyBar.style.width = dutyDisplay + '%';
                dutyPercent.textContent = Math.round(dutyDisplay) + '%';
                if (dutyDisplay > 85) {
                    dutyBar.style.backgroundColor = '#ff4444';
                } else if (dutyDisplay > 75) {
                    dutyBar.style.backgroundColor = '#f0a500';
                } else {
                    dutyBar.style.backgroundColor = '#ff544b';
                }

                bsfcResult.innerHTML = results.bsfc + ' <span class="text-xs font-body-md text-tertiary">LB/HP·HR</span>';
                stoichResult.innerHTML = results.stoich + ' <span class="text-xs font-body-md text-tertiary">:1</span>';
                fuelFlowPeak.innerHTML = results.peakFuelCc + ' <span class="text-xs font-body-md text-tertiary">CC/INJ</span>';
                pressureFactor.innerHTML = results.pressFactor + ' <span class="text-xs font-body-md text-tertiary">x</span>';
                recommendedInjector.innerHTML = results.recommended + ' <span class="text-xs font-body-md text-tertiary">CC</span>';

                // Update BSFC unit
                if (unitSystem === 'metric') {
                    bsfcUnit.textContent = 'LB/HP·HR';
                    powerLabel.textContent = 'Target HP';
                } else {
                    bsfcUnit.textContent = 'G/KW·H';
                    powerLabel.textContent = 'Target kW';
                }
            }

            function updateFuelDefaults(fuelType) {
                const fuel = fuelData[fuelType] || fuelData.gasoline;
                afrInput.value = fuel.stoich * 0.85;
                bsfcInput.value = fuel.bsfc;
                afrSuggestion.textContent = 'STOICH: ' + fuel.stoich + ':1';
            }

            function loadHistory() {
                try {
                    const stored = localStorage.getItem('ap_injector_history');
                    if (stored) calcHistory = JSON.parse(stored);
                } catch (e) { calcHistory = []; }
                renderHistory();
            }

            function saveHistory() {
                try {
                    localStorage.setItem('ap_injector_history', JSON.stringify(calcHistory));
                } catch (e) {
                    showToast('Storage full. Clearing old entries.', 'warning', 3000);
                    calcHistory = calcHistory.slice(-5);
                    localStorage.setItem('ap_injector_history', JSON.stringify(calcHistory));
                }
                renderHistory();
            }

            function addToHistory(inputs, results) {
                const entry = {
                    id: Date.now(),
                    power: inputs.totalPower,
                    cylCount: inputs.cylCount,
                    fuelType: inputs.fuelType,
                    injectorCC: results.injectorCcMinActual,
                    injectorLB: results.injectorLbHrActual,
                    recommended: results.recommended,
                    timestamp: new Date().toISOString(),
                };
                calcHistory.unshift(entry);
                if (calcHistory.length > MAX_HISTORY) calcHistory = calcHistory.slice(0, MAX_HISTORY);
                saveHistory();
            }

            function renderHistory() {
                if (calcHistory.length === 0) {
                    historyList.innerHTML = '';
                    noHistoryMsg.classList.remove('hidden');
                    return;
                }
                noHistoryMsg.classList.add('hidden');
                historyList.innerHTML = calcHistory.map((entry, index) => `
                    <div class="flex items-center justify-between p-base bg-surface-container-lowest rounded border-l-2 ${index === 0 ? 'border-primary/40' : 'border-outline-variant/20'} cursor-pointer hover:bg-surface-container-high transition-all group slide-in"
                         data-id="${entry.id}" onclick="window._restoreInjectorSetup(${entry.id})">
                        <div class="flex flex-col">
                            <span class="font-body-md text-on-surface group-hover:text-primary transition-colors">${entry.power} HP · ${entry.cylCount} Cyl</span>
                            <span class="text-[9px] font-label-mono text-tertiary">${new Date(entry.timestamp).toLocaleDateString()} · ${entry.fuelType}</span>
                        </div>
                        <div class="flex gap-md font-label-mono text-xs items-center">
                            <span class="text-primary font-bold">${entry.injectorCC} CC</span>
                            <span class="text-secondary">Rec: ${entry.recommended} CC</span>
                            <span class="material-symbols-outlined text-sm text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                        </div>
                    </div>
                `).join('');
            }

            function clearHistory() {
                calcHistory = [];
                saveHistory();
                showToast('History cleared.', 'delete', 2000);
            }

            window._restoreInjectorSetup = function(id) {
                const entry = calcHistory.find(e => e.id === id);
                if (!entry) return;
                powerInput.value = entry.power;
                cylCountSelect.value = entry.cylCount;
                fuelTypeSelect.value = entry.fuelType;
                document.querySelector('input[name="powerMode"][value="total"]').checked = true;
                updateFuelDefaults(entry.fuelType);
                showToast('Setup restored.', 'history', 2000);
                runCalculation();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };

            function saveCurrentSetup() {
                const inputs = getInputValues();
                const results = lastResults || calculateInjector(inputs);
                const setup = {
                    inputs: inputs,
                    results: results,
                    timestamp: new Date().toISOString(),
                };
                try {
                    const saved = JSON.parse(localStorage.getItem('ap_injector_setups') || '[]');
                    saved.unshift(setup);
                    if (saved.length > 20) saved.length = 20;
                    localStorage.setItem('ap_injector_setups', JSON.stringify(saved));
                    showToast('Setup saved.', 'save', 2000);
                } catch (e) {
                    showToast('Failed to save setup.', 'error', 2000);
                }
            }

            function toggleUnits() {
                unitSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
                if (unitSystem === 'metric') {
                    unitBadge.textContent = 'UNITS: METRIC';
                } else {
                    unitBadge.textContent = 'UNITS: IMPERIAL';
                }
                if (lastResults) {
                    updateUI(lastResults, getInputValues());
                }
                showToast('Switched to ' + unitSystem.toUpperCase() + ' units', 'swap_horiz', 1500);
            }

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

            function runCalculation() {
                const inputs = getInputValues();
                const results = calculateInjector(inputs);
                lastResults = results;
                updateUI(results, inputs);
                addToHistory(inputs, results);
                statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> STATUS: CALCULATED';
                setTimeout(() => {
                    statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> STATUS: READY';
                }, 1500);
            }

            // Event Listeners
            calculateBtn.addEventListener('click', () => {
                calculateBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">refresh</span> COMPUTING...`;
                calculateBtn.disabled = true;
                setTimeout(() => {
                    runCalculation();
                    calculateBtn.innerHTML = `<span class="material-symbols-outlined">analytics</span> CALCULATE INJECTOR`;
                    calculateBtn.disabled = false;
                    const resultsPanel = document.getElementById('resultsPanel');
                    resultsPanel.style.opacity = '0.4';
                    resultsPanel.style.transform = 'scale(0.99)';
                    setTimeout(() => {
                        resultsPanel.style.opacity = '1';
                        resultsPanel.style.transform = 'scale(1)';
                    }, 100);
                }, 500);
            });

            resetBtn.addEventListener('click', resetAll);
            saveSetupBtn.addEventListener('click', saveCurrentSetup);
            clearHistoryBtn.addEventListener('click', clearHistory);
            themeToggle.addEventListener('click', toggleUnits);

            fuelTypeSelect.addEventListener('change', () => {
                updateFuelDefaults(fuelTypeSelect.value);
            });

            // Debounced live update
            let debounceTimeout;
            const allInputs = [
                powerInput, cylCountSelect, fuelTypeSelect, afrInput, bsfcInput,
                dutyInput, ratedPressureInput, actualPressureInput
            ];
            const radioInputs = document.querySelectorAll('input[name="powerMode"]');

            allInputs.forEach(input => {
                input.addEventListener('input', () => {
                    clearTimeout(debounceTimeout);
                    debounceTimeout = setTimeout(() => {
                        const inputs = getInputValues();
                        const results = calculateInjector(inputs);
                        lastResults = results;
                        updateUI(results, inputs);
                        statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-accent-gold"></span> STATUS: LIVE';
                        setTimeout(() => {
                            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> STATUS: READY';
                        }, 800);
                    }, 300);
                });
            });

            radioInputs.forEach(radio => {
                radio.addEventListener('change', () => {
                    const inputs = getInputValues();
                    const results = calculateInjector(inputs);
                    lastResults = results;
                    updateUI(results, inputs);
                });
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    runCalculation();
                    showToast('Calculation triggered (Ctrl+Enter)', 'keyboard', 1500);
                }
            });

            function init() {
                loadHistory();
                updateFuelDefaults(defaults.fuelType);
                runCalculation();
            }

            init();
        })();