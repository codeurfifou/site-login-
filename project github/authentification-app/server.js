const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

// Configuration du middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Servir les fichiers statiques

// Configuration des sessions
app.use(session({
    secret: 'votre-clé-secrète-très-sécurisée',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // true en production avec HTTPS
}));

// Initialisation de la base de données
const db = new sqlite3.Database('users.db', (err) => {
    if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
    } else {
        console.log('Connecté à la base de données SQLite');
        
        // Création de la table utilisateurs si elle n'existe pas
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erreur lors de la création de la table:', err);
            } else {
                console.log('Table users créée ou existe déjà');
            }
        });
    }
});

// Route pour l'inscription
app.post('/register', async (req, res) => {
    const { username, password, passwordRepeat } = req.body;

    // Validation des données
    if (!username || !password || !passwordRepeat) {
        return res.status(400).json({ 
            success: false, 
            message: 'Tous les champs sont requis' 
        });
    }

    if (password !== passwordRepeat) {
        return res.status(400).json({ 
            success: false, 
            message: 'Les mots de passe ne correspondent pas' 
        });
    }

    if (password.length < 6) {
        return res.status(400).json({ 
            success: false, 
            message: 'Le mot de passe doit contenir au moins 6 caractères' 
        });
    }

    try {
        // Vérifier si l'utilisateur existe déjà
        db.get('SELECT username FROM users WHERE username = ?', [username], async (err, row) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erreur serveur' 
                });
            }

            if (row) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Ce nom d\'utilisateur existe déjà' 
                });
            }

            // Hasher le mot de passe
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Insérer l'utilisateur dans la base de données
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
                [username, hashedPassword], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Erreur lors de la création du compte' 
                        });
                    }

                    res.json({ 
                        success: true, 
                        message: 'Compte créé avec succès',
                        userId: this.lastID 
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur' 
        });
    }
});

// Route pour la connexion
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Nom d\'utilisateur et mot de passe requis' 
        });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur serveur' 
            });
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Nom d\'utilisateur ou mot de passe incorrect' 
            });
        }

        try {
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (isPasswordValid) {
                // Créer une session
                req.session.userId = user.id;
                req.session.username = user.username;

                res.json({ 
                    success: true, 
                    message: 'Connexion réussie',
                    username: user.username 
                });
            } else {
                res.status(401).json({ 
                    success: false, 
                    message: 'Nom d\'utilisateur ou mot de passe incorrect' 
                });
            }
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: 'Erreur serveur' 
            });
        }
    });
});

// Route pour la déconnexion
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la déconnexion' 
            });
        }
        res.json({ success: true, message: 'Déconnexion réussie' });
    });
});

// Route pour vérifier l'authentification
app.get('/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            authenticated: true, 
            username: req.session.username 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Route pour la page de tableau de bord (protégée)
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Route pour la page principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

// Fermeture propre de la base de données
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Erreur lors de la fermeture de la base de données:', err);
        } else {
            console.log('Base de données fermée');
        }
        process.exit(0);
    });
});