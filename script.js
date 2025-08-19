console.log("3. script.js 스마트 로드 완료!"); // 🔥 초기 로드 확인

const gateway = `ws://${window.location.hostname}/ws`;
let websocket = null;
let reconnectAttempts = 0;
let currentTemp = 26.6;

// --------------------------------------------------
// [1] 웹소켓 관리
// --------------------------------------------------
function initWebSocket() {
    if (websocket) websocket.close();

    websocket = new WebSocket(gateway);

    websocket.onopen = () => {
        console.log("WebSocket Connected!");
        reconnectAttempts = 0;
    };

    websocket.onerror = (e) => console.error("WebSocket Error:", e);

    websocket.onclose = () => {
        if (reconnectAttempts < 5) {
            console.log(`재연결 시도 중... (${reconnectAttempts + 1}/5)`);
            reconnectAttempts++;
            setTimeout(initWebSocket, 2000);
        }
    };

    websocket.onmessage = (e) => {
        console.log("Received:", e.data);
        try {
            const data = JSON.parse(e.data);
            processData(data); // 필요에 따라 구현
        } catch (err) {
            console.error("메시지 파싱 실패:", err);
        }
    };
}

// --------------------------------------------------
// [2] 슬라이더 초기화
// --------------------------------------------------
function setupSliders(count) {
    for (let i = 1; i <= count; i++) {
        const slider = document.getElementById(`slider${i}`);
        const label = document.getElementById(`sliderValue${i}`);
        if (!slider || !label) continue;

        slider.value = 100;
        label.textContent = 100;

        slider.addEventListener("input", (event) => {
            const value = event.target.value;
            label.textContent = value;
            console.log(`slider${i} value =`, value);
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(`${i}s${value}`);
            }
        });
    }
}

// --------------------------------------------------
// [3] 버튼 이벤트 초기화
// --------------------------------------------------
function initEventListeners() {
    const deviceMap = {
        heater_btn: "히터",
        living_btn: "거실",
        bunker_btn: "벙커",
        boiler_btn: "보일러",
        inverter_btn: "인버터",
        clean_btn: "청수퇴수",
        waste_btn: "오수퇴수",
        bed_btn: "침실등",
        living_room_btn: "거실등",
        living_1_btn: "거실간접",
        living_2_btn: "벽간접",
        under_btn: "언더등",
        entrance_btn: "출입등",
        kitchen_btn: "주방등",
        bathroom_btn: "욕실등",
        external_btn: "외부등",
        pump_btn: "물펌프",
        fan_btn: "FAN",
        fridge_btn: "냉장고",
    };

    Object.keys(deviceMap).forEach((buttonId) => {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.addEventListener("click", () => {
                toggleDevice(buttonId, deviceMap[buttonId]);
            });
        }
    });
}

// --------------------------------------------------
// [4] 장치 토글 함수
// --------------------------------------------------
function toggleDevice(buttonId, deviceName) {
    console.log(`${deviceName} 제어 실행`);
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const isToggled = !btn.classList.contains("toggled");
    btn.classList.toggle("toggled", isToggled);
    btn.textContent = `${deviceName} ${isToggled ? "ON" : "OFF"}`;

    fetch(`/control?device=${deviceName}&state=${isToggled ? "on" : "off"}`)
        .then((res) => {
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return res.text();
        })
        .then((data) => console.log(`${deviceName} 응답:`, data))
        .catch((err) => console.error(`${deviceName} 제어 실패:`, err));
}

// --------------------------------------------------
// [5] 온도 표시 관련
// --------------------------------------------------
function updateTempDisplay() {
    const el = document.getElementById("tempValue");
    if (el) el.textContent = currentTemp.toFixed(1) + " °C";

    const setTempEl = document.getElementById("setTemp");
    if (setTempEl) {
        setTempEl.classList.add("text-yellow-500");
        setTimeout(() => {
            setTempEl.textContent = currentTemp.toFixed(1) + " °C";
            setTempEl.classList.remove("text-yellow-500");
        }, 300);
    }
}

function setTemp() {
    const overlay = document.getElementById("tempModalOverlay");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
    updateTempDisplay();
}

// --------------------------------------------------
// [6] DOM 준비 후 모든 초기화
// --------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    setupSliders(12);
    initWebSocket();
});
