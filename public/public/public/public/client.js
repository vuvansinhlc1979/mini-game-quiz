// public/client.js
const socket = io();

// Lấy các phần tử trên trang
const loginScreen = document.getElementById('login-screen');
const waitingScreen = document.getElementById('waiting-screen');
const questionScreen = document.getElementById('question-screen');
const eliminatedScreen = document.getElementById('eliminated-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const playerNameInput = document.getElementById('player-name-input');
const joinGameBtn = document.getElementById('join-game-btn');

const questionText = document.getElementById('question-text');
const answerOptions = document.getElementById('answer-options');
const gameOverMessage = document.getElementById('game-over-message');

// Xử lý sự kiện tham gia game
joinGameBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        socket.emit('playerJoin', playerName);
        loginScreen.classList.add('hidden');
        waitingScreen.classList.remove('hidden');
    } else {
        alert('Vui lòng nhập tên của bạn!');
    }
});

// Lắng nghe sự kiện câu hỏi mới từ server
socket.on('newQuestion', (data) => {
    // Ẩn các màn hình khác và hiện màn hình câu hỏi
    waitingScreen.classList.add('hidden');
    questionScreen.classList.remove('hidden');
    eliminatedScreen.classList.add('hidden');

    // Hiển thị câu hỏi và các đáp án
    questionText.innerText = data.question;
    answerOptions.innerHTML = ''; // Xóa các đáp án cũ

    data.answers.forEach(answer => {
        const button = document.createElement('button');
        button.innerText = answer;
        button.classList.add('answer-btn');
        button.addEventListener('click', () => {
            // Gửi câu trả lời lên server
            socket.emit('submitAnswer', answer);
            // Vô hiệu hóa các nút sau khi đã chọn
            document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
            button.classList.add('selected');
            waitingScreen.classList.remove('hidden'); // Hiện màn hình chờ
            questionScreen.classList.add('hidden');
        });
        answerOptions.appendChild(button);
    });
});

// Lắng nghe sự kiện bị loại
socket.on('eliminated', () => {
    questionScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    eliminatedScreen.classList.remove('hidden');
});

// Lắng nghe sự kiện kết thúc game
socket.on('gameOver', (data) => {
    questionScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    eliminatedScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverMessage.innerText = data.message;
});
