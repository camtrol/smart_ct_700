console.log("script.js 스마트 로드 완료!"); // 🔥 여기서 출력

const gateway = `ws://${window.location.hostname}/ws`;
let websocket = null; // 웹소켓 초기화 변수
let reconnectAttempts = 0;

let bedFlag = false;
let cigarFlag = false;
let btn1Flag = false;
let btn = false;

let onColor = "rgb(57, 194, 73)";
let offColor = "rgb(59, 60, 134)";

let currentTemp = 26.6;

// ---------------------------
// [1] 이벤트 핸들러 초기화
// ---------------------------
// function initEventListeners() {
//     // 이벤트 위임 (단일 리스너로 모든 클릭 처리)
//     document.body.addEventListener("click", (e) => {
//         if (e.target.closest("#temp_display")) setTemp();
//         if (e.target.closest("#bed_icon")) allLedClick();
//         if (e.target.closest("#heater_btn")) heaterClick();
//     });

//     // 슬라이더 초기화
//     for (let i = 1; i <= 9; i++) {
//         const slider = document.getElementById(`sliderValue${i}`);
//         if (slider) slider.textContent = 100; // null 체크 추가
//     }
// }

// ---------------------------
// [2] 웹소켓 관리 (재연결 로직 포함)
// ---------------------------
function initWebSocket() {
    if (websocket) {
        websocket.close(); // 기존 연결 정리
    }

    websocket = new WebSocket(gateway);

    websocket.onopen = () => {
        console.log("WebSocket Connected!");
        reconnectAttempts = 0;
        // updateUI(true); // 연결 상태 UI 업데이트
    };

    websocket.onerror = (e) => {
        console.error("WebSocket Error:", e);
        // updateUI(false);
    };

    websocket.onclose = () => {
        if (reconnectAttempts < 5) {
            console.log(`재연결 시도 중... (${reconnectAttempts + 1}/5)`);
            setTimeout(initWebSocket, 2000);
            reconnectAttempts++;
        }
    };

    websocket.onmessage = (e) => {
        console.log("Received:", e.data);
        try {
            const data = JSON.parse(e.data);
            processData(data); // 데이터 처리 함수
        } catch (err) {
            console.error("메시지 파싱 실패:", err);
        }
    };
}

// ---------------------------
// [3] 실행부 - 초기화
// ---------------------------
function onLoad() {
    initWebSocket(); // 웹소켓 초기화는 resources가 없어도 가능

    function afterDomLoaded() {
        setupSliders(12);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", afterDomLoaded);
    } else {
        // 이미 DOM이 준비된 경우
        afterDomLoaded();
    }
}

// DOM 준비 시 이벤트 리스너 등록
if (document.readyState === "complete") {
    initEventListeners();
} else {
    document.addEventListener("DOMContentLoaded", initEventListeners);
}

// 페이지 전체 로드 후 웹소켓 연결
window.addEventListener("load", onLoad); // ★ onLoad로 일관성 유지

function getValues() {
    // main 으로 데이터 요청 함...
    websocket.send("getValues");
}

function onOpen(event) {
    console.log("Connection opened");
    getValues();
}

function onClose(event) {
    console.log("Connection closed");
    setTimeout(initWebSocket, 2000);
}

function setupSliders(count) {
    for (let i = 1; i <= count; i++) {
        const slider = document.getElementById(`slider${i}`);
        const label = document.getElementById(`sliderValue${i}`);
        if (!slider || !label) continue;

        slider.addEventListener("input", (event) => {
            const value = event.target.value;
            label.textContent = value;
            console.log(`slider${i} value =`, value);
            websocket.send(`${i}s${value}`);
        });
    }
}

function onMessage(event) {
    console.log(event.data);
    var myObj = JSON.parse(event.data);
    var keys = Object.keys(myObj);

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        document.getElementById(key).innerHTML = myObj[key];
        document.getElementById("slider" + (i + 1).toString()).value = myObj[key];
    }
}

function toggleDevice(buttonId, deviceName) {
    console.log(`${deviceName} 제어 실행`); // 로그
    const btn = document.getElementById(buttonId);
    const isToggled = !btn.classList.contains("toggled"); // 현재 상태 반전

    // 1. UI 업데이트
    btn.classList.toggle("toggled", isToggled);
    btn.textContent = `${deviceName} ${isToggled ? "ON" : "OFF"}`;

    // 2. 서버 제어 (fetch)
    fetch(`/control?device=${deviceName}&state=${isToggled ? "on" : "off"}`)
        .then((response) => {
            if (!response.ok) throw new Error("HTTP error " + response.status);
            return response.text();
        })
        .then((data) => console.log(`${deviceName} 응답:`, data))
        .catch((error) => console.error(`${deviceName} 제어 실패:`, error));
}

function allLedClick() {
    const img = document.getElementById("bed_img");
    const src = img.src;

    // 현재 이미지가 OFF 상태인지 검사
    if (src.includes("All_OFF.png")) {
        img.src = "All_ON.png";
    } else {
        img.src = "All_OFF.png";
    }
}

function updateTempDisplay() {
    const el = document.getElementById("tempValue");
    if (el) el.textContent = currentTemp.toFixed(1) + " °C";
    const setTempEl = document.getElementById("setTemp");
    if (setTempEl) {
        setTempEl.classList.add("text-yellow-500"); // 임시 색상
        setTimeout(() => {
            setTempEl.textContent = currentTemp.toFixed(1) + " °C";
            setTempEl.classList.remove("text-yellow-500");
        }, 300);
    }
    console.log(currentTemp);
}

function closeTempModal() {
    document.getElementById("tempModalOverlay").classList.add("hidden");
}

function changeTemp(delta) {
    currentTemp = Math.min(99.9, Math.max(0.0, currentTemp + delta));
    updateTempDisplay();
}

function setTemp() {
    const overlay = document.getElementById("tempModalOverlay");
    overlay.classList.remove("hidden");
    overlay.classList.add("flex"); // 이 부분이 빠졌다면 꼭 추가해야 합니다.
    updateTempDisplay();
}

// 3. 이벤트 리스너 등록 함수
function initEventListeners() {
    // 모든 버튼을 객체로 관리 (추가/삭제 용이)
    const deviceMap = {
        // bed_icon: "allLedClick",
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
        // bed_icon: allLedClick,
        // temp_display: setTemp,
        // heater_btn: heaterClick,
        // fridge_btn: fridgeClick,
        // 새로운 버튼은 여기에 추가
    };

    // 각 버튼에 이벤트 연결
    Object.keys(deviceMap).forEach((buttonId) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener("click", () => {
                toggleDevice(buttonId, deviceMap[buttonId]); // ✨ 통합 함수 호출
            });
        }
    });

    // 슬라이더 초기화 (기존 코드 유지)
    for (let i = 1; i <= 9; i++) {
        const slider = document.getElementById(`sliderValue${i}`);
        if (slider) slider.textContent = 100;
    }
}
