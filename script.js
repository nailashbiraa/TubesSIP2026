// ==================== LOGIN & REGISTER ====================
if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([{ username: 'admin', password: 'admin' }]));
}
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const loginForm = document.getElementById('formArea');
const registerForm = document.getElementById('registerArea');

document.getElementById('showRegister').onclick = () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
};
document.getElementById('showLogin').onclick = () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
};
document.getElementById('loginBtn').onclick = () => {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const users = JSON.parse(localStorage.getItem('users'));
    if (users.find(u => u.username === user && u.password === pass)) {
        loginScreen.style.opacity = '0';
        setTimeout(() => {
            loginScreen.style.display = 'none';
            showLoading(() => { initMapAndData(); hideLoading(); appContainer.style.display = 'flex'; });
        }, 500);
    } else {
        document.getElementById('loginMsg').innerText = 'Username/password salah!';
    }
};
document.getElementById('registerBtn').onclick = () => {
    const newUser = document.getElementById('regUser').value.trim();
    const newPass = document.getElementById('regPass').value.trim();
    const confirm = document.getElementById('regConfirm').value.trim();
    if (!newUser || !newPass) { document.getElementById('loginMsg').innerText = 'Isi semua field!'; return; }
    if (newPass !== confirm) { document.getElementById('loginMsg').innerText = 'Password tidak cocok!'; return; }
    const users = JSON.parse(localStorage.getItem('users'));
    if (users.find(u => u.username === newUser)) { document.getElementById('loginMsg').innerText = 'Username sudah ada!'; return; }
    users.push({ username: newUser, password: newPass });
    localStorage.setItem('users', JSON.stringify(users));
    document.getElementById('loginMsg').style.color = 'green';
    document.getElementById('loginMsg').innerText = 'Pendaftaran berhasil! Silakan login.';
    setTimeout(() => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        document.getElementById('loginMsg').innerText = '';
    }, 1500);
};

function showLoading(cb) {
    loadingOverlay.style.visibility = 'visible';
    const car = document.getElementById('movingCar');
    const fill = document.getElementById('progressFill');
    const percentSpan = document.getElementById('loadingPercent');
    setTimeout(() => {
        const containerWidth = document.querySelector('.progress-bar-bg').offsetWidth;
        const carWidth = 40;
        let width = 0;
        const interval = setInterval(() => {
            width += Math.random() * 12;
            if (width >= 100) width = 100;
            fill.style.width = width + '%';
            percentSpan.innerText = Math.floor(width) + '%';
            let leftPos = (width / 100) * (containerWidth - carWidth);
            if (leftPos < 0) leftPos = 0;
            car.style.left = leftPos + 'px';
            if (Math.random() > 0.6) {
                const smoke = document.createElement('div');
                smoke.className = 'smoke-load';
                smoke.innerText = '💨';
                smoke.style.left = (leftPos - 10) + 'px';
                smoke.style.top = '20px';
                document.getElementById('carAnimation').appendChild(smoke);
                setTimeout(() => smoke.remove(), 500);
            }
            if (width >= 100) { clearInterval(interval); if (cb) cb(); }
        }, 80);
    }, 100);
}
function hideLoading() { loadingOverlay.style.visibility = 'hidden'; }

// ==================== PROYEKSI & WARNA ====================
proj4.defs("EPSG:32749", "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs");
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
function reprojectGeometry(geom) {
    if (geom.type === "Polygon") {
        geom.coordinates = geom.coordinates.map(ring => ring.map(c => proj4("EPSG:32749", "EPSG:4326", c)));
    } else if (geom.type === "MultiPolygon") {
        geom.coordinates = geom.coordinates.map(poly => poly.map(ring => ring.map(c => proj4("EPSG:32749", "EPSG:4326", c))));
    }
    return geom;
}
function getColor(kelas) {
    if (!kelas) return '#888';
    if (kelas === 'SANGAT BERPOTENSI') return '#1b5e20';
    if (kelas === 'BERPOTENSI') return '#4caf50';
    if (kelas === 'CUKUP BERPOTENSI') return '#ff9800';
    if (kelas === 'KURANG BERPOTENSI') return '#ffc107';
    if (kelas === 'TIDAK BERPOTENSI') return '#f44336';
    return '#3388ff';
}

let map, emissionChart, ndviChart, potensiChart;
let geoJsonData, currentFeature = null;
const analyzeBtn = document.getElementById('analyzeBtn');
const analysisDiv = document.getElementById('analysisText');

function formatNumber(num) { return num ? num.toLocaleString('id-ID') : '0'; }
function getDnbrCategory(val) {
    if (val === undefined) return 'Tidak ada';
    if (val < 0.1) return 'Rendah';
    if (val < 0.3) return 'Sedang';
    return 'Tinggi';
}

