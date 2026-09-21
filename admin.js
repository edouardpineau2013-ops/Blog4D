const ADMIN_USER_ID = "46bff939-33b6-48a4-b013-2bf2f4035464";
const ADMIN_IDENTIFIANT = "Edouard";

async function estAdmin() {
    try {
        const utilisateur = await utilisateurConnecte();
        if (!utilisateur || utilisateur.id !== ADMIN_USER_ID) return false;

        const profil = await obtenirProfil();
        return profil?.identifiant?.toLowerCase() === ADMIN_IDENTIFIANT.toLowerCase();
    } catch (error) {
        console.error("Erreur vérification admin :", error);
        return false;
    }
}
