console.log("3. script.js 스마트 로드 완료!");

// ---------------- MQTT 설정 ----------------
const brokerUrl = "wss://x9112e1f.ala.asia-southeast1.emqxsl.com:8084/mqtt";
const client = mqtt.connect(brokerUrl, {
    username: "camtrol",
    password: "gustnr99**",
    reconnectPeriod: 2000,
});

client.on("connect", () => {
    console.log("MQTT Connected!");
    client.subscribe("스마트-V1.0-MH-001", (err) => {
        if (!err) console.log("Subscribed to 스마트-V1.0-MH-001");
    });
});

client.on("message", (topic, message) => {
    console.log(`Received from ${topic}:`, message.toString());
    try {
        const data = JSON.parse(message.toString());
        const batteryEl = document.querySelector("#battery_display span");
        if (batteryEl) batteryEl.textContent = data.voltage.toFixed(2) + "V";
        console.log("voltage:", data.voltage, "temperature:", data.temperature, "humidity:", data.humidity);
    } catch (e) {
        console.error("JSON parse error", e);
    }
});

client.on("error", (err) => console.error("MQTT Error:", err));

// ---------------- WebSocket (필요 시) ----------------
const gateway = `ws://${window.location.hostname}/ws`;
let websocket = null;
let reconnectAttempts = 0;

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
            // 필요 시 처리
        } catch (err) {
            console.error("메시지 파싱 실패:", err);
        }
    };
}

// ---------------- 슬라이더 초기화 ----------------
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

// ---------------- 버튼 이벤트 초기화 ----------------
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
            btn.classList.remove("hidden"); // 보장
            btn.classList.add("inline-block");
            btn.addEventListener("click", () => toggleDevice(buttonId, deviceMap[buttonId]));
        }
    });
}

// ---------------- 장치 토글 ----------------
function toggleDevice(buttonId, deviceName) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const isToggled = !btn.classList.contains("toggled");
    btn.classList.toggle("toggled", isToggled);
    btn.textContent = `${deviceName} ${isToggled ? "ON" : "OFF"}`;

    fetch(`/control?device=${deviceName}&state=${isToggled ? "on" : "off"}`)
        .then((res) => (res.ok ? res.text() : Promise.reject("HTTP error " + res.status)))
        .then((data) => console.log(`${deviceName} 응답:`, data))
        .catch((err) => console.error(`${deviceName} 제어 실패:`, err));
}

// ---------------- 초기화 ----------------
window.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    setupSliders(12);
    initWebSocket();
});