function showAnalysis() {
    if (!currentFeature) return;
    const p = currentFeature.properties;
    const carbonTon = (p.TOTAL_CARB || 0) / 1000;
    const ndvi = p.NDVI_MEANm || 0;
    const potensi = p.KELAS_CTPI || 'Tidak';
    const nilaiRp = p.CARBON_VAL || 0;
    let explanation = '';
    if (carbonTon > 1000) explanation += '✅ Stok karbon sangat tinggi, potensi kredit karbon besar. ';
    else if (carbonTon > 500) explanation += '✅ Stok karbon sedang, berpotensi untuk perdagangan karbon. ';
    else explanation += '⚠️ Stok karbon rendah, perlu peningkatan tutupan lahan. ';
    if (ndvi > 0.7) explanation += '🌿 Vegetasi sangat sehat, kualitas ekosistem baik. ';
    else if (ndvi > 0.5) explanation += '🌿 Vegetasi cukup sehat. ';
    else explanation += '🍂 Vegetasi kurang sehat, perlu restorasi. ';
    if (nilaiRp > 50000000) explanation += '💰 Nilai ekonomi karbon sangat signifikan. ';
    else if (nilaiRp > 10000000) explanation += '💰 Nilai ekonomi cukup menarik. ';
    else explanation += '💰 Nilai ekonomi masih rendah, tetapi berpotensi meningkat. ';
    analysisDiv.innerHTML = `
        <strong>📈 Rekomendasi untuk ${p.NAMOBJ}</strong><br>
        ${explanation}<br>
        💡 <strong>Saran:</strong> ${potensi.includes('BERPOTENSI') ? 'Wilayah ini layak diusulkan untuk proyek karbon. Segera lakukan verifikasi lapangan.' : 'Tingkatkan tutupan lahan dengan agroforestri atau konservasi.'}
    `;
    analysisDiv.style.display = 'block';
}
analyzeBtn.onclick = showAnalysis;

function updateCharts(feature) {
    currentFeature = feature;
    analyzeBtn.style.display = 'block';
    analysisDiv.style.display = 'none';
    const p = feature.properties;
    const carbonTon = (p.TOTAL_CARB || 0) / 1000;
    const co2Ton = (p.TOTAL_CO2 || 0) / 1000;
    const agb = p.AGBmean || 0;
    const ndvi = p.NDVI_MEANm || 0;
    const luasHa = (p.LUAS_AREA || 0) / 10000;
    const carbonPool = p.CARBONPOOL || 0;
    const carbonLoss = p.CARBONLOSS || 0;
    const dnbr = p.dNBR_MEANm || 0;
    const ctpival = p.CTPIMEAN_m || 0;
    const nilaiRp = p.CARBON_VAL || 0;
    const nilaiUsd = nilaiRp / 15000; // kurs asumsi 15.000

    document.getElementById('selectedDetail').innerHTML = `
        <strong>${p.NAMOBJ || 'Desa'}</strong><br>
        Kecamatan: ${p.WADMKC || '-'}<br>
        <hr>
        📐 Luas: ${luasHa.toFixed(2)} ha<br>
        🌳 AGB: ${agb.toFixed(2)} Mg/ha<br>
        💧 Carbon Pool Density: ${carbonPool.toFixed(2)} MgC/ha<br>
        📦 Carbon Stock: ${carbonTon.toFixed(0)} ton C<br>
        ⚠️ Carbon Loss: ${carbonLoss.toFixed(2)} ton C<br>
        🔥 dNBR: ${dnbr.toFixed(3)} (Tingkat Gangguan: ${getDnbrCategory(dnbr)})<br>
        🌿 NDVI: ${ndvi.toFixed(3)}<br>
        💨 CO₂e: ${co2Ton.toFixed(0)} ton CO₂e<br>
        📊 CTPI: ${ctpival.toFixed(2)} (${p.KELAS_CTPI || '-'})<br>
        💰 Estimasi Nilai Karbon: <span style="color:#ff9800;">Rp ${formatNumber(Math.round(nilaiRp))}</span><br>
        💵 (USD ${formatNumber(Math.round(nilaiUsd))} dengan kurs 15.000)<br>
        <small>*Nilai dihitung berdasarkan faktor harga standar</small>
    `;
    if (emissionChart) emissionChart.destroy();
    const ctx1 = document.getElementById('emissionChart').getContext('2d');
    emissionChart = new Chart(ctx1, {
        type: 'bar', data: { labels: ['Karbon (ton C)', 'CO₂ (ton)'], datasets: [{ label: '', data: [carbonTon, co2Ton], backgroundColor: ['#4caf50', '#ff9800'], borderRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } } }
    });
    if (ndviChart) ndviChart.destroy();
    const ctx2 = document.getElementById('ndviChart').getContext('2d');
    ndviChart = new Chart(ctx2, {
        type: 'bar', data: { labels: ['AGB (Mg/ha)', 'NDVI'], datasets: [{ label: '', data: [agb, ndvi], backgroundColor: ['#2196f3', '#9c27b0'], borderRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } } }
    });
}

