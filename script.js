console.log("3. script.js 스마트 로드 완료!");

// ---------------- MQTT 설정 ----------------
const brokerUrl = "wss://x9112e1f.ala.asia-southeast1.emqxsl.com:8084/mqtt";
const client = mqtt.connect(brokerUrl, {
    username: "camtrol",
    password: "gustnr99**",
    reconnectPeriod: 2000,
});

// client.on("connect", () => {
//     console.log("MQTT Connected!");
//     client.subscribe("스마트-V1.0-MH-001", (err) => {
//         if (!err) console.log("Subscribed to 스마트-V1.0-MH-001");
//     });
// });

// const SUB_TOPIC = "스마트-V1.0-MH-001"; // ESP32가 publish 하는 토픽
// const PUB_TOPIC = "스마트-V1.0-MH-001-CMD"; // 브라우저가 ESP32로 보낼 토픽

const SUB_TOPIC = `${userId}/${userPw}/sub`; // 브라우저가 구독할 토픽
const PUB_TOPIC = `${userId}/${userPw}/pub`; // 브라우저가 ESP32로 보낼 토픽

console.log("SUB_TOPIC:", SUB_TOPIC);
console.log("PUB_TOPIC:", PUB_TOPIC);

client.on("connect", () => {
    console.log("MQTT Connected!");
    client.subscribe(SUB_TOPIC, (err) => {
        if (!err) console.log("Subscribed to", SUB_TOPIC);
    });
});

client.on("message", (topic, message) => {
    const msgStr = message.toString();

    // 브라우저 → ESP32로 전달할 때만 publish
    if (topic === SUB_TOPIC) {
        console.log(`Received from ${topic}:`, msgStr);

        // ESP32 전용 토픽으로 publish
        client.publish(PUB_TOPIC, msgStr);

        // 브라우저 UI 업데이트 (예시)
        try {
            const data = JSON.parse(msgStr);
            const voltageEl = document.querySelector("#battery_display span");

            const cleanBar = document.getElementById("cleanBar");
            const cleanText = document.getElementById("cleanVal");
            const wasteBar = document.getElementById("wasteBar");
            const wasteText = document.getElementById("wasteVal");

            if (cleanBar) {
                cleanBar.style.height = data.cleanWater + "%"; // bar 높이 변경
            }
            if (cleanText) {
                cleanText.textContent = data.cleanWater + "%"; // 텍스트 변경
            }

            if (wasteBar) {
                wasteBar.style.height = data.wasteWater + "%"; // bar 높이 변경
            }
            if (wasteText) {
                wasteText.textContent = data.wasteWater + "%"; // 텍스트 변경
            }

            if (voltageEl) voltageEl.textContent = data.voltage.toFixed(2) + "V";

            const tempEl = document.getElementById("nowTemp");
            if (tempEl) tempEl.textContent = data.temperature.toFixed(1) + "°C";

            const humiEl = document.getElementById("humidity");
            if (humiEl) humiEl.textContent = data.humidity.toFixed(0) + "%";


        } catch (err) {
            console.error("JSON parse error:", err);
        }
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
