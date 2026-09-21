const ADMIN_USER_ID = "ee633883-9e1b-45b4-8e21-94ba26ab1897";
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
