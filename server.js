// server.js

// 1. Khởi tạo các thư viện cần thiết
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const PORT = 3000; // Cổng mà máy chủ sẽ chạy

// 2. Thiết lập để phục vụ các file tĩnh trong thư mục 'public'
app.use(express.static('public'));

// 3. Dữ liệu và trạng thái của game
let players = {}; // Lưu thông tin người chơi
let questions = [
    {
        question: "1 + 1 bằng mấy?",
        answers: ["1", "2", "3", "4"],
        correctAnswer: "2"
    },
    {
        question: "Thủ đô của Việt Nam là gì?",
        answers: ["Hà Nội", "Đà Nẵng", "TP. HCM", "Hải Phòng"],
        correctAnswer: "Hà Nội"
    },
    {
        question: "Trong truyện Doraemon, ai là người hay bị bắt nạt nhất?",
        answers: ["Chaien", "Xeko", "Nobita", "Doraemon"],
        correctAnswer: "Nobita"
    }
    // Bạn có thể thêm nhiều câu hỏi khác ở đây
];
let currentQuestionIndex = -1;
let gameState = "waiting"; // 'waiting', 'question', 'results'

// 4. Xử lý kết nối từ client
io.on('connection', (socket) => {
    console.log(`Một người chơi đã kết nối: ${socket.id}`);

    // Khi người chơi đăng nhập
    socket.on('playerJoin', (playerName) => {
        players[socket.id] = {
            name: playerName,
            score: 0,
            eliminated: false,
            answer: null
        };
        console.log(`Người chơi ${playerName} đã tham gia.`);
        // Cập nhật danh sách người chơi cho máy chủ (host)
        io.emit('updatePlayerList', Object.values(players));
    });

    // Khi máy chủ bắt đầu game
    socket.on('startGame', () => {
        if (gameState === 'waiting') {
            console.log('Game đã bắt đầu!');
            gameState = 'question';
            sendNextQuestion();
        }
    });

    // Khi người chơi gửi câu trả lời
    socket.on('submitAnswer', (answer) => {
        if (players[socket.id] && !players[socket.id].eliminated) {
            players[socket.id].answer = answer;
            // Kiểm tra xem tất cả người chơi (còn lại) đã trả lời chưa
            checkAllPlayersAnswered();
        }
    });

    // Khi máy chủ yêu cầu câu hỏi tiếp theo
    socket.on('nextQuestion', () => {
        if (gameState === 'results') {
            sendNextQuestion();
        }
    });

    // Khi người chơi ngắt kết nối
    socket.on('disconnect', () => {
        console.log(`Người chơi đã ngắt kết nối: ${socket.id}`);
        if (players[socket.id]) {
            delete players[socket.id];
            // Cập nhật lại danh sách người chơi cho máy chủ
            io.emit('updatePlayerList', Object.values(players));
        }
    });
});

// Hàm gửi câu hỏi tiếp theo
function sendNextQuestion() {
    currentQuestionIndex++;
    // Reset câu trả lời của mọi người
    for (let id in players) {
        players[id].answer = null;
    }

    const activePlayers = Object.values(players).filter(p => !p.eliminated);
    if (activePlayers.length <= 1 || currentQuestionIndex >= questions.length) {
        endGame();
        return;
    }
    
    gameState = 'question';
    const questionData = questions[currentQuestionIndex];
    
    // Gửi câu hỏi đến những người chơi chưa bị loại
    Object.keys(players).forEach(id => {
        if (!players[id].eliminated) {
            io.to(id).emit('newQuestion', {
                question: questionData.question,
                answers: questionData.answers
            });
        }
    });
    
    // Gửi thông tin đến máy chủ
    io.emit('hostUpdate', {
        question: questionData.question,
        questionNumber: currentQuestionIndex + 1,
        totalQuestions: questions.length
    });
}

// Hàm kiểm tra khi tất cả người chơi đã trả lời
function checkAllPlayersAnswered() {
    const activePlayers = Object.values(players).filter(p => !p.eliminated);
    const answeredPlayers = activePlayers.filter(p => p.answer !== null);

    if (activePlayers.length === answeredPlayers.length && activePlayers.length > 0) {
        processResults();
    }
}

// Hàm xử lý kết quả
function processResults() {
    gameState = 'results';
    const correctAnswer = questions[currentQuestionIndex].correctAnswer;
    const results = { A: 0, B: 0, C: 0, D: 0 };
    const answerMapping = questions[currentQuestionIndex].answers;

    Object.keys(players).forEach(id => {
        if (!players[id].eliminated && players[id].answer !== null) {
            const playerAnswer = players[id].answer;
            const answerIndex = answerMapping.indexOf(playerAnswer);
            if (answerIndex === 0) results.A++;
            if (answerIndex === 1) results.B++;
            if (answerIndex === 2) results.C++;
            if (answerIndex === 3) results.D++;
            
            // Nếu trả lời sai, đánh dấu là bị loại
            if (playerAnswer !== correctAnswer) {
                players[id].eliminated = true;
                io.to(id).emit('eliminated'); // Gửi tín hiệu bị loại cho người chơi đó
            }
        }
    });
    
    // Gửi kết quả thống kê đến máy chủ
    io.emit('showResults', {
        results,
        correctAnswer,
        players: Object.values(players)
    });
}


// Hàm kết thúc game
function endGame() {
    gameState = 'waiting';
    const winner = Object.values(players).find(p => !p.eliminated);
    if (winner) {
        io.emit('gameOver', { message: `Người chiến thắng là ${winner.name}!` });
    } else {
        io.emit('gameOver', { message: 'Không tìm thấy người chiến thắng!' });
    }
    // Reset game
    players = {};
    currentQuestionIndex = -1;
}


// 5. Khởi động máy chủ
server.listen(PORT, () => {
    console.log(`Máy chủ đang lắng nghe tại cổng ${PORT}`);
    console.log(`Mở http://localhost:${PORT}/host.html để vào trang quản trị.`);
    console.log(`Người chơi truy cập http://localhost:${PORT} để tham gia.`);
});
