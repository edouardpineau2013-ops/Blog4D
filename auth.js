const SUPABASE_URL = "https://hgzxvqgefbtsjgujixoq.supabase.co";
const SUPABASE_KEY = "sb_publishable_2DsMScd9AoveabV0LrgXBQ_M2TA8JoO";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ===============================
// IDENTIFIANT → EMAIL TECHNIQUE
// ===============================

function convertirIdentifiantEnEmail(identifiant) {
    return `${identifiant.trim().toLowerCase()}@blog4d.local`;
}


// ===============================
// INSCRIPTION
// ===============================

async function inscrire(identifiant, motDePasse) {

    identifiant = identifiant.trim();

    if (!identifiant) {
        throw new Error("Veuillez entrer un identifiant.");
    }

    if (motDePasse.length < 6) {
        throw new Error(
            "Le mot de passe doit contenir au moins 6 caractères."
        );
    }

    const email = convertirIdentifiantEnEmail(identifiant);

    const { data, error } =
        await supabaseClient.auth.signUp({
            email: email,
            password: motDePasse
        });

    if (error) {
        throw error;
    }

    if (!data.user) {
        throw new Error("Impossible de créer le compte.");
    }

    const { error: profilError } =
        await supabaseClient
            .from("profils")
            .insert({
                id: data.user.id,
                identifiant: identifiant
            });

    if (profilError) {
        throw profilError;
    }

    return data;
}


// ===============================
// CONNEXION
// ===============================

async function connecter(identifiant, motDePasse) {

    identifiant = identifiant.trim();

    if (!identifiant || !motDePasse) {
        throw new Error(
            "Veuillez remplir tous les champs."
        );
    }

    const email = convertirIdentifiantEnEmail(identifiant);

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: motDePasse
        });

    if (error) {
        throw new Error(
            "Identifiant ou mot de passe incorrect."
        );
    }

    return data;
}


// ===============================
// DÉCONNEXION
// ===============================

async function deconnecter() {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        console.error(error);
        return;
    }

    window.location.href = "index.html";
}


// ===============================
// UTILISATEUR CONNECTÉ
// ===============================

async function utilisateurConnecte() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    return user;
}


// ===============================
// PROFIL
// ===============================

async function obtenirProfil() {

    const user = await utilisateurConnecte();

    if (!user) {
        return null;
    }

    const { data, error } =
        await supabaseClient
            .from("profils")
            .select("*")
            .eq("id", user.id)
            .single();

    if (error) {
        console.error("Erreur profil :", error);
        return null;
    }

    return data;
}