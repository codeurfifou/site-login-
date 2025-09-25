// Fonction pour ouvrir un modal
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// Fonction pour fermer un modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    clearMessages();
}

// Fermer le modal en cliquant en dehors
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
        clearMessages();
    }
}

// Fonction pour afficher des messages
function showMessage(elementId, message, isError = false) {
    const messageElement = document.getElementById(elementId);
    messageElement.textContent = message;
    messageElement.className = isError ? 'message error' : 'message success';
    messageElement.style.display = 'block';
}

// Fonction pour effacer les messages
function clearMessages() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
        msg.style.display = 'none';
        msg.textContent = '';
    });
}

// Gestion du formulaire d'inscription
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    // Vérifier si l'utilisateur est déjà connecté
    checkAuthStatus();

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(registerForm);
        const data = {
            username: formData.get('username'),
            password: formData.get('password'),
            passwordRepeat: formData.get('passwordRepeat')
        };

        // Validation côté client
        if (data.password !== data.passwordRepeat) {
            showMessage('registerMessage', 'Les mots de passe ne correspondent pas', true);
            return;
        }

        if (data.password.length < 6) {
            showMessage('registerMessage', 'Le mot de passe doit contenir au moins 6 caractères', true);
            return;
        }

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showMessage('registerMessage', result.message, false);
                setTimeout(() => {
                    closeModal('registerModal');
                    registerForm.reset();
                    openModal('loginModal');
                }, 2000);
            } else {
                showMessage('registerMessage', result.message, true);
            }
        } catch (error) {
            showMessage('registerMessage', 'Erreur de connexion au serveur', true);
        }
    });

    // Gestion du formulaire de connexion
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showMessage('loginMessage', 'Connexion réussie...', false);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                showMessage('loginMessage', result.message, true);
            }
        } catch (error) {
            showMessage('loginMessage', 'Erreur de connexion au serveur', true);
        }
    });
});

// Fonction pour vérifier le statut d'authentification
async function checkAuthStatus() {
    try {
        const response = await fetch('/check-auth');
        const result = await response.json();
        
        if (result.authenticated) {
            // L'utilisateur est déjà connecté, rediriger vers le dashboard
            window.location.href = '/dashboard';
        }
    } catch (error) {
        console.log('Erreur lors de la vérification de l\'authentification');
    }
}