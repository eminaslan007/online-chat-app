// Firebase yapılandırması
const firebaseConfig = {
    // Buraya Firebase Console'dan aldığınız bilgileri yapıştıracaksınız
    apiKey: "AIzaSyA1234567890-abcdefghijklmnop", // Sizin API anahtarınız
    authDomain: "online-chat-app-xxxxx.firebaseapp.com", // Sizin auth domain'iniz
    databaseURL: "https://online-chat-app-xxxxx-default-rtdb.firebaseio.com", // Sizin database URL'niz
    projectId: "online-chat-app-xxxxx", // Sizin proje ID'niz
    storageBucket: "online-chat-app-xxxxx.appspot.com", // Sizin storage bucket'ınız
    messagingSenderId: "123456789012", // Sizin messaging sender ID'niz
    appId: "1:123456789012:web:abcdef1234567890" // Sizin app ID'niz
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM elementleri
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const messageForm = document.getElementById('message-form');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username');
const onlineCountElement = document.getElementById('online-count');
const logoutButton = document.getElementById('logout-button');

let currentUser = null;
let onlineUsers = {};

// Kullanıcı girişi
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) {
        currentUser = {
            id: Date.now().toString(),
            name: username,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Kullanıcıyı çevrimiçi kullanıcılara ekle
        const userRef = database.ref(`users/${currentUser.id}`);
        userRef.set(currentUser);

        // Kullanıcı çıkış yaptığında veya bağlantı koptuğunda
        userRef.onDisconnect().remove();

        // Chat ekranına geç
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');

        // Sistem mesajı gönder
        sendSystemMessage(`${username} sohbete katıldı`);
        
        // Mesajları dinlemeye başla
        loadMessages();
    }
});

// Çıkış yapma
logoutButton.addEventListener('click', () => {
    if (currentUser) {
        database.ref(`users/${currentUser.id}`).remove();
        sendSystemMessage(`${currentUser.name} sohbetten ayrıldı`);
        currentUser = null;
        chatScreen.classList.remove('active');
        loginScreen.classList.add('active');
        messagesContainer.innerHTML = '';
    }
});

// Mesaj gönderme
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text && currentUser) {
        const message = {
            userId: currentUser.id,
            username: currentUser.name,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        database.ref('messages').push(message);
        messageInput.value = '';
    }
});

// Mesajları yükleme ve dinleme
function loadMessages() {
    const messagesRef = database.ref('messages');
    messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

// Mesajı görüntüleme
function displayMessage(message) {
    const messageElement = document.createElement('div');
    const isSent = message.userId === currentUser?.id;
    
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    if (!isSent) {
        messageElement.innerHTML += `<div class="username">${message.username}</div>`;
    }
    
    messageElement.innerHTML += `
        <div class="text">${escapeHtml(message.text)}</div>
        <div class="time">${formatTime(message.timestamp)}</div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Sistem mesajı gönderme
function sendSystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Çevrimiçi kullanıcıları takip etme
database.ref('users').on('value', (snapshot) => {
    onlineUsers = snapshot.val() || {};
    onlineCountElement.textContent = Object.keys(onlineUsers).length;
});

// Yardımcı fonksiyonlar
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Sayfa yenilendiğinde veya kapatıldığında çıkış yapma
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        database.ref(`users/${currentUser.id}`).remove();
    }
});
