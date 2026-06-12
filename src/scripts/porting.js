// porting.js
(function() {
    // DOM References
    const inValveInput = document.getElementById('inValvePortInput');
    const exValveInput = document.getElementById('exValvePortInput');
    const profileSelect = document.getElementById('profilePortSelect');
    const rpmInput = document.getElementById('rpmInput');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const themeToggle = document.getElementById('themeToggle');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');
    const statusBadge = document.getElementById('statusBadge');
    const gasSpeedPanel = document.getElementById('gasSpeedPanel');

    // Result displays
    const inPortDiaEl = document.getElementById('inPortDia');
    const exPortDiaEl = document.getElementById('exPortDia');
    const inPortAreaEl = document.getElementById('inPortArea');
    const exPortAreaEl = document.getElementById('exPortArea');
    const inGasSpeedEl = document.getElementById('inGasSpeed');
    const exGasSpeedEl = document.getElementById('exGasSpeed');

    // Defaults
    const defaults = {
        inValve: 0,
        exValve: 0,
        profile: 'daily',
        rpm: 0,
    };

    // Port diameter factors based on Graham Bell
    const portFactors = {
        daily: { in: 0.82, ex: 0.82 },
        semi:  { in: 0.88, ex: 0.88 },
        full:  { in: 0.94, ex: 0.94 }
    };

    // Helper: calculate area from diameter (mm²)
    function areaFromDiameter(dia) {
        return Math.PI * Math.pow(dia, 2) / 4;
    }

    // Helper: get inputs
    function getInputs() {
        return {
            inValve: parseFloat(inValveInput.value) || defaults.inValve,
            exValve: parseFloat(exValveInput.value) || defaults.exValve,
            profile: profileSelect.value,
            rpm: parseFloat(rpmInput.value) || 0,
        };
    }

    // Main calculation
    function calculatePort(inputs) {
        const profile = inputs.profile;
        const factors = portFactors[profile] || portFactors.daily;

        const inPortDia = inputs.inValve * factors.in;
        const exPortDia = inputs.exValve * factors.ex;

        const inPortArea = areaFromDiameter(inPortDia);
        const exPortArea = areaFromDiameter(exPortDia);

        // Gas speed calculation (mean) requires displacement (unknown here)
        // We'll compute estimated gas speed based on typical cylinder volume?
        // Since we don't have displacement, we'll show a placeholder if RPM provided but no displacement.
        // Better: allow user to input cylinder volume (cc) or displacement? For simplicity, we skip gas speed
        // because engine displacement is not available in this page. We can add displacement input.
        // Let's add a hidden displacement input? Or just inform user that gas speed needs displacement.
        // We'll show gas speed only if displacement input exists. But to keep things clean, we'll omit gas speed
        // or add a note. Since the requirement didn't specify displacement, we'll remove gas speed panel or
        // only show if we have engine displacement from previous page? No, standalone page.
        // So we'll hide gas speed panel and add a simple note.

        return {
            inPortDia: Math.round(inPortDia * 100) / 100,
            exPortDia: Math.round(exPortDia * 100) / 100,
            inPortArea: Math.round(inPortArea * 100) / 100,
            exPortArea: Math.round(exPortArea * 100) / 100,
        };
    }

    // Update UI
    function updateUI(results) {
        inPortDiaEl.textContent = results.inPortDia.toFixed(2) + ' mm';
        exPortDiaEl.textContent = results.exPortDia.toFixed(2) + ' mm';
        inPortAreaEl.textContent = results.inPortArea.toFixed(2) + ' mm²';
        exPortAreaEl.textContent = results.exPortArea.toFixed(2) + ' mm²';
    }

    // Show/hide gas speed panel (if RPM & displacement available)
    // Since no displacement, we hide and show a toast info
    function checkGasSpeed(inputs) {
        if (inputs.rpm > 0 && (inputs.inValve > 0 || inputs.exValve > 0)) {
            gasSpeedPanel.classList.remove('hidden');
            // We can't calculate gas speed without displacement, so show a message in the panel
            inGasSpeedEl.textContent = 'Requires engine displacement';
            exGasSpeedEl.textContent = 'Add displacement input';
        } else {
            gasSpeedPanel.classList.add('hidden');
        }
    }

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

    // Main calculation runner
    function runCalculation() {
        const inputs = getInputs();
        if (inputs.inValve === 0 && inputs.exValve === 0) {
            showToast('Please enter at least one valve diameter.', 'warning', 2000);
            return;
        }
        const results = calculatePort(inputs);
        updateUI(results);
        checkGasSpeed(inputs);
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
        rpmInput.value = defaults.rpm;
        runCalculation();
        showToast('Reset to default values.', 'restart_alt', 2000);
    }

    // Event listeners
    calculateBtn.addEventListener('click', () => {
        calculateBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">refresh</span> COMPUTING...`;
        calculateBtn.disabled = true;
        setTimeout(() => {
            runCalculation();
            calculateBtn.innerHTML = `<span class="material-symbols-outlined">air</span> CALCULATE PORT`;
            calculateBtn.disabled = false;
        }, 300);
    });

    resetBtn.addEventListener('click', resetAll);
    themeToggle.addEventListener('click', () => {
        showToast('Unit toggle not applicable for porting.', 'swap_horiz', 1500);
    });

    // Live update on input changes
    let debounceTimeout;
    const allInputs = [inValveInput, exValveInput, profileSelect, rpmInput];
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

    // Initialize
    function init() {
        runCalculation();
    }
    init();
})();