function updatePieChartAll(features) {
    const kelasCount = {};
    features.forEach(f => { let k = f.properties.KELAS_CTPI || "Tidak"; kelasCount[k] = (kelasCount[k] || 0) + 1; });
    const labels = Object.keys(kelasCount);
    const data = Object.values(kelasCount);
    const colors = labels.map(l => getColor(l));
    if (potensiChart) potensiChart.destroy();
    const ctx = document.getElementById('potensiChart').getContext('2d');
    potensiChart = new Chart(ctx, { type: 'pie', data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: 'white' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: 'white', font: { size: 9 } } } } } });
}

function create3DSmoke(latlng) {
    const point = map.latLngToContainerPoint(latlng);
    const container = document.querySelector('.map-container');
    for (let i = 0; i < 20; i++) {
        const smoke = document.createElement('div');
        smoke.className = 'smoke-particle';
        const dx = (Math.random() - 0.5) * 40;
        const dy = -Math.random() * 50 - 10;
        smoke.style.setProperty('--dx', dx + 'px');
        smoke.style.setProperty('--dy', dy + 'px');
        smoke.style.left = (point.x + (Math.random() - 0.5) * 15) + 'px';
        smoke.style.top = (point.y + (Math.random() - 0.5) * 15) + 'px';
        smoke.style.width = `${8 + Math.random() * 12}px`;
        smoke.style.height = smoke.style.width;
        container.appendChild(smoke);
        setTimeout(() => smoke.remove(), 1000);
    }
}

function initMapAndData() {
    map = L.map('map').setView([-8.1, 112.6], 9);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap & CartoDB', subdomains: 'abcd' }).addTo(map);
    fetch('Percobaan Webgis Tubes Aseli.geojson')
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => {
            geoJsonData = data;
            geoJsonData.features.forEach(f => f.geometry = reprojectGeometry(f.geometry));
            L.geoJSON(geoJsonData, {
                style: (f) => ({ fillColor: getColor(f.properties.KELAS_CTPI), weight: 1, opacity: 0.6, color: '#fff', fillOpacity: 0.6 }),
                onEachFeature: (f, layer) => layer.on('click', (e) => { updateCharts(f); create3DSmoke(e.latlng); })
            }).addTo(map).fitBounds();
            updatePieChartAll(geoJsonData.features);
            if (geoJsonData.features.length) updateCharts(geoJsonData.features[0]);
        })
        .catch(() => {
            // Data dummy jika file tidak ditemukan
            const dummy = { type: "FeatureCollection", features: [{ type: "Feature", properties: { NAMOBJ: "Contoh Desa", WADMKC: "Kec. Contoh", LUAS_AREA: 1000000, TOTAL_CARB: 500000, TOTAL_CO2: 1800000, AGBmean: 0.65, NDVI_MEANm: 0.72, KELAS_CTPI: "BERPOTENSI", CARBONPOOL: 84, CARBONLOSS: 12, dNBR_MEANm: 0.09, CTPIMEAN_m: 0.73, CARBON_VAL: 106800000 }, geometry: { type: "Polygon", coordinates: [[[112.5, -8.1], [112.6, -8.1], [112.6, -8.2], [112.5, -8.2], [112.5, -8.1]]] } }] };
            geoJsonData = dummy;
            geoJsonData.features.forEach(f => f.geometry = reprojectGeometry(f.geometry));
            L.geoJSON(geoJsonData, {
                style: (f) => ({ fillColor: getColor(f.properties.KELAS_CTPI), weight: 1, opacity: 0.6, color: '#fff', fillOpacity: 0.6 }),
                onEachFeature: (f, layer) => layer.on('click', (e) => { updateCharts(f); create3DSmoke(e.latlng); })
            }).addTo(map).fitBounds();
            updatePieChartAll(geoJsonData.features);
            if (geoJsonData.features.length) updateCharts(geoJsonData.features[0]);
            alert('⚠️ File GeoJSON asli tidak ditemukan, menggunakan data contoh.');
        });
}

// Info popup
document.getElementById('infoBtn').onclick = () => document.getElementById('infoPopup').classList.toggle('show');
document.getElementById('closeInfoBtn').onclick = () => document.getElementById('infoPopup').classList.remove('show');