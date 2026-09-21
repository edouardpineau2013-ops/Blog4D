const SUPABASE_URL = "https://hgzxvqgefbtsjgujixoq.supabase.co";
const SUPABASE_KEY = "sb_publishable_2DsMScd9AoveabV0LrgXBQ_M2TA8JoO";

// Le script reste chargé même si le CDN Supabase est momentanément indisponible.
const supabaseClient = window.supabase?.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
) || null;

function verifierSupabase() {
    if (!supabaseClient) {
        throw new Error(
            "Le service de connexion est temporairement indisponible. Rechargez la page."
        );
    }
}

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
    verifierSupabase();

    identifiant = identifiant.trim();

    if (!identifiant) {
        throw new Error("Veuillez entrer un identifiant.");
    }

    if (identifiant.length < 3 || identifiant.length > 30) {
        throw new Error("L'identifiant doit contenir entre 3 et 30 caractères.");
    }

    if (motDePasse.length < 6) {
        throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
    }

    const email = convertirIdentifiantEnEmail(identifiant);

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password: motDePasse
    });

    if (error) {
        throw error;
    }

    if (!data.user) {
        throw new Error("Impossible de créer le compte.");
    }

    const { error: profilError } = await supabaseClient
        .from("profils")
        .upsert(
            {
                id: data.user.id,
                identifiant
            },
            { onConflict: "id" }
        );

    if (profilError) {
        throw profilError;
    }

    return data;
}

// ===============================
// CONNEXION
// ===============================

async function connecter(identifiant, motDePasse) {
    verifierSupabase();

    identifiant = identifiant.trim();

    if (!identifiant || !motDePasse) {
        throw new Error("Veuillez remplir tous les champs.");
    }

    const email = convertirIdentifiantEnEmail(identifiant);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: motDePasse
    });

    if (error) {
        throw new Error("Identifiant ou mot de passe incorrect.");
    }

    return data;
}

// ===============================
// DÉCONNEXION
// ===============================

async function deconnecter() {
    verifierSupabase();

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Erreur de déconnexion :", error);
        throw error;
    }

    window.location.href = "index.html";
}

// ===============================
// UTILISATEUR CONNECTÉ
// ===============================

async function utilisateurConnecte() {
    verifierSupabase();

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        return null;
    }

    return user || null;
}

// ===============================
// PROFIL
// ===============================

async function obtenirProfil() {
    const user = await utilisateurConnecte();

    if (!user) {
        return null;
    }

    const { data, error } = await supabaseClient
        .from("profils")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Erreur profil :", error);
        return null;
    }

    return data;
}
