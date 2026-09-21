document.addEventListener("DOMContentLoaded", async () => {
    const liste = document.getElementById("liste-actualites");
    const formulaire = document.getElementById("form-actualite");
    const messageConnexion = document.getElementById("message-connexion-actualite");

    if (!liste) return;

    function afficherDate(date) {
        return new Date(date).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short"
        });
    }

    async function chargerActualites() {
        liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><h3>Chargement...</h3></div>';

        const { data, error } = await supabaseClient
            .from("actualites")
            .select("id, titre, contenu, created_at, auteur_identifiant")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Impossible de charger les actualités</h3><p>Vérifie que les tables Supabase ont bien été créées.</p></div>';
            return;
        }

        if (!data.length) {
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">📰</div><h3>Aucune actualité pour le moment</h3><p>La première actualité peut être publiée par un membre connecté.</p></div>';
            return;
        }

        liste.innerHTML = data.map((actualite) => `
            <article class="article-card">
                <div class="article-top">
                    <span class="article-tag">ACTUALITÉ</span>
                    <span class="article-date">${afficherDate(actualite.created_at)}</span>
                </div>
                <h3>${echapperHTML(actualite.titre)}</h3>
                <p>${echapperHTML(actualite.contenu).replace(/\n/g, "<br>")}</p>
                <div class="post-author">Publié par <strong>${echapperHTML(actualite.auteur_identifiant || "Utilisateur")}</strong></div>
            </article>
        `).join("");
    }

    function echapperHTML(texte) {
        return String(texte ?? "").replace(/[&<>'"]/g, (caractere) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
        }[caractere]));
    }

    try {
        const utilisateur = await utilisateurConnecte();

        if (formulaire && messageConnexion) {
            if (utilisateur) {
                formulaire.hidden = false;
                messageConnexion.hidden = true;
            } else {
                formulaire.hidden = true;
                messageConnexion.hidden = false;
            }
        }

        if (formulaire) {
            formulaire.addEventListener("submit", async (event) => {
                event.preventDefault();

                const bouton = formulaire.querySelector("button[type='submit']");
                const utilisateurActuel = await utilisateurConnecte();

                if (!utilisateurActuel) {
                    alert("Tu dois être connecté pour publier une actualité.");
                    return;
                }

                const titre = formulaire.elements.titre.value.trim();
                const contenu = formulaire.elements.contenu.value.trim();
                const profil = await obtenirProfil();
                const identifiant = profil?.identifiant || utilisateurActuel.email?.split("@")[0] || "Utilisateur";

                if (!titre || !contenu) {
                    alert("Remplis le titre et le contenu.");
                    return;
                }

                bouton.disabled = true;
                bouton.textContent = "Publication...";

                const { error } = await supabaseClient.from("actualites").insert({
                    titre,
                    contenu,
                    auteur_id: utilisateurActuel.id,
                    auteur_identifiant: identifiant
                });

                bouton.disabled = false;
                bouton.textContent = "Publier l’actualité";

                if (error) {
                    console.error(error);
                    alert("Impossible de publier l’actualité : " + error.message);
                    return;
                }

                formulaire.reset();
                await chargerActualites();
            });
        }
    } catch (error) {
        console.error(error);
    }

    await chargerActualites();
});
