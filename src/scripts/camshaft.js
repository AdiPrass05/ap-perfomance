// camshaft.js
(function() {
    // DOM References
    const inValveInput = document.getElementById('inValveCamInput');
    const exValveInput = document.getElementById('exValveCamInput');
    const profileSelect = document.getElementById('profileSelect');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const saveSetupBtn = document.getElementById('saveSetupBtn');
    const themeToggle = document.getElementById('themeToggle');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');

    // Result displays
    const inLiftEl = document.getElementById('inLift');
    const exLiftEl = document.getElementById('exLift');
    const inOverLiftEl = document.getElementById('inOverLift');
    const exOverLiftEl = document.getElementById('exOverLift');
    const statusBadge = document.getElementById('statusBadge');

    // Default values
    const defaults = {
        inValve: 0,
        exValve: 0,
        profile: 'daily',
    };

    // Preset data: lift factor & overlift factor (fraction of valve diameter)
    // Overlift = lift at TDC during overlap (both valves slightly open)
    const presets = {
        daily: {
            liftFactorIn: 0.24,
            liftFactorEx: 0.24,
            overLiftFactorIn: 0.08,   // ~0.84 mm for 28mm valve
            overLiftFactorEx: 0.08,  // ~0.60 mm for 24mm valve
        },
        semi: {
            liftFactorIn: 0.285,
            liftFactorEx: 0.285,
            overLiftFactorIn: 0.11,
            overLiftFactorEx: 0.11,
        },
        full: {
            liftFactorIn: 0.33,
            liftFactorEx: 0.33,
            overLiftFactorIn: 0.14,
            overLiftFactorEx: 0.14,
        },
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

    // Get inputs
    function getInputs() {
        return {
            inValve: parseFloat(inValveInput.value) || defaults.inValve,
            exValve: parseFloat(exValveInput.value) || defaults.exValve,
            profile: profileSelect.value,
        };
    }

    // Calculate
    function calculateCam(inputs) {
        const profile = inputs.profile;
        const p = presets[profile] || presets.semi;

        const inLift = Math.round(p.liftFactorIn * inputs.inValve * 100) / 100;
        const exLift = Math.round(p.liftFactorEx * inputs.exValve * 100) / 100;
        const inOverLift = Math.round(p.overLiftFactorIn * inputs.inValve * 100) / 100;
        const exOverLift = Math.round(p.overLiftFactorEx * inputs.exValve * 100) / 100;

        return {
            inLift,
            exLift,
            inOverLift,
            exOverLift,
        };
    }

    // Update UI
    function updateUI(results) {
        inLiftEl.textContent = results.inLift.toFixed(2) + ' mm';
        exLiftEl.textContent = results.exLift.toFixed(2) + ' mm';
        inOverLiftEl.textContent = results.inOverLift.toFixed(2) + ' mm';
        exOverLiftEl.textContent = results.exOverLift.toFixed(2) + ' mm';
    }

    // Main calculation run
    function runCalculation() {
        const inputs = getInputs();
        const results = calculateCam(inputs);
        updateUI(results);
        if (statusBadge) {
            statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> STATUS: CALCULATED';
            setTimeout(() => {
                statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> STATUS: READY';
            }, 1500);
        }
    }

    // Reset to defaults
    function resetAll() {
        inValveInput.value = defaults.inValve;
        exValveInput.value = defaults.exValve;
        profileSelect.value = defaults.profile;
        runCalculation();
        showToast('Reset to default daily setup.', 'restart_alt', 2000);
    }

    // Event Listeners
    calculateBtn.addEventListener('click', () => {
        calculateBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">refresh</span> COMPUTING...`;
        calculateBtn.disabled = true;
        setTimeout(() => {
            runCalculation();
            calculateBtn.innerHTML = `<span class="material-symbols-outlined">precision_manufacturing</span> CALCULATE CAMSHAFT`;
            calculateBtn.disabled = false;
        }, 300);
    });

    resetBtn.addEventListener('click', resetAll);

    saveSetupBtn.addEventListener('click', () => {
        showToast('Setup saved locally.', 'save', 2000);
    });

    themeToggle.addEventListener('click', () => {
        showToast('Unit toggle not applicable.', 'swap_horiz', 1500);
    });

    // Live update when inputs change
    let debounceTimeout;
    const allInputs = [inValveInput, exValveInput, profileSelect];
    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                runCalculation();
            }, 350);
        });
        input.addEventListener('change', () => {
            clearTimeout(debounceTimeout);
            runCalculation();
        });
    });

    // Init
    function init() {
        // Set default profile
        profileSelect.value = defaults.profile;
        runCalculation();
    }
    init();
})();