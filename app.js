// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyBxDWDzkG24fwxaCOdBB8x0HPIehC6C02c",
    authDomain: "online-chat-app-8ea34.firebaseapp.com",
    databaseURL: "https://online-chat-app-8ea34-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "online-chat-app-8ea34",
    storageBucket: "online-chat-app-8ea34.firebasestorage.app",
    messagingSenderId: "31701961349",
    appId: "1:31701961349:web:76aac5bcd1732e7111b7ec"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
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
let messagesRef = null;
let isSubmitting = false;
let chatRoomId = null;

// Yeni sohbet odası oluştur
function createNewChatRoom() {
    chatRoomId = Date.now().toString();
    return database.ref('chatRooms/' + chatRoomId).set({
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        active: true
    });
}

// Kullanıcı girişi
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    const username = usernameInput.value.trim();
    if (username) {
        // Anonim giriş yap
        auth.signInAnonymously()
            .then((userCredential) => {
                const user = userCredential.user;
                currentUser = {
                    id: user.uid,
                    name: username
                };

                // Yeni sohbet odası oluştur
                return createNewChatRoom();
            })
            .then(() => {
                // Kullanıcıyı veritabanına kaydet
                return database.ref('users/' + currentUser.id).set({
                    username: username,
                    online: true,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    chatRoomId: chatRoomId
                });
            })
            .then(() => {
                // Kullanıcı çıkış yaptığında veritabanından sil
                database.ref('users/' + currentUser.id).onDisconnect().remove();

                // Chat ekranına geç
                loginScreen.classList.remove('active');
                chatScreen.classList.add('active');

                // Mesajları yükle
                loadMessages();
                updateOnlineUsers();
            })
            .catch((error) => {
                console.error('Giriş hatası:', error);
                alert('Giriş yapılamadı. Lütfen tekrar deneyin.');
            })
            .finally(() => {
                isSubmitting = false;
            });
    }
});

// Mesaj gönderme
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    const text = messageInput.value.trim();
    if (text && currentUser && chatRoomId) {
        const message = {
            uid: currentUser.id,
            username: currentUser.name,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        const submitButton = messageForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        database.ref('chatRooms/' + chatRoomId + '/messages').push(message)
            .then(() => {
                messageInput.value = '';
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            })
            .catch((error) => {
                console.error('Mesaj gönderme hatası:', error);
                alert('Mesaj gönderilemedi.');
            })
            .finally(() => {
                isSubmitting = false;
                submitButton.disabled = false;
            });
    } else {
        isSubmitting = false;
    }
});

// Mesajları yükle
function loadMessages() {
    if (messagesRef) {
        messagesRef.off();
    }

    messagesRef = database.ref('chatRooms/' + chatRoomId + '/messages');
    const processedMessages = new Set();

    messagesRef.orderByChild('timestamp').limitToLast(50).on('child_added', (snapshot) => {
        const message = snapshot.val();
        const messageId = snapshot.key;

        if (!processedMessages.has(messageId)) {
            processedMessages.add(messageId);
            displayMessage(message, messageId);
        }
    });
}

// Mesajı görüntüle
function displayMessage(message, messageId) {
    if (document.querySelector(`[data-message-id="${messageId}"]`)) {
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.setAttribute('data-message-id', messageId);
    const isSent = message.uid === currentUser?.id;
    
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    if (!isSent) {
        messageElement.innerHTML += `<div class="username">${escapeHtml(message.username)}</div>`;
    }
    
    messageElement.innerHTML += `
        <div class="text">${escapeHtml(message.text)}</div>
        <div class="time">${formatTime(message.timestamp)}</div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Çevrimiçi kullanıcıları güncelle
function updateOnlineUsers() {
    database.ref('users').on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const currentRoomUsers = Object.values(users).filter(user => user.chatRoomId === chatRoomId);
        onlineCountElement.textContent = currentRoomUsers.length;
    });
}

// Çıkış yap
logoutButton.addEventListener('click', () => {
    if (currentUser && chatRoomId) {
        // Sohbet odasını kapat ve mesajları sil
        database.ref('chatRooms/' + chatRoomId).remove()
            .then(() => {
                return database.ref('users/' + currentUser.id).remove();
            })
            .then(() => {
                auth.signOut();
                currentUser = null;
                chatRoomId = null;
                messagesRef = null;
                chatScreen.classList.remove('active');
                loginScreen.classList.add('active');
                messagesContainer.innerHTML = '';
            })
            .catch((error) => {
                console.error('Çıkış hatası:', error);
            });
    }
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

// Sayfa yenilendiğinde veya kapatıldığında
window.addEventListener('beforeunload', () => {
    if (currentUser && chatRoomId) {
        database.ref('chatRooms/' + chatRoomId).remove();
        database.ref('users/' + currentUser.id).remove();
    }
});
