(() => {
    const ids = ['chamber', 'bore', 'stroke', 'deck', 'domeD', 'domeH'];
    const $ = (id) => document.getElementById(id);
    const fmt = (value) => value.toFixed(3);

    function showInvalid(message) {
        $('cr').textContent = '-- : 1';
        ['vs', 'vd', 'vdom', 'vc'].forEach((id) => { $(id).textContent = '-- cc'; });
        $('formula').textContent = message;
    }

    function calculate() {
        const raw = Object.fromEntries(ids.map((id) => [id, $(id).value]));
        if (ids.some((id) => raw[id].trim() === '')) {
            showInvalid('Lengkapi seluruh data untuk menghitung rasio kompresi.');
            $('warning').classList.add('hidden');
            return;
        }

        const { chamber: C, bore: B, stroke: S, deck: D, domeD: DD, domeH: H } =
            Object.fromEntries(ids.map((id) => [id, Number(raw[id])]));
        if (![C, B, S, D, DD, H].every(Number.isFinite) || C <= 0 || B <= 0 || S <= 0 || D < 0 || DD < 0 || H < 0) {
            showInvalid('Periksa input: chamber, bore, dan stroke harus lebih dari 0. Nilai mendem dan dome tidak boleh negatif.');
            $('warning').classList.add('hidden');
            return;
        }

        const Vs = (Math.PI / 4) * B * B * S / 1000;
        const Vd = (Math.PI / 4) * B * B * D / 1000;
        const Vdom = (Math.PI / 4) * DD * DD * H / 1000;
        const Vc = C + Vd - Vdom;
        if (Vc <= 0) {
            showInvalid('Volume dome terlalu besar. Total volume ruang sisa harus lebih dari 0 cc.');
            $('cr').textContent = 'ERROR';
            $('warning').textContent = 'Volume ruang sisa tidak valid. Kurangi volume dome atau periksa kembali data.';
            $('warning').classList.remove('hidden');
            return;
        }

        const CR = (Vs + Vc) / Vc;
        $('cr').textContent = `${CR.toFixed(2)} : 1`;
        $('vs').textContent = `${fmt(Vs)} cc`;
        $('vd').textContent = `${fmt(Vd)} cc`;
        $('vdom').textContent = `${fmt(Vdom)} cc`;
        $('vc').textContent = `${fmt(Vc)} cc`;
        $('formula').replaceChildren();
        const lines = [
            `Volume ruang sisa = Chamber + Mendem - Dome`,
            `= ${fmt(C)} + ${fmt(Vd)} - ${fmt(Vdom)}`,
            `= ${fmt(Vc)} cc`,
            `Rasio kompresi = (Volume langkah + Volume sisa) / Volume sisa`,
            `= (${fmt(Vs)} + ${fmt(Vc)}) / ${fmt(Vc)}`,
            `= ${CR.toFixed(3)} : 1`
        ];
        lines.forEach((line, index) => {
            const row = document.createElement('div');
            row.textContent = line;
            if (index === 2 || index === 5) row.className = 'text-primary';
            $('formula').appendChild(row);
        });

        if (DD > B) {
            $('warning').textContent = 'Perhatian: diameter dome melebihi diameter piston.';
            $('warning').classList.remove('hidden');
        } else {
            $('warning').classList.add('hidden');
        }
    }

    function resetData() {
        const defaults = { chamber: 0, bore: 0, stroke: 0, deck: 0, domeD: 0, domeH: 0 };
        Object.entries(defaults).forEach(([id, value]) => { $(id).value = value; });
        calculate();
    }

    ids.forEach((id) => $(id).addEventListener('input', calculate));
    $('resetButton').addEventListener('click', resetData);
    calculate();
})();
